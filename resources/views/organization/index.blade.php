@extends('layouts.app')
@section('content')
<div class="page-content page-stack workspace-v4" data-flow-organization><div class="toolbar"><div class="compact-heading"><h2 class="lead" data-org-title></h2><p class="mt-2 text-sm text-muted" data-org-description></p></div><div class="flex flex-wrap gap-2"><button class="btn" type="button" data-staff-import hidden>Impor staf</button><button class="btn" type="button" data-staff-bulk hidden>Mutasi staf massal</button><button class="btn" type="button" data-entity-new="unit" data-quick-unit>Tambah unit</button><button class="btn btn-primary" type="button" data-entity-new data-org-primary>Tambah</button></div></div>
<div class="card table-card org-card">
<div class="card-toolbar">
<div class="seg w-fit org-tabs" role="tablist" aria-label="Jenis data organisasi"><button class="active" type="button" role="tab" data-org-tab="division">Divisi<span class="org-tab-count" data-org-count="division"></span></button><button type="button" role="tab" data-org-tab="unit">Unit<span class="org-tab-count" data-org-count="unit"></span></button><button type="button" role="tab" data-org-tab="position">Jabatan<span class="org-tab-count" data-org-count="position"></span></button><button type="button" role="tab" data-org-tab="staff">Staf<span class="org-tab-count" data-org-count="staff"></span></button></div>
<div class="table-tools"><x-abprove.table-filters id="org-filters" title="Filter data organisasi"><label>Status<select class="field" data-org-active aria-label="Status aktif"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label></x-abprove.table-filters><input class="field" type="search" data-org-search placeholder="Cari nama atau NIP" aria-label="Cari data organisasi"></div>
</div>
<div class="table-wrap"><table class="data-table org-table"><thead><tr><th>Nama / identitas</th><th>Penanggung jawab</th><th>Cakupan</th><th>Status</th><th class="numeric">Tindakan</th></tr></thead><tbody data-org-body></tbody></table></div>
</div>
</div>
@push('dialogs')
<x-abprove.dialog id="entity-dialog" title="Kelola data" :narrow="true">
<form id="entity-form" method="post" class="space-y-4">
<input type="hidden" name="id"><input type="hidden" name="kind">
<x-abprove.flow-input name="name" label="Nama lengkap" :required="true" maxlength="160"/>
<div data-entity-for="staff"><x-abprove.flow-input name="nip" label="NIP" :required="true" maxlength="50"/></div>
<div data-entity-for="unit" class="space-y-4"><x-abprove.flow-input name="divisionId" label="Divisi induk" type="select" :required="true"/></div>
<div data-entity-for="division,unit" class="space-y-3" data-head-pick>
<x-abprove.flow-input name="headId" label="Akun kepala" type="select" data-searchable :required="true"/>
<p class="notice text-xs" data-head-help></p>
</div>
<div data-entity-for="division,unit" class="org-head-current" data-head-current hidden><div><span class="text-xs text-muted">Kepala saat ini</span><strong data-head-current-name></strong></div><button class="btn" type="button" data-head-change-open>Ubah kepala…</button></div>
<div data-entity-for="staff" class="space-y-4">
<x-abprove.flow-input name="positionId" label="Jabatan pekerjaan" type="select" data-searchable :required="true"/>
<x-abprove.flow-input name="unitId" label="Unit penempatan" type="select" data-searchable :required="true"/>
<p class="notice text-xs">Staf tidak memiliki akun login. KPI staf ditetapkan Super HC melalui pola KPI.</p>
</div>
<label class="flex items-center gap-3 text-sm"><input type="checkbox" name="active" checked class="size-4 accent-primary">Aktif</label>
<p data-form-error hidden class="notice notice-error" role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="entity-form">Simpan</button></x-slot:footer>
</x-abprove.dialog>

<x-abprove.dialog id="head-dialog" title="Ubah kepala area">
<form id="head-change-form" class="org-wizard" data-org-wizard="head" novalidate>
<ol class="org-steps" aria-label="Tahapan"><li data-wizard-step="1">Pilih</li><li data-wizard-step="2">Tujuan</li><li data-wizard-step="3">Dampak</li><li data-wizard-step="4">Konfirmasi</li></ol>
<section data-wizard-panel="1" class="space-y-4">
<p class="notice" data-head-source></p>
<fieldset class="org-choices"><legend class="label">Jenis perubahan</legend>
<label class="org-choice"><input type="radio" name="operation" value="replace" checked><span><strong>Ganti kepala</strong><small>Akun pengganti yang belum memimpin area mengambil alih. Kepala lama tidak lagi memimpin area.</small></span></label>
<label class="org-choice"><input type="radio" name="operation" value="move"><span><strong>Pindahkan ke area lain</strong><small data-head-move-help>Kepala pindah ke area lain dengan peran sama. Area asal wajib mendapat pengganti.</small></span></label>
<label class="org-choice"><input type="radio" name="operation" value="swap"><span><strong>Tukar dengan area lain</strong><small>Kepala dua area bertukar posisi dalam satu transaksi.</small></span></label>
<label class="org-choice"><input type="radio" name="operation" value="release"><span><strong>Lepas kepala (keluar / akan dinonaktifkan)</strong><small>Kepala dilepas dan pengganti langsung ditetapkan. Akun tetap ada; Admin yang menonaktifkan akun.</small></span></label>
</fieldset>
</section>
<section data-wizard-panel="2" class="space-y-4" hidden>
<div data-head-for="move,swap"><x-abprove.flow-input name="targetAreaId" label="Area tujuan" type="select" data-searchable/></div>
<div data-head-for="replace,move,release" class="space-y-2"><x-abprove.flow-input name="userId" label="Akun pengganti untuk area asal" type="select" data-searchable/><p class="text-xs text-muted" data-head-eligible-help></p></div>
</section>
<section data-wizard-panel="3" class="space-y-4" hidden><div data-head-preview class="org-impact" aria-live="polite"></div></section>
<section data-wizard-panel="4" class="space-y-4" hidden>
<div class="notice" data-head-summary></div>
<x-abprove.flow-input name="reason" label="Alasan perubahan" type="textarea" :required="true" maxlength="2000"/>
<label class="flex items-center gap-3 text-sm"><input type="checkbox" name="confirmed" class="size-4 accent-primary">Saya sudah meninjau dampak dan menyetujui perubahan ini.</label>
</section>
<p data-form-error hidden class="notice notice-error" role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn" type="button" data-wizard-back>Kembali</button><button class="btn btn-primary" type="button" data-wizard-next>Lanjut</button><button class="btn btn-primary" type="submit" form="head-change-form" data-wizard-submit hidden>Simpan perubahan</button></x-slot:footer>
</x-abprove.dialog>

<x-abprove.dialog id="staff-transfer-dialog" title="Mutasi staf">
<form id="staff-transfer-form" class="org-wizard" data-org-wizard="staff" novalidate>
<ol class="org-steps" aria-label="Tahapan"><li data-wizard-step="1">Pilih</li><li data-wizard-step="2">Tujuan</li><li data-wizard-step="3">Dampak</li><li data-wizard-step="4">Konfirmasi</li></ol>
<section data-wizard-panel="1" class="space-y-3">
<div class="org-picker-filters">
<x-abprove.flow-input name="pickDivision" label="Divisi" type="select" data-searchable/>
<x-abprove.flow-input name="pickUnit" label="Unit" type="select" data-searchable/>
<x-abprove.flow-input name="pickPosition" label="Jabatan" type="select" data-searchable/>
<label class="block"><span class="label">Cari</span><input class="field" type="search" name="pickSearch" placeholder="Nama atau NIP" aria-label="Cari staf"></label>
</div>
<div class="org-picker-head"><label class="flex items-center gap-2 text-sm"><input type="checkbox" class="size-4 accent-primary" data-pick-all>Pilih semua hasil</label><span class="text-xs text-muted" data-pick-count></span></div>
<div class="org-picker" data-pick-list role="group" aria-label="Daftar staf aktif"></div>
</section>
<section data-wizard-panel="2" class="space-y-4" hidden>
<p class="notice" data-transfer-selection></p>
<x-abprove.flow-input name="unitId" label="Unit tujuan" type="select" data-searchable :required="true"/>
<x-abprove.flow-input name="from" label="Bulan efektif" type="month" :required="true" placeholder="TTTT-BB"/>
<p class="text-xs text-muted" data-transfer-month-help></p>
<x-abprove.flow-input name="reason" label="Alasan mutasi" type="textarea" :required="true" maxlength="2000"/>
</section>
<section data-wizard-panel="3" class="space-y-4" hidden><div data-transfer-preview class="org-impact" aria-live="polite"></div></section>
<section data-wizard-panel="4" class="space-y-4" hidden>
<div class="notice" data-transfer-summary></div>
<label class="flex items-center gap-3 text-sm"><input type="checkbox" name="confirmed" class="size-4 accent-primary">Saya sudah meninjau dampak dan menyetujui mutasi ini.</label>
</section>
<p data-form-error hidden class="notice notice-error" role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn" type="button" data-wizard-back>Kembali</button><button class="btn btn-primary" type="button" data-wizard-next>Lanjut</button><button class="btn btn-primary" type="submit" form="staff-transfer-form" data-wizard-submit hidden>Pindahkan staf</button></x-slot:footer>
</x-abprove.dialog>

<x-abprove.dialog id="staff-import-dialog" title="Impor staf">
<form id="staff-import-form" class="space-y-4" novalidate>
<div class="org-import-head"><p class="text-sm text-muted">Maks. 500 staf tanpa akun login · 2 MB. Kode jabatan dan unit tersedia di template XLSX.</p><div class="flex flex-wrap gap-2"><button class="btn" type="button" data-import-template="xlsx">Template XLSX</button><button class="btn" type="button" data-import-template="csv">Template CSV</button></div></div>
<label class="block rounded-xl border border-dashed border-line bg-subtle/60 p-4"><span class="label">File staf (CSV/XLSX)</span><input type="file" name="file" accept=".csv,.xlsx" aria-label="File staf"></label>
<div data-import-preview class="org-impact" aria-live="polite"></div>
<p data-form-error hidden class="notice notice-error org-import-error" role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="staff-import-form" data-import-submit disabled>Impor</button></x-slot:footer>
</x-abprove.dialog>

<x-abprove.dialog id="org-detail-dialog" title="Rincian data">
<dl class="record-detail detail-summary" data-org-detail></dl>
<section class="org-division-units" data-org-division-units aria-labelledby="org-division-units-title" hidden><div class="org-division-units-head"><h3 id="org-division-units-title">Unit di divisi ini</h3><span class="text-xs text-muted" data-org-division-units-meta></span></div><p class="text-xs text-muted" data-org-division-units-note></p><ul class="org-unit-list" data-org-division-units-list aria-labelledby="org-division-units-title"></ul></section>
<section class="org-history" data-org-history aria-live="polite"></section>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Tutup</button><span data-org-detail-actions class="org-detail-actions"></span></x-slot:footer>
</x-abprove.dialog>
@endpush
@endsection
