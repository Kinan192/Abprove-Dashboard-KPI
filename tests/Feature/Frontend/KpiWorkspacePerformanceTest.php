<?php

namespace Tests\Feature\Frontend;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\BackendTestCase;

class KpiWorkspacePerformanceTest extends BackendTestCase
{
    public function test_light_master_omits_score_snapshots_but_preserves_weights_and_locks(): void
    {
        $document = $this->asRole('hc')->getJson('/hc/kpi-workspace')->assertOk()->json();
        $document['data']['kpis'] = array_values(array_filter($document['data']['kpis'], fn ($k) => ! ($k['unitId'] === (string) $this->ids['u1'] && $k['targetRole'] === 'staff')));
        $document['data']['kpis'][] = ['id' => 'performance-kpi', 'name' => 'KPI ringkas', 'pillar' => 'Technical Care', 'periodId' => '2026-11', 'unitId' => (string) $this->ids['u1'], 'targetRole' => 'staff', 'method' => 'manual', 'weight' => 100, 'active' => true, 'rubric' => 'Nilai berdasarkan bukti.', 'assignmentMode' => 'all', 'assigneeIds' => [], 'variables' => [], 'formula' => '', 'parentId' => '', 'target' => ''];
        $this->putJson('/hc/kpi-workspace?include_assessments=0', $document)->assertOk()->assertJsonPath('data.assessmentsLoaded', false)->assertJsonCount(0, 'data.assessments');
        $form = $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$this->ids['cycle'].'&employee_id='.$this->ids['member1'])->assertOk()->json('data.template');
        $assessment = $this->postJson('/unit/assessments', ['request_id' => (string) Str::uuid(), 'cycle_id' => $this->ids['cycle'], 'employee_id' => $this->ids['member1'], 'scores' => [['source_kpi_item_id' => $form['items'][0]['id'], 'score' => 80]]])->assertOk()->json('data');
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment['id'].'/approve', ['request_id' => (string) Str::uuid(), 'lock_version' => 0])->assertOk();
        $full = $this->asRole('hc')->getJson('/hc/kpi-workspace')->assertOk()->json('data');
        $light = $this->getJson('/hc/kpi-workspace?include_assessments=0')->assertOk()->json('data');
        $this->assertSame($full['kpis'], $light['kpis']);
        $this->assertSame($full['people'], $light['people']);
        $this->assertSame([], $light['assessments']);
        $this->assertFalse($light['assessmentsLoaded']);
        $this->assertContains('performance-kpi', $light['usedKpiIds']);
        $period = collect($light['periods'])->firstWhere('id', '2026-11');
        $this->assertTrue($period['hasAssessments']);
        $this->assertTrue($period['hasFinal']);
        $this->assertLessThan(strlen(json_encode($full)), strlen(json_encode($light)));
    }

    public function test_light_period_summary_keeps_pending_work_without_creating_assessments(): void
    {
        $data = $this->asRole('hc')->getJson('/hc/kpi-workspace?include_assessments=0')->assertOk()->json('data');
        $period = collect($data['periods'])->firstWhere('id', '2026-11');
        $this->assertTrue($period['hasPending']);
        $this->assertFalse($period['hasFinal']);
        $this->assertSame([], $data['assessments']);
        $this->assertSame(0, DB::table('assessments')->count());
    }
}
