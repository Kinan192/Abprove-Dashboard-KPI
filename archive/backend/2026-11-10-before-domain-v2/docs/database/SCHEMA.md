# Schema backend v1.3

MySQL 8.4 / InnoDB / utf8mb4_0900_ai_ci. **Migrations adalah sumber schema aktif**, bukan import SQL fondasi. Database lokal kpi_kinerja_dev telah dimigrasikan; kpi_kinerja lama tidak diubah. Tidak ada default akun, kata sandi, kategori, periode atau data karyawan.

## Perubahan dari fondasi

1. Baseline 16 tabel tersimpan immutable di `database/migrations/sql/2026_11_08_initial.sql` dan dieksekusi migration pertama. Bootstrap menolak tabel domain existing.
2. `operation_requests` menambah tabel ke-17 untuk replay transaksi: request_id UUID PK, actor_user_id FK, action, payload_hash, context_key, response_data JSON, created_at. UUID tidak menyimpan kredensial/token. Response retry berisi hasil operasi pertama.
3. `assessments.assessment_kind` member/unit_head dan `head_assignment_id` nullable FK scope_assignments. CHECK memastikan head_assignment hanya untuk unit_head. Penilaian Kepala Unit tetap ber-FK employee/placement/template yang sama dan UNIQUE(employee_id,cycle_id).
4. Enam trigger MySQL melindungi Final pada header dan item (termasuk memindahkan item ke lembar Final). Model/service juga melarang perubahan Final.
5. `approved` tetap kompatibel dengan baseline lama, tetapi alur baru langsung submitted -> final oleh Kepala Divisi, atau draft -> final pada unit_head. approved_by dan finalized_by sama-sama menyimpan KD pemutus.

## Tabel

| Tabel | Isi / integritas utama |
|---|---|
| users | Identitas email atau login_nip, hash password, akun aktif. Identifier unik lintas kolom juga diperiksa service |
| roles | Tiga role seed: super_hc, kepala_divisi, kepala_unit |
| user_roles | PK(user_id,role_key), eligibility; jangan hapus eligibility yang direferensi assignment historis |
| divisions | Kode unik, nama, aktif |
| units | FK divisi; kode unik per divisi; UNIQUE(id,division_id) untuk FK komposit |
| positions | Jabatan menentukan template, kode unik |
| employees | NIP unik, jabatan, user opsional unik, aktif |
| scope_assignments | FK eligibility komposit; bentuk role/scope CHECK; UNIQUE generated satu kepala aktif per area dan satu HC membership per user |
| employee_placements | Riwayat employee+unit+divisi; satu placement belum berakhir per employee; FK unit/divisi komposit |
| kpi_templates | Jabatan/tahun/versi unik, status draft/published/retired, masa berlaku |
| kpi_items | Pilar, target teks, numerator/denominator/formula teks, bobot DECIMAL(8,4), urutan unik per template |
| assessment_cycles | Bulan hari pertama unik, jadwal UTC berurutan, status planned/open/closed |
| cycle_categories | Rentang DECIMAL(12,6), code/order unik per siklus; partisi lintas baris divalidasi service |
| assessments | UNIQUE(employee,cycle), snapshots identitas/organisasi/template/kategori, jenis, status, total raw, actor/time KD, lock_version |
| assessment_items | Snapshot KPI dan bobot; skor integer10..100 atau null; weighted_result_raw generated STORED DECIMAL(12,6) |
| audit_events | Append-only per layanan/model; before/after JSON tersanitasi, aktor/konteks, waktu dan alasan |
| operation_requests | Replay hasil mutasi; FK user; UUID global unik, hash dan konteks terikat operasi |

FK komposit menutup mismatch placement/employee/unit/divisi, template/jabatan serta item/template/assessment. Generated result tidak diinsert/update aplikasi. SUM item dan total bobot menggunakan DECIMAL/bcmath. Snapshot Final tidak berubah saat master/placement diperbarui.

Kamus fondasi lengkap tersedia historis pada `archive/foundation/docs__database__SCHEMA.md`; SQL baseline juga hanya historis. Tidak boleh bootstrap SQL baseline dan migrations pada database yang sama. Koneksi MySQL lokal memakai UTC; tampilan WIB menjadi tugas frontend.

Audit dan operation_requests harus SELECT/INSERT saja bagi user runtime deployment; user migrator terpisah untuk DDL/trigger. Trigger Final bukan pengganti otorisasi atau hak DB yang benar. Batas histori, perubahan penilaian aktif dan OPEN PRD ada di [DECISIONS](../backend/DECISIONS.md).

[ERD](ERD.md), [migrations](../../database/migrations/README.md), [pengujian backend](../backend/test-result.json).
