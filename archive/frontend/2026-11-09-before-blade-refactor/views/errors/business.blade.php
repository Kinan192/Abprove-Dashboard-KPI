@extends('layouts.base')
@section('title', 'Akses · KPI Kinerja')
@section('body')<main class="error-page"><a class="login-logo" href="/">KPI Kinerja</a><span class="error-code">{{ $status }}</span><h1>Permintaan belum dapat dilanjutkan</h1><p class="muted">{{ $message }}</p><a class="btn btn-primary" href="/">Kembali ke beranda</a><form method="post" action="/logout">@csrf<button class="btn" type="submit">Keluar dan masuk kembali</button></form></main>@endsection
