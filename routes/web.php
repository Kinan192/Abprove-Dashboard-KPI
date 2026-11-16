<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController as Sessions;
use App\Http\Controllers\FrontendController;
use App\Http\Controllers\SuperHc\CycleController;
use App\Support\ProjectIdentity;
use Illuminate\Support\Facades\Route;

/*
| Route files per area:
|   routes/web/roles.php  shared pages and data for Kepala Unit, Kepala Divisi and Super HC
|   routes/web/hc.php     Super HC: structure, staff, KPI and periods
|   routes/web/admin.php  Admin: accounts, logs and reminder emails
*/

Route::get('/', [FrontendController::class, 'landing']);
Route::get('/_kpi/health', fn () => response()->json([
    'service' => 'kpi-kinerja',
    'project' => ProjectIdentity::fingerprint(),
    'pid' => getmypid(),
    'ready' => true,
]));
Route::get('/forgot-password', [Sessions::class, 'forgot']);
Route::get('/login', [Sessions::class, 'create'])->name('login');
Route::post('/login', [Sessions::class, 'store'])->middleware('throttle:login');
Route::post('/logout', [Sessions::class, 'destroy']);

Route::middleware('context')->group(function () {
    Route::get('/me', [Sessions::class, 'show']);
    Route::get('/cycles', [CycleController::class, 'index'])->middleware('schema.v2');
    Route::get('/cycles/{cycle}', [CycleController::class, 'show'])->whereNumber('cycle')->middleware('schema.v2');
});

require __DIR__.'/web/roles.php';

Route::prefix('hc')->middleware(['context:super_hc', 'frontend', 'schema.v2'])->group(__DIR__.'/web/hc.php');

Route::prefix('admin')->middleware(['context:admin', 'schema.v2'])->group(__DIR__.'/web/admin.php');
