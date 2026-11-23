<?php

namespace App\Services\Assessment;

use App\Models\AssessmentEvent;
use App\Services\Audit\ActorSnapshot;
use App\Services\IdentityAccess\AccessContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Append-only assessment history. Every event freezes the actor's name, role and area as they were when the
 * action happened, so resignations, replacements and renames never relabel earlier actions. Events are keyed by
 * subject and period, not by assessment row, because a withdrawn submission is deleted while its history stays.
 */
class AssessmentHistory
{
    /** Actions whose item list is the complete sheet instead of the changed rows only. */
    private const FULL_SHEET = ['submitted', 'head_finalized', 'withdrawn'];

    private const LIMIT = 200;

    /**
     * @param  array{note?: ?string, notes?: array<int|string, string>, bulk?: ?int, request_id?: ?string}  $extra
     */
    public function record(AccessContext $ctx, string $action, ?array $before, ?array $after, array $extra = []): void
    {
        AssessmentEvent::create([...self::row($action, $before, $after, $extra), ...ActorSnapshot::of($ctx), 'recorded_at' => now()->utc()->format('Y-m-d H:i:s.u')]);
    }

    /**
     * Subject, transition and detail columns of one event; shared by live actions and the audit backfill.
     * $after without an assessment shape (withdrawal) means the row no longer exists.
     */
    public static function row(string $action, ?array $before, ?array $after, array $extra = []): array
    {
        $current = isset($after['assessment_kind']) ? $after : null;
        $subject = $current ?? $before;
        $details = array_filter([
            'items' => self::itemChanges($before, $current, $extra['notes'] ?? [], in_array($action, self::FULL_SHEET, true)),
            'findings' => self::findingChanges($before, $current),
            'bulk' => $extra['bulk'] ?? null,
        ], fn ($value) => $value !== null && $value !== []);

        return [
            'assessment_id' => $subject['id'], 'cycle_id' => $subject['cycle_id'], 'assessment_kind' => $subject['assessment_kind'],
            'employee_id' => $subject['employee_id'] ?? null, 'subject_user_id' => $subject['subject_user_id'] ?? null,
            'subject_name_snapshot' => $subject['employee_name_snapshot'], 'unit_id' => $subject['unit_id'], 'division_id' => $subject['division_id'],
            'action' => $action, 'status_before' => $before['status'] ?? null, 'status_after' => $current['status'] ?? null,
            'lock_version_after' => $current['lock_version'] ?? null,
            'total_before' => $before['total_score_raw'] ?? null, 'total_after' => $current['total_score_raw'] ?? null,
            'note' => self::text($extra['note'] ?? null), 'details' => $details ?: null, 'request_id' => $extra['request_id'] ?? null,
        ];
    }

    /**
     * Item rows of one action: every KPI for a full sheet, otherwise only rows whose score, measurement inputs or
     * reviewer note changed. before/after are the scores in force (formula results keep their decimals). Rows of a
     * KPI with a division head reviewed score also carry the unit head's proposal, and `reviewed` when the
     * reviewed score applies after the action.
     *
     * @param  array<int|string, string>  $notes  reviewer notes keyed by source KPI item id
     */
    public static function itemChanges(?array $before, ?array $after, array $notes = [], bool $all = false): array
    {
        $old = collect($before['items'] ?? [])->keyBy('source_kpi_item_id');
        $new = collect($after['items'] ?? [])->keyBy('source_kpi_item_id');
        $rows = [];
        foreach ($new->isNotEmpty() ? $new : $old as $id => $item) {
            $from = $old->has($id) ? self::score($old[$id]) : null;
            $to = $new->has($id) ? self::score($new[$id]) : null;
            $inputsFrom = $old[$id]['measurement_inputs'] ?? null;
            $inputsTo = $new[$id]['measurement_inputs'] ?? null;
            $note = self::text($notes[$id] ?? null);
            $same = $from === $to || ($from !== null && $to !== null && abs($from - $to) < 0.0000005);
            if (! $all && $same && $inputsFrom == $inputsTo && $note === null) {
                continue;
            }
            $formula = ($item['definition_snapshot']['method'] ?? null) === 'formula';
            $reviewedFrom = $old[$id]['reviewed_score'] ?? null;
            $reviewedTo = $new[$id]['reviewed_score'] ?? null;
            $rows[] = array_filter([
                'id' => (int) $id, 'order' => (int) $item['sort_order'], 'name' => $item['kpi_name_snapshot'],
                'weight' => (float) $item['weight_percent_snapshot'], 'before' => $from, 'after' => $to,
                'proposal' => $reviewedFrom !== null || $reviewedTo !== null ? self::proposal($item) : null,
                'reviewed' => $reviewedTo !== null ? true : null,
                'inputs_before' => $formula ? $inputsFrom : null, 'inputs_after' => $formula ? $inputsTo : null, 'note' => $note,
            ], fn ($value) => $value !== null);
        }
        usort($rows, fn ($a, $b) => $a['order'] <=> $b['order']);

        return $rows;
    }

    private static function findingChanges(?array $before, ?array $after): array
    {
        $changes = [];
        foreach (['positive' => 'positive_finding', 'negative' => 'negative_finding'] as $key => $column) {
            $from = self::text($before[$column] ?? null);
            $to = self::text($after[$column] ?? null);
            if ($from !== $to) {
                $changes[$key] = ['before' => $from, 'after' => $to];
            }
        }

        return $changes;
    }

    /** Score in force: the division head's reviewed score, else the unit head's proposal. */
    private static function score(array $item): float
    {
        return (float) ($item['reviewed_score'] ?? self::proposal($item));
    }

    private static function proposal(array $item): float
    {
        return (float) ($item['computed_score'] ?? $item['score']);
    }

    private static function text(?string $value): ?string
    {
        $value = $value === null ? null : trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * Events of one subject-period visible to the actor, newest first. Scope follows the area recorded on each
     * event, so a successor head reads the history left by the predecessor in the same unit or division.
     */
    public function timeline(AccessContext $ctx, int $cycleId, string $kind, int $subjectId, ?int $currentId = null): array
    {
        return DB::table('assessment_events')->where('cycle_id', $cycleId)->where('assessment_kind', $kind)
            ->where($kind === 'member' ? 'employee_id' : 'subject_user_id', $subjectId)
            ->when($ctx->role === 'kepala_unit', fn ($q) => $q->where('assessment_kind', 'member')->where('unit_id', $ctx->unitId))
            ->when($ctx->role === 'kepala_divisi', fn ($q) => $q->where('division_id', $ctx->divisionId))
            ->orderByDesc('recorded_at')->orderByDesc('id')->limit(self::LIMIT)->get()
            ->map(fn ($e) => [
                'id' => $e->id, 'action' => $e->action, 'assessmentId' => $e->assessment_id,
                'previousSubmission' => $currentId !== null && (int) $e->assessment_id !== $currentId,
                'legacy' => $e->source_audit_event_id !== null,
                'at' => CarbonImmutable::parse($e->recorded_at, 'UTC')->format('Y-m-d\TH:i:s\Z'),
                'actor' => ['name' => $e->actor_name_snapshot, 'nip' => $e->actor_nip_snapshot, 'role' => $e->actor_role_key,
                    'position' => $e->actor_position_snapshot, 'unit' => $e->actor_unit_name_snapshot, 'division' => $e->actor_division_name_snapshot],
                'statusBefore' => $e->status_before, 'statusAfter' => $e->status_after,
                'totalBefore' => $e->total_before === null ? null : (float) $e->total_before,
                'totalAfter' => $e->total_after === null ? null : (float) $e->total_after,
                'note' => $e->note, 'details' => $e->details === null ? (object) [] : json_decode($e->details, false, 512, JSON_THROW_ON_ERROR),
            ])->all();
    }
}
