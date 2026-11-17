@extends('layouts.app')
@section('content')
@php($account=$vm->actor)
<div class="page-content mx-auto max-w-[1060px] page-stack reference-profile compact-workspace" data-panel-group data-default-panel="profile">
<x-abprove.tabs :items="['profile'=>'Data diri','security'=>'Keamanan','preferences'=>'Pemberitahuan']" active="profile" label="Bagian profil"/>
<section class="card" id="profile" data-panel="profile"><div class="flex flex-wrap items-center gap-5 border-b border-line profile-avatar-header"><span class="avatar" data-profile-avatar>{{ \App\ViewModels\AbproveDesign::initials($vm->actor['nama']) }}</span><div class="grow"><h2 class="font-brand text-xl font-semibold" data-profile-name>{{ $vm->actor['nama'] }}</h2><p class="mt-1 text-sm text-muted">{{ $vm->actor['short'] }}, {{ $vm->scope() }}</p></div><label class="btn btn-small cursor-pointer"><x-abprove.icon name="user"/><span class="photo-label">Ganti foto</span><input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" data-avatar-file></label></div>
<form data-local-form="profile" method="post"><div class="grid gap-5 p-6 min-[850px]:grid-cols-2"><x-abprove.flow-input name="name" label="Nama lengkap" :value="$vm->actor['nama']" :required="true" maxlength="160"/><label><span class="label">{{ $vm->role==='ku'?'Unit':'Divisi' }}</span><input class="field bg-subtle! text-muted" value="{{ $vm->scope() }}" readonly aria-readonly="true"></label><x-abprove.flow-input name="email" label="Email" type="email" :value="$account['email']??''" :required="true"/><x-abprove.flow-input name="phone" label="Nomor HP" type="tel" placeholder="+62 812 1234 7800"/></div><div class="dialog-footer"><button class="btn" type="reset">Batal</button><button class="btn btn-primary" type="submit">Simpan</button></div></form></section>
<section class="card" id="security" data-panel="security" hidden>
    <div class="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div class="min-w-0"><h2 class="section-title">Kata sandi</h2><p class="mt-0.5 text-xs text-muted">Setelah kata sandi diubah, Anda perlu masuk kembali.</p></div>
        <button class="btn btn-ghost btn-small" type="button" data-password-toggle-all><x-abprove.icon name="eye"/>Tampilkan</button>
    </div>
    <form data-local-form="password" method="post">
        <div class="grid gap-4 p-6 min-[1000px]:grid-cols-3">
            <p id="password-requirements" class="text-sm text-muted min-[1000px]:col-span-3">Gunakan minimal 12 karakter, dengan setidaknya satu huruf dan satu angka. Ulangi kata sandi baru dengan isi yang sama.</p>
            <x-abprove.flow-input name="current_password" label="Kata sandi saat ini" type="password" autocomplete="current-password" :required="true"/>
            <x-abprove.flow-input name="new_password" label="Kata sandi baru" type="password" autocomplete="new-password" minlength="12" :required="true" aria-describedby="password-requirements"/>
            <x-abprove.flow-input name="confirmation" label="Ulangi kata sandi baru" type="password" autocomplete="new-password" minlength="12" :required="true"/>
            <p class="text-sm text-danger min-[1000px]:col-span-3" data-form-error hidden role="alert"></p>
        </div>
        <div class="dialog-footer"><button class="btn btn-primary" type="submit">Ubah kata sandi</button></div>
    </form>
</section>
<section class="card" id="preferences" data-panel="preferences" hidden>
    <div class="border-b border-line px-6 py-4"><h2 class="section-title">Pemberitahuan</h2><p class="mt-0.5 text-xs text-muted">Perubahan tersimpan otomatis saat pilihan diubah.</p></div>
    <div class="p-6"><label class="flex items-start gap-3 text-sm"><input type="checkbox" class="mt-0.5 size-4 accent-primary" checked data-profile-notification aria-describedby="notification-preference-help"><span><span class="block font-semibold text-ink">Terima email pengingat penilaian KPI</span><span id="notification-preference-help" class="mt-1 block text-xs text-muted">Bila dimatikan, akun ini dilewati saat Admin mengirim pengingat email.</span></span></label></div>
</section>
</div>
@endsection
