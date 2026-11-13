@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4">
    <div class="toolbar"><p class="text-sm text-muted">Riwayat tindakan dan perubahan data. Catatan aktivitas tidak dapat diubah atau dihapus.</p></div>
    <div class="table-tools">
        <x-abprove.table-filters id="activity-filter-dialog" title="Filter aktivitas"><label>Tindakan<select class="field" data-activity-filter aria-label="Filter tindakan"><option value="">Semua tindakan</option></select></label></x-abprove.table-filters>
        <input class="field" data-activity-search type="search" placeholder="Cari tindakan, nama, atau objek" aria-label="Cari aktivitas">
    </div>
    <div class="card table-card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu (WIB)</th><th>Pelaku</th><th>Tindakan</th><th>Objek / alasan</th><th>Rincian</th></tr></thead><tbody data-flow-activities></tbody></table></div>
    </div>
</div>
@push('dialogs')<x-abprove.dialog id="activity-dialog" title="Rincian perubahan"><div data-activity-detail></div><x-slot:footer><button class="btn" data-dialog-close type="button">Tutup</button></x-slot:footer></x-abprove.dialog>@endpush
@endsection
