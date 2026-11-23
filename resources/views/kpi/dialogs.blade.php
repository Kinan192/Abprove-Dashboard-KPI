@push('dialogs')
@if($vm->role==='hc')<x-abprove.dialog id="kpi-name-dialog" title="Ubah nama KPI" :narrow="true"><form id="kpi-name-form"><x-abprove.flow-input name="name" label="Nama dokumen KPI" :required="true" maxlength="160"/><p class="text-xs text-muted mt-3">Nama ini digunakan pada ekspor dan riwayat KPI. Perubahan disimpan bersama indikator melalui Simpan perubahan.</p></form><x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="kpi-name-form">Gunakan nama</button></x-slot:footer></x-abprove.dialog>@endif
<x-abprove.dialog id="indicator-dialog" title="Indikator KPI">
<form id="indicator-form" class="space-y-4">
<p class="text-xs text-muted">Form ini menambah satu indikator ke editor. Setelah semua indikator selesai, tutup form dan klik <strong>Simpan perubahan</strong> di halaman utama untuk menyimpan versi KPI.</p>
<div class="kpi-form-section">
    <h3 class="kpi-form-title">1. Informasi KPI</h3>
    <div class="kpi-form-grid">
        <x-abprove.flow-input name="pillar" label="Pilar" :required="true" maxlength="64" list="kpi-pillars" hint="Ketik pilar sesuai kebutuhan atau pilih saran yang tersedia."/>
        <x-abprove.flow-input name="name" label="Indikator" :required="true" maxlength="500"/>
        <x-abprove.flow-input name="target" label="Target" :required="true" maxlength="500"/>
        <x-abprove.flow-input name="weight" label="Bobot (%)" type="number" min="0.0001" max="100" step="0.0001" :required="true"/>
    </div>
</div>
<div class="kpi-form-section">
    <h3 class="kpi-form-title">2. Cara penilaian</h3>
    <label class="label" for="kpi-method">Metode</label>
    <select id="kpi-method" class="field" data-kpi-method><option value="manual">Nilai manual oleh penilai (10–100)</option><option value="formula">Otomatis dari formula</option></select>
    <p class="mt-2 text-xs text-muted" data-kpi-method-help>Penilai memasukkan satu nilai 10–100. Formula tidak dipakai.</p>
    <div class="kpi-form-grid mt-3" data-kpi-formula-fields hidden>
        <x-abprove.flow-input name="numerator" label="Numerator" maxlength="500" hint="Contoh: tiket selesai sesuai SLA."/>
        <x-abprove.flow-input name="denominator" label="Denominator" maxlength="500" hint="Contoh: total tiket yang dinilai."/>
        <div class="kpi-form-span"><x-abprove.flow-input name="formula" label="Formula pengukuran" maxlength="500" hint="Contoh: (A / B) * 100."/></div>
    </div>
</div>
<div class="kpi-form-section">
    <h3 class="kpi-form-title">3. Ditugaskan ke</h3>
    <div class="notice text-xs" data-kpi-recipients>Pilih area KPI untuk melihat penerima.</div>
</div>
<p class="notice notice-error" data-form-error hidden role="alert"></p>
</form>
<x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button>@if($vm->role==='hc')<button class="btn btn-primary" type="submit" form="indicator-form">Tambahkan ke editor</button>@endif</x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="kpi-preview-dialog" title="Pratinjau penerapan KPI"><div data-kpi-preview></div><x-slot:footer><button class="btn" type="button" data-dialog-close>Kembali ke editor</button></x-slot:footer></x-abprove.dialog>
<x-abprove.dialog id="import-dialog" title="Impor indikator KPI"><p class="mb-4 text-sm text-muted">CSV atau XLSX: Pilar, KPI, Numerator, Denominator, Formula, Target, Bobot. Total bobot 100%, maksimal 2 MB.</p><label class="block rounded-xl border border-dashed border-line bg-subtle/60 p-4"><span class="label">File KPI</span><input type="file" accept=".csv,.xlsx" data-kpi-import aria-label="File KPI"></label><div data-kpi-import-preview class="mt-4 text-sm" aria-live="polite"></div><x-slot:footer><button class="btn" data-dialog-close type="button">Batal</button><button class="btn btn-primary" type="button" data-flow-action="use-import" disabled>Masukkan ke editor</button></x-slot:footer></x-abprove.dialog>
@endpush
