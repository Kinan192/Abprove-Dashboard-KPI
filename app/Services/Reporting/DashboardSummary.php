<?php

namespace App\Services\Reporting;

use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Compact dashboard for one assessment month in the caller's scope.
 * Every figure is aggregated in SQL; the roster of the month counts people without an assessment as "not_started".
 */
class DashboardSummary
{
    public const STATUSES = ['not_started', 'submitted', 'returned', 'final'];

    private const TREND_MONTHS = 12;

    private const TASK_LIMIT = 6;

    private const INDICATOR_LIMIT = 5;

    private const ACTIVITY_LIMIT = 5;

    public function __construct(private ScopedRecords $records) {}

    public function build(AccessContext $ctx, ?string $month): array
    {
        $month ??= now('Asia/Jakarta')->format('Y-m');
        $cycles = DB::table('assessment_cycles')->orderBy('assessment_month')
            ->get(['id', 'assessment_month', 'status', 'opens_at', 'submission_due_at', 'approval_due_at', 'closes_at']);
        $cycle = $cycles->firstWhere('assessment_month', $month.'-01') ?? $cycles->last();
        if (! $cycle) {
            return ['month' => $month, 'cycle' => null];
        }
        $kinds = $ctx->role === 'kepala_unit' ? ['member'] : ['member', 'unit_head'];
        $groups = $this->statusGroups($ctx, $cycle, $kinds);
        $trend = $this->trend($ctx, $cycles, $cycle, $kinds);
        $current = $trend[array_key_last($trend)];
        $previous = $trend[array_key_last($trend) - 1];
        $progress = match ($ctx->role) {
            'super_hc' => $this->divisionProgress($groups),
            'kepala_divisi' => $this->unitProgress($groups),
            default => $this->staffProgress($ctx, $cycle),
        };
        $indicators = $this->indicators($ctx, $cycle);
        $summary = [
            'month' => substr($cycle->assessment_month, 0, 7),
            'cycle' => $this->cycle($cycle),
            'metrics' => $this->counts($groups) + [
                'average' => $current['average'],
                'completion' => $current['completion'],
                'kinds' => collect($kinds)->mapWithKeys(fn ($kind) => [$kind => $this->counts($groups->where('kind', $kind))])->all(),
                'previous' => $previous['scheduled'] ? $previous : null,
            ],
            'trend' => $trend,
            'categories' => $this->categories($ctx, $cycle),
            'indicators' => $indicators,
            'progress' => $progress,
            'performance' => $this->performance($ctx, $cycle, $progress, $indicators),
            'tasks' => match ($ctx->role) {
                'super_hc' => $this->divisionTasks($progress['rows']),
                'kepala_divisi' => $this->divisionHeadTasks($ctx, $cycle, $groups),
                default => $this->unitTasks($progress['rows']),
            },
        ];
        if ($ctx->role === 'super_hc') {
            $summary['activities'] = $this->activities();
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

    /** Rolling twelve months ending at the selected cycle: Final average and completion against each month's roster. */
    private function trend(AccessContext $ctx, Collection $cycles, object $cycle, array $kinds): array
    {
        $end = CarbonImmutable::parse($cycle->assessment_month);
        $months = array_map(fn ($i) => $end->subMonths($i)->format('Y-m-d'), range(self::TREND_MONTHS - 1, 0));
        $window = $cycles->whereIn('assessment_month', $months)->keyBy('assessment_month');
        $assessed = $this->scoped($ctx)->whereIn('cycle_id', $window->pluck('id'))
            ->selectRaw("cycle_id, COUNT(*) as assessed, SUM(status = 'final') as final, AVG(CASE WHEN status = 'final' THEN total_score_raw END) as average")
            ->groupBy('cycle_id')->get()->keyBy('cycle_id');
        $missing = $this->missingTotals($ctx, $window, $kinds);

        return array_map(function ($month) use ($window, $assessed, $missing) {
            $cycle = $window->get($month);
            $row = $cycle ? $assessed->get($cycle->id) : null;
            $final = (int) ($row->final ?? 0);
            $total = $cycle ? (int) ($row->assessed ?? 0) + ($missing[$cycle->id] ?? 0) : 0;

            return ['month' => substr($month, 0, 7), 'scheduled' => $cycle !== null, 'average' => $this->decimal($row->average ?? null),
                'final' => $final, 'total' => $total, 'completion' => $total ? round($final * 100 / $total, 1) : null];
        }, $months);
    }

    /** One UNION ALL round trip for the unassessed roster of every cycle in the window. */
    private function missingTotals(AccessContext $ctx, Collection $window, array $kinds): array
    {
        $union = null;
        foreach ($window as $cycle) {
            foreach ($kinds as $kind) {
                $part = $this->missing($ctx, $kind, $cycle)->select([])->selectRaw('? as cycle_id, COUNT(*) as total', [$cycle->id]);
                $union = $union ? $union->unionAll($part) : $part;
            }
        }
        $totals = [];
        foreach ($union?->get() ?? [] as $row) {
            $totals[(int) $row->cycle_id] = ($totals[(int) $row->cycle_id] ?? 0) + (int) $row->total;
        }

        return $totals;
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

    /** Final indicator scores grouped by snapshot name, so identical KPIs across individual templates merge. */
    private function indicators(AccessContext $ctx, object $cycle): array
    {
        $final = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')->select('id', 'unit_id');
        $rank = fn (string $direction) => DB::table('assessment_items as i')->joinSub($final, 'a', 'a.id', '=', 'i.assessment_id')
            ->selectRaw('i.kpi_name_snapshot as name, MIN(i.pillar_snapshot) as pillar, AVG(COALESCE(i.computed_score, i.score)) as average, COUNT(*) as total, COUNT(DISTINCT a.unit_id) as units')
            ->groupBy('i.kpi_name_snapshot')->orderBy('average', $direction)->orderBy('name')->limit(self::INDICATOR_LIMIT)->get()
            ->map(fn ($row) => ['name' => $row->name, 'pillar' => $row->pillar, 'average' => $this->decimal($row->average), 'total' => (int) $row->total, 'units' => (int) $row->units])->all();

        return ['lowest' => $rank('asc'), 'highest' => $rank('desc')];
    }

    /**
     * Final average per comparison row: divisions (Super HC), units (Kepala Divisi), or the lowest KPIs (Kepala Unit).
     * Areas come from the progress roster, so an area without any Final keeps a null average and a zero count.
     */
    private function performance(AccessContext $ctx, object $cycle, array $progress, array $indicators): array
    {
        if ($progress['level'] === 'person') {
            return ['level' => 'indicator', 'rows' => array_map(fn ($row) => ['id' => $row['name'], 'name' => $row['name'],
                'average' => $row['average'], 'total' => $row['total']], $indicators['lowest'])];
        }
        $column = $progress['level'] === 'division' ? 'division_id' : 'unit_id';
        $final = $this->scoped($ctx)->where('cycle_id', $cycle->id)->where('status', 'final')
            ->selectRaw("$column as area_id, AVG(total_score_raw) as average, COUNT(*) as total")
            ->groupBy($column)->get()->keyBy('area_id');
        $rows = collect($progress['rows'])->map(fn ($row) => ['id' => $row['id'], 'name' => $row['name'],
            'average' => $this->decimal($final->get($row['id'])->average ?? null), 'total' => (int) ($final->get($row['id'])->total ?? 0)]);

        return ['level' => $progress['level'], 'rows' => $rows
            ->sort(fn ($a, $b) => [$a['average'] === null, $a['average'], $a['name']] <=> [$b['average'] === null, $b['average'], $b['name']])
            ->values()->all()];
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

    private function staffProgress(AccessContext $ctx, object $cycle): array
    {
        $assessed = $this->scoped($ctx)->where('cycle_id', $cycle->id)
            ->get(['employee_id', 'employee_name_snapshot as name', 'position_name_snapshot as position', 'status', 'total_score_raw as score', 'category_label_snapshot as category'])
            ->map(fn ($row) => ['person' => 'EMP-'.$row->employee_id, 'name' => $row->name, 'position' => $row->position, 'status' => $row->status,
                'score' => $row->status === 'final' ? $this->decimal($row->score) : null, 'category' => $row->status === 'final' ? $row->category : null]);
        $missing = $this->missing($ctx, 'member', $cycle)->select('e.id', 'e.full_name as name', 'j.name as position')->get()
            ->map(fn ($row) => ['person' => 'EMP-'.$row->id, 'name' => $row->name, 'position' => $row->position, 'status' => 'not_started', 'score' => null, 'category' => null]);
        $order = array_flip(['returned', 'not_started', 'submitted', 'final']);

        return ['level' => 'person', 'rows' => $assessed->concat($missing)
            ->sort(fn ($a, $b) => [$order[$a['status']], $a['name']] <=> [$order[$b['status']], $b['name']])->values()->all()];
    }

    private function task(string $title, string $detail, ?string $status, string $page, array $params, string $action, ?string $at = null): array
    {
        return compact('title', 'detail', 'status', 'page', 'params', 'action', 'at');
    }

    /** Unit head: returned work first, then staff not yet scored. */
    private function unitTasks(array $staff): array
    {
        $open = array_values(array_filter($staff, fn ($row) => in_array($row['status'], ['returned', 'not_started'], true)));

        return ['total' => count($open), 'rows' => array_map(fn ($row) => $this->task($row['name'], $row['position'], $row['status'], 'nilai', ['person' => $row['person']],
            $row['status'] === 'returned' ? 'Perbaiki' : 'Isi nilai'), array_slice($open, 0, self::TASK_LIMIT))];
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
            ->get(['a.id', 'a.action', 'a.recorded_at', 'a.reason', 'a.subject_type', 'a.subject_id', 'u.name as actor_name', DB::raw("COALESCE($summary) as summary")])
            ->map(fn ($event) => ['id' => (string) $event->id, 'at' => CarbonImmutable::parse($event->recorded_at, 'UTC')->toIso8601ZuluString(), 'who' => $event->actor_name ?? 'Sistem',
                'action' => $event->action, 'detail' => $event->reason ?? $event->subject_type.' #'.$event->subject_id, 'summary' => $event->summary])->all();
    }

    private function decimal(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
