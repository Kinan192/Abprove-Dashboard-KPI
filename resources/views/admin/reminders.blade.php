@extends('layouts.app')
@section('content')
<div class="page-content page-stack admin-page" data-admin-reminders>
    <div class="toolbar"><div class="compact-heading"><h2 class="lead">Pengingat email</h2><p class="mt-2 text-sm text-muted">Email pengingat pengisian dan persetujuan KPI. Penerima dihitung dari progres terbaru.</p></div><a class="btn" href="{{ $vm->link('log') }}#email">Riwayat pengiriman</a></div>
    @php($mailer = config('mail.default'))
    @if(! in_array($mailer, ['smtp', 'ses', 'ses-v2', 'postmark', 'resend', 'sendmail', 'failover', 'roundrobin'], true))
        <p class="notice notice-warning" role="status">Mailer saat ini <strong>{{ $mailer }}</strong>: email tidak dikirim ke kotak masuk. Isi MAIL_MAILER=smtp beserta MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD dan MAIL_FROM_ADDRESS di .env.</p>
    @endif
    <form id="auto-reminder-form" class="card card-pad admin-reminder-form" method="post" novalidate>
        <div class="admin-auto-head"><div class="admin-card-title"><h3 class="section-title">Pengingat otomatis</h3><span class="admin-count" data-auto-meta aria-live="polite"></span></div><label class="admin-select-all"><input type="checkbox" name="enabled" class="size-4 accent-primary">Aktif</label></div>
        <div class="admin-reminder-grid">
            <x-abprove.flow-input name="offsets" label="Jadwal (H-)" :required="true" maxlength="40" inputmode="numeric" placeholder="14, 7, 3" hint="Hari sebelum batas waktu, pisahkan koma."/>
            <x-abprove.flow-input name="send_time" label="Jam kirim (WIB)" type="time" :required="true" step="60"/>
            <fieldset class="admin-auto-targets"><legend class="label">Penerima<span class="text-danger" aria-hidden="true"> *</span></legend>
                <label><input type="checkbox" name="targets" value="kepala_unit" class="size-4 accent-primary">Kepala Unit · batas pengajuan</label>
                <label><input type="checkbox" name="targets" value="kepala_divisi" class="size-4 accent-primary">Kepala Divisi · batas persetujuan</label>
            </fieldset>
        </div>
        <p class="text-xs text-muted">Hanya ke kepala aktif dengan tugas tertunda pada periode dibuka. Butuh scheduler server.</p>
        <div class="admin-auto-upcoming" data-auto-upcoming hidden><span class="label">Jadwal berikutnya</span><ul data-auto-list></ul></div>
        <p data-form-error hidden class="notice notice-error" role="alert"></p>
        <div class="admin-auto-actions"><button class="btn btn-primary" type="submit">Simpan</button></div>
    </form>
    <form id="reminder-form" class="card card-pad admin-reminder-form" method="post" novalidate>
        <div class="admin-card-title"><h3 class="section-title">Kirim manual</h3><span class="admin-count">Periode, penerima dan isi email</span></div>
        <div class="admin-reminder-grid">
            <x-abprove.flow-input name="cycle_id" label="Periode penilaian" type="select" :required="true"/>
            <x-abprove.flow-input name="target" label="Penerima" type="select" :required="true">
                <option value="unit_heads_pending">Kepala Unit yang belum selesai mengajukan</option>
                <option value="division_heads_pending">Kepala Divisi dengan persetujuan/penilaian tertunda</option>
                <option value="all_heads">Semua Kepala Unit dan Kepala Divisi aktif</option>
            </x-abprove.flow-input>
        </div>
        <x-abprove.flow-input name="subject" label="Subjek email" :required="true" maxlength="190"/>
        <x-abprove.flow-input name="message" label="Pesan" type="textarea" :required="true" maxlength="2000" hint="Rincian jumlah pekerjaan dan batas waktu ditambahkan otomatis per penerima."/>
        <p data-form-error hidden class="notice notice-error" role="alert"></p>
    </form>
    <section class="card table-card admin-card">
        <div class="card-toolbar"><div class="admin-card-title"><h3 class="section-title">Daftar penerima</h3><span class="admin-count" data-recipient-summary aria-live="polite">Pilih periode dan penerima.</span></div><label class="admin-select-all"><input type="checkbox" class="size-4 accent-primary" data-recipient-all>Pilih semua yang bisa dikirimi</label></div>
        <div class="table-wrap"><table class="data-table admin-table admin-recipient-table"><thead><tr><th class="w-10"><span class="sr-only">Pilih</span></th><th>Nama</th><th>Role</th><th>Area</th><th>Pekerjaan tertunda</th><th>Batas waktu (WIB)</th><th>Email</th></tr></thead><tbody data-recipient-rows></tbody></table></div>
        <div class="admin-send-bar"><p class="text-xs text-muted">Tinjau daftar penerima. Email dikirim setelah Anda mengonfirmasi.</p><button class="btn btn-primary" type="button" data-reminder-send disabled><x-abprove.icon name="bell"/>Kirim ke <span data-selected-count>0</span> penerima</button></div>
    </section>
</div>
@endsection
