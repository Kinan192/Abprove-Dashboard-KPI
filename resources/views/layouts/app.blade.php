@extends('layouts.base')
@section('title',$vm->title().' · ABprove')
@section('body-attributes') data-app-shell="abprove" data-page="{{ $vm->page }}" data-role="{{ $vm->role }}" @endsection
@section('body')
<script id="kpi-config" type="application/json">{!! json_encode($vm->clientConfig(),JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_THROW_ON_ERROR) !!}</script>
<a href="#main-content" class="fixed -top-20 left-4 z-[100] rounded-lg bg-paper px-4 py-3 font-semibold focus:top-3">Langsung ke konten</a>
<button id="sidebar-scrim" type="button" class="fixed inset-0 z-40 bg-ink/30" data-action="sidebar-close" aria-label="Tutup navigasi" hidden></button>
<aside id="sidebar" class="sidebar fixed inset-y-0 left-0 flex flex-col overflow-y-auto bg-brand text-white" aria-label="Navigasi utama">
    <a href="{{ $vm->link('dashboard') }}" class="px-[22px] pt-[18px] pb-5"><x-abprove.brand :light="true"/></a>
    <p class="sidebar-group-label">Menu utama</p>
    <nav class="flex flex-col gap-0.5 px-3" aria-label="Menu utama">@foreach($vm->navigation() as $item)<a href="{{ $item['href'] }}" class="nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium {{ $vm->navActive($item['id'])?'active':'' }}" @if($vm->navActive($item['id'])) aria-current="page" @endif><x-abprove.icon :name="$item['icon']"/><span class="nav-label">{{ $item['label'] }}</span>@if(in_array($item['id'],['nilai','pengajuan','persetujuan','rekap']))<span class="nav-label ml-auto rounded-full bg-white/15 px-1.5 text-[11px] font-bold text-white" data-nav-count="{{ $item['id'] }}"></span>@endif</a>@endforeach</nav>
    <p class="sidebar-group-label sidebar-support">Akun &amp; bantuan</p>
    <nav class="flex flex-col gap-0.5 border-t border-white/15 px-3 pt-4" aria-label="Dukungan"><a class="nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[15px] {{ $vm->page==='panduan'?'active':'' }}" href="{{ $vm->link('panduan') }}"><x-abprove.icon name="help"/><span class="nav-label">Panduan</span></a><a class="nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-[15px] {{ $vm->page==='profil'?'active':'' }}" href="{{ $vm->link('profil') }}"><x-abprove.icon name="user"/><span class="nav-label">Profil</span></a></nav>
    @if($vm->review)<div class="sidebar-note px-6 pt-5 pb-4 text-xs leading-5 text-[#BDD8CD]">Simulasi alur - data contoh</div>@endif
</aside>
<div id="app-main" class="app-main bg-canvas">
<header class="topbar sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-canvas/95 px-10 backdrop-blur-sm">
    <button class="icon-button top-burger -ml-2" type="button" data-action="sidebar-toggle" aria-label="Buka atau ringkas navigasi" aria-controls="sidebar"><x-abprove.icon name="menu"/></button>
    <div class="min-w-0"><h1 class="top-title text-xl leading-7 font-semibold tracking-tight">{{ $vm->title() }}</h1><p class="top-scope text-[13px] text-muted">{{ $vm->scope() }}</p></div>
    <button class="quick-search ml-auto flex min-h-10 items-center gap-3 rounded-full border border-line bg-paper px-4 text-left text-[13px] text-muted" type="button" data-dialog-open="search-dialog"><x-abprove.icon name="search"/><span class="truncate">Cari halaman, nama, atau NIP</span><kbd class="ml-auto rounded-sm border border-line bg-subtle px-2 py-0.5 text-[11px] font-semibold">Ctrl K</kbd></button>
    <button class="btn ml-auto shrink-0 gap-2!" type="button" data-dialog-open="period-dialog" aria-label="Pilih periode"><span class="period-long">Penilaian</span><span class="period-long" data-month-label>{{ $vm->monthLabel() }}</span><span class="period-short hidden" data-month-short>{{ $vm->data['shortMonths'][$vm->month] }}</span><x-abprove.icon name="chevron"/></button>
    <a href="{{ $vm->link('panduan') }}" class="icon-button top-help rounded-full! border border-line bg-paper" aria-label="Buka panduan"><x-abprove.icon name="help"/></a>
    <button class="icon-button relative rounded-full! border border-line bg-paper" type="button" data-dialog-open="notification-dialog" aria-label="Buka notifikasi"><x-abprove.icon name="bell"/><span class="notification-badge" data-notification-count hidden>0</span></button>
    <button class="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-paper p-1 pr-3 text-left" type="button" data-dialog-open="account-dialog" aria-label="Buka menu akun"><span class="avatar size-[34px]! bg-brand! text-white!">{{ \App\ViewModels\AbproveDesign::initials($vm->actor['nama']) }}</span><span class="profile-copy"><strong class="block text-[13px] leading-tight font-semibold" data-profile-name>{{ $vm->actor['nama'] }}</strong><span class="block text-xs leading-tight text-muted">{{ \App\ViewModels\AbproveDesign::ROLE_NAMES[$vm->role] }}</span></span><x-abprove.icon name="chevron" class="profile-copy"/></button>
@if($vm->review)<span class="preview-badge" title="Data kerja contoh tersimpan lokal untuk review">Data contoh</span>@endif</header>
<main id="main-content" tabindex="-1" class="min-w-0">@if($vm->review)<p class="flow-preview-label">Simulasi alur: data kerja lokal di browser, belum tersinkron ke database.</p>@endif
@yield('content')</main>
</div>
<nav class="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-line bg-paper min-[601px]:hidden" aria-label="Menu cepat">@foreach(array_slice($vm->navigation(),0,4) as $item)<a href="{{ $item['href'] }}" class="flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 text-[10px] {{ $vm->navActive($item['id'])?'font-bold text-success':'text-muted' }}"><x-abprove.icon :name="$item['icon']"/>{{ explode(' ',$item['label'])[0] }}</a>@endforeach<button class="flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 text-[10px] text-muted" type="button" data-action="sidebar-toggle" aria-label="Menu lainnya"><x-abprove.icon name="menu"/>Lainnya</button></nav>
@include('v2.shell-dialogs')

@stack('dialogs')
@include('v2.compact-templates')
<div id="toast-stack" class="pointer-events-none fixed right-4 bottom-5 z-[80] flex max-w-[calc(100vw-32px)] flex-col gap-2 max-[600px]:bottom-20" aria-live="polite"></div>
<noscript><style>form[data-local-form],button[data-action]{display:none!important}</style><p class="fixed inset-x-0 bottom-0 z-[100] bg-paper p-4 text-center text-link">Aktifkan JavaScript untuk mencoba interaksi frontend lokal.</p></noscript>
@endsection
