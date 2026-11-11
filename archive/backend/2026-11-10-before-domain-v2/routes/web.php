<?php

use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\Auth\AuthenticatedSessionController as Sessions;
use App\Http\Controllers\DesignReviewController;
use App\Http\Controllers\FrontendController;
use App\Http\Controllers\FrontendDataController;
use App\Http\Controllers\ReportingController;
use App\Http\Controllers\SuperHc\CycleController;
use App\Http\Controllers\SuperHc\KpiTemplateController;
use App\Http\Controllers\SuperHc\OrganizationController;
use App\Http\Controllers\SuperHc\TemplateImportController;
use Illuminate\Support\Facades\Route;

Route::get('/', [FrontendController::class, 'landing']);
Route::get('/design-review', [DesignReviewController::class, 'index'])->name('design-review.index');
Route::get('/design-review/{role}/{page?}', [DesignReviewController::class, 'page'])->whereIn('role', ['ku', 'kd', 'hc', 'login'])->name('design-review.page');
Route::get('/forgot-password', [DesignReviewController::class, 'forgot']);
Route::get('/login', [Sessions::class, 'create'])->name('login');
Route::post('/login', [Sessions::class, 'store'])->middleware('throttle:login');
Route::post('/logout', [Sessions::class, 'destroy']);

Route::middleware('context')->group(function () {
    Route::get('/me', [Sessions::class, 'show']);
    Route::get('/cycles', [CycleController::class, 'index']);
    Route::get('/cycles/{cycle}', [CycleController::class, 'show'])->whereNumber('cycle');
});

foreach (['unit' => 'kepala_unit', 'division' => 'kepala_divisi', 'hc' => 'super_hc'] as $prefix => $role) {
    Route::prefix($prefix.'/data')->middleware('context:'.$role)->group(function () {
        Route::get('/lookups', [FrontendDataController::class, 'lookups']);
        Route::get('/analytics', [FrontendDataController::class, 'analytics']);
        Route::get('/kpis', [FrontendDataController::class, 'kpis']);
        Route::get('/assessments/{assessment}/comparison', [FrontendDataController::class, 'comparison'])->whereNumber('assessment');
    });
    Route::prefix($prefix)->middleware(['context:'.$role, 'frontend'])->group(function () use ($role) {
        Route::get('/dashboard', [ReportingController::class, 'dashboard']);
        Route::get('/members', [ReportingController::class, 'members']);
        Route::get('/team', [ReportingController::class, 'team']);
        Route::get('/assessments', [AssessmentController::class, 'index']);
        Route::get('/assessments/{assessment}', [AssessmentController::class, 'show'])->whereNumber('assessment');
        Route::get('/assessments/{assessment}/timeline', [AssessmentController::class, 'timeline'])->whereNumber('assessment');
        Route::get('/recap', [ReportingController::class, 'recap']);
        Route::get('/help', [FrontendController::class, 'show']);
        Route::get('/notifications', [FrontendController::class, 'show']);
        Route::get('/profile', [FrontendController::class, 'show']);
        if ($role === 'kepala_unit') {
            Route::get('/score', [FrontendController::class, 'show']);
            Route::get('/submissions', [FrontendController::class, 'show']);
            Route::get('/history', [FrontendController::class, 'show']);
            Route::get('/kpis', [FrontendController::class, 'show']);
        }
        if ($role !== 'kepala_unit') {
            Route::get('/analytics', [FrontendController::class, 'show']);
        }
        if ($role === 'kepala_divisi') {
            Route::get('/approvals', [FrontendController::class, 'show']);
            Route::get('/kpis', [FrontendController::class, 'show']);
        }
        if ($role !== 'super_hc') {
            Route::post('/assessments', [AssessmentController::class, 'start']);
            Route::patch('/assessments/{assessment}/draft', [AssessmentController::class, 'draft'])->whereNumber('assessment');
            Route::post('/assessments/{assessment}/submit', [AssessmentController::class, 'submit'])->whereNumber('assessment');
        }
        if ($role === 'kepala_unit') {
            Route::post('/assessments/{assessment}/withdraw', [AssessmentController::class, 'withdraw'])->whereNumber('assessment');
        }
        if ($role === 'kepala_divisi') {
            Route::get('/heads', [ReportingController::class, 'heads']);
            Route::post('/assessments/{assessment}/approve', [AssessmentController::class, 'approve'])->whereNumber('assessment');
            Route::post('/assessments/{assessment}/return', [AssessmentController::class, 'returnAssessment'])->whereNumber('assessment');
            Route::post('/approvals/bulk', [AssessmentController::class, 'bulk']);
        }
    });
}

Route::prefix('hc')->middleware(['context:super_hc', 'frontend'])->group(function () {
    Route::post('/kpi-templates/import-preview', [TemplateImportController::class, 'preview']);
    Route::get('/import/sample', [TemplateImportController::class, 'sample'])->withoutMiddleware('frontend');
    Route::get('/organization', [FrontendController::class, 'show']);
    Route::get('/settings', [FrontendController::class, 'show']);
    Route::get('/import', [FrontendController::class, 'show']);
    Route::get('/placement', [FrontendController::class, 'show']);
    Route::get('/organization/{resource}', [OrganizationController::class, 'index'])->whereIn('resource', ['divisions', 'units', 'positions', 'employees', 'users']);
    Route::get('/organization/{resource}/{id}', [OrganizationController::class, 'show'])->whereIn('resource', ['divisions', 'units', 'positions', 'employees', 'users'])->whereNumber('id');
    Route::post('/organization/{resource}', [OrganizationController::class, 'store'])->whereIn('resource', ['divisions', 'units', 'positions', 'employees', 'users']);
    Route::patch('/organization/{resource}/{id}', [OrganizationController::class, 'update'])->whereIn('resource', ['divisions', 'units', 'positions', 'employees', 'users'])->whereNumber('id');
    Route::get('/employees/{employee}/placement-preview', [OrganizationController::class, 'placementPreview'])->whereNumber('employee');
    Route::post('/employees/{employee}/placement', [OrganizationController::class, 'place'])->whereNumber('employee');
    Route::get('/{area}/{id}/head-preview', [OrganizationController::class, 'headPreview'])->whereIn('area', ['divisions', 'units'])->whereNumber('id');
    Route::post('/{area}/{id}/head', [OrganizationController::class, 'assignHead'])->whereIn('area', ['divisions', 'units'])->whereNumber('id');
    Route::get('/assignments', [OrganizationController::class, 'assignments']);
    Route::get('/audit', [OrganizationController::class, 'audit']);
    Route::post('/assignments/{assignment}/revoke', [OrganizationController::class, 'revoke'])->whereNumber('assignment');
    Route::post('/users/{user}/grant-hc', [OrganizationController::class, 'grantHc'])->whereNumber('user');
    Route::get('/kpi-templates', [KpiTemplateController::class, 'index']);
    Route::get('/kpi-templates/new', [FrontendController::class, 'show']);
    Route::get('/kpi-templates/{template}', [KpiTemplateController::class, 'show'])->whereNumber('template');
    Route::post('/kpi-templates', [KpiTemplateController::class, 'store']);
    Route::patch('/kpi-templates/{template}', [KpiTemplateController::class, 'update'])->whereNumber('template');
    Route::post('/kpi-templates/{template}/publish', [KpiTemplateController::class, 'publish'])->whereNumber('template');
    Route::get('/cycles', [CycleController::class, 'index']);
    Route::get('/cycles/{cycle}', [CycleController::class, 'show'])->whereNumber('cycle');
    Route::post('/cycles', [CycleController::class, 'store']);
    Route::patch('/cycles/{cycle}', [CycleController::class, 'update'])->whereNumber('cycle');
    Route::post('/cycles/{cycle}/close', [CycleController::class, 'close'])->whereNumber('cycle');
});
