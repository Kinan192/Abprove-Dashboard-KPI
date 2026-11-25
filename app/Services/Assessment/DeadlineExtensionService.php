<?php

namespace App\Services\Assessment;

use App\Exceptions\BusinessRule;
use App\Mail\KpiNoticeMail;
use App\Models\AssessmentCycle;
use App\Services\Audit\AuditWriter;
use App\Services\IdentityAccess\AccessContext;
use App\Services\Reporting\DashboardSummary;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Deadline extensions (dispensasi). Kepala Unit / Kepala Divisi ask for more time for their own area; Super HC
 * approves (with dates), rejects (with a note) or grants directly per unit, division or for everyone. Rules:
 *  - one pending request per area; dates are WIB "Y-m-d\TH:i" on input, stored UTC;
 *  - a new date must be after now and the area's current deadline, and not past the cap: the next period's
 *    submission deadline (approval windows: the next period's approval deadline);
 *  - approving a Kepala Unit extension also gives the division head that unit's approval window, by default the
 *    same gap as the original schedule (submission → approval).
 * Emails go out after commit and never fail the mutation.
 */
class DeadlineExtensionService
{
    private const ZONE = 'Asia/Jakarta';

    public function __construct(private DeadlinePolicy $deadlines, private AuditWriter $audit, private DashboardSummary $summary) {}

    /** Deadline and extension state of the actor's own area (Kepala Unit / Kepala Divisi), for dashboard and pages. */
    public function forActor(AccessContext $ctx, object $cycle): ?array
    {
        if (! in_array($ctx->role, ['kepala_unit', 'kepala_divisi'], true)) {
            return null;
        }
        $unitHead = $ctx->role === 'kepala_unit';
        $base = CarbonImmutable::parse($unitHead ? $cycle->submission_due_at : $cycle->approval_due_at, 'UTC');
        $due = $unitHead ? $this->deadlines->submission($cycle, $ctx->unitId) : $this->deadlines->approval($cycle, $ctx->divisionId);
        $latest = $this->areaQuery($cycle->id, $ctx->role, $ctx->divisionId, $unitHead ? $ctx->unitId : null)->orderByDesc('id')->first();
        [$cap] = $this->caps($cycle);

        return [
            'key' => $unitHead ? 'submission' : 'approval',
            'base' => $this->iso($base),
            'due' => $this->iso($due),
            'extended' => $due->gt($base),
            'passed' => $due->isPast(),
            'max' => $this->iso($cap),
            'canRequest' => $cycle->status === 'open' && (! $latest || $latest->status !== 'pending'),
            'request' => $latest ? $this->present($latest) : null,
            // Kepala Divisi: units whose own approval window (from a Kepala Unit extension) runs later than the division's.
            'units' => $unitHead ? [] : DB::table('units')->where('division_id', $ctx->divisionId)->orderBy('name')->get(['id', 'name'])
                ->map(fn ($u) => ['name' => $u->name, 'due' => $this->deadlines->approval($cycle, $ctx->divisionId, (int) $u->id)])
                ->filter(fn ($u) => $u['due']->gt($due) && $u['due']->isFuture())
                ->map(fn ($u) => ['name' => $u['name'], 'due' => $this->iso($u['due'])])->values()->all(),
        ];
    }

    public function request(AccessContext $ctx, int $cycleId, string $date, string $reason): array
    {
        abort_unless(in_array($ctx->role, ['kepala_unit', 'kepala_divisi'], true), 403);
        $cycle = $this->openCycle($cycleId);
        $unitHead = $ctx->role === 'kepala_unit';
        $unitId = $unitHead ? $ctx->unitId : null;
        if ($this->areaQuery($cycleId, $ctx->role, $ctx->divisionId, $unitId)->where('status', 'pending')->lockForUpdate()->exists()) {
            throw new BusinessRule('EXTENSION_PENDING', 'Masih ada permintaan perpanjangan yang menunggu keputusan Super HC.', 422);
        }
        $reason = trim($reason);
        if (mb_strlen($reason) < 20 || mb_strlen($reason) > 1000) {
            throw new BusinessRule('EXTENSION_REASON', 'Alasan wajib diisi 20–1000 karakter.', 422);
        }
        $current = $unitHead ? $this->deadlines->submission($cycle, $unitId) : $this->deadlines->approval($cycle, $ctx->divisionId);
        $due = $this->date($date);
        [$cap] = $this->caps($cycle);
        $this->checkDate($due, $current, $cap);
        $id = DB::table('deadline_extensions')->insertGetId([
            'cycle_id' => $cycleId, 'role_key' => $ctx->role, 'division_id' => $ctx->divisionId, 'unit_id' => $unitId,
            'status' => 'pending', 'requested_by' => $ctx->userId, 'requester_name_snapshot' => $this->name($ctx->userId),
            'requested_due_at' => $due, 'reason' => $reason, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $row = $this->find($id);
        $this->audit->record($ctx, 'deadline_extension', $id, 'extension.requested', null, (array) $row, $reason);
        $this->afterCommit(fn () => $this->mailRequest($row, $cycle));

        return $this->present($row);
    }

    public function cancel(AccessContext $ctx, int $id): array
    {
        $row = $this->find($id, true);
        if ((int) $row->requested_by !== $ctx->userId || $row->status !== 'pending') {
            throw new BusinessRule('EXTENSION_NOT_PENDING', 'Permintaan tidak dapat dibatalkan.', 422);
        }
        DB::table('deadline_extensions')->where('id', $id)->update(['status' => 'cancelled', 'decided_at' => now(), 'updated_at' => now()]);
        $after = $this->find($id);
        $this->audit->record($ctx, 'deadline_extension', $id, 'extension.cancelled', (array) $row, (array) $after);

        return $this->present($after);
    }

    public function approve(AccessContext $ctx, int $id, string $date, ?string $approvalDate, ?string $note): array
    {
        $this->superHc($ctx);
        $row = $this->find($id, true);
        if ($row->status !== 'pending') {
            throw new BusinessRule('EXTENSION_NOT_PENDING', 'Permintaan sudah diputuskan.', 422);
        }
        $cycle = $this->openCycle($row->cycle_id);
        $after = $this->decide($ctx, $row, $cycle, $date, $approvalDate, $note);
        $this->audit->record($ctx, 'deadline_extension', $id, 'extension.approved', (array) $row, (array) $after, $note);
        $this->afterCommit(fn () => $this->mailDecision($after, $cycle));

        return $this->present($after);
    }

    public function reject(AccessContext $ctx, int $id, string $note): array
    {
        $this->superHc($ctx);
        $row = $this->find($id, true);
        if ($row->status !== 'pending') {
            throw new BusinessRule('EXTENSION_NOT_PENDING', 'Permintaan sudah diputuskan.', 422);
        }
        $cycle = $this->openCycle($row->cycle_id);
        $note = trim($note);
        if ($note === '') {
            throw new BusinessRule('EXTENSION_NOTE', 'Alasan penolakan wajib diisi.', 422);
        }
        DB::table('deadline_extensions')->where('id', $id)->update([
            'status' => 'rejected', 'decided_by' => $ctx->userId, 'decider_name_snapshot' => $this->name($ctx->userId),
            'decided_at' => now(), 'decision_note' => $note, 'updated_at' => now(),
        ]);
        $after = $this->find($id);
        $this->audit->record($ctx, 'deadline_extension', $id, 'extension.rejected', (array) $row, (array) $after, $note);
        $this->afterCommit(fn () => $this->mailDecision($after, $cycle));

        return $this->present($after);
    }

    /**
     * Direct grant by Super HC for a unit (Kepala Unit), a division (Kepala Divisi) or everyone ('all'). A pending
     * request of the same area is approved by the grant instead of being left behind.
     */
    public function grant(AccessContext $ctx, int $cycleId, string $role, ?int $divisionId, ?int $unitId, string $date, ?string $approvalDate, ?string $note): array
    {
        $this->superHc($ctx);
        $cycle = $this->openCycle($cycleId);
        [$divisionId, $unitId] = match ($role) {
            'kepala_unit' => [(int) DB::table('units')->where('id', $unitId)->value('division_id') ?: throw new BusinessRule('EXTENSION_AREA', 'Unit tidak ditemukan.', 422), $unitId],
            'kepala_divisi' => [DB::table('divisions')->where('id', $divisionId)->exists() ? $divisionId : throw new BusinessRule('EXTENSION_AREA', 'Divisi tidak ditemukan.', 422), null],
            'all' => [null, null],
            default => throw new BusinessRule('EXTENSION_AREA', 'Cakupan perpanjangan tidak valid.', 422),
        };
        $pending = $role === 'all' ? null : $this->areaQuery($cycleId, $role, $divisionId, $unitId)->where('status', 'pending')->lockForUpdate()->first();
        if ($pending) {
            return $this->approve($ctx, $pending->id, $date, $approvalDate, $note);
        }
        // The area's deadline before this grant; the row is then inserted approved with a placeholder date inside
        // the transaction and decide() validates and sets the real dates against that earlier deadline.
        $this->deadlines->forget();
        $current = $this->current($cycle, $role, $divisionId, $unitId);
        $id = DB::table('deadline_extensions')->insertGetId([
            'cycle_id' => $cycleId, 'role_key' => $role, 'division_id' => $divisionId, 'unit_id' => $unitId,
            'status' => 'approved', 'decided_at' => now(), 'due_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $row = $this->find($id, true);
        $after = $this->decide($ctx, $row, $cycle, $date, $approvalDate, $note, $current);
        $this->audit->record($ctx, 'deadline_extension', $id, 'extension.granted', null, (array) $after, $note);
        if ($role !== 'all') {
            $this->afterCommit(fn () => $this->mailDecision($after, $cycle));
        }

        return $this->present($after);
    }

    /** Super HC page: requests, areas still holding unfinished work past their deadline, and the period caps. */
    public function overview(AccessContext $ctx, int $cycleId): array
    {
        $this->superHc($ctx);
        $cycle = DB::table('assessment_cycles')->where('id', $cycleId)->first() ?? abort(404);
        [$cap, $approvalCap] = $this->caps($cycle);
        $rows = DB::table('deadline_extensions as x')->leftJoin('units as u', 'u.id', '=', 'x.unit_id')->leftJoin('divisions as d', 'd.id', '=', 'x.division_id')
            ->where('x.cycle_id', $cycleId)->select('x.*', 'u.name as unit_name', 'd.name as division_name')
            ->orderByRaw("FIELD(x.status, 'pending') DESC")->orderByDesc('x.id')->get();
        $work = $this->work($ctx, $cycle);
        $requests = $rows->map(fn ($row) => $this->present($row) + ['work' => $this->areaWork($work, $row)])->values();
        $covered = $rows->whereIn('status', ['pending', 'approved'])->filter(fn ($r) => $r->status === 'pending' || CarbonImmutable::parse($r->due_at, 'UTC')->isFuture());
        $stuck = [];
        foreach ($work['units'] as $unit) {
            $open = $unit['not_started'] + $unit['returned'];
            $due = $this->deadlines->submission($cycle, $unit['id']);
            if ($open && $due->isPast() && ! $covered->contains(fn ($r) => $r->role_key === 'kepala_unit' && (int) $r->unit_id === $unit['id'])) {
                $stuck[] = ['role' => 'kepala_unit', 'unitId' => $unit['id'], 'divisionId' => $unit['division_id'], 'area' => $unit['name'], 'parent' => $unit['division'],
                    'head' => $this->heads('kepala_unit', $unit['id'])->first()?->name, 'due' => $this->iso($due),
                    'work' => ['not_started' => $unit['not_started'], 'returned' => $unit['returned']]];
            }
        }
        foreach ($work['divisions'] as $division) {
            $open = $division['submitted'] + $division['heads_not_started'];
            $due = $this->deadlines->approval($cycle, $division['id']);
            if ($open && $due->isPast() && ! $covered->contains(fn ($r) => $r->role_key === 'kepala_divisi' && (int) $r->division_id === $division['id'])) {
                $stuck[] = ['role' => 'kepala_divisi', 'unitId' => null, 'divisionId' => $division['id'], 'area' => $division['name'], 'parent' => 'Divisi',
                    'head' => $this->heads('kepala_divisi', $division['id'])->first()?->name, 'due' => $this->iso($due),
                    'work' => ['submitted' => $division['submitted'], 'heads_not_started' => $division['heads_not_started']]];
            }
        }
        if ($cycle->status !== 'open') {
            $stuck = []; // A closed period holds nothing anymore: unfinished work is "Tidak dinilai".
        }
        $last = $this->deadlines->lastExtension($cycleId);

        return [
            'cycle' => ['id' => (int) $cycle->id, 'month' => substr($cycle->assessment_month, 0, 7), 'status' => $cycle->status,
                'submission' => $this->iso($cycle->submission_due_at), 'approval' => $this->iso($cycle->approval_due_at), 'closes' => $this->iso($cycle->closes_at),
                'gapMinutes' => (int) CarbonImmutable::parse($cycle->submission_due_at, 'UTC')->diffInMinutes(CarbonImmutable::parse($cycle->approval_due_at, 'UTC')),
                'max' => $this->iso($cap), 'approvalMax' => $this->iso($approvalCap), 'runningUntil' => $last && $last->isFuture() ? $this->iso($last) : null],
            'counts' => [
                'pending' => $rows->where('status', 'pending')->count(),
                'approved' => $rows->where('status', 'approved')->count(),
                'rejected' => $rows->where('status', 'rejected')->count(),
                'held' => $work['held'],
            ],
            'requests' => $requests,
            'stuck' => $stuck,
            'close' => $this->closePreview($ctx, $cycle),
        ];
    }

    /** What closing the period would do: Final kept, submissions auto-finalised, the rest "Tidak dinilai". */
    public function closePreview(AccessContext $ctx, object $cycle): array
    {
        $metrics = $this->summary->build($ctx, substr($cycle->assessment_month, 0, 7))['metrics'] ?? [];

        return ['final' => (int) ($metrics['final'] ?? 0), 'autoFinal' => (int) ($metrics['submitted'] ?? 0),
            'returned' => (int) ($metrics['returned'] ?? 0), 'notStarted' => (int) ($metrics['not_started'] ?? 0),
            'notAssessed' => (int) ($metrics['returned'] ?? 0) + (int) ($metrics['not_started'] ?? 0)];
    }

    /**
     * Sends one "deadline passed" email per cycle, role and area when its effective deadline has passed with work
     * left and nothing pending or running for it. Called by the scheduler; returns the number of emails queued.
     */
    public function notifyOverdue(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();
        $ctx = $this->systemContext();
        $sent = 0;
        foreach (DB::table('assessment_cycles')->where('status', 'open')->get() as $cycle) {
            $this->deadlines->forget();
            $work = $this->work($ctx, $cycle);
            $active = DB::table('deadline_extensions')->where('cycle_id', $cycle->id)->where('status', 'pending')->get();
            $targets = [];
            foreach ($work['units'] as $u) {
                $due = $this->deadlines->submission($cycle, $u['id']);
                if ($u['not_started'] + $u['returned'] && $due->lt($now) && ! $active->contains(fn ($r) => $r->role_key === 'kepala_unit' && (int) $r->unit_id === $u['id'])) {
                    $targets[] = ['kepala_unit', $u['id'], $due, $u['name'], [
                        ['label' => 'Belum diisi', 'value' => $u['not_started'], 'unit' => 'staf', 'note' => 'Belum pernah diajukan', 'tone' => 'neutral'],
                        ['label' => 'Dikembalikan', 'value' => $u['returned'], 'unit' => 'staf', 'note' => 'Belum diperbaiki', 'tone' => 'warn'],
                    ]];
                }
            }
            foreach ($work['divisions'] as $d) {
                $due = $this->deadlines->approval($cycle, $d['id']);
                if ($d['submitted'] + $d['heads_not_started'] && $due->lt($now) && ! $active->contains(fn ($r) => $r->role_key === 'kepala_divisi' && (int) $r->division_id === $d['id'])) {
                    $targets[] = ['kepala_divisi', $d['id'], $due, $d['name'], [
                        ['label' => 'Menunggu persetujuan', 'value' => $d['submitted'], 'unit' => 'pengajuan', 'note' => 'Belum diputuskan', 'tone' => 'info'],
                        ['label' => 'Kepala Unit belum dinilai', 'value' => $d['heads_not_started'], 'unit' => 'orang', 'note' => 'Belum ditetapkan', 'tone' => 'neutral'],
                    ]];
                }
            }
            foreach ($targets as [$role, $areaId, $due, $area, $stats]) {
                $inserted = DB::table('deadline_notices')->insertOrIgnore(['cycle_id' => $cycle->id, 'role_key' => $role, 'area_id' => $areaId, 'due_at' => $due, 'sent_at' => now()]);
                if (! $inserted) {
                    continue;
                }
                foreach ($this->heads($role, $areaId) as $head) {
                    $this->send($head, 'Batas '.($role === 'kepala_unit' ? 'pengajuan' : 'persetujuan').' '.$this->month($cycle).' sudah lewat', 'emails.deadline-passed', [
                        'period' => $this->month($cycle), 'recipientName' => $head->name, 'roleLabel' => $role === 'kepala_unit' ? 'Kepala Unit' : 'Kepala Divisi',
                        'isUnitHead' => $role === 'kepala_unit', 'area' => $area, 'dueLabel' => $this->label($due),
                        'closesLabel' => CarbonImmutable::parse($cycle->closes_at, 'UTC')->setTimezone(self::ZONE)->locale('id')->translatedFormat('d F Y'),
                        'stats' => $stats, 'requestUrl' => url(($role === 'kepala_unit' ? '/unit' : '/division').'/dashboard?cycle='.substr($cycle->assessment_month, 0, 7).'&extension=request'),
                        'profileUrl' => url(($role === 'kepala_unit' ? '/unit' : '/division').'/profile'),
                    ]);
                    $sent++;
                }
            }
        }

        return $sent;
    }

    // ---------------------------------------------------------------------------------------------------------

    /** Approves a row (request or new grant) with validated dates; returns the stored row. */
    private function decide(AccessContext $ctx, object $row, object $cycle, string $date, ?string $approvalDate, ?string $note, ?CarbonImmutable $current = null): object
    {
        [$cap, $approvalCap] = $this->caps($cycle);
        $due = $this->date($date);
        $current ??= $this->current($cycle, $row->role_key, $row->division_id === null ? null : (int) $row->division_id, $row->unit_id === null ? null : (int) $row->unit_id);
        $this->checkDate($due, $current, $row->role_key === 'kepala_divisi' ? $approvalCap : $cap);
        $approval = null;
        if ($row->role_key !== 'kepala_divisi') {
            $gap = (int) CarbonImmutable::parse($cycle->submission_due_at, 'UTC')->diffInMinutes(CarbonImmutable::parse($cycle->approval_due_at, 'UTC'));
            $approval = $approvalDate ? $this->date($approvalDate) : $due->addMinutes($gap);
            if ($approval->lt($due)) {
                throw new BusinessRule('EXTENSION_DATE', 'Batas persetujuan Kepala Divisi tidak boleh sebelum tenggat Kepala Unit.', 422);
            }
            if ($approval->gt($approvalCap)) {
                $approval = $approvalDate ? throw new BusinessRule('EXTENSION_DATE', 'Batas persetujuan melewati batas persetujuan periode berikutnya ('.$this->label($approvalCap).').', 422) : $approvalCap;
            }
        }
        DB::table('deadline_extensions')->where('id', $row->id)->update([
            'status' => 'approved', 'due_at' => $due, 'approval_due_at' => $approval, 'decided_by' => $ctx->userId,
            'decider_name_snapshot' => $this->name($ctx->userId), 'decided_at' => now(), 'decision_note' => $note !== null && trim($note) !== '' ? trim($note) : null,
            'updated_at' => now(),
        ]);
        $this->deadlines->forget();

        return $this->find($row->id);
    }

    /** Deadline in force for an area: unit submission, division approval, or the organisation's submission. */
    private function current(object $cycle, string $role, ?int $divisionId, ?int $unitId): CarbonImmutable
    {
        return match ($role) {
            'kepala_unit' => $this->deadlines->submission($cycle, $unitId),
            'kepala_divisi' => $this->deadlines->approval($cycle, $divisionId),
            default => $this->deadlines->submission($cycle, null),
        };
    }

    private function checkDate(CarbonImmutable $due, CarbonImmutable $current, CarbonImmutable $cap): void
    {
        if ($due->lte(CarbonImmutable::now()) || $due->lte($current)) {
            throw new BusinessRule('EXTENSION_DATE', 'Tanggal baru harus setelah sekarang dan setelah tenggat saat ini ('.$this->label($current).').', 422);
        }
        if ($due->gt($cap)) {
            throw new BusinessRule('EXTENSION_DATE', 'Paling lambat '.$this->label($cap).' (batas periode berikutnya).', 422);
        }
    }

    /** [submission cap, approval cap]: the next period's deadlines, else 31 days after this period's closing date. */
    private function caps(object $cycle): array
    {
        $next = DB::table('assessment_cycles')->where('assessment_month', '>', $cycle->assessment_month)->orderBy('assessment_month')->first();
        if ($next) {
            return [CarbonImmutable::parse($next->submission_due_at, 'UTC'), CarbonImmutable::parse($next->approval_due_at, 'UTC')];
        }
        $fallback = CarbonImmutable::parse($cycle->closes_at, 'UTC')->addDays(31);

        return [$fallback, $fallback];
    }

    /**
     * Unfinished work per unit (not started, returned: Kepala Unit) and per division (submitted members and unit
     * heads not yet scored: Kepala Divisi), from the dashboard status groups of the whole organisation.
     */
    private function work(AccessContext $ctx, object $cycle): array
    {
        $groups = $this->summary->statusGroups($ctx, $cycle, ['member', 'unit_head']);
        $units = DB::table('units as u')->join('divisions as d', 'd.id', '=', 'u.division_id')->select('u.id', 'u.name', 'u.division_id', 'd.name as division')->get()->keyBy('id');
        $divisions = DB::table('divisions')->select('id', 'name')->get()->keyBy('id');
        $out = ['units' => [], 'divisions' => [], 'held' => 0];
        foreach ($groups as $g) {
            $total = (int) $g->total;
            if ($g->kind === 'member' && in_array($g->status, ['not_started', 'returned'], true) && isset($units[$g->unit_id])) {
                $u = $units[$g->unit_id];
                $out['units'][$u->id] ??= ['id' => (int) $u->id, 'name' => $u->name, 'division_id' => (int) $u->division_id, 'division' => $u->division, 'not_started' => 0, 'returned' => 0];
                $out['units'][$u->id][$g->status] += $total;
            }
            $isDivisionWork = ($g->kind === 'member' && $g->status === 'submitted') || ($g->kind === 'unit_head' && $g->status === 'not_started');
            if ($isDivisionWork && isset($divisions[$g->division_id])) {
                $d = $divisions[$g->division_id];
                $out['divisions'][$d->id] ??= ['id' => (int) $d->id, 'name' => $d->name, 'submitted' => 0, 'heads_not_started' => 0];
                $out['divisions'][$d->id][$g->kind === 'member' ? 'submitted' : 'heads_not_started'] += $total;
            }
            if ($g->status !== 'final') {
                $out['held'] += $total;
            }
        }

        return $out;
    }

    private function areaWork(array $work, object $row): array
    {
        return match ($row->role_key) {
            'kepala_unit' => array_intersect_key($work['units'][$row->unit_id] ?? ['not_started' => 0, 'returned' => 0], array_flip(['not_started', 'returned'])),
            'kepala_divisi' => array_intersect_key($work['divisions'][$row->division_id] ?? ['submitted' => 0, 'heads_not_started' => 0], array_flip(['submitted', 'heads_not_started'])),
            default => [],
        };
    }

    private function present(object $row): array
    {
        $area = match ($row->role_key) {
            'kepala_unit' => $row->unit_name ?? DB::table('units')->where('id', $row->unit_id)->value('name'),
            'kepala_divisi' => $row->division_name ?? DB::table('divisions')->where('id', $row->division_id)->value('name'),
            default => 'Seluruh organisasi',
        };

        return [
            'id' => (int) $row->id, 'role' => $row->role_key, 'status' => $row->status, 'area' => $area,
            'unitId' => $row->unit_id === null ? null : (int) $row->unit_id, 'divisionId' => $row->division_id === null ? null : (int) $row->division_id,
            'requester' => $row->requester_name_snapshot, 'requestedDue' => $this->iso($row->requested_due_at), 'reason' => $row->reason,
            'due' => $this->iso($row->due_at), 'approvalDue' => $this->iso($row->approval_due_at),
            'decider' => $row->decider_name_snapshot, 'decidedAt' => $this->iso($row->decided_at), 'note' => $row->decision_note,
            'createdAt' => $this->iso($row->created_at), 'direct' => $row->requested_by === null,
        ];
    }

    private function areaQuery(int $cycleId, string $role, ?int $divisionId, ?int $unitId)
    {
        return DB::table('deadline_extensions')->where('cycle_id', $cycleId)->where('role_key', $role)
            ->when($role === 'kepala_unit', fn ($q) => $q->where('unit_id', $unitId))
            ->when($role === 'kepala_divisi', fn ($q) => $q->where('division_id', $divisionId));
    }

    private function find(int $id, bool $lock = false): object
    {
        $q = DB::table('deadline_extensions')->where('id', $id);

        return ($lock ? $q->lockForUpdate() : $q)->first() ?? abort(404);
    }

    private function openCycle(int $id): object
    {
        $cycle = AssessmentCycle::whereKey($id)->lockForUpdate()->first() ?? abort(404);
        if ($cycle->status !== 'open') {
            throw new BusinessRule('CYCLE_NOT_WRITABLE', 'Perpanjangan hanya untuk periode yang terbuka.', 422);
        }

        return $cycle;
    }

    private function superHc(AccessContext $ctx): void
    {
        abort_unless($ctx->role === 'super_hc', 403);
    }

    /** Active heads of an area with email notifications on (Kepala Unit by unit id, Kepala Divisi by division id). */
    private function heads(string $role, int $areaId): Collection
    {
        return DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')
            ->where('s.role_key', $role)->whereNull('s.revoked_at')->where('u.is_active', true)
            ->where($role === 'kepala_unit' ? 's.unit_id' : 's.division_id', $areaId)
            ->select('u.id', 'u.name', 'u.email', 'u.email_notifications')->get();
    }

    private function mailRequest(object $row, object $cycle): void
    {
        $area = $this->present($row)['area'];
        $work = $this->areaWork($this->work($this->systemContext(), $cycle), $row);
        $stats = $row->role_key === 'kepala_unit'
            ? [['label' => 'Belum diisi', 'value' => $work['not_started'] ?? 0, 'unit' => 'staf', 'tone' => 'neutral'], ['label' => 'Dikembalikan', 'value' => $work['returned'] ?? 0, 'unit' => 'staf', 'tone' => 'warn']]
            : [['label' => 'Menunggu persetujuan', 'value' => $work['submitted'] ?? 0, 'unit' => 'pengajuan', 'tone' => 'info'], ['label' => 'Kepala Unit belum dinilai', 'value' => $work['heads_not_started'] ?? 0, 'unit' => 'orang', 'tone' => 'neutral']];
        $base = $row->role_key === 'kepala_unit' ? $this->deadlines->submission($cycle, (int) $row->unit_id) : $this->deadlines->approval($cycle, (int) $row->division_id);
        foreach (DB::table('scope_assignments as s')->join('users as u', 'u.id', '=', 's.user_id')->where('s.role_key', 'super_hc')->whereNull('s.revoked_at')->where('u.is_active', true)->select('u.id', 'u.name', 'u.email', 'u.email_notifications')->get() as $hc) {
            $this->send($hc, 'Permintaan perpanjangan · '.$area, 'emails.extension-request', [
                'period' => $this->month($cycle), 'recipientName' => $hc->name, 'requesterName' => $row->requester_name_snapshot,
                'requesterRole' => $row->role_key === 'kepala_unit' ? 'Kepala Unit' : 'Kepala Divisi', 'area' => $area,
                'originalDue' => $this->label($base), 'requestedDue' => $this->label(CarbonImmutable::parse($row->requested_due_at, 'UTC')),
                'reason' => $row->reason, 'stats' => $stats,
                'reviewUrl' => url('/hc/extensions?cycle='.substr($cycle->assessment_month, 0, 7)), 'profileUrl' => url('/hc/profile'),
            ]);
        }
    }

    private function mailDecision(object $row, object $cycle): void
    {
        $approved = $row->status === 'approved';
        $unitHead = $row->role_key === 'kepala_unit';
        $prefix = $unitHead ? '/unit' : '/division';
        $recipients = $row->requested_by
            ? DB::table('users')->where('id', $row->requested_by)->select('id', 'name', 'email', 'email_notifications')->get()
            : $this->heads($row->role_key, (int) ($unitHead ? $row->unit_id : $row->division_id));
        $due = $row->due_at ? CarbonImmutable::parse($row->due_at, 'UTC') : null;
        $original = $unitHead ? CarbonImmutable::parse($cycle->submission_due_at, 'UTC') : CarbonImmutable::parse($cycle->approval_due_at, 'UTC');
        foreach ($recipients as $user) {
            $this->send($user, ($approved ? 'Perpanjangan disetujui · ' : 'Perpanjangan tidak disetujui · ').$this->month($cycle), 'emails.extension-decision', [
                'approved' => $approved, 'period' => $this->month($cycle), 'recipientName' => $user->name,
                'roleLabel' => $unitHead ? 'Kepala Unit' : 'Kepala Divisi', 'area' => $this->present($row)['area'],
                'decidedBy' => ($row->decider_name_snapshot ?? 'Super HC').' (Super HC)', 'note' => $row->decision_note ?? ($approved ? 'Perpanjangan diberikan.' : ''),
                'newDue' => $due ? $this->label($due) : null, 'dueIn' => $due ? $this->countdown($due) : null, 'originalDue' => $this->label($original),
                'chainNote' => $approved && $unitHead && $row->approval_due_at ? 'Batas persetujuan Kepala Divisi untuk unit ini ikut diperpanjang sampai '.$this->label(CarbonImmutable::parse($row->approval_due_at, 'UTC')).'.' : null,
                'actionUrl' => url($prefix.($approved ? ($unitHead ? '/score' : '/approvals') : '/dashboard').'?cycle='.substr($cycle->assessment_month, 0, 7)),
                'profileUrl' => url($prefix.'/profile'),
            ]);
        }
    }

    private function send(object $user, string $subject, string $view, array $data): void
    {
        if (! $user->email || ! $user->email_notifications) {
            return;
        }
        try {
            Mail::to($user->email, $user->name)->send(new KpiNoticeMail($subject, $view, $data));
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function afterCommit(callable $callback): void
    {
        DB::afterCommit(function () use ($callback) {
            try {
                $callback();
            } catch (Throwable $e) {
                report($e);
            }
        });
    }

    /** Organisation-wide read context for background work (emails, scheduler). */
    private function systemContext(): AccessContext
    {
        return new AccessContext(0, 'super_hc', 0, null, null, now()->format('Y-m-d H:i:s.u'));
    }

    private function date(string $value): CarbonImmutable
    {
        $date = rescue(fn () => CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $value, self::ZONE), null, false);
        if (! $date || $date->format('Y-m-d\TH:i') !== $value) {
            throw new BusinessRule('EXTENSION_DATE', 'Format tanggal tidak valid.', 422);
        }

        return $date->utc();
    }

    private function iso(mixed $value): ?string
    {
        return $value === null ? null : CarbonImmutable::parse($value, 'UTC')->setTimezone(self::ZONE)->format('Y-m-d\TH:i');
    }

    private function label(CarbonImmutable $date): string
    {
        return $date->setTimezone(self::ZONE)->locale('id')->translatedFormat('l, d F Y · H.i').' WIB';
    }

    private function countdown(CarbonImmutable $date): ?string
    {
        if ($date->isPast()) {
            return null;
        }
        $days = (int) floor(CarbonImmutable::now()->diffInDays($date));

        return $days >= 1 ? $days.' hari lagi' : 'hari ini';
    }

    private function month(object $cycle): string
    {
        return CarbonImmutable::parse($cycle->assessment_month)->locale('id')->translatedFormat('F Y');
    }

    private function name(int $userId): ?string
    {
        return DB::table('users')->where('id', $userId)->value('name');
    }
}
