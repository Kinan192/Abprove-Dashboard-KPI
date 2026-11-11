@if($vm->role==='hc')
<nav class="seg section-tabs" aria-label="Bagian KPI dan penilaian">
    <a class="{{ in_array($vm->page,['kpi','impor'])?'active':'' }}" href="{{ $vm->link('kpi') }}">Indikator KPI</a>
    <a class="{{ $vm->page==='pengaturan'?'active':'' }}" href="{{ $vm->link('pengaturan') }}">Periode & kategori</a>
</nav>
@endif
