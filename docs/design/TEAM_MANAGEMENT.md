# Pengelolaan Divisi & Tim

UI diperbarui mengikuti arahan pengguna: terdapat beberapa Kepala Divisi dan Kepala Unit, masing-masing dengan cakupan anggota sendiri.

## Susunan dan akses

Super HC → Divisi → Unit → Anggota. Setiap divisi mempunyai Kepala Divisi; setiap unit mempunyai Kepala Unit dan satu divisi induk. Jabatan karyawan menentukan template KPI.

- Super HC mengelola seluruh struktur, penanggung jawab, akun, dan penempatan anggota.
- Kepala Divisi meninjau/menyetujui penilaian anggota pada unit di divisinya.
- Kepala Unit mengisi angka penilaian anggota unitnya.
- Cakupan berlaku pada daftar, pencarian, detail, persetujuan, rekap, dan analitik; penegakannya di server menjadi bagian implementasi aplikasi.
- Pemindahan anggota tidak memindahkan histori Final. Dampak pada penilaian aktif perlu ditinjau sebelum penyimpanan.

## Contoh pada UI

Divisi Umum & SDM dipimpin KD Umum & SDM, membawahi Unit SDM (KU SDM), Logistik (KU Logistik), dan IT (KU IT). Contoh divisi lainnya: Pelayanan Medis, Keperawatan, dan Penunjang Medis. Angka/nama akun merupakan data ilustrasi.

## Cara mencoba

Super HC → Pengguna & Struktur → Divisi & Tim. Pilih divisi, buka Kelola unit, lalu coba tambah anggota, atur kepala, atau pindahkan anggota. Tambah divisi dilanjutkan dengan unit pertama dan anggota pertama. Form pada cabang Pelayanan Medis, Keperawatan, dan Penunjang menggunakan induk yang dipilih.

Kepala Divisi → Tim Divisi → Lihat anggota UGD → Tinjau penilaian unit.

Kepala Unit → Anggota Unit → Isi nilai anggota unit.

Page per role tetap terpisah; tidak ada tombol ganti role pada sidebar aplikasi. Flow pengelolaan tim tersedia pada panel prototype FigCraft. Desktop 1440 × 900, ponsel 390 × 844, tablet 1024 × 900; konten panjang memakai scroll di dalam dashboard. Palet teal design system dipertahankan dengan peran warna 60:30:10.

## Batas prototype

Prototype memakai contoh data dan snapshot hasil tindakan. Perpindahan halaman, pilihan anggota, konfirmasi, dan feedback dapat dijalankan. Input/form bukan autentikasi, penyimpanan, ataupun otorisasi server nyata. Sinkronisasi data antarhalaman dan antar-role setelah mutasi menjadi bagian implementasi aplikasi.

Pengujian melalui FigCraft MCP menjalankan action yang sama dengan On Click memakai afterDelay sementara, kemudian menghapusnya. Seluruh hotspot terlihat diperiksa pada preview. Ini bukan klaim semua tombol diklik secara fisik.
