<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Activity logs freeze the actor's name, NIP, role assignment and area names when the event is recorded.
 * Existing events keep NULL snapshots: their identity at action time is unknown, and readers label the current
 * account name as such instead of presenting it as historical.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE audit_events
            ADD COLUMN actor_assignment_id BIGINT UNSIGNED NULL AFTER actor_role_key,
            ADD COLUMN actor_name_snapshot VARCHAR(160) NULL AFTER actor_assignment_id,
            ADD COLUMN actor_nip_snapshot VARCHAR(64) NULL AFTER actor_name_snapshot,
            ADD COLUMN actor_position_snapshot VARCHAR(190) NULL AFTER actor_nip_snapshot,
            ADD COLUMN actor_unit_name_snapshot VARCHAR(190) NULL AFTER actor_position_snapshot,
            ADD COLUMN actor_division_name_snapshot VARCHAR(190) NULL AFTER actor_unit_name_snapshot');
    }

    public function down(): void
    {
        throw new RuntimeException('Snapshot pelaku pada log bersifat permanen dan tidak dibatalkan otomatis.');
    }
};
