@props(['done' => 0, 'total' => 0, 'label' => null])
@php($t = config('mail_theme'))
@php($pct = $total > 0 ? max(0, min(100, (int) round($done * 100 / $total))) : 0)
{{-- Completion bar built from two table cells (works without CSS gradients or images). --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
    <tr>
        <td style="font-size:12px;line-height:18px;color:{{ $t['muted'] }}">{{ $label }}</td>
        <td align="right" style="font-size:12px;font-weight:700;line-height:18px;color:{{ $t['ink'] }};white-space:nowrap">{{ $pct }}%</td>
    </tr>
    <tr><td colspan="2" style="padding-top:6px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;border-radius:4px;overflow:hidden;background-color:{{ $t['subtle'] }}"><tr>
            @if ($pct > 0)<td width="{{ $pct }}%" height="6" bgcolor="{{ $t['brand_fill'] }}" style="height:6px;background-color:{{ $t['brand_fill'] }};font-size:0;line-height:0">&nbsp;</td>@endif
            @if ($pct < 100)<td height="6" bgcolor="#e7eeef" style="height:6px;background-color:#e7eeef;font-size:0;line-height:0">&nbsp;</td>@endif
        </tr></table>
    </td></tr>
</table>
