@extends('layouts.app')
@section('content')
@php
$ku = $vm->role === 'ku';
$copy = [
    'ku' => ['scope' => 'Staf dalam unit Anda', 'agenda' => ['nilai', 'Isi nilai staf'], 'report' => 'riwayat'],
    'kd' => ['scope' => 'Staf dan Kepala Unit dalam divisi Anda', 'tasks' => 'Tugas prioritas', 'tasksHint' => 'Kepala Unit yang belum dinilai, lalu pengajuan staf terlama.', 'tasksAll' => 'persetujuan', 'agenda' => ['persetujuan', 'Buka persetujuan'], 'table' => 'Progres per unit', 'tableHint' => 'Unit paling belum tuntas di urutan teratas.', 'report' => 'dashboard'],
    'hc' => ['scope' => 'Seluruh staf dan Kepala Unit', 'tasks' => 'Divisi perlu dipantau', 'tasksHint' => 'Divisi dengan penilaian belum Final terbanyak.', 'tasksAll' => 'rekap', 'agenda' => ['pengaturan', 'Kelola periode'], 'table' => 'Progres per divisi', 'tableHint' => 'Buka divisi untuk melihat unit di dalamnya.', 'report' => 'dashboard'],
][$vm->role];
$insights = ['tasks' => 'Prioritas', 'indicators' => 'KPI'] + ($vm->role === 'hc' ? ['activities' => 'Aktivitas'] : []);
/* Panels in reading order; role-dashboard.css places them on explicit grid rows.
   KU: one row (agenda with the fill action, categories, KPI); staff work lives on
   Isi nilai and Anggota Unit. KD/HC: a 2×2 grid, categories and agenda above the
   area progress table beside the tabbed highlights. */
$sections = $ku ? ['agenda', 'categories', 'indicators'] : ['categories', 'agenda', 'progress', 'indicators'];
@endphp
<div class="page-content role-dashboard" data-role-dashboard="{{ $vm->role }}" data-state="loading" aria-busy="true">
    <header class="dashboard-heading">
        <div class="min-w-0">
            <h2 class="lead">{{ $vm->greeting() }}</h2>
            <p class="dashboard-caption">Ringkasan kinerja <span data-dashboard-month>{{ $vm->monthLabel() }}</span> · {{ $copy['scope'] }}</p>
        </div>
        <div class="dashboard-heading-actions">
            {{-- Role deadline countdown (dashboard.js), refreshed every minute. --}}
            <p class="dashboard-due" data-dashboard-due hidden></p>
            <button type="button" class="btn" data-dashboard-reload aria-label="Muat ulang ringkasan"><x-abprove.icon name="refresh"/><span>Muat ulang</span></button>
            <a @class(['btn', 'btn-primary' => ! $ku]) href="{{ $vm->link($copy['report']) }}" data-dashboard-report>Laporan lengkap<x-abprove.icon name="chevron" class="-rotate-90"/></a>
        </div>
    </header>
    <p class="notice notice-error" data-dashboard-error role="alert" hidden>Ringkasan belum dapat dimuat. Periksa koneksi lalu pilih Muat ulang.</p>
    <p class="notice notice-warning" data-dashboard-empty hidden>Periode penilaian belum dibuat oleh Super HC. Ringkasan akan muncul setelah periode tersedia.</p>
    {{-- Rule-based attention banner: open work for this role plus the nearest relevant deadline. --}}
    <div class="dashboard-alert" data-dashboard-alert role="status" hidden></div>

    <section class="dashboard-cards" data-dashboard-cards aria-label="Indikator utama" aria-live="polite">
        <div class="dashboard-card dashboard-hero" data-skeleton><span class="dashboard-card-label">Memuat…</span><strong class="dashboard-card-value">–</strong><span class="dashboard-card-hint">&nbsp;</span></div>
        @foreach(['mint', 'sky', 'lilac', 'amber'] as $tone)<div class="dashboard-card" data-tone="{{ $tone }}" data-skeleton><span class="dashboard-card-label">Memuat…</span><strong class="dashboard-card-value">–</strong><span class="dashboard-card-hint">&nbsp;</span></div>@endforeach
    </section>

    <div class="dashboard-layout">
        @foreach($sections as $section)
            @switch($section)
            @case('categories')
            {{-- Final distribution: score-range histogram by default, the category doughnut as the alternative view.
                 dashboard.js draws only the visible view's chart and remembers the chosen view. --}}
            <section class="dashboard-panel dashboard-distribution" id="dashboard-categories" aria-labelledby="dashboard-categories-title" data-panel-group>
                <div class="dashboard-panel-head">
                    <div><h3 class="section-title" id="dashboard-categories-title">Distribusi nilai Final</h3></div>
                    <a class="link" href="{{ $vm->link($copy['report']) }}" data-dashboard-categories-report>Nilai per karyawan</a>
                </div>
                <nav class="seg dashboard-distribution-tabs" role="tablist" aria-label="Tampilan distribusi nilai Final">
                    <button type="button" role="tab" data-panel-tab="histogram" aria-selected="true" tabindex="0" class="active">Rentang nilai</button>
                    <button type="button" role="tab" data-panel-tab="categories" aria-selected="false" tabindex="-1">Kategori</button>
                </nav>
                <div class="dashboard-distribution-view" data-panel="histogram">
                    <p class="dashboard-caption" data-dashboard-histogram-caption>Memuat…</p>
                    <div class="dashboard-chart dashboard-histogram" data-dashboard-chart="histogram" data-kind="bar" hidden></div>
                    <p class="dashboard-empty" data-dashboard-histogram-empty hidden></p>
                    <details class="dashboard-disclosure dashboard-histogram-data" hidden>
                        <summary>Data histogram</summary>
                        <div class="table-wrap dashboard-histogram-table" role="region" tabindex="0" aria-label="Jumlah hasil Final per rentang nilai">
                            <table class="data-table">
                                <thead><tr><th scope="col">Rentang nilai</th><th scope="col">Jumlah</th></tr></thead>
                                <tbody data-dashboard-histogram-rows></tbody>
                            </table>
                        </div>
                    </details>
                </div>
                <div class="dashboard-distribution-view" data-panel="categories" hidden>
                    <p class="dashboard-caption" data-dashboard-categories-caption>Persentase dari jumlah hasil Final periode ini.</p>
                    <div class="dashboard-status">
                        <div class="dashboard-donut" data-dashboard-donut data-empty="true">
                            <div class="dashboard-chart" data-dashboard-chart="categories" data-kind="doughnut" hidden></div>
                            <p class="dashboard-donut-center" aria-hidden="true"><strong data-dashboard-category-figure>–</strong><span data-dashboard-category-sub>hasil Final</span></p>
                        </div>
                        <ul class="dashboard-stack-legend" data-dashboard-category-legend tabindex="0" aria-label="Jumlah hasil Final per kategori, persentasenya dari seluruh hasil Final, dan rerata nilainya"></ul>
                    </div>
                </div>
            </section>
            @break
            @case('progress')
            <section class="dashboard-panel dashboard-progress" id="dashboard-progress" aria-labelledby="dashboard-progress-title">
                <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-progress-title">{{ $copy['table'] }}</h3><p class="dashboard-caption">{{ $copy['tableHint'] }}</p></div></div>
                <div class="table-wrap dashboard-table-scroll dashboard-progress-scroll" data-dashboard-progress role="region" tabindex="0" aria-labelledby="dashboard-progress-title"><p class="dashboard-loading">Memuat…</p></div>
            </section>
            @break
            @case('agenda')
            <section class="dashboard-panel dashboard-agenda" aria-labelledby="dashboard-agenda-title">
                <div class="dashboard-panel-head"><h3 class="section-title" id="dashboard-agenda-title">Jadwal periode</h3><span class="dashboard-chip" data-dashboard-cycle-status>–</span></div>
                <div class="dashboard-deadline" data-dashboard-deadline aria-live="polite"><p class="dashboard-loading">Memuat jadwal…</p></div>
                @if($ku)<a class="btn btn-primary dashboard-agenda-cta" href="{{ $vm->link($copy['agenda'][0]) }}"><x-abprove.icon name="edit"/><span>{{ $copy['agenda'][1] }}</span></a>@endif
                <div class="dashboard-agenda-foot">
                    <details class="dashboard-disclosure dashboard-schedule-details">
                        <summary>Seluruh jadwal</summary>
                        <ol class="dashboard-schedule" data-dashboard-schedule aria-label="Jadwal periode (WIB)"></ol>
                    </details>
                    @unless($ku)<a class="link dashboard-panel-link" href="{{ $vm->link($copy['agenda'][0]) }}">{{ $copy['agenda'][1] }}</a>@endunless
                </div>
            </section>
            @break
            @case('indicators')
            @unless($ku)
            <section class="dashboard-panel dashboard-insights" aria-label="Sorotan periode" data-panel-group>
                <nav class="seg workspace-tabs dashboard-tabs" role="tablist" aria-label="Sorotan periode">
                    @foreach($insights as $key => $title)<button type="button" role="tab" data-panel-tab="{{ $key }}" aria-selected="{{ $loop->first ? 'true' : 'false' }}" tabindex="{{ $loop->first ? '0' : '-1' }}" @class(['active' => $loop->first])>{{ $title }}@if($key === 'tasks')<span class="dashboard-tab-count" data-dashboard-task-count></span>@endif</button>@endforeach
                </nav>

                <div class="dashboard-insight dashboard-tasks" data-panel="tasks">
                    <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-tasks-title">{{ $copy['tasks'] }}</h3><p class="dashboard-caption">{{ $copy['tasksHint'] }}</p></div><a class="link" href="{{ $vm->link($copy['tasksAll']) }}">Semua</a></div>
                    <ol class="dashboard-task-list" data-dashboard-tasks tabindex="0" aria-labelledby="dashboard-tasks-title"><li class="dashboard-loading">Memuat…</li></ol>
                </div>

                <div class="dashboard-insight" data-panel="indicators" hidden>
            @endunless
                    <{{ $ku ? 'section' : 'div' }} @class(['dashboard-indicators', 'dashboard-panel' => $ku]) @if($ku) aria-labelledby="dashboard-indicators-title" @endif data-panel-group>
                        <div class="dashboard-panel-head">
                            <div><h3 class="section-title" id="dashboard-indicators-title">Indikator KPI</h3><p class="dashboard-caption">Lima rerata indikator dari hasil Final</p></div>
                            <a class="link" href="{{ $vm->link($copy['report']) }}" data-dashboard-indicators-all>Semua KPI</a>
                        </div>
                        <x-abprove.tabs :items="['lowest' => 'Perlu perhatian', 'highest' => 'Tertinggi']" label="Urutan indikator"/>
                        <ol class="dashboard-indicator-list" data-panel="lowest" data-dashboard-indicators="lowest" tabindex="0" aria-label="Indikator perlu perhatian"><li class="dashboard-loading">Memuat…</li></ol>
                        <ol class="dashboard-indicator-list" data-panel="highest" data-dashboard-indicators="highest" tabindex="0" aria-label="Indikator tertinggi" hidden></ol>
                    </{{ $ku ? 'section' : 'div' }}>
            @unless($ku)
                </div>

                @if($vm->role === 'hc')
                <div class="dashboard-insight dashboard-activities" data-panel="activities" hidden>
                    <div class="dashboard-panel-head"><div><h3 class="section-title" id="dashboard-activities-title">Aktivitas terbaru</h3><p class="dashboard-caption">Perubahan terakhir di sistem · WIB</p></div><a class="link" href="{{ $vm->link('aktivitas') }}">Semua</a></div>
                    <ol class="dashboard-activity-list" data-dashboard-activities tabindex="0" aria-labelledby="dashboard-activities-title"><li class="dashboard-loading">Memuat…</li></ol>
                </div>
                @endif
            </section>
            @endunless
            @break
            @endswitch
        @endforeach
    </div>
</div>
@if($vm->role !== 'hc')
{{-- Deadline extension request (dashboard.js extensionDialog): facts, quick dates capped by the next period, reason. --}}
<dialog class="modal-dialog narrow" data-extension-dialog aria-labelledby="extension-dialog-title">
    <form class="dialog-shell" data-extension-form novalidate>
        <div class="dialog-header"><h2 id="extension-dialog-title" class="dialog-title">Ajukan perpanjangan</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup"><x-abprove.icon name="close"/></button></div>
        <div class="dialog-body grid gap-4">
            <dl class="record-detail rounded-control border border-line p-3">
                <dt>Periode</dt><dd>{{ $vm->monthLabel() }}</dd>
                <dt>Area</dt><dd data-extension-area>–</dd>
                <dt>Tenggat saat ini</dt><dd data-extension-current>–</dd>
                <dt>Belum selesai</dt><dd data-extension-work>–</dd>
            </dl>
            <div>
                <label class="label" for="extension-due">Perlu waktu sampai</label>
                <div class="flex flex-wrap items-center gap-2">
                    <div class="seg" role="group" aria-label="Pilihan cepat"><button type="button" data-extension-days="3">+3 hari</button><button type="button" data-extension-days="7">+7 hari</button></div>
                    <input id="extension-due" class="field w-auto min-w-[200px] flex-1" type="datetime-local" required data-extension-due>
                </div>
                <p class="mt-1.5 text-xs leading-[18px] text-muted" data-extension-max></p>
            </div>
            <label class="block">
                <span class="label">Alasan keterlambatan</span>
                <textarea class="field min-h-24" rows="3" maxlength="1000" required data-extension-reason placeholder="Jelaskan kenapa penilaian belum selesai dan apa yang masih dikerjakan."></textarea>
                <span class="mt-1.5 block text-xs leading-[18px] text-muted">Wajib, minimal 20 karakter. Dibaca Super HC dan tercatat di Riwayat Aktivitas.</span>
            </label>
            <p class="notice"><x-abprove.icon name="bell"/><span>Super HC menerima email dan pemberitahuan di dashboard. Anda diberi tahu setelah permintaan diputuskan.</span></p>
            <p class="notice notice-error" data-extension-error role="alert" hidden></p>
        </div>
        <div class="dialog-footer"><button type="button" class="btn" data-dialog-close>Batal</button><button type="submit" class="btn btn-primary" data-extension-submit>Kirim permintaan</button></div>
    </form>
</dialog>
@endif
@endsection
