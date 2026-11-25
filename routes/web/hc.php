<?php

use App\Http\Controllers\ExtensionController;
use App\Http\Controllers\FrontendController;
use App\Http\Controllers\SuperHc\ActivityController;
use App\Http\Controllers\SuperHc\CycleController;
use App\Http\Controllers\SuperHc\EmployeeImportController;
use App\Http\Controllers\SuperHc\HeadAssignmentController;
use App\Http\Controllers\SuperHc\KpiTemplateController;
use App\Http\Controllers\SuperHc\KpiWorkspaceController;
use App\Http\Controllers\SuperHc\OrganizationController;
use App\Http\Controllers\SuperHc\PlacementController;
use App\Http\Controllers\SuperHc\TemplateImportController;
use Illuminate\Support\Facades\Route;

// Prefix /hc, middleware context:super_hc + frontend + schema.v2 (see routes/web.php).
$resources = ['divisions', 'units', 'positions', 'employees'];

Route::get('/organization', [FrontendController::class, 'show']);
Route::get('/organization/{resource}', [OrganizationController::class, 'index'])->whereIn('resource', $resources);
Route::get('/organization/{resource}/{id}', [OrganizationController::class, 'show'])->whereIn('resource', $resources)->whereNumber('id');
Route::post('/organization/{resource}', [OrganizationController::class, 'store'])->whereIn('resource', $resources);
Route::patch('/organization/{resource}/{id}', [OrganizationController::class, 'update'])->whereIn('resource', $resources)->whereNumber('id');
Route::delete('/organization/{resource}/{id}', [OrganizationController::class, 'destroy'])->whereIn('resource', $resources)->whereNumber('id');
Route::post('/employees/transfer-preview', [PlacementController::class, 'preview']);
Route::post('/employees/transfers', [PlacementController::class, 'transfer']);
Route::post('/employees/import-preview', [EmployeeImportController::class, 'preview']);
Route::post('/employees/import', [EmployeeImportController::class, 'store']);
Route::get('/heads/preview', [HeadAssignmentController::class, 'preview']);
Route::post('/heads/reassign', [HeadAssignmentController::class, 'reassign']);
Route::get('/audit', [ActivityController::class, 'index']);

Route::get('/settings', [FrontendController::class, 'show']);
Route::get('/import', [FrontendController::class, 'show']);
Route::post('/kpi-templates/import-preview', [TemplateImportController::class, 'preview']);
Route::get('/import/sample', [TemplateImportController::class, 'sample'])->withoutMiddleware('frontend');
Route::get('/kpi-workspace', [KpiWorkspaceController::class, 'show']);
Route::put('/kpi-workspace', [KpiWorkspaceController::class, 'update']);
Route::post('/kpi-workspace/import-preview', [KpiWorkspaceController::class, 'importPreview']);
Route::post('/kpi-workspace/import', [KpiWorkspaceController::class, 'import']);
Route::get('/kpi-templates', [KpiTemplateController::class, 'index']);
Route::get('/kpi-templates/new', [FrontendController::class, 'show']);
Route::get('/kpi-templates/{template}', [KpiTemplateController::class, 'show'])->whereNumber('template');
Route::post('/kpi-templates', [KpiTemplateController::class, 'store']);
Route::delete('/kpi-templates/{template}', [KpiTemplateController::class, 'destroy'])->whereNumber('template');
Route::get('/cycles', [CycleController::class, 'index']);
Route::get('/cycles/{cycle}', [CycleController::class, 'show'])->whereNumber('cycle');
Route::post('/cycles', [CycleController::class, 'store']);
Route::patch('/cycles/{cycle}', [CycleController::class, 'update'])->whereNumber('cycle');
Route::delete('/cycles/{cycle}', [CycleController::class, 'destroy'])->whereNumber('cycle');
Route::post('/cycles/{cycle}/close', [CycleController::class, 'close'])->whereNumber('cycle');

// Deadline extensions (perpanjangan tenggat): page, direct grant and decisions on requests.
Route::get('/extensions', [FrontendController::class, 'show']);
Route::post('/extensions/grant', [ExtensionController::class, 'grant']);
Route::post('/extensions/{extension}/approve', [ExtensionController::class, 'approve'])->whereNumber('extension');
Route::post('/extensions/{extension}/reject', [ExtensionController::class, 'reject'])->whereNumber('extension');
