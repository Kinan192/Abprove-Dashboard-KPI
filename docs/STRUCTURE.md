# Struktur proyek

Satu aplikasi MVC Laravel dengan frontend Blade/Tailwind; tidak ada proyek frontend salinan atau sandbox review.

```text
app/
  Http/Controllers/      Endpoint HTTP: Admin/, SuperHc/, Auth/, dan controller bersama KU/KD/HC
  Http/Requests/         Validasi input per area (Admin, Assessment, KpiMaster, Notification, Organization, Reporting)
  Http/Middleware/       Autentikasi, konteks role, dan response
  Jobs/, Mail/          Pengiriman email pengingat (antrean Laravel)
  Models/               Model Eloquent, relasi, casts, dan penjagaan data
  Policies/             Otorisasi record
  Queries/              Query baca terikat cakupan akun (workspace, tugas, cakupan)
  Rules/                Aturan validasi domain
  Services/             Transaksi dan aturan bisnis per domain
  Support/              Pendukung runtime lintas modul
  ViewModels/           Metadata presentasi dan profil data per halaman
bootstrap/              Bootstrap Laravel dan cache runtime
config/                 Konfigurasi aplikasi
database/
  migrations/           Migrasi dan snapshot SQL yang dipakai migrasi
  schema/               Referensi skema database
  seeders/              Entri seeder tanpa data contoh
docs/
  architecture/         Arsitektur dan rute aplikasi
  database/             Skema, ERD, dan panduan migrasi
  requirements/         Kebutuhan fitur
public/                 Document root; build/ dihasilkan Vite
resources/
  css/                  Tailwind, token, dan styling komponen aktif
  fonts/                Font aktif beserta lisensi
  images/               Logo aplikasi aktif
  js/                   Entri JavaScript dan modul fitur
    abprove/            Modul halaman bersama (store, penilaian, laporan, dashboard, profil)
    abprove/org/        Struktur & staf, wizard kepala, mutasi staf, riwayat aktivitas Super HC
    admin/              Akun pengguna, log sistem, pengingat email
    kpi-workspace/      Periode, pola KPI, penerapan ke staf, cek bobot, dan monitoring Super HC
  views/                Blade per fitur: admin, assessments, dashboard, reports, kpi, organization,
                        team, notifications, guide, profile, emails, layouts, components
routes/                 web.php (auth + include), web/roles.php, web/hc.php, web/admin.php, console.php
services/auth/          Autentikasi Better Auth
storage/                File privat, sesi, cache, dan log runtime
tools/                  Launcher, identitas proyek, dan pendukung HTTP
```

`vendor/` dan `node_modules/` adalah dependency terpasang, bukan source duplikat. Lockfile dipertahankan untuk instalasi yang dapat direproduksi. `.env`, data database, upload, dan backup privat tetap dipertahankan.

Model menangani data, controller tipis menangani HTTP, FormRequest menangani validasi, service menangani transaksi dan aturan bisnis, query class menangani baca terikat cakupan, dan Blade menangani presentasi. Nama folder view mengikuti fitur, bukan versi desain.
