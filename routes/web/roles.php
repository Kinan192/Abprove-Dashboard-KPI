<?php

use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExtensionController;
use App\Http\Controllers\FrontendController;
use App\Http\Controllers\FrontendDataController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportingController;
use App\Http\Controllers\SuperHc\ActivityController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;

// Pages and data shared by the assessment roles. Admin is deliberately not part of this loop.
foreach (['unit' => 'kepala_unit', 'division' => 'kepala_divisi', 'hc' => 'super_hc'] as $prefix => $role) {
    Route::prefix($prefix.'/data')->middleware(['context:'.$role, 'schema.v2'])->group(function () use ($role) {
        Route::get('/workspace', [WorkspaceController::class, 'show']);
        Route::get('/insights', [FrontendDataController::class, 'insights']);
        Route::get('/report-export', [ReportingController::class, 'export']);
        Route::get('/lookups', [FrontendDataController::class, 'lookups']);
        Route::get('/analytics', [FrontendDataController::class, 'analytics']);
        Route::get('/kpis', [FrontendDataController::class, 'kpis']);
        Route::get('/assessments/{assessment}/comparison', [FrontendDataController::class, 'comparison'])->whereNumber('assessment');
        Route::get('/dashboard', DashboardController::class);
        if ($role === 'super_hc') {
            Route::get('/activities/{activity}', [ActivityController::class, 'show'])->whereNumber('activity');
            Route::get('/extensions', [ExtensionController::class, 'overview']);
        }
    });
    Route::prefix($prefix)->middleware(['context:'.$role, 'frontend', 'schema.v2'])->group(function () use ($role) {
        Route::get('/dashboard', [FrontendController::class, 'show']);
        Route::get('/members', [ReportingController::class, 'members']);
        Route::get('/team', [ReportingController::class, 'team']);
        Route::get('/assessments', [AssessmentController::class, 'index']);
        Route::get('/assessments/{assessment}', [AssessmentController::class, 'show'])->whereNumber('assessment');
        Route::get('/assessments/{assessment}/timeline', [AssessmentController::class, 'timeline'])->whereNumber('assessment');
        Route::get('/assessment-history', [AssessmentController::class, 'history']);
        Route::get('/recap', [ReportingController::class, 'recap']);
        Route::get('/help', [FrontendController::class, 'show']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read', [NotificationController::class, 'read']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::get('/profile/photo', [ProfileController::class, 'photo'])->withoutMiddleware('frontend');
        Route::post('/profile', [ProfileController::class, 'update']);
        if ($role !== 'super_hc') {
            Route::post('/extensions', [ExtensionController::class, 'store']);
            Route::post('/extensions/{extension}/cancel', [ExtensionController::class, 'cancel'])->whereNumber('extension');
        }
        if ($role === 'kepala_unit') {
            Route::get('/score', [FrontendController::class, 'show']);
            Route::get('/submissions', [FrontendController::class, 'show']);
            Route::get('/history', [FrontendController::class, 'show']);
            Route::get('/kpis', [FrontendController::class, 'show']);
            Route::post('/assessments/{assessment}/withdraw', [AssessmentController::class, 'withdraw'])->whereNumber('assessment');
        }
        if ($role !== 'kepala_unit') {
            Route::get('/analytics', [FrontendController::class, 'show']);
        }
        if ($role === 'kepala_divisi') {
            Route::get('/approvals', [FrontendController::class, 'show']);
            Route::get('/kpis', [FrontendController::class, 'show']);
            Route::get('/heads', [ReportingController::class, 'heads']);
            Route::post('/assessments/{assessment}/approve', [AssessmentController::class, 'approve'])->whereNumber('assessment');
            Route::post('/assessments/{assessment}/adjust', [AssessmentController::class, 'adjust'])->whereNumber('assessment');
            Route::post('/assessments/{assessment}/return', [AssessmentController::class, 'returnAssessment'])->whereNumber('assessment');
            Route::post('/approvals/bulk', [AssessmentController::class, 'bulk']);
        }
        if ($role !== 'super_hc') {
            Route::post('/assessments', [AssessmentController::class, 'store']);
            Route::get('/assessment-form', [AssessmentController::class, 'form']);
            Route::post('/assessments/{assessment}/resubmit', [AssessmentController::class, 'resubmit'])->whereNumber('assessment');
        }
    });
}
