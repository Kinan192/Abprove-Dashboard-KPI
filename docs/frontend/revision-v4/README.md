# Revisi UI dan integrasi v4

**Historis:** komposisi v4 dikoreksi pengguna karena berbeda dari perbandingan design-review. UI aktif kini mengikuti [penyesuaian ke HTML/JPG ABprove](../reference-alignment/README.md). Klaim ukuran dan tidak adanya scroll di bawah berlaku pada snapshot v4, bukan UI aktif terbaru.

Arahan pengguna 10 November 2026 diterapkan pada project Laravel utama, bukan hanya sandbox /design-review. Aplikasi berakun memakai API dan MySQL melalui Better Auth. Desain ABprove, font, palet 60:30:10, sidebar 232 px dan navbar 64 px dipertahankan. Pengaturan layout lama tersimpan di archive/frontend/2026-11-10-before-ui-v4/.

Design Read dan pengaturan visual meneruskan arahan ABprove yang disetujui: **ENERGY 1 / RHYTHM 1 / MOTION 2**. Fokus tetap pada pekerjaan penilaian rumah sakit, tabel padat yang terbaca, serta feedback singkat. Komposisi 60:30:10 berarti hierarki permukaan netral, identitas hijau dan aksen merah; bukan perhitungan literal setiap piksel.

## Perubahan per role

| Role / bagian | Perilaku yang tersedia |
|---|---|
| KU / Beranda | Ringkasan tanggung jawab dan status, tren nilai Final, tindak lanjut penilaian, progres, jadwal dan KPI unit |
| KU / Pengisian dan pengajuan | Nilai integer 10–100, lengkap sebelum dikirim; pengajuan 10 orang per halaman; tanpa Draft |
| KU / KPI | 5 indikator per halaman, bobot hanya baca, ekspor Excel; tanpa tab versi/masa berlaku |
| KU / Riwayat | Layout laporan bersama: nilai per karyawan, temuan, ringkasan, peringkat per kelompok KPI, matriks bulanan; nilai dan temuan 10 per halaman |
| KD / Beranda | Progres per unit, antrean menunggu persetujuan, progres dan jadwal siklus, progres penilaian Kepala Unit |
| KD / Dashboard divisi | Rata-rata nilai per KPI, status penilaian per unit, peringkat bulan terpilih dan temuannya; nilai/temuan per orang 10 per halaman |
| KD / KPI Divisi | 5 indikator per halaman, rincian hanya baca dan ekspor Excel |
| KD / Keputusan | Angka staf tidak dapat diubah; kembalikan dengan alasan atau ACC menjadi Final. Menilai Kepala Unit langsung Final |
| HC / Beranda | Progres per divisi, aktivitas terbaru, temuan bulan terpilih, siklus dan jadwal; tautan langsung Tambah unit |
| HC / Struktur & Staf | Tab Divisi, Unit, Jabatan, Staf dalam satu container; tambah/ubah/hapus terjaga dependensi; 10 baris per halaman |
| HC / Tambah unit | Pilih divisi induk dan akun KU aktif yang belum menjadi kepala unit lain. Pembuatan akun dilakukan dahulu; staf tidak perlu akun |
| HC / Akun Kepala | Akun HC/KD/KU, 10 baris per halaman; akun terpakai tidak dapat dihapus sembarangan |
| HC / Form master | Pengguna cukup mengisi nama/data yang diperlukan. Kode internal otomatis. Aktif/nonaktif hanya pada Ubah; Lainnya untuk rincian/hapus atau transfer staf |
| HC / KPI & Periode | Tab Indikator KPI, Periode & kategori, Cakupan KPI. Pilihan KPI Unit/Divisi, 5 indikator per halaman, input bobot langsung, total 100%, impor CSV/XLSX dan ekspor XLSX |
| HC / Periode & kategori | Jadwal buka/pengajuan/ACC/tutup dan batas kategori Sangat Baik/Baik/Cukup/Kurang. Periode yang sudah dipakai terlindungi; 10 periode per halaman |
| HC / Cakupan KPI | Tersedia di sidebar. Setiap kartu merupakan tautan ke jenis dan unit/divisi KPI yang dipilih |
| HC / Dashboard | Rata-rata per indikator, status per unit, peringkat dan temuan bulan terpilih, nilai per orang serta matriks |
| HC / Riwayat Aktivitas | Tabel 10 catatan per halaman, pencarian, filter tindakan dan rincian sebelum/sesudah yang dapat dibaca; catatan tidak dapat diedit/dihapus |

Label November berasal dari periode terpilih. Mengubah periode mengubah data dan label bulan, sehingga tampilan tetap berguna pada bulan berikutnya. Ringkasan beranda memuat pratinjau yang ringkas dengan tombol rincian; seluruh data tersedia pada halaman lanjutannya.

## KPI, periode dan kategori

Ketiganya mempunyai fungsi berbeda:

- **KPI:** indikator, target dan bobot yang disusun HC untuk satu unit/divisi.
- **Periode:** bulan penilaian beserta tanggal batas pengisian dan persetujuan.
- **Kategori:** batas nilai untuk label hasil, misalnya Baik dan Sangat Baik.

Tab terpisah **Versi & masa berlaku dihapus**. KU/KD hanya melihat KPI untuk periode yang dipilih. HC mengatur perubahan di editor Indikator KPI dengan kolom **Mulai digunakan pada penilaian** serta pilihan **Riwayat perubahan KPI**. Riwayat internal tetap diperlukan agar perubahan indikator bulan berikutnya tidak mengubah penilaian yang sudah dikirim/Final. Menyimpan perubahan pada bulan yang sudah dinilai ditolak; gunakan bulan yang belum dinilai. Hapus hanya diperbolehkan untuk perubahan yang belum dipakai.

Kategori dan jadwal periode yang sudah digunakan tidak ditimpa. Buat/ubah periode yang belum digunakan untuk mencoba batas kategori lain. UI maupun backend tetap memvalidasi bobot 100%, skor integer 10–100 dan Final hanya baca.

## Data dan otorisasi

Endpoint /data/insights mengambil rata-rata indikator dari snapshot Final, bukan indikator aktif yang mungkin telah berubah. Peringkat dipisahkan menurut jenis penilaian dan template agar indikator berbeda tidak dibandingkan langsung. Scope KU hanya unitnya; KD hanya divisinya; HC seluruh organisasi. Filter tidak dapat memperluas scope server. Frontend menampilkan loading/empty/error dan memakai respons server untuk mutasi.

Seeder diperluas menjadi 16 akun latihan (4 HC, 4 KD, 8 KU), 96 staf tanpa akun (12/unit), 7 indikator per template baru dan 49 penilaian pada database baru. Data dan KPI yang telah ada tidak ditimpa. Kredensial tersimpan privat di storage/app/private/local-demo-accounts.json. [Daftar akun](../../backend/LOCAL_DEMO_SEEDER.md).

## Verifikasi

- Build: npm.cmd run build.
- Backend dan Better Auth asli: python tools/testing/run_backend_tests.py, pada MySQL terisolasi dengan timezone server +07:00.
- UI review saat ini: npm.cmd run test:ui. Test flow-v2/compact-crud lama dipertahankan sebagai riwayat kontrak layout lama; suite revision-v4 menguji kontrak penggantinya, CRUD/alur server diuji suite Live.
- Audit font/aset, syntax, kontras tema terang/gelap dan dialog: npm.cmd run verify:design.
- Halaman aplikasi nyata: tools/design-review/revision-v4.mjs memeriksa 33 halaman × 3 viewport (1440×900, 1024×768, 390×844), tanpa mutasi bisnis. Scroll horizontal diperiksa pada dokumen dan container utama. Desktop dipadatkan; layar kecil atau konten panjang tetap dapat menggulir vertikal agar teks dan kontrol terbaca.

[Hasil backend](../../backend/v3/test-result.json), [browser server nyata](../../backend/v3/browser-report.json), [UI review](browser-report.json), [99 tampilan](visual-report.json), [kontras dan sumber](design-qa/verification.json). Screenshot tersimpan pada screenshots/.

Hasil akhir: **80 tes backend / 723 assertion**, **9 skenario browser dengan Better Auth asli**, **34 tes UI review** lulus. **99 tampilan** aplikasi nyata diperiksa tanpa error JavaScript dan tanpa overflow horizontal. Pada 1440×900, seluruh 33 halaman yang diperiksa juga tidak mempunyai overflow vertikal pada container utama dengan data lokal saat audit. Audit tema/dialog memeriksa 1.442 pasangan teks/permukaan tanpa masalah kontras AA yang terdeteksi. Ini bukan sertifikasi aksesibilitas penuh atau uji beban produksi. [Delivery gate](QUALITY_GATE.md).

Tidak ada keputusan PRD yang menghalangi revisi ini. Perubahan hak Final, penilaian Kepala Divisi, delegasi penilai dan membuka ulang Final tetap membutuhkan keputusan baru. Email/WhatsApp belum dikonfigurasi; pengingat menjelaskan bahwa tindakan hanya dicatat.
