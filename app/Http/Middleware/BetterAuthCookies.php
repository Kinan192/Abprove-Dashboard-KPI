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
        $authenticatedHtml = $request->attributes->has('access_context') && $request->isMethodSafe()
            && $response->isSuccessful() && str_starts_with($response->headers->get('Content-Type', ''), 'text/html');
        $response->headers->set('Cache-Control', $authenticatedHtml
            ? 'private, no-cache, max-age=0, must-revalidate'
            : 'no-store, private');

        return $response;
    }
}
