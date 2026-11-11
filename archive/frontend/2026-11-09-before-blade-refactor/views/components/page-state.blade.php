@props(['empty' => 'false', 'message' => 'Belum ada data untuk ditampilkan.', 'title' => 'Belum ada data'])
<div class="panel loading" x-show="loading" role="status" aria-live="polite"><span class="sr-only">Memuat data…</span><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>
<div class="panel empty" x-cloak x-show="!loading && loadError" role="alert"><x-icon name="help"/><h2>Data belum dapat dimuat</h2><p x-text="loadError"></p><button class="btn" type="button" @click="load()">Coba lagi</button></div>
<div class="panel empty" x-cloak x-show="!loading && !loadError && ({{ $empty }})"><x-icon name="table"/><h2>{{ $title }}</h2><p>{{ $message }}</p>{{ $slot }}</div>
