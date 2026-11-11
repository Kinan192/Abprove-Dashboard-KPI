# Routes aplikasi aktif

Seluruhnya route web/session dan CSRF. Parameter ID numeric; lookup di luar scope menghasilkan 404. Browser menerima HTML pada halaman; client JSON wajib `Accept: application/json`. Daftar aktual hasil `php artisan route:list --except-vendor --json` tersedia di [routes-runtime.json](routes-runtime.json).

| Method | Route | Kewenangan/perilaku |
|---|---|---|
| GET/POST | /login | Halaman login (HTML), token CSRF (JSON) / login email-NIP, rate limit |
| POST | /logout | Invalidasi sesi |
| GET | /me | Konteks sah dan home; tidak menerima role client |
| GET | /cycles, /cycles/{cycle} | Akun dengan assignment aktif |
| GET | /unit/dashboard, /division/dashboard, /hc/dashboard | Progres sesuai scope; cycle_id wajib |
| GET | /{unit,division,hc}/members, /team | Anggota non-kepala dan unit dalam scope |
| GET | /{unit,division,hc}/assessments, /assessments/{id}, /assessments/{id}/timeline | Daftar/detail/audit sesuai scope |
| GET | /{unit,division,hc}/recap | JSON atau TSV, cycle_id, status, filter mempersempit scope |
| POST | /unit/assessments | KU memulai member |
| PATCH | /unit/assessments/{id}/draft | KU draft/returned anggota |
| POST | /unit/assessments/{id}/submit, /withdraw | KU mengajukan / menarik submitted |
| GET | /division/heads | Kepala Unit dalam divisi untuk dinilai KD |
| POST | /division/assessments | KD memulai unit_head |
| PATCH | /division/assessments/{id}/draft | KD hanya mengisi unit_head |
| POST | /division/assessments/{id}/submit | KD menetapkan unit_head langsung Final |
| POST | /division/assessments/{id}/approve | KD ACC member submitted langsung Final |
| POST | /division/assessments/{id}/return | KD mengembalikan member submitted dengan alasan |
| POST | /division/approvals/bulk | KD ACC member atomik maksimal 100 |
| GET/POST | /hc/organization/{resource} | HC list/buat divisions, units, positions, employees, users |
| GET/PATCH | /hc/organization/{resource}/{id} | HC detail/ubah tanpa hard delete |
| GET/POST | /hc/employees/{employee}/placement-preview ; /placement | Preview lalu penempatan/transfer atomik |
| GET/POST | /hc/{divisions,units}/{id}/head-preview ; /head | Preview lalu penetapan kepala atomik |
| GET | /hc/audit | Audit global HC; filter subject_type/subject_id |
| GET | /hc/assignments | Daftar assignment |
| POST | /hc/assignments/{assignment}/revoke | Cabut assignment dengan guard dampak |
| POST | /hc/users/{user}/grant-hc | Scope global HC untuk akun eligible |
| GET/POST | /hc/kpi-templates | Daftar / draft versi berikutnya |
| GET/PATCH | /hc/kpi-templates/{template} | Detail / ganti isi draft |
| POST | /hc/kpi-templates/{template}/publish | Bobot100%, tanggal tidak overlap |
| GET/POST | /hc/cycles | Daftar / buat periode dan kategori |
| GET/PATCH | /hc/cycles/{cycle} | Detail / ubah sebelum dipakai |
| POST | /hc/cycles/{cycle}/close | Penutupan periode |

Semua mutasi bisnis memakai request_id UUID. Mutasi assessment existing juga memakai lock_version. Tidak ada endpoint HC finalisasi, HC return, HC score, unlock, atau penilaian Kepala Divisi. Contoh payload/response ada di [panduan backend](../backend/README.md).

## Halaman dan data frontend

Inventaris per role ada di [panduan frontend](../frontend/README.md). Halaman `/unit/score`, `/unit/submissions`, `/unit/history`, `/unit/kpis`, `/division/approvals`, `/division/analytics`, `/hc/analytics`, `/hc/settings`, `/hc/import`, tab organisasi, bantuan dan notifikasi memakai shell Blade yang sama. Tidak ada endpoint bypass role.

| Method | Route | Perilaku |
|---|---|---|
| GET | / | Login atau home role; JSON memberikan status layanan |
| GET | /{unit,division,hc}/data/lookups | Lookup terotorisasi; akun/assignment global hanya HC |
| GET | /{unit,division,hc}/data/analytics | cycle_id wajib; tren 12 bulan, kategori, kelompok sebanding dan matriks Final |
| GET | /{unit,division,hc}/data/kpis | Template published jabatan dalam scope |
| GET | /{unit,division,hc}/data/assessments/{id}/comparison | Final bulan sebelumnya dengan jenis/template identik dan scope yang sah |
| POST | /hc/kpi-templates/import-preview | Upload CSV/XLSX; preview tervalidasi tanpa penyimpanan |
| GET | /hc/import/sample | Unduhan contoh CSV |

Halaman detail assessment memakai URL existing `/{prefix}/assessments/{id}`. Timeline JSON menampilkan aktor dan pagination 25, terbaru lebih dahulu. Rekap/ekspor menerima filter cycle_id, status, search, division_id, unit_id dan kind; filter tidak memperluas scope.
