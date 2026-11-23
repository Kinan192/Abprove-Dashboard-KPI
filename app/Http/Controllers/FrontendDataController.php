<?php

namespace App\Http\Controllers;

use App\Models\AssessmentCycle;
use App\Queries\PeopleDirectory;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\AccessContext;
use App\Services\Reporting\AssessmentAnalytics;
use App\Services\Reporting\Insights;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** JSON data of the shared pages (KU, KD, Super HC): filters, KPI lists, analytics and insights. */
class FrontendDataController extends Controller
{
    private const ANALYTICS_FILTERS = [
        'cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id'], 'unit_id' => ['sometimes', 'integer', 'min:1'],
        'division_id' => ['sometimes', 'integer', 'min:1'], 'kind' => ['sometimes', 'in:member,unit_head'],
        'template_id' => ['sometimes', 'integer', 'min:1'], 'search' => ['sometimes', 'string', 'max:160'],
    ];

    public function __construct(private ScopedRecords $records, private AssessmentAnalytics $analytics) {}

    public function insights(Request $r, Insights $insights): JsonResponse
    {
        $f = $r->validate(self::ANALYTICS_FILTERS);

        return response()->json(['data' => $insights->forCycle($this->context($r), $f['cycle_id'], $f)]);
    }

    /** Small reference lists for filters. People and accounts are paged by `/members`, `/heads` and the workspace. */
    public function lookups(Request $r, PeopleDirectory $directory): JsonResponse
    {
        $ctx = $this->context($r);
        $result = ['units' => $directory->teams($ctx), 'positions' => $directory->positions($ctx)];
        if ($ctx->role === 'super_hc') {
            $result['divisions'] = $directory->divisions();
        }

        return response()->json(['data' => $result]);
    }

    public function kpis(Request $r): JsonResponse
    {
        $d = $r->validate(['cycle_id' => ['required', 'integer', 'exists:assessment_cycles,id']]);
        $month = AssessmentCycle::findOrFail($d['cycle_id'])->assessment_month->format('Y-m-d');

        return response()->json(['data' => $this->records->kpiTemplates($this->context($r), $month)->with('items')->orderBy('id')->get()]);
    }

    public function analytics(Request $r): JsonResponse
    {
        $f = $r->validate(self::ANALYTICS_FILTERS + ['matrix_page' => ['sometimes', 'integer', 'min:1']]);

        return response()->json(['data' => $this->analytics->summary($this->context($r), $f)]);
    }

    public function comparison(Request $r, int $assessment): JsonResponse
    {
        return response()->json(['data' => $this->analytics->comparison($this->context($r), $assessment)]);
    }

    private function context(Request $r): AccessContext
    {
        return $r->attributes->get('access_context');
    }
}
