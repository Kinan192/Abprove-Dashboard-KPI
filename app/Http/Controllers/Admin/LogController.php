<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LogFilterRequest;
use App\Services\Admin\LogService;
use Illuminate\Http\JsonResponse;

class LogController extends Controller
{
    public function __construct(private LogService $logs) {}

    public function index(LogFilterRequest $r, string $type): JsonResponse
    {
        return response()->json($this->logs->paginate($type, $r->filters()));
    }

    public function audit(int $event): JsonResponse
    {
        return response()->json(['data' => $this->logs->auditDetail($event)]);
    }
}
