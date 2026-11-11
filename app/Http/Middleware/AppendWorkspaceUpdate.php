<?php

namespace App\Http\Middleware;

use App\Http\Controllers\WorkspaceController;
use App\Queries\ScopedRecords;
use App\Services\IdentityAccess\ScopeResolver;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AppendWorkspaceUpdate
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $page = $request->header('X-KPI-Workspace');
        if ($request->isMethodSafe() || ! $response instanceof JsonResponse || ! $response->isSuccessful()
            || ! is_string($page) || ! preg_match('/^[a-z-]{1,32}$/D', $page)
            || ! $request->attributes->has('access_context')) {
            return $response;
        }
        $payload = $response->getData(true);
        if (! is_array($payload) || ! array_key_exists('data', $payload) || ! array_key_exists('replayed', $payload)) {
            return $response;
        }
        $path = preg_replace('#^(unit|division|hc)/#', '', $request->path());
        $ids = null;
        $sections = match (true) {
            $path === 'approvals/bulk', $path === 'assessments', str_starts_with($path, 'assessments/') => ['assessments', 'assessmentTemplates', 'notifications'],
            $path === 'profile' => ['accounts', 'profiles'],
            str_starts_with($path, 'organization/positions') => ['positions'],
            str_starts_with($path, 'organization/employees'), (bool) preg_match('#^employees/\d+/placement$#', $path) => ['staff', 'notifications'],
            str_starts_with($path, 'organization/'), (bool) preg_match('#^(divisions|units)/\d+/head$#', $path),
            str_starts_with($path, 'assignments/'), (bool) preg_match('#^users/\d+/grant-hc$#', $path) => ['accounts', 'divisions', 'units', 'kpiUnits', 'heads', 'notifications'],
            str_starts_with($path, 'kpi-templates') => ['kpis'],
            $path === 'cycles', str_starts_with($path, 'cycles/') => ['cycles', 'notifications'],
            $path === 'notifications/read', (bool) preg_match('#^units/\d+/remind$#', $path) => ['notifications', 'activities'],
            default => null,
        };
        if ($sections === null) {
            return $response;
        }
        if (in_array('assessments', $sections, true)) {
            $rows = array_is_list($payload['data']) ? $payload['data'] : [$payload['data']];
            $ids = array_values(array_unique(array_filter(array_map(
                fn (array $row) => $row['id'] ?? $row['assessment_id'] ?? null,
                $rows,
            ))));
            if ($ids === [] || count($ids) > 100) {
                return $response;
            }
        }
        $query = ['compact' => 1, 'page' => $page, 'only' => $sections];
        $cycle = $request->header('X-KPI-Cycle');
        if (is_string($cycle) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $cycle)) {
            $query['cycle'] = $cycle;
        }
        if ($ids !== null) {
            $query['assessment_ids'] = $ids;
        }
        $query['include_insights'] = $request->header('X-KPI-Insights') === '1';
        try {
            // Build fresh read data after the mutation transaction has committed, including replays.
            $read = Request::create($request->url(), 'GET', $query);
            $user = $request->user()->fresh();
            $read->attributes->set('access_context', app(ScopeResolver::class)->resolve($user));
            $read->setUserResolver(fn () => $user);
            $update = app(WorkspaceController::class)->show($read, app(ScopedRecords::class))->getData(true);
            $update['assessmentIds'] = $ids;
            $payload['workspace'] = $update;
        } catch (Throwable $error) {
            report($error);
            $payload['workspace_refresh_required'] = true;
        }
        $response->setData($payload);

        return $response;
    }
}
