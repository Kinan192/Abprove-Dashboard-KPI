<?php

namespace App\Http\Controllers;

use App\Http\Requests\Assessment\AssessmentRequest;
use App\Queries\AssessmentSearch;
use App\Queries\ScopedRecords;
use App\Services\Assessment\AssessmentHistory;
use App\Services\Assessment\AssessmentService;
use App\Services\IdentityAccess\MutationRunner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AssessmentController extends Controller
{
    public function __construct(private AssessmentService $service, private MutationRunner $mutations, private ScopedRecords $records, private AssessmentHistory $history) {}

    public function index(Request $r, AssessmentSearch $search)
    {
        $f = $r->validate([
            'cycle_id' => ['sometimes', 'integer', 'min:1'], 'status' => ['sometimes', 'in:submitted,returned,final'], 'kind' => ['sometimes', 'in:member,unit_head'],
            'search' => ['sometimes', 'string', 'max:160'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'],
        ]);

        return response()->json($search->filtered($r->attributes->get('access_context'), $f)->orderBy('id')->paginate(25));
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

    /** History of a visible assessment's subject-period, including submissions withdrawn before it. */
    public function timeline(Request $r, int $assessment)
    {
        $ctx = $r->attributes->get('access_context');
        $a = $this->records->assessments($ctx)->toBase()->where('id', $assessment)->first(['id', 'cycle_id', 'assessment_kind', 'employee_id', 'subject_user_id']);
        abort_unless($a, 404);
        $member = $a->assessment_kind === 'member';

        return response()->json(['data' => $this->history->timeline($ctx, $a->cycle_id, $a->assessment_kind, $member ? $a->employee_id : $a->subject_user_id, $a->id)]);
    }

    /** History of one subject-period without a current assessment, e.g. after a withdrawn submission. */
    public function history(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $d = $r->validate([
            'cycle_id' => ['required', 'integer', 'min:1'],
            'employee_id' => ['required_without:subject_user_id', 'prohibits:subject_user_id', 'integer', 'min:1'],
            'subject_user_id' => [$ctx->role === 'kepala_unit' ? 'prohibited' : 'required_without:employee_id', 'integer', 'min:1'],
        ]);
        $member = isset($d['employee_id']);

        return response()->json(['data' => $this->history->timeline($ctx, $d['cycle_id'], $member ? 'member' : 'unit_head', $member ? $d['employee_id'] : $d['subject_user_id'])]);
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

    /** Division head reviewed scores on a submitted staff assessment before Final; the unit head's proposal stays. */
    public function adjust(AssessmentRequest $r, int $assessment)
    {
        return $this->mutate($r, $assessment, 'adjust');
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
        }, fn ($c) => $rows->map(fn ($row) => $this->service->change($c, $row['id'], 'approve', $row + ['request_id' => $d['request_id']], $rows->count()))->all()));
    }
}
