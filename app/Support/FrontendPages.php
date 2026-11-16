<?php

namespace App\Support;

/** Maps a request path to the frontend page key used by FrontendController. */
class FrontendPages
{
    public static function page(string $path): ?string
    {
        $parts = explode('/', trim($path, '/'));
        $last = $parts[1] ?? 'dashboard';
        if ($last === 'assessments') {
            return isset($parts[2]) ? 'detail' : 'submissions';
        }
        if ($last === 'organization') {
            return $parts[2] ?? 'organization';
        }

        return match ($last) {
            'cycles' => 'settings', 'kpi-templates' => isset($parts[2]) ? 'template-editor' : 'templates',
            default => $last,
        };
    }
}
