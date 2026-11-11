<?php

namespace Tests\Feature\Organization;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class OrganizationTest extends BackendTestCase
{
    public function test_hc_creates_organization_and_account_without_leaking_password(): void
    {
        $this->asRole('hc')->postJson('/hc/organization/divisions', $this->key(['code' => 'UMUM', 'name' => 'Umum dan SDM']))->assertOk()->assertJsonPath('data.name', 'Umum dan SDM');
        $this->postJson('/hc/organization/users', $this->key(['name' => 'Kepala Baru', 'email' => 'new@example.test', 'password' => 'SecurePassword123', 'roles' => ['kepala_unit']]))->assertOk()->assertJsonMissingPath('data.password');
        $user = User::where('email', 'new@example.test')->firstOrFail();
        $this->assertNotSame('SecurePassword123', $user->password);
        $this->assertDatabaseHas('user_roles', ['user_id' => $user->id, 'role_key' => 'kepala_unit']);
        $this->assertDatabaseMissing('scope_assignments', ['user_id' => $user->id]);
        $this->assertStringNotContainsString('SecurePassword123', DB::table('audit_events')->get()->toJson());
    }

    public function test_transfer_requires_current_preview_and_blocks_active_assessment(): void
    {
        $a = $this->startAssessment();
        $preview = $this->asRole('hc')->getJson('/hc/employees/'.$this->ids['member1'].'/placement-preview')->assertOk()->json('data');
        $body = $this->key(['unit_id' => $this->ids['u2'], 'expected_placement_id' => $preview['current_placement']['id'], 'confirmed' => true, 'reason' => 'Rotasi karyawan']);
        $this->postJson('/hc/employees/'.$this->ids['member1'].'/placement', $body)->assertConflict()->assertJsonPath('code', 'ACTIVE_ASSESSMENT_IMPACT');
        $this->assertDatabaseHas('employee_placements', ['id' => $preview['current_placement']['id'], 'ended_at' => null]);
        $this->assertDatabaseHas('assessments', ['id' => $a['id'], 'unit_id' => $this->ids['u1']]);
    }

    public function test_final_history_stays_with_original_context_after_transfer(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $old = DB::table('employee_placements')->where('employee_id', $this->ids['member1'])->whereNull('ended_at')->first();
        $this->asRole('hc')->postJson('/hc/employees/'.$this->ids['member1'].'/placement', $this->key(['unit_id' => $this->ids['u2'], 'expected_placement_id' => $old->id, 'confirmed' => true, 'reason' => 'Rotasi setelah selesai']))->assertOk();
        $this->asRole('ku1')->getJson('/unit/members')->assertJsonPath('total', 0);
        $this->asRole('ku2')->getJson('/unit/members')->assertJsonPath('total', 2);
        $this->getJson('/unit/assessments/'.$a['id'])->assertNotFound();
        $this->asRole('hc')->getJson('/hc/assessments/'.$a['id'])->assertOk()->assertJsonPath('data.unit_id', $this->ids['u1'])->assertJsonPath('data.unit_name_snapshot', 'Unit 1');
    }

    public function test_assign_head_is_atomic_checks_eligibility_and_preserves_other_division(): void
    {
        $new = User::create(['name' => 'Kepala Pengganti', 'email' => 'replacement@example.test', 'password' => 'TestPassword1234']);
        $old = DB::table('scope_assignments')->where('user_id', $this->users['kd1']->id)->first();
        $body = $this->key(['user_id' => $new->id, 'expected_assignment_id' => $old->id, 'confirmed' => true, 'reason' => 'Pergantian kepala divisi']);
        $this->asRole('hc')->postJson('/hc/divisions/'.$this->ids['d1'].'/head', $body)->assertUnprocessable()->assertJsonPath('code', 'ROLE_INELIGIBLE');
        $this->assertDatabaseHas('scope_assignments', ['id' => $old->id, 'revoked_at' => null]);
        DB::table('user_roles')->insert(['user_id' => $new->id, 'role_key' => 'kepala_divisi']);
        $this->postJson('/hc/divisions/'.$this->ids['d1'].'/head', $body)->assertOk();
        $this->assertNotNull(DB::table('scope_assignments')->where('id', $old->id)->value('revoked_at'));
        $this->assertDatabaseHas('scope_assignments', ['user_id' => $this->users['kd2']->id, 'revoked_at' => null]);
        $this->asRole('kd1')->getJson('/me')->assertForbidden();
    }

    public function test_replacing_head_is_blocked_when_active_assessment_exists(): void
    {
        $this->startAssessment();
        $old = DB::table('scope_assignments')->where('user_id', $this->users['kd1']->id)->first();
        $this->asRole('hc')->postJson('/hc/divisions/'.$this->ids['d1'].'/head', $this->key(['user_id' => $this->users['kd2']->id, 'expected_assignment_id' => $old->id, 'confirmed' => true, 'reason' => 'Percobaan pindah']))->assertConflict()->assertJsonPath('code', 'ACTIVE_ASSESSMENT_IMPACT');
    }

    public function test_invalid_parent_reparenting_and_self_lockout_are_rejected(): void
    {
        $this->asRole('hc')->postJson('/hc/organization/units', $this->key(['code' => 'BAD', 'name' => 'Bad', 'division_id' => 999999]))->assertNotFound();
        $this->patchJson('/hc/organization/units/'.$this->ids['u1'], $this->key(['division_id' => $this->ids['d2']]))->assertConflict()->assertJsonPath('code', 'UNIT_HAS_HISTORY');
        $this->patchJson('/hc/organization/users/'.$this->users['hc']->id, $this->key(['is_active' => false]))->assertConflict()->assertJsonPath('code', 'SELF_LOCKOUT');
    }

    public function test_head_replacement_does_not_leak_history_created_in_the_same_second(): void
    {
        $time = now()->startOfSecond()->addMicroseconds(100000);
        $this->travelTo($time);
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $new = User::create(['name' => 'Pengganti', 'email' => 'subsecond@example.test', 'password' => 'TestPassword1234']);
        DB::table('user_roles')->insert(['user_id' => $new->id, 'role_key' => 'kepala_divisi']);
        $old = DB::table('scope_assignments')->where('user_id', $this->users['kd1']->id)->first();
        $this->travelTo($time->copy()->addMicroseconds(100000));
        $this->asRole('hc')->postJson('/hc/divisions/'.$this->ids['d1'].'/head', $this->key(['user_id' => $new->id, 'expected_assignment_id' => $old->id, 'confirmed' => true, 'reason' => 'Pergantian setelah selesai']))->assertOk();
        $this->users['replacement'] = $new;
        $this->asRole('replacement')->getJson('/division/assessments/'.$a['id'])->assertNotFound();
    }

    public function test_subsecond_transfer_preserves_placement_chronology(): void
    {
        $time = now()->startOfSecond()->addMicroseconds(100000);
        $this->travelTo($time);
        $employee = DB::table('employees')->insertGetId(['nip' => 'subsecond', 'full_name' => 'Subsecond', 'position_id' => $this->ids['position']]);
        $placement = DB::table('employee_placements')->insertGetId(['employee_id' => $employee, 'unit_id' => $this->ids['u1'], 'division_id' => $this->ids['d1'], 'started_at' => $time->format('Y-m-d H:i:s.u')]);
        $this->travelTo($time->copy()->addMicroseconds(100000));
        $result = $this->asRole('hc')->postJson('/hc/employees/'.$employee.'/placement', $this->key(['unit_id' => $this->ids['u2'], 'expected_placement_id' => $placement, 'confirmed' => true, 'reason' => 'Transfer segera']))->assertOk()->json('data');
        $this->assertSame($result['started_at'], DB::table('employee_placements')->where('id', $placement)->value('ended_at'));
    }
}
