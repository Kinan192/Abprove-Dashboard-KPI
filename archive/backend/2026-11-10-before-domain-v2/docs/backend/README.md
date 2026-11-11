# Panduan backend

Kontrak ini dipakai frontend Blade/Alpine pada origin/session yang sama. Seluruh route bisnis berada pada middleware `web`; tidak ada token API, registrasi publik, atau pemilih role demo. Kirim `Accept: application/json` untuk API; browser biasa menerima halaman Blade pada URL aplikasi.

## Sesi dan CSRF

1. `GET /login` dengan `Accept: application/json`, simpan cookie sesi dan ambil `csrf_token`.
2. `POST /login`, JSON `identifier` (email atau NIP login), `password`, dengan header `X-CSRF-TOKEN` dari langkah 1 dan cookie yang sama.
3. Simpan cookie baru serta `data.csrf_token` dari response login. Sesi diregenerasi saat login.
4. `GET /me` memberikan role, division_id/unit_id yang sah, dan URL home. Tidak menerima role dari browser.
5. Mutasi berikutnya mengirim cookie sesi, header `X-CSRF-TOKEN`, `Accept: application/json`, dan UUID `request_id` baru untuk setiap operasi logis.
6. `POST /logout` juga memakai CSRF. Setelah timeout 30 menit idle, login ulang.

Contoh PowerShell pada server lokal:

```powershell
$base = 'http://127.0.0.1:8000'
$auth = Invoke-RestMethod "$base/login" -Headers @{ Accept = 'application/json' } -SessionVariable kpiSession
$credential = Get-Credential -Message 'Email atau NIP dan kata sandi KPI'
$body = @{ identifier = $credential.UserName; password = $credential.GetNetworkCredential().Password } | ConvertTo-Json
$login = Invoke-RestMethod "$base/login" -Method Post -WebSession $kpiSession -ContentType 'application/json' -Headers @{ 'X-CSRF-TOKEN' = $auth.csrf_token; Accept = 'application/json' } -Body $body
$headers = @{ 'X-CSRF-TOKEN' = $login.data.csrf_token; Accept = 'application/json' }
Invoke-RestMethod "$base/me" -WebSession $kpiSession -Headers $headers
```

Tidak menyimpan password pada source atau berkas contoh. Gunakan credential akun yang dibuat dengan `php artisan kpi:create-admin`.

## Persiapan data oleh HC

Gunakan `POST /hc/organization/{resource}` dengan `request_id` UUID. Resource: divisions, units, positions, employees, users. PATCH pada `/{id}` mengubah field yang dikirim; tidak ada hard delete.

Urutan yang memenuhi relasi:

1. Buat divisi `{code,name}`, jabatan `{code,name}`, dan unit `{division_id,code,name}`.
2. Buat akun `{name,email atau login_nip,password,roles:[kepala_divisi atau kepala_unit]}`. Kata sandi minimal 12 karakter, huruf dan angka. `roles` menambah kelayakan role; kelayakan saja tidak memberikan akses. Pencabutan akses melalui assignment atau is_active.
3. Untuk Kepala Unit, buat employee `{nip,full_name,position_id,user_id}` yang terhubung ke akun, kemudian tempatkan pada unit yang akan dipimpin. Anggota biasa tidak memerlukan akun.
4. `GET /hc/employees/{employee}/placement-preview`, kemudian `POST /hc/employees/{employee}/placement` dengan `{request_id,unit_id,expected_placement_id:null atau ID saat preview,confirmed:true,reason}`. Endpoint yang sama untuk transfer; placement lama ditutup atomik.
5. `GET /hc/divisions/{id}/head-preview` atau `/hc/units/{id}/head-preview`. POST pada `/head` dengan `{request_id,user_id,expected_assignment_id:null atau ID saat preview,confirmed:true,reason}`. Pergantian harus mengikuti hasil preview terbaru.
6. HC tambahan: akun eligible `super_hc`, lalu `POST /hc/users/{user}/grant-hc` dengan request_id dan reason. Cabut melalui `POST /hc/assignments/{assignment}/revoke` dengan request_id dan reason. Akun tidak dapat mencabut atau menonaktifkan dirinya sendiri.

Semua FK harus sah dan induk aktif. Multi-penugasan aktif ditolak sampai O-5 disahkan. Pemindahan/pergantian dengan penilaian non-Final ditolak. Jangan mengganti FK atau menghapus histori lewat SQL manual.

## Template KPI

`POST /hc/kpi-templates` membuat draft versi berikutnya; PATCH `/hc/kpi-templates/{id}` mengganti seluruh isi draft. Contoh payload:

```json
{
  "request_id": "c4a4c880-60ef-4af6-a7ce-033918755de1",
  "position_id": 1,
  "name": "KPI Staf 2026",
  "template_year": 2026,
  "effective_from": "2026-01-01",
  "effective_until": "2026-12-31",
  "items": [
    {"pillar":"Technical Care","name":"Kepatuhan dokumentasi","target_text":"95%","weight_percent":"60.0000"},
    {"pillar":"Efficient","name":"Efisiensi sumber daya","target_text":"<20%","weight_percent":"40.0000"}
  ]
}
```

Pilar: Technical Care, Access, Coordination and Continuity, Interpersonal Care, Efficient. Numerator, denominator, measurement_formula opsional berupa teks, bukan rumus yang dieksekusi. Bobot harus tepat 100.0000 saat menyimpan/publish. `POST /hc/kpi-templates/{id}/publish` memakai request_id. Published immutable; masa berlaku versi published lain tidak boleh overlap pada jabatan/tahun yang sama. Tanggal dibaca terhadap bulan penilaian, bukan tanggal pemrosesan. Perubahan masa berlaku template yang sudah published belum memiliki endpoint bypass.

## Periode

POST `/hc/cycles` dan PATCH `/{id}` menerima request_id, assessment_month format `YYYY-MM-01`, opens_at, submission_due_at, approval_due_at, closes_at format ISO 8601 dengan offset (misalnya `2026-11-10T23:59:59+07:00`), status planned/open/closed, dan categories. Semua waktu disimpan UTC.

```json
[
  {"code":"kurang","label":"Kurang","lower_bound":"0","upper_bound":"70"},
  {"code":"cukup","label":"Cukup","lower_bound":"70","upper_bound":"80"},
  {"code":"baik","label":"Baik","lower_bound":"80","upper_bound":"90"},
  {"code":"sangat_baik","label":"Sangat Baik","lower_bound":"90","upper_bound":null}
]
```

Ini contoh kategori usulan PRD, tidak dibuat otomatis. Rentang harus tanpa celah/overlap, mulai 0, terakhir tanpa batas atas. Jadwal/kategori membeku setelah penilaian pertama dibuat. `POST /hc/cycles/{id}/close` dengan request_id menutup periode. Tidak ada pembukaan ulang/perpanjangan untuk periode terpakai.

## Penilaian anggota

1. KU mengambil `GET /unit/members?cycle_id=1`, lalu `POST /unit/assessments` dengan `{request_id,employee_id,cycle_id}`.
2. Response berisi id, lock_version, items.id, snapshot KPI/bobot. Status awal draft. Satu employee+cycle hanya satu lembar.
3. PATCH `/unit/assessments/{id}/draft` dengan `{request_id,lock_version,scores:[{id:ID_ITEM,score:90}],positive_finding,negative_finding}`. Skor integer 10..100; null hanya untuk draft yang belum lengkap. Hanya item pada lembar itu yang diterima. Nilai total/status/bobot kiriman browser tidak dipakai.
4. POST `/{id}/submit` dengan request_id dan lock_version. Semua KPI harus lengkap. KU dapat POST `/{id}/withdraw` selama submitted menjadi draft.
5. KD membuka `/division/assessments?cycle_id=1&status=submitted`. POST `/{id}/return` dengan request_id, lock_version, reason untuk revisi; atau POST `/{id}/approve` untuk **langsung Final**.
6. KD tidak dapat mengganti angka anggota. Setelah Final, angka/header/item terkunci dan menyimpan kategori serta pelaku KD; tidak ada tahap keputusan HC.

## Penilaian Kepala Unit

KD mengambil `GET /division/heads?cycle_id=1`. POST `/division/assessments` dengan employee_id Kepala Unit dan cycle_id membuat jenis unit_head berdasarkan penugasan server. PATCH `/{id}/draft` memakai format skor yang sama. POST `/{id}/submit` berarti **tetapkan nilai Kepala Unit langsung Final**. Frontend harus memberi label dan konfirmasi yang menjelaskan keputusan akhir. KU tidak dapat melihat atau mengisi lembar jenis ini. Hak akses karyawan melihat nilai sendiri masih menunggu O-3.

KD hanya dapat memulai/menilai Kepala Unit dalam divisinya. Tidak ada penilaian diri sendiri atau penilaian Kepala Divisi.

## Response, retry dan konflik

- Mutasi sukses: `{data: ..., replayed: false}`. Ulangi request yang sama dengan UUID/isi identik saat jaringan tidak pasti; `replayed:true` mengembalikan response operasi pertama tanpa audit/mutasi ganda. Refresh detail untuk kondisi terbaru setelah replay.
- Gunakan UUID baru untuk tindakan baru. Menggunakan UUID lama dengan payload/aktor/operasi/konteks berbeda menghasilkan 409.
- `lock_version` harus versi terbaru dari detail. 409 STALE_VERSION berarti muat ulang dan tinjau, jangan retry dengan menambah versi secara otomatis.
- 401 sesi habis; 403 role/scope tidak sah; 404 record di luar scope atau tidak ada; 419 CSRF; 422 validasi; 429 terlalu banyak percobaan login. Konflik bisnis memberikan `{message,code}`.
- Bulk KD: POST `/division/approvals/bulk` dengan `{request_id,assessments:[{id,lock_version}]}`, maksimal 100. Seluruh batch berhasil atau seluruhnya rollback. Hanya jenis member yang submitted.

## Laporan

GET `/{unit|division|hc}/dashboard?cycle_id=1`, `/members`, `/team`, `/assessments`, `/assessments/{id}`, `/assessments/{id}/timeline`, `/recap?cycle_id=1`. Recap default Final; `status=all` untuk semua proses, atau status tertentu; filter division_id/unit_id hanya mempersempit data yang sah. `format=tsv` menghasilkan data tabular untuk Excel; formula injection dinetralisasi. Daftar menggunakan pagination 25. Anggota dapat difilter unit_id/position_id dalam scope; /team memberi kepala dan jumlah employee per unit. /dashboard memberikan breakdown per divisi/unit/jenis/status serta tugas kepala yang belum dimulai. Audit organisasi dapat dibaca HC melalui GET /hc/audit dengan filter subject_type/subject_id.

`GET /cycles` tersedia untuk semua akun berscope aktif. HC memiliki list/detail master dan scope. Semua kepala mendapat histori konservatif O-7, sehingga angka histori yang tidak berwenang tidak dimasukkan ke daftar/count. `not_started_members` berarti benar-benar belum ada assessment pada employee+cycle; bukan angka histori yang disembunyikan.
