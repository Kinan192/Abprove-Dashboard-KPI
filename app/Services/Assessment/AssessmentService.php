<?php

namespace App\Services\Assessment;

use App\Exceptions\BusinessRule;
use App\Models\Assessment;
use App\Models\AssessmentCycle;
use App\Models\AssessmentItem;
use App\Models\KpiTemplate;
use App\Queries\ScopedRecords;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use App\Services\KpiMaster\KpiFormula;
use Illuminate\Support\Facades\DB;

class AssessmentService
{
    /** Unit-head actions on a staff submission; every other action is the division head's review. */
    private const SCORER_ACTIONS = ['resubmit', 'withdraw'];

    /** Action => history event. */
    private const EVENTS = ['resubmit' => 'resubmitted', 'withdraw' => 'withdrawn', 'adjust' => 'adjusted', 'return' => 'returned', 'approve' => 'approved'];

    public function __construct(private ScopedRecords $records, private AuditWriter $audit, private AssessmentHistory $history, private DeadlinePolicy $deadlines) {}

    public function form(AccessContext $ctx, array $data): array
    {
        $heads = $ctx->role === 'kepala_divisi';
        abort_unless(in_array($ctx->role, ['kepala_unit', 'kepala_divisi']), 403);
        $cycle = AssessmentCycle::findOrFail($data['cycle_id']);
        $month = $cycle->assessment_month->format('Y-m-d');
        $id = $data[$heads ? 'subject_user_id' : 'employee_id'];
        $subject = $this->records->members($ctx, $heads, $month)->where('e.id', $id)->firstOrFail();
        if ($heads && (int) $id === $ctx->userId) {
            abort(403, 'Tidak dapat menilai diri sendiri.');
        }
        $personKey = ($heads ? 'head-' : 'staff-').$id;
        $publication = DB::table('kpi_workspace_publications')->where('assessment_month', $month)->where('person_key', $personKey)->first();
        if (($publication && ! $publication->template_id) || (! $publication && $cycle->workspace_managed)) {
            throw new BusinessRule('TEMPLATE_UNRESOLVED', 'KPI penerima pada bulan ini belum lengkap atau bobot belum 100%.', 422);
        }
        $q = KpiTemplate::where('scope_level', $heads ? 'division' : 'unit')->where('scope_key', $heads ? $subject->division_id : $subject->unit_id)
            ->when($publication, fn ($q) => $q->whereKey($publication->template_id), fn ($q) => $q->whereNull('workspace_hash'))
            ->whereNotNull('sealed_at')->where('effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month));
        $templates = $q->with('items')->get();
        if ($templates->count() !== 1) {
            throw new BusinessRule('TEMPLATE_UNRESOLVED', 'Harus ada satu versi KPI Unit/Divisi yang berlaku.', 422);
        }

        return ['subject' => (array) $subject, 'cycle' => $cycle->toArray(), 'template' => $templates->first()->toArray()];
    }

    public function store(AccessContext $ctx, array $data): array
    {
        $cycle = AssessmentCycle::whereKey($data['cycle_id'])->lockForUpdate()->firstOrFail();
        $heads = $ctx->role === 'kepala_divisi';
        $form = $this->form($ctx, $data);
        $p = (object) $form['subject'];
        $this->window($cycle, $ctx, (int) $p->division_id, (int) $p->unit_id);
        DB::table('divisions')->where('id', $p->division_id)->lockForUpdate()->firstOrFail();
        DB::table('units')->where('id', $p->unit_id)->lockForUpdate()->firstOrFail();
        DB::table($heads ? 'users' : 'employees')->where('id', $p->id)->lockForUpdate()->firstOrFail();
        $t = KpiTemplate::whereKey($form['template']['id'])->lockForUpdate()->firstOrFail();
        $items = $t->items()->lockForUpdate()->get();
        $values = $this->scores($items, $data);
        $reviewer = DB::table('scope_assignments')->where('division_id', $p->division_id)->where('role_key', 'kepala_divisi')
            ->whereNull('revoked_at')->where('assigned_at', '<=', now()->format('Y-m-d H:i:s.u'))->lockForUpdate()->first();
        if (! $reviewer) {
            throw new BusinessRule('REVIEWER_REQUIRED', 'Divisi belum memiliki Kepala Divisi aktif.');
        }
        if ($heads && (int) $reviewer->id !== $ctx->assignmentId) {
            abort(403);
        }
        $existing = Assessment::where($heads ? 'subject_user_id' : 'employee_id', $p->id)->where('cycle_id', $cycle->id)->exists();
        if ($existing) {
            throw new BusinessRule('ASSESSMENT_EXISTS', 'Penilaian sudah ada; muat ulang untuk meninjau atau memperbaiki.');
        }
        $a = Assessment::create([
            'assessment_kind' => $heads ? 'unit_head' : 'member', 'employee_id' => $heads ? null : $p->id, 'subject_user_id' => $heads ? $p->id : null,
            'head_assignment_id' => $heads ? $p->head_assignment_id : null, 'cycle_id' => $cycle->id, 'placement_id' => $p->placement_id,
            'unit_id' => $p->unit_id, 'division_id' => $p->division_id, 'position_id' => $p->position_id,
            'kpi_template_id' => $t->id, 'kpi_scope_id' => $t->scope_id, 'kpi_scope_level' => $t->scope_level, 'kpi_scope_key' => $t->scope_key,
            'scorer_user_id' => $ctx->userId, 'scorer_unit_assignment_id' => $heads ? null : $ctx->assignmentId,
            'scorer_division_assignment_id' => $heads ? $ctx->assignmentId : null, 'reviewer_user_id' => $reviewer->user_id, 'reviewer_assignment_id' => $reviewer->id,
            'employee_name_snapshot' => $p->full_name, 'nip_snapshot' => $p->nip, 'unit_name_snapshot' => $p->unit_name, 'division_name_snapshot' => $p->division_name,
            'position_name_snapshot' => $p->position_name, 'template_name_snapshot' => $t->name, 'template_version_snapshot' => $t->version,
            'expected_item_count' => $items->count(), 'status' => 'submitted', 'submitted_at' => now(),
            'positive_finding' => $data['positive_finding'] ?? null, 'negative_finding' => $data['negative_finding'] ?? null, 'total_score_raw' => $values['total'],
        ]);
        foreach ($items as $item) {
            AssessmentItem::create([
                'assessment_id' => $a->id, 'source_kpi_item_id' => $item->id, 'source_template_id' => $t->id, 'sort_order' => $item->sort_order,
                'pillar_snapshot' => $item->pillar, 'kpi_name_snapshot' => $item->name, 'numerator_snapshot' => $item->numerator, 'denominator_snapshot' => $item->denominator,
                'formula_snapshot' => $item->measurement_formula, 'target_snapshot' => $item->target_text, 'weight_percent_snapshot' => $item->weight_percent,
                'score' => (int) round($values['scores'][$item->id]), 'computed_score' => $item->workspace_definition && $item->workspace_definition['method'] === 'formula' ? $values['scores'][$item->id] : null, 'definition_snapshot' => $item->workspace_definition, 'measurement_inputs' => $values['inputs'][$item->id] ?? null,
            ]);
        }
        if ($heads) {
            $this->finalize($ctx, $a);
            $a->save();
        }
        $result = $a->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'assessment', $a->id, $heads ? 'assessment.head.final' : 'assessment.submitted', null, $result);
        $this->history->record($ctx, $heads ? 'head_finalized' : 'submitted', null, $result, ['request_id' => $data['request_id'] ?? null]);

        return $result;
    }

    public function authorize(AccessContext $ctx, int $id, string $action): Assessment
    {
        abort_unless(isset(self::EVENTS[$action]), 404);
        $a = $this->records->assessments($ctx)->whereKey($id)->firstOrFail();
        $role = in_array($action, self::SCORER_ACTIONS, true) ? 'kepala_unit' : 'kepala_divisi';
        abort_unless($a->assessment_kind === 'member' && $ctx->role === $role, 403);

        return $a;
    }

    /**
     * Pending work follows the area, not the person: the active head of the assessment's unit (scorer actions)
     * or division (review actions) continues it under their own identity, including a successor after a
     * resignation or replacement. The stored scorer/reviewer columns and every earlier history event keep the
     * original author; the history records who acted each time.
     *
     * @param  int|null  $bulk  size of the bulk approval this change belongs to
     */
    public function change(AccessContext $ctx, int $id, string $action, array $data, ?int $bulk = null): array
    {
        $this->authorize($ctx, $id, $action);
        $a = $this->records->assessments($ctx)->whereKey($id)->lockForUpdate()->firstOrFail();
        if ($a->lock_version !== (int) $data['lock_version']) {
            throw new BusinessRule('STALE_VERSION', 'Penilaian berubah; muat ulang.');
        }
        if ($a->status === 'final') {
            throw new BusinessRule('FINAL_IMMUTABLE', 'Nilai Final hanya baca.');
        }
        $cycle = AssessmentCycle::whereKey($a->cycle_id)->lockForUpdate()->firstOrFail();
        $this->window($cycle, $ctx, (int) $a->division_id, (int) $a->unit_id, $action);
        if (in_array($action, self::SCORER_ACTIONS, true) ? (int) $a->unit_id !== $ctx->unitId : (int) $a->division_id !== $ctx->divisionId) {
            throw new BusinessRule('SCOPE_CHANGED', 'Penilaian berada di luar area tanggung jawab Anda.');
        }
        $before = $a->load('items')->toArray();
        $notes = [];
        if ($action === 'withdraw') {
            $this->status($a, 'submitted');
            $a->items()->delete();
            $a->delete();
            $result = ['assessment_id' => $id, 'employee_id' => $a->employee_id, 'cycle_id' => $a->cycle_id, 'status' => 'not_started', 'deleted' => true];
            $this->audit->record($ctx, 'assessment', $id, 'assessment.withdrawn', $before, $result);
            $this->history->record($ctx, 'withdrawn', $before, null, ['request_id' => $data['request_id'] ?? null]);

            return $result;
        }
        if ($action === 'resubmit') {
            $this->status($a, 'returned');
            // A return with KPI notes reopens only those KPIs; a return without them reopens the whole sheet.
            $this->rescore($a, $data, array_map('intval', array_keys($a->return_notes ?? [])));
            $a->positive_finding = $data['positive_finding'] ?? null;
            $a->negative_finding = $data['negative_finding'] ?? null;
            $a->status = 'submitted';
            $a->submitted_at = now();
            $a->return_reason = null;
            $a->return_notes = null;
        } elseif ($action === 'adjust') {
            $this->status($a, 'submitted');
            $notes = $this->review($a, $data['reviews']);
        } elseif ($action === 'return') {
            $this->status($a, 'submitted');
            $notes = $this->notes($a, $data['item_notes'] ?? []);
            $reason = trim((string) ($data['reason'] ?? ''));
            if ($reason === '' && ! $notes) {
                throw new BusinessRule('RETURN_REASON_REQUIRED', 'Isi catatan pada KPI yang perlu diperbaiki atau alasan pengembalian.', 422);
            }
            $a->status = 'returned';
            // Notes on the KPIs are enough; the stored reason then summarises them for lists and notifications.
            $a->return_reason = $reason !== '' ? $reason : 'Perbaiki '.count($notes).' KPI sesuai catatan Kepala Divisi.';
            $a->return_notes = $notes ?: null;
        } else {
            $this->status($a, 'submitted');
            if (! empty($data['reviews'])) {
                $notes = $this->review($a, $data['reviews']);
            }
            $this->finalize($ctx, $a);
        }
        $a->lock_version++;
        $a->save();
        $result = $a->fresh()->load('items')->toArray();
        if ($action === 'adjust' && ! AssessmentHistory::itemChanges($before, $result)) {
            throw new BusinessRule('NO_CHANGES', 'Tidak ada nilai yang berubah.', 422);
        }
        $this->audit->record($ctx, 'assessment', $id, 'assessment.'.$action, $before, $result, $data['reason'] ?? null);
        $this->history->record($ctx, self::EVENTS[$action], $before, $result, [
            'note' => $data['reason'] ?? null, 'notes' => $notes, 'bulk' => $bulk, 'request_id' => $data['request_id'] ?? null,
        ]);

        return $result;
    }

    /**
     * Rescores the captured sheet with the same formula and weight validation as a new submission (unit head
     * revision of a returned assessment). Reviewed scores of the previous submission no longer apply.
     */
    /**
     * @param  list<int>  $reopened  source KPI ids the division head returned with a note; when given, every other
     *                               KPI must keep its submitted score (it is locked for the unit head)
     */
    private function rescore(Assessment $a, array $data, array $reopened = []): void
    {
        $items = $a->items()->lockForUpdate()->get();
        $values = $this->scores($items->map(fn ($item) => (object) [
            'id' => $item->source_kpi_item_id, 'weight_percent' => $item->weight_percent_snapshot, 'workspace_definition' => $item->definition_snapshot,
        ]), $data);
        if ($reopened) {
            // Locked KPIs keep the submitted proposal whatever the client sent; the total is rebuilt from it.
            $total = '0';
            foreach ($items as $item) {
                $id = (int) $item->source_kpi_item_id;
                if (! in_array($id, $reopened, true)) {
                    $values['scores'][$id] = self::proposal($item);
                }
                $total = bcadd($total, self::weighted((string) $values['scores'][$id], (string) $item->weight_percent_snapshot), 6);
            }
            $values['total'] = $total;
        }
        foreach ($items as $item) {
            if ($reopened && ! in_array((int) $item->source_kpi_item_id, $reopened, true)) {
                // Locked KPI keeps the unit head's submitted score; earlier KD corrections no longer apply.
                if ($item->reviewed_score !== null) {
                    $item->reviewed_score = null;
                    $item->save();
                }

                continue;
            }
            $value = $values['scores'][$item->source_kpi_item_id];
            $item->score = (int) round($value);
            $item->computed_score = ($item->definition_snapshot['method'] ?? null) === 'formula' ? $value : null;
            $item->measurement_inputs = $values['inputs'][$item->source_kpi_item_id] ?? null;
            $item->reviewed_score = null;
            $item->save();
        }
        $a->total_score_raw = $values['total'];
    }

    /**
     * Applies division head reviewed scores to a submitted staff assessment. The unit head's proposal (score,
     * computed_score) and formula measurements stay as submitted; a null score or one equal to the proposal
     * restores the proposal. Formula KPIs take 0–100 (request validation: at most 2 decimals); manual KPIs keep the
     * unit head's scale, an integer 10–100. Notes and the general reason are optional; history records every change.
     *
     * @param  list<array{source_kpi_item_id: int, score: int|float|string|null, note?: ?string}>  $rows
     * @return array<int, string> non-empty notes keyed by source KPI item id
     */
    private function review(Assessment $a, array $rows): array
    {
        $items = $a->items()->lockForUpdate()->get()->keyBy(fn ($item) => (int) $item->source_kpi_item_id);
        $notes = [];
        foreach ($rows as $row) {
            $id = (int) $row['source_kpi_item_id'];
            $item = $items->get($id) ?? throw new BusinessRule('REVIEW_ITEM_UNKNOWN', 'Koreksi merujuk KPI di luar penilaian ini.', 422);
            $value = $row['score'] === null || $row['score'] === '' ? null : bcadd((string) $row['score'], '0', 6);
            $formula = ($item->definition_snapshot['method'] ?? null) === 'formula';
            if ($value !== null && ! $formula && (bccomp($value, bcadd($value, '0', 0), 6) !== 0 || bccomp($value, '10', 6) < 0 || bccomp($value, '100', 6) > 0)) {
                throw new BusinessRule('INVALID_SCORE', 'Nilai KD untuk KPI manual '.$item->kpi_name_snapshot.' harus bilangan bulat 10–100.', 422);
            }
            if ($value !== null && bccomp($value, self::proposal($item), 6) === 0) {
                $value = null;
            }
            $old = $item->reviewed_score === null ? null : bcadd((string) $item->reviewed_score, '0', 6);
            $note = trim((string) ($row['note'] ?? ''));
            if ($note !== '') {
                $notes[$id] = $note;
            }
            if ($old === $value) {
                continue;
            }
            $item->reviewed_score = $value;
            $item->save();
        }
        $total = '0';
        foreach ($items as $item) {
            $total = bcadd($total, self::weighted($item->reviewed_score === null ? self::proposal($item) : (string) $item->reviewed_score, (string) $item->weight_percent_snapshot), 6);
        }
        $a->total_score_raw = $total;

        return $notes;
    }

    /** The unit head's proposed score of an item: the formula result, else the manual score. */
    private static function proposal(AssessmentItem $item): string
    {
        return bcadd((string) ($item->getAttributes()['computed_score'] ?? $item->getAttributes()['score']), '0', 6);
    }

    /**
     * assessment_items.weighted_result_raw is DECIMAL(12,6) and MySQL rounds half-up on store; the
     * protect_assessment_update trigger requires the total to equal the sum of those stored values.
     */
    private static function weighted(string $value, string $weight): string
    {
        return bcadd(bcdiv(bcmul($value, $weight, 10), '100', 10), '0.0000005', 6);
    }

    /** @return array<int, string> non-empty division head notes keyed by source KPI item id */
    private function notes(Assessment $a, array $rows): array
    {
        $ids = $a->items->pluck('source_kpi_item_id')->map(fn ($id) => (int) $id)->all();
        $notes = [];
        foreach ($rows as $row) {
            $id = (int) $row['source_kpi_item_id'];
            if (! in_array($id, $ids, true)) {
                throw new BusinessRule('NOTE_ITEM_UNKNOWN', 'Catatan merujuk KPI di luar penilaian ini.', 422);
            }
            $note = trim((string) ($row['note'] ?? ''));
            if ($note !== '') {
                $notes[$id] = $note;
            }
        }

        return $notes;
    }

    private function scores($items, array $data): array
    {
        $input = collect($data['scores'])->keyBy('source_kpi_item_id');
        if ($input->count() !== $items->count() || array_diff($input->keys()->all(), $items->pluck('id')->all())) {
            throw new BusinessRule('SCORES_INCOMPLETE', 'Kirim tepat seluruh indikator KPI.', 422);
        }
        $weight = '0';
        $total = '0';
        $scores = [];
        $inputs = [];
        foreach ($items as $item) {
            $definition = $item->workspace_definition;
            if ($definition && $definition['method'] === 'formula') {
                $computed = app(KpiFormula::class)->score($definition, $input[$item->id]['inputs'] ?? []);
                $value = $computed['score'];
                $inputs[$item->id] = $computed['inputs'];
            } else {
                $raw = $input[$item->id]['score'] ?? null;
                if (! preg_match('/^\d+$/D', (string) $raw) || $raw < 10 || $raw > 100) {
                    throw new BusinessRule('INVALID_SCORE', 'Nilai manual harus bilangan bulat 10–100.', 422);
                }
                $value = (int) $raw;
                $inputs[$item->id] = ['value' => $value];
            }
            $scores[$item->id] = $value;
            $weight = bcadd($weight, (string) $item->weight_percent, 4);
            $total = bcadd($total, self::weighted((string) $value, (string) $item->weight_percent), 6);
        }
        if (bccomp($weight, '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Bobot KPI harus 100%.', 422);
        }

        return ['scores' => $scores, 'total' => $total, 'inputs' => $inputs];
    }

    private function finalize(AccessContext $ctx, Assessment $a): void
    {
        // Any active head of the assessment's division may finalize, including a successor of the routed reviewer.
        abort_unless($ctx->role === 'kepala_divisi' && (int) $a->division_id === $ctx->divisionId, 403);
        $this->seal($a, $ctx->userId, $ctx->assignmentId, DB::table('users')->where('id', $ctx->userId)->value('name'));
    }

    /**
     * Period close: every submission still waiting for the division head becomes Final with the score in force
     * (the unit head's proposal, or the division head's saved corrections). The routed reviewer stays the
     * finalizer of record (no assignment), the name snapshot says it was automatic and the history keeps
     * the closing Super HC as actor. Returned and missing assessments are left as they are: "Tidak dinilai".
     */
    public function autoFinalize(AccessContext $ctx, int $cycleId): int
    {
        $count = 0;
        foreach (Assessment::where('cycle_id', $cycleId)->where('status', 'submitted')->lockForUpdate()->get() as $a) {
            $before = $a->load('items')->toArray();
            $this->seal($a, (int) $a->reviewer_user_id, null, 'Otomatis saat periode ditutup');
            $a->lock_version++;
            $a->save();
            $after = $a->fresh()->load('items')->toArray();
            $this->audit->record($ctx, 'assessment', $a->id, 'assessment.auto_finalized', $before, $after, 'Periode ditutup');
            $this->history->record($ctx, 'auto_finalized', $before, $after, ['note' => 'Difinalkan otomatis saat periode ditutup.']);
            $count++;
        }

        return $count;
    }

    private function seal(Assessment $a, int $userId, ?int $assignmentId, ?string $name): void
    {
        $category = DB::table('cycle_categories')->where('cycle_id', $a->cycle_id)->where('lower_bound', '<=', $a->total_score_raw)
            ->where(fn ($q) => $q->whereNull('upper_bound')->orWhere('upper_bound', '>', $a->total_score_raw))->get();
        if ($category->count() !== 1) {
            throw new BusinessRule('CATEGORY_UNRESOLVED', 'Kategori belum valid.', 422);
        }
        $c = $category->first();
        $a->status = 'final';
        $a->finalized_at = now();
        $a->finalized_by = $userId;
        $a->finalized_assignment_id = $assignmentId;
        $a->finalized_by_name_snapshot = $name;
        $a->category_code_snapshot = $c->code;
        $a->category_label_snapshot = $c->label;
        $a->category_lower_snapshot = $c->lower_bound;
        $a->category_upper_snapshot = $c->upper_bound;
    }

    private function status(Assessment $a, string $expected): void
    {
        if ($a->status !== $expected) {
            throw new BusinessRule('INVALID_TRANSITION', 'Tindakan tidak tersedia pada status ini.');
        }
    }

    /**
     * Writes need an open cycle that has started and the actor's effective deadline for the assessment's area
     * (schedule plus approved extensions, see DeadlinePolicy). The closing date no longer blocks on its own:
     * an extension may run past it, and Super HC closes the period explicitly.
     */
    private function window(AssessmentCycle $cycle, AccessContext $ctx, ?int $divisionId, ?int $unitId, ?string $action = null): void
    {
        if ($cycle->status !== 'open' || now()->lt($cycle->opens_at)) {
            throw new BusinessRule('CYCLE_NOT_WRITABLE', 'Periode belum dibuka atau sudah ditutup.');
        }
        if (now()->gt($this->deadlines->forAction($cycle, $ctx->role, $divisionId, $unitId, $action))) {
            throw new BusinessRule('CYCLE_NOT_WRITABLE', 'Tenggat untuk area ini telah lewat. Ajukan perpanjangan kepada Super HC.');
        }
    }
}
