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
