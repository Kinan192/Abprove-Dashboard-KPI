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
use Illuminate\Support\Facades\DB;

class AssessmentService
{
    public function __construct(private ScopedRecords $records, private AuditWriter $audit) {}

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
        $q = KpiTemplate::where('scope_level', $heads ? 'division' : 'unit')->where('scope_key', $heads ? $subject->division_id : $subject->unit_id)
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
        $this->window($cycle, $ctx);
        $heads = $ctx->role === 'kepala_divisi';
        $form = $this->form($ctx, $data);
        $p = (object) $form['subject'];
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
                'score' => $values['scores'][$item->id],
            ]);
        }
        if ($heads) {
            $this->finalize($ctx, $a);
            $a->save();
        }
        $result = $a->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'assessment', $a->id, $heads ? 'assessment.head.final' : 'assessment.submitted', null, $result);

        return $result;
    }

    public function authorize(AccessContext $ctx, int $id, string $action): Assessment
    {
        $a = $this->records->assessments($ctx)->whereKey($id)->firstOrFail();
        $score = $ctx->role === 'kepala_unit' && $a->assessment_kind === 'member';
        $review = $ctx->role === 'kepala_divisi' && $a->assessment_kind === 'member';
        abort_unless(in_array($action, ['resubmit', 'withdraw']) ? $score : $review, 403);

        return $a;
    }

    public function change(AccessContext $ctx, int $id, string $action, array $data): array
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
        $this->window($cycle, $ctx);
        $before = $a->load('items')->toArray();
        if (in_array($action, ['return', 'approve']) && $a->reviewer_assignment_id != $ctx->assignmentId) {
            throw new BusinessRule('SCOPE_CHANGED', 'Penanggung jawab pengajuan berubah.');
        }
        if (in_array($action, ['resubmit', 'withdraw']) && $a->scorer_unit_assignment_id != $ctx->assignmentId) {
            throw new BusinessRule('SCOPE_CHANGED', 'Penanggung jawab pengisian berubah.');
        }
        if ($action === 'withdraw') {
            $this->status($a, 'submitted');
            $a->items()->delete();
            $a->delete();
            $result = ['assessment_id' => $id, 'employee_id' => $a->employee_id, 'cycle_id' => $a->cycle_id, 'status' => 'not_started', 'deleted' => true];
            $this->audit->record($ctx, 'assessment', $id, 'assessment.withdrawn', $before, $result);

            return $result;
        }
        if ($action === 'resubmit') {
            $this->status($a, 'returned');
            $source = $a->items()->lockForUpdate()->get()->map(function ($item) {
                $item->weight_percent = $item->weight_percent_snapshot;
                $item->id = $item->source_kpi_item_id;

                return $item;
            });
            $values = $this->scores($source, $data);
            foreach ($a->items()->lockForUpdate()->get() as $item) {
                $item->score = $values['scores'][$item->source_kpi_item_id];
                $item->save();
            }
            $a->positive_finding = $data['positive_finding'] ?? null;
            $a->negative_finding = $data['negative_finding'] ?? null;
            $a->status = 'submitted';
            $a->total_score_raw = $values['total'];
            $a->submitted_at = now();
            $a->return_reason = null;
        } elseif ($action === 'return') {
            $this->status($a, 'submitted');
            $a->status = 'returned';
            $a->return_reason = trim($data['reason']);
        } elseif ($action === 'approve') {
            $this->status($a, 'submitted');
            $this->finalize($ctx, $a);
        } else {
            abort(404);
        }
        $a->lock_version++;
        $a->save();
        $result = $a->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'assessment', $id, 'assessment.'.$action, $before, $result, $data['reason'] ?? null);

        return $result;
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
        foreach ($items as $item) {
            $value = (int) $input[$item->id]['score'];
            $scores[$item->id] = $value;
            $weight = bcadd($weight, (string) $item->weight_percent, 4);
            $total = bcadd($total, bcdiv(bcmul((string) $value, (string) $item->weight_percent, 6), '100', 6), 6);
        }
        if (bccomp($weight, '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Bobot KPI harus 100%.', 422);
        }

        return ['scores' => $scores, 'total' => $total];
    }

    private function finalize(AccessContext $ctx, Assessment $a): void
    {
        abort_unless($ctx->role === 'kepala_divisi' && $a->reviewer_user_id == $ctx->userId, 403);
        $category = DB::table('cycle_categories')->where('cycle_id', $a->cycle_id)->where('lower_bound', '<=', $a->total_score_raw)
            ->where(fn ($q) => $q->whereNull('upper_bound')->orWhere('upper_bound', '>', $a->total_score_raw))->get();
        if ($category->count() !== 1) {
            throw new BusinessRule('CATEGORY_UNRESOLVED', 'Kategori belum valid.', 422);
        }
        $c = $category->first();
        $a->status = 'final';
        $a->finalized_at = now();
        $a->finalized_by = $ctx->userId;
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

    private function window(AssessmentCycle $cycle, AccessContext $ctx): void
    {
        $deadline = $ctx->role === 'kepala_unit' ? 'submission_due_at' : 'approval_due_at';
        if ($cycle->status !== 'open' || now()->lt($cycle->opens_at) || now()->gt($cycle->$deadline) || now()->gt($cycle->closes_at)) {
            throw new BusinessRule('CYCLE_NOT_WRITABLE', 'Periode belum dibuka atau tenggat telah lewat.');
        }
    }
}
