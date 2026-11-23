<?php

namespace App\Models;

use App\Exceptions\BusinessRule;
use Illuminate\Database\Eloquent\Builder;

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

    /** Published (sealed) versions only; drafts are never shown or used. */
    public function scopeSealed(Builder $query): Builder
    {
        return $query->whereNotNull('sealed_at');
    }

    /** Versions effective in `$month` (Y-m-d): started on or before it and not ended before it. */
    public function scopeEffectiveOn(Builder $query, string $month): Builder
    {
        return $query->where('effective_from', '<=', $month)
            ->where(fn ($q) => $q->whereNull('effective_until')->orWhere('effective_until', '>=', $month));
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
