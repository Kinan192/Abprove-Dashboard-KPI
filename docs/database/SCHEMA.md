# Schema v3.0: domain v2 dan Better Auth

Revisi per role v1.4: migration 000008 mengganti CHECK pilar tetap dengan teks wajib 1–64 karakter setelah trim. Lima pilar awal menjadi saran, bukan batas pilihan. Kolom tetap VARCHAR(64); seluruh versi template dan snapshot penilaian dipertahankan. SQL fisik mencerminkan aturan terbaru, sementara snapshot migration domain v2 tetap historis. [Kebutuhan v1.4](../requirements/REVISI-PER-ROLE-v1.4.md).

Target untuk alur v1.3 dan layout yang disetujui 10 November 2026 WIB. SQL fisik: [schema.mysql.sql](../../database/schema/schema.mysql.sql). MySQL 8.4/InnoDB/utf8mb4, koneksi dan timestamp UTC; tampilan jadwal WIB.

Domain v2 menggantikan draft penilaian, template berdasarkan jabatan, dan kepala sebagai staf berakun. Integrasi v3 kini menghubungkan frontend ke database kpi_kinerja_v3_dev. Database legacy kpi_kinerja_dev tetap utuh dan belum diimpor. Migration 000006-000007 menambahkan Better Auth tanpa mengubah aturan KPI. [Panduan aktif](../backend/v3/README.md).

## Identitas dan struktur

Akun kepala dibuat dahulu pada users: Super HC, Kepala Divisi atau Kepala Unit. users.role_key adalah role akun saat ini. user_roles menyimpan kelayakan role yang pernah dipakai agar FK penugasan historis tidak rusak; tabel itu bukan pemilih beberapa role pada UI. Tepat satu penugasan aktif per akun.

Divisi/unit dibuat dengan memilih akun aktif yang sesuai. Penanggung jawab tersimpan dalam scope_assignments, tidak digandakan sebagai kolom head_id pada master. Kepala Unit tidak harus dibuat sebagai employees atau ditempatkan sebagai staf. employees hanya data staf, tanpa user_id, email login atau password. Jabatan adalah klasifikasi staf, bukan penentu KPI.

Penempatan staf memakai bulan berlaku inclusive, tanggal selalu hari pertama bulan. Pergantian kepala memakai assigned_at/revoked_at untuk otorisasi saat ini. Snapshot penilaian tetap menunjuk penempatan/penugasan asal.

## Dua cakupan KPI

- KPI Unit: kpi_scopes.scope_level=unit, unit_id wajib. Dipakai KU menilai staf unit.
- KPI Divisi: scope_level=division, division_id wajib. Dipakai KD menilai Kepala Unit divisi.

kpi_scopes menampung area dan counter versi. kpi_templates menampung versi serta bulan berlaku; kpi_items menampung definisi dan bobot. UNIQUE scope+version serta counter next_version mencegah penggunaan ulang nomor versi setelah penghapusan.

Kolom sealed_at adalah segel internal transaksi Terapkan: header, seluruh indikator dan segel ditulis dalam satu transaksi. Tidak ada endpoint simpan draft/publish terpisah. Trigger segel memeriksa jumlah indikator dan bobot tepat 100%. Versi tersegel tidak dapat diedit; masa akhirnya boleh disesuaikan ketika versi baru diterapkan atau versi yang belum dipakai dihapus. Snapshot yang sudah dipakai tetap dilindungi.

scope_level dan scope_key disalin ke template/assessment untuk FK komposit non-NULL. Ini menutup celah FK komposit nullable sehingga KPI Unit A tidak dapat dipakai staf Unit B, dan KPI Divisi A tidak dapat dipakai kepala dalam Divisi B.

## Penilaian

| Jenis | Subjek | Sumber KPI | Pengisi | Keputusan |
|---|---|---|---|---|
| member | employee_id + placement_id + position_id | Unit penempatan | KU unit tersebut | KD divisi |
| unit_head | subject_user_id + head_assignment_id | Divisi unit yang dipimpin | KD divisi | KD yang sama, langsung Final |

CHECK XOR memastikan satu jenis subjek yang benar. FK komposit mengikat kepala yang dinilai, pengisi dan reviewer dengan area masing-masing. UNIQUE staff+cycle serta account-head+cycle mencegah lembar ganda. Finalizer harus sama dengan reviewer KD.

Tidak ada baris untuk Belum diisi. POST kirim menerima semua nilai dan temuan dalam satu payload/transaksi. Nilai item NOT NULL, integer 10-100. Status tersimpan hanya submitted, returned, final. returned wajib alasan. Resubmission mengganti seluruh angka yang lengkap; tidak menyimpan bagian per bagian. Penilaian Kepala Unit memakai submitted hanya sebagai langkah internal transaksi sebelum Final, tidak diekspos sebagai tahap persetujuan HC.

Pembatalan KU menghapus item dan header submitted setelah konfirmasi, sehingga kembali Belum diisi. Audit dan receipt UUID tetap menyimpan peristiwa pembatalan. Rekaman sebelumnya adalah histori kiriman lengkap, bukan draft aktif.

Total dihitung dari DECIMAL: SUM(score ? bobot / 100), 6 desimal; bobot 4 desimal. Snapshot identitas, organisasi, definisi KPI dan kategori Final dipertahankan. Trigger menolak perubahan/penghapusan Final dan perubahan snapshot item.

## Inventaris 20 tabel domain + 3 tabel autentikasi

| Tabel | Tanggung jawab dan integritas |
|---|---|
| roles | Tiga role tetap |
| users | Akun kepala/HC, role saat ini, email_verified/auth_image, profil dan preferensi; tanpa kolom password |
| auth_accounts | Kredensial Better Auth; satu provider credential per akun; hash bcrypt satu sumber |
| auth_sessions | Token sesi, pemilik, kedaluwarsa, context_key dan aktivitas terakhir server |
| auth_verifications | Penyimpanan verifikasi Better Auth; pengiriman email belum diaktifkan |
| user_roles | Kelayakan role historis, FK penugasan |
| divisions | Kode unik, nama, status aktif |
| units | FK divisi; kode unik; FK komposit id/division |
| positions | Jabatan staf; kode unik |
| employees | NIP unik, nama, jabatan, aktif; tidak memiliki akun |
| scope_assignments | Riwayat penanggung jawab; satu akun/satu area aktif; aktor perubahan |
| employee_placements | Staf-unit-divisi, masa berlaku bulanan, alasan; FK konteks |
| kpi_scopes | Jenis/area KPI dan counter versi |
| kpi_templates | Versi immutable, masa berlaku, jumlah item, segel transaksi |
| kpi_items | Pilar, indikator, numerator/denominator/formula, target, bobot |
| assessment_cycles | Bulan penilaian, empat jadwal UTC, planned/open/closed |
| cycle_categories | Rentang nilai per periode; partisi diperiksa layanan |
| assessments | Subjek XOR, snapshot, pengisi/reviewer, status, total, kategori, lock_version |
| assessment_items | Snapshot indikator, skor wajib, hasil generated DECIMAL |
| audit_events | Histori append-only, alasan dan before/after tersanitasi; ID assessment dipertahankan walau kiriman dibatalkan |
| operation_requests | UUID unik, aktor/konteks/hash payload dan response retry atomik |
| notification_reads | Status baca per akun/periode/key; tugas dihitung dari data server |
| domain_schema_versions | Penanda kontrak schema 2.0.0 |

Tidak ada tabel session/cache karena project memakai driver file. Tidak ada tabel draft, role staf, finalisasi HC, reset/unlock Final atau delegasi baru.

## Pembagian penjagaan

DB: FK scope/subject, UNIQUE, CHECK status/rentang/bentuk, hasil generated, segel bobot, penguncian Final/snapshot/audit.

Service dalam transaksi + row lock: kelayakan akun aktif, role/scope saat ini, urutan akun -> struktur, overlap masa berlaku, keutuhan kiriman submitted, kategori tanpa celah, integer lexical sebelum coercion SQL, tenggat WIB/UTC, alasan perubahan, izin hapus, retry UUID dan pergantian struktur yang memiliki penilaian non-Final.

MySQL tidak menyediakan CHECK lintas tabel atau deferred FK. Karena itu operasi penerapan KPI serta pengiriman nilai harus atomik; segel/status internal tidak boleh dikomit sebagian. Skor desimal/notasi ilmiah wajib ditolak FormRequest sebelum MySQL mengubahnya menjadi integer.

## Historis, CRUD dan indeks

Akses laporan mengikuti scope snapshot dalam area akun saat ini, selaras UI yang disetujui. Transfer tidak memindahkan histori ke unit baru. Kepala Unit hanya membaca jenis member dalam unitnya; KD membaca dua jenis dalam divisinya; HC membaca global tanpa hak mengubah nilai.

Hapus hanya untuk master yang belum dirujuk. Staf/area/akun berhistori dinonaktifkan; penggantian penanggung jawab dan transfer memeriksa penilaian non-Final. Audit tidak dihapus bersama subjek. Tidak ada cascade yang menghapus hasil penilaian.

Indeks utama mengikuti daftar role: cycle/status/division/unit, division/cycle/status, unit/cycle/status, template scope/masa berlaku, placement unit/masa berlaku, subject/cycle, audit subject/waktu dan aktor/waktu. Query mengikat scope sebelum pencarian, count, pagination dan export.

## Validasi dan adopsi

[Hasil validasi SQL](schema-v2-validation.json), [ERD](ERD.md), [rencana migrasi](MIGRATION-V2.md), [kontrak transaksi](TRANSACTIONS-V2.md). SQL hanya diimpor ke database kosong terisolasi saat pengujian. Baseline migration lama tetap tersimpan immutable; jangan mengimpor SQL baru ke database yang berisi tabel lama.

Acuan teknis: [MySQL CHECK](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html) dan [MySQL FK](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
