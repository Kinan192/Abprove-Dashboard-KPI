<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Shared invariants for structure, head assignment and placement changes. */
class OrganizationRules
{
    public const AREAS = [
        'units' => ['column' => 'unit_id', 'role' => 'kepala_unit', 'label' => 'Unit'],
        'divisions' => ['column' => 'division_id', 'role' => 'kepala_divisi', 'label' => 'Divisi'],
    ];

    /** Current calendar month in WIB, as the first day of the month. */
    public function month(): string
    {
        return now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
    }

    /** Earliest month a placement may start: the current month or the oldest open cycle. */
    public function earliestPlacementMonth(): string
    {
        $open = DB::table('assessment_cycles')->where('status', 'open')->min('assessment_month');

        return $open !== null && $open < $this->month() ? substr($open, 0, 10) : $this->month();
    }

    public function active(string $table, int $id): object
    {
        $row = DB::table($table)->where('id', $id)->lockForUpdate()->first();
        if (! $row) {
            throw new BusinessRule('NOT_FOUND', 'Data tidak ditemukan. Muat ulang halaman.', 404);
        }
        if (! $row->is_active) {
            throw new BusinessRule('MASTER_INACTIVE', ($row->name ?? $row->full_name ?? 'Data induk').' tidak aktif.', 422);
        }

        return $row;
    }

    /** Non-Final assessments in the current/future months (or open cycles) or from a given month. */
    public function pending(Builder $q, ?string $from = null): Builder
    {
        return $q->where('status', '!=', 'final')->whereIn('cycle_id', DB::table('assessment_cycles')
            ->where(fn ($q) => $q->where('assessment_month', '>=', $from ?? $this->month())->when($from === null, fn ($q) => $q->orWhere('status', 'open')))
            ->select('id'));
    }

    public function noPending(Builder $q, ?string $from = null): void
    {
        if ($count = $this->pending($q, $from)->count()) {
            throw new BusinessRule('ACTIVE_ASSESSMENTS', "Selesaikan {$count} penilaian non-Final pada rentang perubahan.");
        }
    }
}
