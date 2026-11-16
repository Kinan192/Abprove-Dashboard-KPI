<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\KpiMaster\KpiWorkspaceRequest;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\KpiMaster\IntegratedKpiWorkspace;
use Illuminate\Http\Request;

class KpiWorkspaceController extends Controller
{
    public function __construct(private IntegratedKpiWorkspace $workspace, private MutationRunner $mutations) {}

    public function show(Request $request)
    {
        $context = $request->attributes->get('access_context');
        abort_unless($context->role === 'super_hc', 403);

        // Monitoring rows are the heaviest part of the document; only the monitoring screens ask for them.
        return response()->json($this->workspace->show($context, $request->query('cycle'), $request->boolean('include_assessments')));
    }

    public function update(KpiWorkspaceRequest $request)
    {
        $data = $request->validated();
        $this->mutations->run($request, $data, 'kpi-workspace.save', fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->workspace->save($ctx, (int) $data['revision'], $data['data']));

        return $this->show($request);
    }
}
