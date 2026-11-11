<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class KpiItem extends DomainModel
{
    protected $fillable = ['template_id', 'sort_order', 'pillar', 'name', 'numerator', 'denominator', 'measurement_formula', 'target_text', 'weight_percent'];

    protected function casts(): array
    {
        return ['weight_percent' => 'decimal:4'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $item) {
            if (KpiTemplate::whereKey($item->template_id)->value('sealed_at') !== null) {
                throw new BusinessRule('TEMPLATE_IMMUTABLE', 'Definisi KPI tersegel tidak dapat diubah.');
            }
        });
    }
}
