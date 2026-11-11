<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use App\Services\IdentityAccess\ScopeResolver;
use App\Services\KpiMaster\KpiMasterService;
use App\Services\Organization\OrganizationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
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
        $database = DB::connection()->getDatabaseName();
        $isolated = app()->environment('testing') && getenv('KPI_ISOLATED_TEST') === '1' && $database === 'kpi_backend_test';
        if (! $isolated && (! app()->environment('local') || ! in_array($database, ['kpi_kinerja_dev', 'kpi_kinerja_demo'], true))) {
            throw new RuntimeException('Seeder contoh hanya untuk APP_ENV=local pada kpi_kinerja_dev atau kpi_kinerja_demo.');
        }

        $path = storage_path('app/private/local-demo-accounts.json');
        $saved = ! $isolated && File::exists($path) ? json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR) : [];
        $password ??= env('KPI_DEMO_PASSWORD') ?: ($saved['password'] ?? 'Kpi'.bin2hex(random_bytes(8)).'9!');
        Validator::make(['password' => $password], ['password' => ['required', Password::min(12)->letters()->numbers()]])->validate();

        $accounts = DB::transaction(function () use ($password) {
            $users = [];
            $created = [];
            foreach (self::ACCOUNTS as $email => [$name, $role, $nip]) {
                $user = User::where('email', $email)->first();
                if ($user && ($user->login_nip !== $nip || ! DB::table('user_roles')->where('user_id', $user->id)->where('role_key', $role)->exists())) {
                    throw new RuntimeException('Identitas contoh sudah dipakai akun lain: '.$email);
                }
                if (! $user) {
                    if (User::where('login_nip', $nip)->orWhere('email', $nip)->orWhere('login_nip', $email)->exists()) {
                        throw new RuntimeException('Identitas login contoh bertabrakan: '.$email);
                    }
                    $user = User::create(['name' => $name, 'email' => $email, 'login_nip' => $nip, 'password' => $password]);
                    DB::table('user_roles')->insert(['user_id' => $user->id, 'role_key' => $role]);
                    $created[] = $user;
                }
                $users[$email] = $user;
            }
            $hc = $users['hc.demo@kpi.test'];
            if (! DB::table('scope_assignments')->where('user_id', $hc->id)->exists()) {
                DB::table('scope_assignments')->insert(['user_id' => $hc->id, 'role_key' => 'super_hc', 'assigned_by' => $hc->id, 'assigned_at' => now()->format('Y-m-d H:i:s.u'), 'note' => 'Data contoh lokal']);
                $ctx = app(ScopeResolver::class)->resolve($hc);
                app(AuditWriter::class)->record($ctx, 'user', $hc->id, 'local-demo.bootstrap', null, ['id' => $hc->id, 'email' => $hc->email]);
            }
            $ctx = app(ScopeResolver::class)->resolve($hc);
            foreach ($created as $user) {
                app(AuditWriter::class)->record($ctx, 'users', $user->id, 'users.created', null, ['id' => $user->id, 'email' => $user->email, 'name' => $user->name], 'Data contoh lokal');
            }
            $org = app(OrganizationService::class);
            $positions = [];
            foreach (['STAFF' => 'Staf Contoh', 'HEAD' => 'Kepala Unit Contoh'] as $code => $name) {
                $positions[$code] = $this->record($org, $ctx, 'positions', ['code' => 'DEMO-'.$code], ['name' => $name]);
            }
            $divisions = [];
            foreach (['UMUM' => 'Umum & SDM Contoh', 'MEDIS' => 'Pelayanan Medis Contoh'] as $code => $name) {
                $division = $this->record($org, $ctx, 'divisions', ['code' => 'DEMO-'.$code], ['name' => $name]);
                $divisions[$code] = $division;
                $this->head($org, $ctx, 'divisions', $division['id'], $users['kd.'.strtolower($code).'@kpi.test']->id);
            }
            foreach (['IT' => 'UMUM', 'SDM' => 'UMUM', 'UGD' => 'MEDIS'] as $unitCode => $divisionCode) {
                $unit = $this->record($org, $ctx, 'units', ['code' => 'DEMO-'.$unitCode, 'division_id' => $divisions[$divisionCode]['id']], ['name' => $unitCode.' Contoh']);
                $leader = $users['ku.'.strtolower($unitCode).'@kpi.test'];
                $employee = $this->record($org, $ctx, 'employees', ['nip' => 'DEMO-HEAD-'.$unitCode], ['full_name' => $leader->name, 'position_id' => $positions['HEAD']['id'], 'user_id' => $leader->id]);
                $this->placement($org, $ctx, $employee['id'], $unit['id']);
                $this->head($org, $ctx, 'units', $unit['id'], $leader->id);
                foreach ([1, 2] as $number) {
                    $employee = $this->record($org, $ctx, 'employees', ['nip' => 'DEMO-'.$unitCode.'-0'.$number], ['full_name' => 'Anggota '.$unitCode.' Contoh 0'.$number, 'position_id' => $positions['STAFF']['id']]);
                    $this->placement($org, $ctx, $employee['id'], $unit['id']);
                }
            }

            $master = app(KpiMasterService::class);
            $year = now('Asia/Jakarta')->year;
            $items = [];
            foreach ([['Technical Care', 'Kepatuhan dokumentasi', '95%', 15], ['Access', 'Ketepatan waktu', '100%', 10], ['Interpersonal Care', 'Budaya layanan', 'Tidak ada keluhan', 10], ['Coordination and Continuity', 'Koordinasi pekerjaan', '100%', 25], ['Efficient', 'Efisiensi sumber daya', '<20%', 20], ['Technical Care', 'Penyelesaian pekerjaan', '100%', 20]] as [$pillar, $name, $target, $weight]) {
                $items[] = ['pillar' => $pillar, 'name' => $name.' (Contoh)', 'target_text' => $target, 'weight_percent' => (string) $weight];
            }
            foreach ($positions as $position) {
                if (! DB::table('kpi_templates')->where('position_id', $position['id'])->where('template_year', $year)->exists()) {
                    $template = $master->template($ctx, null, ['position_id' => $position['id'], 'name' => 'KPI '.$position['name'].' '.$year, 'template_year' => $year, 'effective_from' => $year.'-01-01', 'effective_until' => $year.'-12-31', 'items' => $items]);
                    $master->publish($ctx, $template['id']);
                }
            }
            $month = now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
            if (! DB::table('assessment_cycles')->where('assessment_month', $month)->exists()) {
                $master->cycle($ctx, null, ['assessment_month' => $month, 'opens_at' => now()->subDay()->toIso8601String(), 'submission_due_at' => now()->addDays(7)->toIso8601String(), 'approval_due_at' => now()->addDays(10)->toIso8601String(), 'closes_at' => now()->addDays(14)->toIso8601String(), 'status' => 'open', 'categories' => [['code' => 'contoh_latihan', 'label' => 'Contoh latihan', 'lower_bound' => '0', 'upper_bound' => null]]]);
            }

            return collect($users)->map(fn (User $u) => ['email' => $u->email, 'nip' => $u->login_nip, 'role' => self::ACCOUNTS[$u->email][1], 'password_matches' => Hash::check($password, $u->password)])->values()->all();
        });

        if (! $isolated) {
            File::ensureDirectoryExists(dirname($path));
            File::put($path, json_encode(['password' => $password, 'accounts' => $accounts], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            $this->command?->info('Akun contoh tersedia. Kredensial lokal: '.$path);
        }
        $this->command?->info('Seeder selesai: 2 divisi, 3 unit, 9 karyawan, dan akun untuk ketiga role. Password akun lama tidak diubah.');
    }

    private function record(OrganizationService $org, AccessContext $ctx, string $table, array $key, array $data): array
    {
        $existing = DB::table($table)->where($key)->first();

        return $existing ? (array) $existing : $org->save($ctx, $table, null, $key + $data + ['is_active' => true]);
    }

    private function placement(OrganizationService $org, AccessContext $ctx, int $employee, int $unit): void
    {
        $old = DB::table('employee_placements')->where('employee_id', $employee)->whereNull('ended_at')->first();
        if ($old) {
            return;
        }
        $org->place($ctx, $employee, ['unit_id' => $unit, 'expected_placement_id' => null, 'reason' => 'Penempatan data contoh lokal']);
    }

    private function head(OrganizationService $org, AccessContext $ctx, string $area, int $areaId, int $user): void
    {
        if (DB::table('scope_assignments')->where('user_id', $user)->exists()) {
            return;
        }
        $org->assignHead($ctx, $area, $areaId, ['user_id' => $user, 'expected_assignment_id' => null, 'reason' => 'Penugasan data contoh lokal']);
    }
}
