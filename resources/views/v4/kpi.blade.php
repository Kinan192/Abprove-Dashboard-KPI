@extends('layouts.app')
@section('content')
<div class="page-content page-stack reference-kpi-definition" data-flow-kpi>
@include('v4.section-tabs')
<div class="toolbar"><div class="flex flex-wrap gap-2">@if($vm->role==='hc')<div class="seg w-fit" aria-label="Jenis KPI"><button class="active" type="button" data-kpi-level="unit">KPI Unit</button><button type="button" data-kpi-level="division">KPI Divisi</button></div>@endif<select class="field w-auto!" data-kpi-area aria-label="Unit atau divisi target"></select></div><div class="flex flex-wrap gap-2"><button class="btn btn-ghost" type="button" data-flow-action="export-kpi"><x-abprove.icon name="download"/>Ekspor KPI</button>@if($vm->role==='hc')<button class="btn btn-ghost" type="button" data-dialog-open="import-dialog"><x-abprove.icon name="upload"/>Impor Excel</button><button class="btn btn-primary" type="button" data-flow-action="apply-kpi">Simpan perubahan</button>@endif</div></div>
<form data-kpi-editor class="page-stack" method="post" action="{{ $vm->link('kpi') }}">
<input type="hidden" name="name">
<div class="toolbar">@if($vm->role==='hc')<div class="grow"><h2 class="section-title" data-kpi-heading></h2><button class="link text-xs mt-1" type="button" data-flow-action="rename-kpi">Ubah nama KPI</button></div>@endif<p class="text-success font-semibold">Total bobot <strong data-kpi-weight></strong>%</p></div>
<details class="reference-kpi-history {{ $vm->role!=='hc'?'hidden':'' }}"><summary class="btn w-fit cursor-pointer"><x-abprove.icon name="clock"/>Atur bulan penggunaan & riwayat KPI<x-abprove.icon name="chevron"/></summary><div class="kpi-definition-meta mt-4"><x-abprove.flow-input name="from" label="Mulai digunakan pada penilaian" type="month" :required="true"/><div><label class="label" for="kpi-history">Lihat indikator yang pernah berlaku</label><select id="kpi-history" class="field" data-kpi-version aria-label="Riwayat perubahan KPI"></select></div><div><p class="text-xs text-muted" data-kpi-version-label></p>@if($vm->role==='hc')<button class="link mt-2 text-xs" type="button" data-flow-action="delete-kpi-version">Hapus perubahan yang belum dipakai</button>@endif</div></div><p class="text-xs text-muted mt-3">Bulan penggunaan menentukan kapan indikator mulai dipakai, bukan jadwal pengisian. Riwayat menampilkan susunan KPI sebelumnya. Hasil yang sudah dikirim tetap memakai indikator pada snapshot; jadwal diatur pada Periode & kategori.</p></details>
<div class="table-wrap">
    <table class="data-table reference-kpi-table">
        <thead><tr><th>No.</th><th>Pilar</th><th>KPI</th><th>Numerator</th><th>Denominator</th><th>Formula pengukuran</th><th>Target</th><th class="numeric">Bobot (%)</th>@if($vm->role==='hc')<th class="numeric">Tindakan</th>@endif</tr></thead>
        <tbody data-kpi-body></tbody>
        <tfoot>
            <tr>
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
            </tr>
        </tfoot>
    </table>
</div>
<p data-kpi-error class="notice notice-error" role="alert" hidden></p></form>
@if($vm->role!=='hc')<p class="text-xs text-muted">KPI diatur oleh SDM, Hubungi SDM untuk usulan perubahan.</p>@endif
</div>
<template id="flow-kpi-item"><tr><td data-item-number class="text-muted text-xs"></td>
@foreach(['pillar'=>'Pilar','name'=>'KPI','numerator'=>'Numerator','denominator'=>'Denominator','formula'=>'Formula pengukuran','target'=>'Target'] as $key=>$label)<td>@if($vm->role==='hc')<input class="field {{ $key==='name'?'font-semibold':'' }}" type="text" data-kpi-field="{{ $key }}" aria-label="{{ $label }} indikator" @if($key==='pillar') list="kpi-pillars" maxlength="64" @endif @if(in_array($key,['pillar','name','target'])) required @endif>@else<span data-item-{{ $key }} class="{{ $key==='name'?'font-semibold':'' }}"></span>@endif</td>@endforeach
<td class="numeric">@if($vm->role==='hc')<input class="field weight-input" type="number" min="0.0001" max="100" step="0.0001" data-kpi-field="weight" aria-label="Bobot indikator (%)">@else<span data-item-weight></span>@endif</td>@if($vm->role==='hc')<td class="numeric"><div class="row-actions"><button type="button" class="icon-button" data-indicator-edit aria-label="Ubah indikator"><x-abprove.icon name="edit"/></button><button type="button" class="icon-button" data-flow-action="remove-kpi-item" aria-label="Hapus indikator"><x-abprove.icon name="trash"/></button></div></td>@endif</tr></template>
<datalist id="kpi-pillars"></datalist>
@include('v4.kpi-dialogs')
@endsection
