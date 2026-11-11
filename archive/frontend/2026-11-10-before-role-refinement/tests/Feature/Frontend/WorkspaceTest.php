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
        $this->asRole('hc')->getJson('/hc/data/workspace')->assertOk()->assertJsonCount(5, 'data.accounts')->assertJsonCount(2, 'data.units');
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
