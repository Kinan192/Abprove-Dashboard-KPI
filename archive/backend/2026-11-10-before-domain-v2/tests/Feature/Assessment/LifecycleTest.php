<?php

namespace Tests\Feature\Assessment;

use App\Exceptions\BusinessRule;
use App\Models\Assessment;
use App\Models\AssessmentItem;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class LifecycleTest extends BackendTestCase
{
    public function test_member_submission_is_final_on_division_approval_without_hc_step(): void
    {
        $a = $this->submitted();
        $this->assertSame('submitted', $a['status']);
        $this->assertSame('82.750000', $a['total_score_raw']);
        $final = $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->json('data');
        $this->assertSame('final', $final['status']);
        $this->assertSame('baik', $final['category_code_snapshot']);
        $this->assertEquals($this->users['kd1']->id, $final['finalized_by']);
        $this->assertEquals($this->users['kd1']->id, $final['approved_by']);
        $this->asRole('hc')->postJson('/hc/assessments/'.$a['id'].'/finalize', $this->key())->assertNotFound();
        $this->asRole('ku1')->patchJson('/unit/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => $final['lock_version'], 'positive_finding' => 'Manipulasi']))->assertConflict()->assertJsonPath('code', 'FINAL_IMMUTABLE');
        $this->assertDatabaseCount('audit_events', 4);
    }

    public function test_division_head_scores_unit_head_and_its_decision_is_final(): void
    {
        $a = $this->startAssessment('kd1', 'head1');
        $this->assertSame('unit_head', $a['assessment_kind']);
        $this->assertNotNull($a['head_assignment_id']);
        $a = $this->fillAssessment($a, 'kd1');
        $this->asRole('ku1')->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->assertJsonPath('data.status', 'final');
    }

    public function test_return_requires_reason_then_unit_can_correct_and_resubmit(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/return', $this->key(['lock_version' => $a['lock_version']]))->assertUnprocessable();
        $a = $this->postJson('/division/assessments/'.$a['id'].'/return', $this->key(['lock_version' => $a['lock_version'], 'reason' => 'Periksa kembali dokumentasi']))->assertOk()->assertJsonPath('data.status', 'returned')->json('data');
        $a = $this->fillAssessment($a);
        $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->assertJsonPath('data.status', 'submitted');
        $this->asRole('kd1')->patchJson('/division/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => $a['lock_version']]))->assertForbidden();
    }

    public function test_incomplete_draft_and_invalid_scores_do_not_submit_or_coerce(): void
    {
        $a = $this->startAssessment();
        $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => 0]))->assertUnprocessable()->assertJsonPath('code', 'SCORES_INCOMPLETE');
        foreach ([0, 9, 101, -1, 82.5, '90.0', '1e2', true] as $score) {
            $this->patchJson('/unit/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => 0, 'scores' => [['id' => $a['items'][0]['id'], 'score' => $score]]]))->assertUnprocessable();
        }
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'status' => 'draft', 'lock_version' => 0, 'total_score_raw' => null]);
    }

    public function test_stale_version_and_replay_protect_changes(): void
    {
        $a = $this->startAssessment();
        $body = $this->key(['lock_version' => 0, 'positive_finding' => 'Baik']);
        $url = '/unit/assessments/'.$a['id'].'/draft';
        $this->asRole('ku1')->patchJson($url, $body)->assertOk()->assertJsonPath('replayed', false);
        $this->patchJson($url, $body)->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('data.lock_version', 1);
        $this->patchJson($url, array_replace($body, ['positive_finding' => 'Isi berbeda']))->assertConflict()->assertJsonPath('code', 'IDEMPOTENCY_CONFLICT');
        $this->patchJson($url, $this->key(['lock_version' => 0]))->assertConflict()->assertJsonPath('code', 'STALE_VERSION');
        $this->assertDatabaseCount('audit_events', 2);
    }

    public function test_bulk_approval_rolls_back_every_row_when_one_version_is_stale(): void
    {
        $a = $this->submitted();
        $e = DB::table('employees')->insertGetId(['nip' => 'extra', 'full_name' => 'extra', 'position_id' => $this->ids['position']]);
        DB::table('employee_placements')->insert(['employee_id' => $e, 'unit_id' => $this->ids['u1'], 'division_id' => $this->ids['d1']]);
        $this->ids['extra'] = $e;
        $b = $this->submitted('ku1', 'extra');
        $auditCount = DB::table('audit_events')->count();
        $this->asRole('kd1')->postJson('/division/approvals/bulk', $this->key(['assessments' => [['id' => $a['id'], 'lock_version' => $a['lock_version']], ['id' => $b['id'], 'lock_version' => 999]]]))->assertConflict();
        $this->assertSame(2, Assessment::where('status', 'submitted')->count());
        $this->assertDatabaseCount('audit_events', $auditCount);
    }

    public function test_final_is_immutable_through_model_and_snapshot_survives_master_changes(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        DB::table('employees')->where('id', $this->ids['member1'])->update(['full_name' => 'Nama baru']);
        $this->asRole('hc')->getJson('/hc/assessments/'.$a['id'])->assertOk()->assertJsonPath('data.employee_name_snapshot', 'member1');
        $item = AssessmentItem::findOrFail($a['items'][0]['id']);
        $item->score = 10;
        $this->expectException(BusinessRule::class);
        $item->save();
    }

    public function test_withdraw_and_deadline_guard(): void
    {
        $a = $this->submitted();
        $a = $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/withdraw', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->assertJsonPath('data.status', 'draft')->json('data');
        DB::table('assessment_cycles')->where('id', $this->ids['cycle'])->update(['submission_due_at' => now()->subMinute()]);
        $this->postJson('/unit/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => $a['lock_version']]))->assertConflict()->assertJsonPath('code', 'CYCLE_NOT_WRITABLE');
    }
}
