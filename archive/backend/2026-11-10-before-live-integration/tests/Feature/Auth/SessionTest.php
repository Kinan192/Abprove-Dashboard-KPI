<?php

namespace Tests\Feature\Auth;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\Support\BackendTestCase;

class SessionTest extends BackendTestCase
{
    public function test_login_with_email_or_nip_uses_session_and_hides_password(): void
    {
        $this->getJson('/me')->assertUnauthorized();
        $this->getJson('/login')->assertOk()->assertJsonStructure(['csrf_token']);
        $this->postJson('/login', ['identifier' => 'ku1@example.test', 'password' => 'TestPassword1234'])
            ->assertOk()->assertJsonPath('data.home', '/unit/dashboard')->assertJsonMissingPath('data.user.password');
        $this->getJson('/me')->assertOk()->assertJsonPath('data.role', 'kepala_unit');
        $this->postJson('/logout')->assertOk();
        $this->getJson('/me')->assertUnauthorized();
        $this->postJson('/login', ['identifier' => 'LOGIN-kd1', 'password' => 'TestPassword1234'])->assertOk()->assertJsonPath('data.home', '/division/dashboard');
        $audit = DB::table('audit_events')->get()->toJson();
        $this->assertStringNotContainsString('TestPassword', $audit);
        $this->assertStringNotContainsString('"password"', $audit);
    }

    public function test_invalid_login_is_rate_limited_without_user_enumeration(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/login', ['identifier' => 'missing@example.test', 'password' => 'wrong'])->assertUnprocessable();
        }
        $this->postJson('/login', ['identifier' => 'missing@example.test', 'password' => 'wrong'])->assertTooManyRequests();
        $this->assertFalse(Auth::check());
    }

    public function test_inactive_account_and_revoked_scope_are_checked_on_each_request(): void
    {
        $this->asRole('ku1')->getJson('/me')->assertOk();
        DB::table('users')->where('id', $this->users['ku1']->id)->update(['is_active' => false]);
        $this->getJson('/me')->assertUnauthorized();
        $this->asRole('kd1')->getJson('/me')->assertOk();
        DB::table('scope_assignments')->where('user_id', $this->users['kd1']->id)->update(['revoked_at' => now()]);
        $this->getJson('/me')->assertForbidden()->assertJsonPath('code', 'NO_ACTIVE_SCOPE');
    }

    public function test_idle_timeout_is_thirty_minutes(): void
    {
        $this->asRole('ku1')->withSession(['last_activity_at' => now()->subMinutes(30)->timestamp])->getJson('/me')->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');
    }

    public function test_database_rejects_multiple_active_assignments(): void
    {
        $u = $this->users['ku1']->id;
        DB::table('user_roles')->insert(['user_id' => $u, 'role_key' => 'super_hc']);
        $this->expectException(QueryException::class);
        DB::table('scope_assignments')->insert(['user_id' => $u, 'role_key' => 'super_hc', 'assigned_at' => now()->subDay()]);
    }

    public function test_future_assignment_and_inactive_parent_do_not_grant_access(): void
    {
        DB::table('scope_assignments')->where('user_id', $this->users['ku1']->id)->update(['assigned_at' => now()->addDay()]);
        $this->asRole('ku1')->getJson('/me')->assertForbidden();
        DB::table('divisions')->where('id', $this->ids['d2'])->update(['is_active' => false]);
        $this->asRole('ku2')->getJson('/me')->assertForbidden();
    }

    public function test_first_hc_can_be_bootstrapped_interactively_without_default_password(): void
    {
        DB::table('scope_assignments')->where('role_key', 'super_hc')->update(['revoked_at' => now()]);
        $this->artisan('kpi:create-admin', ['--name' => 'Admin Awal', '--email' => 'bootstrap@example.test'])
            ->expectsQuestion('Kata sandi (minimal 12 karakter, huruf dan angka)', 'BootstrapSecret123')
            ->expectsQuestion('Ulangi kata sandi', 'BootstrapSecret123')
            ->expectsOutput('Super HC dibuat: bootstrap@example.test')->assertExitCode(0);
        $this->assertDatabaseHas('users', ['email' => 'bootstrap@example.test']);
        $this->assertStringNotContainsString('BootstrapSecret', DB::table('audit_events')->get()->toJson());
    }
}
