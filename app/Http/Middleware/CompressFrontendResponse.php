<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\AcceptHeader;
use Symfony\Component\HttpFoundation\Response;

class CompressFrontendResponse
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $html = $response instanceof Response && str_starts_with($response->headers->get('Content-Type', ''), 'text/html');
        if ((! $response instanceof JsonResponse && ! $html) || ! $response->isSuccessful()
            || $request->isMethod('HEAD') || $response->headers->has('Content-Encoding')
            || (int) ini_get('zlib.output_compression') > 0
            || ! preg_match('#^(unit|division|hc)/#', $request->path())) {
            return $response;
        }
        $response->setVary('Accept-Encoding', false);
        $accepted = AcceptHeader::fromString($request->header('Accept-Encoding', ''))->get('gzip');
        $content = $response->getContent();
        if (! $accepted || $accepted->getQuality() <= 0 || strlen($content) < 2048 || ! function_exists('gzencode')) {
            return $response;
        }
        $compressed = gzencode($content, 4);
        if ($compressed !== false && strlen($compressed) < strlen($content)) {
            $response->setContent($compressed);
            $response->headers->set('Content-Encoding', 'gzip');
            $response->headers->set('Content-Length', (string) strlen($compressed));
        }

        return $response;
    }
}
