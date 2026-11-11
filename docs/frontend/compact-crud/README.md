# Revisi UI: layout ringkas dan CRUD

Implementasi aktif tetap Laravel Blade, Tailwind CSS 4, Vite dan JavaScript native. Revisi ini mengikuti alur v1.3 dan desain ABprove yang disetujui. Database, schema, routes bisnis dan backend belum diperbarui.

## Perubahan yang dapat direview

- Sidebar desktop 232 px dan navbar 64 px. Tabel mengikuti lebar container; ukuran kontrol, jarak, judul dan baris dirapikan.
- Daftar organisasi, penilaian, orang, periode, aktivitas, notifikasi, KPI dan hasil analitik memakai pagination. Filter mengembalikan daftar ke halaman pertama.
- Lembar penilaian dibagi menjadi Nilai KPI dan Temuan. Jejak keputusan tersedia pada dialog tinjauan. Enter berpindah ke nilai berikutnya, termasuk ke halaman KPI berikutnya.
- KPI ditampilkan sebagai tabel ringkas. Klik nama indikator atau Rincian/Ubah untuk membaca numerator, denominator, formula, target dan bobot. Tab Versi & masa berlaku memuat metadata dan opsi hapus versi yang belum dipakai.
- Analitik memakai tab Ringkasan Final, Riwayat dan Peringkat. Matriks riwayat menampilkan tiga bulan sekaligus dengan pilihan rentang; grafik tetap mencakup setahun. Peringkat dipisahkan per versi KPI.
- Beranda ponsel memakai Ringkasan, Tugas, Jadwal dan Persiapan HC. Filter daftar dibuka dalam dialog. Pemilihan orang pada penilaian ponsel menggunakan dropdown.
- Tombol utama berada di toolbar atau footer formulir. Ubah tersedia langsung pada tabel; tindakan tambahan berada dalam Lainnya. Klik nama untuk membaca rincian.
- Indeks audit memakai pemilih halaman dan kanvas yang menyesuaikan ruang. Tombol Buka ukuran asli membuka halaman tanpa skala.

Pagination hanya membatasi baris yang terlihat. Nilai yang sedang diisi tetap berada dalam memori halaman, pilihan pengajuan tetap tercatat antarhalaman, dan ekspor membaca seluruh hasil filter. Pilih semua hanya memilih pengajuan pada halaman yang terlihat. Tidak ada penyimpanan parsial penilaian.

## Audit CRUD

| Fitur | Tambah dan ubah | Baca | Hapus / batas |
|---|---|---|---|
| Akun kepala | Identitas, role, status; sandi awal hanya validasi simulasi | Nama, NIP, email, role, penugasan | Hanya akun tanpa penugasan/histori; akun sendiri dilindungi dari hapus, nonaktif dan perubahan role sendiri |
| Jabatan | Nama, kode, status | Jabatan dan staf terkait | Hanya jika tidak dirujuk staf |
| Divisi | Nama, kode, akun KD, status; pergantian kepala membutuhkan alasan | Kepala dan unit terkait | Diblokir jika ada unit, KPI atau histori |
| Unit | Nama, kode, divisi, akun KU, status | Kepala dan divisi | Diblokir jika ada staf, KPI atau histori; penugasan kepala tanpa histori dilepas bila unit dihapus |
| Staf | Identitas, jabatan, status; pemindahan unit memakai dialog tersendiri | Data dan unit saat ini | Staf dengan penilaian dipertahankan; gunakan status Nonaktif |
| Indikator KPI | Tambah/ubah lewat dialog; bobot positif | Semua unsur pengukuran | Hapus indikator dari editor sebelum menerapkan versi |
| Versi KPI | Perubahan diterapkan sebagai versi dengan bulan berlaku baru | Metadata, indikator dan masa berlaku | Versi tanpa snapshot penilaian dapat dihapus; masa berlaku versi di sekitarnya disesuaikan |
| Periode | Tambah; ubah jadwal/kategori sebelum dipakai; tutup periode terbuka | Jadwal WIB dan kategori | Hapus hanya periode tidak terbuka dan belum dipakai |
| Penilaian staf | KU mengisi lengkap dan mengajukan; KD memutuskan tanpa mengubah angka | Tinjauan, temuan dan jejak | KU dapat membatalkan pengajuan sendiri, menghapus isi dan kembali Belum diisi; Final tidak dihapus/diubah |
| Penilaian Kepala Unit | KD mengisi lengkap lalu langsung Final | Tinjauan dan laporan | Final hanya baca |
| Profil | Ubah profil lokal, pratinjau foto dan preferensi | Profil sesuai akun/cakupan | Akun dikelola HC; tidak ada hapus profil terpisah |
| Rekap, analitik, cakupan KPI, tim, aktivitas | Filter, pencarian, ekspor atau navigasi sesuai konteks | Data turunan dan histori | Bukan master CRUD; histori dan hasil Final dipertahankan |

Penonaktifan tetap memeriksa dependensi aktif dan penilaian non-Final. Hapus selalu meminta konfirmasi. Aktivitas lokal mencatat perubahan sebelum/sesudah. Akun yang dibuat lewat simulasi belum menjadi kredensial server.

## Cara menjalankan dan memeriksa

```powershell
npm.cmd run build
php artisan serve
```

Buka http://127.0.0.1:8000/design-review untuk audit. Halaman aplikasi utama tetap melalui /login dan mengikuti role akun. Bila tab lama masih terbuka, muat ulang dengan Ctrl+F5.

Urutan pemeriksaan yang disarankan: HC menyiapkan akun, jabatan, struktur, staf dan dua jenis KPI; KU mengisi semua halaman KPI dan mengirim; KD mengembalikan/menetapkan Final staf serta menilai Kepala Unit; HC melihat rekap. Coba juga pencarian, pagination, rincian, ubah, status aktif dan hapus data yang belum digunakan.

## Bukti dan batas

[Hasil browser](browser-report.json), [verifikasi stack, sumber dan kontras](verification.json), [screenshot](screenshots/), [layout desktop](layout-1440.json), [tablet](layout-1024.json), [ponsel](layout-390.json), [quality gate](QUALITY_GATE.md), [dialog](dialog-layout.json), [regresi spacing](final-spacing-tests.txt) dan [guard akun sendiri](self-account-guard-tests.txt).

Pengukuran halaman memakai fixture contoh pada 1440?900, 1024?768 dan 390?844. Konten sangat panjang, layar lebih pendek, zoom dan keyboard layar tetap boleh bergulir agar isi tidak terpotong. Tidak ada overflow horizontal yang sengaja ditutup untuk menyembunyikan data.

Simulasi memakai key browser abprove-flow-v2. Login/logout dan middleware role tetap nyata; data bisnis belum tersinkron ke database. Impor CSV tersedia lokal; parser Excel, perubahan sandi server dan pengiriman pesan masih menunggu integrasi. Backend lama harus disesuaikan dengan alur v1.3 sebelum endpoint bisnis dipakai.

Cadangan sebelum revisi berada di archive/frontend/2026-11-10-before-compact-crud. Dokumen fase sebelumnya dan PDF yang disetujui tetap dipertahankan.
