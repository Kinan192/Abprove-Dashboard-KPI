<?php

use App\Http\Controllers\Admin\AccountController;
use App\Http\Controllers\Admin\LogController;
use App\Http\Controllers\Admin\ReminderController;
use App\Http\Controllers\FrontendController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

// Prefix /admin, middleware context:admin + schema.v2 (see routes/web.php).
Route::get('/dashboard', fn () => redirect('/admin/accounts'));
Route::get('/accounts', [FrontendController::class, 'show']);
Route::get('/logs', [FrontendController::class, 'show']);
Route::get('/reminders', [FrontendController::class, 'show']);
Route::get('/help', [FrontendController::class, 'show']);
Route::get('/profile', [ProfileController::class, 'show'])->middleware('frontend');
Route::get('/profile/photo', [ProfileController::class, 'photo']);
Route::post('/profile', [ProfileController::class, 'update']);

Route::prefix('data')->group(function () {
    Route::get('/accounts', [AccountController::class, 'index']);
    Route::get('/logs/audit/{event}', [LogController::class, 'audit'])->whereNumber('event');
    Route::get('/logs/{type}', [LogController::class, 'index'])->whereIn('type', ['audit', 'login', 'email']);
    Route::get('/reminders/cycles', [ReminderController::class, 'cycles']);
    Route::get('/reminders/preview', [ReminderController::class, 'preview']);
    Route::get('/reminders/settings', [ReminderController::class, 'settings']);
});

Route::post('/accounts', [AccountController::class, 'store']);
Route::patch('/accounts/{user}', [AccountController::class, 'update'])->whereNumber('user');
Route::delete('/accounts/{user}', [AccountController::class, 'destroy'])->whereNumber('user');
Route::post('/reminders', [ReminderController::class, 'store']);
Route::put('/reminders/settings', [ReminderController::class, 'updateSettings']);
