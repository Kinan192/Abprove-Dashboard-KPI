<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The workspace reads KPI publications per person for a bounded month range
 * (`person_key IN (...) AND assessment_month BETWEEN ...`). The unique key
 * (assessment_month, person_key) starts with the month, so it cannot seek per person.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_workspace_publications', function (Blueprint $table) {
            $table->index(['person_key', 'assessment_month'], 'workspace_publication_person_month');
        });
    }

    public function down(): void
    {
        Schema::table('kpi_workspace_publications', function (Blueprint $table) {
            $table->dropIndex('workspace_publication_person_month');
        });
    }
};
