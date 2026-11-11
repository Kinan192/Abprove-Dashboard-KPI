@props(['value'=>'Belum'])
<span {{ $attributes->class(['status','assessment-status']) }} data-status="{{ $value }}">{{ $value==='Belum'?'Belum diisi':$value }}</span>
