<?php

namespace App\Queries;

use App\Models\Assessment;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ScopedRecords
{
    public function assessments(AccessContext $ctx)
    {
        $q = Assessment::query();
        if ($ctx->role === 'kepala_unit') {
            return $q->where('assessment_kind', 'member')->where('unit_id', $ctx->unitId);
        }
        if ($ctx->role === 'kepala_divisi') {
            return $q->where('division_id', $ctx->divisionId);
        }

        return $q;
    }

    public function members(AccessContext $ctx, bool $heads = false, ?string $month = null)
    {
        $month ??= now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
        if ($heads) {
            $end = CarbonImmutable::parse($month, 'Asia/Jakarta')->addMonth()->utc()->format('Y-m-d H:i:s.u');
            $q = DB::table('users as e')->join('scope_assignments as h', 'h.user_id', '=', 'e.id')
                ->join('units as u', 'u.id', '=', 'h.unit_id')->join('divisions as d', 'd.id', '=', 'u.division_id')
                ->where('h.role_key', 'kepala_unit')->where('h.assigned_at', '<', $end)
                ->where(fn ($q) => $q->whereNull('h.revoked_at')->orWhere('h.revoked_at', '>=', $end))
                ->where('e.is_active', true)->where('u.is_active', true)->where('d.is_active', true)
                ->selectRaw("e.id,e.name as full_name,e.login_nip as nip,NULL as position_id,NULL as placement_id,h.id as head_assignment_id,u.id as unit_id,d.id as division_id,u.name as unit_name,d.name as division_name,'Kepala Unit' as position_name");
            if ($ctx->role === 'kepala_unit') {
                $q->whereRaw('1=0');
            }
        } else {
            $q = DB::table('employees as e')->join('employee_placements as p', 'p.employee_id', '=', 'e.id')
                ->join('units as u', 'u.id', '=', 'p.unit_id')->join('divisions as d', 'd.id', '=', 'p.division_id')
                ->join('positions as j', 'j.id', '=', 'e.position_id')->where('p.effective_from', '<=', $month)
                ->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $month))
                ->where('e.is_active', true)->where('u.is_active', true)->where('d.is_active', true)->where('j.is_active', true)
                ->selectRaw('e.id,e.full_name,e.nip,e.position_id,p.id as placement_id,NULL as head_assignment_id,u.id as unit_id,d.id as division_id,u.name as unit_name,d.name as division_name,j.name as position_name');
        }
        if ($ctx->role === 'kepala_unit') {
            $q->where('u.id', $ctx->unitId);
        }
        if ($ctx->role === 'kepala_divisi') {
            $q->where('d.id', $ctx->divisionId);
        }

        return $q;
    }

    public function units(AccessContext $ctx)
    {
        return DB::table('units')->when($ctx->role === 'kepala_unit', fn ($q) => $q->where('id', $ctx->unitId))
            ->when($ctx->role === 'kepala_divisi', fn ($q) => $q->where('division_id', $ctx->divisionId));
    }
}
