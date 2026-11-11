@extends('layouts.app')
@section('content')
@php
$steps = $vm->role==='hc' ? [
 ['Akun kepala','Buat akun Kepala Divisi dan Kepala Unit terlebih dahulu. Role menentukan akses. Staf tidak memerlukan akun.'],
 ['Struktur dan staf','Buat jabatan, divisi dengan kepala yang sesuai, lalu unit beserta Kepala Unit. Masukkan staf dengan NIP, jabatan dan unit penempatan.'],
 ['KPI Unit dan Divisi','HC mengisi indikator, target/formula dan bobot. KPI Unit dipakai KU menilai staf; KPI Divisi dipakai KD menilai Kepala Unit. Total bobot wajib 100%.'],
 ['Periode dan kategori','Tentukan bulan, jadwal pengisian, persetujuan dan tutup serta batas kategori. Periode yang sudah dipakai tidak ditimpa.'],
 ['Pantau hasil','Pantau progres, rekap, nilai Final, temuan dan aktivitas. Keputusan penilaian berada pada Kepala Divisi.'],
] : [
 ['Periksa periode dan cakupan','Pastikan bulan penilaian, unit/divisi dan orang yang dinilai benar. Jika KPI belum tersedia atau periode belum terbuka, hubungi Super HC.'],
 ['Isi penilaian lengkap','Kepala Unit mengisi KPI Unit untuk staf; Kepala Divisi mengisi KPI Divisi untuk Kepala Unit. Nilai integer 10–100, temuan bersifat opsional. Isian yang belum dikirim tidak disimpan.'],
 ['Pengajuan dan persetujuan',$vm->role==='ku'?'Ajukan penilaian lengkap ke Kepala Divisi. Angka terkunci selama menunggu. Pembatalan pengajuan menghapus nilai aktif setelah konfirmasi.':'Baca angka staf pada Persetujuan. Kembalikan dengan alasan atau ACC menjadi Final. Penilaian Kepala Unit yang Anda isi langsung menjadi Final.'],
 ['Revisi dan riwayat','KU memperbaiki penilaian yang dikembalikan lalu mengajukan ulang. Final hanya baca dan masuk laporan. Perbandingan bulan lalu hanya memakai indikator yang sebanding.'],
];
@endphp
<div class="page-content page-stack"><div><p class="text-success mb-2">Panduan {{ \App\ViewModels\AbproveDesign::ROLE_NAMES[$vm->role] }}</p><h2 class="lead">Panduan penilaian kinerja bulanan</h2></div><div class="guide-grid"><aside><nav class="card p-3" aria-label="Daftar isi panduan">@foreach($steps as [$title,$body])<a class="menu-item" href="#langkah-{{ $loop->iteration }}">{{ $loop->iteration }}. {{ $title }}</a>@endforeach</nav></aside><div class="page-stack">@foreach($steps as [$title,$body])<section class="card card-pad guide-card" id="langkah-{{ $loop->iteration }}"><h2 class="section-title">{{ $loop->iteration }}. {{ $title }}</h2><p class="mt-3 leading-7 text-muted">{{ $body }}</p></section>@endforeach<a class="btn btn-primary w-fit" href="{{ $vm->link($vm->role==='hc'?'akun':($vm->role==='ku'?'nilai':'persetujuan')) }}">{{ $vm->role==='hc'?'Kelola akun kepala':($vm->role==='ku'?'Buka pengisian nilai':'Buka persetujuan') }}</a><p class="text-xs text-muted">{{ $vm->review?'Halaman audit memakai data contoh lokal.':'Data tersimpan melalui server sesuai cakupan akun Anda.' }}</p></div></div></div>
@endsection
