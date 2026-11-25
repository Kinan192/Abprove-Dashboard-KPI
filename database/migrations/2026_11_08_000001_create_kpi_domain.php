<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL 8.0.19+ or MariaDB 10.5+ (DB_CONNECTION=mysql or mariadb); SQLite lacks triggers and CHECKs used here.
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Schema ini membutuhkan MySQL 8 atau MariaDB, bukan '.DB::getDriverName().'.');
        }
        if (Schema::hasTable('users') || Schema::hasTable('assessments')) {
            throw new RuntimeException('Tabel domain sudah ada. Gunakan database baru; jangan menjalankan import SQL dan baseline migration pada database yang sama.');
        }
        $sql = preg_replace('/^--.*$/m', '', file_get_contents(__DIR__.'/sql/2026_11_08_initial.sql'));
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
            DB::unprepared($statement);
        }
    }

    public function down(): void
    {
        foreach (['audit_events', 'assessment_items', 'assessments', 'cycle_categories', 'assessment_cycles',
            'kpi_items', 'kpi_templates', 'employee_placements', 'scope_assignments', 'employees', 'positions',
            'units', 'divisions', 'user_roles', 'roles', 'users'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
