<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class KpiTemplate extends DomainModel
{
    protected $fillable = ['position_id', 'name', 'template_year', 'version', 'effective_from', 'effective_until', 'created_by'];

    public function items()
    {
        return $this->hasMany(KpiItem::class, 'template_id')->orderBy('sort_order');
    }

    protected static function booted(): void
    {
        static::updating(function (self $row) {
            if ($row->getRawOriginal('status') !== 'draft') {
                throw new BusinessRule('TEMPLATE_IMMUTABLE', 'Buat versi baru untuk mengubah template published.');
            }
        });
        static::deleting(fn () => throw new BusinessRule('HISTORY_IMMUTABLE', 'Template tidak dapat dihapus.'));
    }
}
