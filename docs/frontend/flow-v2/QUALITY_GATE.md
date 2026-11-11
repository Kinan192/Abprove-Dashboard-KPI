# Delivery Gate alur v1.3

**PASS untuk frontend simulasi alur**, 9 November 2026. Antislop during mengikuti pilihan sesi pengguna.

Bukti: [browser report](browser-report.json), [verifikasi](verification.json), [screenshots](screenshots/), [regresi backend](../../backend/test-result.json), [alur baru](../../requirements/ALUR-KPI-v1.3.md). Sebanyak 48 file model/service/policy/request/migration identik dengan baseline; database pengembangan tidak direset.

## Pemeriksaan aturan

- R-01 PASS: Gradient login mengikuti sumber ABprove; halaman kerja memakai permukaan solid.
- R-02 PASS: Copy baru memakai tanda hubung ASCII; istilah domain mengikuti arahan pengguna.
- R-03 PASS: Browser memeriksa 1440/1024/390 px. Rail ponsel horizontal dan footer dua baris telah diperiksa melalui screenshot. Tabel lebar scroll pada wadah sendiri.
- R-04 PASS: Ikon SVG membantu navigasi, formulir, pencarian dan keputusan sesuai fungsinya.
- R-05 PASS: Komposisi mengikuti pekerjaan operasional, konsisten dengan RHYTHM 1.
- R-06 PASS: Figtree UI dan Plus Jakarta Sans wordmark tetap lokal beserta lisensinya.
- R-07 PASS: Motif login berasal dari sumber; tidak menambahkan motif pada tabel kerja.
- R-08 PASS: Chevron dipakai untuk dropdown; urutan persiapan memakai nomor dan tautan tujuan.
- R-09 PASS: Badge menunjukkan status/jumlah tugas atau kategori dengan label teks.
- R-10 PASS: Blur ringan hanya pada navbar; panel dan tabel tetap solid.
- R-11 PASS: Radius panel, field, button dan avatar bervariasi menurut fungsi.
- R-12 PASS: Elevasi dipakai pada drawer, dialog dan actionbar.
- R-13 PASS: Tidak ada glow tambahan; ring menunjukkan fokus keyboard.
- R-14 PASS: Rail, lembar, daftar, panel persiapan dan dialog memiliki ukuran sesuai isi. Definisi KPI KU/KD ditampilkan sebagai teks hanya baca.
- R-15 PASS: CTA spesifik: Buat akun, Tambah unit, Terapkan versi KPI, Ajukan, Tetapkan Final dan Tutup periode.
- R-16 PASS: Tidak menambahkan buzzword pemasaran.
- R-17 PASS: Statistik berasal dari fixture atau state lokal yang diberi label simulasi, bukan klaim rumah sakit nyata.
- R-18 PASS: Nama/avatar sumber berasal dari pengguna; data uji tambahan memakai nama Audit dan hanya konteks pengujian.
- R-19 PASS: Motion terbatas pada drawer, warna dan feedback; reduced motion disediakan.
- R-20 PASS: Konteks rumah sakit, KPI, identitas ABprove dan sidebar hijau mempertahankan karakter sumber.
- R-21 PASS: Tema terang tetap default dan toggle gelap berfungsi.
- R-22 PASS: Tidak menambahkan ilustrasi generik.
- R-23 PASS: Logo, font dan referensi visual menggunakan materi sumber; tidak menciptakan identitas baru.
- R-24 PASS: Semua halaman role dan 37 entry katalog dapat dibuka. Navigasi menampilkan Anggota Unit, Tim Divisi serta fitur persiapan HC; tanpa tombol ganti role pada shell.
- R-25 PASS: Sampling terang/gelap mencatat 1158 pasangan tanpa masalah AA. Gradien/dekorasi/disabled dikecualikan; pemeriksaan ini bukan sertifikasi WCAG menyeluruh.
- R-26 PASS: 51 tes browser mengoperasikan pengisian lengkap tanpa simpan parsial, return, Final, pembatalan, akun/struktur, KPI, periode, filter, export, profil dan navigasi. Tidak ada request mutasi bisnis dari UI.
- R-27 PASS: Validasi integer 10-100, bobot 100%, required field, scope pilihan kepala, empty state, periode terkunci dan catatan return diuji. Form belum dikirim memberi peringatan dan tidak dipersistenkan.
- R-28 PASS: Panduan setiap role menjelaskan alur baru, dua jenis KPI, akun kepala dan staf tanpa akun.
- R-29 PASS: Hijau/merah/netral menjadi palet inti. Warna tambahan mempunyai fungsi status, bukan dekorasi.
- R-30 PASS: Acuan adalah desain ABprove pengguna, bukan identitas produk lain.
- R-31 PASS: Alasan layout dan komposisi tetap mengikuti dokumen arah sebelumnya. Langkah HC, peran KPI dan jenis penilaian mengikuti kebutuhan baru.
- R-32 PASS: Dialog native, label kontrol, Ctrl K, Escape, focus ring dan focus trap drawer berfungsi; fokus kembali ke tombol navigasi yang terlihat di ponsel.
- R-33 PASS: UI berada pada view Blade v2, komponen bersama, Tailwind dan modul native flow-*. Generated build bukan source; iframe hanya pada indeks pembanding.
- R-34 PASS: Seluruh entry katalog diuji kontras terang/gelap, termasuk halaman persiapan baru dan indeks. Screenshot tema serta viewport disimpan.
- R-35 PASS: Build Vite, cache Blade/routes, Pint dan 51 skenario browser lulus. Regresi backend lama 51 tes/509 assertions dan smoke session/CSRF/logout lulus. XLSX terfilter lolos ZIP CRC dan XML untuk 8 bagian.
- R-36 PASS: Banner menjelaskan data browser lokal. Akun simulasi belum membuat kredensial server; pengingat/reset sandi tidak mengirim pesan. Tidak mengklaim integrasi produksi.
- R-37 PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 dipertahankan dari sumber. Revisi siap untuk review alur; backend bisnis v1.3 belum diintegrasikan.
- R-38 PASS: Referensi pada 37 entry katalog cocok dengan hash gambar sumber. Contoh organisasi/nilai tidak disajikan sebagai fakta produksi.

## Liveliness dan craftsmanship

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2; dashboard operasional tenang dengan struktur berulang dan motion singkat.
- Fokus PASS: HC menyiapkan sistem, KU mengisi staf, KD memutuskan dan mengisi Kepala Unit. CTA serta isi tiap halaman mengikuti pekerjaan tersebut.
- Whitespace PASS: screenshot desktop/tablet/ponsel diperiksa; footer ponsel dan rail orang sudah dirapikan. Teks KPI readonly dapat dibaca penuh, tanpa field edit semu.
- Accent PASS: netral untuk area baca, hijau untuk identitas, merah untuk penekanan aksi, mengikuti hierarki 60:30:10 sumber.
- C-1 PASS: alasan alur dan pemisahan fungsi dicatat pada README serta ALUR v1.3.
- C-2 PASS: alur kosong -> akun -> jabatan -> divisi/unit -> staf -> dua KPI -> periode -> dua Final diuji dalam browser. Parser Excel/pengiriman pesan tetap dinyatakan belum dihubungkan.
- C-3 PASS: bagian baru mendukung konfigurasi, penilaian atau laporan, tanpa bagian pemasaran.
- C-4 PASS: pengisian parsial tidak disimpan, role/akun menjaga cakupan simulasi, Final readonly, versi/snapshot dijaga, serta filter/empty/error/keyboard/tema diperiksa.
- C-5 PASS: angka uji disertai report; perbedaan simulasi, auth nyata dan integrasi berikutnya dinyatakan eksplisit.

## Batas fase

Tidak ada Draft penilaian pada frontend. Backend lama masih memiliki draft dan template per jabatan; kontraknya harus diubah sebelum integrasi v1.3. UI baru tidak memanggil endpoint bisnis lama. Pengguna belum menjalankan audit manual revisi alur ini. Unlock, penilaian KD, akses hasil pribadi staf dan delegasi tetap memerlukan keputusan produk.
