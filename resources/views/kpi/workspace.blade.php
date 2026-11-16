@extends('layouts.app')
@section('content')
<div class="page-content page-stack goal-prototype skp-prototype" data-goal-prototype data-simple-kpi>
    <div data-skp-content data-gp-content aria-busy="true"><p class="empty">Memuat pola KPI &amp; periode…</p></div>
</div>
<datalist id="skp-pillars">@foreach(['Technical Care','Access','Coordination and Continuity','Interpersonal Care','Efficient'] as $pillar)<option value="{{ $pillar }}">@endforeach</datalist>
@endsection
