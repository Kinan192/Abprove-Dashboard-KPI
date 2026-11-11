# Design System — KPI Kinerja Awal Bros

> **Status:** Draft v1.0 • 7 November 2026  
> **Jenis produk:** Aplikasi internal penilaian kinerja bulanan rumah sakit  
> **Sumber kebutuhan:** `PRD KPI Kinerja: Sistem Penilaian Kinerja Bulanan` (10 halaman, 7 November 2026).  
> **Nama produk:** *Belum diputuskan*. Gunakan label kerja **KPI Kinerja** pada mockup dan kode; tidak mengunci nama brand/logo.

## 0. Cara membaca dokumen

- **[PRD]** = kebutuhan atau batasan eksplisit dari dokumen sumber.
- **[DS]** = keputusan desain yang diusulkan dan dapat diubah setelah review SDM/IT.
- **[OPEN]** = pertanyaan yang harus diputuskan pemilik produk sebelum implementasi final.
- `P0` = wajib rilis uji coba; `P1` = rilis lanjutan; `P2` = penyempurnaan.

Dokumen ini mencakup fondasi visual, aturan konten, komponen, pola interaksi, responsivitas, aksesibilitas, dan spesifikasi handoff. Rincian layar dan alur kerja ada di `UI_UX_BLUEPRINT.md`; token implementasi ada di `tokens.css`.

---

## 1. Prinsip produk

1. **Tugas lebih dulu, grafik kemudian.** Pengguna harus langsung tahu tindakan dan tenggat berikutnya, tanpa mencari di dashboard.
2. **Satu fokus per layar.** Kepala Unit fokus mengisi satu karyawan, Kepala Divisi fokus memutuskan satu penilaian, SDM fokus mengawasi dan memfinalkan.
3. **Status dapat dipahami tanpa warna.** Selalu hadirkan label teks, ringkasan tahap, dan aktor penanggung jawab.
4. **Angka harus dapat diaudit.** Nilai, bobot, subtotal, total, dan perubahan wajib terlihat dengan jelas.
5. **Aksi penting perlu konfirmasi dan jejak.** Mengajukan, menyetujui massal, mengembalikan, memfinalkan, dan membuka kunci tidak boleh menjadi aksi ambigu.
6. **Efisien bagi operator RS.** Form nyaman digunakan dengan keyboard, label Bahasa Indonesia, dan waktu pengisian yang singkat.
7. **Kepatuhan akses di server.** Menyembunyikan tombol di UI tidak menggantikan pengecekan otorisasi di backend.

### Sasaran pengalaman

| Sasaran | Rujukan | Implikasi desain |
|---|---|---|
| Kepala Unit mengisi satu karyawan ≤3 menit | [PRD] Hal. 1 | Input tabel cepat, Enter ke KPI berikut, total instan |
| ≥95% pengajuan tepat waktu | [PRD] Hal. 1 | Progres dan tenggat tampil di halaman utama |
| Seluruh siklus final ≤15 hari | [PRD] Hal. 1–3 | Antrean keputusan, pemantauan progres, penanda keterlambatan |
| 100% perubahan status/nilai terlacak | [PRD] Hal. 2, 9 | Komponen riwayat dan timestamp pada setiap detail |
| Desktop utama, tablet/ponsel untuk melihat & menyetujui | [PRD] Hal. 9 | Tata letak desktop untuk pengisian, panel review responsif |

---

## 2. Identitas visual (usulan desain)

**Karakter:** klinis yang rapi, tenang, tepercaya, fokus data; tidak kaku seperti ERP lama dan tidak ramai seperti dashboard pemasaran.

**Arah gaya:** bidang putih dengan latar abu-hijau sangat pucat, teks navy gelap, warna utama teal, border tipis, shadow sangat ringan, radius sedang. Gunakan identitas/logo rumah sakit resmi hanya setelah aset dan pedoman merek diterima.

**Palet dasar** (bukan klaim warna resmi rumah sakit):

| Token | Hex | Kegunaan |
|---|---|---|
| `brand.50` | `#EDF8F6` | Permukaan pilihan ringan |
| `brand.100` | `#D2EFEA` | Highlight pilihan |
| `brand.500` | `#087F73` | Ikon/data dekoratif, bukan teks kecil di atas putih |
| `brand.600` | `#076C63` | Tombol utama / link teks |
| `brand.700` | `#075A53` | Hover tombol utama |
| `brand.900` | `#0D3D39` | Judul beraksen |
| `neutral.0` | `#FFFFFF` | Card, modal, popover |
| `neutral.50` | `#F8FAFA` | Background aplikasi |
| `neutral.100` | `#F1F4F4` | Secondary surface |
| `neutral.200` | `#E0E7E7` | Border default |
| `neutral.400` | `#8B979B` | Icon subdued (bukan teks kritis) |
| `neutral.600` | `#52616B` | Secondary body text |
| `neutral.900` | `#162833` | Text utama |
| `danger.700` | `#B42332` | Error / aksi destruktif |
| `danger.50` | `#FFF1F2` | Latar error |
| `warning.700` | `#905700` | Menunggu revisi/tenggat |
| `warning.50` | `#FFF7E8` | Latar warning |
| `info.700` | `#2359B8` | Informasi/diajukan |
| `info.50` | `#EEF4FF` | Latar informasi |
| `success.700` | `#196D4B` | Disetujui/sukses |
| `success.50` | `#EAF7EF` | Latar sukses |
| `final.700` | `#5141A4` | Status Final (distinct dari Disetujui) |
| `final.50` | `#F1EEFB` | Latar Final |

**Aturan:** teks terhadap background mengikuti target WCAG AA: minimal 4,5:1 untuk teks normal dan 3:1 untuk teks besar; kontrol/focus indicator harus terlihat. Verifikasi kombinasi warna melalui audit otomatis sebelum rilis. Jangan mengandalkan warna saja untuk makna.

### Warna semantik terpisah

**Status proses** dan **kategori hasil KPI** adalah dua konsep berbeda. Badge "Final" tidak mewakili nilai "Sangat Baik".

| Status proses | Label badge | Warna dasar | Deskripsi |
|---|---|---|---|
| `not_started` | Belum diisi | Netral | Belum ada lembar terisi |
| `draft` | Draft | Netral | Sedang dikerjakan Kepala Unit |
| `submitted` | Diajukan | Biru/info | Menunggu Kepala Divisi |
| `approved` | Disetujui | Hijau/success | Menunggu finalisasi Super HC |
| `returned` | Dikembalikan | Kuning/warning | Perlu perbaikan Kepala Unit |
| `final` | Final | Ungu/final | Terkunci |

Kategori hasil (batas default **dapat diubah oleh SDM**): **Sangat Baik** ≥90, **Baik** ≥80 dan <90, **Cukup** ≥70 dan <80, **Kurang** <70. Tampilkan nama kategori dan total numerik bersama; tidak hanya label/warna.

---

## 3. Tipografi

[DS] Gunakan `Inter`, jika tersedia secara sah/lokal, dengan fallback `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`. Angka dapat memakai `font-variant-numeric: tabular-nums`.

| Gaya | Ukuran / line-height | Bobot | Kegunaan |
|---|---|---|---|
| Page title | 28 / 36 px | 700 | Judul halaman |
| Section title | 20 / 28 px | 650 | Judul bagian |
| Card title | 16 / 24 px | 650 | Judul card |
| Body | 14 / 22 px | 400 | Teks utama dan tabel |
| Body strong | 14 / 22 px | 600 | Angka penting, label |
| Small | 12 / 18 px | 400–600 | Metadata, bantuan |
| KPI numeral | 30 / 36 px | 700 | Total nilai, ringkasan |
| Table numeric | 14 / 22 px | 600 | Nilai, bobot, subtotal |

- Jangan gunakan teks di bawah 12px untuk informasi operasional.
- Nama kolom tabel ringkas; istilah panjang memakai tooltip atau wrapping, bukan truncation tanpa akses ke isi.
- Angka nilai harus rata kanan dan memakai tabular figures.
- Format lokal: `82,75`, `15%`, `7 November 2026`, `10.30 WIB`.

---

## 4. Spacing, grid, ukuran, elevasi

[DS] Sistem jarak 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Max width konten: `1440px`; padding desktop `32px`, tablet `24px`, mobile `16px`.
- Header: tinggi `64px`; backdrop menu overlay dan drawer transparansi terkontrol.
- Grid dashboard: 12 kolom desktop / 6 tablet / 4 ponsel.
- Kesenjangan card `16–20px`; padding card `20–24px`.
- Border radius: `8px` input/badge, `12px` card, `16px` dialog; pill `999px` untuk chip saja.
- Border: 1px neutral.200. Shadow card sangat ringan; drawer/dialog shadow medium.
- Tinggi target interaktif minimal `40px`, untuk sentuh/mobile minimal `44px`.
- Pada tampilan isi nilai, panel daftar karyawan ~`280–320px`, panel kerja fleksibel.

**Breakpoint:** `sm <640px`, `md 640–1023px`, `lg 1024–1439px`, `xl ≥1440px`. Keputusan final harus diuji pada resolusi laptop rumah sakit yang benar-benar dipakai.

---

## 5. Shell aplikasi

[PRD U-2/U-3] Header harus memiliki menu **burger di kiri atas** yang membuka **panel navigasi pop-up** sesuai peran, termasuk jumlah tugas tertunda, profil, ganti peran, dan keluar. Pemilih bulan berada di bagian atas.

**Desktop (disarankan):**

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ☰  KPI Kinerja       [ Periode: Oktober 2026 ▾ ]        🔔  [Profil ▾] │
├──────────────────────────────────────────────────────────────────────┤
│ Breadcrumb / konteks saat ini                                       │
│ Judul halaman                                  Status siklus / tenggat │
│                                                                      │
│ Konten utama                                                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Aturan shell:**

- Burger membuka overlay/menu, **bukan** sidebar permanen (agar sesuai PRD).
- Nama peran aktif ditampilkan pada menu profil; pengguna multi-peran dapat berganti konteks tanpa logout.
- Selalu tampilkan *periode penilaian* secara eksplisit, bukan hanya bulan pemrosesan. Misal: "Penilaian Oktober 2026 — diproses November 2026".
- Bulan yang telah Final hanya memiliki aksi baca; status "Final — terkunci" terlihat.
- Notifikasi panel lonceng diberi label **P1** sesuai PRD, bukan syarat rilis pilot P0; progres tugas tetap muncul pada halaman utama P0.
- Jika halaman spesifik tidak dapat diakses, tampilkan layar "Tidak punya akses" tanpa membocorkan data penilaian.

---

## 6. Komponen inti dan kontrak perilaku

| Komponen | Variasi/state | Aturan utama | Prioritas |
|---|---|---|---|
| `AppHeader` | desktop/mobile, bulan aktif | Burger kiri, periode, profil & role switch | P0 |
| `NavPopover` | open/closed, menu per peran | Tugas tertunda dan menu sesuai cakupan | P0 |
| `MonthPicker` | open/closed, readonly | Ganti bulan; tampilkan periode dan status | P0 |
| `RoleSwitcher` | 1 atau banyak role | Hanya role yang dimiliki, reset context data | P0 |
| `SummaryCard` | default/warning | Satu metrik utama, label, konteks | P0 |
| `ProgressMeter` | count, percent | Teks `2 dari 5 sudah diajukan` + bar | P0 |
| `DeadlineNotice` | normal/dekat/lewat | Tanggal absolut, tindakan, owner | P0 |
| `DataTable` | sort/filter/pagination | Headers jelas, row actions, empty state | P0 |
| `EmployeeList` | search/filter/select | Status per karyawan, penanda returned | P0 |
| `ScoreInput` | empty/valid/error/readonly | Bilangan bulat 10–100; Enter lanjut | P0 |
| `KpiScoreTable` | editable/read-only | Pilar, KPI, target, bobot, nilai, hasil | P0 |
| `LiveScoreSummary` | incomplete/complete | Subtotal/total dan kategori dihitung instan | P0 |
| `StatusBadge` | 6 status | Ikon/teks + tone, tidak warna saja | P0 |
| `FindingFields` | optional | Temuan positif/negatif, tidak masuk rumus | P0 |
| `ApprovalTimeline` | stepper + riwayat | Menjelaskan pemilik tahap dan timestamp | P0 |
| `ReviewDrawer` | read-only | Lembar nilai, selisih bulan lalu, history | P0 |
| `ReturnDialog` | textarea required | Catatan wajib saat Kepala Divisi mengembalikan | P0 |
| `ConfirmationDialog` | single/bulk/final | Jelaskan jumlah, akibat, dan tombol eksplisit | P0/P1 |
| `AuditTimeline` | append-only | Pelaku, waktu, aksi, catatan | P0 |
| `KpiTemplateEditor` | valid/invalid | Total bobot wajib 100% saat menyimpan | P0 |
| `CategoryThresholdForm` | valid/invalid | Batas kategori dikelola Super HC | P0 |
| `CycleScheduleForm` | valid/invalid | Batas pengisian, persetujuan, tutup | P0 |
| `UserScopeEditor` | role + unit/division | Jangan berikan cakupan tidak sah | P0 |
| `Toast` | success/error/info | Nonkritikal; tidak menggantikan inline error | P0 |
| `NotificationPanel` | unread/read | Tugas yang perlu ditindaklanjuti | P1 |
| `HelpPanel` | open/closed | Rumus dan contoh pengisian | P1 |
| `AnalyticsChart` | line/bar/distribution | Label, unit dan alternatif tabel | P1 |
| `BulkActionBar` | selected count | Select all (cakupan terlihat), confirm | P1 untuk KD; P0 untuk SDM finalisasi massal |

### 6.1 Button

- **Primary:** satu tindakan dominan per zona, mis. "Ajukan penilaian".
- **Secondary:** "Simpan draft", "Lihat detail".
- **Tertiary/ghost:** kembali, buka bantuan, navigasi.
- **Danger:** tindakan yang membuka/menghapus state penting; tidak digunakan untuk "Dikembalikan" jika sekadar meminta revisi.
- **Disabled** menjelaskan alasannya (helper text), contohnya "Lengkapi 2 KPI sebelum mengajukan".
- **Pending** mengunci pengiriman ganda serta menampilkan status sedang diproses.
- **Success** memberi umpan balik singkat dan memutakhirkan tabel/progres.

### 6.2 Input nilai KPI

**Kontrak:**

1. Field `type="number"` tidak cukup sendiri; validasi integer dan batas dilakukan juga di server.
2. Nilai `10–100` inklusif; angka pecahan, negatif, `0`, `101`, atau field kosong saat submit ditolak dengan pesan jelas.
3. Batas bobot per template = **100% tepat**, diverifikasi pada editor template; `nilai × bobot / 100` bila bobot disimpan sebagai persen.
4. "Simpan draft" boleh dipakai walau belum semua KPI terisi; "Ajukan" hanya aktif jika setiap KPI valid.
5. Subtotal dan total memperbarui langsung tanpa refresh, **dua angka desimal untuk tampilan**; nilai asli tidak dibulatkan sebelum penyimpanan sesuai PRD.
6. Keyboard `Enter` pindah ke input KPI berikutnya, `Shift+Tab` tetap berjalan normal; akses keyboard tidak boleh hilang saat validasi.
7. Jika field error, fokus diarahkan ke field error pertama saat submit; `aria-describedby` ke pesan terkait.
8. Temuan positif dan negatif opsional serta **tidak** mengubah total.

**Bentuk tampilan yang disarankan:**

```text
KPI                                    Target       Bobot     Nilai     Hasil
Kunjungan Pasien UGD                   95%          15%       [ 90 ]   13,50
Pencapaian Pelatihan                   100%         10%       [ 80 ]    8,00
Implementasi Budaya Prima              Tidak ada    10%       [100 ]   10,00
                                                        Jumlah: 31,50 (contoh parsial)
```

Jangan menampilkan "total akhir" jika yang terlihat hanya tiga KPI dari template yang lebih panjang; labeli "subtotal dari KPI yang terisi" sampai seluruh item lengkap.

### 6.3 Table, filter, pencarian

- Judul tabel mencakup **unit, periode, dan jumlah baris** bila relevan.
- Kolom angka rata kanan, teks rata kiri; sticky header untuk data panjang.
- Filter status dalam tab/chip; search berlaku pada nama atau NIP karyawan yang diizinkan.
- Paginasi atau virtualisasi untuk dataset besar; posisi scroll tidak hilang setelah approve.
- Pilihan massal harus jelas: "3 dari 18 dipilih" dan "Pilih semua di halaman" berbeda dari seluruh hasil filter.
- Kolom tindakan tidak tersembunyi pada hover saja.

### 6.4 Dialog aksi berisiko

- **Ajukan:** "Penilaian akan dikirim ke Kepala Divisi. Anda masih dapat menarik kembali sebelum disetujui." Tombol: "Ajukan penilaian".
- **Setujui:** tampilkan nama karyawan, periode, total. Tombol: "Setujui".
- **Kembalikan:** textarea **Alasan pengembalian** wajib, minimal non-empty setelah trim (batas karakter ditetapkan tim IT); sampaikan penerima revisi.
- **Finalkan:** tampilkan jumlah terpilih, periode, akibat penguncian, dan total status yang berubah.
- **Buka kunci Final [OPEN]:** hanya Super HC; alasan wajib dan diaudit; **perilaku status sesudah unlock harus diputuskan**, jangan mengasumsikannya.

---

## 7. Pola umpan balik & status

| Keadaan | Pola UI | Contoh microcopy |
|---|---|---|
| Memuat data | Skeleton sesuai bentuk konten | `Memuat penilaian…` |
| Tidak ada tugas | Empty state kontekstual | `Tidak ada penilaian yang menunggu persetujuan.` |
| Belum ada KPI | Empty + penyebab/action | `Template KPI jabatan ini belum tersedia. Hubungi Super HC.` |
| Input invalid | Inline error di bawah field | `Masukkan bilangan bulat dari 10 sampai 100.` |
| Pengisian belum lengkap | Alert ringan + jumlah | `Masih ada 2 KPI yang belum diberi nilai.` |
| Draft tersimpan | Toast + metadata waktu | `Draft tersimpan pukul 10.24 WIB.` |
| Sedang menyimpan | Button loading | `Menyimpan…` |
| Permintaan gagal | Inline/page alert + retry | `Perubahan belum tersimpan. Coba lagi.` |
| Data berubah oleh orang lain | Konflik versi | `Penilaian diperbarui oleh pengguna lain. Muat ulang sebelum melanjutkan.` |
| Akses ditolak | Full page 403 | `Anda tidak memiliki akses ke penilaian ini.` |
| Penilaian Final | Read-only + lock icon | `Final — nilai terkunci.` |
| Siklus ditutup | Read-only + tanggal | `Siklus ditutup pada 15 November 2026.` (contoh) |

Tidak pernah menampilkan pesan sukses sebelum server mengonfirmasi perubahan. Jangan hanya mengandalkan toast untuk aksi berisiko; status tabel/detail juga harus berubah.

---

## 8. Aksesibilitas dan responsivitas

**Aksesibilitas minimum:**

- Keyboard untuk menu, tab, dialog, tabel, filter, dan formulir; fokus terlihat jelas `2px` + offset.
- Dialog mengunci fokus secara benar dan mengembalikannya ke pemicu ketika ditutup.
- Semua kontrol memiliki label yang terbaca screen reader.
- Semua chart punya ringkasan angka atau tabel setara.
- Label dan angka bukan informasi berbasis warna saja.
- Konten diperbesar hingga 200% tanpa kehilangan tindakan vital.
- Animasi 120–180ms untuk transisi ringan [DS]; hormati `prefers-reduced-motion`.
- Format bahasa `id-ID`, zona waktu `Asia/Jakarta`/WIB sesuai PRD, termasuk seluruh tampilan riwayat.

**Responsif:**

| Perangkat | Pola |
|---|---|
| Laptop/desktop ≥1024px | Split view daftar karyawan + panel input; review drawer |
| Tablet 640–1023px | Daftar dan detail berganti panel; ringkasan sticky jika tidak menutupi data |
| Ponsel <640px | Layar tugas tunggal, kartu KPI bertumpuk, tindakan penting pada area bawah |

[PRD] Ponsel diprioritaskan untuk **melihat dan menyetujui**. [DS] Pengisian nilai di mobile dapat disediakan setelah diuji, tetapi jangan mengorbankan pengalaman desktop atau menetapkannya sebagai syarat P0 baru.

---

## 9. Konsistensi perhitungan dan data

[PRD] `Total = Σ(nilai KPI × bobot KPI)` dengan bobot sebagai fraksi (misal 15% → 0,15). Format display dua desimal, data mentah tidak dibulatkan. Satu penilaian per karyawan per bulan; nilai Final harus mempertahankan salinan KPI dan bobot historis.

**Aturan visual data:**

- Tampilkan nomor/label periode eksplisit; jangan campur *bulan dinilai* dengan *bulan persetujuan*.
- KPI berlaku menurut **jabatan**, bukan per karyawan; header detail harus menunjukkan jabatan dan template yang berlaku.
- Tampilkan nama pilar dari daftar tetap: `Technical Care`, `Access`, `Coordination and Continuity`, `Interpersonal Care`, `Efficient`.
- Target dapat berupa teks bebas seperti `95%`, `Tidak ada`, `0 complaint`, `<20%`; jangan memaksakan input target sebagai angka.
- Setiap hasil angka yang membandingkan bulan perlu menyebut basis dan ketiadaan data, bukan otomatis menyajikan `0` untuk bulan tanpa nilai.
- Saat Master KPI berubah, penilaian yang sudah Final tetap menampilkan salinan label/bobot KPI historis.

---

## 10. Aturan keamanan yang memengaruhi desain

- Tidak pernah menampilkan data di luar **cakupan peran yang aktif**, bahkan dalam search suggestions, jumlah data agregat, endpoint, atau deep link.
- Kepala Unit hanya mengubah nilai dalam unitnya sebelum disetujui/final; Kepala Divisi tidak dapat mengubah angka; Super HC tidak menilai atas nama Kepala Unit.
- Session inactivity 30 menit [PRD]; sebelum/ketika sesi berakhir tampilkan informasi yang jelas dan hindari klaim draft tersimpan tanpa konfirmasi.
- Audit trail tampil pada detail sebagai **read-only**; pengguna tidak dapat mengedit/menghapus riwayat.
- Aksi membuka kunci Final hanya terlihat dan dieksekusi oleh Super HC, dengan audit dan alasan.
- UI harus mengantisipasi hasil `403`, `409 conflict`, dan error validasi server tanpa membocorkan detail internal.

---

## 11. Do / Don't

| Lakukan | Hindari |
|---|---|
| `2 dari 5 diajukan` + progress bar | Progress bar tanpa numerator/denominator |
| `Diajukan — menunggu Kepala Divisi` | Badge biru tanpa teks |
| `Nilai 90 × Bobot 15% = 13,50` | Angka hasil tanpa sumber perhitungan |
| `Perbaiki penilaian` dengan alasan pengembalian | Hanya status merah `Dikembalikan` |
| Dialog `Finalkan 12 penilaian?` | Finalisasi massal dari satu ikon tanpa konfirmasi |
| Pisahkan total nilai dan status approval | Menyamakan kategori `Baik` dengan status `Disetujui` |
| Tombol simpan draft dan ajukan terpisah | Auto-submit saat mengetik |
| Data read-only ketika Final | Input tampak aktif tetapi server menolak belakangan |

---

## 12. Handoff ke frontend

**Nama komponen referensi:**

```text
components/
  shell/AppHeader.tsx
  shell/NavPopover.tsx
  shell/RoleSwitcher.tsx
  cycle/MonthPicker.tsx
  cycle/DeadlineNotice.tsx
  assessment/EmployeeList.tsx
  assessment/KpiScoreTable.tsx
  assessment/ScoreInput.tsx
  assessment/LiveScoreSummary.tsx
  assessment/ApprovalTimeline.tsx
  assessment/AuditTimeline.tsx
  approval/ReviewDrawer.tsx
  approval/ReturnDialog.tsx
  approval/ConfirmationDialog.tsx
  master-kpi/KpiTemplateEditor.tsx
  shared/StatusBadge.tsx
  shared/ProgressMeter.tsx
  shared/DataTable.tsx
  shared/EmptyState.tsx
```

Folder hanya rekomendasi naming; tidak menetapkan stack/framework final. Token CSS di `tokens.css` dapat dipakai langsung sebagai dasar implementasi atau diterjemahkan ke Tailwind/theme system.

**Definition of Done (UI):**

- [ ] Teks Bahasa Indonesia, WIB, angka desimal koma.
- [ ] Semua enam status ada di komponen StatusBadge dan state transition.
- [ ] Form nilai menolak angka di luar 10–100, tanpa desimal.
- [ ] Bobot template 100% sebelum bisa disimpan.
- [ ] Ajukan terblokir saat KPI belum lengkap; draft tetap bisa disimpan.
- [ ] Rumus hasil, total, kategori, dan dua desimal benar.
- [ ] Final read-only, unlock hanya Super HC + catatan audit.
- [ ] Setiap peran hanya melihat menu/data yang sah dan server menegakkannya.
- [ ] Fungsi keyboard, focus, contrast, reduced-motion diuji.
- [ ] Desktop/tablet/mobile serta loading/empty/error/success diperiksa.
- [ ] Seluruh halaman P0 punya acceptance scenario dan tautan ke PRD.

---

## 13. Isu yang harus dikonfirmasi SDM/IT

[OPEN — disalin dari PRD, halaman 10]

1. Apakah "Turunan Target/KPI dari atasan" dinilai, dan berapa bobotnya?
2. Apakah batas kategori 90/80/70 sudah disetujui?
3. Apakah Kepala Divisi benar-benar hanya approve/return, tanpa edit nilai?
4. Apakah karyawan perlu melihat nilainya setelah Final?
5. Apakah login menggunakan SSO/Mekari Talenta atau akun baru?
6. Siapa yang menilai Kepala Unit dan Kepala Divisi sendiri?

[OPEN — keputusan implementasi yang masih belum dijelaskan eksplisit]

7. Status tepat setelah Super HC membuka kunci Final dan apakah ada mekanisme approval ulang?
8. Perilaku operasi saat tenggat terlewati: blokir mutasi atau izinkan pengecualian dengan catatan?
9. Apakah bobot master memakai penyimpanan desimal fraksi atau integer basis point? (pastikan perhitungan presisi)
10. Apakah materi identitas resmi (logo, font, warna) tersedia untuk mengganti palet usulan?
11. Apakah indikator "tugas tertunda" perlu dihitung dengan kriteria per-role tertentu?

**Jangan mengubah pertanyaan terbuka menjadi aturan produk permanen tanpa persetujuan.**
