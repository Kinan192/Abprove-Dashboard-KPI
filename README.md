# KPI Kinerja

Aplikasi MVC Laravel 13, PHP 8.3+, MySQL, Blade, Tailwind CSS 4, Vite, dan JavaScript native. Better Auth pada `services/auth` menangani autentikasi; aturan bisnis tetap di Laravel.

## Menjalankan proyek

Untuk instalasi baru, salin `.env.example` menjadi `.env` dan isi koneksi database:

```powershell
composer install
npm.cmd ci
php artisan key:generate
php artisan kpi:auth-key
php artisan migrate
php artisan kpi:create-admin
npm.cmd run build
npm.cmd run start
```

`kpi:create-admin` hanya untuk akun **Admin** pertama; kata sandi diminta interaktif. Akun Super HC, Kepala Divisi, dan Kepala Unit dibuat Admin dari menu Akun Pengguna. Tidak ada seeder data contoh. Jangan menjalankan `key:generate` ulang pada instalasi yang sudah memiliki `APP_KEY`.

Email pengingat memakai mailer Laravel (SMTP). Isi `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, dan `MAIL_FROM_ADDRESS` pada `.env`. Dengan `QUEUE_CONNECTION=sync` email dikirim langsung; dengan `QUEUE_CONNECTION=database` jalankan `php artisan queue:work`.

Buka http://127.0.0.1:8000/login. `npm.cmd run start` menjalankan Laravel dan Better Auth. Alternatif: `npm.cmd run auth:start` dan `php artisan serve` pada terminal terpisah. Untuk pengembangan frontend, jalankan `npm.cmd run dev`.

Document root webserver harus menunjuk ke `public/`. Better Auth dan MySQL harus aktif agar login dan halaman berakun dapat digunakan.

## Struktur MVC

- `app/Models`: model Eloquent dan penjagaan data.
- `app/Http/Controllers`: endpoint per area — `Admin/` (akun, log, pengingat), `SuperHc/` (struktur, mutasi, KPI & periode, aktivitas), `Auth/`, dan controller bersama KU/KD/HC di root (penilaian, dashboard, workspace, notifikasi, profil).
- `app/Http/Requests`: validasi per area (`Admin`, `Assessment`, `KpiMaster`, `Notification`, `Organization`, `Reporting`); mutasi turunan `MutationRequest` (wajib `request_id`).
- `app/Services`: transaksi dan aturan bisnis per domain (`Admin`, `Assessment`, `KpiMaster`, `Notification`, `Organization`, `Reporting`, `IdentityAccess`, `Audit`); `app/Queries`: query baca terikat cakupan akun; `app/Policies`: otorisasi record.
- `app/Jobs`, `app/Mail`: pengiriman email pengingat; `app/ViewModels`: metadata presentasi untuk Blade.
- `resources/views`: per fitur — `admin`, `assessments`, `dashboard`, `reports`, `kpi`, `organization`, `team`, `notifications`, `guide`, `profile`, `layouts`, `components`, `emails`.
- `resources/js`: `app.js` (bootstrap), `abprove/` (modul halaman bersama), `abprove/org/` (struktur & mutasi), `kpi-workspace/` (pola KPI & periode), `admin/` (halaman Admin).
- `routes/web.php` + `routes/web/{roles,hc,admin}.php`, `database`, `config`, `bootstrap`: rute, migrasi, skema, dan konfigurasi Laravel.
- `services/auth`: layanan Better Auth.
- `tools`: launcher dan pendukung HTTP yang dipakai aplikasi.

Lihat [struktur lengkap](docs/STRUCTURE.md), [arsitektur](docs/architecture/ARCHITECTURE.md), dan [rute](docs/architecture/ROUTES.md).

## Data dan perilaku bisnis

**Admin** mengelola akun login (buat, ubah, nonaktifkan, hapus akun tanpa histori, atur ulang kata sandi), membaca seluruh log (aktivitas, login/logout termasuk percobaan gagal, status email), dan mengirim email pengingat pengisian/persetujuan KPI. **Super HC** mengelola struktur, staf, penunjukan dan mutasi kepala/staf, KPI, dan periode; Super HC tidak lagi mengelola akun. KU menilai staf; KD menyetujui/mengembalikan pengajuan serta menilai Kepala Unit. Penilaian Final hanya baca. Akses data dibatasi role dan area.

**KPI & Periode** memakai **Pola KPI**: satu pola berisi daftar KPI formula dan bobot yang wajib tepat 100%; satu orang memakai satu pola per periode. Pola diterapkan massal ke staf hasil filter Divisi → Unit → Jabatan (mis. pola Bidan dan Perawat dalam satu unit). Langkah *Cek bobot* menampilkan seluruh staf eligible termasuk yang belum punya pola (0%), dan periode hanya bisa dibuka bila semuanya lengkap. Pola dapat disalin ke periode berikutnya. Snapshot penilaian yang telah tersimpan tetap dipertahankan sebagai histori.

**Mutasi**: Super HC dapat mengganti, memindahkan, menukar, atau melepas kepala unit/divisi secara atomik, serta memutasi satu atau banyak staf per bulan efektif. Setiap mutasi menampilkan pratinjau dampak dari server sebelum dikonfirmasi.

**Efisiensi data**: halaman hanya memuat section dan jendela bulan yang dibutuhkan (`config.sections`), dashboard memakai agregasi SQL (`/data/dashboard`), dan daftar log/aktivitas/akun memakai pagination server.

KPI dan periode disimpan pada server, bukan data dummy atau localStorage bisnis. Database, akun, file privat, dan `.env` lokal tidak dihapus oleh pembersihan source. Jangan menjalankan `migrate:fresh` pada database berisi data.

Gunakan migrasi Laravel untuk instalasi baru; jangan mengimpor snapshot SQL lalu menjalankan baseline migrasi pada database yang sama. Lihat [panduan migrasi](docs/database/MIGRATION-V2.md), [skema](docs/database/SCHEMA.md), dan [kontrak transaksi](docs/database/TRANSACTIONS-V2.md).

## Frontend dan pemeriksaan

Entri frontend: `resources/css/app.css` dan `resources/js/app.js`. Gunakan utility Tailwind atau `@apply` untuk styling umum. CSS khusus dipertahankan untuk token tema, grafik, dan perilaku responsif yang membutuhkan selector khusus.

Tampilan memakai komposisi visual 60:30:10: netral untuk kanvas dan area baca, emerald untuk navigasi serta ringkasan utama, dan aksen terbatas untuk perhatian/status. Dashboard KU/KD/HC memakai card padat, tren rerata nilai Final, perbandingan nilai sesuai cakupan role, dan sebaran kategori. Ketuntasan tetap menjadi metrik operasional ringkas, bukan seri tren utama. Panel mengikuti tinggi kontennya; jadwal lengkap dapat dibuka saat diperlukan. Atur token dan komponen umum di `resources/css/app.css`; gaya dashboard di `role-dashboard.css` dan editor KPI di `kpi-workspace*.css`. Pertahankan atribut `data-*`, ID form/dialog, dan kontrak API saat mengubah layout.

Daftar panjang di dashboard memakai scroll lokal pada pembungkus tabel dengan header tabel tetap terlihat. Header aplikasi dan navigasi tetap dapat dijangkau tanpa menggulir kembali ke awal; pada layar kecil konten halaman tetap boleh bergulir agar tidak terpotong.

```powershell
npm.cmd run build
php artisan route:list --except-vendor
```

Sandbox review, prototype terpisah, test case, screenshot, laporan pengujian, dan arsip desain tidak disertakan. Dependency dan aset runtime tetap dipertahankan. Setelah memindahkan atau menambah kelas PHP, jalankan `composer dump-autoload`.

Acuan fitur: [revisi per role](docs/requirements/REVISI-PER-ROLE-v1.4.md), [alur penilaian](docs/requirements/ALUR-KPI-v1.3.md), dan [PRD](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md).
