@extends('layouts.app')
@section('content')
@php
$copy = [
    'ku' => ['scope' => 'Staf dalam unit Anda', 'tasks' => 'Prioritas pengisian', 'tasksHint' => 'Dikembalikan lebih dulu, lalu staf yang belum diisi.', 'tasksAll' => 'nilai', 'agenda' => ['nilai', 'Isi nilai staf'], 'table' => 'Status staf', 'tableHint' => 'Perlu tindakan di urutan teratas.', 'report' => 'riwayat', 'performance' => 'Indikator KPI terendah'],
    'kd' => ['scope' => 'Staf dan Kepala Unit dalam divisi Anda', 'tasks' => 'Tugas prioritas', 'tasksHint' => 'Kepala Unit yang belum dinilai, lalu pengajuan staf terlama.', 'tasksAll' => 'persetujuan', 'agenda' => ['persetujuan', 'Buka persetujuan'], 'table' => 'Progres per unit', 'tableHint' => 'Unit paling belum tuntas di urutan teratas.', 'report' => 'dashboard', 'performance' => 'Rerata Final per unit'],
    'hc' => ['scope' => 'Seluruh staf dan Kepala Unit', 'tasks' => 'Divisi perlu dipantau', 'tasksHint' => 'Divisi dengan penilaian belum Final terbanyak.', 'tasksAll' => 'rekap', 'agenda' => ['pengaturan', 'Kelola periode'], 'table' => 'Progres per divisi', 'tableHint' => 'Buka divisi untuk melihat unit di dalamnya.', 'report' => 'dashboard', 'performance' => 'Rerata Final per divisi'],
][$vm->role];
@endphp
<div class="page-content role-dashboard" data-role-dashboard="{{ $vm->role }}" data-state="loading" aria-busy="true">
    <header class="dashboard-heading">
        <div>
            <h2 class="lead">Ringkasan kinerja</h2>
            <p class="dashboard-caption"><span data-dashboard-month>{{ $vm->monthLabel() }}</span> · {{ $copy['scope'] }}</p>
        </div>
        <div class="dashboard-heading-actions">
            <button type="button" class="btn" data-dashboard-reload aria-label="Muat ulang ringkasan"><x-abprove.icon name="refresh"/><span>Muat ulang</span></button>
            <a class="btn btn-primary" href="{{ $vm->link($copy['report']) }}" data-dashboard-report>Laporan lengkap<x-abprove.icon name="chevron" class="-rotate-90"/></a>
        </div>
    </header>
    <p class="notice notice-error" data-dashboard-error role="alert" hidden>Ringkasan belum dapat dimuat. Periksa koneksi lalu pilih Muat ulang.</p>
    <p class="notice notice-warning" data-dashboard-empty hidden>Periode penilaian belum dibuat oleh Super HC. Ringkasan akan muncul setelah periode tersedia.</p>

    <section class="dashboard-cards" data-dashboard-cards aria-label="Indikator utama" aria-live="polite">
        @for($i = 0; $i < 4; $i++)<div class="dashboard-card" data-skeleton><span class="dashboard-card-label">Memuat…</span><strong class="dashboard-card-value">–</strong></div>@endfor
    </section>

    <div class="dashboard-row dashboard-row-status">
        <section class="dashboard-panel dashboard-completion" id="dashboard-completion" aria-labelledby="dashboard-completion-title">
            <div class="dashboard-panel-head">
                <div><h3 class="section-title" id="dashboard-completion-title">Ketuntasan penilaian</h3><p class="dashboard-caption" data-dashboard-completion-caption>Status seluruh subjek pada periode terpilih, termasuk yang belum dinilai.</p></div>
                <strong class="dashboard-completion-figure" data-dashboard-completion-figure>–</strong>
            </div>
            <div class="dashboard-stack" data-dashboard-stack role="img" aria-label="Memuat progres"></div>
            <ul class="dashboard-stack-legend" data-dashboard-stack-legend></ul>
        </section>
        <section class="dashboard-panel dashboard-agenda" aria-labelledby="dashboard-agenda-title">
            <div class="dashboard-panel-head"><h3 class="section-title" id="dashboard-agenda-title">Deadline berikutnya</h3><span class="dashboard-chip" data-dashboard-cycle-status>–</span></div>
            <div class="dashboard-deadline" data-dashboard-deadline aria-live="polite"><p class="dashboard-loading">Memuat jadwal…</p></div>
            <div class="dashboard-agenda-foot">
                <details class="dashboard-schedule-details">
                    <summary>Jadwal periode</summary>
                    <ol class="dashboard-schedule" data-dashboard-schedule aria-label="Jadwal periode (WIB)"></ol>
                </details>
                <a class="link dashboard-panel-link" href="{{ $vm->link($copy['agenda'][0]) }}" data-dashboard-agenda-action>{{ $copy['agenda'][1] }}</a>
            </div>
        </section>
    </div>

    <div class="dashboard-row dashboard-row-analytics">
        <section class="dashboard-panel dashboard-trend" aria-labelledby="dashboard-trend-title">
            <div class="dashboard-panel-head">
                <div><h3 class="section-title" id="dashboard-trend-title">Tren rerata nilai Final</h3><p class="dashboard-caption"><span class="dashboard-series" data-series="average">Rerata nilai Final</span> · 12 bulan · skala 0–100<span class="dashboard-chart-hint sr-only">. Pilih titik bulan untuk membuka ringkasan bulan tersebut.</span></p></div>
                <button type="button" class="link" data-dashboard-toggle="trend" aria-pressed="false" aria-controls="dashboard-trend-table" disabled>Data grafik</button>
            </div>
            <div class="dashboard-chart dashboard-chart-trend" data-dashboard-chart="trend"><p class="dashboard-loading">Memuat grafik…</p></div>
            <div class="table-wrap dashboard-chart-table" id="dashboard-trend-table" data-dashboard-table="trend" hidden></div>
        </section>
        <section class="dashboard-panel dashboard-performance" aria-labelledby="dashboard-performance-title">
            <div class="dashboard-panel-head">
                <div><h3 class="section-title" id="dashboard-performance-title" data-dashboard-performance-title>{{ $copy['performance'] }}</h3><p class="dashboard-caption" data-dashboard-performance-caption>Rerata nilai Final · skala 0–100</p></div>
                <button type="button" class="link" data-dashboard-toggle="performance" aria-pressed="false" aria-controls="dashboard-performance-table" disabled>Data grafik</button>
            </div>
            <div class="dashboard-chart dashboard-chart-performance" data-dashboard-chart="performance"><p class="dashboard-loading">Memuat grafik…</p></div>
            <div class="table-wrap dashboard-chart-table" id="dashboard-performance-table" data-dashboard-table="performance" hidden></div>
        </section>
        <section class="dashboard-panel dashboard-categories" aria-labelledby="dashboard-categories-title">
            <div class="dashboard-panel-head">
                <div><h3 class="section-title" id="dashboard-categories-title">Sebaran kategori</h3><p class="dashboard-caption">Hasil Final bulan terpilih</p></div>
                <button type="button" class="link" data-dashboard-toggle="categories" aria-pressed="false" aria-controls="dashboard-categories-table" disabled>Data grafik</button>
            </div>
            <div class="dashboard-donut-body">
                <div class="dashboard-donut">
                    <div class="dashboard-chart dashboard-chart-donut" data-dashboard-chart="categories"><p class="dashboard-loading">Memuat…</p></div>
                    <p class="dashboard-donut-center" data-dashboard-donut-center aria-hidden="true"></p>
                </div>
                <ul class="dashboard-category-legend" data-dashboard-category-legend></ul>
            </div>
            <div class="table-wrap dashboard-chart-table" id="dashboard-categories-table" data-dashboard-table="categories" hidden></div>
        </section>
    </div>

    <div class="dashboard-row dashboard-row-work">
        <div class="dashboard-column">
            <section class="dashboard-panel dashboard-progress" id="dashboard-progress" aria-labelledby="dashboard-progress-title">
                <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-progress-title">{{ $copy['table'] }}</h3><p class="dashboard-caption">{{ $copy['tableHint'] }}</p></div></div>
                <div class="table-wrap dashboard-progress-scroll" data-dashboard-progress role="region" tabindex="0" aria-labelledby="dashboard-progress-title"><p class="dashboard-loading">Memuat…</p></div>
            </section>
            @if($vm->role === 'hc')
            <section class="dashboard-panel dashboard-activities" aria-labelledby="dashboard-activities-title">
                <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-activities-title">Aktivitas terbaru</h3><p class="dashboard-caption">Perubahan terakhir di sistem · WIB</p></div><a class="link" href="{{ $vm->link('aktivitas') }}">Semua</a></div>
                <ol class="dashboard-activity-list" data-dashboard-activities tabindex="0" aria-labelledby="dashboard-activities-title"><li class="dashboard-loading">Memuat…</li></ol>
            </section>
            @endif
        </div>
        <div class="dashboard-column">
            <section class="dashboard-panel dashboard-tasks" aria-labelledby="dashboard-tasks-title">
                <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-tasks-title">{{ $copy['tasks'] }} <span class="dashboard-count" data-dashboard-task-count></span></h3><p class="dashboard-caption">{{ $copy['tasksHint'] }}</p></div><a class="link" href="{{ $vm->link($copy['tasksAll']) }}" data-dashboard-tasks-all>Semua</a></div>
                <ol class="dashboard-task-list" data-dashboard-tasks><li class="dashboard-loading">Memuat…</li></ol>
            </section>
            <section class="dashboard-panel dashboard-indicators" aria-labelledby="dashboard-indicators-title" data-panel-group>
                <div class="dashboard-panel-head">
                    <div><h3 class="section-title" id="dashboard-indicators-title">Indikator KPI</h3><p class="dashboard-caption">Rerata indikator dari hasil Final</p></div>
                    <a class="link" href="{{ $vm->link($copy['report']) }}" data-dashboard-indicators-all>Semua KPI</a>
                </div>
                <x-abprove.tabs :items="['lowest' => 'Perlu perhatian', 'highest' => 'Tertinggi']" label="Urutan indikator"/>
                <ol class="dashboard-indicator-list" data-panel="lowest" data-dashboard-indicators="lowest" tabindex="0" aria-label="Indikator perlu perhatian"><li class="dashboard-loading">Memuat…</li></ol>
                <ol class="dashboard-indicator-list" data-panel="highest" data-dashboard-indicators="highest" tabindex="0" aria-label="Indikator tertinggi" hidden></ol>
            </section>
        </div>
    </div>
</div>
@endsection
