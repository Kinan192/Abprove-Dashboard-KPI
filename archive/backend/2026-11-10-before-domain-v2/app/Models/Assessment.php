<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class Assessment extends DomainModel
{
    protected $fillable = [
        'employee_id', 'cycle_id', 'placement_id', 'division_id', 'unit_id', 'position_id', 'kpi_template_id',
        'employee_name_snapshot', 'nip_snapshot', 'division_name_snapshot', 'unit_name_snapshot',
        'position_name_snapshot', 'template_name_snapshot', 'template_version_snapshot',
        'assessment_kind', 'head_assignment_id',
    ];

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
        static::updating(function (self $row) {
            if ($row->getRawOriginal('status') === 'final') {
                throw new BusinessRule('FINAL_IMMUTABLE', 'Penilaian Final tidak dapat diubah.');
            }
        });
        static::deleting(fn () => throw new BusinessRule('HISTORY_IMMUTABLE', 'Penilaian tidak dapat dihapus.'));
    }
}
