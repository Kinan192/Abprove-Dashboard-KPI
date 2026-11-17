<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title','ABprove · KPI Kinerja')</title>
    <link rel="icon" href="{{ Vite::asset('resources/images/abprove-mark.svg') }}">
    <link rel="preload" href="{{ Vite::asset('resources/fonts/figtree-400.woff2') }}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="{{ Vite::asset('resources/fonts/plus-jakarta-sans-600.woff2') }}" as="font" type="font/woff2" crossorigin>
    <script>try{const r=document.documentElement,m=localStorage.getItem('abprove-theme'),p=m==='dark'||m==='system'?m:'light';r.dataset.themeMode=p;r.dataset.theme=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p}catch{}</script>
    @vite(['resources/css/app.css','resources/js/app.js'])
</head>
<body data-frontend-stack="blade-tailwind" @yield('body-attributes')>
@yield('body')
</body></html>
