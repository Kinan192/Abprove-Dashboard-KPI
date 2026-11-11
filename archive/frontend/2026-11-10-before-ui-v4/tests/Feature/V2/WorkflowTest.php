<?php

namespace Tests\Feature\V2;

use App\Models\Assessment;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\BackendTestCase;

class WorkflowTest extends BackendTestCase
{
    private function account(string $role, string $name): array
    {
        return $this->asRole('hc')->postJson('/hc/organization/users', $this->key(['name' => $name, 'email' => $name.'@example.test', 'login_nip' => 'NEW-'.$name, 'role_key' => $role, 'password' => 'NewPassword1234']))->assertOk()->json('data');
    }

    private function staff(string $name = 'extra'): array
    {
        return $this->asRole('hc')->postJson('/hc/organization/employees', $this->key(['full_name' => $name, 'nip' => $name, 'position_id' => $this->ids['position'], 'unit_id' => $this->ids['u1']]))->assertOk()->json('data');
    }

    private function templatePayload(string $from = '2026-12-01'): array
    {
        return $this->key(['scope_level' => 'unit', 'unit_id' => $this->ids['u1'], 'name' => 'KPI baru', 'effective_from' => $from, 'items' => [['pillar' => 'Technical Care', 'name' => 'KPI A', 'target_text' => '95%', 'weight_percent' => '60'], ['pillar' => 'Efficient', 'name' => 'KPI B', 'target_text' => '100%', 'weight_percent' => '40']]]);
    }

    private function approve(array $a, string $role = 'kd1')
    {
        return $this->asRole($role)->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]));
    }

    private function cyclePayload(string $status = 'planned'): array
    {
        return $this->key(['assessment_month' => '2026-12-01', 'opens_at' => '2026-12-01T00:00:00+07:00', 'submission_due_at' => '2027-01-05T23:59:59+07:00', 'approval_due_at' => '2027-01-10T23:59:59+07:00', 'closes_at' => '2027-01-15T23:59:59+07:00', 'status' => $status, 'categories' => [['code' => 'all', 'label' => 'Latihan', 'lower_bound' => '0', 'upper_bound' => null]]]);
    }

    public function test_opening_a_form_does_not_persist_any_assessment_or_audit(): void
    {
        $before = DB::table('audit_events')->count();
        $this->asRole('ku1')->getJson('/unit/assessment-form?cycle_id='.$this->ids['cycle'].'&employee_id='.$this->ids['member1'])->assertOk()->assertJsonCount(6, 'data.template.items');
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('assessment_items', 0);
        $this->assertDatabaseCount('audit_events', $before);
    }

    public function test_incomplete_submission_rolls_back_everything(): void
    {
        $p = $this->payload();
        array_pop($p['scores']);
        $before = DB::table('audit_events')->count();
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertUnprocessable()->assertJsonPath('code', 'SCORES_INCOMPLETE');
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('assessment_items', 0);
        $this->assertDatabaseCount('operation_requests', 0);
        $this->assertDatabaseCount('audit_events', $before);
    }

    public static function badScores(): array
    {
        return [[9], [101], [90.5], ['90.5'], ['1e2'], [null], [true], ['090'], ['abc'], [-1]];
    }

    #[DataProvider('badScores')]
    public function test_integer_score_validation_precedes_mysql_coercion(mixed $value): void
    {
        $p = $this->payload();
        $p['scores'][0]['score'] = $value;
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('assessment_items', 0);
    }

    public function test_complete_staff_submission_has_authoritative_scope_and_exact_decimal_total(): void
    {
        $a = $this->submitted();
        $this->assertSame('submitted', $a['status']);
        $this->assertSame('82.750000', $a['total_score_raw']);
        $this->assertCount(6, $a['items']);
        $this->assertSame($this->ids['u1'], $a['unit_id']);
        $this->assertSame($this->ids['unitTemplate1'], $a['kpi_template_id']);
        $this->assertNull($a['subject_user_id']);
        $this->assertDatabaseCount('employees', 2);
    }

    public function test_foreign_or_duplicate_kpi_item_is_rejected(): void
    {
        $p = $this->payload();
        $p['scores'][0]['source_kpi_item_id'] = DB::table('kpi_items')->where('template_id', $this->ids['unitTemplate2'])->value('id');
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertUnprocessable();
        $p = $this->payload();
        $p['scores'][1]['source_kpi_item_id'] = $p['scores'][0]['source_kpi_item_id'];
        $this->postJson('/unit/assessments', $p)->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_client_cannot_set_status_total_or_scope(): void
    {
        $p = $this->payload() + ['status' => 'final', 'total_score_raw' => 100, 'unit_id' => $this->ids['u2']];
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_draft_and_partial_submit_routes_no_longer_exist(): void
    {
        $this->asRole('ku1')->patchJson('/unit/assessments/1/draft', $this->key())->assertNotFound();
        $this->postJson('/unit/assessments/1/submit', $this->key())->assertNotFound();
        $this->postJson('/unit/assessments', $this->key(['employee_id' => $this->ids['member1'], 'cycle_id' => $this->ids['cycle']]))->assertUnprocessable();
        $this->assertDatabaseCount('assessments', 0);
    }

    public function test_unit_isolation_applies_before_detail_timeline_count_and_export(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $this->asRole('ku1')->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
        $this->getJson('/unit/assessments/'.$a['id'].'/timeline')->assertNotFound();
        $this->getJson('/unit/data/assessments/'.$a['id'].'/comparison')->assertNotFound();
        $this->getJson('/unit/recap?status=all&cycle_id='.$this->ids['cycle'].'&unit_id='.$this->ids['u2'])->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/unit/assessments', $this->payload('ku2', 'member2'))->assertNotFound();
    }

    public function test_kd_cannot_review_another_division(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $this->approve($a)->assertNotFound();
        $this->postJson('/division/assessments/'.$a['id'].'/return', $this->key(['lock_version' => 0, 'reason' => 'Periksa']))->assertNotFound();
    }

    public function test_hc_has_no_scoring_or_decision_permission(): void
    {
        $a = $this->submitted();
        $this->asRole('hc')->postJson('/unit/assessments', $this->payload())->assertForbidden();
        $this->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => 0]))->assertForbidden();
        $this->postJson('/division/assessments/'.$a['id'].'/return', $this->key(['lock_version' => 0, 'reason' => 'Tidak']))->assertForbidden();
    }

    public function test_kd_does_not_change_staff_numbers_and_ku_does_not_score_heads(): void
    {
        $a = $this->submitted();
        $p = $this->payload() + ['lock_version' => 0];
        $p['scores'][0]['score'] = 100;
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/resubmit', $p)->assertForbidden();
        $this->asRole('ku1')->postJson('/division/assessments', $this->payload('kd1', 'head1'))->assertForbidden();
        $this->assertSame(90, DB::table('assessment_items')->where('assessment_id', $a['id'])->orderBy('sort_order')->value('score'));
    }

    public function test_kd_head_assessment_uses_account_subject_and_division_template_and_is_immediately_final(): void
    {
        $a = $this->startAssessment('kd1', 'head1');
        $this->assertSame('final', $a['status']);
        $this->assertNull($a['employee_id']);
        $this->assertSame($this->users['ku1']->id, $a['subject_user_id']);
        $this->assertSame($this->ids['divisionTemplate1'], $a['kpi_template_id']);
        $this->assertSame($this->users['kd1']->id, $a['finalized_by']);
        $this->assertDatabaseCount('employees', 2);
        $this->asRole('ku1')->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
    }

    public function test_return_requires_reason_then_complete_resubmission_and_final(): void
    {
        $a = $this->submitted();
        $url = '/division/assessments/'.$a['id'].'/return';
        $this->asRole('kd1')->postJson($url, $this->key(['lock_version' => 0, 'reason' => ' ']))->assertUnprocessable();
        $returned = $this->postJson($url, $this->key(['lock_version' => 0, 'reason' => 'Periksa layanan']))->assertOk()->json('data');
        $this->assertSame('returned', $returned['status']);
        $p = $this->payload() + ['lock_version' => 1, 'positive_finding' => 'Sudah diperiksa'];
        foreach ($p['scores'] as &$score) {
            $score['score'] = 90;
        }unset($score);
        $again = $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/resubmit', $p)->assertOk()->json('data');
        $this->assertSame('submitted', $again['status']);
        $this->assertSame('90.000000', $again['total_score_raw']);
        $this->assertNull($again['return_reason']);
        $this->approve($again)->assertOk()->assertJsonPath('data.status', 'final')->assertJsonPath('data.category_code_snapshot', 'sangat_baik');
    }

    public function test_submitted_is_locked_and_stale_versions_fail(): void
    {
        $a = $this->submitted();
        $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/resubmit', $this->payload() + ['lock_version' => 0])->assertConflict();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => 9]))->assertConflict()->assertJsonPath('code', 'STALE_VERSION');
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'status' => 'submitted', 'lock_version' => 0]);
    }

    public function test_uuid_replay_does_not_duplicate_mutations_or_audit_and_different_payload_fails(): void
    {
        $p = $this->payload();
        $first = $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->json('data');
        $this->postJson('/unit/assessments', $p)->assertOk()->assertJsonPath('replayed', true)->assertJsonPath('data.id', $first['id']);
        $this->assertSame(1, DB::table('audit_events')->where('action', 'assessment.submitted')->count());
        $this->approve($first)->assertOk();
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->assertJsonPath('replayed', true);
        $this->assertDatabaseHas('assessments', ['id' => $first['id'], 'status' => 'final']);
        $p['scores'][0]['score'] = 100;
        $this->postJson('/unit/assessments', $p)->assertConflict()->assertJsonPath('code', 'IDEMPOTENCY_CONFLICT');
    }

    public function test_other_actor_cannot_replay_a_request_uuid(): void
    {
        $p = $this->payload();
        $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk();
        $this->asRole('ku2')->postJson('/unit/assessments', $p)->assertConflict()->assertJsonPath('code', 'IDEMPOTENCY_CONFLICT');
    }

    public function test_withdraw_removes_values_retains_audit_and_replay_works_after_delete(): void
    {
        $a = $this->submitted();
        $p = $this->key(['lock_version' => 0]);
        $url = '/unit/assessments/'.$a['id'].'/withdraw';
        $this->asRole('ku1')->postJson($url, $p)->assertOk()->assertJsonPath('data.status', 'not_started')->assertJsonPath('data.deleted', true);
        $this->assertDatabaseCount('assessments', 0);
        $this->assertDatabaseCount('assessment_items', 0);
        $this->assertDatabaseHas('audit_events', ['assessment_id' => $a['id'], 'action' => 'assessment.withdrawn']);
        $this->postJson($url, $p)->assertOk()->assertJsonPath('replayed', true);
        $this->postJson($url, $this->key(['lock_version' => 0]))->assertNotFound();
        $this->getJson('/unit/members?needs_input=1&cycle_id='.$this->ids['cycle'])->assertJsonCount(1, 'data');
    }

    public function test_final_is_immutable_in_api_and_direct_database_access(): void
    {
        $a = $this->approve($this->submitted())->assertOk()->json('data');
        $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/withdraw', $this->key(['lock_version' => $a['lock_version']]))->assertConflict();
        foreach ([fn () => DB::table('assessments')->where('id', $a['id'])->update(['positive_finding' => 'Ubah']), fn () => DB::table('assessment_items')->where('assessment_id', $a['id'])->update(['score' => 99]), fn () => DB::table('assessments')->where('id', $a['id'])->delete()] as $operation) {
            try {
                $operation();
                $this->fail('Final must remain immutable.');
            } catch (QueryException $e) {
                $this->assertStringContainsString('FINAL_IMMUTABLE', $e->getMessage());
            }
        }
    }

    public function test_bulk_is_atomic_if_a_later_record_is_already_final(): void
    {
        $extra = $this->staff();
        $a = $this->submitted();
        $p = $this->payload();
        $p['employee_id'] = $extra['id'];
        $b = $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->json('data');
        $this->approve($b)->assertOk();
        $audit = DB::table('audit_events')->count();
        $this->asRole('kd1')->postJson('/division/approvals/bulk', $this->key(['assessments' => [['id' => $a['id'], 'lock_version' => 0], ['id' => $b['id'], 'lock_version' => 1]]]))->assertConflict();
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'status' => 'submitted']);
        $this->assertDatabaseCount('audit_events', $audit);
    }

    public function test_bulk_approves_all_selected_staff_in_own_division(): void
    {
        $extra = $this->staff();
        $a = $this->submitted();
        $p = $this->payload();
        $p['employee_id'] = $extra['id'];
        $b = $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->json('data');
        $this->asRole('kd1')->postJson('/division/approvals/bulk', $this->key(['assessments' => [['id' => $a['id'], 'lock_version' => 0], ['id' => $b['id'], 'lock_version' => 0]]]))->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(2, DB::table('assessments')->where('status', 'final')->count());
    }

    public function test_template_apply_is_scoped_and_role_readonly(): void
    {
        $this->asRole('ku1')->getJson('/unit/data/kpis?cycle_id='.$this->ids['cycle'])->assertJsonCount(1, 'data')->assertJsonPath('data.0.scope_level', 'unit');
        $this->asRole('kd1')->getJson('/division/data/kpis?cycle_id='.$this->ids['cycle'])->assertJsonCount(1, 'data')->assertJsonPath('data.0.scope_level', 'division');
        $this->asRole('ku1')->postJson('/hc/kpi-templates', $this->templatePayload())->assertForbidden();
        $p = $this->templatePayload();
        $p['items'][1]['weight_percent'] = 39;
        $this->asRole('hc')->postJson('/hc/kpi-templates', $p)->assertUnprocessable();
        $this->assertDatabaseCount('kpi_templates', 4);
    }

    public function test_new_template_version_and_unused_delete_preserve_snapshot_and_version_counter(): void
    {
        $a = $this->approve($this->submitted())->assertOk()->json('data');
        $old = $a['items'];
        $t = $this->asRole('hc')->postJson('/hc/kpi-templates', $this->templatePayload())->assertOk()->json('data');
        $this->assertSame(2, $t['version']);
        $this->assertNotNull($t['sealed_at']);
        $this->deleteJson('/hc/kpi-templates/'.$t['id'], $this->key())->assertOk();
        $t3 = $this->postJson('/hc/kpi-templates', $this->templatePayload('2027-01-01'))->assertOk()->json('data');
        $this->assertSame(3, $t3['version']);
        $this->deleteJson('/hc/kpi-templates/'.$a['kpi_template_id'], $this->key())->assertConflict();
        $this->assertSame($old, Assessment::findOrFail($a['id'])->load('items')->toArray()['items']);
    }

    public function test_template_cannot_replace_a_range_with_assessments(): void
    {
        $this->submitted();
        $this->asRole('hc')->postJson('/hc/kpi-templates', $this->templatePayload('2026-11-01'))->assertConflict()->assertJsonPath('code', 'TEMPLATE_RANGE_IN_USE');
        $this->assertDatabaseCount('kpi_templates', 4);
    }

    public function test_cycle_settings_freeze_after_submission_and_close_stops_scoring(): void
    {
        $a = $this->submitted();
        $p = $this->cyclePayload();
        $p['assessment_month'] = '2026-11-01';
        $this->asRole('hc')->patchJson('/hc/cycles/'.$this->ids['cycle'], $p)->assertConflict()->assertJsonPath('code', 'CYCLE_IN_USE');
        $this->postJson('/hc/cycles/'.$this->ids['cycle'].'/close', $this->key())->assertOk();
        $this->approve($a)->assertConflict()->assertJsonPath('code', 'CYCLE_NOT_WRITABLE');
    }

    public function test_cycle_crud_and_readiness(): void
    {
        $p = $this->cyclePayload();
        $c = $this->asRole('hc')->postJson('/hc/cycles', $p)->assertOk()->json('data');
        $this->deleteJson('/hc/cycles/'.$c['id'], $this->key())->assertOk();
        DB::table('units')->where('id', $this->ids['u1'])->update(['name' => 'Masih aktif']);
        $scope = DB::table('kpi_templates')->where('id', $this->ids['unitTemplate1'])->first();
        DB::table('kpi_templates')->where('id', $scope->id)->update(['effective_until' => '2026-11-01']);
        $this->postJson('/hc/cycles', $this->cyclePayload('open'))->assertUnprocessable()->assertJsonPath('code', 'SETUP_INCOMPLETE');
    }

    public function test_accounts_precede_structure_and_head_does_not_require_employee(): void
    {
        $kd = $this->account('kepala_divisi', 'newkd');
        $ku = $this->account('kepala_unit', 'newku');
        $d = $this->asRole('hc')->postJson('/hc/organization/divisions', $this->key(['code' => 'NEW-D', 'name' => 'Baru', 'head_user_id' => $kd['id']]))->assertOk()->json('data');
        $u = $this->postJson('/hc/organization/units', $this->key(['division_id' => $d['id'], 'code' => 'NEW-U', 'name' => 'Unit Baru', 'head_user_id' => $ku['id']]))->assertOk()->json('data');
        $this->assertSame($ku['id'], $u['current_assignment']['user_id']);
        $this->assertDatabaseCount('employees', 2);
        $this->deleteJson('/hc/organization/units/'.$u['id'], $this->key())->assertOk();
        $this->deleteJson('/hc/organization/divisions/'.$d['id'], $this->key())->assertOk();
        $this->deleteJson('/hc/organization/users/'.$ku['id'], $this->key())->assertOk();
    }

    public function test_wrong_head_role_rolls_back_new_area(): void
    {
        $this->asRole('hc')->postJson('/hc/organization/units', $this->key(['division_id' => $this->ids['d1'], 'code' => 'FAIL-U', 'name' => 'Salah', 'head_user_id' => $this->users['kd1']->id]))->assertUnprocessable();
        $this->assertDatabaseMissing('units', ['code' => 'FAIL-U']);
    }

    public function test_staff_has_no_account_and_crud_guards_dependencies(): void
    {
        $before = DB::table('users')->count();
        $s = $this->staff('auditstaff');
        $this->assertDatabaseCount('users', $before);
        $this->asRole('hc')->postJson('/hc/organization/employees', $this->key(['full_name' => 'Invalid', 'nip' => 'INVALID', 'position_id' => $this->ids['position'], 'unit_id' => $this->ids['u1'], 'user_id' => $this->users['ku1']->id]))->assertUnprocessable();
        $this->deleteJson('/hc/organization/positions/'.$this->ids['position'], $this->key())->assertConflict();
        $this->deleteJson('/hc/organization/employees/'.$s['id'], $this->key())->assertOk();
        $this->assertDatabaseMissing('employee_placements', ['employee_id' => $s['id']]);
        $this->deleteJson('/hc/organization/users/'.$this->users['hc']->id, $this->key())->assertConflict();
        $this->patchJson('/hc/organization/users/'.$this->users['hc']->id, $this->key(['role_key' => 'kepala_unit']))->assertConflict()->assertJsonPath('code', 'SELF_LOCKOUT');
    }

    public function test_pending_work_blocks_transfer_and_cancellation_allows_future_placement(): void
    {
        $a = $this->submitted();
        $p = $this->key(['unit_id' => $this->ids['u2'], 'effective_from' => '2026-11-01', 'expected_placement_id' => $this->ids['placement1'], 'confirmed' => true, 'reason' => 'Pindah']);
        $this->asRole('hc')->postJson('/hc/employees/'.$this->ids['member1'].'/placement', $p)->assertConflict()->assertJsonPath('code', 'ACTIVE_ASSESSMENTS');
        $this->asRole('ku1')->postJson('/unit/assessments/'.$a['id'].'/withdraw', $this->key(['lock_version' => 0]))->assertOk();
        $p['request_id'] = $this->key()['request_id'];
        $p['effective_from'] = '2026-12-01';
        $this->asRole('hc')->postJson('/hc/employees/'.$this->ids['member1'].'/placement', $p)->assertOk();
        $this->assertDatabaseHas('employee_placements', ['id' => $this->ids['placement1'], 'effective_until' => '2026-11-01']);
    }

    public function test_head_replacement_blocks_pending_and_preserves_final_scope_history(): void
    {
        $replacement = $this->account('kepala_unit', 'replacement');
        $a = $this->submitted();
        $p = $this->key(['user_id' => $replacement['id'], 'expected_assignment_id' => $this->ids['kuAssignment1'], 'confirmed' => true, 'reason' => 'Pergantian']);
        $this->asRole('hc')->postJson('/hc/units/'.$this->ids['u1'].'/head', $p)->assertConflict();
        $this->approve($a)->assertOk();
        $p['request_id'] = $this->key()['request_id'];
        $this->asRole('hc')->postJson('/hc/units/'.$this->ids['u1'].'/head', $p)->assertOk();
        $this->asRole('ku1')->getJson('/me')->assertForbidden();
        $this->users['replacement'] = User::findOrFail($replacement['id']);
        $this->asRole('replacement')->getJson('/unit/assessments/'.$a['id'])->assertOk()->assertJsonPath('data.status', 'final');
    }

    public function test_notification_read_state_is_scoped_and_idempotent(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/return', $this->key(['lock_version' => 0, 'reason' => 'Perbaiki']))->assertOk();
        $key = $this->asRole('ku1')->getJson('/unit/notifications?cycle_id='.$this->ids['cycle'])->assertOk()->json('data.0.key');
        $this->assertNotNull($key);
        $p = $this->key(['cycle_id' => $this->ids['cycle'], 'keys' => [$key]]);
        $this->postJson('/unit/notifications/read', $p)->assertOk();
        $this->postJson('/unit/notifications/read', $p)->assertJsonPath('replayed', true);
        $this->getJson('/unit/notifications?cycle_id='.$this->ids['cycle'])->assertJsonPath('data.0.read', true);
        $this->asRole('ku2')->postJson('/unit/notifications/read', $this->key(['cycle_id' => $this->ids['cycle'], 'keys' => [$key]]))->assertUnprocessable();
    }

    public function test_profile_password_and_photo_are_real_and_scoped_to_self(): void
    {
        Storage::fake('local');
        $this->asRole('ku1')->postJson('/unit/profile', $this->key(['name' => 'Nama Baru', 'phone' => '081234', 'password' => 'NewSecretPassword123', 'password_confirmation' => 'NewSecretPassword123', 'current_password' => 'wrong']))->assertUnprocessable();
        $this->postJson('/unit/profile', $this->key(['name' => 'Nama Baru', 'phone' => '081234', 'password' => 'NewSecretPassword123', 'password_confirmation' => 'NewSecretPassword123', 'current_password' => 'TestPassword1234']))->assertOk()->assertJsonPath('data.name', 'Nama Baru')->assertJsonMissingPath('data.password');
        $this->assertTrue(Hash::check('NewSecretPassword123', $this->users['ku1']->fresh()->password));
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5WQAAAAASUVORK5CYII=');
        $this->post('/unit/profile', $this->key(['photo' => UploadedFile::fake()->createWithContent('photo.png', $png)]), ['Accept' => 'application/json'])->assertOk();
        $this->get('/unit/profile/photo')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringNotContainsString('NewSecretPassword', DB::table('audit_events')->get()->toJson());
    }

    public function test_schema_gate_preserves_legacy_login_and_refuses_incompatible_business_api(): void
    {
        DB::table('domain_schema_versions')->delete();
        $count = DB::table('users')->count();
        $this->asRole('hc')->getJson('/hc/organization/users')->assertStatus(503)->assertJsonPath('code', 'SCHEMA_UPGRADE_REQUIRED');
        $this->getJson('/me')->assertOk();
        $this->get('/hc/dashboard')->assertOk();
        $this->assertDatabaseCount('users', $count);
    }

    public function test_migration_bridge_refuses_existing_data_before_any_ddl(): void
    {
        $count = DB::table('users')->count();
        $migration = require database_path('migrations/2026_11_10_000005_install_domain_v2.php');
        try {
            $migration->up();
            $this->fail('Existing data must not be replaced.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('CONVERSION_REQUIRED', $e->getMessage());
        }
        $this->assertDatabaseCount('users', $count);
        $this->assertDatabaseHas('domain_schema_versions', ['version' => '2.0.0']);
    }

    public function test_ui_sources_still_match_the_approved_baseline(): void
    {
        $manifest = json_decode(file_get_contents(base_path('docs/frontend/approved-layout/manifest.json')), true, 512, JSON_THROW_ON_ERROR);
        foreach ($manifest['files'] as $file => $hash) {
            if (! str_starts_with($file, 'resources/css/') && ! str_starts_with($file, 'resources/fonts/') && ! str_starts_with($file, 'resources/images/')) {
                continue;
            }
            $this->assertSame($hash, hash_file('sha256', base_path($file)), $file);
        }
    }

    public function test_final_analytics_and_recap_exclude_pending_and_separate_template_groups(): void
    {
        $staff = $this->submitted();
        $head = $this->startAssessment('kd1', 'head1');
        $url = '/hc/data/analytics?cycle_id='.$this->ids['cycle'];
        $this->asRole('hc')->getJson($url)->assertOk()->assertJsonPath('data.final_count', 1)->assertJsonCount(1, 'data.groups')->assertJsonPath('data.groups.0.assessment_kind', 'unit_head')->assertJsonPath('data.matrix.total', 1);
        $this->getJson('/hc/recap?cycle_id='.$this->ids['cycle'])->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $head['id']);
        $this->approve($staff)->assertOk();
        $this->asRole('hc')->getJson($url)->assertJsonPath('data.final_count', 2)->assertJsonCount(2, 'data.groups');
        $this->asRole('ku1')->getJson('/unit/data/analytics?cycle_id='.$this->ids['cycle'])->assertJsonPath('data.final_count', 1);
        $this->asRole('ku2')->getJson('/unit/data/analytics?cycle_id='.$this->ids['cycle'])->assertJsonPath('data.final_count', 0);
    }

    public function test_export_is_scoped_and_formula_text_is_neutralized(): void
    {
        $s = $this->staff('=SUM(1+1)');
        $p = $this->payload();
        $p['employee_id'] = $s['id'];
        $a = $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->json('data');
        $this->approve($a)->assertOk();
        $b = $this->submitted('ku2', 'member2');
        $this->approve($b, 'kd2')->assertOk();
        $response = $this->asRole('ku1')->get('/unit/recap?format=tsv&cycle_id='.$this->ids['cycle'], ['Accept' => 'application/json'])->assertOk();
        $text = $response->streamedContent();
        $this->assertStringContainsString("'=SUM(1+1)", $text);
        $this->assertStringNotContainsString('member2', $text);
    }

    public function test_previous_final_comparison_requires_matching_definition_and_scope(): void
    {
        DB::table('employee_placements')->where('id', $this->ids['placement1'])->update(['effective_from' => '2026-01-01']);
        $previous = DB::table('assessment_cycles')->insertGetId(['assessment_month' => '2026-10-01', 'opens_at' => now()->subDay(), 'submission_due_at' => now()->addDay(), 'approval_due_at' => now()->addDays(2), 'closes_at' => now()->addDays(3), 'status' => 'open', 'created_by' => $this->users['hc']->id]);
        $cats = DB::table('cycle_categories')->where('cycle_id', $this->ids['cycle'])->get();
        foreach ($cats as $c) {
            $row = (array) $c;
            unset($row['id']);
            $row['cycle_id'] = $previous;
            DB::table('cycle_categories')->insert($row);
        }
        $p = $this->payload();
        $p['cycle_id'] = $previous;
        $a = $this->asRole('ku1')->postJson('/unit/assessments', $p)->assertOk()->json('data');
        $this->approve($a)->assertOk();
        $current = $this->submitted();
        $url = '/unit/data/assessments/'.$current['id'].'/comparison';
        $this->asRole('ku1')->getJson($url)->assertOk()->assertJsonPath('data.fully_comparable', true)->assertJsonCount(6, 'data.items');
        $this->asRole('ku2')->getJson($url)->assertNotFound();
    }

    public function test_area_deactivation_releases_head_and_reactivation_revalidates_selection(): void
    {
        $this->asRole('hc')->patchJson('/hc/organization/employees/'.$this->ids['member2'], $this->key(['is_active' => false]))->assertOk();
        $this->patchJson('/hc/organization/units/'.$this->ids['u2'], $this->key(['is_active' => false]))->assertOk()->assertJsonPath('data.current_assignment', null);
        $this->asRole('ku2')->getJson('/me')->assertForbidden();
        $this->asRole('hc')->postJson('/hc/organization/units', $this->key(['code' => 'REUSED', 'name' => 'Area baru', 'division_id' => $this->ids['d1'], 'head_user_id' => $this->users['ku2']->id]))->assertOk();
        $this->patchJson('/hc/organization/units/'.$this->ids['u2'], $this->key(['is_active' => true]))->assertUnprocessable()->assertJsonPath('code', 'HEAD_REQUIRED');
        $this->patchJson('/hc/organization/units/'.$this->ids['u2'], $this->key(['is_active' => true, 'head_user_id' => $this->users['ku2']->id]))->assertConflict()->assertJsonPath('code', 'ACCOUNT_ASSIGNED');
        $free = $this->account('kepala_unit', 'reactivate');
        $this->asRole('hc')->patchJson('/hc/organization/units/'.$this->ids['u2'], $this->key(['is_active' => true, 'head_user_id' => $free['id']]))->assertOk()->assertJsonPath('data.current_assignment.user_id', $free['id']);
        $this->assertDatabaseHas('scope_assignments', ['id' => $this->ids['kuAssignment2'], 'revoked_by' => $this->users['hc']->id]);
    }

    public function test_new_inactive_area_keeps_selected_head_without_granting_access(): void
    {
        $free = $this->account('kepala_unit', 'inactivehead');
        $area = $this->asRole('hc')->postJson('/hc/organization/units', $this->key(['code' => 'INACTIVE', 'name' => 'Nonaktif', 'division_id' => $this->ids['d1'], 'head_user_id' => $free['id'], 'is_active' => false]))->assertOk()->assertJsonPath('data.is_active', 0)->assertJsonPath('data.current_assignment', null)->json('data');
        $this->assertSame($free['id'], $area['latest_assignment']['user_id']);
        $this->assertNotNull($area['latest_assignment']['revoked_at']);
        $this->assertFalse(DB::table('scope_assignments')->where('user_id', $free['id'])->whereNull('revoked_at')->exists());
    }
}
