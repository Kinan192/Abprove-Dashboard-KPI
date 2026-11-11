<?php

namespace App\Services\KpiMaster;

use App\Exceptions\BusinessRule;
use App\Models\AssessmentCycle;
use App\Models\KpiItem;
use App\Models\KpiTemplate;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class KpiMasterService
{
    public function __construct(private AuditWriter $audit) {}

    public function template(AccessContext $ctx, ?int $id, array $data): array
    {
        $position = DB::table('positions')->where('id', $data['position_id'])->lockForUpdate()->firstOrFail();
        if (! $position->is_active) {
            throw new BusinessRule('POSITION_INACTIVE', 'Jabatan tidak aktif.', 422);
        }
        $template = $id ? KpiTemplate::whereKey($id)->lockForUpdate()->firstOrFail() : new KpiTemplate;
        if ($id && ($template->status !== 'draft' || $template->position_id != $data['position_id'])) {
            throw new BusinessRule('TEMPLATE_IMMUTABLE', 'Hanya draft dengan jabatan yang sama dapat diubah. Buat versi baru.');
        }
        $sum = '0';
        foreach ($data['items'] as $item) {
            $sum = bcadd($sum, (string) $item['weight_percent'], 4);
        }
        if (bccomp($sum, '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Total bobot harus tepat 100%.', 422);
        }
        foreach (['effective_from', 'effective_until'] as $f) {
            if ((int) substr($data[$f], 0, 4) !== (int) $data['template_year']) {
                throw new BusinessRule('INVALID_EFFECTIVE_DATE', 'Masa berlaku harus berada pada tahun template.', 422);
            }
        }
        $before = $id ? $template->load('items')->toArray() : null;
        $template->fill(Arr::only($data, ['position_id', 'name', 'template_year', 'effective_from', 'effective_until']));
        if (! $id) {
            $template->version = 1 + (int) KpiTemplate::where('position_id', $position->id)->where('template_year', $data['template_year'])->max('version');
            $template->created_by = $ctx->userId;
        }
        $template->save();
        foreach ($template->items()->get() as $item) {
            $item->delete();
        }
        foreach (array_values($data['items']) as $i => $item) {
            KpiItem::create($item + ['template_id' => $template->id, 'sort_order' => $i + 1]);
        }
        $result = $template->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'kpi_template', $template->id, 'template.saved', $before, $result);

        return $result;
    }

    public function publish(AccessContext $ctx, int $id): array
    {
        $t = KpiTemplate::whereKey($id)->lockForUpdate()->firstOrFail();
        DB::table('positions')->where('id', $t->position_id)->lockForUpdate()->firstOrFail();
        if ($t->status !== 'draft') {
            throw new BusinessRule('TEMPLATE_IMMUTABLE', 'Template sudah dipublikasikan.');
        }
        if (! $t->items()->count() || bccomp((string) $t->items()->sum('weight_percent'), '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Total bobot harus tepat 100%.', 422);
        }
        if (KpiTemplate::where('position_id', $t->position_id)->where('template_year', $t->template_year)->where('status', 'published')
            ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $t->effective_from))
            ->where(fn ($q) => $q->whereNull('effective_from')->orWhere('effective_from', '<=', $t->effective_until))->exists()) {
            throw new BusinessRule('TEMPLATE_OVERLAP', 'Masa berlaku bertumpang tindih dengan template published lain.');
        }
        $before = $t->toArray();
        $t->status = 'published';
        $t->published_at = now();
        $t->save();
        $result = $t->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'kpi_template', $id, 'template.published', $before, $result);

        return $result;
    }

    public function cycle(AccessContext $ctx, ?int $id, array $data): array
    {
        Validator::make($data, ['assessment_month' => [Rule::unique('assessment_cycles')->ignore($id)]])->validate();
        $cycle = $id ? AssessmentCycle::whereKey($id)->lockForUpdate()->firstOrFail() : new AssessmentCycle;
        if ($id && DB::table('assessments')->where('cycle_id', $id)->exists()) {
            throw new BusinessRule('CYCLE_IN_USE', 'Jadwal dan kategori periode yang sudah digunakan tidak dapat diubah. Penutupan tersedia terpisah.');
        }
        $categories = collect($data['categories'])->sort(fn ($a, $b) => bccomp((string) $a['lower_bound'], (string) $b['lower_bound'], 6))->values();
        $expected = '0';
        foreach ($categories as $i => $c) {
            if ($expected === null || bccomp((string) $c['lower_bound'], $expected, 6) !== 0) {
                throw new BusinessRule('INVALID_CATEGORIES', 'Kategori harus berurutan tanpa celah atau tumpang tindih, mulai dari 0.', 422);
            }
            if ($c['upper_bound'] !== null && bccomp((string) $c['upper_bound'], (string) $c['lower_bound'], 6) <= 0) {
                throw new BusinessRule('INVALID_CATEGORIES', 'Batas atas harus lebih besar dari batas bawah.', 422);
            }
            $expected = $c['upper_bound'] === null ? null : (string) $c['upper_bound'];
        }
        if ($expected !== null) {
            throw new BusinessRule('INVALID_CATEGORIES', 'Kategori terakhir harus mempunyai upper_bound null agar nilai 100 tercakup.', 422);
        }
        $before = $id ? $cycle->toArray() : null;
        $values = Arr::only($data, ['assessment_month', 'opens_at', 'submission_due_at', 'approval_due_at', 'closes_at', 'status']);
        foreach (['opens_at', 'submission_due_at', 'approval_due_at', 'closes_at'] as $field) {
            $values[$field] = CarbonImmutable::parse($values[$field])->utc();
        }
        $cycle->fill($values);
        if (! $id) {
            $cycle->created_by = $ctx->userId;
        }
        $cycle->save();
        DB::table('cycle_categories')->where('cycle_id', $cycle->id)->delete();
        foreach ($categories as $i => $c) {
            DB::table('cycle_categories')->insert($c + ['cycle_id' => $cycle->id, 'sort_order' => $i + 1]);
        }
        $result = $this->cycleDetail($cycle->id);
        $this->audit->record($ctx, 'assessment_cycle', $cycle->id, 'cycle.saved', $before, $result);

        return $result;
    }

    public function close(AccessContext $ctx, int $id): array
    {
        $cycle = AssessmentCycle::whereKey($id)->lockForUpdate()->firstOrFail();
        $before = $cycle->toArray();
        $cycle->status = 'closed';
        $cycle->save();
        $result = $this->cycleDetail($id);
        $this->audit->record($ctx, 'assessment_cycle', $id, 'cycle.closed', $before, $result);

        return $result;
    }

    public function cycleDetail(int $id): array
    {
        $data = AssessmentCycle::findOrFail($id)->toArray();
        $data['categories'] = DB::table('cycle_categories')->where('cycle_id', $id)->orderBy('sort_order')->get()->toArray();

        return $data;
    }
}
