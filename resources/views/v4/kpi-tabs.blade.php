@if($vm->role==='hc')
<nav class="seg section-tabs kpi-tabs" aria-label="Bagian KPI dan periode">
    <a class="{{ in_array($vm->page,['kpi','impor'],true)?'active':'' }}" href="{{ $vm->link('kpi') }}" @if(in_array($vm->page,['kpi','impor'],true)) aria-current="page" @endif>KPI &amp; Goals</a>
    <a class="{{ $vm->page==='pengaturan'?'active':'' }}" href="{{ $vm->link('pengaturan') }}" @if($vm->page==='pengaturan') aria-current="page" @endif>Periode</a>
    <a class="{{ $vm->page==='rekap'?'active':'' }}" href="{{ $vm->link('rekap') }}" @if($vm->page==='rekap') aria-current="page" @endif>Monitoring KPI</a>
</nav>
@endif
