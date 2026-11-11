@extends('layouts.app')
@section('content')
<div class="page-content page-stack reference-home" data-reference-layout="home" data-flow-home data-insights-root>
    @if($vm->role!=='ku')
    <div class="toolbar"><div><p class="text-muted mb-1" data-reference-greeting></p><h2 class="lead" data-reference-headline></h2></div>
        @if($vm->role==='hc')<div class="flex flex-wrap gap-2"><a class="btn" href="{{ $vm->link('struktur') }}&tab=unit&new=unit"><x-abprove.icon name="plus"/>Tambah unit</a><button class="btn btn-ghost" type="button" data-dialog-open="setup-dialog">Persiapan sistem</button></div>@endif
    </div>
    @endif
    <p class="notice notice-error" data-insights-error hidden role="alert"></p>
    @if($vm->role==='hc')
        <section class="card reference-cycle"><div class="grow min-w-0"><h2 class="section-title">Siklus <span data-period-label></span></h2><p class="text-muted mt-1" data-reference-closes></p><div class="reference-steps" data-home-cycle-progress></div></div><a class="btn btn-primary" href="{{ $vm->link('rekap') }}">Lihat rekap penilaian</a></section>
        <section><div class="section-heading"><h2 class="section-title">Progres per divisi</h2><a class="link" href="{{ $vm->link('dashboard') }}">Lihat dashboard</a></div><div class="page-stack" data-home-progress></div></section>
        <div class="reference-pair"><section><div class="section-heading"><h2 class="section-title">Aktivitas terbaru</h2><a class="link" href="{{ $vm->link('aktivitas') }}">Lihat semua</a></div><div class="card reference-feed" data-home-activities></div></section><section><div class="section-heading"><h2 class="section-title">Temuan <span data-period-short></span></h2><a class="link" href="{{ $vm->link('dashboard') }}#temuan">Lihat semua</a></div><div class="card reference-feed" data-home-findings></div></section></div>
    @elseif($vm->role==='kd')
        <section class="card reference-approval-task"><div class="reference-ring" data-reference-ring></div><div class="grow"><h2 class="section-title">Persetujuan <span data-period-label></span></h2><p class="text-muted mt-1" data-reference-approval-due></p></div><a class="btn btn-primary" href="{{ $vm->link('persetujuan') }}">Tinjau penilaian</a></section>
        <div class="card reference-figures" data-reference-home-figures></div>
        <section><h2 class="section-title mb-3">Progres per unit</h2><div data-home-progress></div></section>
        <section><div class="section-heading"><h2 class="section-title">Menunggu persetujuan</h2><a class="link" href="{{ $vm->link('persetujuan') }}">Lihat semua</a></div><div data-reference-waiting></div></section>
        <a class="card reference-head-task" href="{{ $vm->link('nilai-kepala') }}"><div><h2 class="section-title">Nilai Kepala Unit</h2><p class="text-muted mt-1" data-head-progress></p></div><span class="btn">Buka pengisian</span></a>
    @else
        <div class="reference-home-grid"><div class="page-stack min-w-0">
            <div><p class="text-muted mb-1" data-reference-greeting></p><h2 class="lead" data-reference-headline></h2></div>
            <div class="card reference-figures" data-reference-home-figures></div>
            <section><div class="section-heading"><h2 class="section-title">Perlu diperbaiki</h2><span class="reference-return-count" data-reference-return-count></span></div><div class="page-stack" data-reference-returns></div></section>
            <section><div class="section-heading"><h2 class="section-title">Pekerjaan berikutnya</h2><a class="link" href="{{ $vm->link('nilai') }}">Lihat semua</a></div><div data-reference-next></div></section>
            <section><div class="section-heading"><h2 class="section-title">Tren rata-rata nilai Final</h2><a class="link" href="{{ $vm->link('riwayat') }}">Lihat rincian</a></div><div class="card reference-chart" data-home-trend></div></section>
        </div><aside class="page-stack min-w-0">
            <section class="card card-pad"><h2 class="section-title">Progres pengajuan</h2><div class="reference-submission-progress" data-home-cycle-progress></div><p class="text-muted mt-4">Batas pengisian</p><p class="font-semibold mt-1" data-reference-submission-due></p><a class="btn btn-primary w-full mt-4" href="{{ $vm->link('nilai') }}">Lanjutkan penilaian</a></section>
            <section class="card card-pad"><h2 class="section-title">Tindak lanjut unit</h2><dl class="reference-followups" data-reference-followups></dl><a class="btn w-full mt-4" href="{{ $vm->link('pengajuan') }}">Pantau pengajuan</a></section>
            <section class="card card-pad"><h2 class="section-title">KPI unit</h2><div data-home-kpi></div><a class="btn w-full mt-4" href="{{ $vm->link('kpi') }}">Lihat KPI unit</a></section>
        </aside></div>
    @endif
</div>
@if($vm->role==='hc')@push('dialogs')<x-abprove.dialog id="setup-dialog" title="Persiapan sistem">@include('v2.setup')</x-abprove.dialog>@endpush @endif
@include('v2.review-dialog')
@endsection
