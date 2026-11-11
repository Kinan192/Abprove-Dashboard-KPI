# KPI Kinerja

Root: D:\Produktif\BantuanIT File\Project\KPI-Kinerja-UIUX.

Laravel 13, PHP 8.3+, MySQL 8.4, Blade, Tailwind 4, Vite dan JavaScript native. Backend tetap PHP/Laravel; Python hanya menjalankan pengujian MySQL terisolasi.

## Status

- Layout saat ini **sudah disetujui sebagai baseline sementara layout-1.0**. Sidebar 232 px, navbar 64 px, pagination/tab/dialog dan responsivitas dipertahankan. [Baseline dan hash](docs/frontend/approved-layout/README.md).
- Schema **v2.0** sudah dirancang dan diuji: 20 tabel domain, FK/CHECK/UNIQUE, snapshot, versi KPI dan perlindungan Final. [Schema](docs/database/SCHEMA.md), [ERD](docs/database/ERD.md).
- Backend **v2.0** sudah diimplementasikan sesuai alur v1.3: akun kepala terpisah dari staf, KPI Unit/Divisi, kirim lengkap tanpa Draft, keputusan KD, CRUD terjaga dan API pendukung. [Kontrak](docs/backend/v2/README.md).
- Database Laragon lama belum dikonversi. API bisnis menolak schema lama dengan 503; source/UI, login/logout dan audit tetap tersedia.
- Data bisnis frontend masih simulasi browser. Binding formulir/tabel ke API v2 menjadi tahap integrasi berikutnya, dengan layout yang sudah disetujui.

## Menjalankan layout saat ini

```powershell
npm.cmd ci
npm.cmd run build
php artisan serve
```

Buka http://127.0.0.1:8000/login untuk akun/session asli, atau http://127.0.0.1:8000/design-review untuk audit tanpa login pada environment local/testing. Navigasi aplikasi mengikuti role, tanpa tombol pergantian role. npm.cmd run dev menjalankan Vite saat pengembangan.

Untuk Laragon, document root harus public/. Database saat ini tidak direset oleh revisi schema/backend.

## Memasang schema/backend v2

Ikuti [panduan adopsi](docs/database/MIGRATION-V2.md). Gunakan database baru/kosong untuk mencoba v2, arahkan koneksi dengan sengaja, lalu jalankan migration Laravel. Migration 000005 berhenti sebelum DDL jika menemukan data lama.

Seeder v2 menyediakan enam akun latihan, struktur dan dua jenis KPI pada environment local/dev/demo. Kredensial acak tersimpan lokal di storage/app/private/local-demo-accounts.json; tidak dicetak ke source. [Panduan akun contoh](docs/backend/LOCAL_DEMO_SEEDER.md).

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

65 pemeriksaan SQL dan 67 tes Laravel/595 assertion lulus pada MySQL sementara. HTTP nyata menguji CSRF, session, login/logout. Database Laragon pengguna tidak menjadi fixture pengujian. Layout tetap cocok dengan seluruh 55 hash source baseline; bukti UI awal mencakup 65 tes browser dan tiga viewport.

[Validasi database](docs/database/VALIDATION.md), [hasil backend](docs/backend/v2/test-result.json), [baseline UI](docs/frontend/approved-layout/manifest.json), [audit UI](docs/frontend/compact-crud/README.md).

## Dokumentasi dan arsip

[Alur v1.3](docs/requirements/ALUR-KPI-v1.3.md), [PRD rujukan v1.2](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md), [arsitektur](docs/architecture/ARCHITECTURE.md), [handoff frontend](docs/backend/FRONTEND_HANDOFF.md), [struktur root](docs/STRUCTURE.md).

Snapshot layout disetujui: archive/frontend/2026-11-10-approved-layout. Source backend sebelum v2: archive/backend/2026-11-10-before-domain-v2. FigCraft pada design/prototypes adalah riwayat rancangan; acuan visual aktif tetap ABprove yang telah disetujui. PDF yang disetujui dipertahankan.
