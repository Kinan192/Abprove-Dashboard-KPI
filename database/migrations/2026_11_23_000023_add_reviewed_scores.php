<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Division head reviewed scores.
 * - assessment_items.reviewed_score: the score set by the division head on a submitted staff assessment. The unit
 *   head's proposal (score, computed_score) and formula measurements (measurement_inputs) stay untouched; NULL
 *   means the proposal applies.
 * - weighted_result_raw and therefore total_score_raw, category, reports and exports use
 *   COALESCE(reviewed_score, computed_score, score).
 * - A reviewed score may only be set while the assessment is submitted; resubmission clears it, Final freezes it.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE assessment_items ADD COLUMN reviewed_score DECIMAL(12,6) NULL AFTER computed_score');
        DB::statement('ALTER TABLE assessment_items DROP CONSTRAINT chk_assessment_items_result_presence');
        DB::statement('ALTER TABLE assessment_items MODIFY weighted_result_raw DECIMAL(12,6) GENERATED ALWAYS AS (COALESCE(reviewed_score, computed_score, score) * weight_percent_snapshot / 100) STORED');
        DB::statement('ALTER TABLE assessment_items ADD CONSTRAINT chk_assessment_items_result_presence CHECK (weighted_result_raw IS NOT NULL)');
        DB::statement('ALTER TABLE assessment_items ADD CONSTRAINT chk_assessment_items_reviewed CHECK (reviewed_score IS NULL OR reviewed_score BETWEEN 0 AND 100)');
        DB::unprepared('DROP TRIGGER IF EXISTS protect_assessment_item_update');
        DB::unprepared("CREATE TRIGGER protect_assessment_item_update BEFORE UPDATE ON assessment_items FOR EACH ROW
BEGIN
 DECLARE current_status VARCHAR(16);
 SELECT status INTO current_status FROM assessments WHERE id=OLD.assessment_id;
 IF current_status='final' OR (SELECT status FROM assessments WHERE id=NEW.assessment_id)='final' THEN
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
 IF current_status NOT IN ('returned','submitted') THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SCORES_LOCKED';
 END IF;
 IF NEW.reviewed_score IS NOT NULL AND NOT(NEW.reviewed_score<=>OLD.reviewed_score) AND current_status<>'submitted' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REVIEW_REQUIRES_SUBMITTED';
 END IF;
END");
    }

    public function down(): void
    {
        throw new RuntimeException('Nilai koreksi Kepala Divisi bersifat permanen dan tidak dibatalkan otomatis. Pulihkan dari backup bila perlu.');
    }
};
