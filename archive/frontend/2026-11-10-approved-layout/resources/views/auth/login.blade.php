@extends('layouts.base')
@php($review=$review??false)
@php($forgot=$forgot??false)
@section('title',($forgot?'Lupa kata sandi':'Masuk').' · ABprove')
@section('body-attributes') data-auth-page="{{ $forgot?'forgot':'login' }}" data-review="{{ $review?'true':'false' }}" @endsection
@section('body')
<main class="login-grid">
    <section class="login-brand flex flex-col justify-between text-white" aria-label="ABprove RS Awal Bros Botania"><div class="login-pattern" aria-hidden="true"></div><div class="relative"><x-abprove.brand :light="true" :large="true"/></div><p class="relative text-sm text-white">© RS Awal Bros Botania</p></section>
    <section class="login-card-section flex flex-col items-center justify-center gap-5 px-12 py-10">
        <div class="login-mark-mobile mb-3 hidden"><x-abprove.brand/></div>
        <div class="w-full max-w-[440px] rounded-2xl border border-line bg-paper px-[34px] pt-8 pb-[34px] shadow-xs">
            <h1 class="mb-6 text-[30px] font-bold tracking-tight">{{ $forgot?'Lupa kata sandi':'Masuk' }}</h1>
            <span class="sr-only">{{ $forgot?'Pemulihan akun':'Masuk ke akun Anda' }}</span>
            @if($forgot)
                <div data-forgot-form><p class="mb-6 text-sm text-muted">Masukkan email atau NIP yang terdaftar untuk menerima petunjuk pengaturan ulang kata sandi.</p><form method="post" action="{{ url('/design-review/local-only') }}" data-local-form="forgot"><label for="forgot-identifier" class="label">Email atau NIP</label><input id="forgot-identifier" class="field" required placeholder="nama@rs.co.id atau NIP"><button class="btn mt-6 w-full border-transparent! bg-[#106B50]! py-3! text-white!" type="submit">Kirim petunjuk</button></form></div>
                <div data-forgot-sent hidden><div class="notice notice-success mb-5"><x-abprove.icon name="check"/><p>Simulasi petunjuk reset selesai. Preview ini tidak mengirim email.</p></div><p class="text-sm text-muted">Alur pemulihan akun akan dihubungkan setelah audit frontend.</p></div>
                <a class="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-success" href="{{ $review?url('/design-review/login/masuk'):url('/login') }}"><x-abprove.icon name="back"/>Kembali ke halaman masuk</a>
            @else
                @if($errors->any())<div class="notice notice-error mb-5" role="alert">{{ $errors->first() }}</div>@endif
                @if(session('status'))<p class="notice mb-5" role="status">{{ session('status') }}</p>@endif
                <p class="notice notice-error mb-5" data-login-error role="alert" hidden></p>
                <form method="post" action="{{ $review?url('/design-review/local-only'):url('/login') }}" @if($review) data-review-login @endif>
                    @csrf
                    <label for="identifier" class="label">Email atau NIP</label><div class="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 focus-within:border-success focus-within:outline-3 focus-within:outline-success/10"><x-abprove.icon name="user" class="text-muted"/><input id="identifier" name="identifier" type="text" value="{{ old('identifier') }}" class="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none!" autocomplete="username" required autofocus placeholder="nama@rs.co.id atau NIP"></div>
                    <label for="password" class="label mt-5">Kata sandi</label><div class="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 focus-within:border-success"><x-abprove.icon name="lock" class="text-muted"/><input id="password" name="password" class="min-w-0 flex-1 border-0 bg-transparent py-3 outline-none!" type="password" required autocomplete="current-password" placeholder="Masukkan kata sandi"><button class="icon-button size-9! text-muted" type="button" data-password-toggle="password" aria-label="Tampilkan kata sandi"><x-abprove.icon name="eye"/></button></div>
                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3"><label class="flex items-center gap-2 text-sm"><input class="size-[18px] accent-success" type="checkbox" name="remember">Ingat saya</label><a class="text-sm font-semibold text-success" href="{{ $review?url('/design-review/login/lupa'):url('/forgot-password') }}">Lupa kata sandi?</a></div>
                    <button class="btn mt-6 w-full border-transparent! bg-[#106B50]! py-3! text-sm! text-white! hover:bg-brand!" type="submit" data-login-submit>Masuk</button>
                </form>
            @endif
        </div>
        <p class="text-center text-xs text-muted">{{ $review?'Audit desain · akun contoh ABprove':'Frontend audit · data kerja masih contoh lokal' }}</p>
    </section>
</main>
@if($review)<script id="review-accounts" type="application/json">{!! json_encode(json_decode(file_get_contents(resource_path('data/abprove-demo.json')),true)['accounts'],JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>@endif
<div id="toast-stack" class="fixed right-4 bottom-5 z-50 max-w-[calc(100vw-32px)]" aria-live="polite"></div>
@endsection
