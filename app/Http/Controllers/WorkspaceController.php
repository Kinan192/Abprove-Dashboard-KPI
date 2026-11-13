<?php

namespace App\Http\Controllers;

use App\Queries\ScopedRecords;
use App\Services\Reporting\Insights;
use ArrayIterator;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use JsonSerializable;

class WorkspaceController extends Controller
{
    public function show(Request $r, ScopedRecords $records)
    {
        $ctx = $r->attributes->get('access_context');
        $compact = $r->boolean('compact');
        $selection = $r->validate([
            'only' => ['sometimes', 'array', 'min:1'],
            'only.*' => ['string', 'in:accounts,positions,divisions,units,staff,heads,kpis,kpiUnits,cycles,assessments,assessmentTemplates,profiles,notifications,activities'],
            'assessment_ids' => ['sometimes', 'array', 'max:100'],
            'assessment_ids.*' => ['integer', 'min:1'],
        ]);
        $only = $selection['only'] ?? null;
        $needs = fn (string $key) => $only === null || in_array($key, $only, true);
        $page = $r->query('page');
        $pageActivities = $compact && is_string($page) && $page !== '';
        $personal = $compact && in_array($page, ['profil', 'panduan'], true);
        $light = $personal || ($pageActivities && $page === 'aktivitas');
        $units = $records->units($ctx)->orderBy('id')->get();
        $unitIds = $units->pluck('id');
        $kpiUnits = $records->kpiUnits($ctx)->orderBy('id')->get();
        $divisions = DB::table('divisions')->when($ctx->role !== 'super_hc', fn ($q) => $q->where('id', $ctx->divisionId))->orderBy('id')->get();
        $divIds = $divisions->pluck('id');
        $assessmentQuery = $records->assessments($ctx)->when($light || ! $needs('assessments'), fn ($q) => $q->whereRaw('1=0'))
            ->when(isset($selection['assessment_ids']), fn ($q) => $q->whereIn('id', $selection['assessment_ids']))->orderBy('id');
        $assessments = $compact ? $assessmentQuery->toBase()->get() : $assessmentQuery->with('items')->get();
        $assessmentItems = $compact
            ? DB::table('assessment_items')->whereIn('assessment_id', $assessments->pluck('id'))->orderBy('sort_order')->get()->groupBy('assessment_id')
            : collect();
        $assignments = DB::table('scope_assignments')->where(fn ($q) => $q->whereIn('unit_id', $unitIds)->orWhereIn('division_id', $divIds)->orWhere('user_id', $ctx->userId))->orderBy('id')->get();
        $userIds = $assignments->pluck('user_id')->merge($assessments->pluck('subject_user_id'))->push($ctx->userId)->filter()->unique();
        $users = DB::table('users')->select('id', 'name', 'login_nip', 'email', 'role_key', 'is_active')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $userIds))->orderBy('id')->get();
        $placements = DB::table('employee_placements')->whereIn('unit_id', $unitIds)->orderBy('effective_from')->get();
        $placementsByEmployee = $placements->groupBy('employee_id');
        $employees = DB::table('employees')->when($light || ! $needs('staff'), fn ($q) => $q->whereRaw('1=0'))->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $placements->pluck('employee_id')->merge($assessments->pluck('employee_id'))->filter()))->orderBy('id')->get();
        $positions = DB::table('positions')->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $employees->pluck('position_id')))->orderBy('id')->get();
        $personKeys = $employees->pluck('id')->map(fn ($id) => 'staff-'.$id)->merge($assignments->where('role_key', 'kepala_unit')->whereIn('unit_id', $unitIds)->pluck('user_id')->map(fn ($id) => 'head-'.$id));
        $publications = DB::table('kpi_workspace_publications')->whereIn('person_key', $personKeys)->get();
        $templates = DB::table('kpi_templates')->whereNotNull('sealed_at')->where(fn ($q) => $q->whereNull('workspace_hash')->orWhereIn('id', $publications->pluck('template_id')->filter()))->when(! $needs('kpis'), fn ($q) => $q->whereRaw('1=0'))->where(function ($q) use ($ctx, $kpiUnits, $divIds) {
            $q->where(fn ($q) => $q->where('scope_level', 'unit')->whereIn('scope_key', $kpiUnits->pluck('id')));
            if ($ctx->role !== 'kepala_unit') {
                $q->orWhere(fn ($q) => $q->where('scope_level', 'division')->whereIn('scope_key', $divIds));
            }
        })->orderBy('version')->get();
        $items = DB::table('kpi_items')->whereIn('template_id', $templates->pluck('id'))->orderBy('sort_order')->get()->groupBy('template_id');
        $cycles = DB::table('assessment_cycles')->orderBy('assessment_month')->get();
        $cyclesById = $cycles->keyBy('id');
        $categories = DB::table('cycle_categories')->orderBy('sort_order')->get()->groupBy('cycle_id');
        $global = $ctx->role === 'super_hc';
        $auditQuery = DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.actor_user_id')
            ->when($personal, fn ($q) => $q->whereRaw('1=0'))
            ->when(! $global, fn ($q) => $q->where(fn ($q) => $q->whereIn('a.assessment_id', $assessments->pluck('id'))->orWhere(fn ($q) => $q->whereNull('a.assessment_id')->where('a.actor_user_id', $ctx->userId)->whereIn('a.action', ['login', 'profile.updated', 'notifications.read']))))
            ->orderByDesc('a.id');
        $auditColumns = ['a.id', 'a.assessment_id', 'a.action', 'a.recorded_at', 'a.reason', 'u.name as actor_name'];
        if ($compact) {
            $auditColumns = array_merge($auditColumns, ['a.subject_type', 'a.subject_id']);
            $document = 'COALESCE(a.after_data, a.before_data)';
            $fields = ['full_name', 'employee_name_snapshot', 'name', 'assessment_month'];
            $summary = array_map(fn ($field) => "NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT($document, '$.$field')), 'null'), '')", $fields);
            $auditColumns[] = DB::raw('COALESCE('.implode(', ', $summary).') as summary');
        }
        $activityRows = collect();
        if ($pageActivities) {
            if ($needs('activities') && $global && in_array($page, ['beranda', 'aktivitas'], true)) {
                $activityQuery = clone $auditQuery;
                if ($page === 'beranda') {
                    $activityQuery->limit(4);
                }
                $activityRows = $activityQuery->get($auditColumns);
            }
            // Decision timelines need audit metadata, while full activity lists have their own page.
            $audit = (clone $auditQuery)->whereIn('a.assessment_id', $assessments->pluck('id'))
                ->get(['a.id', 'a.assessment_id', 'a.action', 'a.recorded_at', 'a.reason', 'u.name as actor_name']);
        } else {
            $audit = $auditQuery->get($compact || $global ? $auditColumns : ['a.*', 'u.name as actor_name']);
            $activityRows = $audit;
        }
        $auditByAssessment = $audit->whereNotNull('assessment_id')->groupBy('assessment_id');
        $head = fn ($level, $id) => $assignments->first(fn ($s) => $s->role_key === ($level === 'unit' ? 'kepala_unit' : 'kepala_divisi') && ($level === 'unit' ? $s->unit_id : $s->division_id) == $id && ! $s->revoked_at);
        $status = ['submitted' => 'Diajukan', 'returned' => 'Dikembalikan', 'final' => 'Final'];
        $mapped = [];
        $assessmentTemplates = [];
        foreach ($assessments as $a) {
            if ($compact) {
                $a->items = $assessmentItems[$a->id] ?? collect();
            }
            $person = $a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id;
            $cycle = substr($cyclesById[$a->cycle_id]->assessment_month, 0, 7);
            $mapped[$person.'|'.$cycle] = ['id' => $a->id, 'lockVersion' => $a->lock_version, 'status' => $status[$a->status], 'values' => $a->items->values()->mapWithKeys(fn ($i, $n) => [$n => (float) ($i->computed_score ?? $i->score)])->all(), 'inputs' => $a->items->values()->mapWithKeys(fn ($i, $n) => [$n => is_string($i->measurement_inputs) ? json_decode($i->measurement_inputs, true) : $i->measurement_inputs])->all(),
                'positive' => $a->positive_finding ?? '', 'negative' => $a->negative_finding ?? '', 'reason' => $a->return_reason ?? '', 'serverTotal' => $a->total_score_raw,
                'identity' => ['name' => $a->employee_name_snapshot, 'nip' => $a->nip_snapshot, 'job' => $a->position_name_snapshot, 'unitName' => $a->unit_name_snapshot, 'divisionName' => $a->division_name_snapshot],
                'scope' => ['unitId' => (string) $a->unit_id, 'divisionId' => (string) $a->division_id],
                'snapshot' => ['id' => (string) $a->kpi_template_id, 'name' => $a->template_name_snapshot, 'version' => $a->template_version_snapshot,
                    'items' => $a->items->map(fn ($i) => ['id' => (string) $i->source_kpi_item_id, 'pillar' => $i->pillar_snapshot, 'name' => $i->kpi_name_snapshot, 'target' => $i->target_snapshot, 'weight' => (float) $i->weight_percent_snapshot, 'numerator' => $i->numerator_snapshot ?? '', 'denominator' => $i->denominator_snapshot ?? '', 'formula' => $i->formula_snapshot ?? '', 'config' => is_string($i->definition_snapshot) ? json_decode($i->definition_snapshot, true) : $i->definition_snapshot])->values()->all()],
                'category' => $a->status === 'final' ? ['label' => $a->category_label_snapshot, 'key' => $a->category_code_snapshot] : null,
                'history' => ($auditByAssessment[$a->id] ?? collect())->map(fn ($e) => ['action' => $e->action, 'who' => $e->actor_name, 'at' => $e->recorded_at.'Z', 'reason' => $e->reason])->values()->all()];
            if ($compact) {
                $key = $person.'|'.$cycle;
                $snapshot = $mapped[$key]['snapshot'];
                // Share only identical captured definitions, including historical snapshots.
                $snapshotKey = hash('xxh128', json_encode($snapshot, JSON_THROW_ON_ERROR));
                $assessmentTemplates[$snapshotKey] ??= $snapshot;
                $mapped[$key]['snapshotKey'] = $snapshotKey;
                unset($mapped[$key]['snapshot']);
            }
        }
        // Release hydrated assessments and their items before encoding the workspace.
        unset($assessments, $assessmentItems, $a, $auditByAssessment);

        $accountRoles = ['super_hc' => 'hc', 'kepala_divisi' => 'kd', 'kepala_unit' => 'ku'];
        $data = ['version' => 3,
            'kpiUnits' => $kpiUnits->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'divisionId' => (string) $u->division_id, 'active' => (bool) $u->is_active])->all(),
            'accounts' => $users->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'nip' => $u->login_nip ?? '', 'email' => $u->email ?? '', 'role' => $accountRoles[$u->role_key], 'active' => (bool) $u->is_active])->all(),
            'positions' => $positions->map(fn ($p) => ['id' => (string) $p->id, 'code' => $p->code, 'name' => $p->name, 'active' => (bool) $p->is_active])->all(),
            'divisions' => $divisions->map(fn ($d) => ['id' => (string) $d->id, 'name' => $d->name, 'code' => $d->code, 'active' => (bool) $d->is_active, 'headId' => ($h = $head('division', $d->id)) ? (string) $h->user_id : null, 'assignmentId' => $h?->id])->all(),
            'units' => $units->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'code' => $u->code, 'divisionId' => (string) $u->division_id, 'active' => (bool) $u->is_active, 'headId' => ($h = $head('unit', $u->id)) ? (string) $h->user_id : null, 'assignmentId' => $h?->id])->all(),
            'staff' => $employees->map(fn ($e) => ['id' => 'EMP-'.$e->id, 'dbId' => $e->id, 'name' => $e->full_name, 'nip' => $e->nip, 'positionId' => (string) $e->position_id, 'active' => (bool) $e->is_active,
                'placements' => ($placementsByEmployee[$e->id] ?? collect())->map(fn ($p) => ['id' => $p->id, 'unitId' => (string) $p->unit_id, 'from' => substr($p->effective_from, 0, 7), 'until' => $p->effective_until ? substr($p->effective_until, 0, 7) : null])->values()->all()])->all(),
            'heads' => $assignments->where('role_key', 'kepala_unit')->filter(fn ($h) => $unitIds->contains($h->unit_id))->map(fn ($h) => ['id' => 'HEAD-'.$h->user_id, 'dbId' => $h->user_id, 'accountId' => (string) $h->user_id, 'unitId' => (string) $h->unit_id, 'divisionId' => (string) $units->firstWhere('id', $h->unit_id)->division_id, 'from' => substr($h->assigned_at, 0, 7), 'until' => $h->revoked_at ? CarbonImmutable::parse($h->revoked_at)->subMonth()->format('Y-m') : null])->values()->all(),
            'kpis' => $templates->map(fn ($t) => ['id' => (string) $t->id, 'level' => $t->scope_level, 'areaId' => (string) $t->scope_key, 'name' => $t->name, 'version' => $t->version, 'from' => substr($t->effective_from, 0, 7), 'until' => $t->effective_until ? substr($t->effective_until, 0, 7) : null,
                'items' => ($items[$t->id] ?? collect())->map(fn ($i) => ['id' => (string) $i->id, 'pillar' => $i->pillar, 'name' => $i->name, 'numerator' => $i->numerator ?? '', 'denominator' => $i->denominator ?? '', 'formula' => $i->measurement_formula ?? '', 'target' => $i->target_text, 'weight' => (float) $i->weight_percent, 'config' => $i->workspace_definition ? json_decode($i->workspace_definition, true) : null])->all()])->all(),
            'cycles' => $cycles->map(function ($x) use ($categories) {
                $ranges = ($categories[$x->id] ?? collect())->map(fn ($c) => ['code' => $c->code, 'label' => $c->label, 'lower' => (float) $c->lower_bound, 'upper' => $c->upper_bound === null ? null : (float) $c->upper_bound])->all();
                $date = fn ($s) => CarbonImmutable::parse($s, 'UTC')->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');

                return ['id' => substr($x->assessment_month, 0, 7), 'dbId' => $x->id, 'status' => $x->status, 'opens' => $date($x->opens_at), 'submission' => $date($x->submission_due_at), 'approval' => $date($x->approval_due_at), 'closes' => $date($x->closes_at), 'ranges' => $ranges, 'categories' => ['sb' => $ranges[3]['lower'] ?? 90, 'b' => $ranges[2]['lower'] ?? 80, 'c' => $ranges[1]['lower'] ?? 70]];
            })->all(),
            'assessments' => $mapped,
            'profiles' => [(string) $ctx->userId => ['name' => $r->user()->name, 'email' => $r->user()->email, 'phone' => $r->user()->phone, 'notification' => $r->user()->email_notifications, 'hasPhoto' => (bool) $r->user()->photo_path]], 'read' => []];
        $clientPerson = fn ($key) => str_replace(['staff-', 'head-'], ['EMP-', 'HEAD-'], $key);
        foreach ($data['kpis'] as &$template) {
            $template['forPeople'] = $publications->where('template_id', $template['id'])->map(fn ($p) => $clientPerson($p->person_key))->values()->all();
        }
        unset($template);
        foreach ($publications->whereNull('template_id') as $publication) {
            $data['kpis'][] = ['id' => 'pending-'.$publication->id, 'forPeople' => [$clientPerson($publication->person_key)], 'from' => substr($publication->assessment_month, 0, 7), 'until' => substr($publication->assessment_month, 0, 7), 'level' => '', 'areaId' => '', 'name' => 'KPI belum lengkap', 'version' => 0, 'items' => []];
        }
        foreach ($data['cycles'] as &$cycle) $cycle['managed'] = (bool) $cyclesById[$cycle['dbId']]->workspace_managed;
        unset($cycle);
        $selected = $cycles->firstWhere('assessment_month', $r->query('cycle', now('Asia/Jakarta')->format('Y-m')).'-01') ?? $cycles->last();
        $data['notifications'] = $selected && $needs('notifications') ? app(NotificationController::class)->tasks($ctx, $selected->id)->all() : [];

        $activity = static fn (object $event) => new class($event) implements JsonSerializable
        {
            public function __construct(private object $event) {}

            public function jsonSerialize(): array
            {
                $event = $this->event;

                return [
                    'id' => (string) $event->id,
                    'at' => $event->recorded_at.'Z',
                    'who' => $event->actor_name ?? 'Sistem',
                    'action' => $event->action,
                    'detail' => $event->reason ?? $event->subject_type.' #'.$event->subject_id,
                    'before' => $event->before_data ? json_decode($event->before_data, true) : null,
                    'after' => $event->after_data ? json_decode($event->after_data, true) : null,
                ];
            }
        };

        if ($compact) {
            $data['assessmentTemplates'] = $assessmentTemplates;
            $data['activities'] = $activityRows->map(static fn ($event) => [
                'id' => (string) $event->id,
                'at' => $event->recorded_at.'Z',
                'who' => $event->actor_name ?? 'Sistem',
                'action' => $event->action,
                'detail' => $event->reason ?? $event->subject_type.' #'.$event->subject_id,
                'summary' => $event->summary,
            ])->all();
        } elseif ($global) {
            // Stream large snapshots in batches, using the same audit boundary as the timeline.
            $data['assessments'] = new ArrayIterator($mapped);
            $data['activities'] = $auditQuery->select('a.*', 'u.name as actor_name')
                ->where('a.id', '<=', $audit->first()?->id ?? 0)->lazyByIdDesc(200, 'a.id', 'id')
                ->map($activity)->getIterator();
        } else {
            $data['activities'] = $audit->map($activity)->all();
        }
        if ($only !== null) {
            $data = array_intersect_key($data, array_flip($only));
        }
        $payload = ['data' => $data, 'actorId' => (string) $ctx->userId, 'cycle' => $selected ? substr($selected->assessment_month, 0, 7) : now('Asia/Jakarta')->format('Y-m')];
        if ($compact && $r->boolean('include_insights') && $selected) {
            $payload['insights'] = app(Insights::class)->forCycle($ctx, $selected->id);
        }

        return $global && ! $compact ? response()->streamJson($payload) : response()->json($payload);
    }
}
