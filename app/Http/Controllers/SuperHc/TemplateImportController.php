<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Services\KpiMaster\TemplateImport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** "Impor indikator KPI" of the Master KPI editor: check a CSV/XLSX file and download the example file. */
class TemplateImportController extends Controller
{
    public function preview(Request $r, TemplateImport $import): JsonResponse
    {
        $r->validate(['file' => ['required', 'file', 'max:2048', 'extensions:csv,xlsx']]);

        return response()->json(['data' => $import->preview($r->file('file'))]);
    }

    public function sample(TemplateImport $import): Response
    {
        return response($import->sampleCsv(), 200, ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="template-kpi.csv"']);
    }
}
