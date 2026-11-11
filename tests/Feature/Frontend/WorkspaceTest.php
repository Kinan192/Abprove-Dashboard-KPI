<?php

namespace Tests\Feature\Frontend;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\Support\BackendTestCase;

class WorkspaceTest extends BackendTestCase
{
    public function test_workspace_contains_only_current_scope_and_no_credentials(): void
    {
        $a = $this->submitted('ku2', 'member2');
        $response = $this->asRole('ku1')->getJson('/unit/data/workspace')->assertOk()->assertJsonCount(1, 'data.units')->assertJsonCount(1, 'data.staff')->assertJsonCount(0, 'data.assessments');
        $text = $response->getContent();
        foreach (['password', 'TestPassword', 'auth_accounts', 'ku2@example.test', 'member2', 'photo_path'] as $secret) {
            $this->assertStringNotContainsString($secret, $text);
        }
        $this->assertSame((string) $this->users['ku1']->id, $response->json('actorId'));
    }

    public function test_workspace_serializes_server_totals_final_snapshots_and_return_reasons(): void
    {
        $a = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$a['id'].'/approve', $this->key(['lock_version' => $a['lock_version']]))->assertOk();
        $response = $this->asRole('kd1')->getJson('/division/data/workspace')->assertOk();
        $row = $response->json('data.assessments.EMP-'.$this->ids['member1'].'|2026-11');
        $this->assertSame('Final', $row['status']);
        $this->assertSame('82.750000', $row['serverTotal']);
        $this->assertCount(6, $row['snapshot']['items']);
        $this->assertNotEmpty($row['history']);
        $this->assertNotNull($row['category']);
    }

    public function test_hc_workspace_does_not_enable_score_actions(): void
    {
        $response = $this->asRole('hc')->getJson('/hc/data/workspace')->assertOk();
        $workspace = json_decode($response->streamedContent(), true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(5, $workspace['data']['accounts']);
        $this->assertCount(2, $workspace['data']['units']);
        $this->postJson('/division/assessments', $this->payload('kd1', 'head1'))->assertForbidden();
        $this->get('/hc/dashboard')->assertSee('live-v3', false)->assertDontSee('"fixture":', false)->assertDontSee('Data contoh');
    }

    public function test_password_has_one_authoritative_better_auth_credential_and_revokes_sessions(): void
    {
        $user = $this->users['ku1'];
        $this->assertFalse(Schema::hasColumn('users', 'password'));
        DB::table('auth_sessions')->insert(['token' => 'test-token', 'userId' => $user->id, 'expiresAt' => now()->addHour(), 'context_key' => 'kepala_unit:'.$this->ids['kuAssignment1']]);
        $this->asRole('ku1')->postJson('/unit/profile', $this->key(['current_password' => 'TestPassword1234', 'password' => 'NewLocalPassword1234', 'password_confirmation' => 'NewLocalPassword1234']))->assertOk();
        $this->assertDatabaseCount('auth_sessions', 0);
        $this->assertTrue(Hash::check('NewLocalPassword1234', $user->fresh()->password));
        $this->assertSame(1, DB::table('auth_accounts')->where('userId', $user->id)->count());
    }

    public function test_compact_workspace_preserves_captured_assessments_without_audit_snapshots(): void
    {
        $assessment = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment['id'].'/approve', $this->key(['lock_version' => $assessment['lock_version']]))->assertOk();
        $full = $this->asRole('kd1')->getJson('/division/data/workspace')->assertOk()->json('data');
        $compact = $this->getJson('/division/data/workspace?compact=1')->assertOk()->json('data');

        $this->assertSame(array_keys($full['assessments']), array_keys($compact['assessments']));
        foreach ($compact['assessments'] as $key => $row) {
            $row['snapshot'] = $compact['assessmentTemplates'][$row['snapshotKey']];
            unset($row['snapshotKey']);
            foreach ($full['assessments'][$key] as $field => $value) {
                $this->assertSame($value, $row[$field]);
            }
        }
        $this->assertNotEmpty($compact['activities']);
        foreach ($compact['activities'] as $activity) {
            $this->assertArrayNotHasKey('before', $activity);
            $this->assertArrayNotHasKey('after', $activity);
        }
        $this->assertContains('member1', array_column($compact['activities'], 'summary'));
    }

    public function test_hc_activity_details_are_available_on_demand_and_role_protected(): void
    {
        $assessment = $this->submitted();
        $activity = DB::table('audit_events')->where('assessment_id', $assessment['id'])->value('id');
        $this->asRole('hc')->getJson('/hc/data/activities/'.$activity)->assertOk()
            ->assertJsonPath('data.after.employee_name_snapshot', 'member1')
            ->assertJsonPath('data.before', null);
        $this->getJson('/hc/data/activities/99999999')->assertNotFound();
        $this->asRole('kd1')->getJson('/hc/data/activities/'.$activity)->assertForbidden();
        $this->asRole('ku1')->getJson('/hc/data/activities/'.$activity)->assertForbidden();
    }

    public function test_profile_workspace_omits_assessment_history_and_preserves_own_profile(): void
    {
        $this->submitted();
        $this->asRole('ku1')->getJson('/unit/data/workspace?compact=1&page=profil')->assertOk()
            ->assertJsonCount(0, 'data.assessments')
            ->assertJsonCount(0, 'data.activities')
            ->assertJsonCount(0, 'data.staff')
            ->assertJsonPath('data.profiles.'.$this->users['ku1']->id.'.name', 'ku1');
    }

    public function test_page_specific_workspace_preserves_decision_timelines_and_loads_activity_lists_where_needed(): void
    {
        $assessment = $this->submitted();
        $this->asRole('kd1')->postJson('/division/assessments/'.$assessment['id'].'/approve', $this->key(['lock_version' => $assessment['lock_version']]))->assertOk();
        $ctx = app(\App\Services\IdentityAccess\ScopeResolver::class)->resolve($this->users['hc']);
        for ($i = 0; $i < 6; $i++) {
            app(\App\Services\Audit\AuditWriter::class)->record($ctx, 'units', $this->ids['u1'], 'units.updated', ['name' => 'Sebelum'], ['name' => 'Sesudah '.$i]);
        }
        $key = 'EMP-'.$this->ids['member1'].'|2026-11';
        $full = $this->asRole('hc')->getJson('/hc/data/workspace?compact=1')->assertOk()->json('data');
        $home = $this->getJson('/hc/data/workspace?compact=1&page=beranda')->assertOk()->json('data');
        $report = $this->getJson('/hc/data/workspace?compact=1&page=dashboard')->assertOk()->json('data');
        $this->assertCount(4, $home['activities']);
        $this->assertSame(array_slice($full['activities'], 0, 4), $home['activities']);
        $this->assertSame($full['assessments'][$key], $home['assessments'][$key]);
        $this->assertSame($full['assessments'][$key], $report['assessments'][$key]);
        $this->assertCount(0, $report['activities']);
        $this->getJson('/hc/data/workspace?compact=1&page=aktivitas')->assertOk()
            ->assertJsonCount(count($full['activities']), 'data.activities')
            ->assertJsonCount(0, 'data.assessments')
            ->assertJsonCount(0, 'data.staff');
    }

    public function test_php_session_and_client_role_cannot_replace_signed_auth_cookie(): void
    {
        $this->withSession(['login_web_fake' => $this->users['hc']->id, 'role' => 'super_hc'])->getJson('/hc/data/workspace?role=super_hc')->assertUnauthorized();
    }

    public function test_auth_failure_fails_closed_with_clear_service_error(): void
    {
        Http::fake(fn () => Http::response(['message' => 'unavailable'], 503));
        $this->withCredentials()->withUnencryptedCookie('kpi_session', 'invalid')->getJson('/me')->assertStatus(503)->assertJsonPath('code', 'AUTH_UNAVAILABLE');
    }

    public function test_old_actor_audit_cannot_reveal_previous_unit_after_reassignment(): void
    {
        $this->submitted();
        DB::table('scope_assignments')->whereIn('user_id', [$this->users['ku1']->id, $this->users['ku2']->id])->update(['revoked_at' => now()]);
        DB::table('scope_assignments')->insert(['user_id' => $this->users['ku1']->id, 'role_key' => 'kepala_unit', 'unit_id' => $this->ids['u2'], 'assigned_at' => now()]);
        $response = $this->asRole('ku1')->getJson('/unit/data/workspace')->assertOk()->assertJsonCount(0, 'data.assessments');
        $this->assertStringNotContainsString('member1', $response->getContent());
    }

    public function test_database_idle_expiry_revokes_session_even_with_new_php_session(): void
    {
        $id = DB::table('auth_sessions')->insertGetId(['token' => 'idle-test', 'userId' => $this->users['ku1']->id, 'expiresAt' => now()->addHour(), 'context_key' => 'kepala_unit:'.$this->ids['kuAssignment1'], 'last_activity_at' => now()->subMinutes(31)]);
        Http::fake(fn () => Http::response(['user' => ['id' => (string) $this->users['ku1']->id], 'session' => ['id' => (string) $id, 'context_key' => 'kepala_unit:'.$this->ids['kuAssignment1']]]));
        $this->withSession(['last_activity_at' => now()->timestamp])->withCredentials()->withUnencryptedCookie('kpi_session', 'signed-cookie')->getJson('/me')->assertUnauthorized()->assertCookieExpired('kpi_session');
        $this->assertDatabaseMissing('auth_sessions', ['id' => $id]);
    }

    public function test_session_cannot_keep_old_context_after_new_assignment(): void
    {
        $id = DB::table('auth_sessions')->insertGetId(['token' => 'context-test', 'userId' => $this->users['ku1']->id, 'expiresAt' => now()->addHour(), 'context_key' => 'kepala_unit:old', 'last_activity_at' => now()]);
        Http::fake(fn () => Http::response(['user' => ['id' => (string) $this->users['ku1']->id], 'session' => ['id' => (string) $id, 'context_key' => 'kepala_unit:old']]));
        $this->withCredentials()->withUnencryptedCookie('kpi_session', 'signed-cookie')->getJson('/me')->assertUnauthorized();
        $this->assertDatabaseMissing('auth_sessions', ['id' => $id]);
    }
}
