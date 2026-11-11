@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4 analytics-v4" data-insights-root data-panel-group data-default-panel="{{ $vm->role==='ku'?'scores':'summary' }}">
    @include('v2.filters')
    <div class="toolbar"><div class="seg section-tabs" role="tablist" aria-label="Tampilan hasil penilaian">
    @foreach(['summary'=>'Ringkasan','scores'=>'Nilai per karyawan','rank'=>'Peringkat','findings'=>'Temuan staf','history'=>'Matriks bulanan'] as $key=>$label)<button type="button" data-panel-tab="{{ $key }}" role="tab" aria-selected="false">{{ $label }}</button>@endforeach</div><div class="flex flex-wrap gap-2"><select class="field w-auto!" data-filter="template" aria-label="Filter kelompok KPI"><option value="">Semua kelompok KPI</option></select><button class="btn" type="button" data-dialog-open="export-dialog">Ekspor Excel</button></div></div>
    <p class="text-xs text-muted">Hasil Final untuk <strong data-period-label></strong>. Klik nilai atau nama untuk melihat rincian dan temuan.</p>
    <p class="notice notice-error" data-insights-error role="alert" hidden></p>
    <section class="page-stack" data-panel="summary">
        <div class="card metric-grid">@foreach(['average'=>'Rata-rata nilai Final','final'=>'Penilaian Final','submitted'=>'Menunggu persetujuan','returned'=>'Dikembalikan'] as $key=>$label)<div><p class="text-xs text-muted">{{ $label }}</p><p class="metric-number mt-1" data-insight-metric="{{ $key }}">-</p></div>@endforeach</div>
        <div class="report-grid">
            <section class="card widget"><h2 class="section-title mb-3">Rata-rata nilai per KPI</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Indikator / cakupan</th><th class="numeric">Rata-rata</th><th class="numeric">Bobot</th></tr></thead><tbody data-item-averages></tbody></table></div></section>
            <section class="card widget"><h2 class="section-title mb-3">Status penilaian per unit</h2><div data-unit-status></div></section>
            <section class="card widget"><div class="section-heading"><h2 class="section-title">Peringkat <span data-period-short></span></h2><button class="link" type="button" data-panel-tab="rank">Lihat semua</button></div><div data-rank-preview></div></section>
            <section class="card widget"><div class="section-heading"><h2 class="section-title">Temuan <span data-period-short></span></h2><button class="link" type="button" data-panel-tab="findings">Lihat semua</button></div><div data-findings-preview></div></section>
        </div>
    </section>
    <section data-panel="scores" hidden><div class="section-heading"><h2 class="section-title">Nilai per karyawan <span data-period-short></span></h2><span class="text-xs text-muted">10 baris per halaman</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama / jenis</th><th>Unit</th><th class="numeric">Nilai</th><th>Kategori</th><th>Temuan staf</th><th>Tindakan</th></tr></thead><tbody data-staff-scores></tbody></table></div></section>
    <section data-panel="rank" hidden><p class="text-xs text-muted mb-3">Peringkat dipisahkan menurut indikator yang sama agar perbandingan adil.</p><div data-ranking-v4 class="page-stack"></div></section>
    <section data-panel="findings" hidden><div class="section-heading"><h2 class="section-title">Temuan staf <span data-period-short></span></h2><span class="text-xs text-muted">10 baris per halaman</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nama / unit</th><th>Temuan positif</th><th>Perlu ditingkatkan</th><th>Tindakan</th></tr></thead><tbody data-staff-findings></tbody></table></div></section>
    <section data-panel="history" hidden><div class="toolbar mb-3"><h2 class="section-title">Matriks nilai per karyawan</h2><select class="field w-auto!" data-matrix-quarter aria-label="Rentang bulan"><option value="0">Januari - Maret</option><option value="1">April - Juni</option><option value="2">Juli - September</option><option value="3">Oktober - Desember</option></select></div><div class="table-wrap"><table class="data-table"><thead data-matrix-head></thead><tbody data-matrix-body></tbody></table></div></section>
</div>@include('v2.review-dialog')
@endsection
