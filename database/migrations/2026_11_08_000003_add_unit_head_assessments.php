<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->string('assessment_kind', 16)->default('member')->after('kpi_template_id');
            $table->foreignId('head_assignment_id')->nullable()->constrained('scope_assignments');
        });
        DB::statement("ALTER TABLE assessments ADD CONSTRAINT chk_assessment_kind CHECK ((assessment_kind = 'member' AND head_assignment_id IS NULL) OR (assessment_kind = 'unit_head' AND head_assignment_id IS NOT NULL))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE assessments DROP CONSTRAINT chk_assessment_kind');
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('head_assignment_id');
            $table->dropColumn('assessment_kind');
        });
    }
};
