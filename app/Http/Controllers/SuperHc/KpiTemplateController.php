<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\KpiMaster\KpiTemplateRequest;
use App\Http\Requests\RequestIdRequest;
use App\Models\KpiTemplate;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\KpiMaster\KpiMasterService;
use Illuminate\Http\Request;

class KpiTemplateController extends Controller
{
    public function __construct(private KpiMasterService $service, private MutationRunner $mutations) {}

    public function index(Request $r)
    {
        $f = $r->validate(['scope_level' => ['sometimes', 'in:unit,division'], 'scope_key' => ['sometimes', 'integer', 'min:1']]);
        $q = KpiTemplate::whereNotNull('sealed_at');
        foreach ($f as $k => $v) {
            $q->where($k, $v);
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function show(int $template)
    {
        return response()->json(['data' => KpiTemplate::whereNotNull('sealed_at')->with('items')->findOrFail($template)]);
    }

    public function store(KpiTemplateRequest $r)
    {
        $d = $r->validated();

        return response()->json($this->mutations->run($r, $d, 'template.apply', fn ($c) => abort_unless($c->role === 'super_hc', 403), fn ($c) => $this->service->template($c, null, $d)));
    }

    public function destroy(RequestIdRequest $r, int $template)
    {
        return response()->json($this->mutations->run($r, $r->validated(), 'template.delete:'.$template, fn ($c) => abort_unless($c->role === 'super_hc', 403), fn ($c) => $this->service->destroy($c, $template)));
    }
}
