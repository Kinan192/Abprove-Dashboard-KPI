<?php

namespace App\Services\IdentityAccess;

use App\Exceptions\BusinessRule;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ScopeResolver
{
    public function resolve(User $user, bool $lock = false): AccessContext
    {
        if (! $user->is_active) {
            throw new BusinessRule('ACCOUNT_INACTIVE', 'Akun tidak aktif.', 403);
        }

        $query = DB::table('scope_assignments as s')
            ->join('user_roles as r', fn ($j) => $j->on('r.user_id', '=', 's.user_id')->on('r.role_key', '=', 's.role_key'))
            ->leftJoin('units as u', 'u.id', '=', 's.unit_id')
            ->leftJoin('divisions as d', function ($j) {
                $j->on('d.id', '=', DB::raw('COALESCE(s.division_id, u.division_id)'));
            })
            ->where('s.user_id', $user->id)->whereNull('s.revoked_at')->where('s.assigned_at', '<=', now()->format('Y-m-d H:i:s.u'))
            ->where(fn ($q) => $q->where('s.role_key', 'super_hc')->orWhere(fn ($q) => $q
                ->where('d.is_active', true)->where(fn ($q) => $q->whereNull('s.unit_id')->orWhere('u.is_active', true))))
            ->select('s.*', 'd.id as resolved_division_id')->orderBy('s.id');

        $rows = ($lock ? $query->lockForUpdate() : $query)->get();
        if ($rows->isEmpty()) {
            throw new BusinessRule('NO_ACTIVE_SCOPE', 'Tidak ada penugasan aktif untuk akun ini.', 403);
        }
        if ($rows->count() !== 1) {
            throw new BusinessRule('CONTEXT_UNRESOLVED', 'Akun memiliki beberapa konteks. Alur multi-penugasan belum disahkan (O-5).');
        }
        $s = $rows->first();

        return new AccessContext((int) $user->id, $s->role_key, (int) $s->id,
            $s->resolved_division_id === null ? null : (int) $s->resolved_division_id,
            $s->unit_id === null ? null : (int) $s->unit_id, $s->assigned_at);
    }
}
