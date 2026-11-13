<template id="flow-pagination">
    <nav class="list-pagination">
        <span data-page-summary aria-live="polite"></span>
        <label class="table-page-size" data-page-size-wrap hidden>Baris per halaman<select class="field" data-page-size aria-label="Baris per halaman"><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
        <div class="flex items-center gap-2">
            <button class="pagination-button" type="button" data-page-prev aria-label="Halaman sebelumnya"><x-abprove.icon name="chevron" class="rotate-90"/></button>
            <span class="min-w-12 text-center text-xs num" data-page-label></span>
            <button class="pagination-button" type="button" data-page-next aria-label="Halaman berikutnya"><x-abprove.icon name="chevron" class="-rotate-90"/></button>
        </div>
    </nav>
</template>
<x-abprove.dialog id="record-detail-dialog" title="Rincian data"><dl data-record-detail class="record-detail"></dl><x-slot:footer><button class="btn" type="button" data-dialog-close>Tutup</button><button class="btn btn-primary" type="button" data-detail-edit hidden>Ubah data</button></x-slot:footer></x-abprove.dialog>
<dialog id="entity-actions-dialog" class="menu-dialog" aria-label="Tindakan data"><p class="px-3 py-2 text-xs font-semibold" data-actions-name></p><div data-entity-actions></div><p class="px-3 py-2 text-xs leading-5 text-muted" data-actions-note></p></dialog>
