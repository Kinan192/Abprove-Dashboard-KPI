@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4" data-flow-organization><div class="toolbar"><div class="compact-heading"><h2 class="lead" data-org-title></h2><p class="mt-2 text-sm text-muted" data-org-description></p></div><div class="flex flex-wrap gap-2"><button class="btn" type="button" data-entity-new="unit" data-quick-unit @if($vm->page==='akun') hidden @endif>Tambah unit</button><button class="btn btn-primary" type="button" data-entity-new data-org-primary>Tambah</button></div></div>
<div class="card table-card org-card">
<div class="card-toolbar">
@if($vm->page!=='akun')<div class="seg w-fit"><button class="active" type="button" data-org-tab="division">Divisi</button><button type="button" data-org-tab="unit">Unit</button><button type="button" data-org-tab="position">Jabatan</button><button type="button" data-org-tab="staff">Staf</button></div>@endif
<div class="table-tools"><label class="inline-filter"><span>Status</span><select class="field" data-org-active aria-label="Status aktif"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label><input class="field" type="search" data-org-search placeholder="Cari nama atau NIP" aria-label="Cari data organisasi"></div>
</div>
<div class="table-wrap"><table class="data-table org-table"><thead><tr><th>Nama / identitas</th><th data-org-col2>Peran</th><th data-org-col3>Cakupan</th><th>Status</th><th class="numeric">Tindakan</th></tr></thead><tbody data-org-body></tbody></table></div>
</div>
</div>
@push('dialogs')
<x-abprove.dialog id="entity-dialog" title="Kelola data" :drawer="true" :narrow="true">
<form id="entity-form" method="post" action="{{ url('/design-review/local-only') }}" data-flow-form="entity" class="space-y-4">
<input type="hidden" name="id"><input type="hidden" name="kind">
<x-abprove.flow-input name="name" label="Nama lengkap" :required="true" maxlength="160"/>
<input type="hidden" name="code">
<div data-entity-for="account,staff"><x-abprove.flow-input name="nip" label="NIP" :required="true" maxlength="50"/></div>
<div data-entity-for="account" class="space-y-4">
<x-abprove.flow-input name="email" label="Email login" type="email" :required="true"/>
<x-abprove.flow-input name="role" label="Role akses" type="select" :required="true"><option value="ku">Kepala Unit</option><option value="kd">Kepala Divisi</option><option value="hc">Super HC</option></x-abprove.flow-input>
<x-abprove.flow-input name="password" label="Kata sandi awal" type="password" minlength="12" autocomplete="new-password"/>
<p class="notice text-xs">Akun dibuat terlebih dahulu. Cakupan kerja ditetapkan saat memilihnya sebagai kepala divisi atau kepala unit.</p>
</div>
<div data-entity-for="unit" class="space-y-4"><x-abprove.flow-input name="divisionId" label="Divisi induk" type="select" :required="true"/></div>
<div data-entity-for="division,unit" class="space-y-3">
<x-abprove.flow-input name="headId" label="Akun kepala yang sudah dibuat" type="select" :required="true"/>
<p class="text-xs text-muted" data-head-help></p><a href="{{ $vm->link('akun') }}" class="link text-xs">Buat akun kepala terlebih dahulu</a>
<div class="notice text-xs" data-head-impact></div>
<x-abprove.flow-input data-head-reason name="reason" label="Alasan perubahan penanggung jawab" type="textarea" maxlength="2000"/>
</div>
<div data-entity-for="staff" class="space-y-4">
<x-abprove.flow-input name="positionId" label="Jabatan pekerjaan" type="select" data-searchable :required="true"/>
<x-abprove.flow-input name="unitId" label="Unit penempatan" type="select" data-searchable :required="true"/>
<p class="notice text-xs">Tidak ada email login atau kata sandi staf. KPI mengikuti Unit yang dipilih dan disusun oleh Super HC.</p>
</div>
<label class="flex items-center gap-3 text-sm"><input type="checkbox" name="active" checked class="size-4 accent-primary">Aktif</label>
<p data-form-error hidden class="notice notice-error" role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="entity-form">Simpan</button></x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="transfer-dialog" title="Pindahkan staf" :drawer="true" :narrow="true"><form id="transfer-form" data-flow-form="transfer" method="post" action="{{ url('/design-review/local-only') }}" class="space-y-4"><input type="hidden" name="id"><p data-transfer-origin class="notice"></p><x-abprove.flow-input name="unitId" label="Unit tujuan" type="select" :required="true"/><x-abprove.flow-input name="from" label="Mulai bulan" type="month" :required="true"/><x-abprove.flow-input data-head-reason name="reason" label="Alasan pemindahan" type="textarea" :required="true" maxlength="2000"/><div class="notice notice-warning" data-transfer-impact></div><p class="notice notice-error" data-form-error hidden role="alert"></p></form><x-slot:footer><button class="btn" data-dialog-close type="button">Batal</button><button class="btn btn-primary" type="submit" form="transfer-form">Tinjau dan pindahkan</button></x-slot:footer></x-abprove.dialog>
@endpush
@endsection
