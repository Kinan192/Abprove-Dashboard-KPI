<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}"><meta name="color-scheme" content="light">
    <title>@yield('title', 'KPI Kinerja')</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body @yield('body-attributes')>
@yield('body')
</body>
</html>
