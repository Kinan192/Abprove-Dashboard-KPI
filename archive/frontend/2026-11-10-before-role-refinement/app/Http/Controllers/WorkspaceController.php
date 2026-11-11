<?php

namespace App\Http\Controllers;

use App\Queries\ScopedRecords;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkspaceController extends Controller
{
    public function show(Request $r, ScopedRecords $records)
    {
        $ctx = $r->attributes->get('access_context');
        $units = $records->units($ctx)->orderBy('id')->get();
        $unitIds = $units->pluck('id');
        $divisions = DB::table('divisions')->when($ctx->role !== 'super_hc', fn ($q) => $q->where('id', $ctx->divisionId))->orderBy('id')->get();
        $divIds = $divisions->pluck('id');
        $assessments = $records->assessments($ctx)->with('items')->orderBy('id')->get();
        $assignments = DB::table('scope_assignments')->where(fn ($q) => $q->whereIn('unit_id', $unitIds)->orWhereIn('division_id', $divIds)->orWhere('user_id', $ctx->userId))->orderBy('id')->get();
        $userIds = $assignments->pluck('user_id')->merge($assessments->pluck('subject_user_id'))->push($ctx->userId)->filter()->unique();
        $users = DB::table('users')->select('id', 'name', 'login_nip', 'email', 'role_key', 'is_active')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $userIds))->orderBy('id')->get();
        $placements = DB::table('employee_placements')->whereIn('unit_id', $unitIds)->orderBy('effective_from')->get();
        $employees = DB::table('employees')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $placements->pluck('employee_id')->merge($assessments->pluck('employee_id'))->filter()))->orderBy('id')->get();
        $positions = DB::table('positions')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $employees->pluck('position_id')))->orderBy('id')->get();
        $templates = DB::table('kpi_templates')->whereNotNull('sealed_at')->where(fn ($q) => $q->where(fn ($q) => $q->where('scope_level', 'unit')->whereIn('scope_key', $unitIds))->orWhere(fn ($q) => $q->where('scope_level', 'division')->whereIn('scope_key', $divIds)))->orderBy('version')->get();
        $items = DB::table('kpi_items')->whereIn('template_id', $templates->pluck('id'))->orderBy('sort_order')->get()->groupBy('template_id');
        $cycles = DB::table('assessment_cycles')->orderBy('assessment_month')->get();
        $categories = DB::table('cycle_categories')->orderBy('sort_order')->get()->groupBy('cycle_id');
        $audit = DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')->select('a.*', 'u.name as actor_name')
            ->when($ctx->role !== 'super_hc', fn ($q) => $q->where(fn ($q) => $q->whereIn('a.assessment_id', $assessments->pluck('id'))->orWhere(fn ($q) => $q->whereNull('a.assessment_id')->where('a.actor_user_id', $ctx->userId)->whereIn('a.action', ['login', 'profile.updated', 'notifications.read']))))->orderByDesc('a.id')->get();
        $auditByAssessment = $audit->whereNotNull('assessment_id')->groupBy('assessment_id');
        $head = fn ($level, $id) => $assignments->first(fn ($s) => $s->role_key === ($level === 'unit' ? 'kepala_unit' : 'kepala_divisi') && ($level === 'unit' ? $s->unit_id : $s->division_id) == $id && ! $s->revoked_at);
        $status = ['submitted' => 'Diajukan', 'returned' => 'Dikembalikan', 'final' => 'Final'];
        $mapped = [];
        foreach ($assessments as $a) {
            $person = $a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id;
            $cycle = substr($cycles->firstWhere('id', $a->cycle_id)->assessment_month, 0, 7);
            $mapped[$person.'|'.$cycle] = ['id' => $a->id, 'lockVersion' => $a->lock_version, 'status' => $status[$a->status], 'values' => $a->items->values()->mapWithKeys(fn ($i, $n) => [$n => $i->score])->all(),
                'positive' => $a->positive_finding ?? '', 'negative' => $a->negative_finding ?? '', 'reason' => $a->return_reason ?? '', 'serverTotal' => $a->total_score_raw,
                'identity' => ['name' => $a->employee_name_snapshot, 'nip' => $a->nip_snapshot, 'job' => $a->position_name_snapshot, 'unitName' => $a->unit_name_snapshot, 'divisionName' => $a->division_name_snapshot],
                'scope' => ['unitId' => (string) $a->unit_id, 'divisionId' => (string) $a->division_id],
                'snapshot' => ['id' => (string) $a->kpi_template_id, 'name' => $a->template_name_snapshot, 'version' => $a->template_version_snapshot,
                    'items' => $a->items->map(fn ($i) => ['id' => (string) $i->source_kpi_item_id, 'pillar' => $i->pillar_snapshot, 'name' => $i->kpi_name_snapshot, 'target' => $i->target_snapshot, 'weight' => (float) $i->weight_percent_snapshot, 'numerator' => $i->numerator_snapshot ?? '', 'denominator' => $i->denominator_snapshot ?? '', 'formula' => $i->formula_snapshot ?? ''])->values()->all()],
                'category' => $a->status === 'final' ? ['label' => $a->category_label_snapshot, 'key' => $a->category_code_snapshot] : null,
                'history' => ($auditByAssessment[$a->id] ?? collect())->map(fn ($e) => ['action' => $e->action, 'who' => $e->actor_name, 'at' => $e->recorded_at.'Z', 'reason' => $e->reason])->values()->all()];
        }
        $accountRoles = ['super_hc' => 'hc', 'kepala_divisi' => 'kd', 'kepala_unit' => 'ku'];
        $data = ['version' => 3,
            'accounts' => $users->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'nip' => $u->login_nip ?? '', 'email' => $u->email ?? '', 'role' => $accountRoles[$u->role_key], 'active' => (bool) $u->is_active])->all(),
            'positions' => $positions->map(fn ($p) => ['id' => (string) $p->id, 'code' => $p->code, 'name' => $p->name, 'active' => (bool) $p->is_active])->all(),
            'divisions' => $divisions->map(fn ($d) => ['id' => (string) $d->id, 'name' => $d->name, 'code' => $d->code, 'active' => (bool) $d->is_active, 'headId' => ($h = $head('division', $d->id)) ? (string) $h->user_id : null, 'assignmentId' => $h?->id])->all(),
            'units' => $units->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'code' => $u->code, 'divisionId' => (string) $u->division_id, 'active' => (bool) $u->is_active, 'headId' => ($h = $head('unit', $u->id)) ? (string) $h->user_id : null, 'assignmentId' => $h?->id])->all(),
            'staff' => $employees->map(fn ($e) => ['id' => 'EMP-'.$e->id, 'dbId' => $e->id, 'name' => $e->full_name, 'nip' => $e->nip, 'positionId' => (string) $e->position_id, 'active' => (bool) $e->is_active,
                'placements' => $placements->where('employee_id', $e->id)->map(fn ($p) => ['id' => $p->id, 'unitId' => (string) $p->unit_id, 'from' => substr($p->effective_from, 0, 7), 'until' => $p->effective_until ? substr($p->effective_until, 0, 7) : null])->values()->all()])->all(),
            'heads' => $assignments->where('role_key', 'kepala_unit')->filter(fn ($h) => $unitIds->contains($h->unit_id))->map(fn ($h) => ['id' => 'HEAD-'.$h->user_id, 'dbId' => $h->user_id, 'accountId' => (string) $h->user_id, 'unitId' => (string) $h->unit_id, 'divisionId' => (string) $units->firstWhere('id', $h->unit_id)->division_id, 'from' => substr($h->assigned_at, 0, 7), 'until' => $h->revoked_at ? CarbonImmutable::parse($h->revoked_at)->subMonth()->format('Y-m') : null])->values()->all(),
            'kpis' => $templates->map(fn ($t) => ['id' => (string) $t->id, 'level' => $t->scope_level, 'areaId' => (string) $t->scope_key, 'name' => $t->name, 'version' => $t->version, 'from' => substr($t->effective_from, 0, 7), 'until' => $t->effective_until ? substr($t->effective_until, 0, 7) : null,
                'items' => ($items[$t->id] ?? collect())->map(fn ($i) => ['id' => (string) $i->id, 'pillar' => $i->pillar, 'name' => $i->name, 'numerator' => $i->numerator ?? '', 'denominator' => $i->denominator ?? '', 'formula' => $i->measurement_formula ?? '', 'target' => $i->target_text, 'weight' => (float) $i->weight_percent])->all()])->all(),
            'cycles' => $cycles->map(function ($x) use ($categories) {
                $ranges = ($categories[$x->id] ?? collect())->map(fn ($c) => ['code' => $c->code, 'label' => $c->label, 'lower' => (float) $c->lower_bound, 'upper' => $c->upper_bound === null ? null : (float) $c->upper_bound])->all();
                $date = fn ($s) => CarbonImmutable::parse($s, 'UTC')->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');

                return ['id' => substr($x->assessment_month, 0, 7), 'dbId' => $x->id, 'status' => $x->status, 'opens' => $date($x->opens_at), 'submission' => $date($x->submission_due_at), 'approval' => $date($x->approval_due_at), 'closes' => $date($x->closes_at), 'ranges' => $ranges, 'categories' => ['sb' => $ranges[3]['lower'] ?? 90, 'b' => $ranges[2]['lower'] ?? 80, 'c' => $ranges[1]['lower'] ?? 70]];
            })->all(),
            'assessments' => $mapped, 'activities' => $audit->map(fn ($e) => ['id' => (string) $e->id, 'at' => $e->recorded_at.'Z', 'who' => $e->actor_name ?? 'Sistem', 'action' => $e->action, 'detail' => $e->reason ?? $e->subject_type.' #'.$e->subject_id, 'before' => $e->before_data ? json_decode($e->before_data, true) : null, 'after' => $e->after_data ? json_decode($e->after_data, true) : null])->all(),
            'profiles' => [(string) $ctx->userId => ['name' => $r->user()->name, 'email' => $r->user()->email, 'phone' => $r->user()->phone, 'notification' => $r->user()->email_notifications, 'hasPhoto' => (bool) $r->user()->photo_path]], 'read' => []];
        $selected = $cycles->firstWhere('assessment_month', $r->query('cycle', now('Asia/Jakarta')->format('Y-m')).'-01') ?? $cycles->last();
        $data['notifications'] = $selected ? app(NotificationController::class)->tasks($ctx, $selected->id)->all() : [];

        return response()->json(['data' => $data, 'actorId' => (string) $ctx->userId, 'cycle' => $selected ? substr($selected->assessment_month, 0, 7) : now('Asia/Jakarta')->format('Y-m')]);
    }
}
