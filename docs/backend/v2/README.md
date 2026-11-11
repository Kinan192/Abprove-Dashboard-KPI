# Backend KPI v2.0

Backend MVC Laravel sudah disesuaikan dengan alur v1.3 dan layout-1.0 yang disetujui. [Schema](../../database/SCHEMA.md), [ERD](../../database/ERD.md), [migrasi](../../database/MIGRATION-V2.md), [hasil pengujian](test-result.json).

Status runtime: source/API v2 tersedia dan diuji pada MySQL terisolasi. Database Laragon lama tidak dikonversi atau dikosongkan. Bila schema lama masih aktif, API bisnis memberikan 503 SCHEMA_UPGRADE_REQUIRED. Login/logout, /me, halaman Blade dan audit layout tetap dapat digunakan. Frontend bisnis masih memakai state lokal; binding ke API nyata menjadi tahap integrasi berikutnya.

## Aturan utama

- Hanya HC/KD/KU mempunyai akun. Staf merupakan employees tanpa user_id.
- HC membuat akun sebelum divisi/unit. Pembuatan area + assignment kepala dan staf + placement awal bersifat atomik.
- KPI Unit untuk KU menilai staf; KPI Divisi untuk KD menilai Kepala Unit. HC mengisi definisi, bukan angka nilai.
- GET form tidak membuat assessment. POST kirim menerima semua skor sekaligus. Tidak ada route start/draft/submit terpisah atau penyimpanan skor parsial.
- KU mengajukan, KD mengembalikan dengan alasan atau langsung Final. KD mengisi Kepala Unit dan langsung Final. HC tidak mempunyai hak keputusan.
- Nilai integer 10-100, bobot tepat 100%. Scope/bobot/total/kategori/pelaku ditentukan server.
- Final, snapshot dan audit dilindungi. Pembatalan KU menghapus pengajuan aktif; audit serta receipt retry tetap ada.
- Query membatasi area sebelum count, detail, pagination, analitik dan ekspor. Histori mengikuti area snapshot dalam cakupan akun saat ini.

## Session dan mutasi

1. GET /login dengan Accept: application/json, simpan cookie dan csrf_token.
2. POST /login dengan identifier dan password, cookie dan X-CSRF-TOKEN. Gunakan token response login selanjutnya.
3. GET /me membaca role dan area dari server.
4. Setiap mutasi memakai UUID request_id baru untuk satu tindakan logis. Retry jaringan memakai UUID dan payload identik.
5. Semua route memakai session web + CSRF; role dari browser tidak dipakai.

Response mutasi: data + replayed. 401 sesi, 403 role, 404 target di luar scope/tidak ada, 409 konflik bisnis/versi/UUID, 419 CSRF, 422 validasi, 503 schema belum siap. lock_version harus versi dari detail terbaru. Jangan menaikkan versi sendiri saat konflik.

Replay diperiksa setelah aktor/konteks dimuat ulang dan sebelum lookup target yang mungkin sudah dihapus. Ini memungkinkan retry pembatalan/penghapusan tanpa melakukan operasi kedua. Receipt lama tidak berarti kondisi record terbaru; refresh detail setelah replay.

## Organisasi HC

| Endpoint | Perilaku |
|---|---|
| GET /hc/organization/{resource} | Pagination 25; pencarian; resource users/positions/divisions/units/employees |
| GET /hc/organization/{resource}/{id} | Detail tersanitasi, assignment/placement sesuai jenis |
| POST /hc/organization/{resource} | Buat atomik |
| PATCH /hc/organization/{resource}/{id} | Ubah field yang dikirim |
| DELETE /hc/organization/{resource}/{id} | Hanya data belum dirujuk |
| GET /hc/{divisions,units}/{id}/head-preview | Kepala sekarang, kandidat akun, jumlah pekerjaan terdampak |
| POST /hc/{divisions,units}/{id}/head | Ganti kepala dengan expected_assignment_id, user_id, confirmed dan reason |
| GET /hc/employees/{id}/placement-preview | Riwayat/penempatan dan dampak |
| POST /hc/employees/{id}/placement | unit_id, effective_from YYYY-MM-01, expected_placement_id, confirmed, reason |
| GET /hc/audit | Histori append-only, subject_type/subject_id |
| POST /hc/units/{id}/remind | Catat pengingat; message_sent=false, belum mengirim pesan |

Payload akun baru: name, email, login_nip, role_key (super_hc/kepala_divisi/kepala_unit), password, is_active opsional. Password minimal 12 karakter, huruf dan angka; tidak masuk audit/receipt. Akun HC memperoleh scope global. Akun KD/KU belum dapat mengakses aplikasi sampai ditetapkan pada area.

Payload divisi: code, name, head_user_id. Unit menambah division_id. Update pergantian kepala memerlukan expected_assignment_id, confirmed=true dan reason. Kepala harus aktif, role sesuai dan belum memimpin area lain.

Payload staf: nip, full_name, position_id, unit_id, effective_from opsional. email/password/user_id ditolak. Update unit staf dilakukan melalui placement, bukan PATCH identitas. Perubahan yang bertabrakan dengan penilaian non-Final pada rentang efektif ditolak. Periode masih terbuka juga diperhitungkan agar penilaian bulan sebelumnya tidak kehilangan penanggung jawab.

Hapus master terpakai ditolak; gunakan Nonaktif setelah dependensi aktif diselesaikan. Penonaktifan area mencabut scope aktif kepala sambil mempertahankan histori; reaktivasi memilih kepala yang masih tersedia. Area baru nonaktif mencatat pilihan kepala tanpa memberi akses aktif. Akun sendiri tidak dapat dihapus/dinonaktifkan/diubah role. Unit berhistori tidak direparent divisinya.

## KPI HC

POST /hc/kpi-templates langsung menerapkan versi baru. Tidak ada PATCH versi atau POST publish. GET list/detail tersedia; DELETE versi hanya jika belum dipakai.

Contoh payload:

```json
{
  "request_id": "f37d8894-f36f-4339-8aac-b7f5291fe682",
  "scope_level": "unit",
  "unit_id": 1,
  "name": "KPI Staf Unit IT",
  "effective_from": "2026-12-01",
  "items": [
    {"pillar":"Technical Care","name":"Kepatuhan layanan","target_text":"95%","weight_percent":"60.0000"},
    {"pillar":"Efficient","name":"Efisiensi","target_text":"100%","weight_percent":"40.0000"}
  ]
}
```

Untuk KPI Divisi gunakan scope_level=division dan division_id. Numerator, denominator dan measurement_formula opsional berupa teks, tidak dieksekusi. FormRequest menetapkan batas panjang/jumlah indikator. Masa versi baru harus setelah versi terakhir dan tidak menabrak penilaian terpakai. Segel DB memvalidasi bobot/count dalam transaksi yang sama.

GET /{unit,division,hc}/data/kpis?cycle_id=... memberikan definisi sesuai role/periode. Import-preview CSV/XLSX server tersedia pada POST /hc/kpi-templates/import-preview, tanpa menyimpan master; formula/file berbahaya ditolak.

## Siklus

GET /cycles dan /cycles/{id} tersedia bagi akun aktif. HC POST/PATCH /hc/cycles menerima assessment_month YYYY-MM-01, empat jadwal ISO8601 dengan offset, planned/open dan categories. Waktu disimpan UTC. Membuka periode memerlukan kepala dan KPI aktif untuk semua area aktif.

Kategori berurutan dari 0, tanpa celah/overlap, terakhir upper_bound=null. Jadwal/kategori terpakai tidak diubah. POST /hc/cycles/{id}/close menutup; DELETE hanya periode tidak terbuka dan belum dipakai. Pembukaan ulang/unlock tidak ditambahkan.

## Penilaian lengkap

GET /unit/assessment-form?employee_id=...&cycle_id=... atau /division/assessment-form?subject_user_id=...&cycle_id=... hanya membaca subject, periode dan versi KPI.

POST /unit/assessments atau /division/assessments:

```json
{
  "request_id": "49cf3809-a068-4ed3-bf85-f7111ce0cf1d",
  "cycle_id": 1,
  "employee_id": 1,
  "scores": [
    {"source_kpi_item_id":1,"score":90},
    {"source_kpi_item_id":2,"score":85}
  ],
  "positive_finding":"Temuan opsional",
  "negative_finding":null
}
```

Untuk kepala gunakan subject_user_id menggantikan employee_id. Seluruh source_kpi_item_id dari form harus muncul tepat sekali; nilai null/desimal/notasi ilmiah ditolak. Kepala Unit dikirim oleh KD dan menjadi Final dalam transaksi yang sama.

- GET /{unit,division,hc}/assessments, /{id}, /{id}/timeline.
- POST /unit/assessments/{id}/resubmit: lock_version + semua scores/temuan, hanya returned.
- POST /unit/assessments/{id}/withdraw: request_id + lock_version, hanya submitted.
- POST /division/assessments/{id}/return: request_id + lock_version + reason.
- POST /division/assessments/{id}/approve: request_id + lock_version, langsung Final.
- POST /division/approvals/bulk: assessments berisi id/lock_version, maksimal 100, atomik.

## Baca, profil dan notifikasi

- GET /{prefix}/members, /division/heads: sesuai cycle, search dan filter; needs_input mencakup belum ada/returned.
- GET /{prefix}/team, /dashboard?cycle_id=..., /recap?cycle_id=...; recap default Final, status=all untuk seluruh proses.
- Rekap mendukung status/kind/unit_id/division_id/search; format=tsv mengekspor seluruh hasil filter untuk Excel. Teks formula dinetralisasi.
- GET /{prefix}/data/analytics: hanya Final; trend, kategori, grup/peringkat menurut versi dan jenis, serta matriks ter-paginate. Filter kind/template_id/search/unit_id/division_id mempersempit scope.
- GET /{prefix}/data/assessments/{id}/comparison: Final bulan sebelumnya, indikator dibandingkan melalui seluruh unsur definisi termasuk bobot.
- GET/POST /{prefix}/profile: profil sendiri, phone/preferensi, perubahan password dengan current_password dan confirmation, foto PNG/JPG/WebP maksimal 2 MB. Foto disimpan privat dan dibaca melalui /profile/photo yang terotorisasi.
- GET /{prefix}/notifications?cycle_id=...: tugas server, pagination. POST /notifications/read menyimpan keys yang benar-benar termasuk tugas akun tersebut.
- Pilihan email tersimpan sebagai preferensi; pengiriman email/WhatsApp belum diaktifkan.

prefix adalah unit, division atau hc sesuai role. Frontend masih memakai data lokal; endpoint ini disiapkan untuk binding berikutnya.

## Pengujian dan batas

```powershell
python tools/testing/validate_schema_v2.py
python tools/testing/run_backend_tests.py
php vendor/bin/pint --test app routes database/seeders tests/Feature tests/Support
```

Python hanya runner MySQL terisolasi; backend tetap PHP/Laravel. Snapshot source sebelum revisi ada di archive/backend/2026-11-10-before-domain-v2. Test draft/jabatan lama dipindahkan ke arsip, digantikan kontrak baru; test auth, import, seeder dan render role tetap dijalankan.

Pengujian mencakup 67 kasus/595 assertion, validasi SQL 65 pemeriksaan, dan HTTP nyata session/CSRF/logout. Pengujian beban/kompetisi paralel serta UAT belum dijalankan. Migrasi data lama, integrasi frontend, unlock Final, penilaian KD dan delegasi tidak dilakukan diam-diam pada fase ini.
