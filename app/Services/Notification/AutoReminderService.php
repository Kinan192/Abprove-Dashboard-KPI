<?php

namespace App\Services\Notification;

use App\Models\AssessmentCycle;
use App\Models\ReminderEmail;
use App\Models\ReminderSetting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Scheduled KPI reminders. On a WIB calendar day that is exactly H-n before a role's deadline (n in the Admin
 * offsets) and at/after the configured WIB send time, every pending, deliverable head of an open period gets one
 * email through the logged ReminderEmail + SendReminderEmail pipeline. Unit heads follow the submission deadline,
 * division heads the approval deadline. Missed days are not caught up; later runs on the same day are.
 *
 * Delivery key `auto:{cycle}:{role}:{area}:{user}:{deadline WIB YmdHi}:H-{n}` is unique in reminder_emails, so
 * repeated or concurrent runs never log or send the same reminder twice. A moved deadline yields new keys, but one
 * recipient/area/role gets at most one automatic email per WIB day.
 */
class AutoReminderService
{
    public const ZONE = 'Asia/Jakarta';

    public const DEFAULT_OFFSETS = [14, 7, 3];

    /** Setting target => pending-only recipient target and the cycle deadline that role answers to. */
    public const TARGETS = [
        'kepala_unit' => ['target' => 'unit_heads_pending', 'deadline' => 'submission_due_at'],
        'kepala_divisi' => ['target' => 'division_heads_pending', 'deadline' => 'approval_due_at'],
    ];

    public function __construct(private ReminderService $reminders) {}

    /**
     * Deliveries due at $now; deterministic for a given clock and database state.
     *
     * @return list<array{cycle: AssessmentCycle, role: string, recipient: array, offset: int, due: CarbonImmutable, key: string}>
     */
    public function plan(CarbonImmutable $now): array
    {
        $setting = ReminderSetting::current();
        $now = $now->setTimezone(self::ZONE);
        if (! $setting->enabled || $now->format('H:i') < $setting->send_time) {
            return [];
        }
        $today = $now->startOfDay();
        $plan = [];
        foreach (AssessmentCycle::where('status', 'open')->orderBy('assessment_month')->get() as $cycle) {
            foreach (array_intersect(array_keys(self::TARGETS), $setting->targets) as $role) {
                $due = $this->deadline($cycle, $role);
                $offset = (int) round($today->diffInDays($due->startOfDay(), false));
                if ($due <= $now || ! in_array($offset, $setting->offsets, true)) {
                    continue;
                }
                foreach ($this->reminders->recipients($cycle, self::TARGETS[$role]['target']) as $recipient) {
                    if ($recipient['deliverable']) {
                        $plan[] = ['cycle' => $cycle, 'role' => $role, 'recipient' => $recipient, 'offset' => $offset, 'due' => $due,
                            'key' => $this->prefix($cycle->id, $role, $recipient).$due->format('YmdHi').':H-'.$offset];
                    }
                }
            }
        }

        return $plan;
    }

    /** Logs and queues every due delivery not yet sent; returns run counts for the console. */
    public function run(CarbonImmutable $now): array
    {
        $plan = $this->plan($now);
        if ($plan === []) {
            return ['planned' => 0, 'queued' => 0, 'skipped' => 0];
        }
        $today = $this->sentToday($now);
        $batch = (string) Str::uuid();
        $ids = [];
        foreach ($plan as $item) {
            $prefix = $this->prefix($item['cycle']->id, $item['role'], $item['recipient']);
            if (collect($today)->contains(fn ($key) => str_starts_with($key, $prefix))) {
                continue;
            }
            [$subject, $message] = $this->content($item['cycle'], $item['role'], $item['offset']);
            $id = $this->reminders->log($item['cycle'], $item['recipient'], $batch, $subject, $message, null, $item['key'], ['offset' => $item['offset']]);
            if ($id !== null) {
                $ids[] = $id;
            }
        }
        $this->reminders->dispatch($ids);

        return ['planned' => count($plan), 'queued' => count($ids), 'skipped' => count($plan) - count($ids)];
    }

    /**
     * Scheduled send moments (WIB) from today on for open periods under the current settings, earliest first.
     *
     * @return list<array{send_at: string, month: string, role: string, offset: int}>
     */
    public function upcoming(CarbonImmutable $now, int $limit = 6): array
    {
        $setting = ReminderSetting::current();
        if (! $setting->enabled) {
            return [];
        }
        $today = $now->setTimezone(self::ZONE)->startOfDay();
        [$hour, $minute] = array_map('intval', explode(':', $setting->send_time));
        $rows = [];
        foreach (AssessmentCycle::where('status', 'open')->get() as $cycle) {
            foreach (array_intersect(array_keys(self::TARGETS), $setting->targets) as $role) {
                $due = $this->deadline($cycle, $role);
                foreach ($setting->offsets as $offset) {
                    $at = $due->startOfDay()->subDays($offset)->setTime($hour, $minute);
                    if ($at >= $today && $at < $due) {
                        $rows[] = ['send_at' => $at->format('Y-m-d H:i'), 'month' => $cycle->assessment_month->format('Y-m'), 'role' => $role, 'offset' => $offset];
                    }
                }
            }
        }
        usort($rows, fn ($a, $b) => [$a['send_at'], $a['role']] <=> [$b['send_at'], $b['role']]);

        return array_slice($rows, 0, $limit);
    }

    /** Delivery keys already logged on $now's WIB day. @return list<string> */
    public function sentToday(CarbonImmutable $now): array
    {
        return ReminderEmail::whereNotNull('delivery_key')
            ->where('created_at', '>=', $now->setTimezone(self::ZONE)->startOfDay()->utc()->format('Y-m-d H:i:s.u'))
            ->pluck('delivery_key')->all();
    }

    /**
     * Fresh recipient row for a queued automatic reminder at send time, or why it must not be sent. Guards delayed
     * queue processing: disabled settings, closed periods, finished work, moved deadlines and opt-outs.
     */
    public function recheck(ReminderEmail $reminder, CarbonImmutable $now): array|string
    {
        $setting = ReminderSetting::current();
        $role = $reminder->recipient_role;
        $cycle = $reminder->cycle;
        $now = $now->setTimezone(self::ZONE);
        if (! $setting->enabled || ! in_array($role, $setting->targets, true) || ! isset(self::TARGETS[$role])) {
            return 'Dibatalkan: pengingat otomatis dinonaktifkan.';
        }
        if ($cycle?->status !== 'open') {
            return 'Dibatalkan: periode tidak dibuka.';
        }
        if ($reminder->created_at->copy()->setTimezone(self::ZONE)->format('Y-m-d') !== $now->format('Y-m-d')) {
            return 'Kedaluwarsa: antrean tidak diproses pada hari jadwal.';
        }
        $due = $this->deadline($cycle, $role);
        if ($due->format('Y-m-d H:i') !== ($reminder->details['due_at'] ?? null)) {
            return 'Dibatalkan: batas waktu berubah.';
        }
        if ($due <= $now) {
            return 'Dibatalkan: batas waktu sudah lewat.';
        }
        $fresh = $this->reminders->recipients($cycle, self::TARGETS[$role]['target'])->first(fn ($r) => $r['user_id'] === (int) $reminder->recipient_user_id
            && $r['area_id'] === (int) ($reminder->details['area_id'] ?? 0));
        if (! $fresh) {
            return 'Dibatalkan: tugas sudah selesai atau penugasan berubah.';
        }

        return $fresh['deliverable'] ? $fresh : 'Dibatalkan: email penerima tidak aktif.';
    }

    private function deadline(AssessmentCycle $cycle, string $role): CarbonImmutable
    {
        return CarbonImmutable::instance($cycle->{self::TARGETS[$role]['deadline']})->setTimezone(self::ZONE);
    }

    private function prefix(int $cycleId, string $role, array $recipient): string
    {
        return "auto:{$cycleId}:{$role}:{$recipient['area_id']}:{$recipient['user_id']}:";
    }

    /** @return array{0: string, 1: string} */
    private function content(AssessmentCycle $cycle, string $role, int $offset): array
    {
        $period = $cycle->assessment_month->locale('id')->translatedFormat('F Y');
        $left = $offset === 0 ? 'berakhir hari ini' : "tinggal {$offset} hari";
        $message = $role === 'kepala_unit'
            ? "Batas pengajuan penilaian KPI staf periode {$period} {$left}. Mohon lengkapi dan ajukan sebelum batas waktu."
            : "Batas persetujuan dan penilaian Kepala Unit periode {$period} {$left}. Mohon tindak lanjuti sebelum batas waktu.";

        return ["Pengingat KPI {$period} · H-{$offset}", $message];
    }
}
