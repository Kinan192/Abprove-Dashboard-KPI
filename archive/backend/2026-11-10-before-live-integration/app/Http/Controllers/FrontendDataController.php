<?php

namespace App\Http\Controllers;

use App\Models\AssessmentCycle;
use App\Models\KpiTemplate;
use App\Queries\ScopedRecords;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FrontendDataController extends Controller
{
    public function __construct(private ScopedRecords $records) {}

    public function lookups(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $result = ['units' => app(ReportingController::class)->team($r)->getData(true)['data'],
            'positions' => DB::table('positions')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $this->records->members($ctx)->pluck('e.position_id')))->orderBy('name')->get()];
        if ($ctx->role === 'super_hc') {
            $result['divisions'] = DB::table('divisions')->orderBy('name')->get();
            $result['users'] = DB::table('users')->select('id', 'name', 'email', 'login_nip', 'role_key', 'is_active')->orderBy('name')->get();
            $result['employees'] = DB::table('employees')->orderBy('full_name')->get();
            $result['assignments'] = DB::table('scope_assignments')->whereNull('revoked_at')->get();
        }

        return response()->json(['data' => $result]);
    }

    public function kpis(Request $r)
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id']]);
        $ctx = $r->attributes->get('access_context');
        $month = AssessmentCycle::findOrFail($d['cycle_id'])->assessment_month->format('Y-m-d');
        $q = KpiTemplate::whereNotNull('sealed_at')->where('effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month));
        if ($ctx->role === 'kepala_unit') {
            $q->where('scope_level', 'unit')->where('scope_key', $ctx->unitId);
        }
        if ($ctx->role === 'kepala_divisi') {
            $q->where('scope_level', 'division')->where('scope_key', $ctx->divisionId);
        }

        return response()->json(['data' => $q->with('items')->orderBy('id')->get()]);
    }

    public function analytics(Request $r)
    {
        $f = $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'], 'kind' => ['sometimes', 'in:member,unit_head'], 'template_id' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'string', 'max:160'], 'matrix_page' => ['sometimes', 'integer', 'min:1']]);
        $cycle = AssessmentCycle::findOrFail($f['cycle_id']);
        $month = CarbonImmutable::parse($cycle->assessment_month);
        $q = $this->records->assessments($r->attributes->get('access_context'))->join('assessment_cycles as c', 'c.id', '=', 'assessments.cycle_id')->where('assessments.status', 'final');
        foreach (['unit_id', 'division_id'] as $key) {
            if (isset($f[$key])) {
                $q->where('assessments.'.$key, $f[$key]);
            }
        }
        if (isset($f['kind'])) {
            $q->where('assessment_kind', $f['kind']);
        }
        if (isset($f['template_id'])) {
            $q->where('kpi_template_id', $f['template_id']);
        }
        if (isset($f['search'])) {
            $q->where('employee_name_snapshot', 'like', '%'.$f['search'].'%');
        }
        $periods = (clone $q)->whereBetween('c.assessment_month', [$month->subMonths(11)->format('Y-m-d'), $month->format('Y-m-d')])->selectRaw('c.assessment_month as month,AVG(total_score_raw) as average,COUNT(*) as count')->groupBy('c.assessment_month')->get()->keyBy('month');
        $trend = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = $month->subMonths($i)->format('Y-m-d');
            $p = $periods->get($key);
            $trend[] = ['month' => $key, 'average' => $p ? bcadd($p->average, '0', 6) : null, 'count' => $p ? $p->count : 0];
        }
        $current = (clone $q)->where('assessments.cycle_id', $cycle->id);
        $groups = (clone $current)->selectRaw('kpi_template_id,template_name_snapshot,assessment_kind,COUNT(*) as count,AVG(total_score_raw) as average')->groupBy('kpi_template_id', 'template_name_snapshot', 'assessment_kind')->get();
        foreach ($groups as $g) {
            $g->ranking = (clone $current)->where('kpi_template_id', $g->kpi_template_id)->where('assessment_kind', $g->assessment_kind)->orderByDesc('total_score_raw')->orderBy('assessments.id')->get(['assessments.id', 'employee_name_snapshot', 'total_score_raw']);
        }
        $matrix = (clone $q)->whereBetween('c.assessment_month', [$month->subMonths(11)->format('Y-m-d'), $month->format('Y-m-d')])->select('assessments.id', 'assessment_kind', 'employee_id', 'subject_user_id', 'employee_name_snapshot', 'unit_name_snapshot', 'total_score_raw', 'c.assessment_month')->orderBy('employee_name_snapshot')->orderBy('c.assessment_month')->paginate(25, ['*'], 'matrix_page');

        return response()->json(['data' => ['trend' => $trend, 'groups' => $groups, 'matrix' => $matrix, 'final_count' => (clone $current)->count(), 'average' => (clone $current)->avg('total_score_raw'),
            'categories' => (clone $current)->selectRaw('category_code_snapshot as code,category_label_snapshot as label,COUNT(*) as count')->groupBy('category_code_snapshot', 'category_label_snapshot')->get()]]);
    }

    public function comparison(Request $r, int $assessment)
    {
        $ctx = $r->attributes->get('access_context');
        $a = $this->records->assessments($ctx)->whereKey($assessment)->with('items', 'cycle')->firstOrFail();
        $month = CarbonImmutable::parse($a->cycle->assessment_month)->subMonth()->format('Y-m-d');
        $head = $a->assessment_kind === 'unit_head';
        $previous = $this->records->assessments($ctx)->where($head ? 'subject_user_id' : 'employee_id', $head ? $a->subject_user_id : $a->employee_id)->where('assessment_kind', $a->assessment_kind)->where('status', 'final')->whereHas('cycle', fn ($q) => $q->where('assessment_month', $month))->with('items')->first();
        $signature = fn ($item) => json_encode([$item->pillar_snapshot, $item->kpi_name_snapshot, $item->numerator_snapshot, $item->denominator_snapshot, $item->formula_snapshot, $item->target_snapshot, $item->weight_percent_snapshot]);
        $old = $previous ? $previous->items->keyBy($signature) : collect();
        $items = [];
        foreach ($a->items as $item) {
            if ($p = $old->get($signature($item))) {
                $items[] = ['source_kpi_item_id' => $item->source_kpi_item_id, 'score' => $p->score, 'previous_result' => $p->weighted_result_raw];
            }
        }

        return response()->json(['data' => ['available' => count($items) > 0, 'fully_comparable' => count($items) === $a->items->count(), 'month' => $month, 'items' => $items, 'total' => $previous && count($items) === $a->items->count() ? $previous->total_score_raw : null]]);
    }
}
