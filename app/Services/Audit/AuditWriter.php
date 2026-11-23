<?php

namespace App\Services\Audit;

use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Facades\DB;

class AuditWriter
{
    public function record(AccessContext $ctx, string $type, int $id, string $action, ?array $before, ?array $after, ?string $reason = null): void
    {
        $actor = ActorSnapshot::of($ctx);
        DB::table('audit_events')->insert([
            'subject_type' => $type, 'subject_id' => $id, 'assessment_id' => $type === 'assessment' ? $id : null,
            'actor_user_id' => $ctx->userId, 'actor_role_key' => $ctx->role,
            'actor_assignment_id' => $actor['actor_assignment_id'], 'actor_name_snapshot' => $actor['actor_name_snapshot'],
            'actor_nip_snapshot' => $actor['actor_nip_snapshot'], 'actor_position_snapshot' => $actor['actor_position_snapshot'],
            'actor_unit_name_snapshot' => $actor['actor_unit_name_snapshot'], 'actor_division_name_snapshot' => $actor['actor_division_name_snapshot'],
            'scope_division_id' => $ctx->divisionId, 'scope_unit_id' => $ctx->unitId,
            'action' => $action, 'status_before' => $before['status'] ?? null, 'status_after' => $after['status'] ?? null,
            'before_data' => $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            'after_data' => $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR),
            'reason' => $reason, 'recorded_at' => now()->format('Y-m-d H:i:s.u'),
        ]);
    }
}
