@extends('layouts.base')
@section('title',$vm->title().' · ABprove')
@section('body-attributes') data-app-shell="abprove" data-page="{{ $vm->page }}" data-role="{{ $vm->role }}" @endsection
@section('body')
<script id="kpi-config" type="application/json">{!! json_encode($vm->clientConfig(),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR) !!}</script>
<a href="#main-content" class="fixed -top-20 left-4 z-[100] rounded-lg bg-paper px-4 py-3 font-semibold focus:top-3">Langsung ke konten</a>
<button id="sidebar-scrim" type="button" class="fixed inset-0 z-40 bg-ink/30" data-action="sidebar-close" aria-label="Tutup navigasi" hidden></button>
<aside id="sidebar" class="sidebar fixed inset-y-0 left-0 flex flex-col overflow-y-auto" aria-label="Navigasi utama">
    <a href="{{ $vm->link('dashboard') }}" class="sidebar-brand"><x-abprove.brand light/></a>
    <p class="sidebar-group-label">Menu utama</p>
    <nav class="sidebar-nav" aria-label="Menu utama">@foreach($vm->navigation() as $item)<a href="{{ $item['href'] }}" class="nav-link {{ $vm->navActive($item['id'])?'active':'' }}" @if($vm->navActive($item['id'])) aria-current="page" @endif><x-abprove.icon :name="$item['icon']"/><span class="nav-label">{{ $item['label'] }}</span>@if(in_array($item['id'],['nilai','pengajuan','persetujuan','rekap']))<span class="nav-label nav-count" data-nav-count="{{ $item['id'] }}"></span>@endif</a>@endforeach</nav>
    <p class="sidebar-group-label sidebar-support">Akun &amp; bantuan</p>
    <nav class="sidebar-nav" aria-label="Dukungan"><a class="nav-link {{ $vm->page==='panduan'?'active':'' }}" href="{{ $vm->link('panduan') }}" @if($vm->page==='panduan') aria-current="page" @endif><x-abprove.icon name="help"/><span class="nav-label">Panduan</span></a><a class="nav-link {{ $vm->page==='profil'?'active':'' }}" href="{{ $vm->link('profil') }}" @if($vm->page==='profil') aria-current="page" @endif><x-abprove.icon name="user"/><span class="nav-label">Profil</span></a></nav>
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
<nav class="mobile-nav fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-paper min-[601px]:hidden" aria-label="Menu cepat">@foreach(array_slice($vm->navigation(),0,4) as $item)<a href="{{ $item['href'] }}" class="flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 text-[10.5px] text-muted" @if($vm->navActive($item['id'])) aria-current="page" @endif><x-abprove.icon :name="$item['icon']"/>{{ explode(' ',$item['label'])[0] }}</a>@endforeach<button class="flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 text-[10.5px] text-muted" type="button" data-action="sidebar-toggle" aria-label="Menu lainnya"><x-abprove.icon name="menu"/>Lainnya</button></nav>
@include('layouts.partials.shell-dialogs')

@stack('dialogs')
@include('layouts.partials.templates')
<div id="toast-stack" class="pointer-events-none fixed right-4 bottom-5 z-[80] flex max-w-[calc(100vw-32px)] flex-col gap-2 max-[600px]:bottom-20" aria-live="polite"></div>
<noscript><style>form[data-local-form],button[data-action]{display:none!important}</style><p class="fixed inset-x-0 bottom-0 z-[100] bg-paper p-4 text-center text-link">Aktifkan JavaScript untuk menggunakan aplikasi.</p></noscript>
@endsection
