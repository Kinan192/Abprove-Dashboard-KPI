<?php

namespace Tests\Feature\Frontend;

use App\Support\FrontendPages;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class PagesTest extends BackendTestCase
{
    public function test_login_and_all_role_navigation_pages_render_blade_with_scoped_shell(): void
    {
        $this->get('/login')->assertOk()->assertSee('Masuk ke akun Anda')->assertSee('Email atau NIP');
        foreach (['ku1' => 'kepala_unit', 'kd1' => 'kepala_divisi', 'hc' => 'super_hc'] as $key => $role) {
            foreach (FrontendPages::navigation($role) as [$path]) {
                $this->asRole($key)->get(FrontendPages::prefix($role).'/'.$path)->assertOk()->assertSee('kpi-config', false)->assertSee('data-app-shell="abprove"', false)->assertDontSee('Ganti role');
            }
        }
        foreach (['users', 'employees', 'positions'] as $page) {
            $this->asRole('hc')->get('/hc/organization/'.$page)->assertOk();
        }
        $this->get('/hc/import')->assertOk();
        $this->get('/hc/kpi-templates/new')->assertOk();
    }

    public function test_browser_is_redirected_to_login_and_wrong_role_remains_forbidden(): void
    {
        $this->get('/unit/score')->assertRedirect('/login');
        $this->asRole('ku1')->get('/hc/organization')->assertForbidden();
        $a = $this->startAssessment('ku2', 'member2');
        $this->asRole('ku1')->get('/unit/assessments/'.$a['id'])->assertNotFound();
        $this->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
    }

    public function test_json_contract_and_frontend_data_queries_do_not_expand_scope(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $this->asRole('ku1')->getJson('/unit/data/lookups')->assertOk()->assertJsonCount(1, 'data.units')->assertJsonMissingPath('data.users')->assertJsonMissingPath('data.employees');
        $this->getJson('/unit/data/analytics?cycle_id='.$this->ids['cycle'])->assertOk()->assertJsonPath('data.final_count', 0)->assertJsonCount(0, 'data.matrix.data');
        $this->getJson('/unit/data/assessments/'.$a['id'].'/comparison')->assertNotFound();
        $this->getJson('/unit/data/kpis?cycle_id='.$this->ids['cycle'])->assertOk()->assertJsonCount(1, 'data');
        $worklist = '/unit/members?needs_input=1&cycle_id='.$this->ids['cycle'];
        $this->getJson($worklist)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->ids['member1']);
        $this->getJson('/unit/members?needs_input=1')->assertUnprocessable();
        $sent = $this->startAssessment();
        $this->getJson($worklist)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/login')->assertOk()->assertJsonStructure(['csrf_token']);
    }

    public function test_import_preview_validates_csv_without_saving_template(): void
    {
        $file = UploadedFile::fake()->createWithContent('kpi.csv', "pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nTechnical Care,Dokumentasi,,,,95%,60\nEfficient,Efisiensi,,,,<20%,40\n");
        $count = DB::table('kpi_templates')->count();
        $this->asRole('hc')->postJson('/hc/kpi-templates/import-preview', ['file' => $file])->assertOk()->assertJsonPath('data.valid', true)->assertJsonPath('data.weight_total', '100.0000');
        $this->assertDatabaseCount('kpi_templates', $count);
    }

    public function test_import_bad_weights_are_reported_and_unit_cannot_import(): void
    {
        $file = UploadedFile::fake()->createWithContent('kpi.csv', "pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nTechnical Care,Dokumentasi,,,,95%,95\n");
        $this->asRole('hc')->postJson('/hc/kpi-templates/import-preview', ['file' => $file])->assertOk()->assertJsonPath('data.valid', false)->assertJsonStructure(['data' => ['errors' => ['weight_percent']]]);
        $this->asRole('ku1')->postJson('/hc/kpi-templates/import-preview', ['file' => $file])->assertForbidden();
    }
}
