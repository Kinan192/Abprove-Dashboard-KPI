<?php

namespace Tests\Feature\Assessment;

use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class MasterRulesTest extends BackendTestCase
{
    private function templateData(string $weight = '100.0000'): array
    {
        $year = now()->year;

        return $this->key(['position_id' => $this->ids['position'], 'name' => 'Versi Baru', 'template_year' => $year,
            'effective_from' => "$year-01-01", 'effective_until' => "$year-12-31", 'items' => [['pillar' => 'Technical Care', 'name' => 'KPI tunggal', 'weight_percent' => $weight]]]);
    }

    public function test_weight_must_be_exactly_one_hundred_and_overlap_is_rejected(): void
    {
        $this->asRole('hc')->postJson('/hc/kpi-templates', $this->templateData('99.9999'))->assertUnprocessable()->assertJsonPath('code', 'INVALID_WEIGHT');
        $t = $this->postJson('/hc/kpi-templates', $this->templateData())->assertOk()->assertJsonPath('data.version', 2)->json('data');
        $this->postJson('/hc/kpi-templates/'.$t['id'].'/publish', $this->key())->assertConflict()->assertJsonPath('code', 'TEMPLATE_OVERLAP');
    }

    public function test_published_template_cannot_be_edited_and_snapshot_uses_single_source(): void
    {
        $this->asRole('hc')->patchJson('/hc/kpi-templates/'.$this->ids['template'], $this->templateData())->assertConflict()->assertJsonPath('code', 'TEMPLATE_IMMUTABLE');
        $a = $this->startAssessment();
        $this->assertCount(6, $a['items']);
        $this->assertEquals('15.0000', $a['items'][0]['weight_percent_snapshot']);
    }

    public function test_categories_reject_gaps_and_cycle_freezes_after_use(): void
    {
        $cycle = DB::table('assessment_cycles')->where('id', $this->ids['cycle'])->first();
        $data = $this->key(['assessment_month' => $cycle->assessment_month, 'opens_at' => now()->subDay()->toIso8601String(), 'submission_due_at' => now()->addDays(2)->toIso8601String(), 'approval_due_at' => now()->addDays(3)->toIso8601String(), 'closes_at' => now()->addDays(4)->toIso8601String(), 'status' => 'open',
            'categories' => [['code' => 'a', 'label' => 'A', 'lower_bound' => '0', 'upper_bound' => '70'], ['code' => 'b', 'label' => 'B', 'lower_bound' => '80', 'upper_bound' => null]]]);
        $this->asRole('hc')->patchJson('/hc/cycles/'.$this->ids['cycle'], $data)->assertUnprocessable()->assertJsonPath('code', 'INVALID_CATEGORIES');
        $data['categories'][1]['lower_bound'] = '70';
        $data['request_id'] = $this->key()['request_id'];
        $this->patchJson('/hc/cycles/'.$this->ids['cycle'], $data)->assertOk();
        $this->startAssessment();
        $data['request_id'] = $this->key()['request_id'];
        $this->asRole('hc')->patchJson('/hc/cycles/'.$this->ids['cycle'], $data)->assertConflict()->assertJsonPath('code', 'CYCLE_IN_USE');
    }

    public function test_raw_decimal_result_is_not_rounded_before_category_resolution(): void
    {
        $a = $this->startAssessment();
        $a = $this->fillAssessment($a);
        $this->assertSame('82.750000', $a['total_score_raw']);
        $this->assertSame('13.500000', $a['items'][0]['weighted_result_raw']);
    }
}
