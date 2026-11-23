<?php

namespace App\Services\Reporting;

use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Generator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Assessment export over one month, a calendar quarter, a semester or a year.
 *
 * Rows are the assessment snapshots of every cycle in the range, always inside the actor scope.
 * A division or unit outside that scope is refused instead of being silently narrowed. KPI item
 * rows are streamed: definitions are listed once and each item row points at one of them.
 */
class PeriodExport
{
    /** Parts per year of each period type. */
    public const PERIODS = ['month' => 12, 'quarter' => 4, 'semester' => 2, 'year' => 1];

    private const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    private const ROMAN = ['I', 'II', 'III', 'IV'];

    private const STATUSES = ['final', 'submitted', 'returned', 'not_started'];

    /**
     * Final rows recorded before the finalizer name was frozen: the current account name carries the same suffix the
     * activity logs use (ActorSnapshot::AUDIT_NAME_SQL), and a missing account is reported as unrecorded.
     */
    private const LEGACY_NAME = ' (catatan lama · nama saat ini)';

    private const FINALIZER_UNKNOWN = 'Tidak tercatat (data lama)';

    public function __construct(private ScopedRecords $records) {}

    public function build(AccessContext $ctx, array $f): array
    {
        $period = $this->period($f['period'], (int) $f['year'], (int) ($f['index'] ?? 1));
        $scope = $this->scope($ctx, $f);
        $finalOnly = ($f['status'] ?? 'final') === 'final';
        $kind = $f['kind'] ?? null;
        $cycles = DB::table('assessment_cycles')->select('id', 'assessment_month', 'status')
            ->whereBetween('assessment_month', [$period['months'][0].'-01', end($period['months']).'-01'])
            ->orderBy('assessment_month')->get()->keyBy(fn ($c) => substr($c->assessment_month, 0, 7));
        $monthOf = $cycles->mapWithKeys(fn ($c, $month) => [$c->id => $month]);

        $base = $this->records->assessments($ctx)->toBase()->whereIn('cycle_id', $cycles->pluck('id'))
            ->when($finalOnly, fn ($q) => $q->where('status', 'final'))
            ->when($scope['division'], fn ($q, $d) => $q->where('division_id', $d['id']))
            ->when($scope['unit'], fn ($q, $u) => $q->where('unit_id', $u['id']))
            ->when($kind, fn ($q, $k) => $q->where('assessment_kind', $k));

        $assessed = $cycles->isEmpty() ? collect() : (clone $base)->select('id', 'cycle_id', 'assessment_kind', 'employee_id', 'subject_user_id', 'nip_snapshot', 'employee_name_snapshot',
            'position_name_snapshot', 'division_name_snapshot', 'unit_name_snapshot', 'template_name_snapshot', 'template_version_snapshot', 'status', 'total_score_raw',
            'category_label_snapshot', 'positive_finding', 'negative_finding', 'return_reason', 'submitted_at', 'finalized_at', 'finalized_by', 'finalized_by_name_snapshot')->get();
        // Final rows from before the finalizer name was frozen show the current account name, labelled as such.
        $legacy = DB::table('users')->whereIn('id', $assessed->whereNull('finalized_by_name_snapshot')->pluck('finalized_by')->filter()->unique())->pluck('name', 'id');
        $finalizer = fn ($a) => $a->status !== 'final' ? null : ($a->finalized_by_name_snapshot
            ?? (isset($legacy[$a->finalized_by]) ? $legacy[$a->finalized_by].self::LEGACY_NAME : self::FINALIZER_UNKNOWN));
        $time = fn (?string $utc) => $utc ? CarbonImmutable::parse($utc, 'UTC')->setTimezone('Asia/Jakarta')->format('Y-m-d H:i') : null;

        $rows = $assessed->map(fn ($a) => [
            'assessment_id' => (int) $a->id, 'month' => $monthOf[$a->cycle_id], 'kind' => $a->assessment_kind,
            'subject' => $a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id,
            'nip' => $a->nip_snapshot, 'name' => $a->employee_name_snapshot, 'position' => $a->position_name_snapshot,
            'division' => $a->division_name_snapshot, 'unit' => $a->unit_name_snapshot,
            'template' => $a->template_name_snapshot, 'template_version' => (int) $a->template_version_snapshot,
            'status' => $a->status, 'total' => (float) $a->total_score_raw, 'total_raw' => $a->total_score_raw, 'category' => $a->category_label_snapshot,
            'submitted_at' => $time($a->submitted_at), 'finalized_at' => $time($a->finalized_at),
            'finalized_by' => $finalizer($a),
            'positive' => $a->positive_finding, 'negative' => $a->negative_finding, 'return_reason' => $a->status === 'returned' ? $a->return_reason : null,
        ])->all();
        if (! $finalOnly) {
            array_push($rows, ...$this->notStarted($ctx, $cycles, $scope, $kind));
        }
        usort($rows, fn ($a, $b) => [$a['month'], $a['division'], $a['unit'], $a['kind'] === 'member' ? 1 : 0, $a['name']]
            <=> [$b['month'], $b['division'], $b['unit'], $b['kind'] === 'member' ? 1 : 0, $b['name']]);

        $summary = $this->summary($rows, $period['months'], $cycles);
        foreach ($rows as &$row) {
            unset($row['total_raw']);
        }
        unset($row);

        // Items stream before definitions: definitions are collected while items are read, then sent.
        $result = ['period' => $period, 'scope' => $scope + ['kind' => $kind, 'status' => $finalOnly ? 'final' : 'all'],
            'generated_at' => now('Asia/Jakarta')->format('Y-m-d H:i'), 'summary' => $summary, 'rows' => $rows,
            'items' => [], 'definitions' => []];
        if (($f['include_items'] ?? false) && $assessed->isNotEmpty()) {
            $definitions = [];
            $result['items'] = $this->items($base, $definitions);
            $result['definitions'] = (function () use (&$definitions) {
                yield from $definitions;
            })();
        }

        return $result;
    }

    /** Month list, file key and Indonesian label of the requested period. */
    private function period(string $type, int $year, int $index): array
    {
        $size = 12 / self::PERIODS[$type];
        $index = $type === 'year' ? 1 : $index;
        $first = ($index - 1) * $size + 1;
        $last = $first + $size - 1;
        $span = $size === 1 ? self::MONTHS[$first - 1].' '.$year : self::MONTHS[$first - 1].'–'.self::MONTHS[$last - 1].' '.$year;

        return [
            'type' => $type, 'year' => $year, 'index' => $type === 'year' ? null : $index,
            'key' => match ($type) {
                'month' => sprintf('%d-%02d', $year, $index), 'quarter' => $year.'-TW'.$index, 'semester' => $year.'-S'.$index, 'year' => (string) $year,
            },
            'label' => match ($type) {
                'month' => $span, 'quarter' => 'Triwulan '.self::ROMAN[$index - 1].' '.$year, 'semester' => 'Semester '.$index.' '.$year, 'year' => 'Tahun '.$year,
            },
            'span' => $span,
            'months' => array_map(fn ($m) => sprintf('%d-%02d', $year, $m), range($first, $last)),
        ];
    }

    /**
     * Requested division and unit, checked against the actor scope. Kepala Divisi stays in the own
     * division and Kepala Unit in the own unit whatever the client sends.
     */
    private function scope(AccessContext $ctx, array $f): array
    {
        $unit = null;
        if (isset($f['unit_id'])) {
            $unit = $this->records->units($ctx)->select('id', 'name', 'division_id')->where('id', $f['unit_id'])->first()
                ?? abort(403, 'Unit berada di luar cakupan akun Anda.');
        }
        $divisionId = isset($f['division_id']) ? (int) $f['division_id'] : null;
        if ($divisionId !== null && $ctx->role !== 'super_hc' && $divisionId !== $ctx->divisionId) {
            abort(403, 'Divisi berada di luar cakupan akun Anda.');
        }
        if ($unit && $divisionId !== null && (int) $unit->division_id !== $divisionId) {
            throw ValidationException::withMessages(['unit_id' => 'Unit tidak termasuk divisi yang dipilih.']);
        }
        if (! $unit && $ctx->role === 'kepala_unit') {
            $unit = $this->records->units($ctx)->select('id', 'name', 'division_id')->first();
        }
        $divisionId ??= $unit ? (int) $unit->division_id : ($ctx->role === 'super_hc' ? null : $ctx->divisionId);
        $division = $divisionId ? DB::table('divisions')->select('id', 'name')->where('id', $divisionId)->first() : null;

        return [
            'role' => $ctx->role,
            'division' => $division ? ['id' => (int) $division->id, 'name' => $division->name] : null,
            'unit' => $unit ? ['id' => (int) $unit->id, 'name' => $unit->name] : null,
        ];
    }

    /** Roster subjects of each opened cycle without an assessment in the actor scope. Planned cycles add none. */
    private function notStarted(AccessContext $ctx, Collection $cycles, array $scope, ?string $kind): array
    {
        $rows = [];
        foreach ($cycles as $month => $cycle) {
            if ($cycle->status === 'planned') {
                continue;
            }
            foreach (['member', 'unit_head'] as $subjectKind) {
                if ($kind !== null && $kind !== $subjectKind) {
                    continue;
                }
                $head = $subjectKind === 'unit_head';
                $people = $this->records->members($ctx, $head, $month.'-01')
                    ->whereNotExists($this->records->assessments($ctx)->toBase()->selectRaw('1')->where('cycle_id', $cycle->id)
                        ->where('assessment_kind', $subjectKind)->whereColumn($head ? 'assessments.subject_user_id' : 'assessments.employee_id', 'e.id'))
                    ->when($scope['division'], fn ($q, $d) => $q->where('d.id', $d['id']))
                    ->when($scope['unit'], fn ($q, $u) => $q->where('u.id', $u['id']))
                    ->get();
                foreach ($people as $p) {
                    $rows[] = ['assessment_id' => null, 'month' => $month, 'kind' => $subjectKind, 'subject' => ($head ? 'HEAD-' : 'EMP-').$p->id,
                        'nip' => $p->nip, 'name' => $p->full_name, 'position' => $p->position_name, 'division' => $p->division_name, 'unit' => $p->unit_name,
                        'template' => null, 'template_version' => null, 'status' => 'not_started', 'total' => null, 'total_raw' => null, 'category' => null,
                        'submitted_at' => null, 'finalized_at' => null, 'finalized_by' => null, 'positive' => null, 'negative' => null, 'return_reason' => null];
                }
            }
        }

        return $rows;
    }

    /** Status counts overall and per month; averages use Final rows only, exact with BCMath. */
    private function summary(array $rows, array $months, Collection $cycles): array
    {
        $blank = array_fill_keys(self::STATUSES, 0) + ['sum' => '0'];
        $total = $blank;
        $perMonth = array_fill_keys($months, $blank);
        $add = function (array &$bucket, array $row) {
            $bucket[$row['status']]++;
            if ($row['status'] === 'final') {
                $bucket['sum'] = bcadd($bucket['sum'], $row['total_raw'], 6);
            }
        };
        foreach ($rows as $row) {
            $add($total, $row);
            $add($perMonth[$row['month']], $row);
        }
        $shape = fn (array $b) => array_intersect_key($b, array_flip(self::STATUSES))
            + ['total' => $b['final'] + $b['submitted'] + $b['returned'] + $b['not_started'], 'average' => $b['final'] ? (float) bcdiv($b['sum'], (string) $b['final'], 6) : null];

        return $shape($total) + ['months' => array_map(fn ($month) => ['month' => $month, 'cycle_status' => $cycles->get($month)?->status] + $shape($perMonth[$month]), $months)];
    }

    /**
     * Item rows `[assessment_id, sort_order, definition, score, weighted]`, read in id chunks so a year never sits
     * in memory. Each distinct `[pillar, name, target, weight]` snapshot is appended to `$definitions` once.
     */
    private function items(Builder $assessments, array &$definitions): Generator
    {
        $index = [];
        $q = DB::table('assessment_items')->whereIn('assessment_id', (clone $assessments)->select('id'))
            ->select('id', 'assessment_id', 'sort_order', 'pillar_snapshot', 'kpi_name_snapshot', 'target_snapshot', 'weight_percent_snapshot', 'weighted_result_raw')
            ->selectRaw('COALESCE(reviewed_score, computed_score, score) as value');
        foreach ($q->lazyById(2000) as $i) {
            $key = json_encode([$i->pillar_snapshot, $i->kpi_name_snapshot, $i->target_snapshot, $i->weight_percent_snapshot]);
            if (! isset($index[$key])) {
                $index[$key] = count($definitions);
                $definitions[] = [$i->pillar_snapshot, $i->kpi_name_snapshot, $i->target_snapshot, (float) $i->weight_percent_snapshot];
            }
            yield [(int) $i->assessment_id, (int) $i->sort_order, $index[$key],
                $i->value === null ? null : (float) $i->value, $i->weighted_result_raw === null ? null : (float) $i->weighted_result_raw];
        }
    }
}
