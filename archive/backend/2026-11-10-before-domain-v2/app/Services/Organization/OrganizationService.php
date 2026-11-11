<?php

namespace App\Services\Organization;

use App\Exceptions\BusinessRule;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OrganizationService
{
    public const RESOURCES = ['divisions', 'units', 'positions', 'employees', 'users'];

    public function __construct(private AuditWriter $audit) {}

    public function save(AccessContext $ctx, string $resource, ?int $id, array $data): array
    {
        abort_unless(in_array($resource, self::RESOURCES) && $ctx->role === 'super_hc', 403);
        $before = $id ? (array) DB::table($resource)->where('id', $id)->lockForUpdate()->firstOrFail() : null;
        $fields = match ($resource) {
            'users' => ['name', 'email', 'login_nip', 'password', 'is_active'],
            'employees' => ['nip', 'full_name', 'position_id', 'user_id', 'is_active'],
            'units' => ['division_id', 'code', 'name', 'is_active'],
            default => ['code', 'name', 'is_active'],
        };
        $values = Arr::only($data, $fields);
        $merged = array_merge($before ?? [], $values);
        $unique = fn ($column) => Rule::unique($resource, $column)->ignore($id);
        if (isset($merged['code'])) {
            $rule = $unique('code');
            if ($resource === 'units') {
                $rule->where('division_id', $merged['division_id']);
            }
            Validator::make($merged, ['code' => [$rule]])->validate();
        }
        if ($resource === 'units') {
            $this->active('divisions', $merged['division_id']);
            if ($before && (int) $before['division_id'] !== (int) $merged['division_id'] &&
                (DB::table('employee_placements')->where('unit_id', $id)->exists() || DB::table('scope_assignments')->where('unit_id', $id)->exists())) {
                throw new BusinessRule('UNIT_HAS_HISTORY', 'Unit berhistori tidak dapat dipindahkan ke divisi lain. Buat unit tujuan baru.');
            }
        }
        if ($resource === 'employees') {
            $this->active('positions', $merged['position_id']);
            if (! empty($merged['user_id'])) {
                $this->active('users', $merged['user_id']);
            }
            Validator::make($merged, ['nip' => [$unique('nip')], 'user_id' => ['nullable', $unique('user_id')]])->validate();
            if ($id && ((int) $before['position_id'] !== (int) $merged['position_id'] || ! ($merged['is_active'] ?? true) || ($before['user_id'] ?? null) != ($merged['user_id'] ?? null))) {
                $this->noActiveAssessments(DB::table('assessments')->where('employee_id', $id));
                if ($before['user_id'] && DB::table('scope_assignments')->where('user_id', $before['user_id'])->whereNull('revoked_at')->exists()) {
                    throw new BusinessRule('EMPLOYEE_IS_HEAD', 'Cabut penugasan kepala sebelum mengubah jabatan, akun, atau status karyawan.');
                }
            }
        }
        if (isset($values['is_active']) && ! $values['is_active'] && $id && in_array($resource, ['divisions', 'units', 'positions'])) {
            $column = match ($resource) {
                'divisions' => 'division_id', 'units' => 'unit_id', 'positions' => 'position_id'
            };
            $this->noActiveAssessments(DB::table('assessments')->where($column, $id));
            $occupied = match ($resource) {
                'divisions' => DB::table('units')->where('division_id', $id)->where('is_active', true)->exists(),
                'units' => DB::table('employee_placements')->where('unit_id', $id)->whereNull('ended_at')->exists(),
                'positions' => DB::table('employees')->where('position_id', $id)->where('is_active', true)->exists(),
            };
            if ($occupied) {
                throw new BusinessRule('AREA_OCCUPIED', 'Pindahkan atau nonaktifkan anggota/turunan terlebih dahulu.');
            }
        }
        if ($resource === 'users') {
            if (empty($merged['email']) && empty($merged['login_nip'])) {
                throw new BusinessRule('IDENTIFIER_REQUIRED', 'Email atau NIP login wajib diisi.', 422);
            }
            Validator::make($merged, ['email' => ['nullable', $unique('email')], 'login_nip' => ['nullable', $unique('login_nip')]])->validate();
            // Prevent an email from impersonating another user's NIP identifier (and vice versa).
            foreach (['email' => 'login_nip', 'login_nip' => 'email'] as $left => $right) {
                if (! empty($merged[$left]) && DB::table('users')->where($right, $merged[$left])->when($id, fn ($q) => $q->where('id', '!=', $id))->exists()) {
                    throw new BusinessRule('IDENTIFIER_CONFLICT', 'Identitas login sudah dipakai akun lain.', 422);
                }
            }
            if ($id === $ctx->userId && isset($values['is_active']) && ! $values['is_active']) {
                throw new BusinessRule('SELF_LOCKOUT', 'Tidak dapat menonaktifkan akun sendiri.');
            }
            $user = $id ? User::findOrFail($id) : new User;
            $user->fill($values)->save();
            $id = $user->id;
            foreach ($data['roles'] ?? [] as $role) {
                DB::table('user_roles')->insertOrIgnore(['user_id' => $id, 'role_key' => $role]);
            }
        } else {
            if ($id) {
                DB::table($resource)->where('id', $id)->update($values);
            } else {
                $id = DB::table($resource)->insertGetId($values);
            }
        }
        $after = $this->safeRow($resource, $id);
        $this->audit->record($ctx, $resource, $id, $resource.($before ? '.updated' : '.created'), $before ? Arr::except($before, ['password']) : null, $after);

        return $after;
    }

    public function safeRow(string $resource, int $id): array
    {
        $row = Arr::except((array) DB::table($resource)->where('id', $id)->firstOrFail(), ['password']);
        if ($resource === 'users') {
            $row['roles'] = DB::table('user_roles')->where('user_id', $id)->pluck('role_key')->all();
        }

        return $row;
    }

    public function placementPreview(int $employee): array
    {
        DB::table('employees')->where('id', $employee)->firstOrFail();

        return ['current_placement' => DB::table('employee_placements')->where('employee_id', $employee)->whereNull('ended_at')->first(),
            'active_assessments' => DB::table('assessments')->where('employee_id', $employee)->where('status', '!=', 'final')->count(),
            'guard' => 'O-6: perpindahan dengan penilaian aktif diblokir; histori tidak dipindahkan.'];
    }

    public function place(AccessContext $ctx, int $employee, array $data): array
    {
        $e = $this->active('employees', $employee);
        $old = DB::table('employee_placements')->where('employee_id', $employee)->whereNull('ended_at')->lockForUpdate()->first();
        if (($old ? (int) $old->id : null) !== (isset($data['expected_placement_id']) ? (int) $data['expected_placement_id'] : null)) {
            throw new BusinessRule('STALE_PLACEMENT', 'Penempatan telah berubah. Tinjau pratinjau terbaru.');
        }
        $u = $this->active('units', $data['unit_id']);
        $this->active('divisions', $u->division_id);
        if ($old && (int) $old->unit_id === (int) $u->id) {
            throw new BusinessRule('SAME_UNIT', 'Karyawan sudah berada di unit tujuan.');
        }
        $this->noActiveAssessments(DB::table('assessments')->where('employee_id', $employee));
        if ($e->user_id && DB::table('scope_assignments')->where('user_id', $e->user_id)->whereNull('revoked_at')->whereIn('role_key', ['kepala_unit', 'kepala_divisi'])->exists()) {
            throw new BusinessRule('EMPLOYEE_IS_HEAD', 'Cabut penugasan kepala sebelum memindahkan karyawan.');
        }
        $changedAt = now()->format('Y-m-d H:i:s.u');
        if ($old) {
            DB::table('employee_placements')->where('id', $old->id)->update(['ended_at' => $changedAt, 'ended_by' => $ctx->userId]);
        }
        $id = DB::table('employee_placements')->insertGetId([
            'employee_id' => $employee, 'unit_id' => $u->id, 'division_id' => $u->division_id,
            'started_at' => $changedAt, 'reason' => $data['reason'], 'created_by' => $ctx->userId,
        ]);
        $result = (array) DB::table('employee_placements')->where('id', $id)->first();
        $this->audit->record($ctx, 'employee', $employee, $old ? 'employee.transferred' : 'employee.placed', $old ? (array) $old : null, $result, $data['reason']);

        return $result;
    }

    public function headPreview(string $area, int $id): array
    {
        abort_unless(in_array($area, ['divisions', 'units']), 404);
        DB::table($area)->where('id', $id)->firstOrFail();
        $column = $area === 'units' ? 'unit_id' : 'division_id';

        return ['current_assignment' => DB::table('scope_assignments')->where($column, $id)->whereNull('revoked_at')->first(),
            'active_assessments' => DB::table('assessments')->where($column, $id)->where('status', '!=', 'final')->count(),
            'guard' => 'O-6/O-7: penilaian aktif memblokir pergantian; kepala baru tidak otomatis melihat histori kepala lama.'];
    }

    public function assignHead(AccessContext $ctx, string $area, int $id, array $data): array
    {
        abort_unless(in_array($area, ['divisions', 'units']), 404);
        $a = $this->active($area, $id);
        if ($area === 'units') {
            $this->active('divisions', $a->division_id);
        }
        $column = $area === 'units' ? 'unit_id' : 'division_id';
        $role = $area === 'units' ? 'kepala_unit' : 'kepala_divisi';
        $old = DB::table('scope_assignments')->where($column, $id)->where('role_key', $role)->whereNull('revoked_at')->lockForUpdate()->first();
        if (($old ? (int) $old->id : null) !== (isset($data['expected_assignment_id']) ? (int) $data['expected_assignment_id'] : null)) {
            throw new BusinessRule('STALE_ASSIGNMENT', 'Penugasan telah berubah. Tinjau pratinjau terbaru.');
        }
        $this->noActiveAssessments(DB::table('assessments')->where($column, $id));
        $this->eligible($data['user_id'], $role);
        $other = DB::table('scope_assignments')->where('user_id', $data['user_id'])->whereNull('revoked_at')->lockForUpdate()->get();
        if ($other->isNotEmpty()) {
            throw new BusinessRule('CONTEXT_UNRESOLVED', 'Akun sudah memiliki penugasan aktif. Multi-penugasan masih O-5.');
        }
        if ($area === 'units') {
            $employee = DB::table('employees as e')->join('employee_placements as p', 'p.employee_id', '=', 'e.id')
                ->where('e.user_id', $data['user_id'])->where('e.is_active', true)->whereNull('p.ended_at')->where('p.unit_id', $id)->select('e.id')->first();
            if (! $employee) {
                throw new BusinessRule('HEAD_EMPLOYEE_REQUIRED', 'Kepala Unit harus terhubung ke karyawan aktif yang ditempatkan pada unit ini.', 422);
            }
        }
        $changedAt = now()->format('Y-m-d H:i:s.u');
        if ($old) {
            DB::table('scope_assignments')->where('id', $old->id)->update(['revoked_at' => $changedAt, 'revoked_by' => $ctx->userId]);
        }
        $new = DB::table('scope_assignments')->insertGetId([
            'user_id' => $data['user_id'], 'role_key' => $role, $column => $id,
            'assigned_at' => $changedAt, 'assigned_by' => $ctx->userId, 'note' => $data['reason'],
        ]);
        $after = (array) DB::table('scope_assignments')->where('id', $new)->first();
        $this->audit->record($ctx, $area, $id, 'head.assigned', $old ? (array) $old : null, $after, $data['reason']);

        return $after;
    }

    public function grantHc(AccessContext $ctx, int $user, array $data): array
    {
        $this->eligible($user, 'super_hc');
        if (DB::table('scope_assignments')->where('user_id', $user)->whereNull('revoked_at')->lockForUpdate()->exists()) {
            throw new BusinessRule('CONTEXT_UNRESOLVED', 'Akun sudah memiliki penugasan aktif.');
        }
        $id = DB::table('scope_assignments')->insertGetId(['user_id' => $user, 'role_key' => 'super_hc', 'assigned_at' => now()->format('Y-m-d H:i:s.u'), 'assigned_by' => $ctx->userId, 'note' => $data['reason']]);
        $result = (array) DB::table('scope_assignments')->where('id', $id)->first();
        $this->audit->record($ctx, 'user', $user, 'scope.granted', null, $result, $data['reason']);

        return $result;
    }

    public function revoke(AccessContext $ctx, int $id, array $data): array
    {
        $scope = DB::table('scope_assignments')->where('id', $id)->lockForUpdate()->firstOrFail();
        if ($scope->revoked_at) {
            throw new BusinessRule('ALREADY_REVOKED', 'Penugasan sudah dicabut.');
        }
        if ((int) $scope->user_id === $ctx->userId) {
            throw new BusinessRule('SELF_LOCKOUT', 'Tidak dapat mencabut penugasan sendiri.');
        }
        if ($scope->role_key !== 'super_hc') {
            $column = $scope->unit_id ? 'unit_id' : 'division_id';
            $this->noActiveAssessments(DB::table('assessments')->where($column, $scope->$column));
        }
        DB::table('scope_assignments')->where('id', $id)->update(['revoked_at' => now()->format('Y-m-d H:i:s.u'), 'revoked_by' => $ctx->userId]);
        $after = (array) DB::table('scope_assignments')->where('id', $id)->first();
        $this->audit->record($ctx, 'scope_assignment', $id, 'scope.revoked', (array) $scope, $after, $data['reason']);

        return $after;
    }

    private function active(string $table, int $id): object
    {
        $row = DB::table($table)->where('id', $id)->lockForUpdate()->firstOrFail();
        if (! $row->is_active) {
            throw new BusinessRule('INACTIVE_REFERENCE', 'Data '.$table.' tidak aktif.', 422);
        }

        return $row;
    }

    private function eligible(int $user, string $role): void
    {
        $this->active('users', $user);
        if (! DB::table('user_roles')->where('user_id', $user)->where('role_key', $role)->exists()) {
            throw new BusinessRule('ROLE_INELIGIBLE', 'Akun belum memiliki kelayakan role yang diperlukan.', 422);
        }
    }

    private function noActiveAssessments($q): void
    {
        if ($q->where('status', '!=', 'final')->lockForUpdate()->exists()) {
            throw new BusinessRule('ACTIVE_ASSESSMENT_IMPACT', 'Perubahan berdampak pada penilaian aktif dan diblokir sampai kebijakan O-6 disahkan.');
        }
    }
}
