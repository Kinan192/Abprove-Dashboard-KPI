<?php

namespace Tests\Support;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

abstract class BackendTestCase extends TestCase
{
    use DatabaseTransactions;

    protected array $users = [];

    protected array $ids = [];

    protected function setUp(): void
    {
        if (getenv('KPI_ISOLATED_TEST') !== '1' || getenv('DB_DATABASE') !== 'kpi_backend_test') {
            throw new \RuntimeException('Jalankan melalui tools/testing/run_backend_tests.py untuk memakai MySQL terisolasi.');
        }
        parent::setUp();
        $this->withoutExceptionHandling();
        $this->withExceptionHandling();
        foreach (['hc' => 'super_hc', 'kd1' => 'kepala_divisi', 'ku1' => 'kepala_unit', 'kd2' => 'kepala_divisi', 'ku2' => 'kepala_unit'] as $key => $role) {
            $u = User::create(['name' => $key, 'email' => $key.'@example.test', 'login_nip' => 'LOGIN-'.$key, 'password' => 'TestPassword1234']);
            $this->users[$key] = $u;
            DB::table('user_roles')->insert(['user_id' => $u->id, 'role_key' => $role]);
        }
        foreach ([1, 2] as $n) {
            $d = DB::table('divisions')->insertGetId(['code' => 'D'.$n, 'name' => 'Divisi '.$n]);
            $unit = DB::table('units')->insertGetId(['division_id' => $d, 'code' => 'U'.$n, 'name' => 'Unit '.$n]);
            $this->ids['d'.$n] = $d;
            $this->ids['u'.$n] = $unit;
            foreach (['kd' => ['kepala_divisi', 'division_id', $d], 'ku' => ['kepala_unit', 'unit_id', $unit]] as $prefix => [$role, $column, $area]) {
                DB::table('scope_assignments')->insert(['user_id' => $this->users[$prefix.$n]->id, 'role_key' => $role, $column => $area, 'assigned_at' => now()->subDays(3)]);
            }
        }
        DB::table('scope_assignments')->insert(['user_id' => $this->users['hc']->id, 'role_key' => 'super_hc', 'assigned_at' => now()->subDays(3)]);
        $position = DB::table('positions')->insertGetId(['code' => 'STAFF', 'name' => 'Staf / Kepala Unit']);
        $this->ids['position'] = $position;
        foreach (['member1' => [1, null], 'member2' => [2, null], 'head1' => [1, 'ku1'], 'head2' => [2, 'ku2']] as $key => [$n, $user]) {
            $e = DB::table('employees')->insertGetId(['nip' => $key, 'full_name' => $key, 'position_id' => $position, 'user_id' => $user ? $this->users[$user]->id : null]);
            $this->ids[$key] = $e;
            DB::table('employee_placements')->insert(['employee_id' => $e, 'unit_id' => $this->ids['u'.$n], 'division_id' => $this->ids['d'.$n], 'started_at' => now()->subDays(5)]);
        }
        $year = now()->year;
        $template = DB::table('kpi_templates')->insertGetId(['position_id' => $position, 'name' => 'Template '.$year, 'template_year' => $year, 'version' => 1, 'status' => 'published', 'effective_from' => "$year-01-01", 'effective_until' => "$year-12-31", 'published_at' => now(), 'created_by' => $this->users['hc']->id]);
        foreach ([15, 10, 10, 25, 20, 20] as $i => $weight) {
            DB::table('kpi_items')->insert(['template_id' => $template, 'sort_order' => $i + 1, 'pillar' => 'Technical Care', 'name' => 'KPI '.($i + 1), 'weight_percent' => $weight]);
        }
        $this->ids['template'] = $template;
        $cycle = DB::table('assessment_cycles')->insertGetId(['assessment_month' => now()->startOfMonth()->format('Y-m-d'), 'opens_at' => now()->subDay(), 'submission_due_at' => now()->addDays(2), 'approval_due_at' => now()->addDays(3), 'closes_at' => now()->addDays(4), 'status' => 'open', 'created_by' => $this->users['hc']->id]);
        $this->ids['cycle'] = $cycle;
        foreach ([['kurang', 0, 70], ['cukup', 70, 80], ['baik', 80, 90], ['sangat_baik', 90, null]] as $i => [$code, $lower, $upper]) {
            DB::table('cycle_categories')->insert(['cycle_id' => $cycle, 'code' => $code, 'label' => $code, 'lower_bound' => $lower, 'upper_bound' => $upper, 'sort_order' => $i + 1]);
        }
    }

    protected function asRole(string $key): static
    {
        $this->actingAs($this->users[$key]);
        $this->withSession(['last_activity_at' => now()->timestamp]);

        return $this;
    }

    protected function key(array $data = []): array
    {
        return ['request_id' => (string) Str::uuid()] + $data;
    }

    protected function startAssessment(string $role = 'ku1', string $employee = 'member1'): array
    {
        $prefix = str_starts_with($role, 'kd') ? 'division' : 'unit';

        return $this->asRole($role)->postJson('/'.$prefix.'/assessments', $this->key(['employee_id' => $this->ids[$employee], 'cycle_id' => $this->ids['cycle']]))->assertOk()->json('data');
    }

    protected function fillAssessment(array $a, string $role = 'ku1'): array
    {
        $prefix = str_starts_with($role, 'kd') ? 'division' : 'unit';
        $scores = [];
        foreach ($a['items'] as $i => $item) {
            $scores[] = ['id' => $item['id'], 'score' => [90, 80, 100, 85, 75, 75][$i]];
        }

        return $this->asRole($role)->patchJson('/'.$prefix.'/assessments/'.$a['id'].'/draft', $this->key(['lock_version' => $a['lock_version'], 'scores' => $scores]))->assertOk()->json('data');
    }

    protected function submitted(string $role = 'ku1', string $employee = 'member1'): array
    {
        $a = $this->fillAssessment($this->startAssessment($role, $employee), $role);

        return $this->asRole($role)->postJson('/unit/assessments/'.$a['id'].'/submit', $this->key(['lock_version' => $a['lock_version']]))->assertOk()->json('data');
    }
}
