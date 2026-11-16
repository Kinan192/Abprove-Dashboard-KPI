<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class LoginEvent extends DomainModel
{
    public const EVENTS = ['login', 'failed', 'logout'];

    public $timestamps = false;

    protected $fillable = ['user_id', 'identifier', 'event', 'ip_address', 'user_agent', 'occurred_at'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Request $request, string $event, string $identifier, ?int $userId): void
    {
        static::create([
            'user_id' => $userId,
            'identifier' => mb_substr($identifier, 0, 190),
            'event' => $event,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255) ?: null,
            'occurred_at' => now(),
        ]);
    }
}
