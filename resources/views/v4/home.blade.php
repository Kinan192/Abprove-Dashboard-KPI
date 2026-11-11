@extends('layouts.app')
@section('content')
<div class="page-content workspace-v4 home-v4 page-stack" data-flow-home data-insights-root>
    <div class="toolbar"><div><p class="text-xs text-muted mb-1">Penilaian <span data-period-label></span></p><h2 class="lead">{{ $vm->role==='hc'?'Pantau kinerja seluruh divisi.':($vm->role==='kd'?'Pantau unit dan tinjau pengajuan.':'Selesaikan penilaian staf unit Anda.') }}</h2></div>
    @if($vm->role==='hc')<div class="flex gap-2"><a class="btn" href="{{ $vm->link('struktur') }}&tab=unit&new=unit">Tambah unit</a><button class="btn" type="button" data-dialog-open="setup-dialog">Persiapan sistem</button></div>@endif</div>
    <div class="notice" data-cycle-notice></div>
    <div class="card metric-grid">@foreach([['Jumlah tanggung jawab','total'],['Belum diisi','Belum'],['Menunggu persetujuan','Diajukan'],['Final','Final']] as [$label,$key])<div><p class="text-xs text-muted">{{ $label }}</p><p class="metric-number mt-1" data-metric="{{ $key }}">-</p></div>@endforeach</div>
    <p class="notice notice-error" data-insights-error role="alert" hidden></p>
    <div class="home-grid">
        <div class="page-stack min-w-0">
            @if($vm->role==='ku')
                <section class="card widget"><div class="section-heading"><h2 class="section-title">Tren rata-rata nilai Final</h2><a class="link" href="{{ $vm->link('riwayat') }}">Lihat riwayat</a></div><div data-home-trend class="home-trend"></div><p class="text-xs text-muted">Hanya nilai Final dalam unit Anda.</p></section>
                <section><div class="section-heading"><h2 class="section-title">Tindak lanjut penilaian</h2><a class="link" href="{{ $vm->link('nilai') }}">Buka pengisian</a></div><div data-home-tasks class="card divide-y divide-line"></div></section>
            @else
                <section class="card widget"><div class="section-heading"><h2 class="section-title">{{ $vm->role==='hc'?'Progres per divisi':'Progres per unit' }}</h2><a class="link" href="{{ $vm->link($vm->role==='hc'?'rekap':'dashboard') }}">Lihat rincian</a></div><div data-home-progress></div></section>
                @if($vm->role==='kd')<section><div class="section-heading"><h2 class="section-title">Menunggu persetujuan</h2><a class="link" href="{{ $vm->link('persetujuan') }}">Tinjau semua</a></div><div data-home-tasks class="card divide-y divide-line"></div></section>
                @else<section class="card widget"><div class="section-heading"><h2 class="section-title">Temuan <span data-period-short></span></h2><a class="link" href="{{ $vm->link('dashboard') }}&panel=findings">Lihat semua</a></div><div data-home-findings></div></section>@endif
            @endif
        </div>
        <div class="page-stack min-w-0">
            <section class="card widget"><div class="section-heading"><h2 class="section-title">{{ $vm->role==='hc'?'Siklus':'Progres penilaian' }} <span data-period-short></span></h2></div><div data-home-cycle-progress></div><dl class="deadline-grid" data-deadlines></dl><a class="btn w-full mt-3" href="{{ $vm->link($vm->role==='hc'?'pengaturan':($vm->role==='kd'?'persetujuan':'nilai')) }}">{{ $vm->role==='hc'?'Atur periode & kategori':($vm->role==='kd'?'Tinjau pengajuan':'Lanjutkan penilaian') }}</a></section>
            @if($vm->role==='hc')<section class="card widget"><div class="section-heading"><h2 class="section-title">Aktivitas terbaru</h2><a class="link" href="{{ $vm->link('aktivitas') }}">Lihat semua</a></div><div data-home-activities></div></section>
            @elseif($vm->role==='kd')<section class="card widget"><h2 class="section-title">Penilaian Kepala Unit</h2><p class="text-sm mt-3" data-head-progress></p><a class="btn w-full mt-3" href="{{ $vm->link('nilai-kepala') }}">Nilai Kepala Unit</a></section>
            @else<section class="card widget"><h2 class="section-title">KPI unit Anda</h2><div data-home-kpi class="mt-3"></div><a class="btn w-full mt-3" href="{{ $vm->link('kpi') }}">Lihat indikator KPI</a></section>@endif
        </div>
    </div>
</div>
@if($vm->role==='hc')
@push('dialogs')<x-abprove.dialog id="setup-dialog" title="Persiapan sistem">@include('v2.setup')</x-abprove.dialog>@endpush
@endif
@include('v2.review-dialog')
@endsection
