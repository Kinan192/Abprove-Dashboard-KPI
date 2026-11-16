<?php

namespace App\Http\Controllers;

use App\Http\Requests\Reporting\WorkspaceRequest;
use App\Queries\WorkspaceQuery;

class WorkspaceController extends Controller
{
    public function show(WorkspaceRequest $r, WorkspaceQuery $workspace)
    {
        $d = $r->validated();

        return response()->json($workspace->build($r->attributes->get('access_context'), $r->user(), $d['page'], $d['only'] ?? null, $d['cycle'] ?? null,
            isset($d['assessment_ids']) ? array_map('intval', $d['assessment_ids']) : null, $r->boolean('include_insights')));
    }
}
