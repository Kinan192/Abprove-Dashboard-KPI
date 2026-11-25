<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * One-off KPI notices built on the shared email components (deadline passed, extension requested/decided).
 * The view receives $data plus `subject`, `profileUrl` and `localLink`.
 */
class KpiNoticeMail extends Mailable
{
    public function __construct(public string $subjectLine, public string $template, public array $data) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        $link = $this->data['actionUrl'] ?? $this->data['reviewUrl'] ?? $this->data['requestUrl'] ?? url('/');

        return new Content(view: $this->template, with: $this->data + [
            'subject' => $this->subjectLine,
            'profileUrl' => $this->data['profileUrl'] ?? null,
            'localLink' => in_array(parse_url($link, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1'], true),
        ]);
    }
}
