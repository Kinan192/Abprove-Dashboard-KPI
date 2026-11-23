<?php

namespace App\Services\Audit;

use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Facades\DB;

/**
 * Actor identity frozen at action time: account name, NIP, role, assignment and area names. Logs read these
 * snapshots so resignations, replacements and renames never relabel earlier actions.
 */
class ActorSnapshot
{
    public const POSITIONS = ['kepala_unit' => 'Kepala Unit', 'kepala_divisi' => 'Kepala Divisi', 'super_hc' => 'Super HC', 'admin' => 'Admin'];

    /**
     * Actor name for audit readers joined as `audit_events a` LEFT JOIN `users u`. Events recorded before snapshots
     * existed have no historical name; the current account name is shown and labelled as such.
     */
    public const AUDIT_NAME_SQL = "COALESCE(a.actor_name_snapshot, CONCAT(u.name, ' (catatan lama · nama saat ini)'))";

    public static function of(AccessContext $ctx): array
    {
        $user = DB::table('users')->where('id', $ctx->userId)->first(['name', 'login_nip']);
        $unit = $ctx->unitId ? DB::table('units')->where('id', $ctx->unitId)->first(['name', 'division_id']) : null;
        $divisionId = $ctx->divisionId ?? $unit?->division_id;

        return [
            'actor_user_id' => $ctx->userId, 'actor_assignment_id' => $ctx->assignmentId, 'actor_role_key' => $ctx->role,
            'actor_name_snapshot' => $user?->name, 'actor_nip_snapshot' => $user?->login_nip,
            'actor_position_snapshot' => self::POSITIONS[$ctx->role] ?? $ctx->role,
            'actor_unit_id' => $ctx->unitId, 'actor_unit_name_snapshot' => $unit?->name,
            'actor_division_id' => $divisionId,
            'actor_division_name_snapshot' => $divisionId ? DB::table('divisions')->where('id', $divisionId)->value('name') : null,
        ];
    }
}
