<?php

namespace App\Services\Notification;

use App\Exceptions\BusinessRule;
use App\Jobs\SendReminderEmail;
use App\Models\AssessmentCycle;
use App\Models\ReminderEmail;
use App\Queries\ScopedRecords;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Builds reminder recipients from live assessment progress and queues one email per recipient.
 * Recipients are always recomputed on the server; the client may only narrow the list.
 */
class ReminderService
{
    public const TARGETS = ['unit_heads_pending', 'division_heads_pending', 'all_heads'];

    public function __construct(private ScopedRecords $records, private AuditWriter $audit) {}

    /** @return Collection<int, array> */
    public function recipients(AccessContext $ctx, AssessmentCycle $cycle, string $target): Collection
    {
        $month = $cycle->assessment_month->format('Y-m-d');
        $rows = collect();
        if (in_array($target, ['unit_heads_pending', 'all_heads'], true)) {
            $members = DB::query()->fromSub($this->records->members($ctx, false, $month), 'm')
                ->groupBy('unit_id')->pluck(DB::raw('COUNT(*)'), 'unit_id');
            $done = DB::table('assessments')->where('cycle_id', $cycle->id)->where('assessment_kind', 'member')
                ->whereIn('status', ['submitted', 'final'])->groupBy('unit_id')->pluck(DB::raw('COUNT(*)'), 'unit_id');
            $returned = DB::table('assessments')->where('cycle_id', $cycle->id)->where('assessment_kind', 'member')
                ->where('status', 'returned')->groupBy('unit_id')->pluck(DB::raw('COUNT(*)'), 'unit_id');
            foreach ($this->heads('kepala_unit') as $head) {
                $total = (int) ($members[$head->unit_id] ?? 0);
                $pending = max(0, $total - (int) ($done[$head->unit_id] ?? 0));
                if ($target === 'all_heads' || $pending > 0) {
                    $rows->push($this->recipient($head, 'kepala_unit', $pending, (int) ($returned[$head->unit_id] ?? 0), $total,
                        $cycle->submission_due_at));
                }
            }
        }
        if (in_array($target, ['division_heads_pending', 'all_heads'], true)) {
            $waiting = DB::table('assessments')->where('cycle_id', $cycle->id)->where('status', 'submitted')
                ->groupBy('division_id')->pluck(DB::raw('COUNT(*)'), 'division_id');
            $heads = DB::query()->fromSub($this->records->members($ctx, true, $month), 'h')
                ->groupBy('division_id')->pluck(DB::raw('COUNT(*)'), 'division_id');
            $headsDone = DB::table('assessments')->where('cycle_id', $cycle->id)->where('assessment_kind', '!=', 'member')
                ->whereIn('status', ['submitted', 'final'])->groupBy('division_id')->pluck(DB::raw('COUNT(*)'), 'division_id');
            foreach ($this->heads('kepala_divisi') as $head) {
                $approvals = (int) ($waiting[$head->division_id] ?? 0);
                $unscored = max(0, (int) ($heads[$head->division_id] ?? 0) - (int) ($headsDone[$head->division_id] ?? 0));
                if ($target === 'all_heads' || $approvals + $unscored > 0) {
                    $rows->push($this->recipient($head, 'kepala_divisi', $unscored, $approvals, (int) ($heads[$head->division_id] ?? 0),
                        $cycle->approval_due_at));
                }
            }
        }

        return $rows->sortBy('name')->values();
    }

    public function send(AccessContext $ctx, AssessmentCycle $cycle, array $data): array
    {
        if ($cycle->status === 'closed') {
            throw new BusinessRule('CYCLE_CLOSED', 'Periode sudah ditutup; pengingat tidak diperlukan.', 422);
        }
        $recipients = $this->recipients($ctx, $cycle, $data['target'])
            ->when(isset($data['user_ids']), fn ($c) => $c->whereIn('user_id', array_map('intval', $data['user_ids'])))
            ->filter(fn ($r) => $r['deliverable'])->values();
        if ($recipients->isEmpty()) {
            throw new BusinessRule('NO_RECIPIENTS', 'Tidak ada penerima yang dapat dikirimi email.', 422);
        }
        $batch = (string) Str::uuid();
        $ids = [];
        foreach ($recipients as $recipient) {
            $ids[] = ReminderEmail::create([
                'batch_id' => $batch, 'cycle_id' => $cycle->id, 'recipient_user_id' => $recipient['user_id'],
                'recipient_email' => $recipient['email'], 'recipient_role' => $recipient['role'],
                'subject' => $data['subject'], 'message' => $data['message'], 'status' => 'queued', 'sent_by' => $ctx->userId,
                'details' => array_intersect_key($recipient, array_flip(['name', 'area', 'pending', 'secondary', 'total', 'due_at'])),
            ])->id;
        }
        foreach ($ids as $id) {
            SendReminderEmail::dispatch($id)->afterCommit();
        }
        $result = ['batch_id' => $batch, 'queued' => count($ids), 'cycle' => $cycle->assessment_month->format('Y-m')];
        $this->audit->record($ctx, 'assessment_cycle', $cycle->id, 'reminder.emailed', null, $result + ['target' => $data['target']]);

        return $result;
    }

    private function heads(string $role): Collection
    {
        return DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')
            ->leftJoin('units as un', 'un.id', '=', 's.unit_id')
            ->leftJoin('divisions as d', 'd.id', '=', DB::raw('COALESCE(s.division_id, un.division_id)'))
            ->where('s.role_key', $role)->whereNull('s.revoked_at')->where('u.is_active', true)
            ->get(['u.id', 'u.name', 'u.email', 'u.email_notifications', 's.unit_id', DB::raw('d.id as division_id'), 'un.name as unit_name', 'd.name as division_name']);
    }

    private function recipient(object $head, string $role, int $pending, int $secondary, int $total, $due): array
    {
        $email = trim((string) $head->email);

        return [
            'user_id' => (int) $head->id, 'name' => $head->name, 'email' => $email, 'role' => $role,
            'area' => $role === 'kepala_unit' ? $head->unit_name : $head->division_name,
            // Unit head: pending = not yet submitted, secondary = returned. Division head: pending = unit heads unscored, secondary = waiting approval.
            'pending' => $pending, 'secondary' => $secondary, 'total' => $total,
            'due_at' => $due?->setTimezone('Asia/Jakarta')->format('Y-m-d H:i'),
            'opted_out' => ! $head->email_notifications,
            'deliverable' => $email !== '' && (bool) $head->email_notifications,
        ];
    }
}
