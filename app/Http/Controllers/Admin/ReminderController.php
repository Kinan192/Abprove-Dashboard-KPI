<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReminderRequest;
use App\Models\AssessmentCycle;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Notification\ReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReminderController extends Controller
{
    public function __construct(private ReminderService $reminders) {}

    public function cycles(): JsonResponse
    {
        return response()->json(['data' => AssessmentCycle::orderByDesc('assessment_month')
            ->get(['id', 'assessment_month', 'status', 'submission_due_at', 'approval_due_at'])
            ->map(fn ($c) => ['id' => $c->id, 'month' => $c->assessment_month->format('Y-m'), 'status' => $c->status])]);
    }

    public function preview(Request $r): JsonResponse
    {
        $data = $r->validate([
            'cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'],
            'target' => ['required', Rule::in(ReminderService::TARGETS)],
        ]);
        $cycle = AssessmentCycle::findOrFail($data['cycle_id']);

        return response()->json(['data' => $this->reminders->recipients($r->attributes->get('access_context'), $cycle, $data['target'])]);
    }

    public function store(ReminderRequest $r, MutationRunner $mutations): JsonResponse
    {
        $data = $r->validated();

        return response()->json($mutations->run($r, $data, 'reminder.email:'.$data['cycle_id'],
            fn ($ctx) => abort_unless($ctx->role === 'admin', 403),
            fn ($ctx) => $this->reminders->send($ctx, AssessmentCycle::findOrFail($data['cycle_id']), $data)));
    }
}
