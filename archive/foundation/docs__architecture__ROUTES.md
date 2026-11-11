# Kontrak route mendatang - tidak aktif

Tidak ada endpoint bisnis yang sudah terdaftar. Semua mutasi POST/PATCH/DELETE harus melalui session auth, CSRF, akun aktif, scope, Policy, FormRequest dan service transaksi. GET tidak mengubah data. Tidak ada API publik atau endpoint unlock.

| Method / pola | Controller area | Akses |
|---|---|---|
| GET/POST /login; POST /logout | Auth | Login / sesi sah |
| GET /unit/dashboard, /unit/members, /unit/submissions | KepalaUnit | Unit yang ditugaskan |
| GET /unit/assessments/{assessment} | KepalaUnit | Penilaian dalam unit sah |
| PATCH /unit/assessments/{assessment}/draft | KepalaUnit | Draft/returned, input allowlist |
| POST /unit/assessments/{assessment}/submit | KepalaUnit | Lengkap dan scope sah |
| POST /unit/assessments/{assessment}/withdraw | KepalaUnit | submitted, belum disetujui |
| GET /division/dashboard, /division/team, /division/approvals | KepalaDivisi | Divisi yang ditugaskan |
| POST /division/assessments/{assessment}/approve | KepalaDivisi | submitted dan scope sah |
| POST /division/assessments/{assessment}/return | KepalaDivisi | submitted, alasan wajib |
| GET /hc/dashboard, /hc/organization, /hc/employees, /hc/users | SuperHc | Super HC aktif |
| POST /hc/divisions, /hc/units, /hc/placements | SuperHc | Akun/induk/tujuan sah |
| POST /hc/units/{unit}/head; /hc/divisions/{division}/head | SuperHc | Preview dan penggantian atomik |
| POST /hc/employees/{employee}/transfer | SuperHc | Alasan, dampak, konfirmasi, guard O-6 |
| GET/POST/PATCH /hc/kpi-templates; POST .../{template}/publish | SuperHc | Versi dan bobot valid |
| GET/PATCH /hc/cycles/{cycle} | SuperHc | Jadwal/kategori valid |
| POST /hc/assessments/{assessment}/finalize; /return | SuperHc | approved dan scope global sah |
| POST /hc/finalization/bulk | SuperHc | Seluruh item valid, request id/version per kebutuhan |
| GET /hc/recap | SuperHc | Filter sah, salin tabular |

Rute histori/KPI unit, analitik, bulk approve, impor dan notifikasi mengikuti prioritas P1 PRD; reminder P2. Route binding harus scoped, bukan find bebas sebelum pengecekan izin. Daftar anggota tanpa assessment tetap mengikuti placement aktif; daftar assessment memakai konteks tersimpan dan kebijakan histori yang disahkan.
