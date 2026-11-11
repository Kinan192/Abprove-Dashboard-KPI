@props(['light'=>false,'large'=>false])
<span {{ $attributes->class(['brand flex items-center gap-3']) }}>
    <img src="{{ Vite::asset('resources/images/abprove-mark.svg') }}" alt="" class="{{ $large?'size-14':'size-9' }} shrink-0 rounded-lg">
    <span class="brand-copy"><span class="inline-flex items-baseline font-brand font-extrabold tracking-[-.035em] {{ $large?'text-[30px]':'text-[24px]' }} {{ $light?'text-white':'text-brand' }}">AB<span class="font-semibold {{ $light?'text-[#D1EADF]':'text-ink' }}">pro</span><svg class="mx-px h-[.52em] w-[.56em]" viewBox="0 0 24 22" aria-hidden="true"><path d="M2.5 11 L9 19 L21.5 2.5" fill="none" stroke="{{ $light?'#FF6B6B':'#DC2626' }}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="font-semibold {{ $light?'text-[#D1EADF]':'text-ink' }}">e</span></span><span class="mt-1 block text-[11.5px] {{ $light?'text-[#BDD8CD]':'text-muted' }}">RS Awal Bros Botania</span></span>
</span>
