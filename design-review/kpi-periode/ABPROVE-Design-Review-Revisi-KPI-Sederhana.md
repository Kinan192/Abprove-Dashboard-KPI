# DESIGN REVIEW — REVISI FITUR KPI ABPROVE

**Project:** KPI-Kinerja-UIUX / ABPROVE  
**Dokumen:** Spesifikasi desain sistem dan alur penilaian KPI  
**Fokus:** Sederhanakan konfigurasi KPI, pengisian nilai, dan persetujuan berdasarkan role  
**Jenis pekerjaan:** Revisi desain UI/UX dan prototipe, **bukan** pembuatan gambar

> **Instruksi untuk Design Review / AI Designer:** Revisi **hanya fitur KPI terkait** dengan mengikuti komponen dan gaya visual ABPROVE yang sudah ada. Buat rancangan layar dan interaksi menggunakan komponen UI/prototipe yang tersedia. **Jangan generate gambar, PNG, JPG, ilustrasi AI, atau aset visual baru. Jangan redesign keseluruhan aplikasi.**

---

## 1. Keputusan Bisnis yang Harus Dipertahankan

1. **Super HC** menambahkan data staf, melihat dashboard, dan **membuat, mengedit, serta menghapus Master KPI** untuk Kepala Divisi, Kepala Unit/Ruangan, dan Staf. Super HC **tidak mengisi, menyetujui, atau memfinalisasi** penilaian.
2. **Kepala Unit/Ruangan** menilai **staf yang berada di bawahnya**, kemudian mengirim hasil kepada Kepala Divisi.
3. **Kepala Divisi** mempunyai **dua pekerjaan berbeda**:
   - **Menilai Kepala Unit/Ruangan secara langsung**; saat tombol **Selesaikan Penilaian** dipilih, penilaian berakhir.
   - **Memeriksa dan ACC penilaian staf** yang dikirim Kepala Unit. Jika ada kesalahan, **Kembalikan untuk Revisi** kepada Kepala Unit. Saat ACC, penilaian staf berakhir.
4. **Tidak ada tahap persetujuan/finalisasi Super HC** setelah Kepala Divisi.
5. **Master KPI untuk Kepala Divisi** boleh dibuat Super HC, tetapi **alur siapa yang menilai Kepala Divisi belum ditentukan** dan tidak boleh direka-reka dalam revisi ini.
6. Setiap penilaian dikaitkan dengan **periode aktif yang sudah ada**. Tidak perlu membuat modul/peran persetujuan periode baru sebagai bagian revisi KPI ini.
7. Skala skor dan aturan konversi **harus tetap bisa dikonfigurasi**; contoh formula di dokumen ini adalah **usulan desain perhitungan**, bukan ketentuan resmi RS.

## 2. Peta Role yang Sederhana

| Role | Menu utama | Yang dilakukan | Yang tidak dilakukan |
|---|---|---|---|
| **Super HC** | Master KPI, Data Karyawan, Dashboard | Tambah staf, CRUD KPI, menentukan penerima KPI, target, bobot, jenis input; memantau hasil | Mengisi angka realisasi, memberi nilai pegawai, ACC |
| **Kepala Unit/Ruangan** | Penilaian Staf, Riwayat | Memilih staf, mengisi angka aktual / skor manual, simpan draft, kirim | Mengubah rumus/target/bobot, ACC penilaian sendiri |
| **Kepala Divisi** | Penilaian Kepala Unit, Persetujuan Staf | Menilai Kepala Unit langsung; ACC atau mengembalikan nilai staf | Membuat KPI, mengubah formula, meminta persetujuan Super HC |

> **Penting:** Untuk KPI Kepala Unit, **Kepala Divisi langsung mengisi data pengukuran atau skor penilaian**. Kepala Unit **tidak diwajibkan menilai dirinya sendiri atau mengirim self-assessment**. Jika realisasi berasal dari laporan unit, Kepala Divisi boleh mengacu pada bukti/laporan tersebut.

## 3. Struktur Master KPI — Super HC

### 3.1 Daftar Master KPI

Tampilkan tabel yang mempertahankan pola tabel ABPROVE saat ini:

| Nama KPI | Unit/Jabatan Sasaran | Metode Nilai | Target | Bobot | Status | Aksi |
|---|---|---|---|---|---|---|
| Penyelesaian Tiket IT Sesuai SLA | Staf IT | Persentase Otomatis | 95% | 15% | Aktif | Lihat / Edit / Hapus |
| Penambahan Dokter Spesialis | Kepala Unit Pelayanan Medis | Persentase Otomatis | 95% | 20% | Aktif | Lihat / Edit / Hapus |
| Kualitas Koordinasi Tim | Kepala Unit | Nilai Manual | — | 10% | Aktif | Lihat / Edit / Hapus |

Sediakan pencarian, filter Unit, filter Jabatan, dan tombol **+ Buat KPI**. Pertahankan konfirmasi saat menghapus dan jangan merusak penilaian pada periode yang sudah selesai.

### 3.2 Form Buat/Edit KPI — cukup 2 bagian dalam satu halaman atau modal

**Bagian A — Informasi KPI**

- **Nama KPI** (wajib), contoh: `Penyelesaian Tiket IT Sesuai SLA`.
- **Pilar/Kategori KPI** (gunakan pilihan ABPROVE yang sudah ada).
- **Unit/Ruangan sasaran** dan **Jabatan sasaran**: Kepala Divisi / Kepala Unit / Staf.
- **Bobot (%)**.
- **Periode berlaku**: gunakan periode yang sudah tersedia.

**Bagian B — Cara Penilaian**

`Metode Penilaian` menggunakan pilihan sederhana:

1. **Nilai Manual (10–100)** — untuk KPI kualitatif; penilai mengisi satu field **Nilai** sesuai rubrik.
2. **Persentase Otomatis** — untuk KPI berasio; penilai mengisi **dua angka** yang diberi label jelas, lalu sistem menghitung hasil.
3. **Jumlah Otomatis** — untuk KPI berbasis jumlah; penilai mengisi **satu angka realisasi**, lalu sistem membandingkan terhadap target jumlah.

> Jangan tampilkan *formula builder* bebas dengan tombol `+ − × ÷` di alur utama. Cukup **dropdown metode pengukuran**; rumusnya dipilih otomatis berdasarkan metode. Formula builder lanjutan bukan kebutuhan revisi sekarang.

**Jika Persentase Otomatis dipilih, munculkan:**

- **Nama input realisasi (Numerator)**, contoh: `Tiket selesai sesuai SLA`.
- **Nama input pembanding (Denominator)**, contoh: `Total tiket yang dinilai`.
- **Sumber denominator:** `Diisi penilai` atau `Tetap dari konfigurasi KPI/periode`.
- **Target (%)**, contoh `95`.
- **Arah capaian:** `Semakin tinggi semakin baik` / `Semakin rendah semakin baik`.
- **Preview formula (read-only):** `Realisasi ÷ Pembanding × 100%`.

**Jika Jumlah Otomatis dipilih, munculkan:**

- **Nama input realisasi**, contoh: `Jumlah pelatihan selesai`.
- **Target jumlah**, contoh `10`.
- **Satuan**, contoh `kegiatan`, `dokter`, `tiket`.
- **Arah capaian**.
- **Preview formula (read-only):** `Realisasi dibandingkan target jumlah`.

**Jika Nilai Manual dipilih, munculkan:**

- **Panduan/rubrik singkat penilaian**.
- **Skala nilai**, gunakan ketentuan existing `10–100`.
- **Tidak perlu Numerator, Denominator, ataupun rumus otomatis.**

Tambahkan **Preview Tampilan Penilai** di bagian bawah, sehingga Super HC tahu form apa yang akan terlihat oleh Kepala Unit atau Kepala Divisi. Preview bukan tempat mengisi nilai riil.

### 3.3 Aturan pengaturan KPI

- **Super HC mengisi definisi data yang diminta**, **bukan** angka aktual harian/bulanan.
- Target dan bobot ditentukan saat konfigurasi/penugasan KPI untuk jabatan, unit, dan periode terkait.
- KPI yang sama boleh digunakan oleh beberapa unit dengan target/bobot berbeda bila diperlukan.
- Total bobot KPI untuk seorang pegawai dalam suatu periode sebaiknya divalidasi menjadi **100%** sebelum penilaian dapat diselesaikan.
- Perubahan Master KPI **tidak boleh mengubah snapshot penilaian yang sudah selesai**.

## 4. Alur Pengisian KPI — Hanya Dua Jalur

### Jalur A — Staf Dinilai Kepala Unit, lalu ACC Kepala Divisi

```text
Super HC membuat KPI untuk Staf
      ↓
Kepala Unit → pilih Periode → pilih Staf → buka KPI
      ↓
Isi realisasi (jika otomatis) ATAU Nilai (jika manual)
      ↓
Sistem menghitung skor dan nilai berbobot
      ↓
Simpan Draft / Kirim Penilaian
      ↓
Kepala Divisi → Persetujuan Staf
      ├─ Setujui → SELESAI
      └─ Kembalikan + alasan → Kepala Unit revisi → kirim ulang
```

### Jalur B — Kepala Unit Dinilai Langsung Kepala Divisi

```text
Super HC membuat KPI untuk Kepala Unit
      ↓
Kepala Divisi → pilih Periode → pilih Kepala Unit
      ↓
Isi realisasi (jika otomatis) ATAU Nilai (jika manual)
      ↓
Sistem menghitung skor dan nilai berbobot
      ↓
Simpan Draft / Selesaikan Penilaian
      ↓
SELESAI
```

**Tidak ada langkah ACC kedua atau finalisasi Super HC.**

## 5. Tampilan Form Penilaian yang Disederhanakan

### 5.1 Contoh Staf IT — Persentase Otomatis

**Super HC mengatur:**

| Field | Isi |
|---|---|
| Nama KPI | Penyelesaian Tiket IT Sesuai SLA |
| Metode | Persentase Otomatis |
| Label Numerator | Tiket selesai sesuai SLA |
| Label Denominator | Total tiket yang dinilai |
| Target | 95% |
| Bobot | 15% |

**Yang terlihat oleh Kepala Unit saat menilai Staf IT:**

```text
Penilaian Staf — November 2026
Nama staf: [pilih staf]

KPI: Penyelesaian Tiket IT Sesuai SLA
Target: 95%                   Bobot: 15%

Tiket selesai sesuai SLA        [ 65 ]
Total tiket yang dinilai        [ 80 ]

Hasil Pengukuran:               81,25% (otomatis)
Skor KPI:                       85,53 (otomatis, contoh normalisasi)
Nilai Berbobot:                 12,83 poin (otomatis)

Catatan / Bukti:                [ opsional / sesuai ketentuan ]

[ Simpan Draft ]           [ Kirim Penilaian ]
```

Jangan munculkan input `Nilai` manual sekaligus pada KPI otomatis. **Skor otomatis ditampilkan read-only**. Label teknis Numerator/Denominator cukup menjadi keterangan atau tooltip di konfigurasi Super HC.

### 5.2 Contoh Kepala Unit Pelayanan Medis — Persentase Otomatis

**Super HC mengatur** KPI `Penambahan Dokter Spesialis`, label realisasi `Dokter baru bergabung`, label pembanding `Dokter direncanakan`, target persentase `95%`, bobot `20%`.

**Yang terlihat oleh Kepala Divisi saat menilai Kepala Unit:**

```text
Penilaian Kepala Unit — November 2026
Kepala Unit: [nama kepala unit pelayanan medis]

KPI: Penambahan Dokter Spesialis
Target: 95%                   Bobot: 20%

Dokter baru bergabung           [ 3 ]
Dokter direncanakan             [ 4 ]  (terkunci bila sudah ditetapkan)

Hasil Pengukuran:               75% (otomatis)
Skor KPI:                       78,95 (otomatis, contoh normalisasi)
Nilai Berbobot:                 15,79 poin (otomatis)

[ Simpan Draft ]           [ Selesaikan Penilaian ]
```

### 5.3 Contoh KPI Kualitatif — Nilai Manual

```text
KPI: Kualitas Koordinasi Tim
Bobot: 10%
Panduan: Nilai kualitas koordinasi berdasarkan rubrik yang ditetapkan.

Nilai (10–100):                 [ 85 ]
Nilai Berbobot:                 8,50 poin (otomatis)

[ Simpan Draft ]           [ Kirim / Selesaikan ]
```

Pada metode manual **jangan minta angka Numerator/Denominator**.

## 6. Contoh Perhitungan — Gunakan untuk Preview dan Pengujian

**Persentase Otomatis, Higher is Better:**

```text
Hasil Pengukuran (%) = (numerator / denominator) × 100
Skor KPI (contoh)    = min(100, (hasil_pengukuran / target_persen) × 100)
Nilai Berbobot       = skor_kpi × bobot / 100
```

Contoh Staf IT: `65 ÷ 80 × 100 = 81,25%`; target 95% → skor `85,53`; bobot 15% → `12,83 poin`.

Contoh Kepala Unit Medis: `3 ÷ 4 × 100 = 75%`; target 95% → skor `78,95`; bobot 20% → `15,79 poin`.

**Jumlah Otomatis, Higher is Better:**

```text
Skor KPI (contoh) = min(100, (jumlah_realisasi / target_jumlah) × 100)
Nilai Berbobot    = skor_kpi × bobot / 100
```

Contoh 8 dari target 10 pelatihan → skor `80`, bobot 25% → `20 poin`.

**Nilai Manual:**

```text
Skor KPI         = nilai yang diinput penilai (10–100)
Nilai Berbobot   = skor_kpi × bobot / 100
```

Contoh nilai `85`, bobot `10%` → `8,5 poin`.

**Batasan penting:**

- Untuk **Lower is Better** (misalnya kesalahan tagihan), **aturan skor harus disetujui sebagai konfigurasi terpisah**. Contoh non-nol yang bisa dipreview: `min(100, target / hasil × 100)`; **jangan langsung gunakan untuk target 0**.
- Untuk **target nol**, tampilkan kebutuhan aturan khusus, misalnya kebijakan lulus/gagal yang harus ditetapkan. Jangan membagi nol atau membuat nilai otomatis tanpa aturan yang sah.
- Untuk **denominator = 0** atau input belum lengkap, tampilkan `— / Belum dapat dihitung`, bukan `0%` atau `100%` yang menyesatkan.
- **Hasil Pengukuran**, **Skor KPI**, dan **Nilai Berbobot** wajib dibedakan. Jangan memakai satu field `Nilai` untuk ketiganya.
- Jangan mengganti rumus produksi ABPROVE tanpa validasi ketentuan penilaian rumah sakit; dokumen ini menjelaskan rancangan alur dan contoh simulasi.

## 7. Halaman yang Direvisi

### 7.1 Super HC → Master KPI

- Tabel Master KPI tetap mengikuti tata letak ABPROVE.
- Tombol **+ Buat KPI** membuka form ringkas: **Informasi KPI** + **Cara Penilaian**.
- Dropdown **Metode Penilaian** mengubah field input secara dinamis.
- Preview memperlihatkan form yang akan dipakai penilai.
- Aksi: Simpan, Edit, Hapus (dengan konfirmasi), aktif/nonaktif sesuai fitur existing.

### 7.2 Kepala Unit/Ruangan → Penilaian Staf

- Header: periode aktif, pilih staf, status penilaian.
- List KPI staf dalam tabel/card sederhana: nama KPI, target, bobot, input, hasil, status.
- Input menyesuaikan metode KPI (manual / persentase / jumlah).
- Footer: **Simpan Draft** dan **Kirim Penilaian**.
- Setelah dikirim, input terkunci hingga Kepala Divisi mengembalikan penilaian.

### 7.3 Kepala Divisi → Dua Tab Jelas

**Tab A: Penilaian Kepala Unit**

- Daftar Kepala Unit di divisi, pilih kepala unit dan periode.
- Form KPI seperti form staf, tetapi **Kepala Divisi yang mengisi langsung**.
- Tombol **Simpan Draft** dan **Selesaikan Penilaian**.
- Sesudah selesai: **Selesai**, read-only, tanpa ACC Super HC.

**Tab B: Persetujuan Penilaian Staf**

- Daftar penilaian staf yang sudah dikirim Kepala Unit.
- Detail: staf, unit, KPI, input aktual atau nilai manual, hasil otomatis, bukti, dan total skor.
- Tombol **Setujui** atau **Kembalikan untuk Revisi** (wajib isi alasan).
- Setelah disetujui: **Selesai**, read-only.

### 7.4 Super HC → Dashboard

- Hanya melihat jumlah penilaian per periode, belum dikirim, menunggu ACC, revisi, selesai, dan hasil KPI per divisi/unit.
- **Tidak ada tombol Setujui, Finalisasi, atau Input Nilai**.

## 8. Status yang Terlihat pada UI

| Jalur | Status ringkas | Kondisi |
|---|---|---|
| Staf | Belum Dinilai | Kepala Unit belum memulai |
| Staf | Draft | Kepala Unit masih mengisi |
| Staf | Menunggu ACC | Dikirim Kepala Unit, menunggu Kepala Divisi |
| Staf | Perlu Revisi | Kepala Divisi mengembalikan |
| Staf | Selesai | Kepala Divisi sudah ACC |
| Kepala Unit | Belum Dinilai / Draft / Selesai | Kepala Divisi langsung menilai dan menyelesaikan |

Jika backend/PRD lama memiliki enam status, **petakan label UI ke status yang sudah ada**; jangan diam-diam menghapus status database atau membuat workflow tambahan.

## 9. Aturan UI/UX Design System

- **Gunakan design system yang sudah ada**: sidebar, header, warna primer, tipografi, spacing, radius, tabel, button, badge, modal, toast, dan ikon. Jangan membuat identitas visual baru.
- **Bahasa Indonesia yang sederhana**: `Jumlah tiket selesai sesuai SLA`, bukan `Numerator`; `Total tiket yang dinilai`, bukan `Denominator` di form penilai.
- **Satu form, hanya field yang dibutuhkan.** KPI manual menampilkan `Nilai`; KPI otomatis menampilkan angka realisasi/pembanding serta hasil read-only.
- **Hindari wizard panjang.** Untuk Super HC cukup dua bagian; untuk penilai cukup pilih pegawai → isi KPI → kirim/selesaikan.
- **Tampilkan hasil langsung saat angka berubah** agar pengguna memahami hitungannya, tetapi jangan menambah operator aritmatika manual pada layar penilai.
- Target, bobot, dan formula adalah **read-only** pada layar Kepala Unit/Kepala Divisi.
- Gunakan label status yang konsisten; jelaskan hasil otomatis dengan tooltip `Cara menghitung` jika dibutuhkan.
- Sediakan validasi angka, indikator field wajib, state loading, kosong, error, toast berhasil, konfirmasi kirim, dan alasan revisi.
- Responsif pada desktop dan tablet; hindari tabel melebar tanpa scroll atau kolom penting tersembunyi.
- Akses role dan cakupan data harus ditegakkan, bukan hanya disembunyikan di UI.

## 10. Kriteria Selesai (Acceptance Criteria)

- [ ] Super HC dapat membuat KPI **Manual**, **Persentase**, atau **Jumlah** tanpa menulis rumus bebas.
- [ ] Super HC menentukan label input, target, bobot, unit/jabatan sasaran, dan melihat preview form penilai.
- [ ] KPI manual mempertahankan input **Nilai 10–100** dari alur lama.
- [ ] KPI otomatis **tidak** meminta penilai mengisi `Nilai` lagi; skor dan nilai berbobot tampil otomatis.
- [ ] Kepala Unit hanya menilai staf di bawahnya, dapat menyimpan draft, mengirim, dan memperbaiki setelah dikembalikan.
- [ ] Kepala Divisi dapat **langsung menilai Kepala Unit** dan menandai **Selesai**.
- [ ] Kepala Divisi dapat **ACC atau mengembalikan** hasil penilaian staf.
- [ ] **Tidak ada ACC/finalisasi Super HC** dalam jalur penilaian.
- [ ] Dashboard Super HC hanya untuk monitoring.
- [ ] Sistem menangani input kosong, target tidak valid, dan denominator nol tanpa menampilkan hasil palsu.
- [ ] Penilaian selesai tidak berubah ketika Master KPI diedit belakangan.
- [ ] Revisi UI mengikuti komponen ABPROVE lama; **tidak ada pembuatan gambar/PNG/JPG**.

---

## 11. Instruksi Eksekusi Singkat untuk Design Review

**Kerjakan revisi layar berikut saja:**

1. **Super HC — Master KPI:** tambah Metode Penilaian dan field konfigurasi input yang kondisional; preview form.
2. **Kepala Unit — Penilaian Staf:** ganti field `Nilai` dengan realisasi untuk KPI otomatis; pertahankan `Nilai` untuk KPI manual; kirim ke Kepala Divisi.
3. **Kepala Divisi — Penilaian Kepala Unit:** nilai KPI secara langsung dan selesaikan penilaian.
4. **Kepala Divisi — Persetujuan Staf:** review, setujui, atau kembalikan dengan alasan.
5. **Super HC — Dashboard:** pantau status dan hasil, tanpa tombol ACC.

**Jangan melakukan:** perubahan modul lain, penambahan approval Super HC, self-assessment Kepala Unit wajib, formula builder kompleks, desain ulang seluruh produk, pembuatan/generasi gambar atau PNG. **Utamakan kesederhanaan, konsistensi desain lama, dan kemudahan pengguna nonteknis.**
