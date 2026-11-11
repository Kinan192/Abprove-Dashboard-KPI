<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class AssessmentItem extends DomainModel
{
    protected $fillable = [
        'assessment_id', 'source_kpi_item_id', 'source_template_id', 'sort_order', 'pillar_snapshot',
        'kpi_name_snapshot', 'numerator_snapshot', 'denominator_snapshot', 'formula_snapshot',
        'target_snapshot', 'weight_percent_snapshot', 'score',
    ];

    protected function casts(): array
    {
        return ['score' => 'integer', 'weight_percent_snapshot' => 'decimal:4', 'weighted_result_raw' => 'decimal:6'];
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
