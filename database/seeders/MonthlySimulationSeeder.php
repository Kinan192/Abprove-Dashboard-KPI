<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\AccessContext;
use App\Services\IdentityAccess\ScopeResolver;
use App\Services\KpiMaster\KpiMasterService;
use App\Services\Organization\OrganizationService;
use App\Support\DomainSchema;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;

class MonthlySimulationSeeder extends Seeder
{
    private const START = '2026-01-01';

    protected const PREFIX = 'SIM26';

    protected const LOGIN = 'sim';

    protected const CREDENTIAL_FILE = 'monthly-simulation-accounts.json';

    public function run(
        OrganizationService $organization,
        ScopeResolver $scopes,
        KpiMasterService $master,
        AssessmentService $assessments,
    ): void {
        $database = DB::connection()->getDatabaseName();
        $isolated = app()->environment('testing') && getenv('KPI_ISOLATED_TEST') === '1' && $database === 'kpi_backend_v2_test';
        if (! $isolated && (! app()->environment('local') || $database !== 'kpi_kinerja_v3_dev')) {
            throw new RuntimeException('Gunakan database lokal kpi_kinerja_v3_dev untuk simulasi Januari–November.');
        }
        if (! DomainSchema::ready()) {
            throw new RuntimeException('Jalankan migrasi sebelum membuat simulasi.');
        }

        $path = storage_path('app/private/'.static::CREDENTIAL_FILE);
        $saved = ! $isolated && File::exists($path) ? json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR) : [];
        if (! $isolated && empty($saved['password']) && User::where('email', 'hc.'.static::LOGIN.'@kpi.test')->exists()) {
            throw new RuntimeException('Berkas kredensial simulasi tidak ditemukan.');
        }
        $password = $saved['password'] ?? 'Sim'.bin2hex(random_bytes(12)).'7!';
        $start = CarbonImmutable::parse(self::START, 'UTC');
        $realNow = now()->toImmutable();

        DB::transaction(function () use ($organization, $scopes, $master, $assessments, $start, $realNow, $password, $path, $isolated) {
            $catalog = $this->catalog();
            $closed = collect();
            if ($catalog !== []) {
                // The new local cohort needs historical templates and assessments. Stage existing cycles
                // inside this transaction so other sessions continue to see their original status.
                $closed = DB::table('assessment_cycles')->whereBetween('assessment_month', [
                    self::START, $start->addMonths(9)->toDateString(),
                ])->where('status', 'closed')->orderBy('assessment_month')->lockForUpdate()->get();
                DB::table('assessment_cycles')->whereIn('id', $closed->pluck('id'))->update(['status' => 'open']);
            }
            $roster = Carbon::withTestNow($start, fn () => $this->roster($organization, $scopes, $master, $password, $catalog));
            $hc = $roster['hc'];

            for ($index = 0; $index < 11; $index++) {
                $month = $start->addMonths($index);
                $november = $index === 10;
                $cycle = DB::table('assessment_cycles')->where('assessment_month', $month->toDateString())->lockForUpdate()->first();
                $created = $cycle === null;
                if ($created) {
                    $cycle = Carbon::withTestNow($month, function () use ($hc, $master, $month, $november, $realNow) {
                        $opens = $november ? $realNow->subDay() : $month;
                        $cycle = $master->cycle($hc, null, [
                            'assessment_month' => $month->toDateString(),
                            'opens_at' => $opens->toIso8601String(),
                            'submission_due_at' => $opens->addDays(14)->toIso8601String(),
                            'approval_due_at' => $opens->addDays(20)->toIso8601String(),
                            'closes_at' => $opens->addDays(23)->toIso8601String(),
                            'status' => 'planned',
                            'categories' => [
                                ['code' => 'poor', 'label' => 'Kurang', 'lower_bound' => 0, 'upper_bound' => 70],
                                ['code' => 'fair', 'label' => 'Cukup', 'lower_bound' => 70, 'upper_bound' => 80],
                                ['code' => 'good', 'label' => 'Baik', 'lower_bound' => 80, 'upper_bound' => 90],
                                ['code' => 'excellent', 'label' => 'Sangat Baik', 'lower_bound' => 90, 'upper_bound' => null],
                            ],
                        ]);
                        // Periode simulasi memuat penilaian dari unit yang sudah disiapkan di roster.
                        DB::table('assessment_cycles')->where('id', $cycle['id'])->update(['status' => 'open']);

                        return DB::table('assessment_cycles')->where('id', $cycle['id'])->first();
                    });
                }
                if ($cycle->status !== 'open') {
                    continue;
                }

                $opens = CarbonImmutable::parse($cycle->opens_at, 'UTC');
                $deadline = CarbonImmutable::parse($cycle->submission_due_at, 'UTC');
                $at = $november && $realNow->betweenIncluded($opens, $deadline) ? $realNow : $opens->addHour()->min($deadline);
                Carbon::withTestNow($at, function () use ($roster, $assessments, $cycle, $index, $november) {
                    $this->simulateMonth($assessments, $roster['teams'], $cycle->id, $index, $november);
                });
                if ($created && ! $november) {
                    Carbon::withTestNow(CarbonImmutable::parse($cycle->closes_at, 'UTC'), fn () => $master->close($hc, $cycle->id));
                }
            }
            foreach ($closed as $cycle) {
                DB::table('assessment_cycles')->where('id', $cycle->id)->update([
                    'status' => $cycle->status,
                    'updated_at' => $cycle->updated_at,
                ]);
            }

            if (! $isolated) {
                File::ensureDirectoryExists(dirname($path));
                File::replace($path, json_encode([
                    'password' => $password,
                    'accounts' => $roster['accounts'],
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            }
        });

        $this->command?->info('Simulasi Januari–November 2026 siap. Kredensial: '.$path);
    }

    protected function catalog(): array
    {
        return [];
    }

    protected function staffName(string $number, int $index): string
    {
        return 'Staf Simulasi '.$number;
    }

    protected function monthlyStaff(array $staff, int $month, bool $november): array
    {
        return array_slice($staff, 0, $november ? 10 : 3);
    }

    private function roster(OrganizationService $organization, ScopeResolver $scopes, KpiMasterService $master, string $password, array $catalog): array
    {
        $accounts = [];
        $prefix = static::PREFIX;
        $login = static::LOGIN;
        $admin = $this->account($accounts, 'hc.'.$login, 'Super HC Simulasi'.($catalog === [] ? '' : ' Rumah Sakit'), 'super_hc', $prefix.'-HC', $password);
        if ($admin->wasRecentlyCreated) {
            DB::table('scope_assignments')->insert([
                'user_id' => $admin->id,
                'role_key' => 'super_hc',
                'assigned_by' => $admin->id,
                'assigned_at' => now(),
            ]);
        }
        $hc = $scopes->resolve($admin);
        $positions = [];
        $teams = [];

        for ($divisionNumber = 1; $divisionNumber <= 12; $divisionNumber++) {
            $code = sprintf('%02d', $divisionNumber);
            $divisionData = $catalog[$divisionNumber - 1] ?? [];
            $divisionName = $divisionData['name'] ?? 'Divisi Simulasi '.$code;
            $kd = $this->account($accounts, 'kd.'.$login.$code, isset($divisionData['name']) ? 'Kepala Divisi '.$divisionName : 'Kepala Divisi Simulasi '.$code, 'kepala_divisi', $prefix.'-KD-'.$code, $password);
            $divisionCode = $prefix.'-D-'.$code;
            $division = DB::table('divisions')->where('code', $divisionCode)->value('id')
                ?? $organization->save($hc, 'divisions', null, [
                    'code' => $divisionCode, 'name' => $divisionName, 'head_user_id' => $kd->id,
                ])['id'];
            $reviewer = $scopes->resolve($kd);
            if ($reviewer->divisionId !== (int) $division) {
                throw new RuntimeException('Penugasan simulasi berubah pada '.$divisionCode);
            }
            $this->template($master, $hc, 'division', $division, $divisionData);

            $unitCount = isset($divisionData['units']) ? count($divisionData['units']) : ($divisionNumber === 1 ? 6 : 3);
            for ($unitNumber = 1; $unitNumber <= $unitCount; $unitNumber++) {
                $unitCode = sprintf('%s%02d', $code, $unitNumber);
                $unitData = $divisionData['units'][$unitNumber - 1] ?? [];
                $unitName = $unitData['name'] ?? 'Unit Simulasi '.$unitCode;
                $ku = $this->account($accounts, 'ku.'.$login.$unitCode, isset($unitData['name']) ? 'Kepala Unit '.$unitName : 'Kepala Unit Simulasi '.$unitCode, 'kepala_unit', $prefix.'-KU-'.$unitCode, $password);
                $areaCode = $prefix.'-U-'.$unitCode;
                $unit = DB::table('units')->where('code', $areaCode)->value('id')
                    ?? $organization->save($hc, 'units', null, [
                        'code' => $areaCode, 'name' => $unitName, 'division_id' => $division, 'head_user_id' => $ku->id,
                    ])['id'];
                $scorer = $scopes->resolve($ku);
                if ($scorer->unitId !== (int) $unit || $scorer->divisionId !== $reviewer->divisionId) {
                    throw new RuntimeException('Penugasan simulasi berubah pada '.$areaCode);
                }
                $this->template($master, $hc, 'unit', $unit, $unitData);

                $staff = [];
                $jobs = [];
                foreach ($unitData['jobs'] ?? ['Staf Simulasi'] as $index => $job) {
                    $positionCode = $unitData === [] ? $prefix.'-STAFF' : sprintf('%s-P-%s-%02d', $prefix, $unitCode, $index + 1);
                    $jobs[] = $positions[$job] ??= DB::table('positions')->where('code', $positionCode)->value('id')
                        ?? $organization->save($hc, 'positions', null, ['code' => $positionCode, 'name' => $job])['id'];
                }
                for ($person = 1; $person <= 12; $person++) {
                    $number = sprintf('%s-%02d', $unitCode, $person);
                    $nip = $prefix.'-E-'.$number;
                    $staff[] = DB::table('employees')->where('nip', $nip)->value('id')
                        ?? $organization->save($hc, 'employees', null, [
                            'nip' => $nip, 'full_name' => $this->staffName($number, count($teams) * 12 + $person - 1),
                            'position_id' => $jobs[($person - 1) % count($jobs)],
                            'unit_id' => $unit, 'effective_from' => self::START,
                        ])['id'];
                }
                $teams[] = ['scorer' => $scorer, 'reviewer' => $reviewer, 'staff' => $staff, 'leaveHeadUnscored' => $unitNumber === $unitCount];
            }
        }

        return compact('hc', 'teams', 'accounts');
    }

    private function account(array &$accounts, string $login, string $name, string $role, string $nip, string $password): User
    {
        $email = $login.'@kpi.test';
        $account = User::where('email', $email)->first();
        if ($account && ($account->login_nip !== $nip || $account->role_key !== $role)) {
            throw new RuntimeException('Identitas simulasi bertabrakan: '.$email);
        }
        if (! $account) {
            $account = User::create(['name' => $name, 'email' => $email, 'login_nip' => $nip, 'role_key' => $role, 'password' => $password]);
            DB::table('user_roles')->insert(['user_id' => $account->id, 'role_key' => $role]);
        }
        $accounts[$email] = ['name' => $name, 'role' => $role, 'nip' => $nip];

        return $account;
    }

    private function template(KpiMasterService $master, AccessContext $hc, string $level, int $area, array $definition): void
    {
        if (! DB::table('kpi_templates')->where('scope_level', $level)->where('scope_key', $area)->exists()) {
            $master->template($hc, null, [
                'scope_level' => $level,
                $level === 'unit' ? 'unit_id' : 'division_id' => $area,
                'name' => 'KPI '.($definition['name'] ?? ('Simulasi '.($level === 'unit' ? 'Unit' : 'Divisi'))),
                'effective_from' => self::START,
                'items' => $definition['items'] ?? LocalDemoSeeder::indicators(),
            ]);
        }
    }

    private function simulateMonth(AssessmentService $service, array $teams, int $cycle, int $monthIndex, bool $november): void
    {
        $existing = DB::table('assessments')->where('cycle_id', $cycle)->get(['employee_id', 'subject_user_id']);
        $staffDone = array_fill_keys($existing->pluck('employee_id')->filter()->all(), true);
        $headsDone = array_fill_keys($existing->pluck('subject_user_id')->filter()->all(), true);
        foreach ($teams as $index => $team) {
            $ku = $team['scorer'];
            $kd = $team['reviewer'];
            foreach ($this->monthlyStaff($team['staff'], $monthIndex, $november) as $person => $employee) {
                if (isset($staffDone[$employee])) {
                    continue;
                }
                $payload = $this->scores($service, $ku, ['cycle_id' => $cycle, 'employee_id' => $employee], $index, $person, $monthIndex);
                $saved = $service->store($ku, $payload);
                if ($november && $person === 1) {
                    continue;
                }
                if ($november && in_array($person, [0, 2], true)) {
                    $saved = $service->change($kd, $saved['id'], 'return', [
                        'lock_version' => $saved['lock_version'],
                        'reason' => 'Simulasi revisi. Lengkapi bukti pencapaian indikator.',
                    ]);
                    if ($person === 0) {
                        continue;
                    }
                    $payload['positive_finding'] = 'Simulasi pengajuan ulang. Bukti indikator sudah dilengkapi.';
                    $saved = $service->change($ku, $saved['id'], 'resubmit', $payload + ['lock_version' => $saved['lock_version']]);
                }
                $service->change($kd, $saved['id'], 'approve', ['lock_version' => $saved['lock_version']]);
            }
            if (! isset($headsDone[$ku->userId]) && (! $november || ! $team['leaveHeadUnscored'])) {
                $payload = $this->scores($service, $kd, ['cycle_id' => $cycle, 'subject_user_id' => $ku->userId], $index, 0, $monthIndex);
                $service->store($kd, $payload);
            }
        }
    }

    private function scores(AssessmentService $service, AccessContext $scorer, array $payload, int $unit, int $person, int $month): array
    {
        $items = $service->form($scorer, $payload)['template']['items'];
        $base = 60 + (($unit * 3 + $person * 11 + $month * 7) % 39);
        $payload['scores'] = [];
        foreach ($items as $index => $item) {
            $payload['scores'][] = ['source_kpi_item_id' => $item['id'], 'score' => min(100, $base + $index % 4)];
        }
        [$payload['positive_finding'], $payload['negative_finding']] = $this->findings($items, $base);

        return $payload;
    }

    protected function findings(array $items, int $base): array
    {
        return [
            'Simulasi. Pencapaian layanan tercatat dalam laporan bulanan.',
            $base < 80 ? 'Simulasi. Perbaiki ketepatan waktu dan dokumentasi layanan.' : null,
        ];
    }
}
