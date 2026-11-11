<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class Assessment extends DomainModel
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['total_score_raw' => 'decimal:6', 'lock_version' => 'integer'];
    }

    public function items()
    {
        return $this->hasMany(AssessmentItem::class)->orderBy('sort_order');
    }

    public function cycle()
    {
        return $this->belongsTo(AssessmentCycle::class, 'cycle_id');
    }

    protected static function booted(): void
    {
        $guard = function (self $row) {
            if ($row->getRawOriginal('status') === 'final') {
                throw new BusinessRule('FINAL_IMMUTABLE', 'Penilaian Final hanya baca.');
            }
        };
        static::updating($guard);
        static::deleting($guard);
    }
}
