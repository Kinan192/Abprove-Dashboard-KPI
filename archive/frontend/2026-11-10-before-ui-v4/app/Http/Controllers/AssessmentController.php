<?php

namespace App\Http\Controllers;

use App\Http\Requests\Assessment\AssessmentRequest;
use App\Models\AuditEvent;
use App\Queries\ScopedRecords;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AssessmentController extends Controller
{
    public function __construct(private AssessmentService $service, private MutationRunner $mutations, private ScopedRecords $records) {}

    public function index(Request $r)
    {
        $f = $r->validate(['cycle_id' => ['sometimes', 'integer', 'min:1'], 'status' => ['sometimes', 'in:submitted,returned,final'], 'kind' => ['sometimes', 'in:member,unit_head'], 'search' => ['sometimes', 'string', 'max:160'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1']]);
        $q = $this->records->assessments($r->attributes->get('access_context'));
        foreach (['cycle_id', 'status', 'unit_id', 'division_id'] as $key) {
            if (isset($f[$key])) {
                $q->where($key, $f[$key]);
            }
        }
        if (isset($f['kind'])) {
            $q->where('assessment_kind', $f['kind']);
        }
        if (isset($f['search'])) {
            $q->where(fn ($q) => $q->where('employee_name_snapshot', 'like', '%'.$f['search'].'%')->orWhere('nip_snapshot', 'like', '%'.$f['search'].'%'));
        }

        return response()->json($q->orderBy('id')->paginate(25));
    }

    public function show(Request $r, int $assessment)
    {
        $a = $this->records->assessments($r->attributes->get('access_context'))->whereKey($assessment)->with('items')->firstOrFail();
        Gate::authorize('view', $a);

        return response()->json(['data' => $a]);
    }

    public function form(Request $r)
    {
        $data = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'employee_id' => [$r->is('unit/*') ? 'required' : 'prohibited', 'integer', 'min:1'], 'subject_user_id' => [$r->is('division/*') ? 'required' : 'prohibited', 'integer', 'min:1']]);

        return response()->json(['data' => $this->service->form($r->attributes->get('access_context'), $data)]);
    }

    public function timeline(Request $r, int $assessment)
    {
        $this->records->assessments($r->attributes->get('access_context'))->whereKey($assessment)->firstOrFail();

        return response()->json(AuditEvent::where('assessment_id', $assessment)->orderByDesc('id')->paginate(25));
    }

    public function store(AssessmentRequest $r)
    {
        $d = $r->validated();

        return response()->json($this->mutations->run($r, $d, 'assessment.send', fn ($c) => abort_unless(in_array($c->role, ['kepala_unit', 'kepala_divisi']), 403), fn ($c) => $this->service->store($c, $d)));
    }

    public function resubmit(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'resubmit');
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
        $d = $r->validated();

        return response()->json($this->mutations->run($r, $d, 'assessment.'.$action.':'.$id, fn ($c) => $this->service->authorize($c, $id, $action), fn ($c) => $this->service->change($c, $id, $action, $d)));
    }

    public function bulk(AssessmentRequest $r)
    {
        $d = $r->validated();
        $rows = collect($d['assessments'])->sortBy('id')->values();

        return response()->json($this->mutations->run($r, $d, 'assessment.bulk-approve', function ($c) use ($rows) {
            foreach ($rows as $row) {
                $this->service->authorize($c, $row['id'], 'approve');
            }
        }, fn ($c) => $rows->map(fn ($row) => $this->service->change($c, $row['id'], 'approve', $row))->all()));
    }
}
