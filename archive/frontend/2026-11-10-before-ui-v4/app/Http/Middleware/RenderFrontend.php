<?php

namespace App\Http\Middleware;

use App\Http\Controllers\FrontendController;
use Closure;
use Illuminate\Http\Request;

class RenderFrontend
{
    public function handle(Request $r, Closure $next)
    {
        if ($r->isMethod('GET') && ! $r->expectsJson() && ! $r->has('format') && ! str_ends_with($r->path(), '/timeline')) {
            return app(FrontendController::class)->show($r);
        }

        return $next($r);
    }
}
