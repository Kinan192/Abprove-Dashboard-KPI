<?php

namespace App\Http\Middleware;

use App\Queries\WorkspaceQuery;
use App\Services\IdentityAccess\ScopeResolver;
use App\ViewModels\AbproveDesign;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AppendWorkspaceUpdate
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $profile = $request->header('X-KPI-Workspace');
        if ($request->isMethodSafe() || ! $response instanceof JsonResponse || ! $response->isSuccessful()
            || ! is_string($profile) || ! array_key_exists($profile, AbproveDesign::WORKSPACE_PROFILES)
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
            $path === 'approvals/bulk', $path === 'assessments', str_starts_with($path, 'assessments/') => ['assessments', 'assessmentTemplates', 'notifications', 'navCounts'],
            $path === 'profile' => ['accounts', 'profiles'],
            str_starts_with($path, 'organization/positions') => ['positions'],
            str_starts_with($path, 'organization/employees'), $path === 'employees/transfers' => ['staff', 'notifications', 'navCounts'],
            str_starts_with($path, 'organization/'), $path === 'heads/reassign' => ['accounts', 'divisions', 'units', 'kpiUnits', 'heads', 'notifications', 'navCounts'],
            str_starts_with($path, 'kpi-templates') => ['kpis'],
            $path === 'cycles', str_starts_with($path, 'cycles/') => ['cycles', 'notifications', 'navCounts'],
            $path === 'notifications/read' => ['notifications'],
            default => null,
        };
        if ($sections === null) {
            return $response;
        }
        // The update uses the page profile, so it carries the same sections and month window as the page.
        $sections = array_values(array_intersect($sections, AbproveDesign::WORKSPACE_PROFILES[$profile]['sections']));
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
        $cycle = $request->header('X-KPI-Cycle');
        $cycle = is_string($cycle) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $cycle) ? $cycle : null;
        try {
            // Build fresh read data after the mutation transaction has committed, including replays.
            $user = $request->user()->fresh();
            $update = app(WorkspaceQuery::class)->build(app(ScopeResolver::class)->resolve($user), $user, $profile, $sections, $cycle,
                $ids === null ? null : array_map('intval', $ids), $request->header('X-KPI-Insights') === '1');
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
