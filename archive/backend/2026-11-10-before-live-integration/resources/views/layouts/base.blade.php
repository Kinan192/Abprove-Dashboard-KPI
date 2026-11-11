<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title','ABprove · KPI Kinerja')</title>
    <link rel="icon" href="{{ Vite::asset('resources/images/abprove-mark.svg') }}">
    <script>try{document.documentElement.dataset.theme=localStorage.getItem('abprove-theme')||'light'}catch{}</script>
    @vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body data-frontend-stack="blade-tailwind" @yield('body-attributes')>
@yield('body')
</body></html>
