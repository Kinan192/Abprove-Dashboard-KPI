<?php

namespace App\Jobs;

use App\Mail\KpiReminderMail;
use App\Models\ReminderEmail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

/** Sends one logged reminder; delivery outcome is written back to reminder_emails. */
class SendReminderEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $reminderId) {}

    public function handle(): void
    {
        $reminder = ReminderEmail::with(['recipient', 'cycle'])->find($this->reminderId);
        if (! $reminder || $reminder->status !== 'queued') {
            return;
        }
        try {
            Mail::to($reminder->recipient_email, $reminder->recipient?->name)->send(new KpiReminderMail($reminder));
            $reminder->forceFill(['status' => 'sent', 'sent_at' => now(), 'error' => null])->save();
        } catch (Throwable $e) {
            report($e);
            $reminder->forceFill(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 2000)])->save();
        }
    }
}
