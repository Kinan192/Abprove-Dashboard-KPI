@extends('layouts.app')
@section('content')
<div class="page-content page-stack reference-kpi-definition" data-flow-kpi>
@include('kpi.tabs')
<div class="section-heading kpi-page-heading">
    <div class="min-w-0">
        <h2 class="lead">{{ $vm->role==='hc'?'Master KPI / Goals':($vm->role==='kd'?'KPI Divisi':'KPI Unit') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ $vm->role==='hc'?'Kelola target, formula pengukuran, bobot dan cakupan KPI pada periode terpilih.':'KPI diatur oleh SDM. Hubungi SDM untuk usulan perubahan.' }}</p>
    </div>
    <div class="flex flex-wrap justify-end gap-2">
        <button class="btn {{ $vm->role==='hc'?'btn-ghost':'' }}" type="button" data-flow-action="export-kpi"><x-abprove.icon name="download"/>Ekspor KPI</button>
        @if($vm->role==='hc')
        <button class="btn btn-ghost" type="button" data-dialog-open="import-dialog"><x-abprove.icon name="upload"/>Impor Excel</button>
        <button class="btn" type="button" data-flow-action="add-kpi-item">+ Buat KPI / Goal</button>
        <button class="btn btn-primary" type="button" data-flow-action="apply-kpi">Simpan perubahan</button>
        @endif
    </div>
</div>
@if($vm->role==='hc')
<div class="kpi-flow-hint" role="note">
    <strong>Alur:</strong>
    <ol class="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
        @foreach(['Tambah indikator','Pastikan total bobot 100%','Simpan perubahan','Setujui konfirmasi'] as $stepIndex => $stepLabel)
        <li class="inline-flex items-center gap-1.5">@if($stepIndex)<span class="text-muted" aria-hidden="true">→</span>@endif<span class="grid size-5 place-items-center rounded-full bg-paper text-[11px] font-semibold text-accent" aria-hidden="true">{{ $stepIndex + 1 }}</span><span class="text-ink">{{ $stepLabel }}</span></li>
        @endforeach
    </ol>
    <span>Tombol “Tambahkan ke editor” belum menyimpan ke backend.</span>
</div>
@endif
<div class="card kpi-workspace">
    <div class="card-toolbar kpi-workspace-head">
        <div class="min-w-0">
            <h3 class="section-title" data-kpi-heading>KPI</h3>
            @if($vm->role==='hc')<button class="link mt-1 text-xs" type="button" data-flow-action="rename-kpi">Ubah nama KPI</button>@endif
        </div>
        <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            @if($vm->role==='hc')
            <div class="seg w-fit" role="group" aria-label="Jenis KPI"><button class="active" type="button" data-kpi-level="unit" aria-pressed="true">KPI Unit</button><button type="button" data-kpi-level="division" aria-pressed="false">KPI Divisi</button></div>
            @endif
            <label class="inline-filter"><span>Unit / divisi</span><select class="field" data-kpi-area aria-label="Unit atau divisi target"></select></label>
            <p class="text-xs text-muted">Total bobot <strong class="num text-ink" data-kpi-weight></strong>%</p>
            @if($vm->role!=='hc')<span class="status">Hanya baca</span>@endif
        </div>
    </div>
    <form data-kpi-editor class="kpi-editor-form page-stack" method="post" action="{{ $vm->link('kpi') }}">
        <input type="hidden" name="name">
        <p data-kpi-error class="notice notice-error" role="alert" hidden></p>
        <div class="table-wrap">
            <table class="data-table reference-kpi-table">
                <thead><tr><th>No.</th><th>Pilar</th><th>KPI</th><th>Numerator</th><th>Denominator</th><th>Formula pengukuran</th><th>Target</th><th class="numeric">Bobot (%)</th>@if($vm->role==='hc')<th class="numeric">Tindakan</th>@endif</tr></thead>
                <tbody data-kpi-body></tbody>
                <tfoot><tr>
                    <td colspan="7">
                        <div class="kpi-table-summary">
                            <span>Total bobot</span>
                            @if($vm->role==='hc')
                            <div class="kpi-table-actions">
                                <button class="link" type="button" data-flow-action="add-kpi-item">+ Tambah KPI</button>
                                <button class="link" type="button" data-flow-action="preview-kpi">Pratinjau dampak</button>
                            </div>
                            @endif
                        </div>
                    </td>
                    <td class="numeric"><span data-kpi-weight></span>%</td>
                    @if($vm->role==='hc')<td></td>@endif
                </tr></tfoot>
            </table>
        </div>
        <div class="kpi-workspace-footer" @if($vm->role!=='hc') hidden @endif>
            <details class="reference-kpi-history {{ $vm->role!=='hc'?'hidden':'' }}">
                <summary class="btn w-fit cursor-pointer"><x-abprove.icon name="clock"/>Atur bulan penggunaan &amp; riwayat KPI<x-abprove.icon name="chevron"/></summary>
                <div class="kpi-definition-meta mt-4">
                    <x-abprove.flow-input name="from" label="Mulai digunakan pada penilaian" type="month" :required="true"/>
                    <div><label class="label" for="kpi-history">Lihat indikator yang pernah berlaku</label><select id="kpi-history" class="field" data-kpi-version aria-label="Riwayat perubahan KPI"></select></div>
                    <div><p class="text-xs text-muted" data-kpi-version-label></p>@if($vm->role==='hc')<button class="link mt-2 text-xs text-danger!" type="button" data-flow-action="delete-kpi-version">Hapus perubahan yang belum dipakai</button>@endif</div>
                </div>
                <p class="mt-3 text-xs text-muted">Bulan penggunaan menentukan kapan indikator mulai dipakai, bukan jadwal pengisian. Riwayat menampilkan susunan KPI sebelumnya. Hasil yang sudah dikirim tetap memakai indikator pada snapshot; jadwal diatur pada Periode.</p>
            </details>
        </div>
    </form>
</div>
<template id="flow-kpi-item"><tr><td data-item-number data-label="No." class="text-muted text-xs"></td>
@foreach(['pillar'=>'Pilar','name'=>'KPI','numerator'=>'Numerator','denominator'=>'Denominator','formula'=>'Formula pengukuran','target'=>'Target'] as $key=>$label)<td data-label="{{ $label }}">@if($vm->role==='hc')<input class="field {{ $key==='name'?'font-semibold':'' }}" type="text" data-kpi-field="{{ $key }}" aria-label="{{ $label }} indikator" @if($key==='pillar') list="kpi-pillars" maxlength="64" @endif @if(in_array($key,['pillar','name','target'])) required @endif>@else<span data-item-{{ $key }} class="{{ $key==='name'?'font-semibold':'' }}"></span>@endif</td>@endforeach
<td class="numeric" data-label="Bobot (%)">@if($vm->role==='hc')<input class="field weight-input" type="number" min="0.0001" max="100" step="0.0001" data-kpi-field="weight" aria-label="Bobot indikator (%)">@else<span data-item-weight></span>@endif</td>@if($vm->role==='hc')<td class="numeric" data-label="Tindakan"><div class="row-actions"><button type="button" class="icon-button" data-indicator-edit aria-label="Ubah indikator"><x-abprove.icon name="edit"/></button><button type="button" class="icon-button hover:bg-danger-soft! hover:text-danger!" data-flow-action="remove-kpi-item" aria-label="Hapus indikator"><x-abprove.icon name="trash"/></button></div></td>@endif</tr></template>
<datalist id="kpi-pillars"></datalist>
@include('kpi.dialogs')
@endsection
