@extends('layouts.app')
@section('content')
<div class="page-content page-stack goal-prototype skp-prototype" data-goal-prototype data-simple-kpi>
    <div data-skp-content data-gp-content aria-busy="true"><p class="empty">Memuat KPI &amp; periode…</p></div>
</div>
<datalist id="skp-pillars">@foreach(['Technical Care','Access','Coordination and Continuity','Interpersonal Care','Efficient'] as $pillar)<option value="{{ $pillar }}">@endforeach</datalist>
@push('dialogs')
<x-abprove.dialog id="skp-preview" title="Preview Tampilan Penilai" :drawer="true"><div data-skp-preview></div><x-slot:footer><button class="btn" type="button" data-dialog-close>Tutup preview</button></x-slot:footer></x-abprove.dialog>
@endpush
@endsection
