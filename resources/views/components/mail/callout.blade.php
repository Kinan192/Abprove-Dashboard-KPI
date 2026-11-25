@props(['tone' => 'brand', 'label', 'value' => null, 'badge' => null])
@php($t = config('mail_theme'))
@php($c = $t['tones'][$tone] ?? $t['tones']['brand'])
{{-- Highlighted fact (deadline, decision): tinted panel, small uppercase label, strong value,
     optional right-aligned badge (e.g. "3 hari lagi") and body text in the slot. --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;background-color:{{ $c['bg'] }};border:1px solid {{ $c['line'] }};border-radius:8px">
    <tr><td style="padding:14px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>
            <td valign="top">
                <p style="margin:0;font-size:11px;font-weight:600;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:{{ $c['label'] }}">{{ $label }}</p>
                @if ($value)<p style="margin:4px 0 0;font-size:16px;font-weight:700;line-height:22px;color:{{ $c['text'] }}">{{ $value }}</p>@endif
            </td>
            @if ($badge)<td valign="top" align="right" style="padding-left:12px;white-space:nowrap"><span style="display:inline-block;padding:3px 9px;border-radius:6px;background-color:{{ $t['paper'] }};border:1px solid {{ $c['line'] }};font-size:12px;font-weight:700;line-height:18px;color:{{ $c['label'] }}">{{ $badge }}</span></td>@endif
        </tr></table>
        @if ($slot->isNotEmpty())<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:{{ $c['text'] }}">{{ $slot }}</p>@endif
    </td></tr>
</table>
