<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{ $reminder->subject }}</title></head>
<body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
            <tr><td style="padding:24px 28px 8px;font-size:13px;color:#6b7280">ABprove · KPI Kinerja</td></tr>
            <tr><td style="padding:0 28px;font-size:20px;font-weight:bold">Pengingat penilaian KPI {{ $period }}</td></tr>
            <tr><td style="padding:16px 28px 0;font-size:15px;line-height:1.6">
                <p style="margin:0 0 12px">Yth. {{ $details['name'] ?? $reminder->recipient?->name }},</p>
                <p style="margin:0 0 12px;white-space:pre-line">{{ $reminder->message }}</p>
            </td></tr>
            <tr><td style="padding:4px 28px 0">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;font-size:14px">
                    <tr><td style="padding:12px 16px;color:#6b7280">Area</td><td style="padding:12px 16px;text-align:right;font-weight:bold">{{ $details['area'] ?? '-' }}</td></tr>
                    @if ($isUnitHead)
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Belum diajukan</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }} staf</td></tr>
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Dikembalikan untuk diperbaiki</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['secondary'] ?? 0 }}</td></tr>
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Batas pengajuan</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['due_at'] ?? '-' }} WIB</td></tr>
                    @else
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Menunggu persetujuan</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['secondary'] ?? 0 }}</td></tr>
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Kepala Unit belum dinilai</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }}</td></tr>
                        <tr><td style="padding:0 16px 12px;color:#6b7280">Batas persetujuan</td><td style="padding:0 16px 12px;text-align:right;font-weight:bold">{{ $details['due_at'] ?? '-' }} WIB</td></tr>
                    @endif
                </table>
            </td></tr>
            <tr><td style="padding:20px 28px 28px">
                <a href="{{ $actionUrl }}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">{{ $isUnitHead ? 'Isi nilai sekarang' : 'Buka persetujuan' }}</a>
            </td></tr>
        </table>
        <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">Email otomatis dari ABprove. Atur preferensi email di menu Profil.</p>
    </td></tr>
</table>
</body>
</html>
