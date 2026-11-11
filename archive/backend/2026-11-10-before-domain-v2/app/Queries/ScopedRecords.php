<?php

namespace App\Queries;

use App\Models\Assessment;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Facades\DB;

class ScopedRecords
{
    public function assessments(AccessContext $ctx)
    {
        $q = Assessment::query();
        if ($ctx->role === 'super_hc') {
            return $q;
        }
        if ($ctx->role === 'kepala_unit') {
            $q->where('assessment_kind', 'member');
        }
        $q->where($ctx->role === 'kepala_unit' ? 'assessments.unit_id' : 'assessments.division_id',
            $ctx->role === 'kepala_unit' ? $ctx->unitId : $ctx->divisionId);

        // O-7: do not expose earlier heads' history or a former placement automatically.
        return $q->where('assessments.created_at', '>=', $ctx->assignedAt)
            ->whereExists(fn ($s) => $s->selectRaw('1')->from('employee_placements as p')
                ->whereColumn('p.id', 'assessments.placement_id')->whereNull('p.ended_at'));
    }

    public function members(AccessContext $ctx, bool $heads = false)
    {
        $q = DB::table('employees as e')->join('employee_placements as p', 'p.employee_id', '=', 'e.id')
            ->join('units as u', 'u.id', '=', 'p.unit_id')->join('divisions as d', 'd.id', '=', 'p.division_id')
            ->join('positions as j', 'j.id', '=', 'e.position_id')
            ->whereNull('p.ended_at')->where('p.started_at', '<=', now()->format('Y-m-d H:i:s.u'))
            ->where('e.is_active', true)->where('u.is_active', true)->where('d.is_active', true)->where('j.is_active', true);
        if ($ctx->role === 'kepala_unit') {
            $q->where('p.unit_id', $ctx->unitId);
        }
        if ($ctx->role === 'kepala_divisi') {
            $q->where('p.division_id', $ctx->divisionId);
        }

        $headScope = fn ($s) => $s->selectRaw('1')->from('scope_assignments as h')
            ->whereColumn('h.user_id', 'e.user_id')->whereNull('h.revoked_at')->where('h.assigned_at', '<=', now()->format('Y-m-d H:i:s.u'))
            ->whereIn('h.role_key', ['kepala_unit', 'kepala_divisi']);
        if ($heads) {
            $q->whereExists(fn ($s) => $s->selectRaw('1')->from('scope_assignments as h')
                ->whereColumn('h.user_id', 'e.user_id')->whereColumn('h.unit_id', 'p.unit_id')
                ->where('h.role_key', 'kepala_unit')->whereNull('h.revoked_at')->where('h.assigned_at', '<=', now()->format('Y-m-d H:i:s.u')));
        } else {
            $q->whereNotExists($headScope);
        }

        return $q;
    }
}
