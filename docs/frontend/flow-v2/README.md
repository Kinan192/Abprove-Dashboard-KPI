# Frontend alur KPI v1.3

Rujukan: PDF review 12 halaman yang disetujui pengguna dan [perubahan alur terbaru](../../requirements/ALUR-KPI-v1.3.md). Implementasi langsung pada Laravel Blade, Tailwind 4, Vite dan JavaScript native.

## Urutan HC

Akun Kepala -> Jabatan -> Divisi & Unit -> Staf -> KPI Unit & Divisi -> Periode -> Monitoring/Rekap.

Akun hanya KU, KD dan Super HC. Form divisi wajib memilih akun KD aktif yang sudah ada. Form unit wajib memilih divisi dan akun KU aktif yang sudah ada. Kandidat yang sudah memimpin area lain tidak dipakai ganda. Staf hanya mempunyai NIP, identitas, jabatan dan penempatan unit, tanpa kredensial.

HC menyusun KPI Unit untuk penilaian staf oleh KU, serta KPI Divisi untuk penilaian Kepala Unit oleh KD. Definisi terdiri dari pilar, indikator, numerator/denominator, formula, target dan bobot tepat 100%. Halaman Cakupan KPI menggantikan pemilihan template bebas per orang. Versi diterapkan dengan konfirmasi, masa berlaku dan perlindungan snapshot terpakai.

## Tanpa Draft

Tidak ada tombol/status simpan sementara, autosave atau penyimpanan nilai parsial. Form belum dikirim hanya berada dalam memori halaman dan dibuang setelah peringatan ketika ditinggalkan. KU mengisi lengkap lalu mengajukan. KD meninjau staf tanpa mengubah angka, lalu Final/return beralasan. Penilaian KU diisi KD dan langsung Final. Pembatalan pengajuan menghapus nilai dan mengembalikan Belum diisi, bukan Draft.

## Halaman dan fungsi

- KU: Beranda, Isi Nilai, Pengajuan, Riwayat Final, KPI Unit hanya baca, Anggota Unit, panduan, profil dan tugas.
- KD: Beranda, Persetujuan, Nilai Kepala Unit, Dashboard Final, KPI Divisi hanya baca, Tim Divisi, panduan, profil dan tugas.
- HC: Beranda/persiapan, Akun Kepala, Jabatan, Divisi & Unit, Staf, KPI Unit & Divisi, Periode & Kategori, Rekap, Analitik Final, Riwayat Aktivitas serta fitur bersama.

Perubahan meliputi empty state dan petunjuk konfigurasi, peringatan pengisian belum dikirim, guard penanggung jawab/transfer, pratinjau dampak, versi KPI dan snapshot, periode planned/open/closed dengan jadwal WIB, filter jenis penilaian, ranking per versi yang sebanding, ekspor terfilter, jejak lokal before/after, daftar tugas dan navigasi ponsel. Impor CSV tersedia lokal; parser Excel dan pengiriman pesan belum dihubungkan.

## Cara review

Jalankan `npm.cmd run build` lalu `php artisan serve`. Buka `/design-review`. Untuk mencoba dari kosong, buka HC > Periode & Kategori > Mulai persiapan dari kosong. Hanya data simulasi pada browser itu yang dikosongkan; akun HC dipertahankan. Kembalikan data contoh melalui tombol reset pada halaman yang sama.

Pada indeks audit, pilih role/halaman. Pada tabel akun HC dalam mode audit, Lihat area membuka halaman sesuai akun yang telah ditetapkan, tanpa tombol pergantian role pada sidebar aplikasi. Akun yang baru dibuat di simulasi belum mempunyai kredensial login server.

## Batas fase

Data bisnis tetap lokal pada key `abprove-flow-v2`. Data contoh versi lama tidak ditimpa. Login/logout aplikasi serta middleware role tetap nyata. Endpoint bisnis tidak dipanggil dari modul alur ini. Backend lama masih memakai draft dan template per jabatan; kontrak itu harus diubah sebelum integrasi alur v1.3. Tidak ada migration, reset database atau pemberian akses server yang dilakukan pada revisi ini.

## Sumber dan pemeriksaan

View `resources/views/v2`, komponen bersama pada `components/abprove`, `AbproveDesign`, modul `flow-*` dan CSS utama. Versi sebelum revisi disimpan di `archive/frontend/2026-11-09-before-flow-v2`.

Bukti: [tes browser](browser-report.json), [verifikasi](verification.json), [screenshot](screenshots/), [quality gate](QUALITY_GATE.md), dan [regresi backend](../../backend/test-result.json). Tes alur menuntaskan akun, jabatan, struktur, staf, dua jenis KPI, periode dan dua jenis Final dari struktur kosong. Tes tidak membuktikan transaksi lintas akun/perangkat pada server.
