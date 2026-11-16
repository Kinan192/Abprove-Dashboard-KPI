@extends('layouts.app')
@section('content')
@php($isDashboard=$vm->page==='dashboard')
@php($summaryFirst=$isDashboard || $vm->role!=='ku')
<div class="page-content page-stack reference-report analytics-v4 compact-workspace" data-reference-layout="report" data-insights-root data-panel-group data-default-panel="{{ $summaryFirst?'summary':'scores' }}">
@if($isDashboard)<div class="section-heading"><div><h2 class="lead">Laporan penilaian</h2><p class="text-xs text-muted">Analisis rinci sesuai cakupan dan bulan terpilih.</p></div><a class="btn" href="{{ $vm->link('dashboard') }}">Kembali ke Dashboard</a></div>@endif
<div class="reference-report-toolbar">@include('assessments.filters')<button class="btn" type="button" data-dialog-open="export-dialog"><x-abprove.icon name="download"/>Ekspor Excel</button></div>
<div class="toolbar"><x-abprove.tabs :items="$vm->role==='ku'?($isDashboard?['summary'=>'Ringkasan','scores'=>'Nilai karyawan','findings'=>'Temuan staf']:['scores'=>'Nilai karyawan','summary'=>'Tren unit','findings'=>'Temuan staf']):['summary'=>'Ringkasan','kpi'=>'Rata-rata KPI','units'=>'Status unit','results'=>'Peringkat & temuan','scores'=>'Nilai karyawan']" :active="$summaryFirst?'summary':'scores'" label="Bagian laporan"/><label class="reference-range" data-panel-context="kpi,scores" hidden>Rentang bulan<select class="field" data-report-range aria-label="Rentang matriks"></select></label></div>
<p class="notice notice-error" data-insights-error hidden role="alert"></p>
<section class="page-stack" data-panel="summary" @if(!$summaryFirst) hidden @endif>
@if($summaryFirst)<div class="reference-figures" data-reference-report-figures></div>@endif
<div class="{{ $vm->role==='ku'?'':'reference-trend-grid' }}"><section><h2 class="section-title mb-1">Tren rata-rata nilai Final <span data-reference-year></span></h2><p class="text-xs text-muted mb-3">Perubahan hasil Final antarbulan dalam cakupan Anda.</p><div class="card reference-chart" data-reference-trend></div></section>
@if($vm->role!=='ku')<section><h2 class="section-title mb-3">Rata-rata per unit, <span data-period-short></span></h2><div data-reference-unit-averages></div></section>@endif</div>
</section>
@if($vm->role!=='ku')
<section data-panel="kpi" hidden><div class="section-heading"><div><h2 class="section-title">Rata-rata nilai per KPI</h2><p class="text-xs text-muted mt-1">Skala 10–100, dari hasil Final pada filter ini.</p></div></div><div class="table-wrap"><table class="data-table reference-heat reference-kpi-heat"><thead data-reference-kpi-head></thead><tbody data-item-averages></tbody></table></div></section>
<section data-panel="units" hidden><h2 class="section-title mb-3">Status penilaian per unit</h2><div data-unit-status></div></section>
<section data-panel="results" hidden><div class="reference-pair"><section><div class="section-heading"><div><h2 class="section-title">Peringkat <span data-period-short></span></h2>@if($vm->role==='hc')<p class="text-xs text-muted mt-1">Peringkat dihitung per kelompok KPI.</p>@endif</div>@if($vm->role!=='hc')<select class="field reference-rank-filter" data-reference-rank-group aria-label="Kelompok peringkat"></select>@endif</div><div class="card" data-ranking-v4 data-rank-preview></div></section><section id="temuan"><h2 class="section-title mb-3">Temuan <span data-period-short></span></h2><p class="text-xs text-muted mb-3">Klik nama untuk membaca temuan lengkap.</p><div class="card reference-feed" data-staff-findings data-findings-preview></div></section></div></section>
@endif
<section id="nilai-karyawan" data-panel="scores" @if($summaryFirst) hidden @endif>
    <div class="section-heading flex-wrap">
        <div>
            <h2 class="section-title">Nilai per karyawan</h2>
            <p class="text-xs text-muted mt-1">Klik angka untuk melihat lembar nilai bulan itu. Hanya hasil Final.</p>
        </div>
        @if($vm->role!=='ku')
            <label class="reference-range">Urutkan rata-rata
                <select class="field" data-staff-score-order>
                    <option value="default">Urutan awal</option>
                    <option value="desc">Nilai tertinggi</option>
                    <option value="asc">Nilai terendah</option>
                </select>
            </label>
        @endif
    </div>
    <div class="table-wrap"><table class="data-table reference-heat reference-staff-heat"><thead data-matrix-head></thead><tbody data-matrix-body data-staff-scores></tbody></table></div>
</section>
@if($vm->role==='ku')<section id="temuan" data-panel="findings" hidden><h2 class="section-title mb-3">Temuan staf <span data-period-short></span></h2><p class="text-xs text-muted mb-3">Klik nama untuk membaca temuan lengkap.</p><div class="card reference-feed" data-staff-findings></div></section>@endif
</div>
@include('assessments.review-dialog')
@endsection
