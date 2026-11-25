<?php

namespace App\Services\Assessment;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Effective deadlines of one cycle: the schedule, pushed later by every approved extension covering the area.
 *  - submission (Kepala Unit, per unit): submission_due_at, unit extensions (due_at), organisation-wide (due_at)
 *  - approval (Kepala Divisi, per division and unit): approval_due_at, division extensions (due_at), the unit's
 *    extension window (approval_due_at) and organisation-wide (approval_due_at)
 * A returned assessment may be resubmitted until the later of both, so a late return never leaves it stuck.
 */
class DeadlinePolicy
{
    /** @var array<int, Collection> approved rows per cycle, memoised per request */
    private array $approved = [];

    public function submission(object $cycle, ?int $unitId): CarbonImmutable
    {
        $rows = $this->rows($cycle->id);
        $dates = [$cycle->submission_due_at];
        foreach ($rows as $row) {
            if ($row->role_key === 'all' || ($row->role_key === 'kepala_unit' && (int) $row->unit_id === $unitId)) {
                $dates[] = $row->due_at;
            }
        }

        return $this->latest($dates);
    }

    public function approval(object $cycle, ?int $divisionId, ?int $unitId = null): CarbonImmutable
    {
        $dates = [$cycle->approval_due_at];
        foreach ($this->rows($cycle->id) as $row) {
            $dates[] = match (true) {
                $row->role_key === 'all' => $row->approval_due_at,
                $row->role_key === 'kepala_divisi' && (int) $row->division_id === $divisionId => $row->due_at,
                $row->role_key === 'kepala_unit' && $unitId !== null && (int) $row->unit_id === $unitId => $row->approval_due_at,
                default => null,
            };
        }

        return $this->latest($dates);
    }

    /** Latest approval date of a division head over every unit of the division (generic page checks). */
    public function divisionApproval(object $cycle, int $divisionId): CarbonImmutable
    {
        $dates = [$this->approval($cycle, $divisionId)];
        foreach ($this->rows($cycle->id) as $row) {
            if ($row->role_key === 'kepala_unit' && (int) $row->division_id === $divisionId) {
                $dates[] = $row->approval_due_at;
            }
        }

        return $this->latest($dates);
    }

    /**
     * Deadline of an action: Kepala Unit submits until its submission date (resubmits until the later of
     * submission and approval); Kepala Divisi acts until the approval date of the assessment's unit.
     */
    public function forAction(object $cycle, string $role, ?int $divisionId, ?int $unitId, ?string $action = null): CarbonImmutable
    {
        if ($role === 'kepala_unit') {
            $submission = $this->submission($cycle, $unitId);

            return $action === 'resubmit' ? $this->latest([$submission, $this->approval($cycle, $divisionId, $unitId)]) : $submission;
        }

        return $this->approval($cycle, $divisionId, $unitId);
    }

    /** Latest date any approved extension of the cycle reaches (period cannot close before it). */
    public function lastExtension(int $cycleId): ?CarbonImmutable
    {
        $dates = $this->rows($cycleId)->flatMap(fn ($row) => [$row->due_at, $row->approval_due_at])->filter();

        return $dates->isEmpty() ? null : $this->latest($dates->all());
    }

    public function forget(): void
    {
        $this->approved = [];
    }

    private function rows(int $cycleId): Collection
    {
        return $this->approved[$cycleId] ??= DB::table('deadline_extensions')->where('cycle_id', $cycleId)->where('status', 'approved')
            ->get(['role_key', 'division_id', 'unit_id', 'due_at', 'approval_due_at']);
    }

    private function latest(array $dates): CarbonImmutable
    {
        return collect($dates)->filter()->map(fn ($d) => $d instanceof \DateTimeInterface ? CarbonImmutable::instance($d)->utc() : CarbonImmutable::parse($d, 'UTC'))
            ->sortDesc()->first();
    }
}
