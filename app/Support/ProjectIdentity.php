<?php

namespace App\Support;

class ProjectIdentity
{
    public static function fingerprint(): string
    {
        $root = str_replace('\\', '/', realpath(base_path()));
        $identity = [
            'root' => PHP_OS_FAMILY === 'Windows' ? strtolower($root) : $root,
            'configuration' => hash_file('sha256', base_path('.env')),
            'host' => (string) config('database.connections.mysql.host', '127.0.0.1'),
            'port' => (string) config('database.connections.mysql.port', '3306'),
            'database' => (string) config('database.connections.mysql.database', 'laravel'),
            'origin' => (string) config('better_auth.origin', 'http://127.0.0.1:8000'),
        ];

        return hash('sha256', json_encode($identity, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }
}
