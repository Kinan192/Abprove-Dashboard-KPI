<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(str_replace('DROP CHECK ', DB::connection()->isMaria() ? 'DROP CONSTRAINT ' : 'DROP CHECK ', 'ALTER TABLE kpi_items DROP CHECK chk_kpi_items_pillar, ADD CONSTRAINT chk_kpi_items_pillar CHECK (CHAR_LENGTH(TRIM(pillar)) BETWEEN 1 AND 64)'));
    }

    public function down(): void
    {
        $original = ['Technical Care', 'Access', 'Coordination and Continuity', 'Interpersonal Care', 'Efficient'];
        if (DB::table('kpi_items')->whereNotIn('pillar', $original)->exists()) {
            throw new RuntimeException('Pilar khusus sudah digunakan. Rollback tidak mengubah atau menghapus data tersebut.');
        }
        DB::statement(str_replace('DROP CHECK ', DB::connection()->isMaria() ? 'DROP CONSTRAINT ' : 'DROP CHECK ', "ALTER TABLE kpi_items DROP CHECK chk_kpi_items_pillar, ADD CONSTRAINT chk_kpi_items_pillar CHECK (pillar IN ('Technical Care', 'Access', 'Coordination and Continuity', 'Interpersonal Care', 'Efficient'))"));
    }
};
