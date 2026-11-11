@push('dialogs')
@if($vm->role==='hc')<x-abprove.dialog id="kpi-name-dialog" title="Ubah nama KPI" :narrow="true"><form id="kpi-name-form"><x-abprove.flow-input name="name" label="Nama dokumen KPI" :required="true" maxlength="160"/><p class="text-xs text-muted mt-3">Nama ini digunakan pada ekspor dan riwayat KPI. Perubahan disimpan bersama indikator melalui Simpan perubahan.</p></form><x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="kpi-name-form">Gunakan nama</button></x-slot:footer></x-abprove.dialog>@endif
<x-abprove.dialog id="indicator-dialog" title="Rincian indikator KPI" :narrow="true">
<form id="indicator-form" class="space-y-3">
<x-abprove.flow-input name="pillar" label="Pilar" :required="true" maxlength="64" list="kpi-pillars" hint="Ketik pilar sesuai kebutuhan atau pilih saran yang tersedia."/>
<x-abprove.flow-input name="name" label="Indikator" :required="true" maxlength="500"/>
<x-abprove.flow-input name="numerator" label="Numerator" maxlength="500"/>
<x-abprove.flow-input name="denominator" label="Denominator" maxlength="500"/>
<x-abprove.flow-input name="formula" label="Formula pengukuran" maxlength="500"/>
<x-abprove.flow-input name="target" label="Target" :required="true" maxlength="500"/>
<x-abprove.flow-input name="weight" label="Bobot (%)" type="number" min="0.0001" max="100" step="0.0001" :required="true"/>
<p class="notice notice-error" data-form-error hidden role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>{{ $vm->role==='hc'?'Batal':'Tutup' }}</button>@if($vm->role==='hc')<button class="btn btn-primary" type="submit" form="indicator-form">Simpan indikator</button>@endif</x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="kpi-preview-dialog" title="Pratinjau penerapan KPI"><div data-kpi-preview></div><x-slot:footer><button class="btn" type="button" data-dialog-close>Kembali ke editor</button></x-slot:footer></x-abprove.dialog>
<x-abprove.dialog id="import-dialog" title="Impor indikator KPI"><p class="mb-4 text-sm text-muted">CSV atau XLSX: Pilar, KPI, Numerator, Denominator, Formula, Target, Bobot. Total bobot 100%, maksimal 2 MB.</p><input type="file" accept=".csv,.xlsx" data-kpi-import aria-label="File KPI"><div data-kpi-import-preview class="mt-4 text-sm"></div><x-slot:footer><button class="btn" data-dialog-close type="button">Batal</button><button class="btn btn-primary" type="button" data-flow-action="use-import" disabled>Masukkan ke editor</button></x-slot:footer></x-abprove.dialog>
@endpush
