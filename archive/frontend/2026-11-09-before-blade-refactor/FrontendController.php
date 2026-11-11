<?php

namespace App\Http\Controllers;

use App\Models\AssessmentCycle;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\ScopeResolver;
use App\Support\FrontendPages;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FrontendController extends Controller
{
    public function landing(Request $r, ScopeResolver $scopes)
    {
        if ($r->expectsJson()) {
            return response()->json(['application' => 'KPI Kinerja', 'phase' => 'frontend', 'login' => '/login']);
        }

        return redirect(Auth::check() ? $scopes->resolve($r->user())->home() : '/login');
    }

    public function show(Request $r)
    {
        $ctx = $r->attributes->get('access_context');
        $page = FrontendPages::page($r->path());
        $views = ['dashboard', 'score', 'heads', 'approvals', 'submissions', 'history', 'analytics', 'kpis', 'members', 'team', 'detail', 'recap', 'templates', 'template-editor', 'settings', 'organization', 'users', 'employees', 'positions', 'audit', 'help', 'notifications', 'import'];
        abort_unless(in_array($page, $views), 404);
        if ($page === 'detail') {
            app(ScopedRecords::class)->assessments($ctx)->whereKey((int) $r->route('assessment'))->firstOrFail();
        }
        $unit = $ctx->unitId ? DB::table('units')->where('id', $ctx->unitId)->value('name') : null;
        $division = $ctx->divisionId ? DB::table('divisions')->where('id', $ctx->divisionId)->value('name') : null;
        $config = [
            'page' => $page, 'role' => $ctx->role, 'roleLabel' => FrontendPages::roleLabel($ctx->role),
            'prefix' => FrontendPages::prefix($ctx->role), 'scope' => $unit ?: ($division ?: 'Seluruh organisasi'),
            'user' => $r->user()->only(['id', 'name', 'email', 'login_nip']),
            'navigation' => FrontendPages::navigation($ctx->role),
            'assessmentId' => $r->route('assessment'), 'templateId' => $r->route('template'),
            'cycles' => AssessmentCycle::orderByDesc('assessment_month')->get()->toArray(),
            'requestedCycle' => $r->query('cycle_id'),
        ];
        $view = match ($page) {
            'score', 'heads', 'approvals', 'detail' => 'assessment',
            'users', 'employees', 'positions', 'audit' => 'records',
            'history', 'analytics' => 'analytics',
            'submissions', 'recap' => 'submissions',
            'members', 'team' => 'team',
            'templates', 'template-editor', 'kpis', 'import' => 'templates',
            default => $page,
        };

        return response()->view('pages.'.$view, compact('config'));
    }
}
