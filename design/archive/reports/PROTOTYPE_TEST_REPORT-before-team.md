# Laporan Prototype KPI Kinerja — Redesign Dashboard

Tanggal: 8 November 2026
Dokumen: KPI-Kinerja-UIUX.figcraft
Versi: Dashboard modern • Ukuran konsisten

## Hasil

- PASS: 164 dari 164 frame dibuka melalui proto.preview; current frame dan viewport sesuai.
- PASS: 1.284 definisi On Click, 0 tujuan hilang, 0 hubungan lintas role.
- PASS: 1.235 target On Click terlihat pada scroll awal terdeteksi di preview; 0 target terlihat hilang.
- PASS: 24 dari 24 skenario runtime setelah redesign.
- PASS: scroll formulir panjang diuji melalui scrollTo. Tombol Simpan draft ponsel di bawah viewport muncul sebagai hotspot setelah scroll; navbar tetap di atas.
- PASS: 0 layer anak keluar dari panel tanpa scroll pada audit geometri dengan toleransi 1 px.
- PASS: 0 trigger afterDelay sementara tersisa; font Inter tersedia.
- PASS: 9 flow tersimpan pada page role pemiliknya.
- Pembaruan palet: putih pada teal #076C63 memiliki kontras 6,30:1; palet status kembali mengikuti DESIGN_SYSTEM.md.

## Pembaruan warna design system 60:30:10

60% netral terang, 30% hijau pucat, 10% teal. Seluruh warna solid pada layer mengikuti token DESIGN_SYSTEM.md. 6 dari 6 skenario runtime tambahan lulus; 0 tujuan hilang dan 0 trigger sementara tersisa.

| Beranda | Netral | Pendukung | Aksen |
|---|---:|---:|---:|
| Kepala-Unit-Beranda.png | 59.4% | 30.1% | 10.5% |
| Kepala-Divisi-Beranda.png | 60.7% | 29.2% | 10.1% |
| Super-HC-Beranda.png | 60.0% | 29.9% | 10.1% |

Pengukuran beranda menghitung keluarga warna solid, dinormalisasi setelah mengeluarkan teks, border, antialias dan warna semantik. Target ini merupakan komposisi visual, bukan persentase mutlak setiap piksel pada seluruh halaman.

## Ukuran

| Jenis | Ukuran | Jumlah |
|---|---|---:|
| Desktop, state, dokumentasi | 1440 × 900 | 58 |
| Ponsel | 390 × 844 | 27 |
| Tablet | 1024 × 900 | 2 |
| Dialog dan drawer | Sesuai isi | 77 |

Dialog adalah overlay dalam viewport aplikasi. Desktop memakai sidebar 232 px, navbar 64 px, dan Dashboard Content 1208 × 836 dengan clip dan scroll vertikal. Ponsel memakai header 64 px dan content viewport 390 × 780. Target sentuh navigasi ponsel minimal 44 px.

## Metode

Desain diperbarui melalui FigCraft MCP. Semua frame dibuka dengan proto.preview; hotspot pada inspect_ui dibandingkan dengan layer On Click yang terlihat setelah clipping. Layer di bawah posisi scroll awal tidak dihitung hilang. Hotspot tambahan pada root dialog berasal dari interaksi Escape.

Runtime memakai salinan action On Click yang ada melalui trigger afterDelay sementara. Current frame dan overlay diperiksa, lalu seluruh trigger sementara dihapus. Ini pengujian mesin prototype serta hotspot, bukan klaim seluruh tombol diklik secara fisik dengan mouse.

Screenshot native FigCraft diperiksa pada tiga beranda role, pengisian nilai, persetujuan, rekap finalisasi, master KPI, pengaturan, pengguna, analitik, login, ponsel dan tablet.

## Skenario runtime

| Skenario | Hasil | Current / overlay |
|---|---|---|
| Beranda • Kepala Unit → Nav / Beranda | PASS | 133 |
| Beranda • Kepala Unit → Nav / Isi Nilai | PASS | 208 |
| Beranda • Kepala Unit → Nav / Pengajuan | PASS | 336 |
| Beranda • Kepala Unit → Nav / Riwayat • P1 | PASS | 414 |
| Beranda • Kepala Unit → Nav / KPI Unit • P1 | PASS | 566 |
| Beranda • Kepala Divisi → Nav / Beranda | PASS | 648 |
| Beranda • Kepala Divisi → Nav / Persetujuan | PASS | 731 |
| Beranda • Kepala Divisi → Nav / Dashboard Divisi • P1 | PASS | 860 |
| Beranda • Super HC → Nav / Beranda | PASS | 975 |
| Beranda • Super HC → Nav / Rekap & Finalisasi | PASS | 1068 |
| Beranda • Super HC → Nav / Master KPI | PASS | 1159 |
| Beranda • Super HC → Nav / Pengaturan | PASS | 1347 |
| Beranda • Super HC → Nav / Pengguna & Struktur | PASS | 1406 |
| Beranda • Super HC → Nav / Analitik • P1 | PASS | 1610 |
| KU ajukan hingga sukses | PASS | 208 / overlay 2308 |
| KD setujui hingga sukses | PASS | 731 / overlay 2313 |
| KD kembalikan hingga sukses | PASS | 731 / overlay 2318 |
| HC finalkan 3 hingga sukses | PASS | 1068 / overlay 2323 |
| HC toggle 3 menjadi 2 | PASS | 7786 |
| HC toggle 2 menjadi 3 | PASS | 1068 |
| Navigasi cepat Beranda • Kepala Unit | PASS | 336 |
| Navigasi cepat Beranda • Kepala Divisi | PASS | 731 |
| Navigasi cepat Beranda • Super HC | PASS | 1159 |
| Mobile KU ajukan | PASS | 2874 / overlay 3787 |

## Perilaku

Navigasi menu memakai On Click dan dissolve 180 ms. Tab dan checkbox memakai smartAnimate 180–200 ms. Dialog moveIn dari bawah dan drawer dari kiri, 180–200 ms. Batal, Tutup, dan Escape menutup overlay.

Field input merupakan rancangan, bukan autentikasi atau penyimpanan server. Navigasi, tab status, state seleksi, konfirmasi dan feedback keputusan berjalan pada prototype.

Empat kontrol memang nonaktif: simpan template dengan bobot belum 100%, impor invalid, ajukan pada state validasi belum lengkap, dan buka kunci Final yang masih membutuhkan keputusan alur implementasi.

## Flow per role

| Page | Beranda desktop | Login | Ponsel |
|---|---:|---:|---:|
| 01 • Kepala Unit | 133 | 103 | 2834 |
| 02 • Kepala Divisi | 648 | 4994 | 3054 |
| 03 • Super HC | 975 | 5265 | 3171 |

Untuk membuka role lain: pilih page role di FigCraft, pilih flow Beranda desktop, lalu Present. Sidebar aplikasi tidak memuat kontrol ganti role.

## Audit frame

| ID | Frame | Ukuran | Target klik terlihat | Hilang |
|---|---|---|---:|---:|
| 3 | KPI Kinerja • Peta desain | 1440 × 900 | 0 | 0 |
| 37 | Fondasi & komponen | 1440 × 900 | 2 | 0 |
| 103 | Login • U-1 | 1440 × 900 | 1 | 0 |
| 133 | Beranda • Kepala Unit | 1440 × 900 | 19 | 0 |
| 208 | Isi Nilai • Kepala Unit | 1440 × 900 | 22 | 0 |
| 336 | Pengajuan • Kepala Unit | 1440 × 900 | 18 | 0 |
| 414 | Riwayat • Kepala Unit | 1440 × 900 | 43 | 0 |
| 566 | KPI Unit • Kepala Unit | 1440 × 900 | 12 | 0 |
| 1843 | Lembar Final & Riwayat | 1440 × 900 | 12 | 0 |
| 1938 | Detail Pengajuan | 1440 × 900 | 12 | 0 |
| 2131 | KPI Kinerja | 352 × 650 | 7 | 0 |
| 2192 | Akun • Kepala Unit | 380 × 250 | 2 | 0 |
| 2201 | Akun • Kepala Unit | 560 × 400 | 1 | 0 |
| 2217 | Periode penilaian | 440 × 430 | 3 | 0 |
| 2227 | Ajukan penilaian? | 560 × 400 | 2 | 0 |
| 2280 | Tarik kembali pengajuan? | 560 × 360 | 2 | 0 |
| 2296 | Keluar dari akun? | 560 × 280 | 2 | 0 |
| 2303 | Draft tersimpan | 560 × 300 | 1 | 0 |
| 2308 | Penilaian diajukan | 560 × 300 | 1 | 0 |
| 2456 | Notifikasi • P1 | 560 × 260 | 1 | 0 |
| 2469 | Cara pengisian nilai • P1 | 560 × 610 | 1 | 0 |
| 2824 | Perubahan belum disimpan | 560 × 350 | 3 | 0 |
| 2834 | Penilaian bulan ini • 390 | 390 × 844 | 4 | 0 |
| 2874 | Isi nilai • 390 | 390 × 844 | 2 | 0 |
| 2949 | Pengajuan • 390 | 390 × 844 | 5 | 0 |
| 2989 | Riwayat • 390 | 390 × 844 | 4 | 0 |
| 3021 | KPI unit • 390 | 390 × 844 | 2 | 0 |
| 3666 | KPI Kinerja • mobile | 358 × 720 | 8 | 0 |
| 3736 | Periode penilaian • mobile | 358 × 380 | 2 | 0 |
| 3744 | Ajukan penilaian? • mobile | 358 × 430 | 2 | 0 |
| 3782 | Draft tersimpan • mobile | 358 × 330 | 1 | 0 |
| 3787 | Penilaian diajukan • mobile | 358 × 330 | 1 | 0 |
| 3817 | Cara pengisian • P1 • mobile | 358 × 460 | 1 | 0 |
| 3824 | Login • 390 | 390 × 844 | 1 | 0 |
| 4231 | Salin nilai bulan lalu? | 560 × 420 | 2 | 0 |
| 5105 | Lembar penilaian • 390 | 390 × 844 | 2 | 0 |
| 5529 | Pengajuan • Menunggu | 1440 × 900 | 19 | 0 |
| 5637 | Pengajuan • Disetujui | 1440 × 900 | 17 | 0 |
| 5725 | Pengajuan • Final | 1440 × 900 | 17 | 0 |
| 5813 | Pengajuan • Belum diajukan | 1440 × 900 | 19 | 0 |
| 6939 | Isi Nilai • Perlu diisi | 1440 × 900 | 20 | 0 |
| 7931 | Navigasi cepat • Kepala Unit | 560 × 400 | 6 | 0 |
| 648 | Beranda • Kepala Divisi | 1440 × 900 | 18 | 0 |
| 731 | Persetujuan • Kepala Divisi | 1440 × 900 | 18 | 0 |
| 860 | Dashboard Divisi • Kepala Divisi | 1440 × 900 | 11 | 0 |
| 2152 | KPI Kinerja | 352 × 650 | 5 | 0 |
| 2237 | Setujui penilaian? | 560 × 380 | 2 | 0 |
| 2247 | Kembalikan penilaian? | 560 × 470 | 2 | 0 |
| 2313 | Penilaian disetujui | 560 × 300 | 1 | 0 |
| 2318 | Penilaian dikembalikan | 560 × 300 | 1 | 0 |
| 3054 | Persetujuan divisi • 390 | 390 × 844 | 6 | 0 |
| 3086 | Tinjau penilaian • 390 | 390 × 844 | 2 | 0 |
| 3140 | Dashboard divisi • 390 | 390 × 844 | 3 | 0 |
| 3454 | Lembar penilaian • 390 | 390 × 844 | 2 | 0 |
| 3638 | Data unit divisi • 390 | 390 × 844 | 3 | 0 |
| 3687 | KPI Kinerja • mobile | 358 × 720 | 6 | 0 |
| 3754 | Setujui penilaian? • mobile | 358 × 350 | 2 | 0 |
| 3761 | Kembalikan penilaian? • mobile | 358 × 480 | 2 | 0 |
| 3792 | Penilaian disetujui • mobile | 358 × 330 | 1 | 0 |
| 3797 | Penilaian dikembalikan • mobile | 358 × 330 | 1 | 0 |
| 3840 | Persetujuan • Tablet 1024 × 900 | 1024 × 900 | 6 | 0 |
| 4155 | Setujui Sekaligus • Kepala Divisi | 1440 × 900 | 15 | 0 |
| 4219 | Setujui 2 penilaian? | 560 × 410 | 2 | 0 |
| 4226 | 2 penilaian disetujui | 560 × 300 | 1 | 0 |
| 4994 | Login • U-1 | 1440 × 900 | 1 | 0 |
| 5022 | Login • 390 | 390 × 844 | 1 | 0 |
| 5038 | Akun • Kepala Divisi | 380 × 250 | 2 | 0 |
| 5045 | Akun • Kepala Divisi | 560 × 400 | 1 | 0 |
| 5051 | Periode penilaian | 440 × 430 | 3 | 0 |
| 5061 | Periode penilaian • mobile | 358 × 380 | 2 | 0 |
| 5069 | Notifikasi • P1 | 560 × 260 | 1 | 0 |
| 5082 | Cara pengisian nilai • P1 | 560 × 610 | 1 | 0 |
| 5092 | Cara pengisian • P1 • mobile | 358 × 460 | 1 | 0 |
| 5098 | Keluar dari akun? | 560 × 280 | 2 | 0 |
| 5150 | Detail Pengajuan | 1440 × 900 | 10 | 0 |
| 6501 | Persetujuan • Dikembalikan | 1440 × 900 | 18 | 0 |
| 6647 | Persetujuan • Disetujui | 1440 × 900 | 18 | 0 |
| 6793 | Persetujuan • Semua | 1440 × 900 | 18 | 0 |
| 7946 | Navigasi cepat • Kepala Divisi | 560 × 304 | 4 | 0 |
| 975 | Beranda • Super HC | 1440 × 900 | 20 | 0 |
| 1068 | Rekap & Finalisasi • Super HC | 1440 × 900 | 26 | 0 |
| 1159 | Master KPI • Super HC | 1440 × 900 | 18 | 0 |
| 1239 | Editor Template KPI • Super HC | 1440 × 900 | 21 | 0 |
| 1347 | Pengaturan Siklus & Kategori • Super HC | 1440 × 900 | 14 | 0 |
| 1406 | Pengguna • Super HC | 1440 × 900 | 20 | 0 |
| 1477 | Karyawan • Super HC | 1440 × 900 | 20 | 0 |
| 1542 | Struktur Organisasi • Super HC | 1440 × 900 | 28 | 0 |
| 1610 | Dashboard Analitik • Super HC | 1440 × 900 | 14 | 0 |
| 1728 | Analitik Rinci • Super HC | 1440 × 900 | 14 | 0 |
| 2033 | Detail Siap Final | 1440 × 900 | 13 | 0 |
| 2169 | KPI Kinerja | 352 × 650 | 8 | 0 |
| 2258 | Kembalikan penilaian? | 560 × 470 | 2 | 0 |
| 2270 | Finalkan 3 penilaian? | 560 × 440 | 2 | 0 |
| 2288 | Simpan perubahan pengaturan? | 560 × 360 | 2 | 0 |
| 2323 | 3 penilaian menjadi Final | 560 × 300 | 1 | 0 |
| 2328 | Pengaturan tersimpan | 560 × 300 | 1 | 0 |
| 2333 | 3 baris berhasil disalin | 560 × 300 | 1 | 0 |
| 2338 | Konsep pengingat unit | 560 × 340 | 1 | 0 |
| 2347 | Atur pengguna & cakupan | 760 × 730 | 2 | 0 |
| 2371 | Edit karyawan | 760 × 730 | 2 | 0 |
| 2396 | Edit struktur organisasi | 760 × 650 | 2 | 0 |
| 2418 | Edit baris KPI | 1000 × 730 | 3 | 0 |
| 2449 | Hapus baris KPI? | 560 × 300 | 2 | 0 |
| 2479 | Finalkan penilaian? | 560 × 420 | 2 | 0 |
| 2489 | Penilaian menjadi Final | 560 × 300 | 1 | 0 |
| 2494 | Penilaian dikembalikan | 560 × 300 | 1 | 0 |
| 2758 | Impor Master KPI • Super HC | 1440 × 900 | 18 | 0 |
| 3171 | Rekap siklus • 390 | 390 × 844 | 3 | 0 |
| 3209 | Rekap & finalisasi • 390 | 390 × 844 | 5 | 0 |
| 3253 | Master KPI • 390 | 390 × 844 | 5 | 0 |
| 3290 | Pengaturan • 390 | 390 × 844 | 2 | 0 |
| 3325 | Pengguna & struktur • 390 | 390 × 844 | 7 | 0 |
| 3359 | Data karyawan • 390 | 390 × 844 | 5 | 0 |
| 3389 | Struktur organisasi • 390 | 390 × 844 | 4 | 0 |
| 3419 | Analitik rumah sakit • 390 | 390 × 844 | 2 | 0 |
| 3499 | Template KPI • 390 | 390 × 844 | 2 | 0 |
| 3542 | Atur pengguna • 390 | 390 × 844 | 2 | 0 |
| 3575 | Edit karyawan • 390 | 390 × 844 | 2 | 0 |
| 3608 | Edit struktur • 390 | 390 × 844 | 2 | 0 |
| 3704 | KPI Kinerja • mobile | 358 × 720 | 9 | 0 |
| 3772 | Finalkan 3 penilaian? • mobile | 358 × 460 | 2 | 0 |
| 3802 | 3 penilaian Final • mobile | 358 × 330 | 1 | 0 |
| 3807 | 3 baris disalin • mobile | 358 × 330 | 1 | 0 |
| 3812 | Simpan pengaturan? • mobile | 358 × 330 | 1 | 0 |
| 3917 | Rekap Siklus • Tablet 1024 × 900 | 1024 × 900 | 8 | 0 |
| 3981 | Template KPI • Valid 100% | 1440 × 900 | 15 | 0 |
| 4065 | Lembar Final • Super HC | 1440 × 900 | 15 | 0 |
| 4143 | Buka kunci Final • OPEN | 560 × 540 | 0 | 0 |
| 5265 | Login • U-1 | 1440 × 900 | 1 | 0 |
| 5293 | Login • 390 | 390 × 844 | 1 | 0 |
| 5309 | Akun • Super HC | 380 × 250 | 2 | 0 |
| 5316 | Akun • Super HC | 560 × 400 | 1 | 0 |
| 5322 | Periode penilaian | 440 × 430 | 3 | 0 |
| 5332 | Periode penilaian • mobile | 358 × 380 | 2 | 0 |
| 5340 | Notifikasi • P1 | 560 × 260 | 1 | 0 |
| 5353 | Cara pengisian nilai • P1 | 560 × 610 | 1 | 0 |
| 5363 | Cara pengisian • P1 • mobile | 358 × 460 | 1 | 0 |
| 5369 | Keluar dari akun? | 560 × 280 | 2 | 0 |
| 5376 | Lembar penilaian • 390 | 390 × 844 | 2 | 0 |
| 5921 | Rekap • Diajukan | 1440 × 900 | 21 | 0 |
| 6066 | Rekap • Final | 1440 × 900 | 21 | 0 |
| 6211 | Rekap • Dikembalikan | 1440 × 900 | 20 | 0 |
| 6345 | Rekap • Semua | 1440 × 900 | 22 | 0 |
| 7088 | Pilih penilaian | 560 × 300 | 1 | 0 |
| 7096 | Rekap • Pilihan 000 | 1440 × 900 | 26 | 0 |
| 7211 | Rekap • Pilihan 001 | 1440 × 900 | 26 | 0 |
| 7326 | Rekap • Pilihan 010 | 1440 × 900 | 26 | 0 |
| 7441 | Rekap • Pilihan 011 | 1440 × 900 | 26 | 0 |
| 7556 | Rekap • Pilihan 100 | 1440 × 900 | 26 | 0 |
| 7671 | Rekap • Pilihan 101 | 1440 × 900 | 26 | 0 |
| 7786 | Rekap • Pilihan 110 | 1440 × 900 | 26 | 0 |
| 7901 | Finalkan 1 penilaian? | 560 × 440 | 2 | 0 |
| 7911 | 1 penilaian menjadi Final | 560 × 300 | 1 | 0 |
| 7916 | Finalkan 2 penilaian? | 560 × 440 | 2 | 0 |
| 7926 | 2 penilaian menjadi Final | 560 × 300 | 1 | 0 |
| 7957 | Navigasi cepat • Super HC | 560 × 448 | 7 | 0 |
| 2577 | State • empty | 1440 × 900 | 13 | 0 |
| 2599 | State • loading | 1440 × 900 | 12 | 0 |
| 2623 | State • error | 1440 × 900 | 13 | 0 |
| 2645 | State • conflict | 1440 × 900 | 13 | 0 |
| 2667 | State • forbidden | 1440 × 900 | 13 | 0 |
| 2689 | State • session | 1440 × 900 | 13 | 0 |
| 2711 | Validasi & focus input | 1440 × 900 | 14 | 0 |
| 5437 | Review desain & handoff | 1440 × 900 | 0 | 0 |
