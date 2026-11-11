# KPI Kinerja

**Revisi ABprove untuk audit manual:** buka [indeks audit frontend](frontend/abprove-preview/audit.html), atau jalankan `npm.cmd run preview:design` lalu akses `http://127.0.0.1:4174/`. Revisi ini menggunakan HTML dan 30 JPG acuan terbaru, berdiri sendiri dan belum terhubung backend. [Panduan preview](frontend/abprove-preview/README.md) dan [catatan audit](docs/frontend/abprove-review/README.md).

Aplikasi MVC Laravel 13, PHP 8.3+, MySQL 8.4, Blade, Alpine dan Vite. Root aplikasi: `D:\Produktif\BantuanIT File\Project\KPI-Kinerja-UIUX`. Frontend mengikuti FigCraft: sidebar 232 px, navbar 64 px, container dashboard dengan scroll internal, serta tampilan tablet dan ponsel.

Keputusan terbaru: **ACC Kepala Divisi langsung Final**. Kepala Divisi juga mengisi penilaian Kepala Unit di divisinya. Super HC mengelola organisasi, akun, KPI, periode, dan laporan tanpa hak keputusan nilai.

## Menjalankan lokal

Database **kpi_kinerja_dev** sudah dibuat dan empat migration sudah dijalankan pada Laragon MySQL 8.4.3. Database lama **kpi_kinerja** tidak diubah. `.env` lokal sudah mempunyai APP_KEY; tidak ada akun atau password default.

Jalankan PowerShell di root project:

```powershell
php artisan kpi:create-admin
npm.cmd ci
npm.cmd run build
php artisan serve
```

Command pertama hanya diperlukan saat belum mempunyai akun Super HC; nama, email, dan kata sandi diminta secara interaktif. Buka `http://127.0.0.1:8000/login` untuk halaman login. Role dan cakupan mengikuti akun yang login. HC menyiapkan struktur, akun kepala, karyawan, penugasan, template dan periode melalui UI. Untuk pengembangan aset, gunakan `npm.cmd run dev` pada terminal kedua. Node 22.12+ diperlukan oleh Vite.

Browser menerima Blade; request dengan `Accept: application/json` menerima kontrak JSON yang sama. Alur API dan contoh payload ada di [panduan backend](docs/backend/README.md). Inventaris halaman, urutan persiapan data, dan bukti visual ada di [panduan frontend](docs/frontend/README.md).

Pada komputer baru: `composer install`, salin `.env.example` menjadi `.env`, atur koneksi database kosong, `php artisan key:generate`, lalu `php artisan migrate`. Jangan mengimpor SQL baseline ke database yang sama dengan migrations. Untuk Apache/Nginx Laragon, document root wajib menunjuk folder **public**.

Untuk mencoba seluruh role dengan data contoh lokal, jalankan `php artisan db:seed`. Seeder menyediakan enam akun pada dua divisi/tiga unit, KPI, anggota dan periode latihan. Password acak awal disimpan di `storage/app/private/local-demo-accounts.json` yang diabaikan Git. Akun yang sudah ada tidak direset. Daftar akun dan alur latihan: [panduan seeder lokal](docs/backend/LOCAL_DEMO_SEEDER.md).

## Cakupan implementasi

- Login email/NIP, logout, timeout 30 menit, pembatasan percobaan login, akun/penugasan aktif diperiksa setiap request.
- Banyak divisi/unit, akun dan kelayakan role, kepala area, penempatan/pemindahan dengan preview dan guard dampak.
- Template KPI berversi, bobot tepat 100%, masa berlaku tidak overlap, jadwal/kategori periode tervalidasi.
- Draft, pengajuan, tarik kembali, pengembalian beralasan, ACC langsung Final, penilaian Kepala Unit oleh Kepala Divisi.
- Perhitungan DECIMAL dari generated column MySQL, snapshot, audit atomik, lock_version, UUID untuk retry, bulk ACC atomik.
- Dashboard/progres, anggota/tim, daftar/detail/timeline, rekap JSON dan TSV sesuai cakupan.
- Seluruh menu tiga role, dialog konfirmasi, validasi, feedback, pencarian/filter, pagination dan state kosong/loading/error terhubung ke backend.
- Analitik Final, matriks riwayat, perbandingan/salin bulan sebelumnya yang kompatibel, serta preview impor CSV/XLSX sebelum penyimpanan template.

## Pengujian

```powershell
python tools/testing/run_backend_tests.py
php tools/testing/run_frontend_tests.php
npm.cmd run build
php vendor/bin/pint --test
```

Kedua runner membuat server/datadir MySQL 8.4 sementara dan menghentikannya setelah pengujian. Database Laragon tidak digunakan untuk fixture uji. Runner browser memakai Chrome lokal dan Playwright yang terpasang lewat npm. Hasil: [backend](docs/backend/test-result.json), [browser](docs/frontend/browser-report.json), [review desain](docs/frontend/DESIGN_REVIEW.md), dan [quality gate](docs/frontend/QUALITY_GATE.md). Pengujian beban, deployment, backup/restore produksi, serta UAT pilot belum dilakukan.

## Acuan aktif

- [PRD v1.2](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md), [arsitektur](docs/architecture/ARCHITECTURE.md), [schema](docs/database/SCHEMA.md), [routes](docs/architecture/ROUTES.md), [struktur](docs/STRUCTURE.md).
- [Kontrak backend dan contoh request](docs/backend/README.md), [keputusan/guard](docs/backend/DECISIONS.md).
- [FigCraft](design/prototypes/KPI-Kinerja-UIUX.figcraft) dan [penyesuaian kewenangan frontend](docs/backend/FRONTEND_HANDOFF.md). Frontend menerapkan keputusan KD terbaru; file prototype lama dipertahankan sebagai sumber visual.
- Dokumen fondasi terdahulu disimpan di `archive/foundation`; dokumen sumber pengguna dan aset desain tetap tersedia.

Panel notifikasi merangkum tugas dari data periode, tanpa status baca atau pengiriman otomatis. Akses karyawan, penilaian Kepala Divisi, SSO, delegasi/multi-penugasan, kebijakan histori tambahan, dan unlock masih menunggu keputusan PRD. Guard konservatif backend tetap berlaku.
