<?php

namespace Tests\Feature\Frontend;

use Tests\Support\BackendTestCase;

class RevisionV4Test extends BackendTestCase
{
    public function test_hc_creates_and_edits_masters_without_typing_a_code(): void
    {
        $row = $this->asRole('hc')->postJson('/hc/organization/positions', $this->key(['name' => 'Analis Tanpa Kode']))->assertOk()->json('data');
        $this->assertNotEmpty($row['code']);
        $this->assertLessThanOrEqual(32, strlen($row['code']));
        $edited = $this->patchJson('/hc/organization/positions/'.$row['id'], $this->key(['name' => 'Analis Revisi']))->assertOk()->json('data');
        $this->assertSame($row['code'], $edited['code']);
        $other = $this->postJson('/hc/organization/positions', $this->key(['name' => 'Jabatan Lain']))->assertOk()->json('data');
        $this->assertNotSame($row['code'], $other['code']);
        $this->asRole('ku1')->postJson('/hc/organization/positions', $this->key(['name' => 'Dilarang']))->assertForbidden();
    }

    public function test_insights_uses_final_snapshot_scores_and_keeps_criteria_groups_separate(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $this->startAssessment('kd1', 'head1');
        $this->submitted('ku2', 'member2');
        $r = $this->asRole('hc')->getJson('/hc/data/insights?cycle_id='.$this->ids['cycle'])->assertOk();
        $r->assertJsonPath('data.metrics.total', 4)->assertJsonPath('data.metrics.final', 2)->assertJsonPath('data.metrics.submitted', 1)->assertJsonCount(12, 'data.item_averages')->assertJsonCount(2, 'data.unit_status')->assertJsonCount(2, 'data.division_progress')->assertJsonCount(2, 'data.rankings')->assertJsonCount(2, 'data.scores');
        $this->assertSame('90.000000', $r->json('data.item_averages.0.average'));
        $this->assertSame('13.500000', $r->json('data.item_averages.0.weighted_average'));
        $this->getJson('/hc/data/insights?cycle_id='.$this->ids['cycle'].'&kind=member')->assertJsonPath('data.metrics.final', 1)->assertJsonCount(6, 'data.item_averages');
    }

    public function test_report_filters_cannot_expand_unit_or_division_scope(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $this->asRole('kd2')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $r = $this->asRole('ku1')->getJson('/unit/data/insights?cycle_id='.$this->ids['cycle'])->assertOk()->assertJsonPath('data.metrics.final', 0)->assertJsonCount(1, 'data.unit_status');
        $this->assertStringNotContainsString('member2', $r->getContent());
        $this->getJson('/unit/data/insights?cycle_id='.$this->ids['cycle'].'&unit_id='.$this->ids['u2'])->assertOk()->assertJsonPath('data.metrics.total', 0)->assertJsonCount(0, 'data.scores');
        $this->asRole('kd1')->getJson('/division/data/insights?cycle_id='.$this->ids['cycle'].'&division_id='.$this->ids['d2'])->assertOk()->assertJsonPath('data.metrics.total', 0);
    }

    public function test_grouped_navigation_keeps_active_views_accessible_without_removed_coverage(): void
    {
        $this->asRole('hc')->get('/hc/organization')->assertOk()->assertSee('Tambah unit')->assertSee('data-org-tab="position"', false)->assertSee('data-org-tab="staff"', false)->assertDontSee('label="Kode"', false);
        $this->get('/hc/kpi-templates')->assertOk()->assertSee('data-simple-kpi', false)->assertSee('Memuat KPI &amp; periode', false);
        $this->asRole('ku1')->get('/unit/history')->assertOk()->assertSee('Nilai per karyawan')->assertSee('Temuan staf')->assertSee('data-reference-layout="report"', false);
        $this->asRole('kd1')->get('/division/dashboard')->assertOk()->assertSee('Progres per unit')->assertSee('Menunggu persetujuan');
    }
}
