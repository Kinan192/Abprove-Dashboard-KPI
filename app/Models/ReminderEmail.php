<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderEmail extends DomainModel
{
    public const UPDATED_AT = null;

    protected $fillable = ['batch_id', 'delivery_key', 'cycle_id', 'recipient_user_id', 'recipient_email', 'recipient_role', 'subject', 'message', 'details', 'status', 'error', 'sent_by', 'sent_at'];

    /** Automatic (scheduled) reminders carry a unique delivery key and have no human sender. */
    public function isAutomatic(): bool
    {
        return $this->delivery_key !== null;
    }

    protected function casts(): array
    {
        return ['details' => 'array', 'created_at' => 'datetime', 'sent_at' => 'datetime'];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(AssessmentCycle::class);
    }
}
