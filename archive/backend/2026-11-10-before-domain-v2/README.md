# KPI Kinerja

Root aplikasi: `D:\Produktif\BantuanIT File\Project\KPI-Kinerja-UIUX`.

Stack aktif: **Laravel 13, PHP 8.3+, MySQL 8.4, Blade, Tailwind CSS 4, Vite dan JavaScript native**. Alpine sudah dihapus dari dependency, runtime dan view aktif. Desain ABprove dari HTML/30 JPG diterapkan langsung pada frontend proyek utama.

## Jalankan

```powershell
npm.cmd ci
npm.cmd run build
php artisan serve
```

- Aplikasi: `http://127.0.0.1:8000/login` memakai akun dan session asli. Dashboard mengikuti role akun yang login.
- Audit tanpa login: `http://127.0.0.1:8000/design-review` membuka 37 entry katalog Blade dengan pembanding JPG, viewport dan dialog. Halaman audit hanya tersedia pada lingkungan local/testing.
- Frontend bisnis saat ini memakai **data contoh lokal di browser**, sesuai permintaan audit sebelum integrasi. Form penilaian, pengelolaan, profil dan pengaturan belum mengubah database. Login/logout tetap nyata.
- `npm.cmd run dev` menjalankan Vite untuk pengembangan aset. `npm.cmd run preview:design` menjalankan Laravel pada port 8000.

Untuk Laragon, document root mengarah ke `public/`. MySQL pengembangan tetap `kpi_kinerja_dev`; tidak ada reset atau migrasi database dalam refactor frontend ini. Pada komputer baru, ikuti [panduan backend](docs/backend/README.md) untuk konfigurasi `.env`, Composer dan migrations.

Seeder lokal yang sudah tersedia tetap dapat digunakan: `php artisan db:seed`. Enam akun latihan dan lokasi password acak dijelaskan di [panduan seeder](docs/backend/LOCAL_DEMO_SEEDER.md). Akun contoh ABprove pada audit desain terpisah dari akun database.

## Implementasi aktif

Alur terbaru: [v1.3](docs/requirements/ALUR-KPI-v1.3.md). HC membuat akun kepala sebelum struktur; staf tanpa akun. HC menyusun KPI Unit untuk staf dan KPI Divisi untuk Kepala Unit. Sistem Draft penilaian dihapus pada frontend; pengisian wajib lengkap sebelum dikirim. Backend bisnis lama belum diintegrasikan ke alur baru.

- View Blade per role dan komponen bersama untuk shell, ikon, tabel nilai, status serta dialog.
- Sidebar hijau 232 px dan navbar 64 px. Tabel ringkas memakai pagination; rincian memakai tab/dialog. Acuan 1440 x 900, dengan penyesuaian tablet/ponsel.
- Kepala Unit mengisi anggota unitnya; Kepala Divisi meninjau angka anggota tanpa mengubahnya, menetapkan Final atau mengembalikan, serta menilai Kepala Unit. Super HC mengelola data dan memantau rekap.
- Dalam simulasi, nilai integer 10-100, bobot 100%, periode lampau dan Final hanya baca. Tidak ada tombol pergantian role pada shell aplikasi.
- Backend MVC, policies, scope, validasi, transaksi, CSRF, UUID retry dan lock_version tetap tersedia. Integrasi ulang data bisnis menunggu audit manual pengguna.

Rincian halaman, batas simulasi dan bukti visual: [frontend Blade ABprove](docs/frontend/compact-crud/README.md).

## Pengujian

```powershell
npm.cmd run build
npm.cmd run test:design
npm.cmd run verify:design
python tools/testing/run_backend_tests.py
```

Tes desain memakai halaman Laravel pada port 8008. Verifikasi dapat menjalankan server Laravel audit 8008 sementara bila belum tersedia. Runner backend menguji PHP/Laravel pada MySQL sementara yang terisolasi; Python hanya alat pengujian. Database Laragon pengguna tidak dipakai untuk fixture uji.

[Hasil browser](docs/frontend/compact-crud/browser-report.json), [verifikasi stack/visual](docs/frontend/compact-crud/verification.json), [backend](docs/backend/test-result.json), [quality gate](docs/frontend/compact-crud/QUALITY_GATE.md).

## Dokumen

- [PRD aktif v1.2](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md), [arsitektur](docs/architecture/ARCHITECTURE.md), [schema](docs/database/SCHEMA.md), [struktur](docs/STRUCTURE.md).
- [Kontrak backend](docs/backend/README.md), [keputusan domain](docs/backend/DECISIONS.md).
- [FigCraft historis](design/prototypes/KPI-Kinerja-UIUX.figcraft). Acuan visual terbaru adalah ABprove yang diberikan pengguna.
- `archive/frontend/2026-11-09-before-blade-refactor` menyimpan frontend Blade/Alpine terdahulu. `frontend/abprove-preview` dan hasil `docs/frontend/abprove-review` adalah jejak preview statis sebelumnya, bukan aplikasi aktif.
