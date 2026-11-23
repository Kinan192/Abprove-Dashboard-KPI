<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Services\IdentityAccess\AccessContext;
use App\Support\TabularUpload;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Mass creation of staff (employees without login accounts) from a CSV/XLSX sheet. Positions and units are
 * referenced by their unique codes. Every row is checked again under row locks at commit; one invalid row
 * rejects the whole file and existing staff, placements and history are never modified.
 */
class EmployeeImport
{
    /** Template header, in order. Matched case-insensitively; column order in uploads may differ. */
    public const COLUMNS = ['nip', 'nama_lengkap', 'kode_jabatan', 'kode_unit', 'bulan_efektif'];

    public const MAX_ROWS = PlacementService::MAX_BATCH;

    private const FIELDS = ['nip' => 'nip', 'nama_lengkap' => 'full_name', 'kode_jabatan' => 'position_code', 'kode_unit' => 'unit_code', 'bulan_efektif' => 'effective_month'];

    public function __construct(
        private OrganizationService $organization,
        private OrganizationRules $rules,
        private TabularUpload $reader,
    ) {}

    /** Uploaded sheet as rows keyed by the template fields, each with its 1-based source line. */
    public function read(UploadedFile $file): array
    {
        ['header' => $header, 'rows' => $rows] = $this->reader->rows($file, self::MAX_ROWS);
        $header = array_map(fn ($h) => mb_strtolower(trim((string) $h)), $header);
        $missing = array_diff(self::COLUMNS, $header);
        $unknown = array_diff($header, self::COLUMNS);
        if ($missing || $unknown || count($header) !== count(array_unique($header))) {
            throw new BusinessRule('IMPORT_HEADERS', 'Kolom harus tepat: '.implode(', ', self::COLUMNS).'. Gunakan template.', 422);
        }
        $items = [];
        foreach ($rows as $line => $cells) {
            $row = ['line' => (int) $line];
            foreach ($header as $i => $column) {
                $row[self::FIELDS[$column]] = trim((string) ($cells[$i] ?? ''));
            }
            $items[] = $row;
        }

        return $items;
    }

    /** Per-row result with resolved references and every blocker, without writing anything. */
    public function preview(array $rows): array
    {
        $checked = $this->check($rows, false);
        $blocked = count(array_filter($checked, fn ($r) => $r['errors']));

        return [
            'columns' => self::COLUMNS,
            'rows' => $checked,
            'min_effective_month' => substr($this->rules->earliestPlacementMonth(), 0, 7),
            'summary' => ['total' => count($checked), 'ready' => count($checked) - $blocked, 'blocked' => $blocked],
            'valid' => $checked && ! $blocked,
        ];
    }

    /** Creates every row as active staff with its first placement in one transaction (the caller's MutationRunner). */
    public function import(AccessContext $ctx, array $data): array
    {
        abort_unless($ctx->role === 'super_hc', 403);
        $checked = $this->check($data['rows'], true);
        $failed = array_filter($checked, fn ($r) => $r['errors']);
        if ($failed) {
            throw ValidationException::withMessages(collect($failed)->mapWithKeys(fn ($r) => [
                'rows.'.$r['line'] => array_map(fn ($m) => "Baris {$r['line']}: {$m}", $r['errors']),
            ])->all());
        }
        $batch = ['import_id' => $data['request_id'], 'import_size' => count($checked)];
        $created = [];
        foreach ($checked as $row) {
            $values = [
                'nip' => $row['nip'], 'full_name' => $row['full_name'], 'position_id' => $row['position_id'], 'is_active' => true,
                'unit_id' => $row['unit_id'], 'effective_from' => $row['effective_month'].'-01',
            ];
            try {
                $employee = $this->organization->save($ctx, 'employees', null, $values, $batch);
            } catch (BusinessRule $e) {
                throw new BusinessRule($e->errorCode, "Baris {$row['line']} ({$row['nip']}): {$e->getMessage()} Tidak ada staf yang diimpor.", $e->httpStatus);
            } catch (ValidationException $e) {
                throw ValidationException::withMessages(['rows.'.$row['line'] => ["Baris {$row['line']}: ".implode(' ', Arr::flatten($e->errors())).' Tidak ada staf yang diimpor.']]);
            }
            $created[] = ['id' => $employee['id'], 'line' => $row['line'], 'nip' => $employee['nip'], 'full_name' => $employee['full_name']];
        }

        return ['imported' => count($created), 'import_id' => $data['request_id'], 'employees' => $created];
    }

    /**
     * Normalizes and validates rows. With $lock the referenced masters, colliding NIPs and accounts are read
     * with FOR UPDATE so a concurrent import or edit cannot slip between the check and the insert.
     */
    private function check(array $rows, bool $lock): array
    {
        $rows = collect($rows)->map(fn ($r) => [
            'line' => (int) $r['line'],
            'nip' => trim((string) ($r['nip'] ?? '')), 'full_name' => preg_replace('/\s+/u', ' ', trim((string) ($r['full_name'] ?? ''))),
            'position_code' => trim((string) ($r['position_code'] ?? '')), 'unit_code' => trim((string) ($r['unit_code'] ?? '')),
            'effective_month' => trim((string) ($r['effective_month'] ?? '')),
        ])->sortBy('line')->values();
        $key = fn (string $value) => mb_strtolower($value);
        $nips = $rows->pluck('nip')->filter()->unique()->values();
        $positions = DB::table('positions')->whereIn('code', $rows->pluck('position_code')->filter()->unique()->values())
            ->when($lock, fn ($q) => $q->lockForUpdate())->get(['id', 'code', 'name', 'is_active'])->keyBy(fn ($p) => $key($p->code));
        $units = DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')->whereIn('u.code', $rows->pluck('unit_code')->filter()->unique()->values())
            ->when($lock, fn ($q) => $q->lockForUpdate())
            ->get(['u.id', 'u.code', 'u.name', 'u.is_active', 'u.division_id', 'd.name as division_name', 'd.is_active as division_active'])->keyBy(fn ($u) => $key($u->code));
        $employees = DB::table('employees')->whereIn('nip', $nips)->when($lock, fn ($q) => $q->lockForUpdate())->get(['nip', 'full_name'])->keyBy(fn ($e) => $key($e->nip));
        $accounts = DB::table('users')->whereIn('login_nip', $nips)->when($lock, fn ($q) => $q->lockForUpdate())->get(['login_nip', 'name'])->keyBy(fn ($u) => $key($u->login_nip));
        $closed = DB::table('assessment_cycles')->where('status', 'closed')->pluck('assessment_month')->map(fn ($m) => substr($m, 0, 7))->flip();
        $earliest = substr($this->rules->earliestPlacementMonth(), 0, 7);
        $default = substr($this->rules->month(), 0, 7);
        $lines = $rows->filter(fn ($r) => $r['nip'] !== '')->groupBy(fn ($r) => $key($r['nip']))->map(fn ($group) => $group->pluck('line')->all());

        return $rows->map(function ($r) use ($key, $positions, $units, $employees, $accounts, $closed, $earliest, $default, $lines) {
            $errors = [];
            $nip = $r['nip'];
            if ($nip === '') {
                $errors[] = 'NIP wajib diisi.';
            } elseif (mb_strlen($nip) > 64 || ! preg_match('/^[^\s\p{C}]+$/u', $nip)) {
                $errors[] = 'NIP maksimal 64 karakter tanpa spasi.';
            } elseif (preg_match('/^\d+(?:[.,]\d+)?E\+?\d+$/i', $nip)) {
                $errors[] = 'NIP terbaca sebagai angka Excel. Format kolom NIP sebagai Teks lalu isi ulang.';
            } else {
                $others = array_values(array_diff($lines[$key($nip)], [$r['line']]));
                if ($others) {
                    $errors[] = 'NIP ganda dengan baris '.implode(', ', $others).'.';
                }
                if ($existing = $employees[$key($nip)] ?? null) {
                    $errors[] = "NIP sudah terdaftar atas {$existing->full_name}. Data staf lama tidak diubah.";
                }
                if ($account = $accounts[$key($nip)] ?? null) {
                    $errors[] = "NIP dipakai akun login {$account->name}. Impor hanya untuk staf tanpa akun.";
                }
            }
            if ($r['full_name'] === '') {
                $errors[] = 'Nama lengkap wajib diisi.';
            } elseif (mb_strlen($r['full_name']) > 160) {
                $errors[] = 'Nama lengkap maksimal 160 karakter.';
            }
            $position = $r['position_code'] === '' ? null : ($positions[$key($r['position_code'])] ?? null);
            if ($r['position_code'] === '') {
                $errors[] = 'Kode jabatan wajib diisi.';
            } elseif (! $position) {
                $errors[] = "Kode jabatan {$r['position_code']} tidak ditemukan.";
            } elseif (! $position->is_active) {
                $errors[] = "Jabatan {$position->name} tidak aktif.";
            }
            $unit = $r['unit_code'] === '' ? null : ($units[$key($r['unit_code'])] ?? null);
            if ($r['unit_code'] === '') {
                $errors[] = 'Kode unit wajib diisi.';
            } elseif (! $unit) {
                $errors[] = "Kode unit {$r['unit_code']} tidak ditemukan.";
            } elseif (! $unit->is_active || ! $unit->division_active) {
                $errors[] = "Unit {$unit->name} atau divisinya tidak aktif.";
            }
            $month = $r['effective_month'] === '' ? $default : $this->month($r['effective_month']);
            if ($month === null) {
                $errors[] = 'Bulan efektif harus TTTT-BB.';
            } elseif ($month < $earliest) {
                $errors[] = 'Bulan efektif paling awal '.$this->label($earliest).'.';
            } elseif (isset($closed[$month])) {
                $errors[] = 'Periode '.$this->label($month).' sudah ditutup.';
            }

            return array_merge($r, [
                'effective_month' => $month ?? $r['effective_month'],
                'position_id' => $position?->id, 'position_name' => $position?->name,
                'unit_id' => $unit?->id, 'unit_name' => $unit?->name, 'division_name' => $unit?->division_name,
                'errors' => $errors,
            ]);
        })->all();
    }

    /** "YYYY-MM", or a first-of-month date as typed or stored by spreadsheets; anything else is rejected. */
    private function month(string $value): ?string
    {
        if (preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/D', $value, $m)) {
            return "{$m[1]}-{$m[2]}";
        }
        $date = TabularUpload::date($value);

        return $date !== null && str_ends_with($date, '-01') && $date >= '2000-01-01' && $date <= '2099-12-01' ? substr($date, 0, 7) : null;
    }

    private function label(string $month): string
    {
        return CarbonImmutable::parse($month.'-01')->locale('id')->translatedFormat('F Y');
    }
}
