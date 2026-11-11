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
        $units = app(ReportingController::class)->team($r)->getData(true)['data'];
        $positionIds = $this->records->members($ctx)->distinct()->pluck('e.position_id');
        if ($ctx->role === 'kepala_divisi') {
            $positionIds = $positionIds->merge($this->records->members($ctx, true)->distinct()->pluck('e.position_id'))->unique();
        }
        $positions = DB::table('positions')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $positionIds))->orderBy('name')->get();
        $result = ['units' => $units, 'positions' => $positions];
        if ($ctx->role === 'super_hc') {
            $result['divisions'] = DB::table('divisions as d')->leftJoin('scope_assignments as h', fn ($j) => $j->on('h.division_id', '=', 'd.id')->where('h.role_key', 'kepala_divisi')->whereNull('h.revoked_at'))
                ->leftJoin('users as leader', 'leader.id', '=', 'h.user_id')
                ->select('d.*', 'h.id as head_assignment_id', 'leader.id as head_user_id', 'leader.name as head_name')
                ->selectSub(DB::table('units')->whereColumn('division_id', 'd.id')->where('is_active', true)->selectRaw('COUNT(*)'), 'unit_count')
                ->selectSub(DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')->whereColumn('p.division_id', 'd.id')->whereNull('p.ended_at')->where('e.is_active', true)->selectRaw('COUNT(*)'), 'employee_count')->orderBy('d.name')->get();
            $users = DB::table('users')->select('id', 'name', 'email', 'login_nip', 'is_active')->orderBy('name')->get();
            $roles = DB::table('user_roles')->get()->groupBy('user_id');
            foreach ($users as $user) {
                $user->roles = ($roles[$user->id] ?? collect())->pluck('role_key')->all();
            }
            $result['users'] = $users;
            $result['employees'] = DB::table('employees as e')->leftJoin('employee_placements as p', fn ($j) => $j->on('p.employee_id', '=', 'e.id')->whereNull('p.ended_at'))
                ->join('positions as pos', 'pos.id', '=', 'e.position_id')->leftJoin('units as u', 'u.id', '=', 'p.unit_id')
                ->select('e.*', 'p.id as placement_id', 'p.unit_id', 'p.division_id', 'u.name as unit_name', 'pos.name as position_name')->orderBy('e.full_name')->get();
            $result['allUnits'] = DB::table('units')->orderBy('name')->get();
            $result['assignments'] = DB::table('scope_assignments')->whereNull('revoked_at')->get();
        }

        return response()->json(['data' => $result]);
    }

    public function analytics(Request $r)
    {
        $f = $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'], 'position_id' => ['sometimes', 'integer', 'min:1']]);
        $cycle = AssessmentCycle::findOrFail($f['cycle_id']);
        $month = CarbonImmutable::parse($cycle->assessment_month);
        $q = $this->records->assessments($r->attributes->get('access_context'))->join('assessment_cycles as c', 'c.id', '=', 'assessments.cycle_id')->where('assessments.status', 'final');
        foreach (['unit_id', 'division_id', 'position_id'] as $field) {
            if (isset($f[$field])) {
                $q->where('assessments.'.$field, $f[$field]);
            }
        }
        $periods = (clone $q)->whereBetween('c.assessment_month', [$month->subMonths(11)->format('Y-m-d'), $month->format('Y-m-d')])->selectRaw('c.assessment_month as month, AVG(total_score_raw) as average, COUNT(*) as count')->groupBy('c.assessment_month')->orderBy('c.assessment_month')->get()->keyBy('month');
        $trend = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = $month->subMonths($i)->format('Y-m-d');
            $point = $periods->get($key);
            $trend[] = ['month' => $key, 'average' => $point ? bcadd($point->average, '0', 6) : null, 'count' => $point ? $point->count : 0];
        }
        $current = (clone $q)->where('assessments.cycle_id', $cycle->id);
        $categories = (clone $current)->selectRaw('category_code_snapshot as code, category_label_snapshot as label, COUNT(*) as count')->groupBy('category_code_snapshot', 'category_label_snapshot')->get();
        $groups = (clone $current)->selectRaw('assessments.position_id, position_name_snapshot as position_name, kpi_template_id, template_name_snapshot as template_name, assessment_kind, COUNT(*) as count, AVG(total_score_raw) as average')
            ->groupBy('assessments.position_id', 'position_name_snapshot', 'kpi_template_id', 'template_name_snapshot', 'assessment_kind')->get();
        $matrix = (clone $q)->whereBetween('c.assessment_month', [$month->subMonths(11)->format('Y-m-d'), $month->format('Y-m-d')])
            ->select('assessments.id', 'employee_id', 'employee_name_snapshot', 'unit_name_snapshot', 'total_score_raw', 'c.assessment_month')->orderBy('employee_name_snapshot')->orderBy('c.assessment_month')->get();

        return response()->json(['data' => ['trend' => $trend, 'categories' => $categories, 'groups' => $groups, 'matrix' => $matrix, 'final_count' => (clone $current)->count(), 'average' => (clone $current)->avg('total_score_raw')]]);
    }

    public function kpis(Request $r)
    {
        $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id']]);
        $ctx = $r->attributes->get('access_context');
        $positions = $this->records->members($ctx)->distinct()->pluck('e.position_id');
        if ($ctx->role === 'kepala_divisi') {
            $positions = $positions->merge($this->records->members($ctx, true)->distinct()->pluck('e.position_id'))->unique();
        }
        $cycle = AssessmentCycle::findOrFail($r->integer('cycle_id'));
        $month = $cycle->assessment_month->format('Y-m-d');
        $templates = KpiTemplate::with('items')->whereIn('position_id', $positions)->where('template_year', $cycle->assessment_month->year)->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('effective_from')->orWhere('effective_from', '<=', $month))
            ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month))->get();

        return response()->json(['data' => $templates]);
    }

    public function comparison(Request $r, int $assessment)
    {
        $ctx = $r->attributes->get('access_context');
        $current = $this->records->assessments($ctx)->whereKey($assessment)->with('items', 'cycle')->firstOrFail();
        $previousMonth = CarbonImmutable::parse($current->cycle->assessment_month)->subMonth()->format('Y-m-d');
        $previous = $this->records->assessments($ctx)->where('employee_id', $current->employee_id)->where('assessment_kind', $current->assessment_kind)->where('status', 'final')
            ->whereHas('cycle', fn ($q) => $q->where('assessment_month', $previousMonth))->with('items')->first();
        $matched = $previous && $previous->kpi_template_id === $current->kpi_template_id;
        $items = [];
        if ($matched) {
            $source = $previous->items->keyBy('source_kpi_item_id');
            foreach ($current->items as $item) {
                if ($old = $source->get($item->source_kpi_item_id)) {
                    $items[] = ['id' => $item->id, 'score' => $old->score, 'previous_result' => $old->weighted_result_raw];
                }
            }
        }

        return response()->json(['data' => ['available' => $matched && count($items) === $current->items->count(), 'month' => $previousMonth, 'total' => $matched ? $previous->total_score_raw : null, 'items' => $items,
            'message' => $matched ? 'Template sama; nilai dapat dibandingkan.' : 'Tidak ada nilai Final bulan sebelumnya dengan template yang sama dalam cakupan Anda.']]);
    }
}
