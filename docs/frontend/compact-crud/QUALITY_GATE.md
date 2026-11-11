# Quality gate revisi UI ringkas dan CRUD

**PASS untuk frontend simulasi**, 10 November 2026 WIB. Antislop during mengikuti pilihan sesi pengguna.

Bukti: [65 tes browser](browser-report.json), [verifikasi](verification.json), [99 pengukuran halaman](layout-1440.json), [tablet](layout-1024.json), [ponsel](layout-390.json), [15 pengukuran dialog](dialog-layout.json), [5 regresi setelah perapihan jarak formulir](final-spacing-tests.txt), [guard akun sendiri](self-account-guard-tests.txt), [screenshot](screenshots/). Build Vite, cache Blade/routes dan Pint presentasi lulus. Backend tidak diuji ulang pada revisi UI ini; 48 file bisnis yang dilindungi identik dengan baseline.

## Pemeriksaan aturan

- R-01 PASS: Gradient login mempertahankan sumber ABprove; area kerja memakai permukaan solid.
- R-02 PASS: Copy baru tidak memakai em dash; istilah mengikuti domain pengguna.
- R-03 PASS: 33 halaman dashboard masing-masing diukur pada 1440?900, 1024?768 dan 390?844 dengan overflow X/Y nol pada fixture. Lima jenis dialog pada tiga viewport juga diukur tanpa overflow.
- R-04 PASS: Ikon yang dipertahankan menunjukkan navigasi, pencarian, hapus, tutup dan pagination sesuai tindakannya.
- R-05 PASS: Struktur disusun untuk pekerjaan penilaian, pengelolaan dan laporan, dengan RHYTHM 1.
- R-06 PASS: Figtree dan Plus Jakarta Sans berasal dari sumber ABprove, dimuat lokal beserta lisensinya.
- R-07 PASS: Tidak menambahkan pola latar baru pada dashboard.
- R-08 PASS: Panah hanya menunjukkan navigasi halaman, dropdown atau kembali.
- R-09 PASS: Badge tetap menunjukkan status, kategori atau jumlah tugas.
- R-10 PASS: Blur terbatas pada navbar; tabel dan formulir tetap solid.
- R-11 PASS: Radius panel, field, button dan avatar mengikuti fungsi dan sumber.
- R-12 PASS: Elevasi dipakai pada dialog/menu. Footer penilaian kini mengikuti alur dokumen tanpa shadow besar.
- R-13 PASS: Tidak ada glow; fokus keyboard ditunjukkan dengan outline.
- R-14 PASS: Ringkasan, lembar nilai, tabel, rincian dan dialog memiliki kepadatan sesuai jenis isi. Indikator lengkap tersedia melalui rincian.
- R-15 PASS: Tombol memakai tindakan spesifik: Tambah, Ubah, Hapus data, Pindahkan staf, Ajukan dan Tetapkan Final.
- R-16 PASS: Tidak menambahkan buzzword pemasaran.
- R-17 PASS: Statistik dihitung dari fixture/state yang ditandai Data contoh; bukan klaim angka produksi.
- R-18 PASS: Tidak menambahkan testimoni atau orang rekaan ke produk. Data tambahan bertanda Audit hanya berada dalam pengujian.
- R-19 PASS: Motion tetap terbatas pada perubahan warna, menu dan feedback; reduced motion tersedia.
- R-20 PASS: Identitas ABprove, sidebar hijau dan bahasa KPI rumah sakit dipertahankan.
- R-21 PASS: Tema terang tetap default dan pilihan gelap tetap tersedia.
- R-22 PASS: Tidak menambahkan ilustrasi baru.
- R-23 PASS: Logo, font dan materi visual tetap berasal dari sumber pengguna; data kerja ditandai sebagai simulasi.
- R-24 PASS: Seluruh 37 entry katalog dapat dibuka; navigasi shell tetap berdasarkan role. Pemilih halaman hanya berada pada indeks audit.
- R-25 PASS: Sampling 1417 pasangan teks/permukaan pada tema stabil menemukan nol masalah AA. Dekorasi/gradient/disabled dikecualikan; ini bukan sertifikasi WCAG lengkap.
- R-26 PASS: Tes mengoperasikan CRUD lima master organisasi, indikator/versi KPI, periode, pengisian, return, Final, pembatalan, profil, pencarian, filter dan ekspor. Tidak ada request mutasi bisnis pada halaman simulasi.
- R-27 PASS: Required field, nilai 10-100, bobot 100%, dependensi, empty state, return reason dan periode/Final terkunci diuji. Tinjauan tanpa KPI menampilkan petunjuk konfigurasi, tanpa error JavaScript.
- R-28 PASS: Panduan tetap menjelaskan alur tiap role; langkah ditampilkan per tab.
- R-29 PASS: Palet netral, hijau identitas dan merah tindakan mempertahankan hierarki 60:30:10 sumber. Warna status tetap fungsional.
- R-30 PASS: Acuan tetap ABprove pengguna, tanpa meniru identitas produk lain.
- R-31 PASS: Alasan keputusan utama tercatat di bawah dan pada README.
- R-32 PASS: Tab/Enter/Escape, dialog native, Ctrl K, label dan focus ring tetap berfungsi. Enter melintasi halaman nilai; ponsel mempunyai akses pencarian melalui menu akun.
- R-33 PASS: Perubahan berada pada Blade, CSS dan modul JavaScript sumber. Skala iframe hanya digunakan pada kanvas audit; halaman produk tidak diskalakan.
- R-34 PASS: Katalog dan state baru diperiksa dalam tema terang/gelap, termasuk dialog indikator, rincian, versi, periode, temuan, jejak, matriks, peringkat, filter ponsel dan pengaturan profil.
- R-35 PASS: 65 tes lengkap lulus; setelah normalisasi margin formulir, lima tes terkait diulang dan 15 dialog diukur. Guard perubahan role akun sendiri juga diuji ulang. Build akhir berhasil.
- R-36 PASS: Tidak mengklaim integrasi server, pengiriman pesan, perubahan sandi atau keamanan produksi dari simulasi lokal ini.
- R-37 PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 tetap mengikuti arahan dan sumber yang disetujui.
- R-38 PASS: Hash 37 entry referensi cocok dengan sumber pengguna. Data contoh diberi label dan bukan fakta produksi.

## Liveliness dan craftsmanship

- Dials PASS: dashboard operasional tenang, pola konsisten dan motion singkat.
- Fokus PASS: satu pekerjaan utama pada setiap layar; tindakan utama berada di toolbar/footer, rincian pada dialog.
- Whitespace PASS: padding dan baris dipadatkan; pagination/tab membatasi kepadatan tanpa memotong isi.
- Accent PASS: merah menegaskan tindakan utama; hijau mempertahankan identitas dan status tetap disertai teks.
- Identity PASS: shell, tipografi, logo dan bahasa penilaian mempertahankan ABprove.
- C-1 PASS: alasan layout, warna, tipografi dan dialog ditulis secara eksplisit.
- C-2 PASS: kontrol yang diuji menghasilkan perubahan state, navigasi, konfirmasi atau feedback. Impor Excel dan pengiriman pesan tetap berlabel belum terhubung.
- C-3 PASS: isi mendukung persiapan, penilaian dan peninjauan; tidak menambahkan bagian pemasaran.
- C-4 PASS: layout, empty/error/readonly, pergantian halaman, tema dan keyboard diuji. Scroll tetap tersedia sebagai fallback untuk isi panjang, zoom atau viewport lebih pendek.
- C-5 PASS: hasil pengujian bersumber dari report; batas frontend lokal dan backend nyata dinyatakan.

## Alasan keputusan

- Warna: mempertahankan ABprove yang sudah disetujui, dengan merah sebagai penekanan tindakan.
- Tipografi: mempertahankan Figtree untuk keterbacaan data dan Jakarta Sans untuk identitas.
- Layout: sidebar 232 px dan navbar 64 px menyediakan ruang kerja konsisten pada acuan desktop.
- Spacing: satu sistem gap pada grid formulir menghindari jarak ganda dari utility space-y.
- Pagination: membatasi baris sambil mempertahankan seluruh hasil filter, pilihan lintas halaman dan ekspor.
- Tab: memisahkan nilai/temuan/jejak, jenis analitik dan bagian beranda ponsel menurut tugas.
- Dialog: memberi ruang untuk definisi indikator dan CRUD tanpa membuat tabel terlalu lebar.
- Hapus: hanya data yang belum dirujuk boleh dihapus; histori dan hasil Final dipertahankan.

## Batas fase

Ini revisi frontend yang dapat direview. Data bisnis tetap lokal di browser. Login/logout dan middleware role tetap nyata. Tidak ada pembaruan schema, migration, reset database atau integrasi endpoint bisnis. Backend lama masih perlu disesuaikan dengan alur v1.3 setelah audit pengguna. PDF yang sudah disetujui tidak diubah.
