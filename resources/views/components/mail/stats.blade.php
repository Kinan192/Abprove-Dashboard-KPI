@props(['items' => []])
@php($t = config('mail_theme'))
@php($markers = ['brand' => $t['brand_fill'], 'warn' => '#e7a13a', 'danger' => $t['tones']['danger']['label'], 'info' => '#8fb3ef', 'neutral' => $t['faint'], 'success' => $t['tones']['success']['label']])
{{-- Bento stat tiles, two per row (stacked on phones): uppercase label with a coloured marker, large
     tabular number, small note. Items: ['label' => .., 'value' => .., 'unit' => .., 'note' => .., 'tone' => ..]. --}}
@foreach (array_chunk($items, 2) as $row)
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-stack" style="border-collapse:collapse;{{ $loop->first ? '' : 'margin-top:8px;' }}">
    <tr>
        @foreach ($row as $item)
        @if (! $loop->first)<td class="m-gap" width="8" style="width:8px;font-size:0;line-height:0">&nbsp;</td>@endif
        <td class="m-col" valign="top" width="50%" style="width:50%">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;border:1px solid {{ $t['line'] }};border-radius:8px">
                <tr><td style="padding:12px 14px">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>
                        <td width="3" bgcolor="{{ $markers[$item['tone'] ?? 'brand'] ?? $t['brand_fill'] }}" style="width:3px;border-radius:2px;background-color:{{ $markers[$item['tone'] ?? 'brand'] ?? $t['brand_fill'] }};font-size:0;line-height:0">&nbsp;</td>
                        <td style="padding-left:8px;font-size:11px;font-weight:600;line-height:14px;letter-spacing:0.8px;text-transform:uppercase;color:{{ $t['muted'] }}">{{ $item['label'] }}</td>
                    </tr></table>
                    <p style="margin:8px 0 0;font-size:28px;font-weight:700;line-height:32px;letter-spacing:-1px;color:{{ $t['ink'] }};font-variant-numeric:tabular-nums">{{ $item['value'] }}@if (! empty($item['unit']))<span style="font-size:13px;font-weight:400;letter-spacing:0;color:{{ $t['faint'] }}"> {{ $item['unit'] }}</span>@endif</p>
                    @if (! empty($item['note']))<p style="margin:6px 0 0;padding-top:6px;border-top:1px solid {{ $t['line'] }};font-size:12px;line-height:18px;color:{{ $t['muted'] }}">{{ $item['note'] }}</p>@endif
                </td></tr>
            </table>
        </td>
        @endforeach
        @if (count($row) === 1)<td class="m-gap" width="8" style="width:8px">&nbsp;</td><td class="m-col" width="50%" style="width:50%">&nbsp;</td>@endif
    </tr>
</table>
@endforeach
