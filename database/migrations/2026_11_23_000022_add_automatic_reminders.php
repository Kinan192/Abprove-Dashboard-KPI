<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Automatic KPI reminders: one Admin settings row and a unique delivery key per scheduled email.
 * Automatic emails have no human sender (sent_by NULL); manual emails keep delivery_key NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminder_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->boolean('enabled')->default(false);
            $table->json('offsets');
            $table->char('send_time', 5)->default('08:00');
            $table->json('targets');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->dateTime('updated_at', 6)->nullable();
        });
        DB::statement('ALTER TABLE reminder_settings ADD CONSTRAINT chk_reminder_settings_single CHECK (id = 1)');
        DB::table('reminder_settings')->insert([
            'id' => 1, 'enabled' => false, 'offsets' => json_encode([14, 7, 3]), 'send_time' => '08:00',
            'targets' => json_encode(['kepala_unit', 'kepala_divisi']),
        ]);

        DB::statement('ALTER TABLE reminder_emails MODIFY sent_by BIGINT UNSIGNED NULL');
        Schema::table('reminder_emails', function (Blueprint $table) {
            $table->string('delivery_key', 190)->nullable()->after('batch_id');
            $table->unique('delivery_key', 'uq_reminder_delivery_key');
        });
        DB::statement('ALTER TABLE reminder_emails ADD CONSTRAINT chk_reminder_sender CHECK (sent_by IS NOT NULL OR delivery_key IS NOT NULL)');
    }

    public function down(): void
    {
        if (DB::table('reminder_emails')->whereNotNull('delivery_key')->exists()) {
            throw new RuntimeException('Log email pengingat otomatis sudah ada dan tidak dihapus otomatis.');
        }
        DB::statement('ALTER TABLE reminder_emails DROP CHECK chk_reminder_sender');
        Schema::table('reminder_emails', function (Blueprint $table) {
            $table->dropUnique('uq_reminder_delivery_key');
            $table->dropColumn('delivery_key');
        });
        DB::statement('ALTER TABLE reminder_emails MODIFY sent_by BIGINT UNSIGNED NOT NULL');
        Schema::dropIfExists('reminder_settings');
    }
};
