@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4" data-activity-root>
    <div class="toolbar"><p class="text-sm text-muted">Riwayat tindakan dan perubahan data. Catatan aktivitas tidak dapat diubah atau dihapus.</p></div>
    <div class="table-tools">
        <x-abprove.table-filters id="activity-filter-dialog" title="Filter aktivitas">
            <label>Tindakan<select class="field" data-filter="action" aria-label="Filter tindakan"><option value="">Semua tindakan</option></select></label>
            <label>Periode<select class="field" data-activity-period aria-label="Filter periode"><option value="">Semua waktu</option><option value="today">Hari ini</option><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option><option value="month">Bulan ini</option><option value="custom">Rentang tanggal</option></select></label>
            <div class="org-date-range" data-activity-range hidden><label>Dari tanggal (WIB)<input class="field" type="date" data-filter="from"></label><label>Sampai tanggal (WIB)<input class="field" type="date" data-filter="to"></label></div>
        </x-abprove.table-filters>
        <input class="field" data-filter="search" type="search" placeholder="Cari pelaku atau alasan" aria-label="Cari aktivitas">
    </div>
    <div class="card table-card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu (WIB)</th><th>Pelaku</th><th>Tindakan</th><th>Objek / alasan</th><th>Rincian</th></tr></thead><tbody data-flow-activities></tbody></table></div>
    </div>
</div>
@push('dialogs')<x-abprove.dialog id="activity-dialog" title="Rincian perubahan"><div data-activity-detail></div><x-slot:footer><button class="btn" data-dialog-close type="button">Tutup</button></x-slot:footer></x-abprove.dialog>@endpush
@endsection
