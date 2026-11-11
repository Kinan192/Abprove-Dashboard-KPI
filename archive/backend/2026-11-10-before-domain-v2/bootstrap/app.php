<?php

use App\Exceptions\BusinessRule;
use App\Http\Middleware\ActiveContext;
use App\Http\Middleware\RenderFrontend;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['context' => ActiveContext::class, 'frontend' => RenderFrontend::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $r) => $r->expectsJson());
        $exceptions->render(function (BusinessRule $e, Request $r) {
            if (! $r->expectsJson()) {
                return response()->view('errors.business', ['message' => $e->getMessage(), 'status' => $e->httpStatus], $e->httpStatus);
            }

            return response()->json(['message' => $e->getMessage(), 'code' => $e->errorCode], $e->httpStatus);
        });
    })->create();
