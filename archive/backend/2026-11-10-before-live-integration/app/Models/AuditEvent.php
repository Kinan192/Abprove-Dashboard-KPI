<?php

namespace App\Models;

use App\Exceptions\BusinessRule;

class AuditEvent extends DomainModel
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['before_data' => 'array', 'after_data' => 'array', 'recorded_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new BusinessRule('AUDIT_IMMUTABLE', 'Audit tidak dapat diubah.'));
        static::deleting(fn () => throw new BusinessRule('AUDIT_IMMUTABLE', 'Audit tidak dapat dihapus.'));
    }
}
