<?php

use App\Services\Assessment\AssessmentHistory;
use App\Services\Audit\ActorSnapshot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Assessment history and review corrections.
 * - assessment_events: append-only events per subject-period. The actor's name, NIP, role and area are frozen at
 *   action time; assessment_id has no foreign key because a withdrawn submission is deleted while its history stays.
 * - assessments.return_notes: division head notes per KPI for the current return.
 * - assessments.finalized_assignment_id / finalized_by_name_snapshot: the division assignment and the name of the
 *   head who set Final, frozen at that moment. A successor head of the same division may finalize, so finalized_by
 *   no longer has to equal the routed reviewer. Legacy Final rows keep NULL (name at action time unknown).
 * - assessment_items may change while submitted, for division head corrections before Final.
 * Existing assessment audit events are copied once and flagged by source_audit_event_id; their actor names are the
 * names known at migration time, which the timeline labels as such.
 */
return new class extends Migration
{
    private const LEGACY_ACTIONS = [
        'assessment.submitted' => 'submitted', 'assessment.head.final' => 'head_finalized', 'assessment.resubmit' => 'resubmitted',
        'assessment.withdrawn' => 'withdrawn', 'assessment.return' => 'returned', 'assessment.approve' => 'approved',
    ];

    public function up(): void
    {
        Schema::create('assessment_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('assessment_id')->nullable();
            $table->foreignId('cycle_id')->constrained('assessment_cycles');
            $table->string('assessment_kind', 16);
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->unsignedBigInteger('subject_user_id')->nullable();
            $table->string('subject_name_snapshot', 160);
            $table->foreignId('unit_id')->constrained('units');
            $table->foreignId('division_id')->constrained('divisions');
            $table->string('action', 32);
            $table->string('status_before', 16)->nullable();
            $table->string('status_after', 16)->nullable();
            $table->unsignedInteger('lock_version_after')->nullable();
            $table->decimal('total_before', 12, 6)->nullable();
            $table->decimal('total_after', 12, 6)->nullable();
            $table->foreignId('actor_user_id')->nullable()->constrained('users');
            $table->unsignedBigInteger('actor_assignment_id')->nullable();
            $table->string('actor_role_key', 32)->nullable();
            $table->string('actor_name_snapshot', 160);
            $table->string('actor_nip_snapshot', 64)->nullable();
            $table->string('actor_position_snapshot', 190);
            $table->unsignedBigInteger('actor_unit_id')->nullable();
            $table->string('actor_unit_name_snapshot', 190)->nullable();
            $table->unsignedBigInteger('actor_division_id')->nullable();
            $table->string('actor_division_name_snapshot', 190)->nullable();
            $table->text('note')->nullable();
            $table->json('details')->nullable();
            $table->char('request_id', 36)->nullable();
            $table->unsignedBigInteger('source_audit_event_id')->nullable()->unique();
            $table->dateTime('recorded_at', 6);
            $table->index(['cycle_id', 'employee_id', 'recorded_at'], 'idx_assessment_event_staff');
            $table->index(['cycle_id', 'subject_user_id', 'recorded_at'], 'idx_assessment_event_head');
            $table->index(['assessment_id', 'recorded_at'], 'idx_assessment_event_assessment');
            $table->index(['actor_user_id', 'recorded_at'], 'idx_assessment_event_actor');
        });
        DB::statement("ALTER TABLE assessment_events ADD CONSTRAINT chk_assessment_event_action CHECK (action IN ('submitted','head_finalized','resubmitted','withdrawn','adjusted','returned','approved'))");
        DB::statement("ALTER TABLE assessment_events ADD CONSTRAINT chk_assessment_event_subject CHECK (
            (assessment_kind='member' AND employee_id IS NOT NULL AND subject_user_id IS NULL) OR
            (assessment_kind='unit_head' AND employee_id IS NULL AND subject_user_id IS NOT NULL))");
        DB::unprepared("CREATE TRIGGER protect_assessment_event_update BEFORE UPDATE ON assessment_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='HISTORY_APPEND_ONLY'");
        DB::unprepared("CREATE TRIGGER protect_assessment_event_delete BEFORE DELETE ON assessment_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='HISTORY_APPEND_ONLY'");

        DB::statement('ALTER TABLE assessments ADD COLUMN return_notes JSON NULL AFTER return_reason');
        DB::statement('ALTER TABLE assessments ADD COLUMN finalized_assignment_id BIGINT UNSIGNED NULL AFTER finalized_by');
        DB::statement('ALTER TABLE assessments ADD COLUMN finalized_by_name_snapshot VARCHAR(160) NULL AFTER finalized_assignment_id');
        DB::statement('ALTER TABLE assessments ADD CONSTRAINT fk_assessment_finalizer_assignment FOREIGN KEY (finalized_assignment_id, finalized_by, division_id) REFERENCES scope_assignments(id, user_id, division_id)');
        DB::statement('ALTER TABLE assessments DROP CONSTRAINT chk_final_metadata');
        DB::statement("ALTER TABLE assessments ADD CONSTRAINT chk_final_metadata CHECK (status<>'final' OR (finalized_at IS NOT NULL AND finalized_by IS NOT NULL AND (finalized_by=reviewer_user_id OR finalized_assignment_id IS NOT NULL) AND category_code_snapshot IS NOT NULL AND category_label_snapshot IS NOT NULL AND category_lower_snapshot IS NOT NULL AND total_score_raw>=category_lower_snapshot AND (category_upper_snapshot IS NULL OR total_score_raw<category_upper_snapshot)))");
        DB::unprepared('DROP TRIGGER IF EXISTS protect_assessment_item_update');
        DB::unprepared("CREATE TRIGGER protect_assessment_item_update BEFORE UPDATE ON assessment_items FOR EACH ROW
BEGIN
 IF (SELECT status FROM assessments WHERE id=OLD.assessment_id)='final' OR
    (SELECT status FROM assessments WHERE id=NEW.assessment_id)='final' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FINAL_IMMUTABLE';
 END IF;
 IF NEW.assessment_id<>OLD.assessment_id OR NEW.source_kpi_item_id<>OLD.source_kpi_item_id
   OR NEW.source_template_id<>OLD.source_template_id OR NEW.sort_order<>OLD.sort_order
   OR NEW.pillar_snapshot<>OLD.pillar_snapshot OR NEW.kpi_name_snapshot<>OLD.kpi_name_snapshot
   OR NOT(NEW.numerator_snapshot<=>OLD.numerator_snapshot) OR NOT(NEW.denominator_snapshot<=>OLD.denominator_snapshot)
   OR NOT(NEW.formula_snapshot<=>OLD.formula_snapshot) OR NOT(NEW.target_snapshot<=>OLD.target_snapshot)
   OR NEW.weight_percent_snapshot<>OLD.weight_percent_snapshot THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ASSESSMENT_ITEM_SNAPSHOT_IMMUTABLE';
 END IF;
 IF (SELECT status FROM assessments WHERE id=OLD.assessment_id) NOT IN ('returned','submitted') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SCORES_LOCKED';
 END IF;
END");

        $this->backfill();
    }

    public function down(): void
    {
        throw new RuntimeException('Riwayat penilaian bersifat permanen dan tidak dibatalkan otomatis. Pulihkan dari backup bila perlu.');
    }

    /** One history event per existing assessment audit event; actor and area names as known now. */
    private function backfill(): void
    {
        $positions = ActorSnapshot::POSITIONS;
        DB::table('audit_events')->where('subject_type', 'assessment')->whereIn('action', array_keys(self::LEGACY_ACTIONS))
            ->chunkById(200, function ($events) use ($positions) {
                $users = DB::table('users')->whereIn('id', $events->pluck('actor_user_id')->filter()->unique())->get(['id', 'name', 'login_nip'])->keyBy('id');
                $units = DB::table('units')->whereIn('id', $events->pluck('scope_unit_id')->filter()->unique())->get(['id', 'name', 'division_id'])->keyBy('id');
                $divisions = DB::table('divisions')->get(['id', 'name'])->keyBy('id');
                $rows = [];
                foreach ($events as $event) {
                    $before = $event->before_data === null ? null : json_decode($event->before_data, true, 512, JSON_THROW_ON_ERROR);
                    $after = $event->after_data === null ? null : json_decode($event->after_data, true, 512, JSON_THROW_ON_ERROR);
                    if (! isset($after['assessment_kind']) && ! isset($before['assessment_kind'])) {
                        continue;
                    }
                    $row = AssessmentHistory::row(self::LEGACY_ACTIONS[$event->action], $before, $after, ['note' => $event->reason]);
                    $user = $users[$event->actor_user_id] ?? null;
                    $unit = $units[$event->scope_unit_id] ?? null;
                    $divisionId = $event->scope_division_id ?? $unit?->division_id;
                    $rows[] = [...$row,
                        'details' => $row['details'] === null ? null : json_encode($row['details'], JSON_THROW_ON_ERROR),
                        'actor_user_id' => $event->actor_user_id, 'actor_role_key' => $event->actor_role_key,
                        'actor_name_snapshot' => $user->name ?? 'Sistem', 'actor_nip_snapshot' => $user->login_nip ?? null,
                        'actor_position_snapshot' => $positions[$event->actor_role_key] ?? ($event->actor_role_key ?? 'Sistem'),
                        'actor_unit_id' => $event->scope_unit_id, 'actor_unit_name_snapshot' => $unit?->name,
                        'actor_division_id' => $divisionId, 'actor_division_name_snapshot' => $divisionId ? ($divisions[$divisionId]->name ?? null) : null,
                        'source_audit_event_id' => $event->id, 'recorded_at' => $event->recorded_at,
                    ];
                }
                if ($rows) {
                    DB::table('assessment_events')->insert($rows);
                }
            });
    }
};
