<?php

namespace App\Queries;

use App\Models\AssessmentCycle;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** People, units and reference lists of the actor's scope, for lists and filters. */
class PeopleDirectory
{
    public function __construct(private ScopedRecords $records) {}

    /**
     * Staff (or Kepala Unit with `$heads`) of the scope, ordered by name. With `cycle_id` each row carries its
     * visible assessment of that cycle; `needs_input` keeps people without one or with a returned one.
     *
     * @param  array{cycle_id?: int, needs_input?: bool, search?: string, unit_id?: int, position_id?: int}  $filters
     */
    public function people(AccessContext $ctx, bool $heads, array $filters): Builder
    {
        $month = isset($filters['cycle_id']) ? AssessmentCycle::findOrFail($filters['cycle_id'])->assessment_month->format('Y-m-d') : null;
        $query = $this->records->members($ctx, $heads, $month);
        if (isset($filters['unit_id'])) {
            $query->where('u.id', $filters['unit_id']);
        }
        if (isset($filters['position_id'])) {
            // Kepala Unit have no position: a position filter matches none of them.
            $heads ? $query->whereRaw('1=0') : $query->where('e.position_id', $filters['position_id']);
        }
        if (isset($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(fn ($q) => $q->where($heads ? 'e.name' : 'e.full_name', 'like', $term)->orWhere($heads ? 'e.login_nip' : 'e.nip', 'like', $term));
        }
        if (isset($filters['cycle_id'])) {
            $visible = $this->records->assessments($ctx)->where('cycle_id', $filters['cycle_id'])->where('assessment_kind', $heads ? 'unit_head' : 'member')
                ->select('id', $heads ? 'subject_user_id' : 'employee_id', 'status', 'lock_version');
            $query->leftJoinSub($visible, 'a', $heads ? 'a.subject_user_id' : 'a.employee_id', '=', 'e.id')
                ->addSelect('a.id as assessment_id', 'a.status', 'a.lock_version');
            if ($filters['needs_input'] ?? false) {
                $query->where(fn ($q) => $q->whereNull('a.id')->orWhere('a.status', 'returned'));
            }
        }

        return $query->orderBy($heads ? 'e.name' : 'e.full_name');
    }

    /** Active units of the scope with their current head and the number of active staff placed this month. */
    public function teams(AccessContext $ctx): Collection
    {
        $month = now('Asia/Jakarta')->startOfMonth()->format('Y-m-d');
        $head = DB::table('scope_assignments as h')->join('users as u', 'u.id', '=', 'h.user_id')
            ->whereColumn('h.unit_id', 'units.id')->whereNull('h.revoked_at')->select('u.name')->limit(1);
        $staff = DB::table('employee_placements as p')->join('employees as e', 'e.id', '=', 'p.employee_id')
            ->whereColumn('p.unit_id', 'units.id')->where('p.effective_from', '<=', $month)
            ->where(fn ($q) => $q->whereNull('p.effective_until')->orWhere('p.effective_until', '>=', $month))
            ->where('e.is_active', true)->selectRaw('COUNT(*)');

        return $this->records->units($ctx)->select('units.*')->where('units.is_active', true)
            ->selectSub($head, 'head_name')->selectSub($staff, 'employee_count')
            ->orderBy('name')->get();
    }

    /** Positions for filters: every position for Super HC, otherwise the positions of the visible staff. */
    public function positions(AccessContext $ctx): Collection
    {
        return DB::table('positions')->select('id', 'code', 'name', 'is_active')
            ->when($ctx->role !== 'super_hc', fn ($q) => $q->whereIn('id', $this->records->members($ctx)->select('e.position_id')))
            ->orderBy('name')->get();
    }

    public function divisions(): Collection
    {
        return DB::table('divisions')->select('id', 'code', 'name', 'is_active')->orderBy('name')->get();
    }
}
