<?php

return [
    'url' => env('BETTER_AUTH_INTERNAL_URL', 'http://127.0.0.1:3031'),
    'origin' => env('APP_URL', 'http://127.0.0.1:8000'),
    'cookie' => str_starts_with(env('APP_URL', ''), 'https://') ? '__Secure-kpi_session' : 'kpi_session',
    'remember_cookie' => str_starts_with(env('APP_URL', ''), 'https://') ? '__Secure-kpi_dont_remember' : 'kpi_dont_remember',
];
