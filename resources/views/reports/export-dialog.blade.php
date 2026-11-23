@if(in_array($vm->role, ['hc', 'kd'], true))
<x-abprove.dialog id="export-dialog" title="Ekspor rekap penilaian" :narrow="true">
    <div class="grid gap-3 sm:grid-cols-2">
        <label class="block"><span class="label">Jenis periode</span><select class="field" data-export-period><option value="month">Bulan</option><option value="quarter">Triwulan</option><option value="semester">Semester</option><option value="year">Tahun penuh</option></select></label>
        <label class="block"><span class="label">Tahun</span><select class="field" data-export-year></select></label>
        <label class="block sm:col-span-2" data-export-index-wrap><span class="label" data-export-index-label>Bulan</span><select class="field" data-export-index></select></label>
        @if($vm->role==='hc')<label class="block"><span class="label">Divisi</span><select class="field" data-export-division><option value="">Semua divisi</option></select></label>@endif
        <label class="block {{ $vm->role==='hc' ? '' : 'sm:col-span-2' }}"><span class="label">Unit</span><select class="field" data-export-unit><option value="">{{ $vm->role==='kd' ? 'Semua unit dalam divisi' : 'Semua unit' }}</option></select></label>
        <label class="block"><span class="label">Jenis penilaian</span><select class="field" data-export-kind><option value="">Staf & Kepala Unit</option><option value="member">Staf</option><option value="unit_head">Kepala Unit</option></select></label>
        <label class="block"><span class="label">Status</span><select class="field" data-export-status><option value="final">Final saja (nilai disetujui)</option><option value="all">Semua status</option></select></label>
        <label class="block"><span class="label">Format berkas</span><select class="field" data-export-format><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV (.csv)</option></select></label>
        <label class="flex items-center gap-3 self-end pb-2 text-sm"><input type="checkbox" class="size-4 accent-primary" data-export-items checked>Sertakan rincian per indikator KPI</label>
    </div>
    <p class="notice mt-4" data-export-summary aria-live="polite"></p>
    <p class="mt-3 text-xs leading-5 text-muted">Rata-rata hanya memakai nilai Final.</p>
    <x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="button" data-flow-action="download-export">Unduh</button></x-slot:footer>
</x-abprove.dialog>
@else
<x-abprove.dialog id="export-dialog" title="Ekspor data sesuai cakupan" :narrow="true"><label class="block"><span class="label">Cakupan ekspor</span><select class="field" data-flow-export-scope><option value="filtered">Sesuai filter layar saat ini</option><option value="all">Semua data dalam tanggung jawab saya</option></select></label><p class="notice mt-4" data-export-summary></p><p class="mt-4 text-xs text-muted">Data mengikuti cakupan akses akun.</p><x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="button" data-flow-action="download-export">Unduh Excel</button></x-slot:footer></x-abprove.dialog>
@endif
