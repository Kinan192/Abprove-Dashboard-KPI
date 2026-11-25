@props(['rows' => []])
@php($t = config('mail_theme'))
{{-- Key–value list with hairline separators (request details, decisions). Rows: [label => value]. --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;border:1px solid {{ $t['line'] }};border-radius:8px">
    @foreach ($rows as $label => $value)
    <tr>
        <td valign="top" width="38%" style="width:38%;padding:10px 12px 10px 16px;{{ $loop->last ? '' : 'border-bottom:1px solid '.$t['line'].';' }}font-size:13px;line-height:20px;color:{{ $t['muted'] }}">{{ $label }}</td>
        <td valign="top" style="padding:10px 16px 10px 0;{{ $loop->last ? '' : 'border-bottom:1px solid '.$t['line'].';' }}font-size:13px;font-weight:600;line-height:20px;color:{{ $t['ink'] }};word-break:break-word">{{ $value }}</td>
    </tr>
    @endforeach
</table>
