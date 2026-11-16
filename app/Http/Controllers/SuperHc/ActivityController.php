<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LogFilterRequest;
use App\Services\Admin\LogService;
use Illuminate\Http\JsonResponse;

/** Super HC activity history: server-paginated audit metadata with lazily loaded snapshots. */
class ActivityController extends Controller
{
    public function __construct(private LogService $logs) {}

    public function index(LogFilterRequest $r): JsonResponse
    {
        return response()->json($this->logs->paginate('audit', $r->filters()));
    }

    public function show(int $activity): JsonResponse
    {
        return response()->json(['data' => $this->logs->auditDetail($activity)]);
    }
}
