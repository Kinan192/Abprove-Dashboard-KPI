<?php

namespace App\Http\Middleware;

use App\Services\IdentityAccess\BetterAuth;
use Closure;
use Illuminate\Http\Request;

class BetterAuthCookies
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        app(BetterAuth::class)->appendCookies($response);
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }
}
