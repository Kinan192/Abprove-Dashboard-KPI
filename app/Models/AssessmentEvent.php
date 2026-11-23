<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

/** Append-only assessment history; actor and subject identity are frozen at action time. */
class AssessmentEvent extends DomainModel
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['details' => 'array', 'recorded_at' => 'datetime', 'total_before' => 'decimal:6', 'total_after' => 'decimal:6'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new BusinessRule('HISTORY_IMMUTABLE', 'Riwayat penilaian tidak dapat diubah.'));
        static::deleting(fn () => throw new BusinessRule('HISTORY_IMMUTABLE', 'Riwayat penilaian tidak dapat dihapus.'));
    }
}
