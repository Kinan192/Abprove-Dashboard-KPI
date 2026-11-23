<?php

namespace App\Queries;

use App\Services\IdentityAccess\AccessContext;
use Illuminate\Database\Eloquent\Builder;

/** Assessment lists of the actor's scope: the assessment list and the recap share the same filters. */
class AssessmentSearch
{
    public function __construct(private ScopedRecords $records) {}

    /**
     * Visible assessments narrowed by the list filters.
     *
     * @param  array{cycle_id?: int, status?: ?string, unit_id?: int, division_id?: int, kind?: string, search?: string}  $filters
     */
    public function filtered(AccessContext $ctx, array $filters): Builder
    {
        $query = $this->records->assessments($ctx);
        foreach (['cycle_id', 'status', 'unit_id', 'division_id'] as $key) {
            if (isset($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }
        if (isset($filters['kind'])) {
            $query->where('assessment_kind', $filters['kind']);
        }
        if (isset($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(fn ($q) => $q->where('employee_name_snapshot', 'like', $term)->orWhere('nip_snapshot', 'like', $term));
        }

        return $query;
    }

    /** Recap rows of one cycle: Final only by default, every status with `status=all`. */
    public function recap(AccessContext $ctx, array $filters): Builder
    {
        $status = $filters['status'] ?? 'final';

        return $this->filtered($ctx, ['status' => $status === 'all' ? null : $status] + $filters)
            ->select('id', 'assessment_kind', 'nip_snapshot', 'employee_name_snapshot', 'division_name_snapshot', 'unit_name_snapshot', 'status',
                'total_score_raw', 'category_label_snapshot', 'positive_finding', 'negative_finding', 'finalized_by', 'finalized_at')
            ->orderBy('id');
    }
}
