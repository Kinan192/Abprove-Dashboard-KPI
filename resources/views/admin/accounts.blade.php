@extends('layouts.app')
@section('content')
@php($roles = \App\Services\Admin\AccountService::ROLE_LABELS)
<div class="page-content page-stack admin-page" data-admin-accounts>
    <div class="toolbar">
        <div class="compact-heading"><h2 class="lead">Akun pengguna</h2><p class="mt-2 text-sm text-muted">Akun login Super HC, Kepala Divisi, Kepala Unit dan Admin. Kepala Divisi/Unit dapat masuk setelah ditunjuk Super HC sebagai kepala area.</p></div>
        <button class="btn btn-primary" type="button" data-account-new><x-abprove.icon name="plus"/>Tambah akun</button>
    </div>
    <section class="card table-card admin-card">
        <div class="card-toolbar">
            <div class="admin-card-title"><h3 class="section-title">Daftar akun</h3><span class="admin-count" data-account-stats aria-live="polite"></span></div>
            <div class="table-tools">
                <label class="inline-filter"><span>Role</span><select class="field" data-filter="role" aria-label="Filter role"><option value="">Semua role</option>@foreach($roles as $key=>$label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</select></label>
                <label class="inline-filter"><span>Status</span><select class="field" data-filter="status" aria-label="Filter status"><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
                <input class="field" type="search" data-filter="search" placeholder="Cari nama, email atau NIP" aria-label="Cari akun">
            </div>
        </div>
        <div class="table-wrap"><table class="data-table admin-table admin-accounts-table"><thead><tr><th>Nama / NIP login</th><th>Email</th><th>Role</th><th>Penugasan</th><th>Login terakhir</th><th>Status</th><th class="numeric">Tindakan</th></tr></thead><tbody data-account-rows></tbody></table></div>
        <div data-account-pager></div>
    </section>
</div>
@push('dialogs')
<x-abprove.dialog id="account-form-dialog" title="Akun pengguna" :narrow="true">
    <form id="account-form" method="post" class="space-y-4" novalidate>
        <input type="hidden" name="id">
        <x-abprove.flow-input name="name" label="Nama lengkap" :required="true" maxlength="160" autocomplete="off"/>
        <x-abprove.flow-input name="login_nip" label="NIP login" :required="true" maxlength="64" autocomplete="off"/>
        <x-abprove.flow-input name="email" label="Email" type="email" :required="true" maxlength="190" autocomplete="off" hint="Dipakai untuk login dan menerima email pengingat."/>
        <x-abprove.flow-input name="role_key" label="Role akses" type="select" :required="true">@foreach($roles as $key=>$label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</x-abprove.flow-input>
        <div data-password-field><x-abprove.flow-input name="password" label="Kata sandi awal" type="password" minlength="12" maxlength="255" autocomplete="new-password" hint="Minimal 12 karakter, berisi huruf dan angka."/></div>
        <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="is_active" checked class="size-4 accent-primary">Aktif</label>
        <p class="notice text-xs" data-role-hint></p>
        <p data-form-error hidden class="notice notice-error" role="alert"></p>
    </form>
    <x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="account-form">Simpan</button></x-slot:footer>
</x-abprove.dialog>
<x-abprove.dialog id="password-reset-dialog" title="Atur ulang kata sandi" :narrow="true">
    <form id="password-reset-form" method="post" class="space-y-4" novalidate>
        <input type="hidden" name="id">
        <p class="text-sm text-muted" data-reset-name></p>
        <x-abprove.flow-input name="password" label="Kata sandi baru" type="password" minlength="12" maxlength="255" :required="true" autocomplete="new-password" hint="Semua sesi aktif akun ini akan diakhiri."/>
        <p data-form-error hidden class="notice notice-error" role="alert"></p>
    </form>
    <x-slot:footer><button class="btn" type="button" data-dialog-close>Batal</button><button class="btn btn-primary" type="submit" form="password-reset-form">Simpan kata sandi</button></x-slot:footer>
</x-abprove.dialog>
@endpush
@endsection
