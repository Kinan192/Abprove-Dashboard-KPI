# Struktur project

Root ini satu aplikasi MVC Laravel; frontend/backend tidak dipisah menjadi project bersarang.

```text
app/Http/Controllers/    Auth, assessment, reporting, frontend/read API dan HC
app/Http/Requests/       Validasi kontrak input
app/Http/Middleware/     Session dan konteks aktif
app/Models/              Eloquent, relasi, casts dan guard immutability
app/Policies/            Izin record
app/Queries/             Scope sebelum lookup/count/pagination
app/Rules/               Validasi integer skor
app/Services/            IdentityAccess, Assessment, Organization, KpiMaster, Audit
bootstrap/ config/       Runtime Laravel
public/                  Document root webserver
resources/views/         Blade: auth, shell, v2, profil, components dan errors
resources/js/            JavaScript native: state dan interaksi audit Blade
resources/data/          Fixture dan katalog 37 entry audit ABprove
app/ViewModels/          AbproveDesign, pemetaan presentasi tiap role
resources/css/           Token design system, komponen dan responsivitas
frontend/abprove-preview/ Arsip preview statis terdahulu, bukan frontend aktif
routes/                  Endpoint web/session dan command bootstrap admin
database/migrations/     Lima migrations; jembatan fresh-only ke v2 + snapshot SQL
database/schema/         Schema fisik v2 untuk review/validasi, pemasangan aplikasi lewat migrations
database/seeders/        DatabaseSeeder dan LocalDemoSeeder khusus pengembangan
tests/Feature/           Pengujian HTTP dan aturan bisnis
tests/Support/           Fixture terisolasi dan seed smoke HTTP
tests/BladeDesign/       Playwright untuk frontend Blade aktif
tests/Browser/           Skenario lama integrasi, disimpan sebagai referensi
tools/testing/           Runner MySQL terisolasi
docs/backend/            Kontrak, keputusan, handoff dan hasil pengujian
docs/frontend/           Inventaris, inspeksi MCP, screenshot, review dan QA
docs/frontend/abprove-review/ Bukti preview statis terdahulu
docs/frontend/abprove-blade/ Riwayat fase frontend Blade pertama
docs/frontend/flow-v2/     Riwayat implementasi alur v1.3
docs/frontend/compact-crud/ Riwayat revisi UI yang disetujui
docs/frontend/approved-layout/ Baseline disetujui dan hash sumber
docs/backend/v2/           Kontrak, hasil uji dan source manifest v2
output/pdf/               Dokumen review dan alur terbaru
tools/documentation/      Alat pembuatan dokumen, bukan backend aplikasi
docs/requirements/       PRD aktif v1.2; v1.1/PDF lama dipertahankan
docs/architecture/       Arsitektur dan routes aktual
docs/database/           Schema/ERD/validasi
design/                  FigCraft, preview dan arsip desain
archive/source/          Sumber asli pengguna
archive/foundation/      Dokumentasi sebelum backend, untuk jejak perubahan
storage/                 Log, sesi/cache dan file privat runtime (diabaikan Git)
vendor/                  Dependency Composer terpasang (diabaikan Git)
node_modules/            Dependency npm terpasang (diabaikan Git)
public/build/            Aset produksi Vite (hasil build, diabaikan Git)
```

Folder kosong/.gitkeep tersisa dari fondasi atau untuk perluasan domain. Jalankan npm ci dan npm run build untuk aset frontend, atau npm run dev selama pengembangan. composer.lock dan package-lock.json dipertahankan agar dependency dapat direproduksi. .env lokal dan APP_KEY tidak disertakan ke Git.
