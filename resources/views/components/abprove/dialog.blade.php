@props(['id','title','drawer'=>false,'narrow'=>false])
<dialog id="{{ $id }}" data-dialog="{{ $id }}" class="{{ $drawer?'drawer-dialog':'modal-dialog' }} {{ $narrow?'narrow':'' }}" aria-labelledby="{{ $id }}-title">
    <div class="flex {{ $drawer?'h-full':'max-h-[calc(100dvh-32px)]' }} flex-col"><div class="dialog-header"><h2 id="{{ $id }}-title" class="dialog-title">{{ $title }}</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup {{ $title }}"><x-abprove.icon name="close"/></button></div><div class="dialog-body">{{ $slot }}</div>@isset($footer)<div class="dialog-footer">{{ $footer }}</div>@endisset</div>
</dialog>
