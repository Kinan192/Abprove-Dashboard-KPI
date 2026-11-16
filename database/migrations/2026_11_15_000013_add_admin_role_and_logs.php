<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Admin owns login accounts, reads every log and sends reminder emails.
 * Admin scope has no division/unit, the same shape as Super HC.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->insertOrIgnore(['role_key' => 'admin', 'label' => 'Admin']);
        DB::statement('ALTER TABLE scope_assignments DROP CHECK chk_scope_shape');
        DB::statement("ALTER TABLE scope_assignments ADD CONSTRAINT chk_scope_shape CHECK (
            (role_key IN ('admin','super_hc') AND division_id IS NULL AND unit_id IS NULL) OR
            (role_key='kepala_divisi' AND division_id IS NOT NULL AND unit_id IS NULL) OR
            (role_key='kepala_unit' AND division_id IS NULL AND unit_id IS NOT NULL))");

        Schema::create('login_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('identifier', 190);
            $table->string('event', 16);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->dateTime('occurred_at', 6)->useCurrent();
            $table->index('occurred_at');
            $table->index(['user_id', 'occurred_at']);
            $table->index(['event', 'occurred_at']);
        });
        DB::statement("ALTER TABLE login_events ADD CONSTRAINT chk_login_event CHECK (event IN ('login','failed','logout'))");

        Schema::create('reminder_emails', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_id');
            $table->foreignId('cycle_id')->constrained('assessment_cycles');
            $table->foreignId('recipient_user_id')->constrained('users');
            $table->string('recipient_email', 190);
            $table->string('recipient_role', 32);
            $table->string('subject', 190);
            $table->text('message');
            $table->json('details')->nullable();
            $table->string('status', 16)->default('queued');
            $table->text('error')->nullable();
            $table->foreignId('sent_by')->constrained('users');
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('sent_at', 6)->nullable();
            $table->index('created_at');
            $table->index(['batch_id']);
            $table->index(['status', 'created_at']);
        });
        DB::statement("ALTER TABLE reminder_emails ADD CONSTRAINT chk_reminder_status CHECK (status IN ('queued','sent','failed'))");
    }

    public function down(): void
    {
        if (DB::table('scope_assignments')->where('role_key', 'admin')->exists() || DB::table('users')->where('role_key', 'admin')->exists()) {
            throw new RuntimeException('Role admin masih dipakai. Pindahkan akun admin sebelum rollback.');
        }
        Schema::dropIfExists('reminder_emails');
        Schema::dropIfExists('login_events');
        DB::statement('ALTER TABLE scope_assignments DROP CHECK chk_scope_shape');
        DB::statement("ALTER TABLE scope_assignments ADD CONSTRAINT chk_scope_shape CHECK (
            (role_key='super_hc' AND division_id IS NULL AND unit_id IS NULL) OR
            (role_key='kepala_divisi' AND division_id IS NOT NULL AND unit_id IS NULL) OR
            (role_key='kepala_unit' AND division_id IS NULL AND unit_id IS NOT NULL))");
        DB::table('user_roles')->where('role_key', 'admin')->delete();
        DB::table('roles')->where('role_key', 'admin')->delete();
    }
};
