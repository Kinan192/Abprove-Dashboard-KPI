<?php

namespace App\Services\Admin;

use App\Exceptions\BusinessRule;
use App\Models\User;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/** Login accounts are owned by Admin; area assignment of heads stays with Super HC. */
class AccountService
{
    public const ROLES = ['admin', 'super_hc', 'kepala_divisi', 'kepala_unit'];

    public const ROLE_LABELS = ['super_hc' => 'Super HC', 'kepala_divisi' => 'Kepala Divisi', 'kepala_unit' => 'Kepala Unit', 'admin' => 'Admin'];

    /** Roles whose access needs no division/unit, so the assignment follows the account. */
    private const GLOBAL_ROLES = ['admin', 'super_hc'];

    public function __construct(private AuditWriter $audit) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $active = DB::table('scope_assignments')->whereNull('revoked_at')->select('user_id', 'role_key', 'unit_id', 'division_id');

        return DB::table('users as u')
            ->leftJoinSub($active, 's', fn ($j) => $j->on('s.user_id', '=', 'u.id')->on('s.role_key', '=', 'u.role_key'))
            ->leftJoin('units as un', 'un.id', '=', 's.unit_id')
            ->leftJoin('divisions as d', 'd.id', '=', DB::raw('COALESCE(s.division_id, un.division_id)'))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('u.name', 'like', "%{$s}%")->orWhere('u.email', 'like', "%{$s}%")->orWhere('u.login_nip', 'like', "%{$s}%")))
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('u.role_key', $role))
            ->when(isset($filters['status']), fn ($q) => $q->where('u.is_active', $filters['status'] === 'active'))
            ->orderBy('u.name')
            ->select('u.id', 'u.name', 'u.email', 'u.login_nip', 'u.role_key', 'u.is_active', 'u.email_notifications', 'u.last_login_at',
                'un.name as unit_name', 'd.name as division_name', DB::raw('s.user_id IS NOT NULL as has_access'))
            ->paginate($filters['per_page'] ?? 25);
    }

    public function save(AccessContext $ctx, ?int $id, array $data): array
    {
        $old = $id ? $this->row($id, lock: true) : null;
        $merged = array_merge($old ?? ['is_active' => true], Arr::only($data, ['name', 'email', 'login_nip', 'role_key', 'is_active']));
        if ($old && $id === $ctx->userId && (! $merged['is_active'] || $merged['role_key'] !== $old['role_key'])) {
            throw new BusinessRule('SELF_LOCKOUT', 'Akun sendiri tidak dapat dinonaktifkan atau diubah role-nya.');
        }
        $this->assertIdentifiersFree($id, $merged);
        if ($old && ($old['role_key'] !== $merged['role_key'] || ! $merged['is_active']) && $this->headAssignments($id)->isNotEmpty()) {
            throw new BusinessRule('ACCOUNT_ASSIGNED', 'Akun masih memimpin area. Minta Super HC mengganti kepala area terlebih dahulu.');
        }

        $user = $id ? User::findOrFail($id) : new User;
        $user->fill(Arr::only($data, ['name', 'email', 'login_nip', 'role_key', 'is_active', 'password']))->save();
        DB::table('user_roles')->insertOrIgnore(['user_id' => $user->id, 'role_key' => $merged['role_key']]);
        if ($old && $old['role_key'] !== $merged['role_key']) {
            DB::table('scope_assignments')->where('user_id', $user->id)->whereNull('revoked_at')
                ->update(['revoked_at' => now(), 'revoked_by' => $ctx->userId]);
        }
        if (in_array($merged['role_key'], self::GLOBAL_ROLES, true)
            && ! DB::table('scope_assignments')->where('user_id', $user->id)->whereNull('revoked_at')->exists()) {
            DB::table('scope_assignments')->insert(['user_id' => $user->id, 'role_key' => $merged['role_key'], 'assigned_at' => now(), 'assigned_by' => $ctx->userId]);
        }

        $after = $this->row($user->id);
        $action = match (true) {
            ! $old => 'users.created',
            isset($data['password']) && count(Arr::except($data, ['password', 'request_id'])) === 0 => 'users.password_reset',
            default => 'users.updated',
        };
        $this->audit->record($ctx, 'users', $user->id, $action, $old, $after);

        return $after;
    }

    public function destroy(AccessContext $ctx, int $id): array
    {
        $old = $this->row($id, lock: true);
        if ($id === $ctx->userId) {
            throw new BusinessRule('SELF_LOCKOUT', 'Akun sendiri tidak dapat dihapus.');
        }
        $hasHistory = DB::table('audit_events')->where('actor_user_id', $id)->exists()
            || DB::table('operation_requests')->where('actor_user_id', $id)->exists()
            || DB::table('scope_assignments')->where('user_id', $id)->whereIn('role_key', ['kepala_unit', 'kepala_divisi'])->exists()
            || DB::table('assessments')->where('subject_user_id', $id)->exists()
            || DB::table('reminder_emails')->where('recipient_user_id', $id)->exists();
        if ($hasHistory) {
            throw new BusinessRule('MASTER_IN_USE', 'Akun sudah memiliki histori penilaian/aktivitas. Gunakan Nonaktifkan agar jejak audit tetap utuh.');
        }
        DB::table('scope_assignments')->where('user_id', $id)->delete();
        DB::table('notification_reads')->where('user_id', $id)->delete();
        DB::table('login_events')->where('user_id', $id)->update(['user_id' => null]);
        DB::table('auth_sessions')->where('userId', $id)->delete();
        DB::table('auth_accounts')->where('userId', $id)->delete();
        DB::table('user_roles')->where('user_id', $id)->delete();
        DB::table('users')->where('id', $id)->delete();
        $result = ['id' => $id, 'deleted' => true];
        $this->audit->record($ctx, 'users', $id, 'users.deleted', $old, $result);

        return $result;
    }

    private function row(int $id, bool $lock = false): array
    {
        $query = DB::table('users')->where('id', $id);
        $row = ($lock ? $query->lockForUpdate() : $query)->firstOrFail();

        return Arr::only((array) $row, ['id', 'name', 'email', 'login_nip', 'role_key', 'is_active', 'email_notifications', 'last_login_at']);
    }

    private function headAssignments(int $id)
    {
        return DB::table('scope_assignments')->where('user_id', $id)->whereNull('revoked_at')
            ->whereIn('role_key', ['kepala_unit', 'kepala_divisi'])->lockForUpdate()->get();
    }

    private function assertIdentifiersFree(?int $id, array $merged): void
    {
        foreach (['email', 'login_nip'] as $field) {
            $value = $merged[$field] ?? null;
            if (! $value) {
                continue;
            }
            $taken = DB::table('users')->where(fn ($q) => $q->where('email', $value)->orWhere('login_nip', $value))
                ->when($id, fn ($q) => $q->where('id', '!=', $id))->lockForUpdate()->exists();
            if ($taken) {
                throw new BusinessRule('IDENTIFIER_CONFLICT', 'Email atau NIP login sudah dipakai akun lain.', 422);
            }
        }
    }
}
