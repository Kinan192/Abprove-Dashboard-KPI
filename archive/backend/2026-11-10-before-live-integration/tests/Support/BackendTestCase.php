<?php

namespace Tests\Support;

use App\Models\User;
use Carbon\Carbon;
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
        if (getenv('KPI_ISOLATED_TEST') !== '1' || getenv('DB_DATABASE') !== 'kpi_backend_v2_test') {
            throw new \RuntimeException('Gunakan tools/testing/run_backend_v2_tests.py.');
        }
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-11-09T10:00:00Z'));
        $this->withExceptionHandling();
        foreach (['hc' => 'super_hc', 'kd1' => 'kepala_divisi', 'ku1' => 'kepala_unit', 'kd2' => 'kepala_divisi', 'ku2' => 'kepala_unit'] as $key => $role) {
            $u = User::create(['name' => $key, 'email' => $key.'@example.test', 'login_nip' => 'LOGIN-'.$key, 'password' => 'TestPassword1234', 'role_key' => $role]);
            $this->users[$key] = $u;
            DB::table('user_roles')->insert(['user_id' => $u->id, 'role_key' => $role]);
        }
        DB::table('scope_assignments')->insert(['user_id' => $this->users['hc']->id, 'role_key' => 'super_hc', 'assigned_at' => now()->subDays(3)]);
        $position = DB::table('positions')->insertGetId(['code' => 'STAFF', 'name' => 'Staf']);
        $this->ids['position'] = $position;
        foreach ([1, 2] as $n) {
            $d = DB::table('divisions')->insertGetId(['code' => 'D'.$n, 'name' => 'Divisi '.$n]);
            $unit = DB::table('units')->insertGetId(['division_id' => $d, 'code' => 'U'.$n, 'name' => 'Unit '.$n]);
            $this->ids['d'.$n] = $d;
            $this->ids['u'.$n] = $unit;
            foreach (['kd' => ['kepala_divisi', 'division_id', $d], 'ku' => ['kepala_unit', 'unit_id', $unit]] as $prefix => [$role,$col,$area]) {
                $assignment = DB::table('scope_assignments')->insertGetId(['user_id' => $this->users[$prefix.$n]->id, 'role_key' => $role, $col => $area, 'assigned_at' => now()->subDays(3)]);
                $this->ids[$prefix.'Assignment'.$n] = $assignment;
            }
            $e = DB::table('employees')->insertGetId(['nip' => 'member'.$n, 'full_name' => 'member'.$n, 'position_id' => $position]);
            $this->ids['member'.$n] = $e;
            $this->ids['head'.$n] = $this->users['ku'.$n]->id;
            $this->ids['placement'.$n] = DB::table('employee_placements')->insertGetId(['employee_id' => $e, 'unit_id' => $unit, 'division_id' => $d, 'effective_from' => now()->startOfMonth()->format('Y-m-d'), 'reason' => 'Fixture', 'created_by' => $this->users['hc']->id]);
            foreach (['unit' => $unit, 'division' => $d] as $level => $area) {
                $scope = DB::table('kpi_scopes')->insertGetId(['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $area, 'next_version' => 2, 'created_by' => $this->users['hc']->id]);
                $t = DB::table('kpi_templates')->insertGetId(['scope_id' => $scope, 'scope_level' => $level, 'scope_key' => $area, 'name' => 'KPI '.$level.$n, 'version' => 1, 'effective_from' => now()->startOfYear()->format('Y-m-d'), 'expected_item_count' => 6, 'created_by' => $this->users['hc']->id]);
                foreach ([15, 10, 10, 25, 20, 20] as $i => $weight) {
                    DB::table('kpi_items')->insert(['template_id' => $t, 'sort_order' => $i + 1, 'pillar' => 'Technical Care', 'name' => 'KPI '.($i + 1), 'target_text' => '100%', 'weight_percent' => $weight]);
                }
                DB::table('kpi_templates')->where('id', $t)->update(['sealed_at' => now()]);
                $this->ids[$level.'Template'.$n] = $t;
            }
        }
        $this->ids['template'] = $this->ids['unitTemplate1'];
        $cycle = DB::table('assessment_cycles')->insertGetId(['assessment_month' => now()->startOfMonth()->format('Y-m-d'), 'opens_at' => now()->subDay(), 'submission_due_at' => now()->addDays(2), 'approval_due_at' => now()->addDays(3), 'closes_at' => now()->addDays(4), 'status' => 'open', 'created_by' => $this->users['hc']->id]);
        $this->ids['cycle'] = $cycle;
        foreach ([['kurang', 0, 70], ['cukup', 70, 80], ['baik', 80, 90], ['sangat_baik', 90, null]] as $i => [$code,$lo,$hi]) {
            DB::table('cycle_categories')->insert(['cycle_id' => $cycle, 'code' => $code, 'label' => $code, 'lower_bound' => $lo, 'upper_bound' => $hi, 'sort_order' => $i + 1]);
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
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

    protected function payload(string $role = 'ku1', string $employee = 'member1'): array
    {
        $heads = str_starts_with($role, 'kd');
        $n = str_ends_with($employee, '2') ? 2 : 1;
        $template = $this->ids[($heads ? 'division' : 'unit').'Template'.$n];
        $scores = DB::table('kpi_items')->where('template_id', $template)->orderBy('sort_order')->get()->map(fn ($item, $i) => ['source_kpi_item_id' => $item->id, 'score' => [90, 80, 100, 85, 75, 75][$i]])->all();

        return $this->key(['cycle_id' => $this->ids['cycle'], $heads ? 'subject_user_id' : 'employee_id' => $this->ids[$employee], 'scores' => $scores]);
    }

    protected function startAssessment(string $role = 'ku1', string $employee = 'member1'): array
    {
        return $this->asRole($role)->postJson('/'.(str_starts_with($role, 'kd') ? 'division' : 'unit').'/assessments', $this->payload($role, $employee))->assertOk()->json('data');
    }

    protected function submitted(string $role = 'ku1', string $employee = 'member1'): array
    {
        return $this->startAssessment($role, $employee);
    }
}
