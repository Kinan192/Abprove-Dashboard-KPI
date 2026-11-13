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
        abort_unless($ctx->role === 'super_hc' && $id === null, 403);
        $level = $data['scope_level'];
        $areaId = $data[$level === 'unit' ? 'unit_id' : 'division_id'];
        $area = DB::table($level === 'unit' ? 'units' : 'divisions')->where('id', $areaId)->lockForUpdate()->firstOrFail();
        if (! $area->is_active) {
            throw new BusinessRule('MASTER_INACTIVE', 'Area tidak aktif.', 422);
        }
        $sum = '0';
        foreach ($data['items'] as $item) {
            $sum = bcadd($sum, (string) $item['weight_percent'], 4);
        }
        if (bccomp($sum, '100', 4) !== 0) {
            throw new BusinessRule('INVALID_WEIGHT', 'Total bobot harus tepat 100%.', 422);
        }
        $scope = DB::table('kpi_scopes')->where('scope_level', $level)->where('scope_key', $areaId)->lockForUpdate()->first();
        if (! $scope) {
            $sid = DB::table('kpi_scopes')->insertGetId(['scope_level' => $level, $level === 'unit' ? 'unit_id' : 'division_id' => $areaId, 'created_by' => $ctx->userId]);
            $scope = DB::table('kpi_scopes')->where('id', $sid)->lockForUpdate()->first();
        }
        $from = $data['effective_from'];
        $last = KpiTemplate::where('scope_id', $scope->id)->whereNull('workspace_hash')->orderByDesc('effective_from')->lockForUpdate()->first();
        if ($last && $last->effective_from >= $from) {
            throw new BusinessRule('TEMPLATE_OVERLAP', 'Pilih bulan sesudah versi terakhir.');
        }
        $used = DB::table('assessments as a')->join('assessment_cycles as c', 'c.id', '=', 'a.cycle_id')->where('a.assessment_kind', $level === 'unit' ? 'member' : 'unit_head')->where($level === 'unit' ? 'a.unit_id' : 'a.division_id', $areaId)->where('c.assessment_month', '>=', $from)->exists();
        if ($used) {
            throw new BusinessRule('TEMPLATE_RANGE_IN_USE', 'Rentang ini sudah memiliki penilaian. Pilih bulan berikutnya.');
        }
        if (DB::table('assessment_cycles')->where('assessment_month', $from)->where('status', 'closed')->exists()) {
            throw new BusinessRule('CYCLE_CLOSED', 'Tidak menerapkan versi baru pada periode yang ditutup.');
        }
        if ($last) {
            $last->effective_until = CarbonImmutable::parse($from)->subMonth()->format('Y-m-d');
            $last->save();
        }
        $t = KpiTemplate::create(['scope_id' => $scope->id, 'scope_level' => $level, 'scope_key' => $areaId, 'name' => $data['name'], 'version' => $scope->next_version, 'effective_from' => $from, 'expected_item_count' => count($data['items']), 'created_by' => $ctx->userId]);
        foreach (array_values($data['items']) as $i => $item) {
            KpiItem::create($item + ['template_id' => $t->id, 'sort_order' => $i + 1]);
        }
        $t->sealed_at = now();
        $t->save();
        DB::table('kpi_scopes')->where('id', $scope->id)->increment('next_version');
        $result = $t->fresh()->load('items')->toArray();
        $this->audit->record($ctx, 'kpi_template', $t->id, 'template.applied', null, $result);

        return $result;
    }

    public function destroy(AccessContext $ctx, int $id): array
    {
        abort_unless($ctx->role === 'super_hc', 403);
        $first = KpiTemplate::findOrFail($id);
        if ($first->workspace_hash !== null) {
            throw new BusinessRule('WORKSPACE_TEMPLATE', 'Kelola KPI ini melalui Master KPI / Goals.', 422);
        }
        DB::table($first->scope_level === 'unit' ? 'units' : 'divisions')->where('id', $first->scope_key)->lockForUpdate()->firstOrFail();
        $t = KpiTemplate::whereKey($id)->lockForUpdate()->firstOrFail();
        $before = $t->load('items')->toArray();
        if (DB::table('assessments')->where('kpi_template_id', $id)->exists()) {
            throw new BusinessRule('TEMPLATE_IN_USE', 'Versi sudah dipakai penilaian.');
        }
        $t->items()->delete();
        $t->delete();
        $versions = KpiTemplate::where('scope_id', $t->scope_id)->whereNull('workspace_hash')->orderBy('effective_from')->lockForUpdate()->get();
        foreach ($versions as $i => $v) {
            $v->effective_until = isset($versions[$i + 1]) ? CarbonImmutable::parse($versions[$i + 1]->effective_from)->subMonth()->format('Y-m-d') : null;
            $v->save();
        }
        $result = ['id' => $id, 'deleted' => true];
        $this->audit->record($ctx, 'kpi_template', $id, 'template.deleted', $before, $result);

        return $result;
    }

    public function destroyCycle(AccessContext $ctx, int $id): array
    {
        $cycle = AssessmentCycle::whereKey($id)->lockForUpdate()->firstOrFail();
        if ($cycle->status === 'open' || DB::table('assessments')->where('cycle_id', $id)->exists()) {
            throw new BusinessRule('CYCLE_IN_USE', 'Periode terbuka/terpakai tidak dapat dihapus.');
        }
        $before = $this->cycleDetail($id);
        DB::table('notification_reads')->where('cycle_id', $id)->delete();
        DB::table('cycle_categories')->where('cycle_id', $id)->delete();
        $cycle->delete();
        $result = ['id' => $id, 'deleted' => true];
        $this->audit->record($ctx, 'assessment_cycle', $id, 'cycle.deleted', $before, $result);

        return $result;
    }

    private function readyForCycle(string $month): void
    {
        if (AssessmentCycle::where('assessment_month', $month)->where('workspace_managed', true)->exists()) {
            $publications = DB::table('kpi_workspace_publications')->where('assessment_month', $month)->get();
            if ($publications->isEmpty() || $publications->contains(fn ($p) => $p->template_id === null)) {
                throw new BusinessRule('SETUP_INCOMPLETE', 'Lengkapi KPI penerima dengan total bobot 100% sebelum mengaktifkan periode.', 422);
            }
            foreach (KpiTemplate::whereIn('id', $publications->pluck('template_id'))->get() as $template) {
                $division = $template->scope_level === 'unit' ? DB::table('units')->where('id', $template->scope_key)->value('division_id') : $template->scope_key;
                $head = fn ($role, $field, $id) => DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')->where('s.role_key', $role)->where('s.'.$field, $id)->whereNull('s.revoked_at')->where('u.is_active', true)->whereColumn('u.role_key', 's.role_key')->exists();
                if (! $head('kepala_divisi', 'division_id', $division) || ($template->scope_level === 'unit' && ! $head('kepala_unit', 'unit_id', $template->scope_key))) {
                    throw new BusinessRule('SETUP_INCOMPLETE', 'Lengkapi Kepala Unit dan Kepala Divisi aktif untuk penerima KPI.', 422);
                }
            }
            return;
        }
        $units = DB::table('units')->where('is_active', true)->orderBy('id')->lockForUpdate()->get();
        $divisions = DB::table('divisions')->where('is_active', true)->orderBy('id')->lockForUpdate()->get();
        if ($units->isEmpty() || $divisions->isEmpty()) {
            throw new BusinessRule('SETUP_INCOMPLETE', 'Lengkapi divisi dan unit sebelum membuka periode.', 422);
        }
        foreach (['unit' => $units, 'division' => $divisions] as $level => $areas) {
            foreach ($areas as $area) {
                $head = DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')->where($level === 'unit' ? 's.unit_id' : 's.division_id', $area->id)->whereNull('s.revoked_at')->where('s.role_key', $level === 'unit' ? 'kepala_unit' : 'kepala_divisi')->where('u.is_active', true)->whereColumn('u.role_key', 's.role_key')->exists();
                $count = KpiTemplate::where('scope_level', $level)->where('scope_key', $area->id)->whereNull('workspace_hash')->whereNotNull('sealed_at')->where('effective_from', '<=', $month)->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month))->count();
                if (! $head || $count !== 1) {
                    throw new BusinessRule('SETUP_INCOMPLETE', 'Lengkapi kepala aktif dan KPI untuk '.$area->name, 422);
                }
            }
        }
    }

    public function cycle(AccessContext $ctx, ?int $id, array $data): array
    {
        Validator::make($data, ['assessment_month' => [Rule::unique('assessment_cycles')->ignore($id)]])->validate();
        $cycle = $id ? AssessmentCycle::whereKey($id)->lockForUpdate()->firstOrFail() : new AssessmentCycle;
        if ($id && DB::table('assessments')->where('cycle_id', $id)->exists()) {
            throw new BusinessRule('CYCLE_IN_USE', 'Jadwal dan kategori periode yang sudah digunakan tidak dapat diubah. Penutupan tersedia terpisah.');
        }
        if ($id && $cycle->status === 'closed') {
            throw new BusinessRule('CYCLE_CLOSED', 'Periode ditutup tidak dibuka ulang.');
        }
        if ($data['status'] === 'open') {
            $this->readyForCycle($data['assessment_month']);
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
