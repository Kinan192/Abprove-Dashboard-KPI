<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('assessment_items')->whereNotNull('definition_snapshot')->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(definition_snapshot, '$.method')) = 'formula'")->exists()) {
            throw new RuntimeException('Integrasi formula harus dimigrasikan sebelum penilaian otomatis pertama.');
        }
        Schema::table('assessment_items', fn (Blueprint $table) => $table->decimal('computed_score', 12, 6)->nullable());
        DB::statement('ALTER TABLE assessment_items DROP CHECK chk_assessment_items_score');
        DB::statement('ALTER TABLE assessment_items DROP CHECK chk_assessment_items_result_presence');
        DB::statement('ALTER TABLE assessment_items MODIFY score TINYINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE assessment_items MODIFY weighted_result_raw DECIMAL(12,6) GENERATED ALWAYS AS (COALESCE(computed_score, score) * weight_percent_snapshot / 100) STORED');
        DB::statement('ALTER TABLE assessment_items ADD CONSTRAINT chk_assessment_items_score CHECK (score BETWEEN 0 AND 100 AND (computed_score IS NOT NULL OR score >= 10) AND (computed_score IS NULL OR computed_score BETWEEN 0 AND 100))');
        DB::statement('ALTER TABLE assessment_items ADD CONSTRAINT chk_assessment_items_result_presence CHECK (weighted_result_raw IS NOT NULL)');
    }

    public function down(): void
    {
        throw new RuntimeException('Snapshot nilai otomatis tidak dibatalkan otomatis.');
    }
};
