<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Deadline extensions (dispensasi) granted by Super HC, per area of one cycle:
 *  - kepala_unit   + unit_id/division_id : new submission deadline (due_at) for that unit, and the division head's
 *                                          approval window for that unit (approval_due_at)
 *  - kepala_divisi + division_id         : new approval deadline (due_at) for the division
 *  - all                                 : organisation-wide submission (due_at) and approval (approval_due_at)
 * A row is a request (requested_by set) or a direct grant (requested_by NULL). Effective deadlines take the
 * latest of the cycle schedule and every approved row covering the area.
 * Also allows the `auto_finalized` history event: submitted assessments finalised when the period is closed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deadline_extensions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('assessment_cycles');
            $table->string('role_key', 16);
            $table->foreignId('division_id')->nullable()->constrained('divisions');
            $table->foreignId('unit_id')->nullable()->constrained('units');
            $table->string('status', 16);
            $table->foreignId('requested_by')->nullable()->constrained('users');
            $table->string('requester_name_snapshot', 160)->nullable();
            $table->dateTime('requested_due_at', 6)->nullable()->comment('UTC');
            $table->text('reason')->nullable();
            $table->dateTime('due_at', 6)->nullable()->comment('UTC, approved deadline of role_key');
            $table->dateTime('approval_due_at', 6)->nullable()->comment('UTC, division head window for the unit / all');
            $table->foreignId('decided_by')->nullable()->constrained('users');
            $table->string('decider_name_snapshot', 160)->nullable();
            $table->dateTime('decided_at', 6)->nullable();
            $table->text('decision_note')->nullable();
            $table->dateTime('created_at', 6)->useCurrent();
            $table->dateTime('updated_at', 6)->useCurrent()->useCurrentOnUpdate();
            $table->index(['cycle_id', 'status'], 'idx_extension_cycle_status');
            $table->index(['cycle_id', 'role_key', 'division_id', 'unit_id'], 'idx_extension_area');
        });
        DB::statement("ALTER TABLE deadline_extensions ADD CONSTRAINT chk_extension_role CHECK (
            (role_key = 'kepala_unit' AND unit_id IS NOT NULL AND division_id IS NOT NULL) OR
            (role_key = 'kepala_divisi' AND unit_id IS NULL AND division_id IS NOT NULL) OR
            (role_key = 'all' AND unit_id IS NULL AND division_id IS NULL))");
        DB::statement("ALTER TABLE deadline_extensions ADD CONSTRAINT chk_extension_status CHECK (status IN ('pending','approved','rejected','cancelled','expired'))");
        DB::statement("ALTER TABLE deadline_extensions ADD CONSTRAINT chk_extension_decision CHECK (
            (status <> 'approved' OR (due_at IS NOT NULL AND decided_at IS NOT NULL)) AND
            (status <> 'rejected' OR (decided_at IS NOT NULL AND decision_note IS NOT NULL)) AND
            (status <> 'pending' OR (requested_by IS NOT NULL AND requested_due_at IS NOT NULL AND reason IS NOT NULL)))");

        // One "deadline passed" email per cycle, role and area (unit id for Kepala Unit, division id for Kepala Divisi).
        Schema::create('deadline_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('assessment_cycles');
            $table->string('role_key', 16);
            $table->unsignedBigInteger('area_id');
            $table->dateTime('due_at', 6)->comment('UTC, effective deadline the notice was sent for');
            $table->dateTime('sent_at', 6)->useCurrent();
            $table->unique(['cycle_id', 'role_key', 'area_id', 'due_at'], 'uq_deadline_notice');
        });

        DB::statement('ALTER TABLE assessment_events DROP CHECK chk_assessment_event_action');
        DB::statement("ALTER TABLE assessment_events ADD CONSTRAINT chk_assessment_event_action CHECK (action IN
            ('submitted','head_finalized','resubmitted','withdrawn','adjusted','returned','approved','auto_finalized'))");
    }

    public function down(): void
    {
        if (DB::table('assessment_events')->where('action', 'auto_finalized')->exists()) {
            throw new RuntimeException('Riwayat finalisasi otomatis sudah ada dan tidak dihapus otomatis.');
        }
        DB::statement('ALTER TABLE assessment_events DROP CHECK chk_assessment_event_action');
        DB::statement("ALTER TABLE assessment_events ADD CONSTRAINT chk_assessment_event_action CHECK (action IN
            ('submitted','head_finalized','resubmitted','withdrawn','adjusted','returned','approved'))");
        Schema::dropIfExists('deadline_notices');
        Schema::dropIfExists('deadline_extensions');
    }
};
