<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationService
{
    public const RESOURCES = ['divisions', 'units', 'positions', 'employees', 'users'];

    public function __construct(private AuditWriter $audit) {}

    public function save(AccessContext $ctx, string $resource, ?int $id, array $data): array
    {
        abort_unless($ctx->role === 'super_hc' && in_array($resource, self::RESOURCES), 403);
        $old = $id ? (array) DB::table($resource)->where('id', $id)->lockForUpdate()->firstOrFail() : null;
        if (! $id && in_array($resource, ['positions', 'divisions', 'units']) && empty($data['code'])) {
            $data['code'] = strtoupper(substr($resource, 0, 3)).'-'.substr(str_replace('-', '', (string) Str::uuid()), 0, 28);
        }
        $columns = match ($resource) {
            'users' => ['name', 'email', 'login_nip', 'role_key', 'password', 'is_active'],
            'employees' => ['nip', 'full_name', 'position_id', 'is_active'],
            'units' => ['code', 'name', 'division_id', 'is_active'],
            default => ['code', 'name', 'is_active'],
        };
        $values = Arr::only($data, $columns);
        $merged = array_merge($old ?? ['is_active' => true], $values);
        $unique = fn ($col) => Rule::unique($resource, $col)->ignore($id);
        foreach (['code', 'nip', 'email', 'login_nip'] as $column) {
            if (isset($merged[$column])) {
                Validator::make($merged, [$column => [$unique($column)]])->validate();
            }
        }
        if ($resource === 'users') {
            if ($id === $ctx->userId && ((! $merged['is_active']) || $merged['role_key'] !== $old['role_key'])) {
                throw new BusinessRule('SELF_LOCKOUT', 'Akun sendiri tidak dapat dinonaktifkan atau diubah role-nya.');
            }
            foreach (['email' => 'login_nip', 'login_nip' => 'email'] as $left => $right) {
                if (! empty($merged[$left]) && DB::table('users')->where(fn ($q) => $q->where('email', $merged[$left])->orWhere('login_nip', $merged[$left]))->when($id, fn ($q) => $q->where('id', '!=', $id))->lockForUpdate()->get()->isNotEmpty()) {
                    throw new BusinessRule('IDENTIFIER_CONFLICT', 'Identitas login sudah dipakai.', 422);
                }
            }
            $heads = $id ? DB::table('scope_assignments')->where('user_id', $id)->whereNull('revoked_at')->whereIn('role_key', ['kepala_unit', 'kepala_divisi'])->lockForUpdate()->get() : collect();
            if ($old && ($old['role_key'] !== $merged['role_key'] || ! $merged['is_active']) && $heads->isNotEmpty()) {
                throw new BusinessRule('ACCOUNT_ASSIGNED', 'Ganti penanggung jawab area sebelum mengubah role/status akun.');
            }
            $user = $id ? User::findOrFail($id) : new User;
            $user->fill($values)->save();
            $id = $user->id;
            DB::table('user_roles')->insertOrIgnore(['user_id' => $id, 'role_key' => $merged['role_key']]);
            if ($old && $old['role_key'] !== $merged['role_key']) {
                DB::table('scope_assignments')->where('user_id', $id)->whereNull('revoked_at')->update(['revoked_at' => now(), 'revoked_by' => $ctx->userId]);
            }
            if ($merged['role_key'] === 'super_hc' && ! DB::table('scope_assignments')->where('user_id', $id)->whereNull('revoked_at')->exists()) {
                DB::table('scope_assignments')->insert(['user_id' => $id, 'role_key' => 'super_hc', 'assigned_at' => now(), 'assigned_by' => $ctx->userId]);
            }
        } else {
            if ($resource === 'employees') {
                $this->active('positions', $merged['position_id']);
                if ($old && ($old['position_id'] != $merged['position_id'] || ! $merged['is_active'])) {
                    $this->noPending(DB::table('assessments')->where('employee_id', $id));
                }
            }
            if ($resource === 'units') {
                $this->active('divisions', $merged['division_id']);
                if ($old && $old['division_id'] != $merged['division_id'] && (DB::table('employee_placements')->where('unit_id', $id)->exists() || DB::table('assessments')->where('unit_id', $id)->exists() || DB::table('scope_assignments')->where('unit_id', $id)->whereNotNull('revoked_at')->exists())) {
                    throw new BusinessRule('UNIT_HAS_HISTORY', 'Unit berhistori tidak dapat dipindah divisi.');
                }
            }
            if ($old && ! $merged['is_active']) {
                $occupied = match ($resource) {
                    'divisions' => DB::table('units')->where('division_id', $id)->where('is_active', true)->exists(),
                    'units' => DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')->where('p.unit_id', $id)->where('e.is_active', true)->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $this->month()))->exists(),
                    'positions' => DB::table('employees')->where('position_id', $id)->where('is_active', true)->exists(),
                    default => false,
                };
                if ($occupied) {
                    throw new BusinessRule('AREA_OCCUPIED', 'Selesaikan penempatan staf/unit aktif terlebih dahulu.');
                }
                if (in_array($resource, ['divisions', 'units'])) {
                    $this->noPending(DB::table('assessments')->where($resource === 'units' ? 'unit_id' : 'division_id', $id));
                }
            }
            $isArea = in_array($resource, ['divisions', 'units']);
            $reactivating = $isArea && $old && ! $old['is_active'] && $merged['is_active'];
            if ($reactivating && ! isset($data['head_user_id'])) {
                throw new BusinessRule('HEAD_REQUIRED', 'Pilih kembali akun kepala saat mengaktifkan area.', 422);
            }
            $writeValues = $values;
            if ($isArea && ! $merged['is_active']) {
                // Head selection and revocation remain in this transaction; no inactive scope is committed.
                $writeValues['is_active'] = true;
            }
            if ($id) {
                DB::table($resource)->where('id', $id)->update($writeValues);
            } else {
                $id = DB::table($resource)->insertGetId($writeValues);
            }
            if (in_array($resource, ['divisions', 'units']) && isset($data['head_user_id'])) {
                if (! DB::table('positions')->where('is_active', true)->exists()) {
                    throw new BusinessRule('POSITION_REQUIRED', 'Buat jabatan sebelum struktur.', 422);
                }
                $column = $resource === 'units' ? 'unit_id' : 'division_id';
                $current = DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->first();
                $latest = $current ?? DB::table('scope_assignments')->where($column, $id)->orderByDesc('id')->first();
                $needsAssignment = $current ? $current->user_id != $data['head_user_id'] :
                    ($merged['is_active'] || ! $latest || $latest->user_id != $data['head_user_id']);
                if ($needsAssignment) {
                    $this->assignHead($ctx, $resource, $id, [
                        'user_id' => $data['head_user_id'], 'expected_assignment_id' => $old ? ($data['expected_assignment_id'] ?? null) : null,
                        'reason' => $old ? ($data['reason'] ?? ($reactivating ? 'Reaktivasi area' : '')) : 'Penetapan awal',
                        'confirmed' => $old ? ($data['confirmed'] ?? $reactivating) : true,
                    ]);
                }
            }
            if ($isArea && ! $merged['is_active']) {
                $column = $resource === 'units' ? 'unit_id' : 'division_id';
                foreach (DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->lockForUpdate()->get() as $assignment) {
                    DB::table('scope_assignments')->where('id', $assignment->id)->update(['revoked_at' => now(), 'revoked_by' => $ctx->userId]);
                    $afterAssignment = (array) DB::table('scope_assignments')->where('id', $assignment->id)->first();
                    $this->audit->record($ctx, $resource, $id, 'head.deactivated', (array) $assignment, $afterAssignment, 'Area dinonaktifkan');
                }
                DB::table($resource)->where('id', $id)->update(['is_active' => false]);
            }
            if ($resource === 'employees' && ! $old) {
                $this->place($ctx, $id, [
                    'unit_id' => $data['unit_id'], 'effective_from' => $data['effective_from'] ?? $this->month(),
                    'expected_placement_id' => null, 'confirmed' => true, 'reason' => 'Penempatan awal',
                ]);
            }
        }
        $after = $this->safeRow($resource, $id);
        $this->audit->record($ctx, $resource, $id, $resource.($old ? '.updated' : '.created'), $old ? Arr::except($old, ['password']) : null, $after);

        return $after;
    }

    public function safeRow(string $resource, int $id): array
    {
        $row = Arr::except((array) DB::table($resource)->where('id', $id)->firstOrFail(), ['password']);
        if (in_array($resource, ['divisions', 'units'])) {
            $row['current_assignment'] = DB::table('scope_assignments')->where($resource === 'units' ? 'unit_id' : 'division_id', $id)->whereNull('revoked_at')->first();
            $row['latest_assignment'] = DB::table('scope_assignments')->where($resource === 'units' ? 'unit_id' : 'division_id', $id)->orderByDesc('id')->first();
        }
        if ($resource === 'employees') {
            $row['placements'] = DB::table('employee_placements')->where('employee_id', $id)->orderBy('effective_from')->get();
        }

        return $row;
    }

    public function headPreview(string $area, int $id): array
    {
        abort_unless(in_array($area, ['units', 'divisions']), 404);
        DB::table($area)->where('id', $id)->firstOrFail();
        $column = $area === 'units' ? 'unit_id' : 'division_id';
        $role = $area === 'units' ? 'kepala_unit' : 'kepala_divisi';
        $eligible = DB::table('users as u')->where('u.role_key', $role)->where('u.is_active', true)->whereNotExists(fn ($q) => $q->selectRaw('1')->from('scope_assignments as s')->whereColumn('s.user_id', 'u.id')->whereNull('s.revoked_at'))->get(['u.id', 'u.name', 'u.login_nip']);

        return ['current_assignment' => DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->first(), 'eligible_accounts' => $eligible,
            'active_assessments' => $this->pending(DB::table('assessments')->where($column, $id))->count()];
    }

    public function assignHead(AccessContext $ctx, string $area, int $id, array $data): array
    {
        abort_unless($ctx->role === 'super_hc' && in_array($area, ['units', 'divisions']), 403);
        $target = $this->active($area, $id);
        $column = $area === 'units' ? 'unit_id' : 'division_id';
        $role = $area === 'units' ? 'kepala_unit' : 'kepala_divisi';
        if ($area === 'units') {
            $this->active('divisions', $target->division_id);
        }
        $old = DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->lockForUpdate()->first();
        if (($old ? (int) $old->id : null) !== (isset($data['expected_assignment_id']) ? (int) $data['expected_assignment_id'] : null)) {
            throw new BusinessRule('STALE_ASSIGNMENT', 'Penanggung jawab berubah; periksa pratinjau terbaru.');
        }
        if (empty($data['confirmed']) || ! trim($data['reason'] ?? '')) {
            throw new BusinessRule('CONFIRMATION_REQUIRED', 'Konfirmasi dan alasan diperlukan.', 422);
        }
        $this->noPending(DB::table('assessments')->where($column, $id));
        $u = $this->active('users', $data['user_id']);
        if ($u->role_key !== $role) {
            throw new BusinessRule('ROLE_MISMATCH', 'Pilih akun dengan role kepala yang sesuai.', 422);
        }
        if (DB::table('scope_assignments')->where('user_id', $u->id)->whereNull('revoked_at')->lockForUpdate()->exists()) {
            throw new BusinessRule('ACCOUNT_ASSIGNED', 'Akun sudah memimpin area lain.');
        }
        if ($old) {
            DB::table('scope_assignments')->where('id', $old->id)->update(['revoked_at' => now(), 'revoked_by' => $ctx->userId]);
        }
        $new = DB::table('scope_assignments')->insertGetId(['user_id' => $u->id, 'role_key' => $role, $column => $id, 'assigned_at' => now(), 'assigned_by' => $ctx->userId, 'note' => $data['reason']]);
        $after = (array) DB::table('scope_assignments')->where('id', $new)->first();
        $this->audit->record($ctx, $area, $id, 'head.assigned', $old ? (array) $old : null, $after, $data['reason']);

        return $after;
    }

    public function placementPreview(int $employee): array
    {
        DB::table('employees')->where('id', $employee)->firstOrFail();

        return ['placements' => DB::table('employee_placements')->where('employee_id', $employee)->orderBy('effective_from')->get(),
            'current_placement' => DB::table('employee_placements')->where('employee_id', $employee)->where('effective_from', '<=', $this->month())->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $this->month()))->first(),
            'active_assessments' => $this->pending(DB::table('assessments')->where('employee_id', $employee))->count()];
    }

    public function place(AccessContext $ctx, int $employee, array $data): array
    {
        $this->active('employees', $employee);
        $u = $this->active('units', $data['unit_id']);
        $this->active('divisions', $u->division_id);
        $from = $data['effective_from'];
        $rows = DB::table('employee_placements')->where('employee_id', $employee)->orderBy('effective_from')->lockForUpdate()->get();
        $earliest = min($this->month(), DB::table('assessment_cycles')->where('status', 'open')->min('assessment_month') ?? $this->month());
        if ($rows->isNotEmpty() && $from < $earliest) {
            throw new BusinessRule('PAST_PLACEMENT', 'Perubahan tidak ditulis mundur ke histori.', 422);
        }
        $old = $rows->first(fn ($p) => $p->effective_from <= $from && (! $p->effective_until || $p->effective_until >= $from));
        if (($old ? (int) $old->id : null) !== (isset($data['expected_placement_id']) ? (int) $data['expected_placement_id'] : null)) {
            throw new BusinessRule('STALE_PLACEMENT', 'Penempatan berubah; periksa pratinjau terbaru.');
        }
        if (empty($data['confirmed']) || ! trim($data['reason'])) {
            throw new BusinessRule('CONFIRMATION_REQUIRED', 'Konfirmasi dan alasan diperlukan.', 422);
        }
        if ($old && $old->unit_id == $u->id) {
            throw new BusinessRule('SAME_UNIT', 'Unit tujuan sama.');
        }
        if ($rows->contains(fn ($p) => $p->id !== ($old->id ?? null) && $p->effective_from >= $from)) {
            throw new BusinessRule('PLACEMENT_OVERLAP', 'Sudah ada penempatan terjadwal pada rentang ini.');
        }
        $this->noPending(DB::table('assessments')->where('employee_id', $employee), $from);
        if ($old && $old->effective_from === $from) {
            if (DB::table('assessments')->where('placement_id', $old->id)->exists()) {
                throw new BusinessRule('PLACEMENT_IN_USE', 'Pilih bulan sesudah penempatan yang sudah dipakai.');
            }
            DB::table('employee_placements')->where('id', $old->id)->delete();
        } elseif ($old) {
            DB::table('employee_placements')->where('id', $old->id)->update(['effective_until' => CarbonImmutable::parse($from)->subMonth()->format('Y-m-d')]);
        }
        $new = DB::table('employee_placements')->insertGetId(['employee_id' => $employee, 'unit_id' => $u->id, 'division_id' => $u->division_id, 'effective_from' => $from, 'reason' => $data['reason'], 'created_by' => $ctx->userId]);
        $result = (array) DB::table('employee_placements')->where('id', $new)->first();
        $this->audit->record($ctx, 'employee', $employee, $old ? 'employee.transferred' : 'employee.placed', $old ? (array) $old : null, $result, $data['reason']);

        return $result;
    }

    public function destroy(AccessContext $ctx, string $resource, int $id): array
    {
        abort_unless($ctx->role === 'super_hc' && in_array($resource, self::RESOURCES), 403);
        $old = $this->safeRow($resource, $id);
        DB::table($resource)->where('id', $id)->lockForUpdate()->firstOrFail();
        if ($resource === 'users') {
            if ($id === $ctx->userId) {
                throw new BusinessRule('SELF_LOCKOUT', 'Akun sendiri tidak dapat dihapus.');
            }
            if (DB::table('scope_assignments')->where('user_id', $id)->exists() || DB::table('audit_events')->where('actor_user_id', $id)->exists() || DB::table('operation_requests')->where('actor_user_id', $id)->exists()) {
                throw new BusinessRule('MASTER_IN_USE', 'Akun memiliki penugasan atau histori; gunakan Nonaktif.');
            }
            DB::table('notification_reads')->where('user_id', $id)->delete();
            DB::table('user_roles')->where('user_id', $id)->delete();
        }
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

    public function grantHc(AccessContext $ctx, int $user, array $data): array
    {
        $u = $this->active('users', $user);
        if ($u->role_key !== 'super_hc') {
            throw new BusinessRule('ROLE_MISMATCH', 'Role akun harus Super HC.', 422);
        }
        if (DB::table('scope_assignments')->where('user_id', $user)->whereNull('revoked_at')->exists()) {
            throw new BusinessRule('ACCOUNT_ASSIGNED', 'Akun sudah memiliki akses aktif.');
        }
        $id = DB::table('scope_assignments')->insertGetId(['user_id' => $user, 'role_key' => 'super_hc', 'assigned_at' => now(), 'assigned_by' => $ctx->userId, 'note' => $data['reason']]);
        $after = (array) DB::table('scope_assignments')->where('id', $id)->first();
        $this->audit->record($ctx, 'user', $user, 'hc.granted', null, $after, $data['reason']);

        return $after;
    }

    public function revoke(AccessContext $ctx, int $assignment, array $data): array
    {
        $row = DB::table('scope_assignments')->where('id', $assignment)->lockForUpdate()->firstOrFail();
        if ($row->user_id == $ctx->userId) {
            throw new BusinessRule('SELF_LOCKOUT', 'Tidak dapat mencabut akses sendiri.');
        }
        if ($row->role_key !== 'super_hc') {
            throw new BusinessRule('REPLACEMENT_REQUIRED', 'Ganti kepala area melalui penugasan, bukan membiarkan area aktif tanpa kepala.');
        }
        DB::table('scope_assignments')->where('id', $assignment)->update(['revoked_at' => now(), 'revoked_by' => $ctx->userId]);
        $after = (array) DB::table('scope_assignments')->where('id', $assignment)->first();
        $this->audit->record($ctx, 'scope_assignment', $assignment, 'scope.revoked', (array) $row, $after, $data['reason']);

        return $after;
    }

    private function month(): string
    {
        return now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
    }

    private function active(string $table, int $id)
    {
        $row = DB::table($table)->where('id', $id)->lockForUpdate()->firstOrFail();
        if (! $row->is_active) {
            throw new BusinessRule('MASTER_INACTIVE', 'Data induk tidak aktif.', 422);
        }

        return $row;
    }

    private function pending($q, ?string $from = null)
    {
        return $q->where('status', '!=', 'final')->whereIn('cycle_id', DB::table('assessment_cycles')->where(fn ($q) => $q->where('assessment_month', '>=', $from ?? $this->month())->when($from === null, fn ($q) => $q->orWhere('status', 'open')))->select('id'));
    }

    private function noPending($q, ?string $from = null): void
    {
        if ($this->pending($q, $from)->exists()) {
            throw new BusinessRule('ACTIVE_ASSESSMENTS', 'Selesaikan penilaian non-Final pada rentang perubahan.');
        }
    }
}
