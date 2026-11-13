@props(['id'=>'table-filter-dialog','title'=>'Filter data'])
<div data-table-filters class="table-filter-control">
    <button type="button" class="btn" data-dialog-open="{{ $id }}" aria-haspopup="dialog"><x-abprove.icon name="settings"/>Filter<span class="table-filter-count" data-table-filter-count hidden>0</span></button>
    <dialog id="{{ $id }}" data-dialog="{{ $id }}" class="modal-dialog table-filter-dialog" aria-labelledby="{{ $id }}-title">
        <div class="table-filter-shell">
            <header class="table-filter-header"><span class="table-filter-symbol"><x-abprove.icon name="settings"/></span><div><h2 id="{{ $id }}-title">{{ $title }}</h2><p>Tentukan cakupan dan kriteria data yang ingin dilihat.</p></div><button class="icon-button" type="button" data-dialog-close aria-label="Tutup {{ $title }}"><x-abprove.icon name="close"/></button></header>
            <div class="dialog-body table-filter-body"><div class="table-filter-fields">{{ $slot }}</div><section class="table-filter-summary" aria-label="Ringkasan filter"><div><strong>Filter aktif</strong><span data-table-filter-summary-count>Pengaturan awal</span></div><div class="table-filter-chips" data-table-filter-summary><p>Belum ada filter tambahan.</p></div></section></div>
            <footer class="dialog-footer table-filter-footer"><button type="button" class="btn btn-ghost" data-table-filter-reset>Reset filter</button><button type="button" class="btn btn-primary" data-dialog-close>Tampilkan hasil<x-abprove.icon name="chevron" class="-rotate-90"/></button></footer>
        </div>
    </dialog>
</div>
