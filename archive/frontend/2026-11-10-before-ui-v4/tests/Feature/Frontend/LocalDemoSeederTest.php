<?php

namespace Tests\Feature\Frontend;

use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\LocalDemoSeeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\Support\BackendTestCase;

class LocalDemoSeederTest extends BackendTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeAuthTransport();
    }

    private const PASSWORD = 'LocalSeedTesting12345';

    public function test_each_seeded_account_can_login_and_only_access_its_role_and_team(): void
    {
        (new LocalDemoSeeder)->run(self::PASSWORD);
        foreach (LocalDemoSeeder::ACCOUNTS as $email => [$name, $role]) {
            $home = match ($role) {
                'super_hc' => '/hc/dashboard', 'kepala_divisi' => '/division/dashboard', 'kepala_unit' => '/unit/dashboard',
            };
            $this->postJson('/login', ['identifier' => $email, 'password' => self::PASSWORD])->assertOk()->assertJsonPath('data.home', $home);
            $this->getJson('/me')->assertOk()->assertJsonPath('data.role', $role);
            $this->get($home)->assertOk()->assertSee('kpi-config', false);
            if ($role !== 'super_hc') {
                $this->getJson('/hc/organization/users')->assertForbidden();
            }
            if ($email === 'ku.it@kpi.test') {
                $this->getJson('/unit/members')->assertJsonCount(5, 'data')->assertJsonMissing(['full_name' => 'Anggota UGD Contoh 01']);
            }
            if ($email === 'kd.umum@kpi.test') {
                $this->getJson('/division/team')->assertJsonCount(3, 'data')->assertJsonMissing(['name' => 'UGD Contoh']);
            }
            $this->postJson('/logout')->assertOk();
        }
    }

    public function test_rerun_preserves_accounts_existing_period_and_does_not_duplicate_data(): void
    {
        $originalHc = $this->users['hc']->fresh();
        $originalCycle = (array) DB::table('assessment_cycles')->where('id', $this->ids['cycle'])->first();
        (new LocalDemoSeeder)->run(self::PASSWORD);
        $tables = ['users', 'user_roles', 'divisions', 'units', 'employees', 'positions', 'employee_placements', 'scope_assignments', 'kpi_templates', 'kpi_items', 'assessment_cycles', 'cycle_categories', 'audit_events'];
        $counts = collect($tables)->mapWithKeys(fn ($table) => [$table => DB::table($table)->count()])->all();
        $demoHash = User::where('email', 'ku.it@kpi.test')->first()->password;
        (new LocalDemoSeeder)->run('AnotherSeedPassword123');
        foreach ($counts as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }
        $this->assertSame($originalHc->password, $originalHc->fresh()->password);
        $this->assertSame($demoHash, User::where('email', 'ku.it@kpi.test')->first()->password);
        $this->assertSame($originalCycle, (array) DB::table('assessment_cycles')->where('id', $this->ids['cycle'])->first());
    }

    public function test_new_training_period_is_open_with_explicit_training_category(): void
    {
        Carbon::setTestNow(now()->addMonthNoOverflow()->startOfMonth()->addDay());
        try {
            (new LocalDemoSeeder)->run(self::PASSWORD);
            $cycle = DB::table('assessment_cycles')->where('assessment_month', now('Asia/Jakarta')->startOfMonth()->format('Y-m-d'))->first();
            $this->assertSame('open', $cycle->status);
            $categories = DB::table('cycle_categories')->where('cycle_id', $cycle->id)->orderBy('sort_order')->get();
            $this->assertCount(4, $categories);
            $this->assertSame('Sangat Baik', $categories->last()->label);
            $this->assertNull($categories->last()->upper_bound);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_production_environment_is_rejected_before_any_insert(): void
    {
        $count = DB::table('users')->count();
        $this->app['env'] = 'production';
        try {
            (new LocalDemoSeeder)->run(self::PASSWORD);
            $this->fail('Production must not accept demo data.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('hanya untuk APP_ENV=local', $e->getMessage());
            $this->assertDatabaseCount('users', $count);
        } finally {
            $this->app['env'] = 'testing';
        }
    }
}
