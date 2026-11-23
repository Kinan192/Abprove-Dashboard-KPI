<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\KpiMaster\KpiPatternImportRequest;
use App\Http\Requests\KpiMaster\KpiWorkspaceRequest;
use App\Services\IdentityAccess\AccessContext;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\KpiMaster\IntegratedKpiWorkspace;
use App\Services\KpiMaster\PatternImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * KPI & Periode workspace of Super HC. The route group (`context:super_hc`) already limits every action to
 * Super HC; mutations check the role again on the context resolved inside their transaction.
 */
class KpiWorkspaceController extends Controller
{
    public function __construct(private IntegratedKpiWorkspace $workspace, private MutationRunner $mutations) {}

    public function show(Request $request): JsonResponse
    {
        $cycle = is_string($request->query('cycle')) ? $request->query('cycle') : null;
        // `only=patterns`: patterns and assignments of one period (copy source), without people or monitoring.
        if ($request->query('only') === 'patterns') {
            return response()->json($this->workspace->patternsOf($cycle));
        }

        // Monitoring rows are the heaviest part of the document; only the monitoring screens ask for them.
        return response()->json($this->workspace->show($this->context($request), $cycle, $request->boolean('include_assessments')));
    }

    public function update(KpiWorkspaceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->mutations->run($request, $data, 'kpi-workspace.save', $this->superHcOnly(...),
            fn (AccessContext $ctx) => $this->workspace->save($ctx, (int) $data['revision'], $data['data']));

        return $this->show($request);
    }

    /** Row-level check of a pattern file (selected RSAB sheets, row corrections) for the selected period; nothing is stored. */
    public function importPreview(KpiPatternImportRequest $request, PatternImportService $import): JsonResponse
    {
        return response()->json(['data' => $import->preview($request->file('file'), $request->validated('month'), $request->sheets(), $request->edits())]);
    }

    /** Adds the patterns of a valid file to the selected period (all rows or nothing). */
    public function import(KpiPatternImportRequest $request, PatternImportService $import): JsonResponse
    {
        $payload = $request->fingerprint();
        $result = $this->mutations->run($request, $payload, 'kpi-workspace.import', $this->superHcOnly(...),
            fn (AccessContext $ctx) => $import->import($ctx, $payload['revision'], $request->file('file'), $payload['month'], $request->sheets(), $request->edits()));

        return response()->json($this->workspace->show($this->context($request), $payload['month'], $request->boolean('include_assessments')) + ['imported' => $result['data']]);
    }

    private function context(Request $request): AccessContext
    {
        return $request->attributes->get('access_context');
    }

    private function superHcOnly(AccessContext $context): void
    {
        abort_unless($context->role === 'super_hc', 403);
    }
}
