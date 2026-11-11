<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\KpiTemplateRequest;
use App\Models\KpiTemplate;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\KpiMaster\KpiMasterService;
use Illuminate\Http\Request;

class KpiTemplateController extends Controller
{
    public function __construct(private KpiMasterService $service, private MutationRunner $mutations) {}

    public function index(Request $r)
    {
        $f = $r->validate(['position_id' => ['sometimes', 'integer', 'min:1'], 'template_year' => ['sometimes', 'integer', 'between:2000,2200']]);
        $q = KpiTemplate::query();
        foreach ($f as $k => $v) {
            $q->where($k, $v);
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function show(int $template)
    {
        return response()->json(['data' => KpiTemplate::with('items')->findOrFail($template)]);
    }

    public function store(KpiTemplateRequest $r)
    {
        return $this->save($r, null);
    }

    public function update(KpiTemplateRequest $r, int $template)
    {
        return $this->save($r, $template);
    }

    private function save(KpiTemplateRequest $r, ?int $id)
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'template.save:'.($id ?? 'new'), fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->template($ctx, $id, $data)));
    }

    public function publish(KpiTemplateRequest $r, int $template)
    {
        return response()->json($this->mutations->run($r, $r->validated(), 'template.publish:'.$template, fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->service->publish($ctx, $template)));
    }
}
