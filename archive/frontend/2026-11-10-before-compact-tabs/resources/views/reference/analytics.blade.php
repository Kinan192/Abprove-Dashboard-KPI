@extends('layouts.app')
@section('content')
<div class="page-content page-stack reference-report analytics-v4" data-reference-layout="report" data-insights-root>
    <div class="reference-report-toolbar">@include('v2.filters')<select class="field" data-filter="template" aria-label="Filter kelompok KPI"><option value="">Semua kelompok KPI</option></select><button class="btn" type="button" data-dialog-open="export-dialog"><x-abprove.icon name="download"/>Ekspor Excel</button></div>
    <p class="notice notice-error" data-insights-error hidden role="alert"></p>
    @if($vm->role!=='ku')<div class="card reference-figures" data-reference-report-figures></div>@endif
    <div class="{{ $vm->role==='ku'?'':'reference-trend-grid' }}">
        <section><h2 class="section-title mb-3">{{ $vm->role==='ku'?'Tren rata-rata nilai unit':'Tren rata-rata nilai' }} <span data-reference-year></span></h2><div class="card reference-chart" data-reference-trend></div></section>
        @if($vm->role!=='ku')<section><h2 class="section-title mb-3">Rata-rata per unit, <span data-period-short></span></h2><div data-reference-unit-averages></div></section>@endif
    </div>
    @if($vm->role!=='ku')
        <section><div class="section-heading"><div><h2 class="section-title">Rata-rata nilai per KPI</h2><p class="text-xs text-muted mt-1">Skala 10–100, dari hasil Final pada filter ini.</p></div><label class="reference-range">Rentang bulan<select class="field" data-report-range aria-label="Rentang matriks KPI"></select></label></div><div class="table-wrap"><table class="data-table reference-heat reference-kpi-heat"><thead data-reference-kpi-head></thead><tbody data-item-averages></tbody></table></div></section>
        <section><h2 class="section-title mb-3">Status penilaian per unit</h2><div data-unit-status></div></section>
        <div class="reference-pair"><section><div class="section-heading"><h2 class="section-title">Peringkat <span data-period-short></span></h2><select class="field reference-rank-filter" data-reference-rank-group aria-label="Kelompok peringkat"></select></div><div class="card" data-ranking-v4 data-rank-preview></div></section><section id="temuan"><h2 class="section-title mb-3">Temuan <span data-period-short></span></h2><div class="card reference-feed" data-staff-findings data-findings-preview></div></section></div>
    @endif
    <section id="nilai-karyawan"><div class="section-heading"><div><h2 class="section-title">Nilai per karyawan</h2><p class="text-xs text-muted mt-1">Klik angka untuk melihat lembar nilai bulan itu. Hanya hasil Final.</p></div>@if($vm->role==='ku')<label class="reference-range">Rentang bulan<select class="field" data-report-range aria-label="Rentang matriks karyawan"></select></label>@endif</div><div class="table-wrap"><table class="data-table reference-heat reference-staff-heat"><thead data-matrix-head></thead><tbody data-matrix-body data-staff-scores></tbody></table></div></section>
    @if($vm->role==='ku')<section id="temuan"><h2 class="section-title mb-3">Temuan staf <span data-period-short></span></h2><div class="card reference-feed" data-staff-findings></div></section>@endif
</div>
@include('v2.review-dialog')
@endsection
