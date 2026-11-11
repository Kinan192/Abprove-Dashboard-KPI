# Delivery gate revisi UI v4

**PASS**, 10 November 2026 WIB. Antislop during memakai pilihan sesi pengguna. Gerbang diperiksa pada project terintegrasi. [Rincian kebutuhan](README.md), [hasil gabungan](validation-summary.json), [kontras/syntax/aset](design-qa/verification.json), [ukuran aplikasi nyata](visual-report.json), [CRUD dan alur nyata](../../backend/v3/browser-report.json), [UI review](browser-report.json).

## Hard gate

- R-02 PASS: copy baru tidak memakai em dash; rentang bulan menggunakan tanda hubung.
- R-03 PASS: 99 tampilan pada tiga viewport tidak mempunyai overflow horizontal dokumen/container utama. Seluruh 33 halaman desktop 1440×900 muat vertikal pada data audit. Ponsel tetap dapat menggulir vertikal untuk menjaga keterbacaan 10 hasil per halaman.
- R-17 PASS: jumlah, progres, rata-rata indikator dan peringkat aplikasi nyata berasal dari workspace/insights server. Tes menghitung ulang mean Final dan memastikan scope tidak meluas.
- R-18 PASS: tidak ada testimoni. Nama dan temuan latihan dibuat melalui seeder yang diminta pengguna serta ditandai Contoh/Data latihan.
- R-23 PASS: logo, font dan 37 referensi visual tetap cocok dengan sumber pengguna; susunan menu mengikuti instruksi revisi pengguna.
- R-24 PASS: katalog 37 entry, 33 halaman berakun dan tautan kartu cakupan diuji. Navbar/sidebar mengikuti role akun.
- R-25 PASS: 1.442 pasangan teks/permukaan pada tema terang/gelap dan dialog diperiksa, nol isu kontras AA terdeteksi. Dekorasi, gradient dan disabled dikecualikan oleh alat; bukan audit WCAG menyeluruh.
- R-26 PASS: 9 skenario browser mengoperasikan login, CRUD lima master, skor/return/Final, pembatalan, profil/password, notifikasi, bobot, KPI/periode, impor/ekspor, cakupan dan aktivitas. Suite UI mengoperasikan tab, dialog dan navigasi revisi.
- R-27 PASS: backend menolak skor noninteger, perubahan Final, scope asing dan bobot bukan 100%; empty/error/readonly menggunakan pesan. Workspace memakai aria-busy, error server dan tombol Coba kembali; simpan menonaktifkan kontrol sampai respons selesai.
- R-28 PASS: panduan yang tersedia menjelaskan pekerjaan role dan aturan penilaian; tidak menambah FAQ pemasaran.
- R-32 PASS: dialog native/label/focus ring dipertahankan, Escape diuji pada formulir dan Enter melintasi pagination indikator pada penilaian server nyata. Ctrl K tetap berasal dari shell yang telah diuji pada baseline.
- R-33 PASS: layout dan perilaku ditulis pada Blade, CSS dan modul JS sumber, lalu dikompilasi Vite. Halaman produk tidak menggunakan iframe skala/desain sebagai pengganti komponen.
- R-34 PASS: tema terang/gelap dan state dialog, analitik, KPI, profil serta filter ponsel diperiksa oleh verifier.
- R-35 PASS: build Vite dan Pint lulus; 80 tes backend/723 assertion, 9 skenario integrasi dan 34 tes UI review lulus. Screenshot aplikasi nyata diperiksa untuk beranda, KPI, organisasi dan riwayat/analitik.
- R-36 PASS: integrasi auth/CRUD dinyatakan berdasarkan server nyata. Tidak mengklaim kesiapan beban produksi, sertifikasi keamanan atau pengiriman pesan yang belum dikonfigurasi.
- R-37 PASS: arah ABprove dan ENERGY 1 / RHYTHM 1 / MOTION 2 diteruskan dari Design Read yang telah disetujui dan dicatat pada README sumber/baseline.
- R-38 PASS: referensi visual diperiksa melalui hash. Data contoh masuk melalui seeder yang diminta, sementara UI berakun mengambil data database; tidak memakai fixture terselubung.

## Purpose gate

- R-01 PASS: gradient terbatas pada login yang mengikuti sumber ABprove. Kartu kerja memakai permukaan solid.
- R-04 PASS: ikon navigasi, cari, hapus, kembali dan pagination menunjukkan fungsi yang sama dengan labelnya; tidak menambah ikon dekoratif generik.
- R-06 PASS: Figtree dan Plus Jakarta Sans dipertahankan dari identitas sumber, beserta aset font lokal.
- R-07 PASS: tidak menambah grid/dot pattern pada latar dashboard.
- R-08 PASS: panah pada cakupan/pagination mengarahkan pengguna ke data/halaman berikutnya.
- R-09 PASS: badge menandakan status, kategori dan jumlah pekerjaan nyata.
- R-10 PASS: blur hanya pada navbar; tabel, field dan kartu data tetap solid.
- R-12 PASS: elevasi membedakan dialog/menu dari halaman kerja; tidak menambah shadow besar pada seluruh kartu.
- R-13 PASS: tidak ada glow. Outline menunjukkan fokus keyboard.
- R-14 PASS: kartu progres, jadwal, tugas, temuan dan tabel memakai ukuran sesuai isi. Keseragaman tabel mendukung perbandingan data.
- R-19 PASS: motion singkat untuk menu, hover dan feedback; reduced motion baseline tetap tersedia.
- R-22 PASS: tidak menambah ilustrasi atau foto baru.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2; dashboard kerja tenang dan konsisten.
- Konsistensi dials PASS: ritme tabel/toolbar berulang; tidak menambah animasi dekoratif atau komposisi pemasaran.
- Fokus PASS: KU mengisi, KD meninjau dan menilai kepala, HC menyiapkan serta memantau. Tindakan utama tersedia pada toolbar.
- Whitespace PASS: penggabungan menu dan pengurangan tinggi baris mengurangi scroll; pagination membatasi 5 indikator atau 10 record.
- Accent PASS: merah menekankan tindakan, hijau menjaga identitas dan progres; status juga mempunyai teks.
- Identity PASS: sidebar hijau, logo ABprove, tipografi dan istilah penilaian mempertahankan identitas sumber.
- Design Read PASS: revisi meneruskan sumber HTML/JPG pengguna dan susunan fitur terbaru yang diminta per role.

## Craftsmanship dan consistency locks

- C-1 PASS: warna/font berasal dari sumber, layout mengikuti tugas role, pagination mengikuti angka yang diminta pengguna.
- C-2 PASS: kontrol revisi terhubung ke navigasi, dialog, validasi, unduhan atau endpoint nyata; finalisasi HC tetap ditolak server.
- C-3 PASS: seluruh bagian melayani persiapan, penilaian, persetujuan, histori atau pemantauan.
- C-4 PASS: desktop/tablet/ponsel, tema terang/gelap, empty/readonly, validasi dan CRUD/konfirmasi diperiksa. Scroll vertikal menjadi fallback pada layar kecil atau isi lebih panjang.
- C-5 PASS: hasil tes dan jumlah seed berasal dari report; batas audit dan beban produksi dinyatakan.
- R-05 PASS: komposisi dashboard mengikuti operasional KPI dan RHYTHM 1, tanpa bagian template pemasaran.
- R-11 PASS: radius field, panel, tombol dan avatar mempertahankan variasi fungsi dari sumber.
- R-15 PASS: CTA spesifik: Tambah unit, Ubah, Hapus data, Simpan KPI, Tinjau pengajuan dan Ekspor KPI.
- R-16 PASS: tidak menambah buzzword pemasaran.
- R-20 PASS: bahasa, hirarki unit/divisi dan alur keputusan tetap spesifik sistem KPI rumah sakit ABprove.
- R-21 PASS: tema terang default dan pilihan gelap dipertahankan, kedua tema diperiksa.
- R-29 PASS: palet netral/hijau/merah mempertahankan komposisi 60:30:10 sebagai hirarki; warna status fungsional.
- R-30 PASS: visual mengikuti sumber ABprove pengguna, bukan meniru identitas layanan lain.
- R-31 PASS: layout memuat satu pekerjaan utama, data lanjut dibuka melalui tab/dialog, dan indikator panjang mempunyai rincian. Perubahan KPI historis disimpan untuk melindungi nilai lama.
