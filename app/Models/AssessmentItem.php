<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class AssessmentItem extends DomainModel
{
    protected $fillable = [
        'assessment_id', 'source_kpi_item_id', 'source_template_id', 'sort_order', 'pillar_snapshot',
        'kpi_name_snapshot', 'numerator_snapshot', 'denominator_snapshot', 'formula_snapshot',
        'target_snapshot', 'weight_percent_snapshot', 'score', 'computed_score', 'definition_snapshot', 'measurement_inputs',
    ];

    protected function casts(): array
    {
        return ['definition_snapshot' => 'array', 'measurement_inputs' => 'array', 'weight_percent_snapshot' => 'decimal:4', 'weighted_result_raw' => 'decimal:6'];
    }

    /** The unit head's proposed score: the formula result, else the manual score. */
    public function getScoreAttribute($value)
    {
        return ($this->attributes['computed_score'] ?? null) !== null ? (float) $this->attributes['computed_score'] : (int) $value;
    }

    /** Score in force: the division head's reviewed score, else the unit head's proposal. */
    public function effectiveScore(): float
    {
        return ($this->attributes['reviewed_score'] ?? null) !== null ? (float) $this->attributes['reviewed_score'] : $this->score;
    }

    protected static function booted(): void
    {
        $guard = function (self $row) {
            if (Assessment::whereKey($row->assessment_id)->value('status') === 'final') {
                throw new BusinessRule('FINAL_IMMUTABLE', 'Item penilaian Final tidak dapat diubah.');
            }
        };
        static::saving($guard);
        static::deleting($guard);
    }
}
