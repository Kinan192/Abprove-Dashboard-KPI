# Penyesuaian UI ke acuan perbandingan ABprove

Catatan riwayat: susunan memanjang pada profil, pengaturan, beranda dan laporan di dokumen ini telah digantikan oleh [tab ringkas dan warna status](../compact-tabs-status/README.md), sesuai koreksi pengguna berikutnya. Gaya visual ABprove tetap menjadi acuan.

10 November 2026. Koreksi pengguna: revisi fitur harus mengikuti UI dan layout yang dibandingkan pada /design-review. Komposisi v4 sebelumnya digantikan oleh struktur HTML/JPG ABprove, dengan aturan bisnis terakhir tetap berlaku.

Acuan visual adalah C:/Users/Kinan/Downloads/ABprove/ABprove_KPI_Kinerja.html dan JPG pada public/design-reference/. Materi sumber tetap utuh. Design Read meneruskan **ENERGY 1 / RHYTHM 1 / MOTION 2**, Figtree, Plus Jakarta Sans, sidebar hijau, permukaan putih/abu dan aksen merah dari sumber.

## Bagian yang dikembalikan ke komposisi sumber

| Bagian | Penerapan |
|---|---|
| Shell | Proporsi HTML ABprove: sidebar 256 px, navbar 80 px, padding desktop 32/40 px; bukan ukuran FigCraft terdahulu. Tema dan responsivitas dipertahankan |
| Beranda KU | Sambutan, empat ringkasan, kartu perlu diperbaiki, tabel pekerjaan berikutnya dan tren di kiri; progres pengajuan, tindak lanjut dan KPI unit pada rail kanan |
| Beranda KD | Sambutan, panel persetujuan, empat ringkasan, progres per unit, tabel menunggu persetujuan; penilaian KU tetap dapat dibuka |
| Beranda HC | Siklus di atas, progres divisi berisi bar per unit, lalu aktivitas dan temuan berdampingan |
| Dashboard | Ringkasan, grafik tren dan rata-rata unit berdampingan, matriks rata-rata KPI per bulan, status unit, peringkat dan feed temuan. Jumlah kategori kembali berupa bar sebaran |
| Riwayat KU | Tren di atas, matriks nilai per karyawan yang dapat diklik, lalu feed temuan. Tidak memakai lima tab laporan dari v4 |
| KPI | Kolom No./Pilar/KPI/Numerator/Denominator/Formula/Target/Bobot/Tindakan. HC mengedit langsung pada tabel; total bobot dan tambah KPI berada pada pola footer sumber |
| Lembar penilaian | Rail orang di kiri, lembar KPI di kanan, total nilai dan kedua temuan pada satu lembar. Jejak keputusan tersedia melalui details, tidak menggantikan isi lembar dengan tab |
| Staf | Identitas dengan avatar inisial, jabatan, unit, KPI, penilai, status dan tindakan mengikuti pola tabel karyawan sumber |
| Pengaturan | Jadwal, kategori dan pengguna ditampilkan berurutan seperti sumber; daftar periode dan CRUD periode tetap tersedia |
| Profil | Data diri, sandi dan pemberitahuan ditampilkan berurutan, mengikuti halaman profil sumber |
| Perbandingan | Blade dan JPG sekarang mempunyai viewport dan skala yang sama. JPG panjang tetap dapat digulir. Parameter screen dan mode mendukung tautan langsung |

Contoh perbandingan: http://127.0.0.1:8000/design-review?screen=ku-home&mode=both atau screen=hc-home dan screen=kd-dashboard. Halaman audit memakai fixture lokal berlabel; aplikasi /unit, /division dan /hc tetap memakai akun dan data server nyata. Keduanya memakai komponen Blade yang sama.

## Penyesuaian dari JPG karena kebutuhan yang sudah disetujui

- Pagination tetap 5 indikator dan 10 record. Panjang tabel tidak disalin mentah dari JPG yang memuat seluruh data sekaligus.
- Akun kepala dipisahkan dari staf. Struktur & Staf mempunyai tab Divisi/Unit/Jabatan/Staf; KPI & Periode memuat Indikator/Periode & kategori/Cakupan.
- Finalisasi hanya Kepala Divisi, termasuk nilai Kepala Unit. Label/tombol finalisasi HC dan Draft pada JPG lama mengikuti keputusan domain terbaru.
- Pengaturan periode yang sudah dipakai hanya baca. Perubahan kategori/jadwal dilakukan melalui CRUD periode yang belum dipakai. KPI terpakai tetap melindungi snapshot, sehingga bulan penggunaan tersedia pada pengaturan tambahan editor.
- Grafik, matriks, progres, peringkat dan temuan menggunakan data nyata yang tersedia. Bulan tanpa Final kosong; tidak dibuat angka tambahan untuk menyerupai gambar.
- Konten memakai scroll internal sesuai panjang acuan. Pagination membatasi tabel; ukuran huruf tetap terbaca. Ponsel memakai susunan responsif dengan tiga bulan matriks per rentang dan tombol 44 px.

## Implementasi dan pengujian

Blade utama: resources/views/reference/, resources/views/v2/, resources/views/v4/kpi.blade.php dan layouts/app.blade.php. CSS yang aktif untuk kesesuaian acuan: resources/css/reference-layout.css. Modul reference.js mengikat komposisi sumber ke workspace/insights server. API bisnis, schema, Better Auth dan policies dipertahankan. Data lokal tidak direset atau di-seed ulang pada revisi ini.

Backup sebelum perubahan: archive/frontend/2026-11-10-before-reference-align/. Komposisi v4 sebelumnya tidak lagi menjadi acuan visual aktif.

Perintah verifikasi: npm.cmd run build, npm.cmd run test:ui, npm.cmd run verify:design, python tools/testing/run_backend_tests.py. Screenshot review dan aplikasi nyata tersimpan pada screenshots/. [Pengujian UI](browser-report.json), [99 tampilan nyata](visual-report.json), [audit kontras dan sumber](design-qa/verification.json), [hasil backend](../../backend/v3/test-result.json), [gate](QUALITY_GATE.md).

Audit visual membuktikan struktur, proporsi, komponen dan interaksi mengikuti acuan, dengan penyesuaian pada tabel di atas. Tidak ada klaim kesamaan piksel mutlak untuk data dan fitur yang sudah berubah dari JPG lama.
