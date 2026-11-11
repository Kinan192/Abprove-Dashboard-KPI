<?php

namespace Tests\Feature\Frontend;

use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class RoleRefinementTest extends BackendTestCase
{
    private function templatePayload(int $unit, string $pillar = 'Mutu layanan lokal'): array
    {
        return $this->key(['scope_level' => 'unit', 'unit_id' => $unit, 'name' => 'KPI khusus', 'effective_from' => '2026-12-01', 'items' => [['pillar' => $pillar, 'name' => 'Indikator unit', 'target_text' => '95%', 'weight_percent' => '100']]]);
    }

    public function test_ku_can_read_sibling_unit_kpi_but_not_its_people_or_other_division_kpi(): void
    {
        $unit = DB::table('units')->insertGetId(['division_id' => $this->ids['d1'], 'code' => 'SIBLING', 'name' => 'Unit satu divisi']);
        $employee = DB::table('employees')->insertGetId(['nip' => 'SIBLING-STAFF', 'full_name' => 'Staf unit saudara', 'position_id' => $this->ids['position']]);
        DB::table('employee_placements')->insert(['employee_id' => $employee, 'unit_id' => $unit, 'division_id' => $this->ids['d1'], 'effective_from' => '2026-11-01', 'created_by' => $this->users['hc']->id, 'reason' => 'Fixture']);
        $payload = $this->templatePayload($unit);
        $payload['effective_from'] = '2026-11-01';
        $this->asRole('hc')->postJson('/hc/kpi-templates', $payload)->assertOk();

        $response = $this->asRole('ku1')->getJson('/unit/data/workspace')->assertOk()->assertJsonCount(1, 'data.units')->assertJsonCount(1, 'data.staff')->assertJsonCount(2, 'data.kpiUnits');
        $this->assertNotContains((string) $this->ids['u2'], array_column($response->json('data.kpiUnits'), 'id'));
        $this->assertContains((string) $unit, array_column($response->json('data.kpis'), 'areaId'));
        $this->assertStringNotContainsString('SIBLING-STAFF', $response->getContent());
        $this->getJson('/unit/data/kpis?cycle_id='.$this->ids['cycle'].'&unit_id='.$this->ids['u2'])->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/unit/members?unit_id='.$unit)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/unit/team?unit_id='.$unit)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->ids['u1']);
        $foreign = $this->payload();
        $foreign['employee_id'] = $employee;
        $this->postJson('/unit/assessments', $foreign)->assertNotFound();
    }

    public function test_custom_pillars_publish_and_import_but_empty_or_overlong_pillars_are_rejected(): void
    {
        $this->asRole('hc')->postJson('/hc/kpi-templates', $this->templatePayload($this->ids['u1'], 'Keselamatan & mutu SDM'))->assertOk()->assertJsonPath('data.items.0.pillar', 'Keselamatan & mutu SDM');
        foreach (['', '   ', str_repeat('a', 65)] as $pillar) {
            $this->postJson('/hc/kpi-templates', $this->templatePayload($this->ids['u1'], $pillar))->assertUnprocessable()->assertJsonValidationErrors('items.0.pillar');
        }
        $csv = UploadedFile::fake()->createWithContent('custom.csv', "pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nKeamanan informasi,Kepatuhan,,,,95%,100\n");
        $this->postJson('/hc/kpi-templates/import-preview', ['file' => $csv])->assertOk()->assertJsonPath('data.valid', true)->assertJsonPath('data.items.0.pillar', 'Keamanan informasi');
        $this->asRole('ku1')->postJson('/hc/kpi-templates', $this->templatePayload($this->ids['u1']))->assertForbidden();
    }

    public function test_database_still_rejects_blank_pillars_after_relaxing_the_fixed_list(): void
    {
        $base = DB::table('kpi_templates')->where('id', $this->ids['template'])->first();
        $template = DB::table('kpi_templates')->insertGetId(['scope_id' => $base->scope_id, 'scope_level' => 'unit', 'scope_key' => $this->ids['u1'], 'name' => 'Unsealed constraint fixture', 'version' => 99, 'effective_from' => '2027-01-01', 'expected_item_count' => 1, 'created_by' => $this->users['hc']->id]);
        try {
            DB::table('kpi_items')->insert(['template_id' => $template, 'sort_order' => 1, 'pillar' => '   ', 'name' => 'Indikator', 'target_text' => '100%', 'weight_percent' => 100]);
            $this->fail('Whitespace-only pillar must be rejected by MySQL.');
        } catch (QueryException $error) {
            $this->assertSame(3819, $error->errorInfo[1]);
        }
    }

    public function test_removed_coverage_redirects_to_kpi_and_settings_no_longer_has_users_panel(): void
    {
        $this->asRole('hc')->get('/hc/placement')->assertRedirect('/hc/kpi-templates');
        $this->get('/hc/settings')->assertOk()->assertDontSee('data-panel="users"', false)->assertDontSee('>Cakupan KPI<', false);
        $this->asRole('ku1')->get('/unit/members')->assertOk()->assertDontSee('data-team-unit', false);
        $this->get('/unit/kpis')->assertOk()->assertDontSee('>Tindakan<', false)->assertDontSee('>Hanya baca<', false)->assertSee('KPI diatur oleh SDM');
    }
}
