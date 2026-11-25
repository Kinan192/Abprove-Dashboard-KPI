@extends('layouts.base')
@section('title',$vm->title().' · ABprove')
@section('body-attributes') data-app-shell="abprove" data-page="{{ $vm->page }}" data-role="{{ $vm->role }}" @endsection
@section('body')
<script id="kpi-config" type="application/json">{!! json_encode($vm->clientConfig(),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR) !!}</script>
<a href="#main-content" class="fixed -top-20 left-4 z-[100] rounded-control border border-line bg-paper px-4 py-3 font-semibold shadow-lg focus:top-3">Langsung ke konten</a>
<button id="sidebar-scrim" type="button" class="fixed inset-0 z-40 bg-[rgb(10_20_22/0.42)]" data-action="sidebar-close" aria-label="Tutup navigasi" hidden></button>
<aside id="sidebar" class="sidebar" aria-label="Navigasi utama">
    <a href="{{ $vm->link('dashboard') }}" class="sidebar-brand" aria-label="ABprove, RS Awal Bros Botania – ke dashboard"><x-abprove.brand/></a>
    <div class="sidebar-scroll">
        <nav aria-label="Menu utama">
            @foreach($vm->navigationGroups() as $group => $items)
            <p class="sidebar-group-label" id="nav-group-{{ $loop->index }}">{{ $group }}</p>
            <div class="sidebar-nav" role="group" aria-labelledby="nav-group-{{ $loop->index }}">@foreach($items as $item)<a href="{{ $item['href'] }}" class="nav-link {{ $vm->navActive($item['id'])?'active':'' }}" @if($vm->navActive($item['id'])) aria-current="page" @endif><x-abprove.icon :name="$item['icon']"/><span class="nav-label">{{ $item['label'] }}</span>@if(in_array($item['id'],['nilai','pengajuan','persetujuan','rekap','perpanjangan']))<span class="nav-label nav-count" data-nav-count="{{ $item['id'] }}"></span>@endif</a>@endforeach</div>
            @endforeach
        </nav>
    </div>
    <div class="sidebar-support">
        <p class="sidebar-group-label">Akun &amp; bantuan</p>
        <nav class="sidebar-nav" aria-label="Dukungan"><a class="nav-link {{ $vm->page==='panduan'?'active':'' }}" href="{{ $vm->link('panduan') }}" @if($vm->page==='panduan') aria-current="page" @endif><x-abprove.icon name="help"/><span class="nav-label">Panduan</span></a><a class="nav-link {{ $vm->page==='profil'?'active':'' }}" href="{{ $vm->link('profil') }}" @if($vm->page==='profil') aria-current="page" @endif><x-abprove.icon name="user"/><span class="nav-label">Profil</span></a></nav>
        <div class="sidebar-theme">
            <span class="sidebar-theme-label" id="sidebar-theme-label">Tampilan</span>
            <div class="seg theme-switch" role="group" aria-labelledby="sidebar-theme-label">
                <button type="button" data-theme-choice="system" aria-label="Ikuti tema sistem" title="Ikuti tema sistem"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18v12H3z M8 20h8 M12 16v4"/></svg></button>
                <button type="button" data-theme-choice="light" aria-label="Tema terang" title="Tema terang"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4"/></svg></button>
                <button type="button" data-theme-choice="dark" aria-label="Tema gelap" title="Tema gelap"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
            </div>
        </div>
    </div>
</aside>
<div id="app-main" class="app-main">
<header class="topbar z-30">
    <button class="icon-button top-burger" type="button" data-action="sidebar-toggle" aria-label="Buka atau ringkas navigasi" aria-controls="sidebar"><x-abprove.icon name="menu"/></button>
    <div class="top-heading"><h1 class="top-title">{{ $vm->title() }}</h1><p class="top-scope">{{ $vm->scope() }}</p></div>
    @unless($vm->isAdmin())
    <button class="quick-search" type="button" data-dialog-open="search-dialog"><x-abprove.icon name="search"/><span class="truncate">Cari halaman, nama, atau NIP</span><kbd>Ctrl K</kbd></button>
    <button class="btn period-button" type="button" data-dialog-open="period-dialog" aria-label="Pilih periode"><x-abprove.icon name="calendar"/><span class="period-long" data-month-label>{{ $vm->monthLabel() }}</span><span class="period-short" data-month-short>{{ $vm->data['shortMonths'][$vm->month] }}</span><x-abprove.icon name="chevron"/></button>
    @endunless
    <a href="{{ $vm->link('panduan') }}" class="icon-button topbar-icon top-help" aria-label="Buka panduan"><x-abprove.icon name="help"/></a>
    @unless($vm->isAdmin())
    <button class="icon-button topbar-icon relative" type="button" data-dialog-open="notification-dialog" aria-label="Buka notifikasi"><x-abprove.icon name="bell"/><span class="notification-badge" data-notification-count hidden>0</span></button>
    @endunless
    <button class="account-button" type="button" data-dialog-open="account-dialog" aria-label="Buka menu akun"><span class="avatar">{{ \App\ViewModels\AbproveDesign::initials($vm->actor['nama']) }}</span><span class="profile-copy"><strong class="block" data-profile-name>{{ $vm->actor['nama'] }}</strong><span class="block">{{ \App\ViewModels\AbproveDesign::ROLE_NAMES[$vm->role] }}</span></span><x-abprove.icon name="chevron"/></button>
</header>
<main id="main-content" tabindex="-1" class="min-w-0">
@yield('content')</main>
</div>
<nav class="mobile-nav fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-paper min-[601px]:hidden" aria-label="Menu cepat">@foreach(array_slice($vm->navigation(),0,4) as $item)<a href="{{ $item['href'] }}" class="flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted" @if($vm->navActive($item['id'])) aria-current="page" @endif><x-abprove.icon :name="$item['icon']"/>{{ explode(' ',$item['label'])[0] }}</a>@endforeach<button class="flex min-h-11 min-w-14 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-muted" type="button" data-action="sidebar-toggle" aria-controls="sidebar" aria-label="Menu lainnya"><x-abprove.icon name="menu"/>Lainnya</button></nav>
@include('layouts.partials.shell-dialogs')

@stack('dialogs')
@include('layouts.partials.templates')
<div id="toast-stack" class="pointer-events-none fixed right-4 bottom-5 z-[80] flex max-w-[calc(100vw-32px)] flex-col gap-2 max-[600px]:bottom-20" aria-live="polite"></div>
<noscript><style>form[data-local-form],button[data-action]{display:none!important}</style><p class="fixed inset-x-0 bottom-0 z-[100] bg-paper p-4 text-center text-danger">Aktifkan JavaScript untuk menggunakan aplikasi.</p></noscript>
@endsection
