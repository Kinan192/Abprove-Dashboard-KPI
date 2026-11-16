@extends('layouts.app')
@section('content')
@php
$steps = $vm->role==='adm' ? [
 ['Kelola akun','Buat akun Super HC, Kepala Divisi, Kepala Unit dan Admin. Email dan NIP login harus unik. Akun yang sudah punya histori tidak dihapus, cukup dinonaktifkan.'],
 ['Penugasan area','Akun Kepala Divisi/Unit baru dapat masuk setelah Super HC menunjuknya sebagai kepala area di menu Struktur & Staf. Admin dan Super HC langsung aktif.'],
 ['Pengingat email','Pilih periode dan kelompok penerima, periksa daftar beserta jumlah pekerjaan yang belum selesai, lalu kirim. Akun yang mematikan email di profil dilewati.'],
 ['Log sistem','Pantau aktivitas bisnis, riwayat login/logout termasuk percobaan gagal, dan status pengiriman email. Log hanya dapat dibaca.'],
] : ($vm->role==='hc' ? [
 ['Akun kepala','Akun Kepala Divisi dan Kepala Unit dibuat oleh Admin. Super HC menunjuk akun tersebut sebagai kepala area. Staf tidak memerlukan akun.'],
 ['Struktur dan staf','Buat jabatan, divisi dengan kepala yang sesuai, lalu unit beserta Kepala Unit. Masukkan staf dengan NIP, jabatan dan unit penempatan.'],
 ['KPI Unit dan Divisi','HC mengisi indikator, target/formula dan bobot. KPI Unit dipakai KU menilai staf; KPI Divisi dipakai KD menilai Kepala Unit. Total bobot wajib 100%.'],
 ['Periode dan kategori','Tentukan bulan, jadwal pengisian, persetujuan dan tutup serta batas kategori. Periode yang sudah dipakai tidak ditimpa.'],
 ['Pantau hasil','Pantau progres, rekap, nilai Final, temuan dan aktivitas. Keputusan penilaian berada pada Kepala Divisi.'],
] : [
 ['Periksa periode dan cakupan','Pastikan bulan penilaian, unit/divisi dan orang yang dinilai benar. Jika KPI belum tersedia atau periode belum terbuka, hubungi Super HC.'],
 ['Isi penilaian lengkap','Kepala Unit mengisi KPI Unit untuk staf; Kepala Divisi mengisi KPI Divisi untuk Kepala Unit. Nilai integer 10–100, temuan bersifat opsional. Isian yang belum dikirim tidak disimpan.'],
 ['Pengajuan dan persetujuan',$vm->role==='ku'?'Ajukan penilaian lengkap ke Kepala Divisi. Angka terkunci selama menunggu. Pembatalan pengajuan menghapus nilai aktif setelah konfirmasi.':'Baca angka staf pada Persetujuan. Kembalikan dengan alasan atau ACC menjadi Final. Penilaian Kepala Unit yang Anda isi langsung menjadi Final.'],
 ['Revisi dan riwayat','KU memperbaiki penilaian yang dikembalikan lalu mengajukan ulang. Final hanya baca dan masuk laporan. Perbandingan bulan lalu hanya memakai indikator yang sebanding.'],
]);
@endphp
@php($cta = ['adm' => ['akun', 'Kelola akun pengguna'], 'hc' => ['struktur', 'Kelola struktur & staf'], 'ku' => ['nilai', 'Buka pengisian nilai'], 'kd' => ['persetujuan', 'Buka persetujuan']][$vm->role])
<div class="page-content page-stack compact-workspace" data-panel-group data-default-panel="step-1"><div><p class="text-success mb-2">Panduan {{ \App\ViewModels\AbproveDesign::ROLE_NAMES[$vm->role] }}</p><h2 class="lead">{{ $vm->role==='adm' ? 'Panduan administrasi akun dan log' : 'Panduan penilaian kinerja bulanan' }}</h2></div><x-abprove.tabs :items="collect($steps)->mapWithKeys(fn($step,$index)=>['step-'.($index+1)=>'Langkah '.($index+1)])->all()" active="step-1" label="Langkah panduan"/>@foreach($steps as [$title,$body])<section class="card card-pad guide-card" id="langkah-{{ $loop->iteration }}" data-panel="step-{{ $loop->iteration }}" @unless($loop->first) hidden @endunless><h2 class="section-title">{{ $loop->iteration }}. {{ $title }}</h2><p class="mt-3 leading-7 text-muted">{{ $body }}</p></section>@endforeach<a class="btn btn-primary w-fit" href="{{ $vm->link($cta[0]) }}">{{ $cta[1] }}</a><p class="text-xs text-muted">Data tersimpan melalui server sesuai cakupan akun Anda.</p></div>
@endsection
