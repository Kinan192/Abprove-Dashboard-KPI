<?php

namespace App\Services\Notification;

use App\Exceptions\BusinessRule;
use App\Queries\AssessmentTasks;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Facades\DB;

/** Read marks of the actor's notification tasks; runs inside the caller's mutation transaction. */
class NotificationReads
{
    public function __construct(private AssessmentTasks $tasks, private AuditWriter $audit) {}

    /**
     * Marks the given task keys (or every current task of the cycle when `$keys` is null) as read.
     *
     * @param  ?list<string>  $keys
     * @return array{read_count: int}
     */
    public function markRead(AccessContext $ctx, int $cycleId, ?array $keys): array
    {
        $cycle = $this->tasks->cycle($cycleId);
        if ($keys !== null && ! $this->tasks->contains($ctx, $cycle, $keys)) {
            throw new BusinessRule('NOTIFICATION_OUT_OF_SCOPE', 'Notifikasi di luar tugas akun.', 422);
        }
        $keys ??= $this->tasks->keys($ctx, $cycle);
        $now = now();
        foreach (array_chunk($keys, 500) as $chunk) {
            DB::table('notification_reads')->upsert(
                array_map(fn ($key) => ['user_id' => $ctx->userId, 'cycle_id' => $cycle->id, 'notification_key' => $key, 'read_at' => $now], $chunk),
                ['user_id', 'cycle_id', 'notification_key'], ['read_at'],
            );
        }
        $result = ['read_count' => count($keys)];
        $this->audit->record($ctx, 'user', $ctx->userId, 'notifications.read', null, $result);

        return $result;
    }
}
