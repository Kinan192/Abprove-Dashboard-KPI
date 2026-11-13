# KPI Kinerja

Root: D:\Produktif\BantuanIT File\Project\KPI-Kinerja-UIUX.

Laravel 13, PHP 8.3+, MySQL 8.4, Blade, Tailwind 4, Vite dan JavaScript native. Better Auth 1.7.18 pada Node 22 menangani login dan sesi. Backend bisnis tetap PHP/Laravel; Python dipakai untuk otomasi dokumen desain dan pengujian MySQL terisolasi.

## Status

- **Layout Dashboard v2, 13 November 2026:** [panduan review](docs/frontend/simple-dashboard/README.md). Workspace putih, empat kartu, tren lebar, donat kategori dan agenda. HC memakai ketuntasan bulanan serta KPI dengan rata-rata terendah sebagai pengganti progres divisi/temuan staf. Sidebar hijau 232 px, navbar 64 px, tanpa Beranda. Chart.js dimuat khusus Dashboard. Panel Filter memakai dua kolom dan chip aktif; tabel mendukung 10/25/50 baris. Build, 49 skenario UI, 39 tes formula/model dan delapan skenario prototype lulus. [FigCraft acuan](design/prototypes/KPI-Kinerja-UIUX-Simple-Dashboard.figcraft) sebelumnya berisi 50 screen dan 693 navigasi; sumber tanggal 8 tetap utuh. Jangan generate gambar/screenshot untuk pekerjaan berikutnya. **Penyegaran visual 13 November:** aksen hijau `#0B6B57`, tombol/field radius 8 px, kartu radius 12 px, tabel 13 px tanpa garis vertikal, status berbentuk pill, label grup sidebar, serta tabel menjadi kartu dua kolom pada 601–900 px. Rincian [di sini](docs/frontend/simple-dashboard/README.md#penyegaran-visual-13-november-2026).

- [Revisi UI per role v1.4](docs/frontend/role-refinement/README.md) menerapkan kebutuhan terbaru pada Isi nilai/Pengajuan/KPI Unit, Persetujuan, laporan dan administrasi HC. Cakupan KPI serta tab Pengguna pada periode dihapus; pilar menjadi fleksibel. [Matriks kebutuhan](docs/requirements/REVISI-PER-ROLE-v1.4.md). Gaya dan UI di luar daftar revisi tetap memakai hasil sebelumnya.

- **KPI & Periode frontend utama, 13 November 2026:** halaman HC `/hc/kpi-templates` dan `/hc/settings` sekarang menjalankan UI design-review apa adanya: tab KPI/Goals, Periode, Monitoring; form KPI bertahap dengan metode, formula, variabel, dan penerima; daftar periode; monitoring. Data disimpan server-side pada tabel `kpi_workspace_documents` melalui `GET/PUT /hc/kpi-workspace` dengan revision check. Contoh tersimpan: KPI unit IT "Contoh KPI Formula April" (bobot 100%, penerima Anggota IT Contoh 01), periode November 2026 dan Desember 2026. Tabel KPI/assessment lama tetap dipakai Dashboard, Rekap, dan penilaian sampai tahap penyatuan berikutnya; modul KPI baru tidak lagi memakai localStorage.

- Layout sebelum redesign mengikuti **HTML/JPG ABprove pada perbandingan design-review**, dengan tab/button ringkas. Struktur fitur dan pagination KPI 5/data 10 dipertahankan dalam redesign. [Riwayat perapian sebelumnya](docs/frontend/compact-tabs-status/README.md).
- Schema **v2.0** sudah dirancang dan diuji: 20 tabel domain, FK/CHECK/UNIQUE, snapshot, versi KPI dan perlindungan Final. [Schema](docs/database/SCHEMA.md), [ERD](docs/database/ERD.md).
- Backend **v2.0** sudah diimplementasikan sesuai alur v1.3: akun kepala terpisah dari staf, KPI Unit/Divisi, kirim lengkap tanpa Draft, keputusan KD, CRUD terjaga dan API pendukung. [Kontrak](docs/backend/v2/README.md).
- Database lokal aktif **kpi_kinerja_v3_dev**. Database lama **kpi_kinerja_dev** tetap utuh dan tidak diimpor otomatis. [Catatan aktivasi](docs/backend/v3/local-activation.json).
- Seluruh halaman role memakai API dan MySQL nyata: organisasi/staf, KPI, periode, penilaian/persetujuan Final, profil, notifikasi dan laporan. Data bisnis aplikasi berakun tidak disimpan ke localStorage. [Panduan integrasi v3](docs/backend/v3/README.md).

## Menjalankan layout saat ini

```powershell
npm.cmd ci
php artisan migrate
php artisan kpi:auth-key
php artisan optimize:clear
npm.cmd run build
npm.cmd run start
```

Buka http://127.0.0.1:8000/login. Perintah start menjalankan PHP dan Better Auth sekaligus. Alternatif dua terminal: npm.cmd run auth:start dan php artisan serve. /design-review tetap sandbox audit lokal yang terpisah. Navigasi mengikuti role akun, tanpa tombol pergantian role. npm.cmd run dev menjalankan Vite saat pengembangan.

Untuk Laragon, document root harus public/ dan layanan auth Node tetap berjalan. Database lama tidak direset; backup konfigurasi sebelumnya ada di storage/app/private/integration-backup/.env.before-v3.

## Memasang schema/backend v2

Ikuti [panduan adopsi](docs/database/MIGRATION-V2.md). Gunakan database baru/kosong untuk mencoba v2, arahkan koneksi dengan sengaja, lalu jalankan migration Laravel. Migration 000005 berhenti sebelum DDL jika menemukan data lama.

Seeder kini menyediakan **100 orang**: 4 Super HC, 4 Kepala Divisi, 8 Kepala Unit, dan 84 staf tanpa akun (11 staf pada empat unit, 10 staf pada empat unit lainnya). Instalasi baru mendapat 7 indikator per KPI area agar pagination 5 indikator dapat diuji. Ada contoh Belum diisi, Diajukan, Dikembalikan dan Final. Kredensial acak tersimpan lokal di storage/app/private/local-demo-accounts.json. Contoh email: hc.demo@kpi.test, kd.umum@kpi.test, ku.it@kpi.test. [Daftar akun dan tim](docs/backend/LOCAL_DEMO_SEEDER.md).

Jangan mengimpor SQL schema dan menjalankan baseline migrations pada database yang sama. Konversi database lama memerlukan mapping akun/employee kepala, template jabatan ke Unit/Divisi, histori, serta validasi Final. Tidak ada konversi atau pembuangan draft legacy otomatis.

## Perilaku bisnis

HC membuat akun KU/KD dahulu, kemudian jabatan, divisi/unit dengan kepala, staf tanpa akun, KPI dan periode. KPI Unit dipakai KU menilai staf; KPI Divisi dipakai KD menilai Kepala Unit.

GET form tidak membuat assessment. Semua angka integer 10-100 dikirim atomik, bobot 100%. Staf diajukan KU, lalu KD mengembalikan dengan alasan atau menetapkan Final. Kepala Unit dinilai KD dan langsung Final. HC mengelola dan memantau tanpa mengubah/menyetujui nilai. Final hanya baca. Pembatalan pengajuan KU menghapus nilai aktif, tetap mencatat audit/retry.

## Pengujian

```powershell
python tools/testing/validate_schema_v2.py
python tools/testing/run_backend_tests.py
php vendor/bin/pint --test app routes database/seeders tests/Feature tests/Support
npm.cmd run verify:design
```

Pengujian mencakup tes Laravel, Better Auth asli, HTTP dan browser pada MySQL sementara. Database Laragon tidak menjadi fixture. Komposisi aktif mengikuti perbandingan HTML/JPG ABprove, dengan tab sesuai koreksi terbaru; font, logo dan palet dipertahankan. Bukti backend ada di docs/backend/v3/ dan bukti UI terbaru di docs/frontend/compact-tabs-status/.

[Validasi database](docs/database/VALIDATION.md), [hasil backend terbaru](docs/backend/v3/test-result.json), [tab ringkas dan status](docs/frontend/compact-tabs-status/README.md), [penyesuaian awal terhadap acuan UI](docs/frontend/reference-alignment/README.md), [baseline UI historis](docs/frontend/approved-layout/manifest.json).

## Dokumentasi dan arsip

[Alur v1.3](docs/requirements/ALUR-KPI-v1.3.md), [PRD rujukan v1.2](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md), [arsitektur](docs/architecture/ARCHITECTURE.md), [handoff frontend](docs/backend/FRONTEND_HANDOFF.md), [struktur root](docs/STRUCTURE.md).

Snapshot layout disetujui: archive/frontend/2026-11-10-approved-layout. Source backend sebelum v2: archive/backend/2026-11-10-before-domain-v2. FigCraft pada design/prototypes adalah riwayat rancangan; acuan visual aktif tetap ABprove yang telah disetujui. PDF yang disetujui dipertahankan.
