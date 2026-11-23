<?php

namespace App\Jobs;

use App\Mail\KpiReminderMail;
use App\Models\ReminderEmail;
use App\Services\Notification\AutoReminderService;
use App\Services\Notification\ReminderService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Sends one logged reminder once; delivery outcome is written back to reminder_emails. Automatic reminders are
 * rechecked against live data first so a delayed queue never mails closed, finished or opted-out work.
 */
class SendReminderEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $reminderId) {}

    public function handle(AutoReminderService $auto): void
    {
        $reminder = ReminderEmail::with(['recipient', 'cycle'])->find($this->reminderId);
        if (! $reminder || $reminder->status !== 'queued') {
            return;
        }
        if ($reminder->isAutomatic()) {
            $fresh = $auto->recheck($reminder, CarbonImmutable::now());
            if (is_string($fresh)) {
                $reminder->forceFill(['status' => 'failed', 'error' => $fresh])->save();

                return;
            }
            $reminder->forceFill(['recipient_email' => $fresh['email'],
                'details' => array_intersect_key($fresh, array_flip(ReminderService::DETAILS)) + ['offset' => $reminder->details['offset'] ?? null]])->save();
        }
        try {
            Mail::to($reminder->recipient_email, $reminder->recipient?->name)->send(new KpiReminderMail($reminder));
            $reminder->forceFill(['status' => 'sent', 'sent_at' => now(), 'error' => null])->save();
        } catch (Throwable $e) {
            report($e);
            $reminder->forceFill(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 2000)])->save();
        }
    }

    /** Worker timeout or crash: never leave the log row looking queued forever. Not retried automatically. */
    public function failed(?Throwable $e): void
    {
        ReminderEmail::whereKey($this->reminderId)->where('status', 'queued')
            ->update(['status' => 'failed', 'error' => mb_substr('Antrean gagal: '.($e?->getMessage() ?: 'tanpa keterangan'), 0, 2000)]);
    }
}
