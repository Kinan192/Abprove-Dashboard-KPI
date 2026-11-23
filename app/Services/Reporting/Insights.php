<?php

namespace App\Services\Reporting;

use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Report summary of one cycle. Filters, counts and indicator averages run in SQL. */
class Insights
{
    private const STATUSES = ['not_started', 'submitted', 'returned', 'final'];

    public function __construct(private ScopedRecords $records) {}

    public function forCycle(AccessContext $ctx, int $cycleId, array $filters = []): array
    {
        $cycle = DB::table('assessment_cycles')->select('id', 'assessment_month')->where('id', $cycleId)->first() ?? abort(404);
        $template = isset($filters['template_id']) ? DB::table('kpi_templates')->select('id', 'scope_level', 'scope_key')->where('id', $filters['template_id'])->first() : null;
        $assessments = $this->assessments($ctx, $cycle->id, $filters);

        // Status per unit and division: assessed subjects plus roster subjects without an assessment.
        $groups = ['unit' => [], 'division' => []];
        $counts = array_fill_keys(self::STATUSES, 0);
        $add = function (string $level, $id, string $name, string $status, int $count) use (&$groups) {
            $groups[$level][$id] ??= ['id' => (string) $id, 'name' => $name, 'total' => 0] + array_fill_keys(self::STATUSES, 0);
            $groups[$level][$id]['total'] += $count;
            $groups[$level][$id][$status] += $count;
        };
        $assessed = (clone $assessments)->selectRaw('unit_id, division_id, MIN(unit_name_snapshot) as unit_name, MIN(division_name_snapshot) as division_name, status, COUNT(*) as total')
            ->groupBy('unit_id', 'division_id', 'status')->get();
        foreach ([false, true] as $head) {
            if (($filters['kind'] ?? null) === ($head ? 'member' : 'unit_head')) {
                continue;
            }
            $roster = $this->notStarted($ctx, $cycle, $head, $filters, $template)
                ->select(DB::raw('u.id as unit_id, d.id as division_id, MIN(u.name) as unit_name, MIN(d.name) as division_name, COUNT(*) as total'))->groupBy('u.id', 'd.id')->get();
            foreach ($roster as $row) {
                $add('unit', $row->unit_id, $row->unit_name, 'not_started', $row->total);
                $add('division', $row->division_id, $row->division_name, 'not_started', $row->total);
                $counts['not_started'] += $row->total;
            }
        }
        foreach ($assessed as $row) {
            $add('unit', $row->unit_id, $row->unit_name, $row->status, $row->total);
            $add('division', $row->division_id, $row->division_name, $row->status, $row->total);
            $counts[$row->status] += $row->total;
        }

        $final = (clone $assessments)->where('status', 'final')->select('id', 'assessment_kind', 'employee_id', 'subject_user_id', 'kpi_template_id', 'template_name_snapshot',
            'employee_name_snapshot', 'unit_name_snapshot', 'division_name_snapshot', 'total_score_raw', 'category_label_snapshot', 'positive_finding', 'negative_finding')->orderBy('id')->get();
        $person = fn ($a) => $a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id;
        $scores = $final->map(fn ($a) => ['assessment_id' => $a->id, 'personId' => $person($a), 'kind' => $a->assessment_kind, 'name' => $a->employee_name_snapshot,
            'unit_name' => $a->unit_name_snapshot, 'division_name' => $a->division_name_snapshot, 'total' => $a->total_score_raw, 'category' => $a->category_label_snapshot, 'template_id' => $a->kpi_template_id]);
        $rankings = $final->groupBy(fn ($a) => $a->assessment_kind.':'.$a->kpi_template_id)->map(fn (Collection $group) => [
            'template_id' => $group->first()->kpi_template_id, 'name' => $group->first()->template_name_snapshot, 'kind' => $group->first()->assessment_kind,
            'area' => $group->first()->assessment_kind === 'member' ? $group->first()->unit_name_snapshot : $group->first()->division_name_snapshot,
            'rows' => $group->sortBy([fn ($a, $b) => bccomp($b->total_score_raw, $a->total_score_raw, 6), fn ($a, $b) => strcmp($a->employee_name_snapshot, $b->employee_name_snapshot)])
                ->map(fn ($a) => ['personId' => $person($a), 'name' => $a->employee_name_snapshot, 'unit_name' => $a->unit_name_snapshot, 'total' => $a->total_score_raw, 'category' => $a->category_label_snapshot])->values()->all(),
        ])->values();
        $findings = $final->filter(fn ($a) => ($a->positive_finding ?? '') !== '' || ($a->negative_finding ?? '') !== '')
            ->map(fn ($a) => ['personId' => $person($a), 'name' => $a->employee_name_snapshot, 'unit_name' => $a->unit_name_snapshot, 'positive' => $a->positive_finding ?? '', 'negative' => $a->negative_finding ?? ''])->values();
        $sum = $final->reduce(fn ($n, $a) => bcadd($n, $a->total_score_raw, 6), '0');

        return ['cycle_id' => $cycle->id, 'month' => substr($cycle->assessment_month, 0, 7),
            'metrics' => ['total' => array_sum($counts), 'final' => $counts['final'], 'submitted' => $counts['submitted'], 'returned' => $counts['returned'], 'not_started' => $counts['not_started'],
                'average' => $final->isEmpty() ? null : bcdiv($sum, (string) $final->count(), 6)],
            'item_averages' => $this->itemAverages($final->pluck('id')), 'unit_status' => $this->sorted($groups['unit']), 'division_progress' => $this->sorted($groups['division']),
            'rankings' => $rankings, 'scores' => $scores->values(), 'findings' => $findings];
    }

    private function assessments(AccessContext $ctx, int $cycleId, array $filters): Builder
    {
        return $this->records->assessments($ctx)->toBase()->where('cycle_id', $cycleId)
            ->when(isset($filters['unit_id']), fn ($q) => $q->where('unit_id', $filters['unit_id']))
            ->when(isset($filters['division_id']), fn ($q) => $q->where('division_id', $filters['division_id']))
            ->when(isset($filters['kind']), fn ($q) => $q->where('assessment_kind', $filters['kind']))
            ->when(isset($filters['template_id']), fn ($q) => $q->where('kpi_template_id', $filters['template_id']))
            ->when(isset($filters['search']), fn ($q) => $q->where(fn ($q) => $q->where('employee_name_snapshot', 'like', '%'.$filters['search'].'%')->orWhere('nip_snapshot', 'like', '%'.$filters['search'].'%')));
    }

    /** Roster subjects of the month without an assessment in the actor scope, filtered like assessments. */
    private function notStarted(AccessContext $ctx, object $cycle, bool $head, array $filters, ?object $template): Builder
    {
        $q = $this->records->members($ctx, $head, substr($cycle->assessment_month, 0, 10))
            ->whereNotExists($this->records->assessments($ctx)->toBase()->selectRaw('1')->where('cycle_id', $cycle->id)
                ->where('assessment_kind', $head ? 'unit_head' : 'member')->whereColumn($head ? 'assessments.subject_user_id' : 'assessments.employee_id', 'e.id'))
            ->when(isset($filters['unit_id']), fn ($q) => $q->where('u.id', $filters['unit_id']))
            ->when(isset($filters['division_id']), fn ($q) => $q->where('d.id', $filters['division_id']))
            ->when(isset($filters['search']), fn ($q) => $q->where(fn ($q) => $q->where($head ? 'e.name' : 'e.full_name', 'like', '%'.$filters['search'].'%')
                ->orWhere($head ? 'e.login_nip' : 'e.nip', 'like', '%'.$filters['search'].'%')));
        if (isset($filters['template_id'])) {
            // Unassessed subjects match a template filter through the area the template covers.
            $level = $head ? 'division' : 'unit';
            $template?->scope_level === $level ? $q->where($head ? 'd.id' : 'u.id', $template->scope_key) : $q->whereRaw('1 = 0');
        }

        return $q;
    }

    /** Mean raw score per indicator of Final assessments; sums are exact DECIMAL, divided with BCMath as before. */
    private function itemAverages(Collection $finalIds): Collection
    {
        if ($finalIds->isEmpty()) {
            return collect();
        }

        return DB::table('assessment_items as i')->join('assessments as a', 'a.id', '=', 'i.assessment_id')->whereIn('i.assessment_id', $finalIds)
            ->groupBy('a.assessment_kind', 'a.kpi_template_id', 'i.source_kpi_item_id')
            ->selectRaw("a.kpi_template_id as template_id, MIN(a.template_name_snapshot) as template_name, a.assessment_kind as kind,
                MIN(IF(a.assessment_kind = 'member', a.unit_name_snapshot, a.division_name_snapshot)) as area, i.source_kpi_item_id as item_id,
                MIN(i.pillar_snapshot) as pillar, MIN(i.kpi_name_snapshot) as name, MIN(i.weight_percent_snapshot) as weight,
                SUM(COALESCE(i.reviewed_score, i.computed_score, i.score)) as total, COUNT(*) as count, MIN(i.sort_order) as position")
            ->orderBy('a.assessment_kind')->orderBy('a.kpi_template_id')->orderBy('position')->get()
            ->map(function ($g) {
                $average = bcdiv((string) $g->total, (string) $g->count, 6);

                return ['template_id' => $g->template_id, 'template_name' => $g->template_name, 'kind' => $g->kind, 'area' => $g->area, 'item_id' => $g->item_id, 'pillar' => $g->pillar,
                    'name' => $g->name, 'weight' => $g->weight, 'count' => $g->count, 'average' => $average, 'weighted_average' => bcdiv(bcmul($average, (string) $g->weight, 10), '100', 6)];
            });
    }

    private function sorted(array $groups): Collection
    {
        return collect($groups)->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();
    }
}
