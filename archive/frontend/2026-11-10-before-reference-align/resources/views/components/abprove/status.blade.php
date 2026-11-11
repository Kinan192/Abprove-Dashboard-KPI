@props(['value'=>'Belum'])
<span {{ $attributes->class(['status']) }} data-status="{{ $value }}">{{ $value==='Belum'?'Belum diisi':$value }}</span>
