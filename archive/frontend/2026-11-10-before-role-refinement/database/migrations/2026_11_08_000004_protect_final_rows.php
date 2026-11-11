<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['UPDATE', 'DELETE'] as $event) {
            $suffix = strtolower($event);
            DB::unprepared("CREATE TRIGGER protect_final_assessment_{$suffix} BEFORE {$event} ON assessments FOR EACH ROW
                BEGIN IF OLD.status = 'final' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINAL_IMMUTABLE'; END IF; END");
            DB::unprepared("CREATE TRIGGER protect_final_item_{$suffix} BEFORE {$event} ON assessment_items FOR EACH ROW
                BEGIN IF (SELECT status FROM assessments WHERE id = OLD.assessment_id) = 'final'
                THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINAL_IMMUTABLE'; END IF; END");
        }
        DB::unprepared("CREATE TRIGGER protect_final_item_insert BEFORE INSERT ON assessment_items FOR EACH ROW
            BEGIN IF (SELECT status FROM assessments WHERE id = NEW.assessment_id) = 'final'
            THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINAL_IMMUTABLE'; END IF; END");
        DB::unprepared("CREATE TRIGGER protect_final_item_move BEFORE UPDATE ON assessment_items FOR EACH ROW
            BEGIN IF NEW.assessment_id <> OLD.assessment_id AND (SELECT status FROM assessments WHERE id = NEW.assessment_id) = 'final'
            THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FINAL_IMMUTABLE'; END IF; END");
    }

    public function down(): void
    {
        foreach (['protect_final_assessment_update', 'protect_final_assessment_delete', 'protect_final_item_update', 'protect_final_item_delete', 'protect_final_item_insert', 'protect_final_item_move'] as $trigger) {
            DB::unprepared('DROP TRIGGER IF EXISTS '.$trigger);
        }
    }
};
