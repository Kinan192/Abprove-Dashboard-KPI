<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\OrganizationRequest;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Organization\OrganizationService;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function __construct(private OrganizationService $service, private MutationRunner $mutations) {}

    public function index(Request $r, string $resource)
    {
        abort_unless(in_array($resource, OrganizationService::RESOURCES), 404);
        $data = $r->validate(['search' => ['sometimes', 'string', 'max:160'], 'division_id' => ['sometimes', 'integer', 'min:1']]);

        return response()->json($this->service->search($resource, $data));
    }

    public function show(Request $r, string $resource, int $id)
    {
        abort_unless(in_array($resource, OrganizationService::RESOURCES), 404);

        return response()->json(['data' => $this->service->safeRow($resource, $id)]);
    }

    public function store(OrganizationRequest $r, string $resource)
    {
        return $this->save($r, $resource, null);
    }

    public function update(OrganizationRequest $r, string $resource, int $id)
    {
        return $this->save($r, $resource, $id);
    }

    private function save(OrganizationRequest $r, string $resource, ?int $id)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, $resource.':'.($id ?? 'new'),
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->save($ctx, $resource, $id, $data)));
    }

    public function destroy(OrganizationRequest $r, string $resource, int $id)
    {
        return response()->json($this->mutations->run($r, $r->validated(), $resource.':delete:'.$id,
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->destroy($ctx, $resource, $id)));
    }
}
