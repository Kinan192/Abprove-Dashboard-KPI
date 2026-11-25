@props(['name', 'role', 'area' => null])
@php($t = config('mail_theme'))
{{-- Addressee line: name, then role · area in muted text. --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;border:1px solid {{ $t['line'] }};border-radius:8px">
    <tr><td style="padding:12px 16px">
        <p style="margin:0;font-size:11px;font-weight:600;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:{{ $t['faint'] }}">Kepada Yth.</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;line-height:22px;color:{{ $t['ink'] }};word-break:break-word">{{ $name }}</p>
        <p style="margin:0;font-size:13px;line-height:20px;color:{{ $t['muted'] }};word-break:break-word">{{ $role }}@if ($area) · {{ $area }}@endif</p>
    </td></tr>
</table>
