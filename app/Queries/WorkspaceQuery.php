<?php

namespace App\Queries;

use App\Models\User;
use App\Services\Assessment\DeadlinePolicy;
use App\Services\IdentityAccess\AccessContext;
use App\Services\Reporting\Insights;
use App\ViewModels\AbproveDesign;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Client workspace for one page profile. Only requested sections are queried, and assessments,
 * roster history, publications and templates are bounded by the profile month window.
 */
class WorkspaceQuery
{
    private const NOTIFICATION_PREVIEW = 20;

    private const ACCOUNT_ROLES = ['admin' => 'adm', 'super_hc' => 'hc', 'kepala_divisi' => 'kd', 'kepala_unit' => 'ku'];

    private const STATUS = ['submitted' => 'Diajukan', 'returned' => 'Dikembalikan', 'final' => 'Final'];

    private const ASSESSMENT_COLUMNS = ['id', 'cycle_id', 'assessment_kind', 'employee_id', 'subject_user_id', 'unit_id', 'division_id', 'kpi_template_id', 'status', 'lock_version',
        'total_score_raw', 'positive_finding', 'negative_finding', 'return_reason', 'return_notes', 'employee_name_snapshot', 'nip_snapshot', 'position_name_snapshot', 'unit_name_snapshot',
        'division_name_snapshot', 'template_name_snapshot', 'template_version_snapshot', 'category_label_snapshot', 'category_code_snapshot'];

    private const ITEM_COLUMNS = ['assessment_id', 'source_kpi_item_id', 'score', 'computed_score', 'reviewed_score', 'measurement_inputs', 'pillar_snapshot', 'kpi_name_snapshot', 'target_snapshot',
        'weight_percent_snapshot', 'numerator_snapshot', 'denominator_snapshot', 'formula_snapshot', 'definition_snapshot'];

    public function __construct(private ScopedRecords $records, private AssessmentTasks $tasks, private Insights $insights, private DeadlinePolicy $deadlines) {}

    /**
     * @param  list<string>|null  $only  subset of the profile sections, null for all of them
     * @param  list<int>|null  $assessmentIds  restricts assessments to these rows (mutation updates)
     */
    public function build(AccessContext $ctx, User $user, string $profile, ?array $only, ?string $cycleKey, ?array $assessmentIds = null, bool $withInsights = false): array
    {
        $definition = AbproveDesign::WORKSPACE_PROFILES[$profile];
        $sections = $only === null ? $definition['sections'] : array_values(array_intersect($definition['sections'], $only));
        $needs = fn (string $section) => in_array($section, $sections, true);
        $history = $definition['history'] ?? [];
        $global = $ctx->role === 'super_hc';

        $cycles = DB::table('assessment_cycles')->select('id', 'assessment_month', 'status', 'opens_at', 'submission_due_at', 'approval_due_at', 'closes_at', 'workspace_managed')
            ->orderBy('assessment_month')->get();
        $selected = $cycles->firstWhere('assessment_month', ($cycleKey ?? now('Asia/Jakarta')->format('Y-m')).'-01') ?? $cycles->last();
        $month = CarbonImmutable::parse($selected->assessment_month ?? now('Asia/Jakarta')->format('Y-m-01'));
        $first = match ($definition['window']) {
            'previous' => $month->subMonth(),
            'year' => $month->startOfYear(),
            default => $month,
        };
        $last = $definition['window'] === 'year' ? $month->endOfYear()->startOfMonth() : $month;
        // Month bounds as stored dates: first loaded month, last loaded month and the month after it.
        $start = $first->format('Y-m-d');
        $end = $last->format('Y-m-d');
        $after = $last->addMonth()->format('Y-m-d');
        $windowCycles = $definition['window'] === 'none' || ! $needs('assessments') ? collect()
            : $cycles->filter(fn ($c) => $c->assessment_month >= $start && $c->assessment_month <= $end);

        $units = $this->records->units($ctx)->select('id', 'name', 'code', 'division_id', 'is_active')->orderBy('id')->get()->keyBy('id');
        $unitIds = $units->keys();
        $divisions = DB::table('divisions')->select('id', 'name', 'code', 'is_active')->when(! $global, fn ($q) => $q->where('id', $ctx->divisionId))->orderBy('id')->get();
        $divisionIds = $divisions->pluck('id');

        $assessments = $windowCycles->isEmpty() ? collect() : $this->records->assessments($ctx)->toBase()->select(self::ASSESSMENT_COLUMNS)
            ->whereIn('cycle_id', $windowCycles->pluck('id'))
            // Reports read earlier months only through Final results.
            ->when($definition['window'] === 'year', fn ($q) => $q->where(fn ($q) => $q->where('cycle_id', $selected->id)->orWhere('status', 'final')))
            ->when($assessmentIds !== null, fn ($q) => $q->whereIn('id', $assessmentIds))
            ->orderBy('id')->get();

        $assignments = DB::table('scope_assignments')->select('id', 'user_id', 'role_key', 'unit_id', 'division_id', 'assigned_at', 'revoked_at')
            ->where(fn ($q) => $q->whereIn('unit_id', $unitIds)->orWhereIn('division_id', $divisionIds)->orWhere('user_id', $ctx->userId))
            // Active assignments give current heads; revoked head rows are history, kept only within the loaded months.
            ->when(! ($needs('heads') && in_array('heads', $history, true)), fn ($q) => $q->where(fn ($q) => $q->whereNull('revoked_at')
                ->when($needs('heads'), fn ($q) => $q->orWhere(fn ($q) => $q->where('role_key', 'kepala_unit')
                    ->where('revoked_at', '>=', $first->addMonth()->format('Y-m-d'))->where('assigned_at', '<', $after)))))
            ->orderBy('id')->get();
        $activeHeads = $assignments->whereNull('revoked_at')->groupBy('role_key')->map(fn ($rows, $role) => $rows->keyBy($role === 'kepala_unit' ? 'unit_id' : 'division_id'));
        $unitHeads = $assignments->where('role_key', 'kepala_unit')->filter(fn ($h) => $units->has($h->unit_id));

        $placements = collect();
        $employees = collect();
        if ($needs('staff')) {
            $placements = DB::table('employee_placements')->select('id', 'employee_id', 'unit_id', 'effective_from', 'effective_until')
                ->when(! $global, fn ($q) => $q->whereIn('unit_id', $unitIds))
                ->when(! in_array('staff', $history, true), fn ($q) => $q->where('effective_from', '<', $after)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $start)))
                ->orderBy('effective_from')->get();
            $employees = DB::table('employees')->select('id', 'full_name', 'nip', 'position_id', 'is_active')
                ->when(! ($global && in_array('staff', $history, true)), fn ($q) => $q->whereIn('id', $placements->pluck('employee_id')->merge($assessments->pluck('employee_id'))->filter()->unique()))
                ->orderBy('id')->get();
        }
        $placementsByEmployee = $placements->groupBy('employee_id');

        $data = [];
        if ($needs('accounts')) {
            $userIds = $assignments->pluck('user_id')->merge($assessments->pluck('subject_user_id'))->push($ctx->userId)->filter()->unique();
            $data['accounts'] = DB::table('users')->select('id', 'name', 'login_nip', 'email', 'role_key', 'is_active')->when(! $global, fn ($q) => $q->whereIn('id', $userIds))->orderBy('id')->get()
                ->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'nip' => $u->login_nip ?? '', 'email' => $u->email ?? '', 'role' => self::ACCOUNT_ROLES[$u->role_key], 'active' => (bool) $u->is_active])->all();
        }
        if ($needs('positions')) {
            $data['positions'] = DB::table('positions')->select('id', 'code', 'name', 'is_active')->when(! $global, fn ($q) => $q->whereIn('id', $employees->pluck('position_id')->unique()))->orderBy('id')->get()
                ->map(fn ($p) => ['id' => (string) $p->id, 'code' => $p->code, 'name' => $p->name, 'active' => (bool) $p->is_active])->all();
        }
        if ($needs('divisions')) {
            $data['divisions'] = $divisions->map(function ($d) use ($activeHeads) {
                $head = $activeHeads['kepala_divisi'][$d->id] ?? null;

                return ['id' => (string) $d->id, 'name' => $d->name, 'code' => $d->code, 'active' => (bool) $d->is_active, 'headId' => $head ? (string) $head->user_id : null, 'assignmentId' => $head?->id];
            })->all();
        }
        if ($needs('units')) {
            $data['units'] = $units->map(function ($u) use ($activeHeads) {
                $head = $activeHeads['kepala_unit'][$u->id] ?? null;

                return ['id' => (string) $u->id, 'name' => $u->name, 'code' => $u->code, 'divisionId' => (string) $u->division_id, 'active' => (bool) $u->is_active, 'headId' => $head ? (string) $head->user_id : null, 'assignmentId' => $head?->id];
            })->values()->all();
        }
        if ($needs('kpiUnits')) {
            $data['kpiUnits'] = $this->records->kpiUnits($ctx)->select('id', 'name', 'division_id', 'is_active')->orderBy('id')->get()
                ->map(fn ($u) => ['id' => (string) $u->id, 'name' => $u->name, 'divisionId' => (string) $u->division_id, 'active' => (bool) $u->is_active])->all();
        }
        if ($needs('staff')) {
            $data['staff'] = $employees->map(fn ($e) => ['id' => 'EMP-'.$e->id, 'dbId' => $e->id, 'name' => $e->full_name, 'nip' => $e->nip, 'positionId' => (string) $e->position_id, 'active' => (bool) $e->is_active,
                'placements' => ($placementsByEmployee[$e->id] ?? collect())->map(fn ($p) => ['id' => $p->id, 'unitId' => (string) $p->unit_id, 'from' => substr($p->effective_from, 0, 7), 'until' => $p->effective_until ? substr($p->effective_until, 0, 7) : null])->values()->all()])->all();
        }
        if ($needs('heads')) {
            $data['heads'] = $unitHeads->map(fn ($h) => ['id' => 'HEAD-'.$h->user_id, 'dbId' => $h->user_id, 'accountId' => (string) $h->user_id, 'unitId' => (string) $h->unit_id, 'divisionId' => (string) $units[$h->unit_id]->division_id,
                'from' => substr($h->assigned_at, 0, 7), 'until' => $h->revoked_at ? CarbonImmutable::parse($h->revoked_at)->subMonth()->format('Y-m') : null])->values()->all();
        }
        if ($needs('kpis')) {
            $data['kpis'] = $this->kpis($ctx, $employees, $unitHeads, in_array('kpis', $history, true) ? null : [$start, $end, $after]);
        }
        if ($needs('cycles')) {
            $data['cycles'] = $this->cycles($cycles, $ctx);
        }
        if ($needs('assessments')) {
            [$data['assessments'], $templates] = $this->assessments($assessments, $cycles->pluck('assessment_month', 'id'));
            if ($needs('assessmentTemplates')) {
                $data['assessmentTemplates'] = $templates;
            }
        }
        if ($needs('profiles')) {
            $data['profiles'] = [(string) $ctx->userId => ['name' => $user->name, 'email' => $user->email, 'phone' => $user->phone, 'notification' => $user->email_notifications, 'hasPhoto' => (bool) $user->photo_path]];
        }
        if ($needs('notifications')) {
            $data['notifications'] = $selected ? $this->tasks->summary($ctx, $selected, self::NOTIFICATION_PREVIEW) : ['items' => [], 'total' => 0, 'unread' => 0];
        }
        if ($needs('navCounts')) {
            $data['navCounts'] = $selected ? $this->tasks->navCounts($ctx, $selected) : [];
        }

        // `complete` months hold every visible status; other window months hold Final results only.
        $payload = ['data' => $data, 'actorId' => (string) $ctx->userId, 'cycle' => $month->format('Y-m'), 'window' => [
            'assessments' => $definition['window'] === 'none' ? null : ['from' => $first->format('Y-m'), 'to' => $last->format('Y-m'),
                'complete' => $definition['window'] === 'year' ? [$month->format('Y-m')] : array_values(array_unique([$first->format('Y-m'), $month->format('Y-m')]))],
        ]];
        if ($withInsights && $selected) {
            $payload['insights'] = $this->insights->forCycle($ctx, $selected->id);
        }

        return $payload;
    }

    /** Sealed templates of the scope, with person publications; bounded to [start, end] unless $range is null. */
    private function kpis(AccessContext $ctx, Collection $employees, Collection $unitHeads, ?array $range): array
    {
        $global = $ctx->role === 'super_hc';
        $personKeys = $employees->map(fn ($e) => 'staff-'.$e->id)->merge($unitHeads->pluck('user_id')->unique()->map(fn ($id) => 'head-'.$id));
        $publications = DB::table('kpi_workspace_publications')->select('id', 'person_key', 'assessment_month', 'template_id')
            ->when(! $global, fn ($q) => $q->whereIn('person_key', $personKeys))
            ->when($range !== null, fn ($q) => $q->whereBetween('assessment_month', [$range[0], $range[1]]))
            ->orderBy('id')->get();
        $kpiUnitIds = $this->records->kpiUnits($ctx)->pluck('id');
        $divisionIds = $global ? null : collect([$ctx->divisionId]);
        $templates = DB::table('kpi_templates')->select('id', 'scope_level', 'scope_key', 'name', 'version', 'effective_from', 'effective_until')->whereNotNull('sealed_at')
            ->where(fn ($q) => $q->where(fn ($q) => $q->whereNull('workspace_hash')->when($range !== null, fn ($q) => $q->where('effective_from', '<', $range[2])
                ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $range[0]))))
                ->orWhereIn('id', $publications->pluck('template_id')->filter()->unique()))
            ->where(function ($q) use ($ctx, $kpiUnitIds, $divisionIds) {
                $q->where(fn ($q) => $q->where('scope_level', 'unit')->whereIn('scope_key', $kpiUnitIds));
                if ($ctx->role !== 'kepala_unit') {
                    $q->orWhere(fn ($q) => $q->where('scope_level', 'division')->when($divisionIds !== null, fn ($q) => $q->whereIn('scope_key', $divisionIds)));
                }
            })->orderBy('version')->get();
        $items = DB::table('kpi_items')->select('id', 'template_id', 'pillar', 'name', 'numerator', 'denominator', 'measurement_formula', 'target_text', 'weight_percent', 'workspace_definition')
            ->whereIn('template_id', $templates->pluck('id'))->orderBy('template_id')->orderBy('sort_order')->get()->groupBy('template_id');
        $person = fn (string $key) => str_replace(['staff-', 'head-'], ['EMP-', 'HEAD-'], $key);
        $forPeople = $publications->whereNotNull('template_id')->groupBy('template_id');

        $kpis = $templates->map(fn ($t) => ['id' => (string) $t->id, 'level' => $t->scope_level, 'areaId' => (string) $t->scope_key, 'name' => $t->name, 'version' => $t->version,
            'from' => substr($t->effective_from, 0, 7), 'until' => $t->effective_until ? substr($t->effective_until, 0, 7) : null,
            'items' => ($items[$t->id] ?? collect())->map(fn ($i) => ['id' => (string) $i->id, 'pillar' => $i->pillar, 'name' => $i->name, 'numerator' => $i->numerator ?? '', 'denominator' => $i->denominator ?? '',
                'formula' => $i->measurement_formula ?? '', 'target' => $i->target_text, 'weight' => (float) $i->weight_percent, 'config' => $i->workspace_definition ? json_decode($i->workspace_definition, true) : null])->values()->all(),
            'forPeople' => ($forPeople[$t->id] ?? collect())->map(fn ($p) => $person($p->person_key))->values()->all()])->values();
        foreach ($publications->whereNull('template_id') as $publication) {
            $kpis->push(['id' => 'pending-'.$publication->id, 'forPeople' => [$person($publication->person_key)], 'from' => substr($publication->assessment_month, 0, 7),
                'until' => substr($publication->assessment_month, 0, 7), 'level' => '', 'areaId' => '', 'name' => 'KPI belum lengkap', 'version' => 0, 'items' => []]);
        }

        return $kpis->all();
    }

    /**
     * Cycles with the actor's effective deadlines (`mine`, WIB): Kepala Unit submission (and resubmission until the
     * approval date), Kepala Divisi approval per unit and for the whole division. Extensions push these later.
     */
    private function cycles(Collection $cycles, AccessContext $ctx): array
    {
        $categories = DB::table('cycle_categories')->select('cycle_id', 'code', 'label', 'lower_bound', 'upper_bound')->orderBy('sort_order')->get()->groupBy('cycle_id');
        $date = fn ($s) => ($s instanceof \DateTimeInterface ? CarbonImmutable::instance($s) : CarbonImmutable::parse($s, 'UTC'))->setTimezone('Asia/Jakarta')->format('Y-m-d\TH:i');

        return $cycles->map(function ($x) use ($categories, $date, $ctx) {
            $ranges = ($categories[$x->id] ?? collect())->map(fn ($c) => ['code' => $c->code, 'label' => $c->label, 'lower' => (float) $c->lower_bound, 'upper' => $c->upper_bound === null ? null : (float) $c->upper_bound])->values()->all();

            $mine = match ($ctx->role) {
                'kepala_unit' => ['submission' => $date($this->deadlines->submission($x, $ctx->unitId)), 'resubmission' => $date($this->deadlines->forAction($x, 'kepala_unit', $ctx->divisionId, $ctx->unitId, 'resubmit'))],
                'kepala_divisi' => ['approval' => $date($this->deadlines->divisionApproval($x, $ctx->divisionId)),
                    'units' => DB::table('units')->where('division_id', $ctx->divisionId)->pluck('id')->mapWithKeys(fn ($id) => [(string) $id => $date($this->deadlines->approval($x, $ctx->divisionId, (int) $id))])->all()],
                default => null,
            };

            return ['id' => substr($x->assessment_month, 0, 7), 'dbId' => $x->id, 'status' => $x->status, 'mine' => $mine, 'opens' => $date($x->opens_at), 'submission' => $date($x->submission_due_at),
                'approval' => $date($x->approval_due_at), 'closes' => $date($x->closes_at), 'ranges' => $ranges,
                'categories' => ['sb' => $ranges[3]['lower'] ?? 90, 'b' => $ranges[2]['lower'] ?? 80, 'c' => $ranges[1]['lower'] ?? 70], 'managed' => (bool) $x->workspace_managed];
        })->all();
    }

    /**
     * Assessments keyed "person|YYYY-MM". Captured KPI definitions are shared by content hash in the second
     * result; items are read per chunk so a year window never holds every item row at once.
     */
    private function assessments(Collection $assessments, Collection $months): array
    {
        $mapped = [];
        $templates = [];
        foreach ($assessments->chunk(500) as $chunk) {
            $items = DB::table('assessment_items')->select(self::ITEM_COLUMNS)->whereIn('assessment_id', $chunk->pluck('id'))
                ->orderBy('assessment_id')->orderBy('sort_order')->get()->groupBy('assessment_id');
            foreach ($chunk as $a) {
                $rows = ($items[$a->id] ?? collect())->values();
                $snapshot = ['id' => (string) $a->kpi_template_id, 'name' => $a->template_name_snapshot, 'version' => $a->template_version_snapshot,
                    'items' => $rows->map(fn ($i) => ['id' => (string) $i->source_kpi_item_id, 'pillar' => $i->pillar_snapshot, 'name' => $i->kpi_name_snapshot, 'target' => $i->target_snapshot,
                        'weight' => (float) $i->weight_percent_snapshot, 'numerator' => $i->numerator_snapshot ?? '', 'denominator' => $i->denominator_snapshot ?? '', 'formula' => $i->formula_snapshot ?? '',
                        'config' => $i->definition_snapshot === null ? null : json_decode($i->definition_snapshot, true)])->all()];
                // Share only identical captured definitions, including historical snapshots.
                $snapshotKey = hash('xxh128', json_encode($snapshot, JSON_THROW_ON_ERROR));
                $templates[$snapshotKey] ??= $snapshot;
                $person = $a->assessment_kind === 'member' ? 'EMP-'.$a->employee_id : 'HEAD-'.$a->subject_user_id;
                $entry = ['id' => $a->id, 'lockVersion' => $a->lock_version, 'status' => self::STATUS[$a->status],
                    // Scores in force: the division head's reviewed score, else the unit head's proposal.
                    'values' => $rows->map(fn ($i) => (float) ($i->reviewed_score ?? $i->computed_score ?? $i->score))->all(),
                    'positive' => $a->positive_finding ?? '', 'negative' => $a->negative_finding ?? '', 'reason' => $a->return_reason ?? '', 'serverTotal' => $a->total_score_raw,
                    'identity' => ['name' => $a->employee_name_snapshot, 'nip' => $a->nip_snapshot, 'job' => $a->position_name_snapshot, 'unitName' => $a->unit_name_snapshot, 'divisionName' => $a->division_name_snapshot],
                    'scope' => ['unitId' => (string) $a->unit_id, 'divisionId' => (string) $a->division_id],
                    'category' => $a->status === 'final' ? ['label' => $a->category_label_snapshot, 'key' => $a->category_code_snapshot] : null,
                    'snapshotKey' => $snapshotKey];
                if ($rows->contains(fn ($i) => $i->measurement_inputs !== null)) {
                    $entry['inputs'] = $rows->map(fn ($i) => $i->measurement_inputs === null ? null : json_decode($i->measurement_inputs, true))->all();
                }
                if ($rows->contains(fn ($i) => $i->reviewed_score !== null)) {
                    // Unit head proposals and division head reviewed scores (null = proposal applies), by item order.
                    $entry['proposals'] = $rows->map(fn ($i) => (float) ($i->computed_score ?? $i->score))->all();
                    $entry['reviewed'] = $rows->map(fn ($i) => $i->reviewed_score === null ? null : (float) $i->reviewed_score)->all();
                }
                if ($a->return_notes !== null) {
                    // Division head notes per KPI of the current return, keyed by source KPI item id.
                    $entry['itemNotes'] = json_decode($a->return_notes, true);
                }
                $mapped[$person.'|'.substr($months[$a->cycle_id], 0, 7)] = $entry;
            }
            unset($items);
        }

        return [$mapped, $templates];
    }
}
