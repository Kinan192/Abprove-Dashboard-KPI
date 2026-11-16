<?php

namespace App\Mail;

use App\Models\ReminderEmail;
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
        $home = $this->reminder->recipient_role === 'kepala_unit' ? '/unit/score' : '/division/approvals';

        return new Content(view: 'emails.kpi-reminder', with: [
            'reminder' => $this->reminder,
            'details' => $details,
            'period' => $this->reminder->cycle?->assessment_month?->locale('id')->translatedFormat('F Y'),
            'actionUrl' => url($home),
            'isUnitHead' => $this->reminder->recipient_role === 'kepala_unit',
        ]);
    }
}
