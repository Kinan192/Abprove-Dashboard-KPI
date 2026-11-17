@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4" data-flow-list>
    <div class="toolbar">
        <p class="max-w-[72ch] text-sm text-muted">{{ $vm->role==='hc'?'Rekap mencakup staf dan Kepala Unit. Keputusan nilai hanya pada Kepala Divisi.':($vm->role==='kd'?'Angka staf hanya dapat dibaca. Pengembalian membutuhkan alasan; persetujuan langsung menjadi Final.':'Pengisian belum dikirim tidak disimpan. Pembatalan pengajuan menghapus nilai setelah konfirmasi.') }}</p>
        <div class="flex flex-wrap gap-2">
            <button class="btn" type="button" data-dialog-open="export-dialog"><x-abprove.icon name="download"/>Export Excel</button>
            @if($vm->role==='kd')<button class="btn btn-primary" type="button" data-flow-action="bulk-final">Finalkan pilihan <span class="num" data-selected-count>0</span></button>@endif
        </div>
    </div>
    <section class="card table-card">
        <div class="card-toolbar">
            <div class="min-w-0">
                <h3 class="section-title">{{ $vm->role==='hc'?'Rekap penilaian':($vm->role==='kd'?'Pengajuan untuk ditinjau':'Pengajuan penilaian') }}</h3>
                <p class="mt-0.5 text-xs text-muted" data-list-count aria-live="polite"></p>
            </div>
            @include('assessments.filters')
        </div>
        <div class="table-wrap"><table class="data-table"><thead><tr>
            @if($vm->role==='kd')<th><input type="checkbox" data-flow-select-all aria-label="Pilih semua pengajuan terlihat"></th>@endif
            <th>Nama / jenis</th><th>Unit / Divisi</th><th>Status</th><th class="numeric">Nilai</th><th>Kategori</th><th class="numeric">Tindakan</th>
        </tr></thead><tbody data-assessment-body></tbody></table></div>
    </section>
</div>
@include('assessments.review-dialog')
@endsection
