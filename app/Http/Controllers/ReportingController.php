<?php

namespace App\Http\Controllers;

use App\Http\Requests\Reporting\ExportRequest;
use App\Queries\AssessmentSearch;
use App\Queries\PeopleDirectory;
use App\Services\Reporting\PeriodExport;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportingController extends Controller
{
    private const TSV_HEADER = ['ID', 'Jenis', 'NIP', 'Nama', 'Divisi', 'Unit', 'Status', 'Nilai', 'Kategori', 'Temuan positif', 'Temuan negatif', 'Pemutus', 'Final UTC'];

    public function __construct(private PeopleDirectory $directory) {}

    /** Period export data (month, quarter, semester or year) in the actor scope; KPI items stream when requested. */
    public function export(ExportRequest $r, PeriodExport $export)
    {
        return response()->streamJson(['data' => $export->build($r->attributes->get('access_context'), $r->validated())], 200, ['Cache-Control' => 'no-store']);
    }

    public function members(Request $r): JsonResponse
    {
        return $this->people($r, false);
    }

    public function heads(Request $r): JsonResponse
    {
        return $this->people($r, true);
    }

    public function team(Request $r): JsonResponse
    {
        return response()->json(['data' => $this->directory->teams($r->attributes->get('access_context'))]);
    }

    public function recap(Request $r, AssessmentSearch $search): JsonResponse|StreamedResponse
    {
        $f = $r->validate([
            'cycle_id' => ['required', 'integer', 'min:1'], 'unit_id' => ['sometimes', 'integer', 'min:1'], 'division_id' => ['sometimes', 'integer', 'min:1'],
            'format' => ['sometimes', 'in:json,tsv'], 'status' => ['sometimes', 'in:submitted,returned,final,all'], 'kind' => ['sometimes', 'in:member,unit_head'],
            'search' => ['sometimes', 'string', 'max:160'],
        ]);
        $query = $search->recap($r->attributes->get('access_context'), $f);

        return ($f['format'] ?? 'json') === 'tsv' ? $this->tsv($query) : response()->json($query->paginate(25));
    }

    private function people(Request $r, bool $heads): JsonResponse
    {
        $d = $r->validate([
            'cycle_id' => ['required_with:needs_input', 'integer', 'min:1'], 'needs_input' => ['sometimes', 'boolean'], 'search' => ['sometimes', 'string', 'max:160'],
            'unit_id' => ['sometimes', 'integer', 'min:1'], 'position_id' => ['sometimes', 'integer', 'min:1'],
        ]);

        return response()->json($this->directory->people($r->attributes->get('access_context'), $heads, $d)->paginate(25));
    }

    /** Recap as a tab-separated download; cells starting with = + @ - are quoted so spreadsheets never run them. */
    private function tsv(Builder $query): StreamedResponse
    {
        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, self::TSV_HEADER, "\t", '"', '');
            foreach ($query->cursor() as $row) {
                $cells = array_map(function ($value) {
                    $text = str_replace(["\t", "\r", "\n"], ' ', (string) $value);

                    return preg_match('/^[=+@-]/', ltrim($text)) ? "'".$text : $text;
                }, array_values($row->toArray()));
                fputcsv($out, $cells, "\t", '"', '');
            }
            fclose($out);
        }, 'rekap-kpi.tsv', ['Content-Type' => 'text/tab-separated-values; charset=UTF-8']);
    }
}
