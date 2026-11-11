<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DomainSchema
{
    public static function ready(): bool
    {
        return Schema::hasTable('domain_schema_versions') &&
            DB::table('domain_schema_versions')->where('version', '2.0.0')->exists();
    }
}
