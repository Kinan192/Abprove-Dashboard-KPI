@props(['large'=>false])
<span {{ $attributes->class(['brand flex items-center gap-3']) }}>
    <img src="{{ Vite::asset('resources/images/abprove-mark.svg') }}" alt="" class="{{ $large?'size-14 rounded-card':'size-9 rounded-control' }} shrink-0 shadow-[0_1px_2px_rgb(23_43_54/0.08)] ring-1 ring-line">
    <span class="brand-copy"><span class="inline-flex items-baseline font-brand font-extrabold tracking-[-.035em] {{ $large?'text-[30px]':'text-[24px]' }} text-brand">AB<span class="font-semibold text-ink">pro</span><svg class="mx-px h-[.52em] w-[.56em]" viewBox="0 0 24 22" aria-hidden="true"><path d="M2.5 11 L9 19 L21.5 2.5" fill="none" stroke="#DC2626" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="font-semibold text-ink">e</span></span><span class="mt-0.5 block text-[11.5px] font-medium text-muted">RS Awal Bros Botania</span></span>
</span>
