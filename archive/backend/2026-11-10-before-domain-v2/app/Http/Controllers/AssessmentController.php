<?php

namespace App\Http\Controllers;

use App\Http\Requests\Assessment\AssessmentRequest;
use App\Models\AuditEvent;
use App\Queries\ScopedRecords;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\AccessContext;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AssessmentController extends Controller
{
    public function __construct(private AssessmentService $service, private MutationRunner $mutations, private ScopedRecords $records) {}

    public function index(Request $r)
    {
        $filters = $r->validate(['cycle_id' => ['sometimes', 'integer', 'min:1'], 'status' => ['sometimes', 'in:draft,returned,submitted,final'],
            'kind' => ['sometimes', 'in:member,unit_head'], 'search' => ['sometimes', 'string', 'max:160'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1']]);
        $q = $this->records->assessments($r->attributes->get('access_context'));
        foreach (['cycle_id', 'status', 'unit_id', 'division_id'] as $f) {
            if (isset($filters[$f])) {
                $q->where($f, $filters[$f]);
            }
        }
        if (isset($filters['kind'])) {
            $q->where('assessment_kind', $filters['kind']);
        }
        if (isset($filters['search'])) {
            $q->where(fn ($q) => $q->where('employee_name_snapshot', 'like', '%'.$filters['search'].'%')->orWhere('nip_snapshot', 'like', '%'.$filters['search'].'%'));
        }

        return response()->json($q->orderBy('id')->paginate(25));
    }

    public function show(Request $r, int $assessment)
    {
        $record = $this->records->assessments($r->attributes->get('access_context'))->whereKey($assessment)->with('items')->firstOrFail();
        Gate::authorize('view', $record);

        return response()->json(['data' => $record]);
    }

    public function timeline(Request $r, int $assessment)
    {
        $this->records->assessments($r->attributes->get('access_context'))->whereKey($assessment)->firstOrFail();

        return response()->json(AuditEvent::leftJoin('users', 'users.id', '=', 'audit_events.actor_user_id')->where('assessment_id', $assessment)->select('audit_events.*', 'users.name as actor_name')->orderByDesc('audit_events.id')->paginate(25));
    }

    public function start(AssessmentRequest $r)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'assessment.start',
            function (AccessContext $ctx) use ($data) {
                if (! in_array($ctx->role, ['kepala_unit', 'kepala_divisi'])) {
                    abort(403);
                }
                $this->records->members($ctx, $ctx->role === 'kepala_divisi')->where('e.id', $data['employee_id'])->firstOrFail();
            }, fn ($ctx) => $this->service->start($ctx, $data)));
    }

    public function draft(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'draft');
    }

    public function submit(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'submit');
    }

    public function withdraw(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'withdraw');
    }

    public function approve(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'approve');
    }

    public function returnAssessment(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'return');
    }

    private function mutate(AssessmentRequest $r, int $id, string $action)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'assessment.'.$action.':'.$id,
            fn ($ctx) => $this->service->authorize($ctx, $id, $action), fn ($ctx) => $this->service->change($ctx, $id, $action, $data)));
    }

    public function bulk(AssessmentRequest $r)
    {
        $data = $r->validated();
        $rows = collect($data['assessments'])->sortBy('id')->values();

        return response()->json($this->mutations->run($r, $data, 'assessment.bulk-approve',
            function ($ctx) use ($rows) {
                foreach ($rows as $row) {
                    $this->service->authorize($ctx, $row['id'], 'approve');
                }
            },
            fn ($ctx) => $rows->map(fn ($row) => $this->service->change($ctx, $row['id'], 'approve', $row))->all()));
    }
}
