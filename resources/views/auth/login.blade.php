@extends('layouts.base')
@php($forgot=$forgot??false)
@section('title',($forgot?'Lupa kata sandi':'Masuk').' · ABprove')
@section('body-attributes') data-auth-page="{{ $forgot?'forgot':'login' }}" @endsection
@section('body')
<main class="login-grid">
    <section class="login-brand" aria-label="ABprove RS Awal Bros Botania">
        <x-abprove.brand :large="true"/>
        <div class="login-brand-copy"><p class="login-eyebrow">KPI Kinerja</p><h2>Penilaian kinerja bulanan yang rapi, terukur, dan transparan.</h2><p>Isi nilai, ajukan, dan pantau persetujuan KPI dalam satu ruang kerja.</p></div>
        <p class="text-xs text-muted">© RS Awal Bros Botania</p>
    </section>
    <section class="login-card-section">
        <div class="login-mark-mobile"><x-abprove.brand/></div>
        <div class="login-card">
            <h1>{{ $forgot?'Lupa kata sandi':'Masuk' }}</h1>
            <p class="mt-1 mb-6 text-sm text-muted">{{ $forgot?'Pemulihan akun':'Masuk ke akun Anda' }}</p>
            @if($forgot)
                <p class="text-sm leading-6 text-muted">Hubungi Super HC untuk mengatur ulang kata sandi. Sebutkan nama dan NIP Anda. Super HC dapat membuat kata sandi baru melalui menu Akun Kepala setelah memverifikasi identitas Anda.</p>
                <a class="link mt-5 inline-flex items-center gap-2 text-sm" href="{{ url('/login') }}"><x-abprove.icon name="back"/>Kembali ke halaman masuk</a>
            @else
                @if($errors->any())<div class="notice notice-error mb-5" role="alert">{{ $errors->first() }}</div>@endif
                @if(session('status'))<p class="notice mb-5" role="status">{{ session('status') }}</p>@endif
                <form method="post" action="{{ url('/login') }}">
                    @csrf
                    <label for="identifier" class="label">Email atau NIP</label><div class="login-input"><x-abprove.icon name="user"/><input id="identifier" name="identifier" type="text" value="{{ old('identifier') }}" autocomplete="username" required autofocus placeholder="nama@rs.co.id atau NIP"></div>
                    <label for="password" class="label mt-5">Kata sandi</label><div class="login-input"><x-abprove.icon name="lock"/><input id="password" name="password" type="password" required autocomplete="current-password" placeholder="Masukkan kata sandi"><button class="icon-button" type="button" data-password-toggle="password" aria-label="Tampilkan kata sandi"><x-abprove.icon name="eye"/></button></div>
                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><label class="flex items-center gap-2 text-sm"><input class="size-[18px] accent-primary" type="checkbox" name="remember">Ingat saya</label><a class="link text-sm" href="{{ url('/forgot-password') }}">Lupa kata sandi?</a></div>
                    <button class="btn btn-primary mt-6 min-h-11 w-full text-sm" type="submit" data-login-submit>Masuk</button>
                </form>
            @endif
        </div>
        <p class="text-center text-xs text-muted">Sistem Penilaian Kinerja Bulanan</p>
    </section>
</main>
<div id="toast-stack" class="fixed right-4 bottom-5 z-50 max-w-[calc(100vw-32px)]" aria-live="polite"></div>
@endsection
