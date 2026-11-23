<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\Organization\EmployeeImportRequest;
use App\Services\IdentityAccess\MutationRunner;
use App\Services\Organization\EmployeeImport;
use Illuminate\Http\JsonResponse;

/** Mass staff import: preview an uploaded CSV/XLSX, then create every previewed row in one transaction. */
class EmployeeImportController extends Controller
{
    public function __construct(private EmployeeImport $import, private MutationRunner $mutations) {}

    public function preview(EmployeeImportRequest $r): JsonResponse
    {
        return response()->json(['data' => $this->import->preview($this->import->read($r->file('file')))]);
    }

    public function store(EmployeeImportRequest $r): JsonResponse
    {
        $data = $r->validated();

        return response()->json($this->mutations->run($r, $data, 'employee.import',
            fn ($ctx) => abort_unless($ctx->role === 'super_hc', 403), fn ($ctx) => $this->import->import($ctx, $data)));
    }
}
