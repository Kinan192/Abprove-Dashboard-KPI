@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4" data-flow-list>
    <div class="toolbar">
        <div class="flex flex-wrap items-center gap-2">
            @if($vm->role==='ku')<label class="flex items-center gap-2 text-xs text-muted">Urutan nilai<select class="field w-auto!" data-score-order aria-label="Urutan nilai"><option value="default">Urutan awal</option><option value="asc">Terendah dahulu</option><option value="desc">Tertinggi dahulu</option></select></label>@endif
        </div>
        <div class="flex flex-wrap gap-2">
            <button class="btn" type="button" data-dialog-open="export-dialog">Export Excel</button>
            @if($vm->role==='kd')<button class="btn btn-primary" type="button" data-flow-action="bulk-final">Finalkan pilihan <span data-selected-count>0</span></button>@endif
        </div>
    </div>
    @include('assessments.filters')
    <div class="card table-card">
        <div class="table-wrap"><table class="data-table"><thead><tr>
            @if($vm->role==='kd')<th><input type="checkbox" data-flow-select-all aria-label="Pilih semua pengajuan terlihat"></th>@endif
            <th>Nama / jenis</th><th>Unit / Divisi</th><th>Status</th><th class="numeric">Nilai</th><th>Kategori</th><th class="numeric">Tindakan</th>
        </tr></thead><tbody data-assessment-body></tbody></table></div>
        <div class="list-footer">
            <p class="text-muted" data-list-count></p>
            <p class="notice">{{ $vm->role==='hc'?'Rekap mencakup staf dan Kepala Unit. Keputusan nilai hanya pada Kepala Divisi.':($vm->role==='kd'?'Angka staf hanya dapat dibaca. Pengembalian membutuhkan alasan; persetujuan langsung menjadi Final.':'Pengisian belum dikirim tidak disimpan. Pembatalan pengajuan menghapus nilai setelah konfirmasi.') }}</p>
        </div>
    </div>
</div>
@include('assessments.review-dialog')
@endsection
