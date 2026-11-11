# KPI Kinerja

Root project: `D:\Produktif\BantuanIT File\Project\KPI-Kinerja-UIUX`.

Tahap sekarang: struktur MVC standar Laravel, rancangan backend, dan schema MySQL. Frontend serta fitur backend belum diimplementasikan. Belum ada vendor, artisan, composer install, autentikasi, endpoint bisnis atau migrasi Laravel yang berjalan.

## Peta project

```text
app/                    Model, Controller, Requests, Policies, Services, Queries (reserved)
resources/views/        View Blade per role (reserved)
routes/                 Kerangka route tanpa endpoint bisnis
database/schema/        DDL kanonis MySQL
database/migrations/    Urutan konversi migration mendatang
docs/architecture/      Arsitektur MVC dan kontrak routing
docs/database/          Kamus schema, ERD, dan hasil validasi
docs/requirements/      PRD v1.1 dan referensi design system
docs/design/            Handoff serta laporan prototype
design/prototypes/      File FigCraft terbaru
design/previews/        PNG preview
design/archive/         Backup desain dan laporan terdahulu
archive/source/         Tiga file sumber pengguna, tanpa perubahan
tests/Database/         Fixture dan kasus uji integritas schema
tools/database/         Runner validasi schema pada instance uji terisolasi
```

Mulai dari [arsitektur](docs/architecture/ARCHITECTURE.md), [schema](docs/database/SCHEMA.md), [ERD](docs/database/ERD.md), dan [validasi](docs/database/VALIDATION.md). Acuan kebutuhan: [PRD](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.1.md).

DDL: [database/schema/schema.mysql.sql](database/schema/schema.mysql.sql). Ditujukan untuk database kosong; tidak membuat atau menjatuhkan database dan tidak mengandung password/admin default. Jangan menjalankan SQL arsip sebagai bootstrap kedua.

PHP >=8.3 / Laravel 13 direncanakan mengikuti sumber. Target database MySQL 8.4 LTS. Framework belum diinisialisasi; langkah composer/artisan baru dilakukan pada tahap implementasi. Session/cache file dan queue sync pada .env.example menghindari ketergantungan tabel infrastruktur yang belum dibuat.

UI: [FigCraft](design/prototypes/KPI-Kinerja-UIUX.figcraft), [preview tim](design/previews/Super-HC-Divisi-Tim.png), [handoff](docs/design/TEAM_MANAGEMENT.md). File lama dipertahankan dan dapat ditelusuri pada [manifest](docs/FILE_ORGANIZATION.md).
