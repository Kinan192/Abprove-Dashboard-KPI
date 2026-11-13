<?php

namespace App\Services\Reporting;

use App\Models\AssessmentCycle;
use App\Models\KpiTemplate;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Insights
{
    public function __construct(private ScopedRecords $records) {}

    public function forCycle(AccessContext $ctx, int $cycleId, array $filters = []): array
    {
        $cycle = AssessmentCycle::findOrFail($cycleId);
        $all = $this->records->assessments($ctx)->where('cycle_id', $cycleId)->toBase()->get();
        $personId = fn ($a) => ($a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id);
        $byPerson = $all->keyBy($personId);
        $people = collect();
        foreach ([false, true] as $head) {
            foreach ($this->records->members($ctx, $head, $cycle->assessment_month->format('Y-m-d'))->get() as $p) {
                $id = ($head ? 'HEAD-' : 'EMP-').$p->id;
                $a = $byPerson->get($id);
                $people->put($id, ['personId' => $id, 'kind' => $head ? 'unit_head' : 'member', 'name' => $a?->employee_name_snapshot ?? $p->full_name, 'nip' => $a?->nip_snapshot ?? $p->nip,
                    'unit_id' => $a?->unit_id ?? $p->unit_id, 'division_id' => $a?->division_id ?? $p->division_id, 'unit_name' => $a?->unit_name_snapshot ?? $p->unit_name, 'division_name' => $a?->division_name_snapshot ?? $p->division_name, 'status' => $a?->status ?? 'not_started']);
            }
        }
        foreach ($all as $a) {
            if (! $people->has($personId($a))) {
                $people->put($personId($a), ['personId' => $personId($a), 'kind' => $a->assessment_kind, 'name' => $a->employee_name_snapshot, 'nip' => $a->nip_snapshot, 'unit_id' => $a->unit_id, 'division_id' => $a->division_id, 'unit_name' => $a->unit_name_snapshot, 'division_name' => $a->division_name_snapshot, 'status' => $a->status]);
            }
        }
        $template = isset($filters['template_id']) ? KpiTemplate::find($filters['template_id']) : null;
        $people = $people->filter(function ($p) use ($filters, $template, $byPerson) {
            foreach (['unit_id', 'division_id', 'kind'] as $key) {
                if (isset($filters[$key]) && (string) $p[$key] !== (string) $filters[$key]) {
                    return false;
                }
            }
            if (isset($filters['search']) && ! str_contains(mb_strtolower($p['name'].' '.$p['nip']), mb_strtolower($filters['search']))) {
                return false;
            }
            if (isset($filters['template_id'])) {
                $a = $byPerson->get($p['personId']);
                if ($a) {
                    return $a->kpi_template_id === $template?->id;
                }
                if (! $template) {
                    return false;
                }

                return $template->scope_level === ($p['kind'] === 'member' ? 'unit' : 'division') && $template->scope_key === ($p['kind'] === 'member' ? $p['unit_id'] : $p['division_id']);
            }

            return true;
        });
        $rows = $all->filter(fn ($a) => $people->has($personId($a)));
        $final = $rows->where('status', 'final');
        $items = DB::table('assessment_items')->whereIn('assessment_id', $final->pluck('id'))
            ->orderBy('sort_order')->get()->groupBy('assessment_id');
        $scores = $final->map(fn ($a) => ['assessment_id' => $a->id, 'personId' => $personId($a), 'kind' => $a->assessment_kind, 'name' => $a->employee_name_snapshot, 'nip' => $a->nip_snapshot, 'unit_name' => $a->unit_name_snapshot, 'division_name' => $a->division_name_snapshot, 'total' => $a->total_score_raw, 'category' => $a->category_label_snapshot, 'positive' => $a->positive_finding ?? '', 'negative' => $a->negative_finding ?? '', 'template_id' => $a->kpi_template_id]);
        $itemGroups = [];
        foreach ($final as $a) {
            foreach ($items[$a->id] ?? [] as $item) {
                $key = $a->assessment_kind.':'.$a->kpi_template_id.':'.$item->source_kpi_item_id;
                $itemGroups[$key] ??= ['template_id' => $a->kpi_template_id, 'template_name' => $a->template_name_snapshot, 'kind' => $a->assessment_kind, 'area' => $a->assessment_kind === 'member' ? $a->unit_name_snapshot : $a->division_name_snapshot, 'item_id' => $item->source_kpi_item_id, 'pillar' => $item->pillar_snapshot, 'name' => $item->kpi_name_snapshot, 'weight' => $item->weight_percent_snapshot, 'sum' => '0', 'count' => 0];
                $itemGroups[$key]['sum'] = bcadd($itemGroups[$key]['sum'], (string) ($item->computed_score ?? $item->score), 6);
                $itemGroups[$key]['count']++;
            }
        }
        $averages = collect($itemGroups)->map(function ($g) {
            $g['average'] = bcdiv($g['sum'], (string) $g['count'], 6);
            $g['weighted_average'] = bcdiv(bcmul($g['average'], $g['weight'], 10), '100', 6);
            unset($g['sum']);

            return $g;
        })->values();
        $statuses = function (Collection $group, string $idKey, string $nameKey) {
            return $group->groupBy($idKey)->map(fn ($g, $id) => ['id' => (string) $id, 'name' => $g->first()[$nameKey], 'total' => $g->count(), 'not_started' => $g->where('status', 'not_started')->count(), 'submitted' => $g->where('status', 'submitted')->count(), 'returned' => $g->where('status', 'returned')->count(), 'final' => $g->where('status', 'final')->count()])->values();
        };
        $rankings = $scores->groupBy(fn ($r) => $r['kind'].':'.$r['template_id'])->map(function ($group) use ($final) {
            $a = $final->firstWhere('kpi_template_id', $group->first()['template_id']);

            return ['template_id' => $a->kpi_template_id, 'name' => $a->template_name_snapshot, 'area' => $a->assessment_kind === 'member' ? $a->unit_name_snapshot : $a->division_name_snapshot, 'kind' => $a->assessment_kind, 'rows' => $group->sortByDesc(fn ($r) => (float) $r['total'])->values()->all()];
        })->values();
        $sum = $final->reduce(fn ($n, $a) => bcadd($n, $a->total_score_raw, 6), '0');

        return ['cycle_id' => $cycleId, 'month' => $cycle->assessment_month->format('Y-m'), 'metrics' => ['total' => $people->count(), 'final' => $final->count(), 'submitted' => $rows->where('status', 'submitted')->count(), 'returned' => $rows->where('status', 'returned')->count(), 'not_started' => $people->where('status', 'not_started')->count(), 'average' => $final->isEmpty() ? null : bcdiv($sum, (string) $final->count(), 6)],
            'item_averages' => $averages, 'unit_status' => $statuses($people, 'unit_id', 'unit_name'), 'division_progress' => $statuses($people, 'division_id', 'division_name'), 'rankings' => $rankings,
            'scores' => $scores->values(), 'findings' => $scores->filter(fn ($r) => $r['positive'] !== '' || $r['negative'] !== '')->values()];
    }
}
