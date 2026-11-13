@extends('layouts.app')
@section('content')
<div class="page-content role-dashboard dashboard-workspace" data-role-dashboard="{{ $vm->role }}" data-dashboard-layout="overview-v2" data-insights-root>
    <div class="dashboard-heading">
        <div><h2 class="lead">Ringkasan kinerja</h2><p class="dashboard-caption" data-dashboard-headline>{{ $homeHeadline ?? 'Penilaian dalam cakupan Anda pada bulan terpilih.' }}</p></div>
        <a class="btn btn-primary" href="{{ $vm->link($vm->role==='ku'?'riwayat':'dashboard') }}" data-dashboard-report>Laporan lengkap<x-abprove.icon name="chevron" class="-rotate-90"/></a>
    </div>
    <div class="notice notice-error" data-insights-error hidden role="alert"></div>
    <button type="button" class="btn" data-dashboard-reload hidden>Coba muat ulang</button>
    <div class="dashboard-metrics" data-dashboard-metrics aria-live="polite"><p class="dashboard-caption">Memuat ringkasan...</p></div>

    <div class="dashboard-overview">
        <section class="dashboard-trend-panel" data-dashboard-chart="trend">
            <div class="dashboard-section-head">
                <div><h3 class="section-title">Tren kinerja</h3><div class="dashboard-trend-summary"><strong data-dashboard-average>-</strong><span data-dashboard-delta>Rata-rata nilai Final</span></div></div>
                <div class="dashboard-chart-context"><span class="dashboard-series-key">Nilai Final</span><span class="dashboard-caption"><span data-dashboard-year>{{ $vm->data['year'] ?? date('Y') }}</span> · <span data-dashboard-scale>Skala 0–100</span></span></div>
            </div>
            <div class="dashboard-line-chart" data-dashboard-trend aria-busy="true"><p class="dashboard-loading">Memuat grafik nilai Final...</p></div>
            <div class="dashboard-chart-footer"><p class="dashboard-chart-detail" data-dashboard-trend-detail aria-live="polite">Pilih titik untuk membuka bulan tersebut.</p><button type="button" class="link" data-dashboard-data="trend" data-dialog-open="dashboard-data-dialog" disabled>Data grafik</button></div>
        </section>
        <div class="dashboard-aside">
        <section class="dashboard-category-panel" data-dashboard-chart="categories">
            <div class="dashboard-section-head"><h3 class="section-title">Sebaran kategori nilai</h3><button type="button" class="link" data-dashboard-data="categories" data-dialog-open="dashboard-data-dialog" disabled>Data grafik</button></div>
            <div class="dashboard-category-body"><div class="dashboard-category-chart" data-dashboard-categories aria-busy="true"><p class="dashboard-caption">Memuat...</p></div><div class="dashboard-category-legend" data-dashboard-category-legend></div></div>
            <p class="dashboard-caption">Kategori dari hasil Final bulan terpilih.</p>
        </section>
        <aside class="dashboard-agenda" aria-label="Agenda penilaian">
            <div class="dashboard-section-head"><h3 class="section-title">Agenda penilaian</h3><span class="dashboard-cycle-status" data-dashboard-cycle-status>Memuat...</span></div>
            <p class="dashboard-agenda-month" data-dashboard-cycle-month>{{ $vm->monthLabel() }}</p>
            <p class="dashboard-next-deadline" data-dashboard-next-deadline>Memuat jadwal...</p>
            <div class="dashboard-agenda-footer"><button class="link" type="button" data-dialog-open="dashboard-agenda-dialog">Semua jadwal</button><a class="link" data-dashboard-agenda-action href="{{ $vm->link(['ku'=>'nilai','kd'=>'nilai-kepala','hc'=>'pengaturan'][$vm->role]) }}">{{ ['ku'=>'Isi nilai staf','kd'=>'Nilai Kepala Unit','hc'=>'Kelola periode'][$vm->role] }}</a></div>
        </aside>
        </div>
    </div>

    <div class="dashboard-details">
        <section class="dashboard-comparison-panel" data-dashboard-chart="comparison">
            <div class="dashboard-section-head"><div><h3 class="section-title">{{ ['ku'=>'Nilai per indikator KPI','kd'=>'Progres per unit','hc'=>'Ketuntasan penilaian bulanan'][$vm->role] }}</h3><p class="dashboard-caption">{{ ['ku'=>'Nilai terendah lebih dulu · hasil Final','kd'=>'Status bulan terpilih · paling belum tuntas lebih dulu','hc'=>'Persentase hasil Final terhadap subjek tiap bulan'][$vm->role] }}</p></div><button type="button" class="link" data-dashboard-data="comparison" data-dialog-open="dashboard-data-dialog" disabled>Data grafik</button></div>
            <div class="dashboard-bar-chart" data-dashboard-comparison data-chart-kind="{{ ['ku'=>'kpi','kd'=>'unit','hc'=>'completion'][$vm->role] }}" aria-busy="true"><p class="dashboard-loading">Memuat grafik...</p></div>
            <div class="dashboard-legend" data-dashboard-legend></div>
            <nav class="dashboard-chart-paging" aria-label="Halaman grafik" data-dashboard-paging hidden><span data-dashboard-page-summary></span><div><button type="button" class="pagination-button" data-dashboard-prev aria-label="Grafik sebelumnya"><x-abprove.icon name="chevron" class="rotate-90"/></button><span data-dashboard-page-label></span><button type="button" class="pagination-button" data-dashboard-next aria-label="Grafik berikutnya"><x-abprove.icon name="chevron" class="-rotate-90"/></button></div></nav>
        </section>
        <section class="dashboard-followup">
            <div class="dashboard-section-head"><h3 class="section-title">{{ ['ku'=>'Prioritas pengisian','kd'=>'Menunggu persetujuan','hc'=>'Aktivitas terbaru'][$vm->role] }}</h3><a class="link" href="{{ $vm->link(['ku'=>'nilai','kd'=>'persetujuan','hc'=>'aktivitas'][$vm->role]) }}" data-dashboard-all>Semua</a></div>
            <p class="dashboard-caption">{{ ['ku'=>'Dikembalikan, lalu belum diisi','kd'=>'Pengajuan staf yang perlu ditinjau','hc'=>'Jejak perubahan dalam sistem'][$vm->role] }}</p>
            <div class="dashboard-task-list" data-dashboard-tasks><p class="dashboard-caption">Memuat...</p></div>
        </section>
        @if($vm->role==='hc')
        <section class="dashboard-findings-panel dashboard-priority-panel" data-dashboard-chart="low-kpi">
            <div class="dashboard-section-head"><h3 class="section-title">KPI perlu perhatian</h3><button type="button" class="link" data-dashboard-data="low-kpi" data-dialog-open="dashboard-data-dialog" disabled>Data grafik</button></div>
            <p class="dashboard-caption">Lima indikator dengan rata-rata Final terendah</p>
            <div class="dashboard-bar-chart" data-dashboard-low-kpi aria-busy="true"><p class="dashboard-loading">Memuat grafik...</p></div>
            <p class="dashboard-caption">Klik batang untuk melihat nilai dan cakupannya.</p>
        </section>
        @else
        <section class="dashboard-findings-panel">
            <div class="dashboard-section-head"><h3 class="section-title">Temuan staf</h3><a class="link" href="{{ $vm->link($vm->role==='ku'?'riwayat':'dashboard') }}" data-dashboard-findings-all>Semua</a></div>
            <p class="dashboard-caption">Catatan dari penilaian Final</p>
            <div class="dashboard-findings" data-dashboard-findings><p class="dashboard-caption">Memuat...</p></div>
        </section>
        @endif
    </div>
</div>
@push('dialogs')
<x-abprove.dialog id="dashboard-data-dialog" title="Data grafik"><div class="table-wrap" data-dashboard-data-table></div><x-slot:footer><button type="button" class="btn" data-dialog-close>Tutup</button></x-slot:footer></x-abprove.dialog>
<x-abprove.dialog id="dashboard-agenda-dialog" title="Jadwal penilaian"><ol class="dashboard-deadlines" data-dashboard-deadlines></ol><p class="text-xs text-muted">Seluruh jadwal menggunakan WIB.</p><x-slot:footer><button type="button" class="btn" data-dialog-close>Tutup</button></x-slot:footer></x-abprove.dialog>
@endpush
@endsection
