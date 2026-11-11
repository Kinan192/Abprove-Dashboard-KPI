<?php

use App\Support\SqlStatements;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // This bridge is only for fresh installs. Existing data needs a reviewed conversion.
        $tables = ['operation_requests', 'audit_events', 'assessment_items', 'assessments',
            'cycle_categories', 'assessment_cycles', 'kpi_items', 'kpi_templates',
            'employee_placements', 'scope_assignments', 'employees', 'positions',
            'units', 'divisions', 'user_roles', 'users'];
        foreach ($tables as $table) {
            if (DB::table($table)->exists()) {
                throw new RuntimeException('DOMAIN_V2_DATA_CONVERSION_REQUIRED: database berisi data lama. Tidak ada tabel/data yang diubah. Gunakan database baru atau konversi tervalidasi sesuai docs/database/MIGRATION-V2.md.');
            }
        }
        foreach ([...$tables, 'roles'] as $table) {
            DB::statement('DROP TABLE '.$table);
        }
        foreach (SqlStatements::fromFile(__DIR__.'/sql/2026_11_10_domain_v2.sql') as $sql) {
            DB::unprepared($sql);
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Schema v2 dipulihkan dari backup/database salinan, bukan rollback destruktif otomatis.');
    }
};
