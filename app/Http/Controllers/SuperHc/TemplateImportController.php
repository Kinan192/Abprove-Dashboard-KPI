<?php

namespace App\Http\Controllers\SuperHc;

use App\Http\Controllers\Controller;
use App\Http\Requests\KpiTemplateRequest;
use App\Services\KpiMaster\TemplateImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TemplateImportController extends Controller
{
    public function preview(Request $r, TemplateImport $import)
    {
        $r->validate(['file' => ['required', 'file', 'max:2048', 'extensions:csv,xlsx']]);
        $items = $import->rows($r->file('file'));
        $allRules = (new KpiTemplateRequest)->setRouteResolver(fn () => $r->route())->rules();
        $rules = array_filter($allRules, fn ($k) => $k === 'items' || str_starts_with($k, 'items.'), ARRAY_FILTER_USE_KEY);
        $validator = Validator::make(['items' => $items], $rules);
        $sum = '0';
        foreach ($items as $item) {
            if (is_numeric($item['weight_percent']) && preg_match('/^\d{1,3}(?:\.\d{1,4})?$/D', $item['weight_percent'])) {
                $sum = bcadd($sum, $item['weight_percent'], 4);
            }
        }
        $errors = $validator->errors()->toArray();
        if (bccomp($sum, '100', 4) !== 0) {
            $errors['weight_percent'] = ['Total bobot harus tepat 100%.'];
        }

        return response()->json(['data' => ['items' => $items, 'errors' => $errors, 'weight_total' => $sum, 'valid' => ! $errors]]);
    }

    public function sample()
    {
        return response(implode(',', TemplateImport::COLUMNS)."\r\nTechnical Care,Kepatuhan dokumentasi,,,,95%,60.0000\r\nEfficient,Efisiensi sumber daya,,,,<20%,40.0000\r\n", 200,
            ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="template-kpi.csv"']);
    }
}
