<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_templates', function (Blueprint $table) {
            $table->char('workspace_hash', 64)->nullable()->index();
        });
        Schema::table('kpi_items', fn (Blueprint $table) => $table->json('workspace_definition')->nullable());
        Schema::table('assessment_items', function (Blueprint $table) {
            $table->json('definition_snapshot')->nullable();
            $table->json('measurement_inputs')->nullable();
        });
        DB::statement('ALTER TABLE assessment_items DROP CONSTRAINT chk_assessment_items_score');
        DB::statement('ALTER TABLE assessment_items MODIFY score DECIMAL(12,6) NULL');
        DB::statement('ALTER TABLE assessment_items ADD CONSTRAINT chk_assessment_items_score CHECK (score BETWEEN 0 AND 100 AND (definition_snapshot IS NOT NULL OR score >= 10))');
        DB::statement('ALTER TABLE assessments DROP CONSTRAINT chk_assessment_total');
        DB::statement('ALTER TABLE assessments ADD CONSTRAINT chk_assessment_total CHECK (total_score_raw BETWEEN 0 AND 100)');
        Schema::table('assessment_cycles', fn (Blueprint $table) => $table->boolean('workspace_managed')->default(false));
        Schema::create('kpi_workspace_publications', function (Blueprint $table) {
            $table->id();
            $table->date('assessment_month');
            $table->string('person_key', 64);
            $table->foreignId('template_id')->nullable()->constrained('kpi_templates');
            $table->timestamps();
            $table->unique(['assessment_month', 'person_key'], 'workspace_person_month');
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Migrasi integrasi mempertahankan snapshot dan tidak dibatalkan otomatis.');
    }
};
