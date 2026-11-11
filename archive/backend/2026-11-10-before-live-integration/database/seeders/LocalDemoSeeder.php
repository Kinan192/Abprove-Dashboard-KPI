<?php

namespace Database\Seeders;

use App\Models\User;
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
        'kd.umum@kpi.test' => ['Kepala Divisi Umum Contoh', 'kepala_divisi', 'DEMO-KD-UMUM'],
        'kd.medis@kpi.test' => ['Kepala Divisi Medis Contoh', 'kepala_divisi', 'DEMO-KD-MEDIS'],
        'ku.it@kpi.test' => ['Kepala Unit IT Contoh', 'kepala_unit', 'DEMO-KU-IT'],
        'ku.sdm@kpi.test' => ['Kepala Unit SDM Contoh', 'kepala_unit', 'DEMO-KU-SDM'],
        'ku.ugd@kpi.test' => ['Kepala Unit UGD Contoh', 'kepala_unit', 'DEMO-KU-UGD'],
    ];

    public function run(?string $password = null): void
    {
        $isolated = app()->environment('testing') && getenv('KPI_ISOLATED_TEST') === '1' && DB::connection()->getDatabaseName() === 'kpi_backend_v2_test';
        if (! $isolated && (! app()->environment('local') || ! in_array(DB::connection()->getDatabaseName(), ['kpi_kinerja_dev', 'kpi_kinerja_demo', 'kpi_kinerja_v2_dev', 'kpi_kinerja_v2_demo']))) {
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
            if (! DB::table('scope_assignments')->where('user_id', $hc->id)->whereNull('revoked_at')->exists()) {
                DB::table('scope_assignments')->insert(['user_id' => $hc->id, 'role_key' => 'super_hc', 'assigned_by' => $hc->id, 'assigned_at' => now()]);
            }
            $ctx = app(ScopeResolver::class)->resolve($hc);
            $org = app(OrganizationService::class);
            $position = DB::table('positions')->where('code', 'DEMO-STAFF')->first();
            $positionId = $position ? $position->id : $org->save($ctx, 'positions', null, ['code' => 'DEMO-STAFF', 'name' => 'Staf Contoh'])['id'];
            $divisions = [];
            foreach (['UMUM' => 'Umum & SDM Contoh', 'MEDIS' => 'Pelayanan Medis Contoh'] as $code => $name) {
                $d = DB::table('divisions')->where('code', 'DEMO-'.$code)->first();
                $divisions[$code] = $d ? $d->id : $org->save($ctx, 'divisions', null, ['code' => 'DEMO-'.$code, 'name' => $name, 'head_user_id' => $users['kd.'.strtolower($code).'@kpi.test']->id])['id'];
            }
            $units = [];
            $month = now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
            foreach (['IT' => 'UMUM', 'SDM' => 'UMUM', 'UGD' => 'MEDIS'] as $code => $div) {
                $u = DB::table('units')->where('code', 'DEMO-'.$code)->first();
                $unit = $u ? $u->id : $org->save($ctx, 'units', null, ['code' => 'DEMO-'.$code, 'name' => $code.' Contoh', 'division_id' => $divisions[$div], 'head_user_id' => $users['ku.'.strtolower($code).'@kpi.test']->id])['id'];
                $units[] = $unit;
                foreach ([1, 2] as $n) {
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
                        $master->template($ctx, null, ['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $id, 'name' => 'KPI '.$level.' contoh', 'effective_from' => $month, 'items' => [['pillar' => 'Technical Care', 'name' => 'Kepatuhan layanan contoh', 'target_text' => '95%', 'weight_percent' => '60'], ['pillar' => 'Efficient', 'name' => 'Efisiensi contoh', 'target_text' => '100%', 'weight_percent' => '40']]]);
                    }
                }
            }
            if (! DB::table('assessment_cycles')->where('assessment_month', $month)->exists()) {
                $master->cycle($ctx, null, ['assessment_month' => $month, 'opens_at' => now()->subDay()->toIso8601String(), 'submission_due_at' => now()->addDays(5)->toIso8601String(), 'approval_due_at' => now()->addDays(8)->toIso8601String(), 'closes_at' => now()->addDays(10)->toIso8601String(), 'status' => 'open', 'categories' => [['code' => 'latihan', 'label' => 'Contoh latihan', 'lower_bound' => 0, 'upper_bound' => null]]]);
            }
        });
        if (! $isolated) {
            File::ensureDirectoryExists(dirname($path));
            File::put($path, json_encode(['password' => $saved['password'] ?? $password, 'accounts' => self::ACCOUNTS, 'note' => 'Data latihan lokal. Akun existing dan kata sandinya dipertahankan.'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $this->command?->info('Akun contoh siap. Kredensial lokal: '.$path);
        }
    }
}
