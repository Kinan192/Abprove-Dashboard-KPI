<div class="table-tools">
<x-abprove.table-filters id="filter-dialog" title="Filter penilaian">
@if($vm->role==='hc')<label>Divisi<select class="field" data-filter="division" aria-label="Filter divisi"><option value="">Semua divisi</option></select></label>@endif
@if($vm->role!=='ku')<label>Unit<select class="field" data-filter="unit" aria-label="Filter unit"><option value="">Semua unit</option></select></label><label>Jenis penilaian<select class="field" data-filter="type" data-filter-default="{{ $vm->page==='persetujuan'?'member':'' }}" aria-label="Jenis penilaian"><option value="">Staf & Kepala Unit</option><option value="member" @selected($vm->page==='persetujuan')>Staf</option><option value="unit_head">Kepala Unit</option></select></label>@endif
@if(in_array($vm->page,['rekap','persetujuan','pengajuan']))
<label>Status penilaian<select class="field" data-flow-status-select data-filter-default="{{ $vm->role==='kd'?'Diajukan':'all' }}" aria-label="Status penilaian">@foreach(['all'=>'Semua status','Belum'=>'Belum diisi','Diajukan'=>'Diajukan','Dikembalikan'=>'Dikembalikan','Final'=>'Final'] as $key=>$label)<option value="{{ $key }}" @selected(($vm->role==='kd'&&$key==='Diajukan')||($vm->role!=='kd'&&$key==='all'))>{{ $label }}</option>@endforeach</select></label>
@endif
@if($vm->role==='ku'&&$vm->page==='riwayat')<label>Kelompok KPI<select class="field" data-filter="template" aria-label="Filter kelompok KPI"><option value="">Semua kelompok KPI</option></select></label>@endif
</x-abprove.table-filters>
<input class="field" data-filter="search" type="search" placeholder="Cari nama atau NIP" aria-label="Cari nama atau NIP">
</div>
