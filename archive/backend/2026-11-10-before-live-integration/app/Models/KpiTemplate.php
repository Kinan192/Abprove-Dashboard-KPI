<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class KpiTemplate extends DomainModel
{
    protected $fillable = ['scope_id', 'scope_level', 'scope_key', 'name', 'version', 'effective_from', 'effective_until', 'expected_item_count', 'created_by'];

    protected function casts(): array
    {
        return ['sealed_at' => 'datetime'];
    }

    public function items()
    {
        return $this->hasMany(KpiItem::class, 'template_id')->orderBy('sort_order');
    }

    protected static function booted(): void
    {
        static::updating(function (self $row) {
            if ($row->getRawOriginal('sealed_at') !== null && array_diff(array_keys($row->getDirty()), ['effective_until', 'updated_at'])) {
                throw new BusinessRule('TEMPLATE_IMMUTABLE', 'Buat versi KPI baru untuk perubahan.');
            }
        });
    }
}
