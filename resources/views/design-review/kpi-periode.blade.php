@extends('layouts.app')
@section('content')
<div class="page-content page-stack goal-prototype skp-prototype" data-goal-prototype data-simple-kpi>
    <div class="gp-context"><span>Design review · KPI & periode</span><span class="text-muted">Data simulasi browser · perhitungan otomatis masih contoh kebijakan</span><button class="link text-xs ml-auto" type="button" data-skp-action="reset">Reset data contoh</button></div>
    <div data-skp-content data-gp-content aria-busy="true"><p class="empty">Memuat rancangan KPI…</p></div>
</div>
<datalist id="skp-pillars">@foreach(['Technical Care','Access','Coordination and Continuity','Interpersonal Care','Efficient'] as $pillar)<option value="{{ $pillar }}">@endforeach</datalist>
@push('dialogs')
<x-abprove.dialog id="skp-preview" title="Preview Tampilan Penilai" :drawer="true"><div data-skp-preview></div><x-slot:footer><button class="btn" type="button" data-dialog-close>Tutup preview</button></x-slot:footer></x-abprove.dialog>
@endpush
@endsection
