@props(['id','title','narrow'=>false])
<dialog id="{{ $id }}" data-dialog="{{ $id }}" class="modal-dialog{{ $narrow?' narrow':'' }}" aria-labelledby="{{ $id }}-title">
    <div class="dialog-shell"><div class="dialog-header"><h2 id="{{ $id }}-title" class="dialog-title">{{ $title }}</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup {{ $title }}"><x-abprove.icon name="close"/></button></div><div class="dialog-body">{{ $slot }}</div>@isset($footer)<div class="dialog-footer">{{ $footer }}</div>@endisset</div>
</dialog>
