@extends('layouts.app')
@section('content')
@php($isDashboard=$vm->page==='dashboard')
@php($defaultPanel=$vm->role==='ku'?'scores':'kpi')
@php($findingsNote='Bawaan: temuan negatif yang perlu tindak lanjut. Pilih Jenis temuan di Filter untuk Positif atau Semua; klik nama untuk membaca temuan lengkap.')
<div class="page-content page-stack reference-report analytics-v4 compact-workspace" data-reference-layout="report" data-insights-root data-panel-group data-default-panel="{{ $defaultPanel }}">
@if($isDashboard)<div class="section-heading mb-0!"><div><h2 class="lead">Laporan penilaian</h2><p class="text-xs text-muted">{{ ['hc'=>'Seluruh divisi dan unit','kd'=>'Unit dalam divisi Anda','ku'=>'Staf di unit Anda'][$vm->role] }} pada bulan terpilih.{{ $vm->role==='ku' ? '' : ' Ekspor dapat mencakup bulan, triwulan, semester atau tahun.' }}</p></div><a class="btn" href="{{ $vm->link('dashboard') }}">Kembali ke Dashboard</a></div>@endif
<div class="toolbar">
    <x-abprove.tabs :items="$vm->role==='ku'?['scores'=>'Nilai karyawan','findings'=>'Temuan staf']:['kpi'=>'Rata-rata KPI','units'=>'Status unit','results'=>'Peringkat & temuan','scores'=>'Nilai karyawan']" :active="$defaultPanel" label="Bagian laporan"/>
    <div class="reference-report-toolbar">
        @include('assessments.filters', ['reportControls' => true])
        <button class="btn" type="button" data-dialog-open="export-dialog"><x-abprove.icon name="download"/>{{ $vm->role==='ku' ? 'Ekspor Excel' : 'Ekspor data' }}</button>
    </div>
</div>
<p class="notice notice-error" data-insights-error hidden role="alert"></p>
@if($vm->role!=='ku')
<section class="card table-card" data-panel="kpi"><div class="card-toolbar"><div><h2 class="section-title">Rata-rata nilai per KPI</h2><p class="mt-0.5 text-xs text-muted">Rata-rata hasil Final per indikator (skala 10–100) sesuai filter dan rentang bulan.</p></div></div><div class="table-wrap"><table class="data-table reference-heat reference-kpi-heat"><thead data-reference-kpi-head></thead><tbody data-item-averages></tbody></table></div></section>
<section class="card" data-panel="units" hidden><div class="card-toolbar"><div><h2 class="section-title">Status penilaian per unit</h2><p class="mt-0.5 text-xs text-muted">Progres pengisian dan keputusan pada bulan terpilih.</p></div></div><div data-unit-status></div></section>
<section data-panel="results" hidden><div class="reference-pair">
    <section class="card"><div class="card-toolbar"><div><h2 class="section-title">Peringkat <span data-period-short></span></h2><p class="mt-0.5 text-xs text-muted" data-rank-note>Peringkat dihitung per kelompok KPI.</p></div></div><div data-ranking-v4 data-rank-preview></div></section>
    <section class="card" id="temuan"><div class="card-toolbar"><div><h2 class="section-title"><span data-findings-kind-title>Temuan negatif</span> <span data-period-short></span></h2><p class="mt-0.5 text-xs text-muted">{{ $findingsNote }}</p></div></div><div class="reference-feed" data-staff-findings data-findings-preview></div></section>
</div></section>
@endif
<section class="card table-card" id="nilai-karyawan" data-panel="scores" @if($defaultPanel!=='scores') hidden @endif>
    <div class="card-toolbar">
        <div>
            <h2 class="section-title">Nilai per karyawan</h2>
            <p class="mt-0.5 text-xs text-muted">Klik angka untuk melihat lembar nilai bulan itu. Hanya hasil Final.</p>
        </div>
    </div>
    <div class="table-wrap"><table class="data-table reference-heat reference-staff-heat"><thead data-matrix-head></thead><tbody data-matrix-body data-staff-scores></tbody></table></div>
</section>
@if($vm->role==='ku')<section class="card" id="temuan" data-panel="findings" hidden><div class="card-toolbar"><div><h2 class="section-title"><span data-findings-kind-title>Temuan negatif</span> staf <span data-period-short></span></h2><p class="mt-0.5 text-xs text-muted">{{ $findingsNote }}</p></div></div><div class="reference-feed" data-staff-findings></div></section>@endif
</div>
@include('assessments.review-dialog')
@endsection
