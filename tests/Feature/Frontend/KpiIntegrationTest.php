<?php

namespace Tests\Feature\Frontend;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\BackendTestCase;

class KpiIntegrationTest extends BackendTestCase
{
    private function workspace(?string $month = null): array
    {
        return $this->asRole('hc')->getJson('/hc/kpi-workspace'.($month ? '?cycle='.$month : ''))->assertOk()->json();
    }

    private function period(): array
    {
        return ['id' => '2026-12', 'name' => 'Integrasi Desember', 'status' => 'planned', 'opens' => '2026-11-01T00:00', 'submission' => '2026-12-20T23:59', 'approval' => '2026-12-25T23:59', 'closes' => '2026-12-31T23:59', 'categories' => ['sb' => 90, 'b' => 80, 'c' => 70]];
    }

    private function definition(array $data, string $role, bool $automatic = false): array
    {
        $person = collect($data['people'])->first(fn ($p) => $p['type'] === $role && $p['unitId'] === (string) $this->ids['u1']);

        return ['id' => 'integration-'.$role, 'name' => 'KPI integrasi '.$role, 'pillar' => 'Technical Care', 'periodId' => '2026-12', 'unitId' => (string) $this->ids['u1'], 'divisionId' => (string) $this->ids['d1'], 'targetRole' => $role, 'weight' => 100, 'method' => $automatic ? 'formula' : 'manual', 'active' => true, 'rubric' => 'Nilai berdasarkan bukti.', 'assignmentMode' => 'selected', 'assigneeIds' => [$person['id']], 'parentId' => '', 'target' => 80, 'unit' => '%', 'direction' => 'higher', 'formula' => $automatic ? 'A / B * 100' : '', 'variables' => $automatic ? [['key' => 'A', 'label' => 'Selesai', 'source' => 'manual'], ['key' => 'B', 'label' => 'Total', 'source' => 'fixed', 'value' => 100]] : [], 'policy' => ['min' => 10, 'max' => 100, 'rule' => 'target-normalized', 'zeroRule' => 'pending']];
    }

    private function save(array $document)
    {
        return $this->asRole('hc')->putJson('/hc/kpi-workspace', $document);
    }

    private function publish(bool $automatic = true): array
    {
        $document = $this->workspace();
        $document['data']['periods'][] = $this->period();
        $document['data']['kpis'][] = $this->definition($document['data'], 'staff', $automatic);
        $document['data']['kpis'][] = $this->definition($document['data'], 'unit_head');
        $document = $this->save($document)->assertOk()->json();
        foreach ($document['data']['periods'] as &$period) {
            if ($period['id'] === '2026-12') {
                $period['status'] = 'open';
            }
        }
        unset($period);

        return $this->save($document)->assertOk()->json();
    }

    public function test_authoring_period_and_individual_kpis_feed_real_assessment_approval_reports_and_monitoring(): void
    {
        $this->publish();
        $cycle = DB::table('assessment_cycles')->where('assessment_month', '2026-12-01')->value('id');
        $form = $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$cycle.'&employee_id='.$this->ids['member1'])->assertOk()->json('data.template');
        $this->assertSame('KPI integrasi staff', $form['items'][0]['name']);
        $payload = ['request_id' => (string) Str::uuid(), 'cycle_id' => $cycle, 'employee_id' => $this->ids['member1'], 'scores' => [['source_kpi_item_id' => $form['items'][0]['id'], 'score' => 99, 'inputs' => ['variable_A' => 61, 'variable_B' => 1]]]];
        $assessment = $this->postJson('/unit/assessments', $payload)->assertOk()->json();
        $row = DB::table('assessments')->where('cycle_id', $cycle)->where('employee_id', $this->ids['member1'])->first();
        $this->assertEquals(76.25, $row->total_score_raw);
        $item = DB::table('assessment_items')->where('assessment_id', $row->id)->first();
        $this->assertEquals(100, json_decode($item->measurement_inputs, true)['variable_B']);
        $this->asRole('kd1')->postJson('/division/assessments/'.$row->id.'/approve', ['request_id' => (string) Str::uuid(), 'lock_version' => 0])->assertOk();
        $this->asRole('hc')->getJson('/hc/data/insights?cycle_id='.$cycle)->assertOk()->assertJsonPath('data.metrics.final', 1);
        $monitor = $this->workspace('2026-12')['data']['assessments'];
        $record = collect($monitor)->firstWhere('dbId', $row->id);
        $this->assertSame('final', $record['status']);
        $this->assertEquals(76.25, $record['finalTotal']);
        $head = $this->asRole('kd1')->getJson('/division/assessment-form?cycle_id='.$cycle.'&subject_user_id='.$this->users['ku1']->id)->assertOk()->json('data.template');
        $this->postJson('/division/assessments', ['request_id' => (string) Str::uuid(), 'cycle_id' => $cycle, 'subject_user_id' => $this->users['ku1']->id, 'scores' => [['source_kpi_item_id' => $head['items'][0]['id'], 'score' => 88]]])->assertOk();
        $this->assertDatabaseHas('assessments', ['cycle_id' => $cycle, 'subject_user_id' => $this->users['ku1']->id, 'status' => 'final', 'total_score_raw' => 88]);
        $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$cycle.'&employee_id='.$this->ids['member2'])->assertNotFound();
        $this->asRole('hc')->postJson('/hc/assessments', $payload)->assertStatus(405);
    }

    public function test_partial_weights_invalid_configuration_and_forged_monitoring_cannot_create_results(): void
    {
        $document = $this->workspace();
        $document['data']['periods'][] = $this->period();
        $definition = $this->definition($document['data'], 'staff');
        $definition['weight'] = 50;
        $document['data']['kpis'][] = $definition;
        $document = $this->save($document)->assertOk()->json();
        $this->assertDatabaseHas('kpi_workspace_publications', ['person_key' => 'staff-'.$this->ids['member1'], 'template_id' => null]);
        $cycle = DB::table('assessment_cycles')->where('assessment_month', '2026-12-01')->value('id');
        $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$cycle.'&employee_id='.$this->ids['member1'])->assertUnprocessable();
        $document['data']['kpis'][array_key_last($document['data']['kpis'])]['weight'] = -500;
        $this->save($document)->assertUnprocessable();
        $document['data']['kpis'][array_key_last($document['data']['kpis'])]['weight'] = 100;
        $document['data']['assessments'][] = ['id' => 'forged', 'status' => 'final', 'finalTotal' => 100];
        $saved = $this->save($document)->assertOk()->json();
        $this->assertFalse(collect($saved['data']['assessments'])->contains('id', 'forged'));
        $this->save($document)->assertUnprocessable()->assertJsonValidationErrors('revision');
    }

    public function test_new_staff_and_existing_kpis_are_loaded_without_demo_filters(): void
    {
        $document = $this->workspace();
        $this->assertNotEmpty($document['data']['kpis']);
        $employee = DB::table('employees')->insertGetId(['nip' => 'INTEGRATION-NEW', 'full_name' => 'Staf integrasi baru', 'position_id' => $this->ids['position']]);
        DB::table('employee_placements')->insert(['employee_id' => $employee, 'unit_id' => $this->ids['u1'], 'division_id' => $this->ids['d1'], 'effective_from' => '2026-11-01', 'reason' => 'Integration test', 'created_by' => $this->users['hc']->id]);
        $fresh = $this->workspace();
        $this->assertTrue(collect($fresh['data']['people'])->contains('nip', 'INTEGRATION-NEW'));
    }

    public function test_returned_assessment_keeps_its_formula_snapshot_when_hc_edits_the_master(): void
    {
        $document = $this->publish();
        $cycle = DB::table('assessment_cycles')->where('assessment_month', '2026-12-01')->value('id');
        $form = $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$cycle.'&employee_id='.$this->ids['member1'])->assertOk()->json('data.template');
        $this->postJson('/unit/assessments', ['request_id' => (string) Str::uuid(), 'cycle_id' => $cycle, 'employee_id' => $this->ids['member1'], 'scores' => [['source_kpi_item_id' => $form['items'][0]['id'], 'inputs' => ['variable_A' => 60]]]])->assertOk();
        $assessment = DB::table('assessments')->where('cycle_id', $cycle)->where('employee_id', $this->ids['member1'])->first();
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment->id.'/return', ['request_id' => (string) Str::uuid(), 'lock_version' => 0, 'reason' => 'Periksa bukti.'])->assertOk();
        foreach ($document['data']['kpis'] as &$definition) {
            if ($definition['id'] === 'integration-staff') {
                $definition['target'] = 100;
            }
        }
        unset($definition);
        $this->save($document)->assertOk();
        $this->asRole('ku1')->postJson('/unit/assessments/'.$assessment->id.'/resubmit', ['request_id' => (string) Str::uuid(), 'lock_version' => 1, 'scores' => [['source_kpi_item_id' => $form['items'][0]['id'], 'inputs' => ['variable_A' => 40]]]])->assertOk();
        $this->assertEquals(50, DB::table('assessments')->where('id', $assessment->id)->value('total_score_raw'));
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment->id.'/approve', ['request_id' => (string) Str::uuid(), 'lock_version' => 2])->assertOk();
        $this->asRole('ku1')->postJson('/unit/assessments/'.$assessment->id.'/resubmit', ['request_id' => (string) Str::uuid(), 'lock_version' => 3, 'scores' => [['source_kpi_item_id' => $form['items'][0]['id'], 'inputs' => ['variable_A' => 99]]]])->assertConflict();
    }
}
