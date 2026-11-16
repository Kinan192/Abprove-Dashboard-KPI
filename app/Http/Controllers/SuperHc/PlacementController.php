<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\TransferPreviewRequest;
use App\Http\Requests\Organization\TransferRequest;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Organization\PlacementService;
use Illuminate\Http\JsonResponse;

class PlacementController extends Controller
{
    public function __construct(private PlacementService $placements, private MutationRunner $mutations) {}

    public function preview(TransferPreviewRequest $r): JsonResponse
    {
        $data = $r->validated();

        return response()->json(['data' => $this->placements->preview($data['employee_ids'], $data['unit_id'] ?? null, $data['effective_from'])]);
    }

    public function transfer(TransferRequest $r): JsonResponse
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'employee.transfer:'.$data['unit_id'],
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->placements->transfer($ctx, $data)));
    }
}
