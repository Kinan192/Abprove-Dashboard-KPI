@extends('layouts.app')
@section('content')
{{-- Super HC: deadline extension requests, areas holding unfinished work, direct grants and period close.
     Rendered by resources/js/abprove/extensions.js from /hc/data/extensions. --}}
<div class="page-content role-dashboard" data-extensions-root aria-busy="true">
    <header class="dashboard-heading">
        <div class="min-w-0"><h2 class="lead">Perpanjangan tenggat</h2><p class="dashboard-caption" data-ext-caption>Memuat…</p></div>
        <div class="dashboard-heading-actions">
            <button type="button" class="btn" data-ext-grant-all hidden>Perpanjang semua area</button>
            <button type="button" class="btn btn-primary" data-ext-close hidden>Tutup periode</button>
        </div>
    </header>
    <p class="notice notice-error" data-ext-error role="alert" hidden></p>
    <p class="notice" data-ext-running hidden></p>

    <section class="grid grid-cols-4 gap-3 max-[820px]:grid-cols-2" aria-label="Ringkasan perpanjangan">
        <div class="dashboard-card" data-tone="amber"><span class="dashboard-card-label">Menunggu keputusan</span><strong class="dashboard-card-value" data-ext-count="pending">–</strong><span class="dashboard-card-hint">Permintaan dari KU / KD</span></div>
        <div class="dashboard-card" data-tone="mint"><span class="dashboard-card-label">Disetujui</span><strong class="dashboard-card-value" data-ext-count="approved">–</strong><span class="dashboard-card-hint">Termasuk pemberian langsung</span></div>
        <div class="dashboard-card" data-tone="lilac"><span class="dashboard-card-label">Ditolak</span><strong class="dashboard-card-value" data-ext-count="rejected">–</strong><span class="dashboard-card-hint">Periode ini</span></div>
        <div class="dashboard-card" data-tone="sky"><span class="dashboard-card-label">Penilaian belum Final</span><strong class="dashboard-card-value" data-ext-count="held">–</strong><span class="dashboard-card-hint">Seluruh organisasi</span></div>
    </section>

    <section class="card" aria-labelledby="ext-requests-title">
        <div class="card-pad pb-3"><h3 class="section-title" id="ext-requests-title">Permintaan</h3><p class="mt-0.5 text-xs text-muted">Menunggu di atas · Perpanjangan Kepala Unit ikut mengundur batas persetujuan Kepala Divisi untuk unit tersebut</p></div>
        <div class="table-wrap rounded-none border-x-0 border-b-0">
            <table class="data-table">
                <thead><tr><th>Pemohon</th><th>Area</th><th>Tenggat</th><th>Belum selesai</th><th>Alasan / catatan</th><th>Status</th><th class="text-right"><span class="sr-only">Tindakan</span></th></tr></thead>
                <tbody data-ext-requests><tr><td colspan="7" class="empty">Memuat…</td></tr></tbody>
            </table>
        </div>
    </section>

    <section class="card" aria-labelledby="ext-stuck-title">
        <div class="card-pad pb-3"><h3 class="section-title" id="ext-stuck-title">Tertahan tanpa permintaan</h3><p class="mt-0.5 text-xs text-muted">Area yang tenggatnya lewat dengan penilaian belum selesai dan belum meminta perpanjangan. Anda dapat memberi perpanjangan langsung.</p></div>
        <div class="table-wrap rounded-none border-x-0 border-b-0">
            <table class="data-table">
                <thead><tr><th>Area</th><th>Penanggung jawab</th><th>Tenggat</th><th>Belum selesai</th><th class="text-right"><span class="sr-only">Tindakan</span></th></tr></thead>
                <tbody data-ext-stuck><tr><td colspan="5" class="empty">Memuat…</td></tr></tbody>
            </table>
        </div>
    </section>
</div>

{{-- Approve a request or grant directly (same form): new deadline, Kepala Divisi window for unit extensions, note. --}}
<dialog class="modal-dialog narrow" data-ext-approve-dialog aria-labelledby="ext-approve-title">
    <form class="dialog-shell" data-ext-approve-form novalidate>
        <div class="dialog-header"><h2 id="ext-approve-title" class="dialog-title" data-ext-approve-title>Setujui perpanjangan</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup"><x-abprove.icon name="close"/></button></div>
        <div class="dialog-body grid gap-4">
            <dl class="record-detail rounded-control border border-line p-3" data-ext-approve-facts></dl>
            <label class="block"><span class="label" data-ext-due-label>Tenggat baru</span><input class="field" type="datetime-local" required data-ext-due><span class="mt-1.5 block text-xs leading-[18px] text-muted" data-ext-due-help></span></label>
            <label class="block" data-ext-approval-wrap><span class="label">Batas persetujuan Kepala Divisi</span><input class="field" type="datetime-local" data-ext-approval><span class="mt-1.5 block text-xs leading-[18px] text-muted">Otomatis mengikuti jarak jadwal asli antara pengajuan dan persetujuan. Ubah bila perlu.</span></label>
            <label class="block"><span class="label">Catatan untuk penerima <span class="font-normal text-muted">(opsional)</span></span><textarea class="field min-h-20" rows="2" maxlength="1000" data-ext-note></textarea></label>
            <p class="notice notice-error" data-ext-approve-error role="alert" hidden></p>
        </div>
        <div class="dialog-footer"><button type="button" class="btn" data-dialog-close>Batal</button><button type="submit" class="btn btn-primary" data-ext-approve-submit>Setujui perpanjangan</button></div>
    </form>
</dialog>

<dialog class="modal-dialog narrow" data-ext-reject-dialog aria-labelledby="ext-reject-title">
    <form class="dialog-shell" data-ext-reject-form novalidate>
        <div class="dialog-header"><h2 id="ext-reject-title" class="dialog-title">Tolak permintaan</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup"><x-abprove.icon name="close"/></button></div>
        <div class="dialog-body grid gap-4">
            <p class="text-[13px] leading-5 text-muted" data-ext-reject-summary></p>
            <label class="block"><span class="label">Alasan penolakan</span><textarea class="field min-h-20" rows="3" maxlength="1000" required data-ext-reject-note></textarea><span class="mt-1.5 block text-xs leading-[18px] text-muted">Wajib. Dikirim ke pemohon lewat email dan tampil di dashboardnya.</span></label>
            <p class="notice notice-warning" data-ext-reject-impact></p>
            <p class="notice notice-error" data-ext-reject-error role="alert" hidden></p>
        </div>
        <div class="dialog-footer"><button type="button" class="btn" data-dialog-close>Batal</button><button type="submit" class="btn btn-danger" data-ext-reject-submit>Tolak permintaan</button></div>
    </form>
</dialog>

<dialog class="modal-dialog narrow" data-ext-close-dialog aria-labelledby="ext-close-title">
    <form class="dialog-shell" data-ext-close-form novalidate>
        <div class="dialog-header"><h2 id="ext-close-title" class="dialog-title" data-ext-close-title>Tutup periode</h2><button type="button" class="icon-button -mr-2" data-dialog-close aria-label="Tutup"><x-abprove.icon name="close"/></button></div>
        <div class="dialog-body grid gap-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="dashboard-card" data-tone="mint"><span class="dashboard-card-label">Final</span><strong class="dashboard-card-value" data-ext-close-final>–</strong></div>
                <div class="dashboard-card" data-tone="lilac"><span class="dashboard-card-label">Jadi Tidak dinilai</span><strong class="dashboard-card-value" data-ext-close-none>–</strong></div>
            </div>
            <ul class="m-0 grid list-none gap-1.5 p-0 text-[13px] text-muted">
                <li class="flex justify-between gap-3"><span>Diajukan, belum diputuskan → <strong class="font-semibold text-ink">otomatis Final</strong> dengan nilai Kepala Unit</span><strong class="text-ink" data-ext-close-auto>–</strong></li>
                <li class="flex justify-between gap-3"><span>Dikembalikan, belum diperbaiki → Tidak dinilai</span><strong class="text-ink" data-ext-close-returned>–</strong></li>
                <li class="flex justify-between gap-3"><span>Belum diisi → Tidak dinilai</span><strong class="text-ink" data-ext-close-empty>–</strong></li>
            </ul>
            <p class="notice notice-warning"><x-abprove.icon name="lock"/><span>Tidak dapat dibatalkan. Tidak dinilai dikecualikan dari rerata dan analitik; periode menjadi hanya baca dan permintaan yang masih menunggu kedaluwarsa.</span></p>
            <label class="flex items-start gap-2 text-[13px] leading-5"><input type="checkbox" class="mt-0.5" required data-ext-close-confirm> <span data-ext-close-confirm-text>Saya mengerti.</span></label>
            <p class="notice notice-error" data-ext-close-error role="alert" hidden></p>
        </div>
        <div class="dialog-footer"><button type="button" class="btn" data-dialog-close>Batal</button><button type="submit" class="btn btn-danger" data-ext-close-submit disabled>Tutup periode</button></div>
    </form>
</dialog>
@endsection
