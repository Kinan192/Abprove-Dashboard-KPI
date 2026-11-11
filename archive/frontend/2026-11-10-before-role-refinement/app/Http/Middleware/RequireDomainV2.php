<?php

namespace App\Http\Middleware;

use App\Exceptions\BusinessRule;
use App\Support\DomainSchema;
use Closure;
use Illuminate\Http\Request;

class RequireDomainV2
{
    public function handle(Request $request, Closure $next)
    {
        if (! DomainSchema::ready()) {
            throw new BusinessRule('SCHEMA_UPGRADE_REQUIRED', 'Backend bisnis membutuhkan schema v2. Data lama tetap utuh; ikuti panduan migrasi sebelum integrasi.', 503);
        }

        return $next($request);
    }
}
