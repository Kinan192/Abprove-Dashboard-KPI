@props(['label'])
@php($t = config('mail_theme'))
{{-- Free text written by a person (admin message, request reason, decision note). --}}
<p style="margin:0 0 8px;font-size:11px;font-weight:600;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:{{ $t['faint'] }}">{{ $label }}</p>
<p style="margin:0;padding:2px 0 2px 14px;border-left:3px solid {{ $t['brand_line'] }};font-size:14px;line-height:22px;color:{{ $t['body'] }};word-break:break-word">{{ $slot }}</p>
