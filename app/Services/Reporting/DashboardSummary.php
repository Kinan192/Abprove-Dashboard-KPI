<?php

namespace App\Services\Reporting;

use App\Queries\ScopedRecords;
use App\Services\Audit\ActorSnapshot;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Compact dashboard for one assessment month in the caller's scope.
 * Every figure is aggregated in SQL; the roster of the month counts people without an assessment as "not_started".
 * Kepala Unit gets no progress or task list: its staff work lives on the Isi nilai and Anggota Unit pages.
 */
class DashboardSummary
{
    public const STATUSES = ['not_started', 'submitted', 'returned', 'final'];

    private const TASK_LIMIT = 6;

    private const INDICATOR_LIMIT = 5;

    private const ACTIVITY_LIMIT = 5;

    /** Histogram bin width in score points; 100 / width bins cover 0..100. Narrow bins show spread within a category. */
    private const HISTOGRAM_WIDTH = 2;

    public function __construct(private ScopedRecords $records) {}

    public function build(AccessContext $ctx, ?string $month): array
    {
        $month ??= now('Asia/Jakarta')->format('Y-m');
        $columns = ['id', 'assessment_month', 'status', 'opens_at', 'submission_due_at', 'approval_due_at', 'closes_at'];
        $cycle = DB::table('assessment_cycles')->where('assessment_month', $month.'-01')->first($columns)
            ?? DB::table('assessment_cycles')->orderByDesc('assessment_month')->first($columns);
        if (! $cycle) {
            return ['month' => $month, 'cycle' => null];
        }
        $kinds = $ctx->role === 'kepala_unit' ? ['member'] : ['member', 'unit_head'];
        $groups = $this->statusGroups($ctx, $cycle, $kinds);
        $counts = $this->counts($groups);
        $average = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')->avg('total_score_raw');
        $summary = [
            'month' => substr($cycle->assessment_month, 0, 7),
            'cycle' => $this->cycle($cycle),
            'metrics' => $counts + [
                'average' => $this->decimal($average),
                'completion' => $counts['total'] ? round($counts['final'] * 100 / $counts['total'], 1) : null,
                'kinds' => collect($kinds)->mapWithKeys(fn ($kind) => [$kind => $this->counts($groups->where('kind', $kind))])->all(),
            ],
            'categories' => $this->categories($ctx, $cycle),
            'histogram' => $this->histogram($ctx, $cycle, $counts['final']),
            'indicators' => $this->indicators($ctx, $cycle),
        ];
        if ($ctx->role === 'super_hc') {
            $summary['progress'] = $this->divisionProgress($groups);
            $summary['tasks'] = $this->divisionTasks($summary['progress']['rows']);
            $summary['activities'] = $this->activities();
        } elseif ($ctx->role === 'kepala_divisi') {
            $summary['progress'] = $this->unitProgress($groups);
            $summary['tasks'] = $this->divisionHeadTasks($ctx, $cycle, $groups);
        }

        return $summary;
    }

    private function scoped(AccessContext $ctx): Builder
    {
        return $this->records->assessments($ctx)->toBase();
    }

    /** Roster members of the cycle month that have no assessment row yet. */
    private function missing(AccessContext $ctx, string $kind, object $cycle): Builder
    {
        $head = $kind === 'unit_head';

        return $this->records->members($ctx, $head, $cycle->assessment_month)
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('assessments as a')
                ->whereColumn($head ? 'a.subject_user_id' : 'a.employee_id', 'e.id')->where('a.cycle_id', $cycle->id));
    }

    private function statusGroups(AccessContext $ctx, object $cycle, array $kinds): Collection
    {
        $rows = $this->scoped($ctx)->where('cycle_id', $cycle->id)
            ->selectRaw('division_id, unit_id, assessment_kind as kind, status, COUNT(*) as total')
            ->groupBy('division_id', 'unit_id', 'assessment_kind', 'status')->get();
        foreach ($kinds as $kind) {
            $rows = $rows->concat($this->missing($ctx, $kind, $cycle)
                ->select('d.id as division_id', 'u.id as unit_id')
                ->selectRaw("? as kind, 'not_started' as status, COUNT(*) as total", [$kind])
                ->groupBy('d.id', 'u.id')->get());
        }

        return $rows;
    }

    private function counts(Collection $rows): array
    {
        $counts = array_fill_keys(self::STATUSES, 0);
        foreach ($rows as $row) {
            $counts[$row->status] += (int) $row->total;
        }

        return ['total' => array_sum($counts)] + $counts;
    }

    private function cycle(object $cycle): array
    {
        $at = fn (string $value) => CarbonImmutable::parse($value, 'UTC')->toIso8601ZuluString();

        return ['id' => $cycle->id, 'month' => substr($cycle->assessment_month, 0, 7), 'status' => $cycle->status, 'schedule' => [
            ['key' => 'opens', 'label' => 'Mulai pengisian', 'at' => $at($cycle->opens_at)],
            ['key' => 'submission', 'label' => 'Batas pengajuan Kepala Unit', 'at' => $at($cycle->submission_due_at)],
            ['key' => 'approval', 'label' => 'Batas persetujuan & nilai Kepala Unit', 'at' => $at($cycle->approval_due_at)],
            ['key' => 'closes', 'label' => 'Penutupan periode', 'at' => $at($cycle->closes_at)],
        ]];
    }

    private function categories(AccessContext $ctx, object $cycle): array
    {
        return $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')
            ->selectRaw('category_code_snapshot as code, category_label_snapshot as label, MIN(category_lower_snapshot) as lower_bound, COUNT(*) as total, AVG(total_score_raw) as average')
            ->groupBy('category_code_snapshot', 'category_label_snapshot')->orderByDesc('lower_bound')->get()
            ->map(fn ($row) => ['code' => $row->code, 'label' => $row->label, 'total' => (int) $row->total, 'average' => $this->decimal($row->average)])->all();
    }

    /**
     * Final results per HISTOGRAM_WIDTH-point range of the raw total score, one grouped SQL query in the caller's scope.
     * Lower bound inclusive, upper exclusive; the last bin also includes 100. BETWEEN drops NULL and
     * out-of-range scores, which are reported as `excluded` (Final results not binned), never guessed.
     */
    private function histogram(AccessContext $ctx, object $cycle, int $finalCount): array
    {
        $width = self::HISTOGRAM_WIDTH;
        $last = intdiv(100, $width) - 1;
        // The integer cast avoids decimal-string group keys such as "44.000000".
        $counts = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')
            ->whereBetween('total_score_raw', [0, 100])
            ->selectRaw('CAST(LEAST(FLOOR(total_score_raw / ?), ?) AS UNSIGNED) as bucket, COUNT(*) as total', [$width, $last])
            ->groupBy('bucket')->pluck('total', 'bucket');
        $bins = [];
        for ($bin = 0; $bin <= $last; $bin++) {
            $bins[] = ['lower' => $bin * $width, 'upper' => ($bin + 1) * $width, 'count' => (int) ($counts[$bin] ?? 0)];
        }
        $total = array_sum(array_column($bins, 'count'));

        return ['bin_width' => $width, 'total' => $total, 'excluded' => max(0, $finalCount - $total), 'bins' => $bins];
    }

    /** Final indicator scores grouped by snapshot name, so identical KPIs across individual templates merge. */
    private function indicators(AccessContext $ctx, object $cycle): array
    {
        $final = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')->select('id', 'unit_id');
        $rank = fn (string $direction) => DB::table('assessment_items as i')->joinSub($final, 'a', 'a.id', '=', 'i.assessment_id')
            ->selectRaw('i.kpi_name_snapshot as name, MIN(i.pillar_snapshot) as pillar, AVG(COALESCE(i.reviewed_score, i.computed_score, i.score)) as average, COUNT(*) as total, COUNT(DISTINCT a.unit_id) as units')
            ->groupBy('i.kpi_name_snapshot')->orderBy('average', $direction)->orderBy('name')->limit(self::INDICATOR_LIMIT)->get()
            ->map(fn ($row) => ['name' => $row->name, 'pillar' => $row->pillar, 'average' => $this->decimal($row->average), 'total' => (int) $row->total, 'units' => (int) $row->units])->all();

        return ['lowest' => $rank('asc'), 'highest' => $rank('desc')];
    }

    private function divisionProgress(Collection $groups): array
    {
        $divisions = DB::table('divisions')->whereIn('id', $groups->pluck('division_id')->unique())->pluck('name', 'id');
        $units = DB::table('units')->whereIn('id', $groups->pluck('unit_id')->unique())->pluck('name', 'id');
        $rows = $groups->groupBy('division_id')->map(fn ($rows, $id) => $this->areaRow($id, $divisions[$id] ?? '-', $rows) + [
            'units' => $this->sortAreas($rows->groupBy('unit_id')->map(fn ($rows, $id) => $this->areaRow($id, $units[$id] ?? '-', $rows))),
        ]);

        return ['level' => 'division', 'rows' => $this->sortAreas($rows)];
    }

    private function unitProgress(Collection $groups): array
    {
        $units = DB::table('units')->whereIn('id', $groups->pluck('unit_id')->unique())->pluck('name', 'id');

        return ['level' => 'unit', 'rows' => $this->sortAreas($groups->groupBy('unit_id')->map(fn ($rows, $id) => $this->areaRow($id, $units[$id] ?? '-', $rows)))];
    }

    private function areaRow(int|string $id, string $name, Collection $rows): array
    {
        return ['id' => (string) $id, 'name' => $name] + $this->counts($rows);
    }

    /** Least complete areas first so attention lands where work remains. */
    private function sortAreas(Collection $rows): array
    {
        return $rows->sort(fn ($a, $b) => [$a['final'] / max(1, $a['total']), $a['name']] <=> [$b['final'] / max(1, $b['total']), $b['name']])->values()->all();
    }

    private function task(string $title, string $detail, ?string $status, string $page, array $params, string $action, ?string $at = null): array
    {
        return compact('title', 'detail', 'status', 'page', 'params', 'action', 'at');
    }

    /** Division head: unit heads awaiting a direct score, then the oldest staff submissions. */
    private function divisionHeadTasks(AccessContext $ctx, object $cycle, Collection $groups): array
    {
        $heads = $this->missing($ctx, 'unit_head', $cycle)->select('e.id', 'e.name as name', 'u.name as unit_name')
            ->orderBy('u.name')->limit(self::TASK_LIMIT)->get()
            ->map(fn ($row) => $this->task($row->name, 'Kepala '.$row->unit_name, 'not_started', 'nilai-kepala', ['person' => 'HEAD-'.$row->id], 'Nilai'));
        $submitted = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('assessment_kind', 'member')->where('status', 'submitted')
            ->orderBy('submitted_at')->limit(self::TASK_LIMIT)
            ->get(['employee_id', 'employee_name_snapshot as name', 'unit_name_snapshot as unit_name', 'submitted_at'])
            ->map(fn ($row) => $this->task($row->name, $row->unit_name, 'submitted', 'persetujuan', ['person' => 'EMP-'.$row->employee_id], 'Tinjau',
                CarbonImmutable::parse($row->submitted_at, 'UTC')->toIso8601ZuluString()));
        $total = $groups->where('kind', 'unit_head')->where('status', 'not_started')->sum('total')
            + $groups->where('kind', 'member')->where('status', 'submitted')->sum('total');

        return ['total' => (int) $total, 'rows' => $heads->concat($submitted)->take(self::TASK_LIMIT)->values()->all()];
    }

    /** Super HC: divisions with the most unfinished assessments. */
    private function divisionTasks(array $divisions): array
    {
        $open = collect($divisions)->filter(fn ($row) => $row['total'] > $row['final'])->sortByDesc(fn ($row) => $row['total'] - $row['final'])->values();

        return ['total' => $open->count(), 'rows' => $open->take(self::TASK_LIMIT)->map(fn ($row) => $this->task(
            $row['name'],
            sprintf('%d belum diisi · %d diajukan · %d dikembalikan', $row['not_started'], $row['submitted'], $row['returned']),
            null, 'rekap', ['division' => $row['id'], 'status' => 'all'], 'Pantau',
        ))->all()];
    }

    private function activities(): array
    {
        $document = 'COALESCE(a.after_data, a.before_data)';
        $summary = implode(', ', array_map(fn ($field) => "NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT($document, '$.$field')), 'null'), '')", ['full_name', 'employee_name_snapshot', 'name', 'assessment_month']));

        return DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->whereNotIn('a.action', ['login', 'notifications.read'])->orderByDesc('a.id')->limit(self::ACTIVITY_LIMIT)
            ->get(['a.id', 'a.action', 'a.recorded_at', 'a.reason', 'a.subject_type', 'a.subject_id', DB::raw(ActorSnapshot::AUDIT_NAME_SQL.' as actor_name'), DB::raw("COALESCE($summary) as summary")])
            ->map(fn ($event) => ['id' => (string) $event->id, 'at' => CarbonImmutable::parse($event->recorded_at, 'UTC')->toIso8601ZuluString(), 'who' => $event->actor_name ?? 'Sistem',
                'action' => $event->action, 'detail' => $event->reason ?? $event->subject_type.' #'.$event->subject_id, 'summary' => $event->summary])->all();
    }

    private function decimal(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
