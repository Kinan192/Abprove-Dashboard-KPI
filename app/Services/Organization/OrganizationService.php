<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Master data for divisions, units, positions and staff. Head and placement changes have their own services. */
class OrganizationService
{
    public const RESOURCES = ['divisions', 'units', 'positions', 'employees'];

    public function __construct(
        private AuditWriter $audit,
        private OrganizationRules $rules,
        private HeadAssignmentService $heads,
        private PlacementService $placements,
    ) {}

    /** `$batch` (e.g. import_id/import_size) is added to the audit snapshots of a mass operation. */
    public function save(AccessContext $ctx, string $resource, ?int $id, array $data, array $batch = []): array
    {
        abort_unless($ctx->role === 'super_hc' && in_array($resource, self::RESOURCES), 403);
        $old = $id ? (array) DB::table($resource)->where('id', $id)->lockForUpdate()->firstOrFail() : null;
        if (! $id && in_array($resource, ['positions', 'divisions', 'units']) && empty($data['code'])) {
            $data['code'] = strtoupper(substr($resource, 0, 3)).'-'.substr(str_replace('-', '', (string) Str::uuid()), 0, 28);
        }
        $columns = match ($resource) {
            'employees' => ['nip', 'full_name', 'position_id', 'is_active'],
            'units' => ['code', 'name', 'division_id', 'is_active'],
            default => ['code', 'name', 'is_active'],
        };
        $values = Arr::only($data, $columns);
        $merged = array_merge($old ?? ['is_active' => true], $values);
        $unique = fn ($col) => Rule::unique($resource, $col)->ignore($id);
        foreach (['code', 'nip'] as $column) {
            if (isset($merged[$column])) {
                Validator::make($merged, [$column => [$unique($column)]])->validate();
            }
        }
        if ($resource === 'employees') {
            $this->rules->active('positions', $merged['position_id']);
            if ($old && ($old['position_id'] != $merged['position_id'] || ! $merged['is_active'])) {
                $this->rules->noPending(DB::table('assessments')->where('employee_id', $id));
            }
        }
        if ($resource === 'units') {
            $this->rules->active('divisions', $merged['division_id']);
            if ($old && $old['division_id'] != $merged['division_id'] && (DB::table('employee_placements')->where('unit_id', $id)->exists() || DB::table('assessments')->where('unit_id', $id)->exists() || DB::table('scope_assignments')->where('unit_id', $id)->whereNotNull('revoked_at')->exists())) {
                throw new BusinessRule('UNIT_HAS_HISTORY', 'Unit berhistori tidak dapat dipindah divisi.');
            }
        }
        if ($old && ! $merged['is_active']) {
            $occupied = match ($resource) {
                'divisions' => DB::table('units')->where('division_id', $id)->where('is_active', true)->exists(),
                'units' => DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')->where('p.unit_id', $id)->where('e.is_active', true)->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $this->rules->month()))->exists(),
                'positions' => DB::table('employees')->where('position_id', $id)->where('is_active', true)->exists(),
                default => false,
            };
            if ($occupied) {
                throw new BusinessRule('AREA_OCCUPIED', 'Selesaikan penempatan staf/unit aktif terlebih dahulu.');
            }
            if (in_array($resource, ['divisions', 'units'])) {
                $this->rules->noPending(DB::table('assessments')->where($resource === 'units' ? 'unit_id' : 'division_id', $id));
            }
        }
        $isArea = in_array($resource, ['divisions', 'units']);
        $reactivating = $isArea && $old && ! $old['is_active'] && $merged['is_active'];
        $column = $resource === 'units' ? 'unit_id' : 'division_id';
        if ($isArea && $old && ! $reactivating && isset($data['head_user_id'])) {
            $current = DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->value('user_id');
            if ((int) $current !== (int) $data['head_user_id']) {
                throw new BusinessRule('HEAD_CHANGE_FLOW', 'Gunakan menu Ganti/Pindah/Tukar/Lepas kepala untuk mengubah penanggung jawab.', 422);
            }
        }
        if ($reactivating && ! isset($data['head_user_id'])) {
            throw new BusinessRule('HEAD_REQUIRED', 'Pilih kembali akun kepala saat mengaktifkan area.', 422);
        }
        $writeValues = $values;
        if ($isArea && ! $merged['is_active']) {
            // Head revocation remains in this transaction; no inactive scope is committed.
            $writeValues['is_active'] = true;
        }
        if ($id) {
            DB::table($resource)->where('id', $id)->update($writeValues);
        } else {
            $id = DB::table($resource)->insertGetId($writeValues);
        }
        if ($isArea && (! $old || $reactivating)) {
            if (! DB::table('positions')->where('is_active', true)->exists()) {
                throw new BusinessRule('POSITION_REQUIRED', 'Buat jabatan sebelum struktur.', 422);
            }
            $this->heads->assignInitial($ctx, $resource, $id, (int) $data['head_user_id'], $old ? 'Reaktivasi area' : 'Penetapan awal');
        }
        if ($isArea && ! $merged['is_active']) {
            foreach (DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->lockForUpdate()->get() as $assignment) {
                DB::table('scope_assignments')->where('id', $assignment->id)->update(['revoked_at' => now()->format('Y-m-d H:i:s.u'), 'revoked_by' => $ctx->userId]);
                $afterAssignment = (array) DB::table('scope_assignments')->where('id', $assignment->id)->first();
                $this->audit->record($ctx, $resource, $id, 'head.deactivated', (array) $assignment, $afterAssignment, 'Area dinonaktifkan');
            }
            DB::table($resource)->where('id', $id)->update(['is_active' => false]);
        }
        if ($resource === 'employees' && ! $old) {
            $this->placements->place($ctx, $id, [
                'unit_id' => $data['unit_id'], 'effective_from' => $data['effective_from'] ?? $this->rules->month(),
                'expected_placement_id' => null, 'reason' => 'Penempatan awal',
            ], $batch);
        }
        $after = $this->safeRow($resource, $id);
        $this->audit->record($ctx, $resource, $id, $resource.($old ? '.updated' : '.created'), $old, Arr::except($after, ['history']) + $batch);

        return $after;
    }

    /**
     * Page of one master list: name search (employees: full name) and, for units, a division filter.
     *
     * @param  array{search?: string, division_id?: int}  $filters
     */
    public function search(string $resource, array $filters): LengthAwarePaginator
    {
        $query = DB::table($resource);
        if (isset($filters['search'])) {
            $query->where($resource === 'employees' ? 'full_name' : 'name', 'like', '%'.$filters['search'].'%');
        }
        if ($resource === 'units' && isset($filters['division_id'])) {
            $query->where('division_id', $filters['division_id']);
        }

        return $query->orderBy('id')->paginate(25);
    }

    /** Row with its current assignment or placements and the full mutation history for detail dialogs. */
    public function safeRow(string $resource, int $id): array
    {
        $row = (array) DB::table($resource)->where('id', $id)->firstOrFail();
        if (in_array($resource, ['divisions', 'units'])) {
            $row['current_assignment'] = DB::table('scope_assignments')->where($resource === 'units' ? 'unit_id' : 'division_id', $id)->whereNull('revoked_at')->first();
            $row['history'] = $this->heads->history($resource, $id);
        }
        if ($resource === 'employees') {
            $row['history'] = $this->placements->history($id);
        }

        return $row;
    }

    public function destroy(AccessContext $ctx, string $resource, int $id): array
    {
        abort_unless($ctx->role === 'super_hc' && in_array($resource, self::RESOURCES), 403);
        $old = Arr::except($this->safeRow($resource, $id), ['history']);
        DB::table($resource)->where('id', $id)->lockForUpdate()->firstOrFail();
        if ($resource === 'employees') {
            if (DB::table('assessments')->where('employee_id', $id)->exists()) {
                throw new BusinessRule('MASTER_IN_USE', 'Staf memiliki penilaian; gunakan Nonaktif.');
            }
            DB::table('employee_placements')->where('employee_id', $id)->delete();
        }
        if (in_array($resource, ['units', 'divisions'])) {
            $column = $resource === 'units' ? 'unit_id' : 'division_id';
            if (DB::table('assessments')->where($column, $id)->exists() || DB::table('employee_placements')->where($column, $id)->exists() || ($resource === 'divisions' && DB::table('units')->where('division_id', $id)->exists())) {
                throw new BusinessRule('MASTER_IN_USE', 'Area memiliki staf/unit/histori.');
            }
            $scope = DB::table('kpi_scopes')->where('scope_level', $resource === 'units' ? 'unit' : 'division')->where('scope_key', $id)->first();
            if ($scope && DB::table('kpi_templates')->where('scope_id', $scope->id)->exists()) {
                throw new BusinessRule('MASTER_IN_USE', 'Area memiliki KPI.');
            }
            if ($scope) {
                DB::table('kpi_scopes')->where('id', $scope->id)->delete();
            }
            DB::table('scope_assignments')->where($column, $id)->delete();
        }
        if ($resource === 'positions' && DB::table('employees')->where('position_id', $id)->exists()) {
            throw new BusinessRule('MASTER_IN_USE', 'Jabatan dirujuk staf.');
        }
        DB::table($resource)->where('id', $id)->delete();
        $result = ['id' => $id, 'deleted' => true];
        $this->audit->record($ctx, $resource, $id, $resource.'.deleted', $old, $result);

        return $result;
    }
}
