<?php

use App\Models\User;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\ScopeResolver;
use Carbon\Carbon;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (getenv('KPI_ISOLATED_TEST') !== '1' || config('database.connections.mysql.database') !== 'kpi_frontend_test') {
    throw new RuntimeException('Dedicated frontend test database required.');
}

$password = getenv('KPI_E2E_PASSWORD');
$users = [];
$ids = [];
foreach (['hc' => ['Super HC Uji', 'super_hc'], 'kd1' => ['Kepala Divisi Umum Uji', 'kepala_divisi'], 'ku1' => ['Kepala Unit IT Uji', 'kepala_unit'], 'ku_sdm' => ['Kepala Unit SDM Uji', 'kepala_unit'], 'kd2' => ['Kepala Divisi Medis Uji', 'kepala_divisi'], 'ku2' => ['Kepala Unit UGD Uji', 'kepala_unit']] as $key => [$name,$role]) {
    $users[$key] = User::create(['name' => $name, 'email' => $key.'@example.test', 'login_nip' => 'UJI-'.$key, 'password' => $password]);
    DB::table('user_roles')->insert(['user_id' => $users[$key]->id, 'role_key' => $role]);
}
foreach (['d1' => 'Umum & SDM (Uji)', 'd2' => 'Pelayanan Medis (Uji)'] as $key => $name) {
    $ids[$key] = DB::table('divisions')->insertGetId(['code' => strtoupper($key), 'name' => $name]);
}
foreach (['it' => ['IT (Uji)', 'd1'], 'sdm' => ['SDM (Uji)', 'd1'], 'ugd' => ['UGD (Uji)', 'd2']] as $key => [$name,$division]) {
    $ids[$key] = DB::table('units')->insertGetId(['division_id' => $ids[$division], 'code' => strtoupper($key), 'name' => $name]);
}
foreach (['hc' => ['super_hc', null, null], 'kd1' => ['kepala_divisi', 'division_id', 'd1'], 'ku1' => ['kepala_unit', 'unit_id', 'it'], 'ku_sdm' => ['kepala_unit', 'unit_id', 'sdm'], 'kd2' => ['kepala_divisi', 'division_id', 'd2'], 'ku2' => ['kepala_unit', 'unit_id', 'ugd']] as $key => [$role,$column,$area]) {
    DB::table('scope_assignments')->insert(['user_id' => $users[$key]->id, 'role_key' => $role, 'assigned_at' => now()->subYears(2)->format('Y-m-d H:i:s.u')] + ($column ? [$column => $ids[$area]] : []));
}
$positions = [];
foreach (['staff' => 'Staf IT (Uji)', 'head' => 'Kepala Unit (Uji)'] as $key => $name) {
    $positions[$key] = DB::table('positions')->insertGetId(['code' => strtoupper($key), 'name' => $name]);
}
foreach (['member1' => ['Karyawan Uji 01', 'it', null], 'member2' => ['Karyawan Uji 02', 'it', null], 'member3' => ['Karyawan Uji 03', 'it', null], 'member_sdm' => ['Anggota SDM Uji', 'sdm', null], 'member_other' => ['Anggota Medis Uji', 'ugd', null], 'head1' => ['Kepala Unit IT Uji', 'it', 'ku1'], 'head_sdm' => ['Kepala Unit SDM Uji', 'sdm', 'ku_sdm'], 'head2' => ['Kepala Unit UGD Uji', 'ugd', 'ku2']] as $key => [$name,$unit,$user]) {
    $ids[$key] = DB::table('employees')->insertGetId(['nip' => 'NIP-UJI-'.$key, 'full_name' => $name, 'position_id' => $positions[$user ? 'head' : 'staff'], 'user_id' => $user ? $users[$user]->id : null]);
    DB::table('employee_placements')->insert(['employee_id' => $ids[$key], 'unit_id' => $ids[$unit], 'division_id' => $ids[$unit === 'ugd' ? 'd2' : 'd1'], 'started_at' => now()->subYears(2)->format('Y-m-d H:i:s.u')]);
}
$now = now()->toImmutable();
$years = [$now->year, $now->subMonths(3)->year];
foreach (array_unique($years) as $year) {
    foreach ($positions as $key => $position) {
        $template = DB::table('kpi_templates')->insertGetId(['position_id' => $position, 'name' => 'Template '.($key === 'staff' ? 'Staf' : 'Kepala Unit').' '.$year.' (Uji)', 'template_year' => $year, 'version' => 1, 'status' => 'published', 'effective_from' => $year.'-01-01', 'effective_until' => $year.'-12-31', 'published_at' => now(), 'created_by' => $users['hc']->id]);
        foreach ([['Technical Care', 'Kepatuhan dokumentasi', '95%', 15], ['Access', 'Ketepatan waktu layanan', '100%', 10], ['Interpersonal Care', 'Penerapan budaya layanan', 'Tidak ada keluhan', 10], ['Coordination and Continuity', 'Koordinasi pekerjaan', '100%', 25], ['Efficient', 'Efisiensi sumber daya', '<20%', 20], ['Technical Care', 'Penyelesaian pekerjaan', '100%', 20]] as $i => [$pillar,$name,$target,$weight]) {
            DB::table('kpi_items')->insert(['template_id' => $template, 'sort_order' => $i + 1, 'pillar' => $pillar, 'name' => $name, 'target_text' => $target, 'weight_percent' => $weight]);
        }
    }
}
$cycles = [];
for ($i = 3; $i >= 0; $i--) {
    $month = $now->startOfMonth()->subMonths($i);
    $opens = $i ? $month : $now->subDay();
    $submission = $i ? $month->addDays(15) : $now->addDays(10);
    $approval = $i ? $month->addDays(20) : $now->addDays(15);
    $closes = $i ? $month->addDays(25) : $now->addDays(20);
    $cycle = DB::table('assessment_cycles')->insertGetId(['assessment_month' => $month->format('Y-m-d'), 'opens_at' => $opens, 'submission_due_at' => $submission, 'approval_due_at' => $approval, 'closes_at' => $closes, 'status' => 'open', 'created_by' => $users['hc']->id]);
    foreach ([['kurang', 'Kurang', 0, 70], ['cukup', 'Cukup', 70, 80], ['baik', 'Baik', 80, 90], ['sangat_baik', 'Sangat Baik', 90, null]] as $j => [$code,$label,$lower,$upper]) {
        DB::table('cycle_categories')->insert(['cycle_id' => $cycle, 'code' => $code, 'label' => $label, 'lower_bound' => $lower, 'upper_bound' => $upper, 'sort_order' => $j + 1]);
    }
    $cycles[$i] = $cycle;
    if ($i) {
        Carbon::setTestNow($month->addDays(10));
        DB::transaction(function () use ($app, $users, $ids, $cycle, $i) {
            $service = $app->make(AssessmentService::class);
            $resolver = $app->make(ScopeResolver::class);
            $ku = $resolver->resolve($users['ku1']->fresh());
            $kd = $resolver->resolve($users['kd1']->fresh());
            $a = $service->start($ku, ['employee_id' => $ids['member2'], 'cycle_id' => $cycle]);
            $scores = array_map(fn ($item) => ['id' => $item['id'], 'score' => 85 - $i], $a['items']);
            $a = $service->change($ku, $a['id'], 'draft', ['lock_version' => 0, 'scores' => $scores, 'positive_finding' => 'Pekerjaan uji terselesaikan sesuai jadwal.']);
            $a = $service->change($ku, $a['id'], 'submit', ['lock_version' => $a['lock_version']]);
            $service->change($kd, $a['id'], 'approve', ['lock_version' => $a['lock_version']]);
        });
        DB::table('assessment_cycles')->where('id', $cycle)->update(['status' => 'closed']);
        Carbon::setTestNow();
    }
}
DB::transaction(function () use ($app, $users, $ids, $cycles) {
    $service = $app->make(AssessmentService::class);
    $resolver = $app->make(ScopeResolver::class);
    $ku = $resolver->resolve($users['ku1']->fresh());
    $kd = $resolver->resolve($users['kd1']->fresh());
    $a = $service->start($ku, ['employee_id' => $ids['member2'], 'cycle_id' => $cycles[0]]);
    $a = $service->change($ku, $a['id'], 'draft', ['lock_version' => 0, 'scores' => array_map(fn ($item) => ['id' => $item['id'], 'score' => 80], $a['items'])]);
    $a = $service->change($ku, $a['id'], 'submit', ['lock_version' => $a['lock_version']]);
    $service->change($kd, $a['id'], 'return', ['lock_version' => $a['lock_version'], 'reason' => 'Periksa dokumentasi pekerjaan dan catatan pendukung.']);
});
echo json_encode(['users' => array_map(fn ($u) => $u->only('id', 'name', 'email'), $users), 'ids' => $ids, 'positions' => $positions, 'cycle' => $cycles[0]], JSON_THROW_ON_ERROR);
