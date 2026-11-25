@props(['top' => 24, 'label' => null])
@php($t = config('mail_theme'))
{{-- One content row of the email card; optional small section label (Swiss eyebrow). --}}
<tr><td class="m-px" style="padding:{{ $top }}px 32px 0">
    @if ($label)<p style="margin:0 0 10px;font-size:11px;font-weight:600;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:{{ $t['faint'] }}">{{ $label }}</p>@endif
    {{ $slot }}
</td></tr>
