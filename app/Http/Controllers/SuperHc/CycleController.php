<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\CycleRequest;
use App\Http\Requests\RequestIdRequest;
use App\Models\AssessmentCycle;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\KpiMaster\KpiMasterService;

class CycleController extends Controller
{
    public function __construct(private KpiMasterService $service, private MutationRunner $mutations) {}

    public function index()
    {
        return response()->json(AssessmentCycle::orderByDesc('assessment_month')->paginate(25));
    }

    public function show(int $cycle)
    {
        return response()->json(['data' => $this->service->cycleDetail($cycle)]);
    }

    public function store(CycleRequest $r)
    {
        return $this->save($r, null);
    }

    public function update(CycleRequest $r, int $cycle)
    {
        return $this->save($r, $cycle);
    }

    private function save(CycleRequest $r, ?int $id)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'cycle.save:'.($id ?? 'new'), fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->cycle($ctx, $id, $data)));
    }

    public function destroy(RequestIdRequest $r, int $cycle)
    {
        return response()->json($this->mutations->run($r, $r->validated(), 'cycle.delete:'.$cycle, fn ($c) => abort_unless($c->role === 'super_hc', 403), fn ($c) => $this->service->destroyCycle($c, $cycle)));
    }

    public function close(RequestIdRequest $r, int $cycle)
    {
        return response()->json($this->mutations->run($r, $r->validated(), 'cycle.close:'.$cycle, fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->close($ctx, $cycle)));
    }
}
