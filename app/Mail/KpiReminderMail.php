<?php

namespace App\Mail;

use App\Models\ReminderEmail;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class KpiReminderMail extends Mailable
{
    public function __construct(public ReminderEmail $reminder) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->reminder->subject);
    }

    public function content(): Content
    {
        $details = $this->reminder->details ?? [];
        $isUnitHead = $this->reminder->recipient_role === 'kepala_unit';
        $pending = (int) ($details['pending'] ?? 0);
        $approvals = (int) ($details['secondary'] ?? 0);
        $home = $isUnitHead ? '/unit/score' : ($approvals > 0 ? '/division/approvals' : '/division/heads');
        $actionUrl = url($home);
        $due = empty($details['due_at']) ? null : CarbonImmutable::parse($details['due_at'], 'Asia/Jakarta');

        return new Content(view: 'emails.kpi-reminder', text: 'emails.kpi-reminder-text', with: [
            'reminder' => $this->reminder,
            'details' => $details,
            'period' => $this->reminder->cycle?->assessment_month?->locale('id')->translatedFormat('F Y'),
            'recipientName' => $details['name'] ?? $this->reminder->recipient?->name,
            'roleLabel' => $isUnitHead ? 'Kepala Unit' : 'Kepala Divisi',
            'isUnitHead' => $isUnitHead,
            'actionUrl' => $actionUrl,
            'actionLabel' => $isUnitHead ? 'Lengkapi penilaian staf' : ($approvals > 0 ? 'Tinjau pengajuan staf' : 'Nilai Kepala Unit'),
            'headsUrl' => ! $isUnitHead && $approvals > 0 && $pending > 0 ? url('/division/heads') : null,
            'profileUrl' => url($isUnitHead ? '/unit/profile' : '/division/profile'),
            'dueLabel' => $due ? $due->locale('id')->translatedFormat('l, d F Y · H.i').' WIB' : null,
            'hasDeadline' => $due !== null,
            'overdue' => $due?->isPast() ?? false,
            'localLink' => in_array(parse_url($actionUrl, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1'], true),
        ]);
    }
}
