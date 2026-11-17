<div class="table-tools">
<input class="field" data-filter="search" type="search" placeholder="Cari nama atau NIP" aria-label="Cari nama atau NIP">
@php($reportControls = $reportControls ?? false)
<x-abprove.table-filters id="filter-dialog" :title="$reportControls ? 'Filter laporan' : 'Filter penilaian'">
@if($vm->role==='hc')<label>Divisi<select class="field" data-filter="division" aria-label="Filter divisi"><option value="">Semua divisi</option></select></label>@endif
@if($vm->role!=='ku')<label>Unit<select class="field" data-filter="unit" aria-label="Filter unit"><option value="">Semua unit</option></select></label><label>Jenis penilaian<select class="field" data-filter="type" data-filter-default="{{ $vm->page==='persetujuan'?'member':'' }}" aria-label="Jenis penilaian"><option value="">Staf & Kepala Unit</option><option value="member" @selected($vm->page==='persetujuan')>Staf</option><option value="unit_head">Kepala Unit</option></select></label>@endif
@if(in_array($vm->page,['rekap','persetujuan','pengajuan']))
<label>Status penilaian<select class="field" data-flow-status-select data-filter-default="{{ $vm->role==='kd'?'Diajukan':'all' }}" aria-label="Status penilaian">@foreach(['all'=>'Semua status','Belum'=>'Belum diisi','Diajukan'=>'Diajukan','Dikembalikan'=>'Dikembalikan','Final'=>'Final'] as $key=>$label)<option value="{{ $key }}" @selected(($vm->role==='kd'&&$key==='Diajukan')||($vm->role!=='kd'&&$key==='all'))>{{ $label }}</option>@endforeach</select></label>
@endif
@if($vm->role==='ku'&&$vm->page==='riwayat')<label>Kelompok KPI<select class="field" data-filter="template" aria-label="Filter kelompok KPI"><option value="">Semua kelompok KPI</option></select></label>@endif
@if($reportControls)
<label data-report-control="{{ $vm->role==='ku'?'scores':'kpi,scores' }}" data-report-control-label="{{ $vm->role==='ku'?'Nilai karyawan':'Rata-rata KPI dan Nilai karyawan' }}">Rentang bulan<select class="field" data-report-range aria-label="Rentang bulan tabel laporan"></select><small class="reference-filter-hint" data-report-control-hint></small></label>
@if($vm->role!=='ku')<label data-report-control="scores" data-report-control-label="Nilai karyawan">Urutkan rata-rata<select class="field" data-staff-score-order aria-label="Urutkan rata-rata nilai karyawan"><option value="default">Urutan awal</option><option value="desc">Nilai tertinggi</option><option value="asc">Nilai terendah</option></select><small class="reference-filter-hint" data-report-control-hint></small></label>@endif
<label data-report-control="{{ $vm->role==='ku'?'findings':'results' }}" data-report-control-label="{{ $vm->role==='ku'?'Temuan staf':'Peringkat & temuan' }}">Jenis temuan<select class="field" data-report-findings data-filter-default="negative" aria-label="Jenis temuan yang ditampilkan"><option value="negative" selected>Negatif (perlu tindak lanjut)</option><option value="positive">Positif</option><option value="all">Semua (negatif dahulu)</option></select><small class="reference-filter-hint" data-report-control-hint></small></label>
@endif
</x-abprove.table-filters>
@if($vm->role==='ku'&&$vm->page==='pengajuan')<label class="inline-filter"><span>Urutan nilai</span><select class="field" data-score-order aria-label="Urutan nilai"><option value="default">Urutan awal</option><option value="asc">Terendah dahulu</option><option value="desc">Tertinggi dahulu</option></select></label>@endif
</div>
