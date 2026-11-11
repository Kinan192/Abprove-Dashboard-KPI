<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\ScopeResolver;
use App\Services\KpiMaster\KpiMasterService;
use App\Services\Organization\OrganizationService;
use App\Support\DomainSchema;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class LocalDemoSeeder extends Seeder
{
    public const ACCOUNTS = [
        'hc.demo@kpi.test' => ['Super HC Contoh', 'super_hc', 'DEMO-HC'],
        'hc.operasional@kpi.test' => ['HC Operasional', 'super_hc', 'DEMO-HC-02'],
        'hc.administrasi@kpi.test' => ['HC Administrasi', 'super_hc', 'DEMO-HC-03'],
        'hc.monitoring@kpi.test' => ['HC Monitoring', 'super_hc', 'DEMO-HC-04'],
        'kd.umum@kpi.test' => ['Kepala Divisi Umum Contoh', 'kepala_divisi', 'DEMO-KD-UMUM'],
        'kd.medis@kpi.test' => ['Kepala Divisi Medis Contoh', 'kepala_divisi', 'DEMO-KD-MEDIS'],
        'kd.keperawatan@kpi.test' => ['Kepala Divisi Keperawatan', 'kepala_divisi', 'DEMO-KD-KEPERAWATAN'],
        'kd.keuangan@kpi.test' => ['Kepala Divisi Keuangan', 'kepala_divisi', 'DEMO-KD-KEUANGAN'],
        'ku.it@kpi.test' => ['Kepala Unit IT Contoh', 'kepala_unit', 'DEMO-KU-IT'],
        'ku.sdm@kpi.test' => ['Kepala Unit SDM Contoh', 'kepala_unit', 'DEMO-KU-SDM'],
        'ku.ugd@kpi.test' => ['Kepala Unit UGD Contoh', 'kepala_unit', 'DEMO-KU-UGD'],
        'ku.logistik@kpi.test' => ['Kepala Unit Logistik', 'kepala_unit', 'DEMO-KU-LOGISTIK'],
        'ku.rawatinap@kpi.test' => ['Kepala Unit Rawat Inap', 'kepala_unit', 'DEMO-KU-RAWATINAP'],
        'ku.rawatjalan@kpi.test' => ['Kepala Unit Rawat Jalan', 'kepala_unit', 'DEMO-KU-RAWATJALAN'],
        'ku.icu@kpi.test' => ['Kepala Unit ICU', 'kepala_unit', 'DEMO-KU-ICU'],
        'ku.tatausaha@kpi.test' => ['Kepala Unit Tata Usaha', 'kepala_unit', 'DEMO-KU-TATAUSAHA'],
    ];

    public static function indicators(): array
    {
        $names = ['Kepatuhan layanan', 'Ketepatan waktu layanan', 'Koordinasi pekerjaan', 'Komunikasi pelayanan', 'Efisiensi sumber daya', 'Kelengkapan dokumentasi', 'Pencapaian rencana kerja'];
        $pillars = ['Technical Care', 'Access', 'Coordination and Continuity', 'Interpersonal Care', 'Efficient', 'Technical Care', 'Efficient'];
        $weights = [20, 15, 15, 15, 15, 10, 10];

        return array_map(fn ($name, $i) => ['pillar' => $pillars[$i], 'name' => $name, 'target_text' => '95%', 'weight_percent' => (string) $weights[$i]], $names, array_keys($names));
    }

    public function run(?string $password = null): void
    {
        $isolated = app()->environment('testing') && getenv('KPI_ISOLATED_TEST') === '1' && DB::connection()->getDatabaseName() === 'kpi_backend_v2_test';
        if (! $isolated && (! app()->environment('local') || ! in_array(DB::connection()->getDatabaseName(), ['kpi_kinerja_dev', 'kpi_kinerja_demo', 'kpi_kinerja_v2_dev', 'kpi_kinerja_v2_demo', 'kpi_kinerja_v3_dev']))) {
            throw new RuntimeException('Seeder hanya untuk APP_ENV=local pada database dev/demo KPI.');
        }
        if (! DomainSchema::ready()) {
            throw new RuntimeException('Seeder membutuhkan schema v2; data lama tidak diubah.');
        }
        $path = storage_path('app/private/local-demo-accounts.json');
        $saved = ! $isolated && File::exists($path) ? json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR) : [];
        $password ??= env('KPI_DEMO_PASSWORD') ?: ($saved['password'] ?? 'Kpi'.bin2hex(random_bytes(10)).'9!');
        Validator::make(['password' => $password], ['password' => ['required', Password::min(12)->letters()->numbers()]])->validate();
        DB::transaction(function () use ($password) {
            $users = [];
            foreach (self::ACCOUNTS as $email => [$name,$role,$nip]) {
                $user = User::where('email', $email)->first();
                if ($user && ($user->login_nip !== $nip || $user->role_key !== $role)) {
                    throw new RuntimeException('Identitas contoh bertabrakan: '.$email);
                }
                if (! $user) {
                    $user = User::create(['name' => $name, 'email' => $email, 'login_nip' => $nip, 'role_key' => $role, 'password' => $password]);
                    DB::table('user_roles')->insert(['user_id' => $user->id, 'role_key' => $role]);
                }
                $users[$email] = $user;
            }
            $hc = $users['hc.demo@kpi.test'];
            foreach ($users as $account) {
                if ($account->role_key === 'super_hc' && ! DB::table('scope_assignments')->where('user_id', $account->id)->whereNull('revoked_at')->exists()) {
                    DB::table('scope_assignments')->insert(['user_id' => $account->id, 'role_key' => 'super_hc', 'assigned_by' => $hc->id, 'assigned_at' => now()]);
                }
            }
            $ctx = app(ScopeResolver::class)->resolve($hc);
            $org = app(OrganizationService::class);
            $position = DB::table('positions')->where('code', 'DEMO-STAFF')->first();
            $positionId = $position ? $position->id : $org->save($ctx, 'positions', null, ['code' => 'DEMO-STAFF', 'name' => 'Staf Contoh'])['id'];
            $divisions = [];
            foreach (['UMUM' => 'Umum & SDM Contoh', 'MEDIS' => 'Pelayanan Medis Contoh', 'KEPERAWATAN' => 'Keperawatan', 'KEUANGAN' => 'Keuangan'] as $code => $name) {
                $d = DB::table('divisions')->where('code', 'DEMO-'.$code)->first();
                $divisions[$code] = $d ? $d->id : $org->save($ctx, 'divisions', null, ['code' => 'DEMO-'.$code, 'name' => $name, 'head_user_id' => $users['kd.'.strtolower($code).'@kpi.test']->id])['id'];
            }
            $units = [];
            $month = now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
            foreach (['IT' => 'UMUM', 'SDM' => 'UMUM', 'LOGISTIK' => 'UMUM', 'UGD' => 'MEDIS', 'RAWATINAP' => 'MEDIS', 'RAWATJALAN' => 'KEPERAWATAN', 'ICU' => 'KEPERAWATAN', 'TATAUSAHA' => 'KEUANGAN'] as $code => $div) {
                $u = DB::table('units')->where('code', 'DEMO-'.$code)->first();
                $unit = $u ? $u->id : $org->save($ctx, 'units', null, ['code' => 'DEMO-'.$code, 'name' => $code.' Contoh', 'division_id' => $divisions[$div], 'head_user_id' => $users['ku.'.strtolower($code).'@kpi.test']->id])['id'];
                $units[] = $unit;
                foreach (range(1, 12) as $n) {
                    if (! DB::table('employees')->where('nip', 'DEMO-'.$code.'-0'.$n)->exists()) {
                        $org->save($ctx, 'employees', null, ['nip' => 'DEMO-'.$code.'-0'.$n, 'full_name' => 'Anggota '.$code.' Contoh 0'.$n, 'position_id' => $positionId, 'unit_id' => $unit, 'effective_from' => $month]);
                    }
                }
            }
            $master = app(KpiMasterService::class);
            foreach (['unit' => $units, 'division' => array_values($divisions)] as $level => $ids) {
                foreach ($ids as $id) {
                    $exists = DB::table('kpi_templates')->where('scope_level', $level)->where('scope_key', $id)->whereNotNull('sealed_at')->where('effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month))->exists();
                    if (! $exists) {
                        $master->template($ctx, null, ['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $id, 'name' => 'KPI '.$level.' contoh', 'effective_from' => $month, 'items' => self::indicators()]);
                    }
                }
            }
            if (! DB::table('assessment_cycles')->where('assessment_month', $month)->exists()) {
                $master->cycle($ctx, null, ['assessment_month' => $month, 'opens_at' => now()->subDay()->toIso8601String(), 'submission_due_at' => now()->addDays(5)->toIso8601String(), 'approval_due_at' => now()->addDays(8)->toIso8601String(), 'closes_at' => now()->addDays(10)->toIso8601String(), 'status' => 'open', 'categories' => [['code' => 'poor', 'label' => 'Kurang', 'lower_bound' => 0, 'upper_bound' => 70], ['code' => 'fair', 'label' => 'Cukup', 'lower_bound' => 70, 'upper_bound' => 80], ['code' => 'good', 'label' => 'Baik', 'lower_bound' => 80, 'upper_bound' => 90], ['code' => 'excellent', 'label' => 'Sangat Baik', 'lower_bound' => 90, 'upper_bound' => null]]]);
            }
            $cycle = DB::table('assessment_cycles')->where('assessment_month', $month)->first();
            if ($cycle->status === 'open' && now()->lt($cycle->submission_due_at)) {
                $service = app(AssessmentService::class);
                foreach ($units as $unit) {
                    $kuAssignment = DB::table('scope_assignments')->where('unit_id', $unit)->whereNull('revoked_at')->first();
                    $ku = app(ScopeResolver::class)->resolve(User::findOrFail($kuAssignment->user_id));
                    $division = DB::table('units')->where('id', $unit)->value('division_id');
                    $kdAssignment = DB::table('scope_assignments')->where('division_id', $division)->whereNull('revoked_at')->first();
                    $kd = app(ScopeResolver::class)->resolve(User::findOrFail($kdAssignment->user_id));
                    $staff = DB::table('employees as e')->join('employee_placements as p', 'p.employee_id', '=', 'e.id')->where('p.unit_id', $unit)->where('e.nip', 'like', 'DEMO-%')->select('e.id')->orderBy('e.id')->get();
                    foreach ($staff->take(6) as $n => $employee) {
                        if (DB::table('assessments')->where('employee_id', $employee->id)->where('cycle_id', $cycle->id)->exists()) {
                            continue;
                        }
                        $payload = ['cycle_id' => $cycle->id, 'employee_id' => $employee->id];
                        $form = $service->form($ku, $payload);
                        $payload['scores'] = array_map(fn ($i) => ['source_kpi_item_id' => $i['id'], 'score' => [80, 85, 90, 92, 88, 96][$n]], $form['template']['items']);
                        $payload['positive_finding'] = 'Data latihan: layanan terlaksana sesuai target.';
                        $payload['negative_finding'] = $n % 2 ? 'Data latihan: tingkatkan kelengkapan bukti pendukung.' : null;
                        $a = $service->store($ku, $payload);
                        if ($n > 0) {
                            $service->change($kd, $a['id'], $n === 1 ? 'return' : 'approve', ['lock_version' => $a['lock_version'], 'reason' => 'Periksa kembali bukti pendukung layanan.']);
                        }
                    }
                    if ($unit === $units[0] && ! DB::table('assessments')->where('subject_user_id', $ku->userId)->where('cycle_id', $cycle->id)->exists()) {
                        $payload = ['cycle_id' => $cycle->id, 'subject_user_id' => $ku->userId];
                        $form = $service->form($kd, $payload);
                        $payload['scores'] = array_map(fn ($i) => ['source_kpi_item_id' => $i['id'], 'score' => 88], $form['template']['items']);
                        $service->store($kd, $payload);
                    }
                }
            }
        });
        if (! $isolated) {
            File::ensureDirectoryExists(dirname($path));
            File::put($path, json_encode(['password' => $saved['password'] ?? $password, 'accounts' => self::ACCOUNTS, 'note' => 'Data latihan lokal. Akun existing dan kata sandinya dipertahankan.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $this->command?->info('Akun contoh siap. Kredensial lokal: '.$path);
        }
    }
}
