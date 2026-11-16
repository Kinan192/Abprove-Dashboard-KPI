<?php

namespace App\Http\Controllers;

use App\Http\Requests\Reporting\DashboardRequest;
use App\Services\Reporting\DashboardSummary;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(DashboardRequest $request, DashboardSummary $summary): JsonResponse
    {
        return response()->json([
            'data' => $summary->build($request->attributes->get('access_context'), $request->validated('cycle')),
        ]);
    }
}
