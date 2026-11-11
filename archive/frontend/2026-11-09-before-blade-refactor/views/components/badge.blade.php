@props(['value' => 'row.status'])
<span {{ $attributes->class(['badge']) }} :class="'badge-' + ({{ $value }} || 'not_started')" x-text="$store.ui.status({{ $value }})"></span>
