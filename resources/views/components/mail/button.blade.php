@props(['href', 'label', 'secondaryHref' => null, 'secondaryLabel' => null])
@php($t = config('mail_theme'))
{{-- Primary tosca action (full width on phones) with an optional secondary text link. --}}
<table class="m-btn-wrap" role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0">
    <tr><td align="center" bgcolor="{{ $t['brand'] }}" style="background-color:{{ $t['brand'] }};border-radius:8px">
        <a class="m-btn" href="{{ $href }}" style="display:inline-block;padding:12px 22px;border:1px solid {{ $t['brand_dark'] }};border-radius:8px;font-size:14px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;text-align:center">{{ $label }} &rarr;</a>
    </td></tr>
</table>
@if ($secondaryHref)<p style="margin:12px 0 0;font-size:13px;line-height:20px"><a href="{{ $secondaryHref }}" style="font-weight:600;color:{{ $t['brand'] }};text-decoration:underline">{{ $secondaryLabel }}</a></p>@endif
