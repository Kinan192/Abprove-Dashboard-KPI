@props(['id'=>'table-filters','title'=>'Filter data'])
<div id="{{ $id }}" data-table-filters class="table-filter-control" role="group" aria-label="{{ $title }}">
    {{ $slot }}
    <button type="button" class="btn btn-ghost table-filter-reset" data-table-filter-reset hidden><x-abprove.icon name="close"/>Reset filter<span class="table-filter-count" data-table-filter-count>0</span></button>
</div>
