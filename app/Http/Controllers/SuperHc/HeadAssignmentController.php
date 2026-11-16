<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\HeadPreviewRequest;
use App\Http\Requests\Organization\HeadReassignRequest;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Organization\HeadAssignmentService;
use Illuminate\Http\JsonResponse;

class HeadAssignmentController extends Controller
{
    public function __construct(private HeadAssignmentService $heads, private MutationRunner $mutations) {}

    public function preview(HeadPreviewRequest $r): JsonResponse
    {
        return response()->json(['data' => $this->heads->preview($r->validated())]);
    }

    public function reassign(HeadReassignRequest $r): JsonResponse
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'head.'.$data['operation'].':'.$data['area'].':'.$data['area_id'],
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->heads->reassign($ctx, $data)));
    }
}
