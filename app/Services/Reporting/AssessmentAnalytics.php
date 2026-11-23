<?php

namespace App\Services\Reporting;

use App\Models\AssessmentCycle;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;

/** Analytics of Final assessments in the actor's scope: 12-month trend, per-template groups and a month-to-month comparison. */
class AssessmentAnalytics
{
    public function __construct(private ScopedRecords $records) {}

    /**
     * @param  array{cycle_id: int, unit_id?: int, division_id?: int, kind?: string, template_id?: int, search?: string, matrix_page?: int}  $filters
     */
    public function summary(AccessContext $ctx, array $filters): array
    {
        $cycle = AssessmentCycle::findOrFail($filters['cycle_id']);
        $month = CarbonImmutable::parse($cycle->assessment_month);
        $year = [$month->subMonths(11)->format('Y-m-d'), $month->format('Y-m-d')];
        $final = $this->finalAssessments($ctx, $filters);

        $periods = (clone $final)->whereBetween('c.assessment_month', $year)
            ->selectRaw('c.assessment_month as month,AVG(total_score_raw) as average,COUNT(*) as count')
            ->groupBy('c.assessment_month')->get()->keyBy('month');
        $trend = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = $month->subMonths($i)->format('Y-m-d');
            $period = $periods->get($key);
            $trend[] = ['month' => $key, 'average' => $period ? bcadd($period->average, '0', 6) : null, 'count' => $period ? $period->count : 0];
        }

        $current = (clone $final)->where('assessments.cycle_id', $cycle->id);
        $matrix = (clone $final)->whereBetween('c.assessment_month', $year)
            ->select('assessments.id', 'assessment_kind', 'employee_id', 'subject_user_id', 'employee_name_snapshot', 'unit_name_snapshot', 'total_score_raw', 'c.assessment_month')
            ->orderBy('employee_name_snapshot')->orderBy('c.assessment_month')
            ->paginate(25, ['*'], 'matrix_page');

        return [
            'trend' => $trend,
            'groups' => $this->groups($current),
            'matrix' => $matrix,
            'final_count' => (clone $current)->count(),
            'average' => (clone $current)->avg('total_score_raw'),
            'categories' => (clone $current)
                ->selectRaw('category_code_snapshot as code,category_label_snapshot as label,COUNT(*) as count')
                ->groupBy('category_code_snapshot', 'category_label_snapshot')->get(),
        ];
    }

    /**
     * Previous month's Final scores of the same person for the KPIs that are unchanged (same pillar, name,
     * measurement, target and weight); the previous total only when every KPI is comparable.
     */
    public function comparison(AccessContext $ctx, int $assessment): array
    {
        $current = $this->records->assessments($ctx)->whereKey($assessment)->with('items', 'cycle')->firstOrFail();
        $month = CarbonImmutable::parse($current->cycle->assessment_month)->subMonth()->format('Y-m-d');
        $head = $current->assessment_kind === 'unit_head';
        $previous = $this->records->assessments($ctx)
            ->where($head ? 'subject_user_id' : 'employee_id', $head ? $current->subject_user_id : $current->employee_id)
            ->where('assessment_kind', $current->assessment_kind)->where('status', 'final')
            ->whereHas('cycle', fn ($q) => $q->where('assessment_month', $month))
            ->with('items')->first();
        $signature = fn ($item) => json_encode([$item->pillar_snapshot, $item->kpi_name_snapshot, $item->numerator_snapshot, $item->denominator_snapshot,
            $item->formula_snapshot, $item->target_snapshot, $item->weight_percent_snapshot]);
        $old = $previous ? $previous->items->keyBy($signature) : collect();
        $items = [];
        foreach ($current->items as $item) {
            if ($match = $old->get($signature($item))) {
                $items[] = ['source_kpi_item_id' => $item->source_kpi_item_id, 'score' => $match->effectiveScore(), 'previous_result' => $match->weighted_result_raw];
            }
        }
        $complete = count($items) === $current->items->count();

        return [
            'available' => count($items) > 0,
            'fully_comparable' => $complete,
            'month' => $month,
            'items' => $items,
            'total' => $previous && $complete ? $previous->total_score_raw : null,
        ];
    }

    /** Final assessments of the scope joined with their cycle, narrowed by the analytics filters. */
    private function finalAssessments(AccessContext $ctx, array $filters)
    {
        $query = $this->records->assessments($ctx)->join('assessment_cycles as c', 'c.id', '=', 'assessments.cycle_id')->where('assessments.status', 'final');
        foreach (['unit_id', 'division_id'] as $key) {
            if (isset($filters[$key])) {
                $query->where('assessments.'.$key, $filters[$key]);
            }
        }
        if (isset($filters['kind'])) {
            $query->where('assessment_kind', $filters['kind']);
        }
        if (isset($filters['template_id'])) {
            $query->where('kpi_template_id', $filters['template_id']);
        }
        if (isset($filters['search'])) {
            $query->where('employee_name_snapshot', 'like', '%'.$filters['search'].'%');
        }

        return $query;
    }

    /** Count and average per template and kind, each with its ranking (one query for every group). */
    private function groups($current)
    {
        $groups = (clone $current)
            ->selectRaw('kpi_template_id,template_name_snapshot,assessment_kind,COUNT(*) as count,AVG(total_score_raw) as average')
            ->groupBy('kpi_template_id', 'template_name_snapshot', 'assessment_kind')->get();
        $rankings = (clone $current)->toBase()
            ->orderBy('kpi_template_id')->orderBy('assessment_kind')->orderByDesc('total_score_raw')->orderBy('assessments.id')
            ->get(['assessments.id', 'kpi_template_id', 'assessment_kind', 'employee_name_snapshot', 'total_score_raw'])
            ->groupBy(fn ($a) => $a->kpi_template_id.'|'.$a->assessment_kind);
        foreach ($groups as $group) {
            $group->ranking = ($rankings[$group->kpi_template_id.'|'.$group->assessment_kind] ?? collect())
                ->map(fn ($a) => ['id' => $a->id, 'employee_name_snapshot' => $a->employee_name_snapshot, 'total_score_raw' => $a->total_score_raw])
                ->values();
        }

        return $groups;
    }
}
