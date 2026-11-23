<?php

namespace App\Http\Controllers;

use App\Http\Requests\Notification\NotificationReadRequest;
use App\Queries\AssessmentTasks;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Notification\NotificationReads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private AssessmentTasks $tasks) {}

    public function index(Request $r): JsonResponse
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'min:1'], 'page' => ['sometimes', 'integer', 'min:1'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $cycle = $this->tasks->cycle($d['cycle_id']) ?? abort(404);

        return response()->json($this->tasks->page($r->attributes->get('access_context'), $cycle, $d['per_page'] ?? 25, $d['page'] ?? 1)->withPath($r->url()));
    }

    public function read(NotificationReadRequest $r, MutationRunner $mutations, NotificationReads $reads): JsonResponse
    {
        $d = $r->validated();

        return response()->json($mutations->run($r, $d, 'notifications.read', fn () => null,
            fn ($ctx) => $reads->markRead($ctx, (int) $d['cycle_id'], $d['keys'] ?? null)));
    }
}
