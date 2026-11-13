@extends('layouts.app')
@section('content')
<div class="page-content page-stack goal-prototype" data-goal-prototype data-prototype-role="{{ $vm->role }}">
    <div class="gp-context"><span class="gp-context-mark"></span><span>Rancangan KPI & periode</span><span class="text-muted">Prototype interaktif · data simulasi tersimpan di browser, bukan database</span><button class="link text-xs ml-auto" type="button" data-gp-action="reset-prototype">Reset data contoh</button></div>
    @if($vm->role==='hc')
    <nav class="seg section-tabs gp-nav" aria-label="KPI dan periode">
        <a href="{{ $vm->link('kpi') }}" data-gp-nav="goals">KPI / Goals</a>
        <a href="{{ $vm->link('kpi') }}&screen=templates" data-gp-nav="templates">Template KPI Jabatan</a>
        <a href="{{ $vm->link('pengaturan') }}" data-gp-nav="cycles">Pengaturan Periode</a>
    </nav>
    @endif
    <div data-gp-content aria-live="polite" aria-busy="true"><p class="empty">Memuat rancangan KPI dan periode…</p></div>
</div>
<datalist id="gp-pillars">@foreach(['Technical Care','Access','Coordination and Continuity','Interpersonal Care','Efficient'] as $pillar)<option value="{{ $pillar }}">@endforeach</datalist>
@push('dialogs')
<x-abprove.dialog id="gp-type" title="Pilih jenis Goal">
    <p class="text-muted text-sm mb-4">Tentukan cakupan target kinerja yang akan dibuat.</p>
    <fieldset class="gp-type-grid" data-gp-types><legend class="sr-only">Jenis Goal</legend>
        @foreach(['individual'=>['Individual','KPI Karyawan','Ditetapkan melalui template jabatan untuk penilaian karyawan.','user'],'team'=>['Team','KPI Unit','Target bersama satu unit. Terpisah dari skor penilaian karyawan.','users'],'organization'=>['Organization','KPI Divisi','Target divisi dan unit di bawahnya untuk pemantauan.','grid'],'company'=>['Company','KPI Rumah Sakit','Target organisasi rumah sakit untuk pemantauan menyeluruh.','home']] as $key=>$type)
        <label class="gp-type-option"><input type="radio" name="gp-type" value="{{ $key }}"><span class="gp-type-icon"><x-abprove.icon :name="$type[3]"/></span><strong>{{ $type[0] }}</strong><span class="text-sm">{{ $type[1] }}</span><small>{{ $type[2] }}</small></label>
        @endforeach
    </fieldset>
    <x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="button" data-gp-action="choose-type" disabled>Lanjutkan</button></x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="gp-drawer" title="Pengaturan Goal" :drawer="true">
    <div data-gp-drawer-content></div>
    <x-slot:footer><button class="btn" type="button" data-gp-action="cancel-drawer">Batal</button><button class="btn btn-primary" type="submit" form="gp-drawer-form" data-gp-drawer-save>Terapkan</button></x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="gp-impact" title="Pratinjau dampak">
    <div data-gp-impact-content></div>
    <x-slot:footer><button class="btn" type="button" data-dialog-close>Tutup</button></x-slot:footer>
</x-abprove.dialog>
@endpush
@endsection
