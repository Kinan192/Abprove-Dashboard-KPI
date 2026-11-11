# Delivery gate penyesuaian acuan ABprove

PASS. Acuan adalah HTML/JPG yang ditampilkan di design-review, dengan perubahan domain yang dijelaskan pada [README](README.md). Bukti akhir: [UI browser](browser-report.json), [aplikasi nyata](visual-report.json), [kontras dan sumber](design-qa/verification.json), [integrasi nyata](../../backend/v3/browser-report.json), [ringkasan](validation-summary.json), dan screenshot pada screenshots/.

## Hard gate

- R-02 PASS: copy baru tidak memakai em dash; rentang nilai/bulan memakai tanda yang sesuai.
- R-03 PASS: 99 tampilan aplikasi pada 1440×900, 1024×768 dan 390×844 diperiksa terhadap overflow horizontal dokumen/container. Konten panjang dapat menggulir vertikal sesuai acuan; tabel memakai pagination.
- R-17 PASS: statistik aplikasi berasal dari workspace/insights server dan snapshot Final; bulan tanpa hasil tidak diberi angka rekaan.
- R-18 PASS: tidak menambah testimoni. Nama latihan pada audit berasal dari fixture sumber dan ditandai Data contoh; aplikasi nyata mengikuti akun/database.
- R-23 PASS: logo, font dan 37 referensi JPG berasal dari pengguna. Perubahan susunan dan fitur mengikuti arahan pengguna; hash aset diperiksa.
- R-24 PASS: halaman setiap role, kartu cakupan dan mode Bandingkan diuji. Tidak ada menu ganti role pada aplikasi berakun.
- R-25 PASS: computed style tema terang/gelap, halaman dan dialog diperiksa tanpa isu kontras AA yang terdeteksi. Disabled/dekorasi/gradient dikecualikan; bukan sertifikasi aksesibilitas penuh.
- R-26 PASS: 38 tes UI mengoperasikan tab struktur, formulir/dialog, cakupan, KPI, kategori, laporan, rentang bulan dan mode perbandingan. Sembilan skenario integrasi mengoperasikan CRUD, nilai, persetujuan, profil, auth dan ekspor.
- R-27 PASS: empty state, error/validasi, loading workspace, readonly Final dan periode terpakai dipertahankan. Pemilih riwayat KPI tidak lagi dianggap sebagai edit; edit nyata tetap meminta konfirmasi.
- R-28 PASS: panduan menjelaskan alur tiap role, tanpa FAQ pemasaran atau klaim sinkronisasi yang keliru.
- R-32 PASS: label, focus ring, dialog native, Escape dan Enter dipertahankan. Enter melintasi halaman skor pada pengujian server nyata; details dan selector dapat dioperasikan melalui keyboard.
- R-33 PASS: komposisi dibuat pada Blade/CSS/JS sumber dan dikompilasi Vite. JPG dipakai sebagai acuan di alat perbandingan, tidak dijadikan pengganti UI aplikasi.
- R-34 PASS: tema terang/gelap dan state formulir, analitik, penilaian, pengaturan/profil serta filter ponsel diperiksa.
- R-35 PASS: build dan Pint lulus, 80 tes backend/723 assertion serta sembilan skenario integrasi lulus. Suite UI dan screenshot memperiksa struktur sumber, termasuk sidebar/navbar, rail, siklus, matriks dan lebar bar progres.
- R-36 PASS: tidak membuat klaim kesamaan piksel mutlak, sertifikasi keamanan, kesiapan beban produksi atau pengiriman pesan.
- R-37 PASS: arah visual ABprove yang ditentukan pengguna diterapkan, ENERGY 1 / RHYTHM 1 / MOTION 2 diteruskan dari Design Read sumber.
- R-38 PASS: referensi asli tetap utuh dan diverifikasi hash. Aplikasi nyata memakai data server; fixture hanya pada audit berlabel.

## Purpose gate

- R-01 PASS: gradient tetap pada login dari sumber; area kerja memakai permukaan solid.
- R-04 PASS: ikon home, isi nilai, pengajuan, tabel, cari, ekspor dan hapus mewakili tindakannya dalam pola ABprove.
- R-06 PASS: Figtree untuk isi dan Plus Jakarta Sans untuk identitas diteruskan dari sumber, tanpa mengganti aset font.
- R-07 PASS: tidak menambah pola latar pada dashboard; pola login mengikuti sumber.
- R-08 PASS: panah hanya membantu navigasi, dropdown, kembali dan pagination.
- R-09 PASS: badge menunjukkan status atau jumlah tugas; tidak menambah label pemasaran.
- R-10 PASS: blur terbatas pada navbar; tabel, kartu dan formulir tetap solid.
- R-12 PASS: shadow membedakan drawer/menu dan action bar penilaian seperti acuan; bukan seluruh kartu.
- R-13 PASS: tidak ada glow dekoratif. Fokus menggunakan outline.
- R-14 PASS: ukuran rail, grafik, tabel, kartu siklus dan feed mengikuti isi serta komposisi referensi.
- R-19 PASS: motion tetap singkat untuk navigasi/feedback dan menghormati reduced motion.
- R-22 PASS: tidak membuat ilustrasi/foto baru.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 tetap sesuai dashboard operasional ABprove.
- Konsistensi PASS: ritme tabel, kartu dan toolbar berasal dari sumber; tidak menambah komposisi pemasaran.
- Fokus PASS: KU menilai, KD meninjau/menilai KU, HC menyiapkan dan memantau.
- Whitespace PASS: jarak mengikuti sumber; pagination membatasi isi tabel tanpa mengecilkan keseluruhan aplikasi.
- Accent PASS: merah menekankan aksi utama, hijau identitas, warna status disertai label.
- Identity PASS: wordmark, sidebar, font dan istilah penilaian mempertahankan identitas pengguna.
- Design Read PASS: memakai HTML/JPG ABprove yang sudah ditentukan pengguna, dengan matriks penyesuaian domain tertulis.

## Craftsmanship dan consistency locks

- C-1 PASS: geometri, tipografi, jarak dan struktur mengacu pada HTML/JPG; perubahan domain dicatat pada README.
- C-2 PASS: kontrol menghasilkan navigasi, state, konfirmasi, unduhan atau mutasi API; kontrol periode/Final yang terkunci mempunyai alasan.
- C-3 PASS: setiap bagian melayani persiapan, penilaian, persetujuan, riwayat atau pemantauan.
- C-4 PASS: role, viewport, tema, keyboard, validasi dan keadaan readonly diperiksa; scrolling vertikal menjadi fallback konten panjang.
- C-5 PASS: jumlah tes dan hasil bersumber dari report; perbedaan antara acuan statis, fixture audit dan data nyata dijelaskan.
- R-05 PASS: struktur mengikuti dashboard sumber, bukan pola landing page generik.
- R-11 PASS: variasi radius panel/field/avatar mengikuti sumber dan fungsinya.
- R-15 PASS: CTA spesifik seperti Tambah unit, Simpan perubahan, Ajukan ke Kepala Divisi dan Lihat rekap penilaian.
- R-16 PASS: tidak menambah buzzword pemasaran.
- R-20 PASS: alur dan identitas tetap spesifik KPI rumah sakit ABprove.
- R-21 PASS: tema terang default dan pilihan gelap bekerja.
- R-29 PASS: netral/hijau/merah mengikuti sumber dengan hirarki 60:30:10; warna status bersifat fungsional.
- R-30 PASS: menyesuaikan langsung dengan acuan pengguna yang diminta, bukan meniru produk lain.
- R-31 PASS: alasan geometri, komposisi, pagination, penyesuaian per role dan data kosong tercatat pada README.
