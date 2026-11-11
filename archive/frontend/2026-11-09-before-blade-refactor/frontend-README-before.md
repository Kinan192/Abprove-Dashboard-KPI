# Frontend KPI Kinerja

Revisi visual terbaru untuk audit: [preview ABprove](../../frontend/abprove-preview/audit.html) dan [panduan audit](abprove-review/README.md). Tahap preview ini belum menggantikan frontend Laravel terintegrasi yang didokumentasikan di bawah.

Implementasi 8 November 2026: Laravel MVC dengan Blade, Alpine, Tailwind, Vite dan font Inter lokal. Seluruh menu role memakai data backend pada origin/session yang sama. Keputusan akhir tetap pada **Kepala Divisi**.

## Menjalankan

Pada root project, aktifkan MySQL Laragon dan pastikan `.env` memakai database pengembangan yang benar. Database lokal saat implementasi adalah `kpi_kinerja_dev`.

```powershell
npm.cmd ci
npm.cmd run build
php artisan serve
```

Buka `http://127.0.0.1:8000/login`. Untuk pengembangan, jalankan `npm.cmd run dev` pada terminal kedua; hentikan Vite sebelum menguji hasil build produksi. Pada Laragon virtual host, document root menunjuk `public/`, bukan root repository. PHP 8.3+, MySQL 8.4, Node 22.12+ serta ekstensi PHP pada composer.json diperlukan, termasuk zip/dom untuk XLSX.

Jika belum ada akun, jalankan `php artisan kpi:create-admin` untuk membuat Super HC secara interaktif. Alternatif untuk latihan lokal: `php artisan db:seed` membuat akun contoh ketiga role dan data tim; lihat [daftar akun serta lokasi password acak](../backend/LOCAL_DEMO_SEEDER.md). Seeder bersifat opsional dan tidak mereset akun yang sudah ada. Untuk menyiapkan data sendiri setelah login HC:

1. Buat divisi, jabatan, unit dan akun kepala pada Pengguna & Struktur.
2. Buat karyawan dan hubungkan akun Kepala Unit ke karyawannya; tempatkan karyawan pada unit yang sesuai.
3. Tetapkan kepala setiap divisi/unit setelah meninjau preview dampak. Kelayakan role pada akun saja belum memberikan akses.
4. Buat template KPI per jabatan dengan total bobot 100%, tinjau lalu publikasikan.
5. Buat periode beserta jadwal WIB dan kategori yang disahkan. Form usulan batas 70/80/90 hanya mengisi kolom untuk ditinjau, tanpa menyimpan otomatis.
6. Gunakan akun kepala masing-masing untuk menjalankan alur penilaian.

## Halaman yang selesai

| Role | URL | Halaman dan perilaku |
|---|---|---|
| Bersama | `/login` | Login email/NIP, validasi, tampil/sembunyikan kata sandi, feedback gagal |
| KU | `/unit/dashboard` | Progres anggota, tugas dan tenggat, tren Final, akses cepat |
| KU | `/unit/score` | Pilih anggota, isi KPI integer 10–100, temuan, draft, ajukan, tarik kembali, salin bulan sebelumnya yang kompatibel |
| KU | `/unit/submissions` | Tab status, pencarian, detail, pagination, salin/unduh rekap sesuai filter |
| KU | `/unit/history` | Tren dan matriks Final 12 bulan, filter jabatan, buka detail |
| KU | `/unit/kpis` | KPI published untuk jabatan dalam unit, detail item/target/bobot |
| KU | `/unit/members` | Anggota unit, pencarian, status periode, pagination |
| KD | `/division/dashboard` | Progres unit dan tugas persetujuan/penilaian kepala |
| KD | `/division/approvals` | Review anggota tanpa edit angka, return beralasan, ACC langsung Final, ACC pilihan secara atomik |
| KD | `/division/heads` | Isi/draft KPI Kepala Unit naungannya, konfirmasi Tetapkan nilai Final |
| KD | `/division/analytics` | Dashboard Divisi: tren Final, kategori, kelompok jabatan/template/jenis yang sebanding, matriks |
| KD | `/division/team`, `/division/members` | Tim per unit, kepala dan anggota sesuai cakupan |
| HC | `/hc/dashboard` | Progres lintas divisi, tugas konfigurasi dan pelaporan |
| HC | `/hc/recap` | Filter divisi/unit/jenis/status/nama, detail hanya baca, salin/unduh TSV |
| HC | `/hc/kpi-templates` | Daftar/filter template, editor item, validasi 100%, versi, publish dan detail published hanya baca |
| HC | `/hc/kpi-templates/new`, `/hc/kpi-templates/{id}` | Editor draft atau detail template |
| HC | `/hc/import` | Contoh CSV, upload CSV/XLSX, preview validasi per baris, lanjut ke editor draft |
| HC | `/hc/settings` | Periode, jadwal WIB, kategori, validasi, ubah sebelum dipakai, konfirmasi tutup periode |
| HC | `/hc/organization` | Divisi, unit aktif/nonaktif, kepala area, anggota, preview dan konfirmasi penempatan/transfer |
| HC | `/hc/organization/users` | Akun/kelayakan peran, aktif/nonaktif, grant HC dan pencabutan assignment dengan guard backend |
| HC | `/hc/organization/employees` | Karyawan, jabatan/akun terkait, akses penempatan |
| HC | `/hc/organization/positions` | Jabatan dan status aktif |
| HC | `/hc/analytics` | Analitik Final dan matriks sesuai filter |
| HC | `/hc/audit` | Riwayat aktivitas, filter, pagination dan detail event |
| Semua | `/{unit,division,hc}/assessments/{id}` | Detail terotorisasi, snapshot, temuan, pembanding dan riwayat dengan muat lanjutan |
| Semua | `/{prefix}/help`, `/{prefix}/notifications` | Panduan khusus role dan ringkasan tugas dari data server |

Shell bersama menyediakan sidebar desktop 232 px, navbar 64 px, periode global, pencarian halaman (Ctrl K), profil akun, notifikasi, logout terkonfirmasi, skip link dan drawer ponsel. Browser menyimpan periode per akun, tanpa memilih role. Konten utama bergulir di dalam container dashboard. Ukuran acuan 1440×900; pemeriksaan responsif 1024×900, 780 px dan 390×844.

## Perilaku bisnis dan state

- Anggota: KU mengisi → mengajukan → KD mengembalikan untuk revisi atau ACC langsung Final. KD membaca angka anggota. Tidak ada tahap keputusan HC.
- Kepala Unit: KD mengisi → menyimpan draft → menetapkan langsung Final. KU tidak mengisi lembar dirinya sendiri.
- Final hanya baca. Total, kategori, bobot/snapshot dan kewenangan tetap diverifikasi server. Preview total browser tidak menggantikan perhitungan DECIMAL database.
- Dialog, tab dan state prototype diwujudkan sebagai state nyata: loading, kosong, gagal/retry, validasi field, draft kotor, konfirmasi, sukses, Final terkunci, konflik dan sesi habis.
- CSRF/session, UUID retry, lock_version, scoped lookup dan policies tetap aktif. Filter/search/export tidak memperluas cakupan akun.
- Template published tidak diedit. Impor tidak mengeksekusi rumus atau menyimpan sebelum ditinjau.

## Pengujian dan bukti

```powershell
python tools/testing/run_backend_tests.py
php tools/testing/run_frontend_tests.php
npm.cmd run build
php vendor/bin/pint --test
```

Python hanya mengorkestrasi server MySQL pengujian backend; aplikasi tetap PHP/Laravel. Runner browser memakai PHP, Playwright dan Chrome lokal. Kedua runner membuat database/server sementara dengan akun uji acak; tidak menambahkan fixture ke database Laragon pengguna.

- [Backend: 51 tes, 509 assertions dan lima pemeriksaan HTTP nyata](../backend/test-result.json).
- [Laporan browser](browser-report.json) dan [isolasi/penghentian server uji](test-environment.json).
- [Perbandingan FigCraft dan alasan desain](DESIGN_REVIEW.md), [Delivery Gate](QUALITY_GATE.md), [pengukuran visual](visual-qa.json).
- [Screenshot desktop](screenshots/unit-dashboard-desktop.png), [editor nilai](screenshots/score-desktop.png), [ponsel](screenshots/score-mobile.png).

Screenshot memakai fixture berlabel Uji, bukan data rumah sakit. Pemeriksaan ini bersifat lokal/fungsional, belum UAT atau pengujian beban produksi.

## Masih menunggu keputusan PRD

O-1 turunan target atasan; O-2 pengesahan batas kategori; O-3 akses karyawan dan penilai Kepala Divisi; O-4 integrasi SSO; O-5 multi-penugasan/delegasi; O-6 tanggal efektif dan penilaian berjalan; O-7 hak histori setelah mutasi; O-8 unlock; O-9 pengecualian tenggat; O-10 kanal pengingat; O-11 review presisi/versi pilot; O-12 identitas resmi dan ukuran performa pilot. Guard yang berlaku dijelaskan pada [DECISIONS](../backend/DECISIONS.md).

Panel notifikasi adalah ringkasan tugas saat dibuka. Status baca, email/WhatsApp dan pengingat terjadwal belum diterapkan. Tidak ada kontrol pura-pura untuk fitur OPEN tersebut.
