<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Single Admin-owned row (id = 1) controlling automatic KPI reminder emails. */
class ReminderSetting extends DomainModel
{
    public const CREATED_AT = null;

    public $incrementing = false;

    protected $fillable = ['enabled', 'offsets', 'send_time', 'targets', 'updated_by'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean', 'offsets' => 'array', 'targets' => 'array', 'updated_at' => 'datetime'];
    }

    public static function current(): self
    {
        return self::findOrFail(1);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** Audit/API shape; offsets are days before the deadline, largest first. */
    public function summary(): array
    {
        return [
            'enabled' => $this->enabled, 'offsets' => $this->offsets, 'send_time' => $this->send_time, 'targets' => $this->targets,
        ];
    }
}
