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

    public function authorize(AccessContext $ctx, int $id, string $action): Assessment
    {
        $a = $this->records->assessments($ctx)->whereKey($id)->firstOrFail();
        $canScore = ($ctx->role === 'kepala_unit' && $a->assessment_kind === 'member') ||
            ($ctx->role === 'kepala_divisi' && $a->assessment_kind === 'unit_head');
        if (in_array($action, ['draft', 'submit', 'withdraw']) && ! $canScore) {
            abort(403);
        }
        if (in_array($action, ['approve', 'return']) && ($ctx->role !== 'kepala_divisi' || $a->assessment_kind !== 'member')) {
            abort(403);
        }

        return $a;
    }

    public function start(AccessContext $ctx, array $data): array
    {
        if (! in_array($ctx->role, ['kepala_unit', 'kepala_divisi'])) {
            abort(403);
        }
        $cycle = AssessmentCycle::whereKey($data['cycle_id'])->lockForUpdate()->firstOrFail();
        $this->window($cycle, $ctx->role === 'kepala_unit' ? 'submission_due_at' : 'approval_due_at');
        $employee = DB::table('employees')->where('id', $data['employee_id'])->lockForUpdate()->firstOrFail();
        $heads = $ctx->role === 'kepala_divisi';
        $member = $this->records->members($ctx, $heads)->where('e.id', $employee->id)
            ->select('e.*', 'p.id as placement_id', 'p.unit_id', 'p.division_id', 'u.name as unit_name', 'd.name as division_name', 'j.name as position_name')->firstOrFail();
        if ((int) $employee->user_id === $ctx->userId) {
            abort(403, 'Tidak dapat menilai diri sendiri.');
        }
        DB::table('employee_placements')->where('id', $member->placement_id)->lockForUpdate()->firstOrFail();
        DB::table('units')->where('id', $member->unit_id)->lockForUpdate()->firstOrFail();
        DB::table('divisions')->where('id', $member->division_id)->lockForUpdate()->firstOrFail();
        DB::table('positions')->where('id', $member->position_id)->lockForUpdate()->firstOrFail();
        $assignment = null;
        if ($heads) {
            $assignments = DB::table('scope_assignments')->where('user_id', $employee->user_id)
                ->whereNull('revoked_at')->where('assigned_at', '<=', now()->format('Y-m-d H:i:s.u'))->lockForUpdate()->get();
            if ($assignments->count() !== 1 || $assignments->first()->role_key !== 'kepala_unit' || (int) $assignments->first()->unit_id !== (int) $member->unit_id) {
                throw new BusinessRule('CONTEXT_UNRESOLVED', 'Penugasan Kepala Unit ambigu (O-5).');
            }
            $assignment = $assignments->first()->id;
        }
        if (Assessment::where('employee_id', $employee->id)->where('cycle_id', $cycle->id)->exists()) {
            throw new BusinessRule('ASSESSMENT_EXISTS', 'Penilaian karyawan pada periode ini sudah ada.');
        }
        $month = $cycle->assessment_month->format('Y-m-d');
        $templates = KpiTemplate::where('position_id', $employee->position_id)->where('template_year', $cycle->assessment_month->year)
            ->where('status', 'published')->where(fn ($q) => $q->whereNull('effective_from')->orWhere('effective_from', '<=', $month))
            ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month))->get();
        if ($templates->count() !== 1) {
            throw new BusinessRule('TEMPLATE_UNRESOLVED', 'Harus ada tepat satu template published yang berlaku untuk jabatan dan periode ini.');
        }
        $template = $templates->first();
        $a = Assessment::create([
            'employee_id' => $employee->id, 'cycle_id' => $cycle->id, 'placement_id' => $member->placement_id,
            'division_id' => $member->division_id, 'unit_id' => $member->unit_id, 'position_id' => $employee->position_id,
            'kpi_template_id' => $template->id, 'assessment_kind' => $heads ? 'unit_head' : 'member', 'head_assignment_id' => $assignment,
            'employee_name_snapshot' => $employee->full_name, 'nip_snapshot' => $employee->nip,
            'division_name_snapshot' => $member->division_name, 'unit_name_snapshot' => $member->unit_name,
            'position_name_snapshot' => $member->position_name, 'template_name_snapshot' => $template->name, 'template_version_snapshot' => $template->version,
        ]);
        foreach ($template->items as $item) {
            AssessmentItem::create([
                'assessment_id' => $a->id, 'source_kpi_item_id' => $item->id, 'source_template_id' => $template->id,
                'sort_order' => $item->sort_order, 'pillar_snapshot' => $item->pillar, 'kpi_name_snapshot' => $item->name,
                'numerator_snapshot' => $item->numerator, 'denominator_snapshot' => $item->denominator,
                'formula_snapshot' => $item->measurement_formula, 'target_snapshot' => $item->target_text,
                'weight_percent_snapshot' => $item->weight_percent,
            ]);
        }
        $result = $a->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'assessment', $a->id, 'assessment.started', null, $result);

        return $result;
    }

    public function change(AccessContext $ctx, int $id, string $action, array $data): array
    {
        $this->authorize($ctx, $id, $action);
        $a = $this->records->assessments($ctx)->whereKey($id)->lockForUpdate()->firstOrFail();
        if ($a->lock_version !== (int) $data['lock_version']) {
            throw new BusinessRule('STALE_VERSION', 'Data telah berubah. Muat ulang sebelum melanjutkan.');
        }
        if ($a->status === 'final') {
            throw new BusinessRule('FINAL_IMMUTABLE', 'Keputusan Kepala Divisi sudah Final dan terkunci.');
        }
        $cycle = AssessmentCycle::whereKey($a->cycle_id)->lockForUpdate()->firstOrFail();
        $deadline = $ctx->role === 'kepala_unit' ? 'submission_due_at' : 'approval_due_at';
        $this->window($cycle, $deadline);
        $before = $a->load('items')->toArray();
        $items = $a->items()->lockForUpdate()->get()->keyBy('id');
        if ($action === 'draft') {
            $this->status($a, ['draft', 'returned']);
            foreach ($data['scores'] ?? [] as $input) {
                $item = $items->get((int) $input['id']);
                if (! $item) {
                    throw new BusinessRule('INVALID_ITEM', 'Item bukan milik penilaian ini.', 422);
                }
                $item->score = $input['score'];
                $item->save();
            }
            foreach (['positive_finding', 'negative_finding'] as $field) {
                if (array_key_exists($field, $data)) {
                    $a->$field = $data[$field];
                }
            }
            $a->total_score_raw = $this->total($a, false);
        } elseif ($action === 'submit') {
            $this->status($a, ['draft', 'returned']);
            $a->total_score_raw = $this->total($a, true);
            $a->submitted_at = now();
            if ($a->assessment_kind === 'unit_head') {
                $this->finalize($ctx, $a);
            } else {
                $a->status = 'submitted';
            }
        } elseif ($action === 'withdraw') {
            $this->status($a, ['submitted']);
            $a->status = 'draft';
            $a->submitted_at = null;
        } elseif ($action === 'return') {
            $this->status($a, ['submitted']);
            $a->status = 'returned';
        } elseif ($action === 'approve') {
            $this->status($a, ['submitted']);
            $this->finalize($ctx, $a);
        } else {
            abort(404);
        }
        $a->lock_version++;
        $a->save();
        $result = $a->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'assessment', $a->id, 'assessment.'.$action, $before, $result, $data['reason'] ?? null);

        return $result;
    }

    private function finalize(AccessContext $ctx, Assessment $a): void
    {
        if ($ctx->role !== 'kepala_divisi') {
            abort(403);
        }
        $total = $this->total($a, true);
        $categories = DB::table('cycle_categories')->where('cycle_id', $a->cycle_id)->where('lower_bound', '<=', $total)
            ->where(fn ($q) => $q->whereNull('upper_bound')->orWhere('upper_bound', '>', $total))->get();
        if ($categories->count() !== 1) {
            throw new BusinessRule('CATEGORY_UNRESOLVED', 'Kategori nilai belum valid. Hubungi Super HC.');
        }
        $c = $categories->first();
        $a->status = 'final';
        $a->total_score_raw = $total;
        $a->approved_at = $a->finalized_at = now();
        $a->approved_by = $a->finalized_by = $ctx->userId;
        $a->category_code_snapshot = $c->code;
        $a->category_label_snapshot = $c->label;
        $a->category_lower_snapshot = $c->lower_bound;
        $a->category_upper_snapshot = $c->upper_bound;
    }

    private function total(Assessment $a, bool $required): ?string
    {
        $stats = $a->items()->selectRaw('COUNT(*) AS n, COUNT(score) AS filled, SUM(weight_percent_snapshot) AS weight, SUM(weighted_result_raw) AS total')->first();
        if (! $stats->n || bccomp((string) $stats->weight, '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Total bobot penilaian harus tepat 100%.', 422);
        }
        if ($stats->n !== $stats->filled) {
            if ($required) {
                throw new BusinessRule('SCORES_INCOMPLETE', 'Lengkapi seluruh nilai 10 sampai 100.', 422);
            }

            return null;
        }

        return bcadd((string) $stats->total, '0', 6);
    }

    private function status(Assessment $a, array $allowed): void
    {
        if (! in_array($a->status, $allowed)) {
            throw new BusinessRule('INVALID_TRANSITION', 'Tindakan tidak tersedia pada status ini.');
        }
    }

    private function window(AssessmentCycle $cycle, string $deadline): void
    {
        if ($cycle->status !== 'open' || now()->lt($cycle->opens_at) || now()->gt($cycle->$deadline) || now()->gt($cycle->closes_at)) {
            throw new BusinessRule('CYCLE_NOT_WRITABLE', 'Periode belum dibuka atau tenggat tindakan telah berakhir (guard O-9).');
        }
    }
}
