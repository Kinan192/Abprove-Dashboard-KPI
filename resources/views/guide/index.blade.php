@extends('layouts.app')
@section('content')
@php
$steps = $vm->role==='adm' ? [
 ['Kelola akun','Buat akun Super HC, Kepala Divisi, Kepala Unit dan Admin. Email dan NIP login harus unik. Akun berhistori dinonaktifkan, bukan dihapus.'],
 ['Penugasan area','Akun Kepala Divisi/Unit baru dapat masuk setelah Super HC menunjuknya sebagai kepala area. Admin dan Super HC langsung aktif.'],
 ['Pengingat email','Pilih periode dan penerima, periksa jumlah pekerjaan yang belum selesai, lalu kirim. Akun yang menonaktifkan email di profil dilewati.'],
 ['Log sistem','Pantau aktivitas, login/logout termasuk percobaan gagal, dan pengiriman email. Log hanya baca; pelaku tercatat sesuai identitasnya saat tindakan.'],
] : ($vm->role==='hc' ? [
 ['Akun kepala','Admin membuat akun Kepala Divisi dan Kepala Unit; Super HC menunjuknya sebagai kepala area. Staf tidak memerlukan akun.'],
 ['Struktur dan staf','Buat jabatan, divisi dan unit beserta kepalanya. Masukkan staf dengan NIP, jabatan dan unit penempatan.'],
 ['Pola KPI','Susun indikator, target/formula dan bobot hingga total 100%. Terapkan pola ke staf atau Kepala Unit sesuai kebutuhan; versi lama dan snapshot penilaian tetap tersimpan.'],
 ['Periode dan kategori','Tentukan bulan, jadwal pengisian, persetujuan, penutupan dan batas kategori. Periode yang sudah dipakai tidak ditimpa; periode tertutup hanya baca.'],
 ['Pantau dan ekspor','Pantau progres, rekap, nilai Final dan temuan. Ekspor per bulan, kuartal, semester atau tahun untuk seluruh organisasi, satu divisi atau satu unit. Keputusan penilaian ada pada Kepala Divisi.'],
] : [
 ['Periksa periode dan cakupan','Pastikan bulan, unit/divisi dan orang yang dinilai sudah benar. Jika KPI belum tersedia atau periode belum terbuka, hubungi Super HC.'],
 ['Isi penilaian lengkap','Kepala Unit menilai staf; Kepala Divisi menilai Kepala Unit, sesuai pola KPI yang berlaku. Nilai integer 10–100, temuan opsional. Tidak ada draf: isian tersimpan saat dikirim.'],
 ['Pengajuan dan persetujuan',$vm->role==='ku'?'Ajukan penilaian lengkap ke Kepala Divisi; angka terkunci selama menunggu. Kepala Divisi dapat menyesuaikan nilai sebelum ACC atau mengembalikan dengan catatan per KPI.':'Periksa nilai staf di Persetujuan. Sesuaikan nilai bila perlu lalu ACC menjadi Final, atau kembalikan dengan catatan per KPI. Penilaian Kepala Unit yang Anda isi langsung Final.'],
 ['Revisi dan riwayat','Kepala Unit memperbaiki penilaian yang dikembalikan sesuai catatan per KPI, lalu mengajukan ulang. Final hanya baca; riwayat mencatat penilai sesuai identitasnya saat tindakan.'],
 ['Laporan dan ekspor','Pantau rekap dan temuan di Laporan. Ekspor per bulan, kuartal, semester atau tahun untuk '.($vm->role==='ku'?'unit Anda.':'seluruh divisi atau satu unit.')],
]);
@endphp
@php($cta = ['adm' => ['akun', 'Kelola akun pengguna'], 'hc' => ['struktur', 'Kelola struktur & staf'], 'ku' => ['nilai', 'Buka pengisian nilai'], 'kd' => ['persetujuan', 'Buka persetujuan']][$vm->role])
<div class="page-content page-stack compact-workspace max-w-[1000px]" data-panel-group data-default-panel="step-1"><div><p class="mb-1 text-xs font-semibold tracking-[0.08em] text-link uppercase">Panduan {{ \App\ViewModels\AbproveDesign::ROLE_NAMES[$vm->role] }}</p><h2 class="lead">{{ $vm->role==='adm' ? 'Panduan administrasi akun dan log' : 'Panduan penilaian kinerja bulanan' }}</h2></div><x-abprove.tabs :items="collect($steps)->mapWithKeys(fn($step,$index)=>['step-'.($index+1)=>'Langkah '.($index+1)])->all()" active="step-1" label="Langkah panduan"/>@foreach($steps as [$title,$body])<section class="card card-pad guide-card" id="langkah-{{ $loop->iteration }}" data-panel="step-{{ $loop->iteration }}" @unless($loop->first) hidden @endunless><div class="flex items-start gap-4"><span class="avatar size-9! text-[13px]!" aria-hidden="true">{{ $loop->iteration }}</span><div class="min-w-0"><p class="text-xs text-muted">Langkah {{ $loop->iteration }} dari {{ $loop->count }}</p><h2 class="section-title mt-0.5">{{ $title }}</h2><p class="mt-3 max-w-[72ch] leading-7 text-muted">{{ $body }}</p></div></div></section>@endforeach<div><a class="btn btn-primary" href="{{ $vm->link($cta[0]) }}">{{ $cta[1] }}</a></div></div>
@endsection
