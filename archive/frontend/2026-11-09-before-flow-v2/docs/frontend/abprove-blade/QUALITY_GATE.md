# Delivery Gate frontend utama

**PASS untuk audit frontend lokal**, 9 November 2026. Antislop during mengikuti pilihan sesi pengguna. Arah visual berasal dari HTML/30 JPG ABprove. Penilaian ini tidak menyatakan persetujuan desain oleh pengguna atau kesiapan integrasi produksi.

Bukti: [48 tes browser lulus](browser-report.json), [verifikasi](verification.json), [51 tes backend / 509 assertions](../../backend/test-result.json), [screenshot 30 layar](screenshots/), [contact sheet](screenshots/contact-sheet.jpg), [keputusan desain dan batas simulasi](README.md). Build Vite, cache Blade/routes dan Pint lulus. Sebanyak 48 file model/service/policy/request/migration identik dengan baseline; database pengembangan tidak direset. Alpine tidak ditemukan pada dependency atau resources aktif. Kode sebelumnya tetap tersedia dalam arsip.

## Hard gate

- R-02 PASS: copy baru tidak memakai em dash. Penamaan dan data domain mengikuti materi pengguna; kode XLSX yang berasal dari sumber dipisahkan sebagai modul dengan penyesuaian konteks.
- R-03 PASS: browser memeriksa 1440/1024/390 px, ketiga role, kartu nilai ponsel dan drawer. Tabel lebar bergulir pada wadah sendiri; halaman Master KPI sudah diperbaiki agar label tersembunyi tidak memperlebar viewport.
- R-17 PASS: data fixture disebut contoh lokal pada shell, login, export dan indeks. Angka dihitung dari fixture, tanpa klaim kinerja rumah sakit nyata.
- R-18 PASS: nama, initial avatar dan data rumah sakit berasal dari sumber pengguna. Tidak menambahkan testimonial atau foto orang.
- R-23 PASS: logo dan motif login menggunakan materi sumber yang diminta. SVG hanya diberi namespace agar dapat dipakai sebagai aset eksternal.
- R-24 PASS: 30 deep link katalog serta halaman tambahan tiap role merespons 200. Sidebar mempunyai tujuan role yang sesuai; tidak ada tombol ganti role di shell.
- R-25 PASS: sampling teks/permukaan pada semua layar terang, semua layar gelap dan indeks gelap mencatat 927 pasangan tanpa pelanggaran AA. Parser QA memakai Canvas untuk warna CSS modern. Gradien/dekorasi/disabled dikecualikan; bukan sertifikasi WCAG menyeluruh.
- R-26 PASS: interaksi ditangani modul native. Tes mengoperasikan draft, submit, tarik, return beralasan, Final, formulir, filter, tab, tema, dialog dan download. Form lokal menghasilkan feedback yang menyatakan database tidak berubah.
- R-27 PASS: validasi 10?100/integer/bobot, login gagal/loading, hasil filter kosong, readonly, catatan revisi dan error formulir tersedia dan diuji. Operasi lokal sinkron tidak diberi proses server palsu.
- R-28 PASS: panduan khusus role menjelaskan langkah dan keputusan yang tersedia, tanpa FAQ pemasaran.
- R-32 PASS: kontrol ikon berlabel, dialog native, pencarian Ctrl K, Escape, focus ring dan drawer ponsel dengan background inert/focus trap. Perilaku Escape pencarian sudah diperbaiki dan diuji.
- R-33 PASS: UI ditulis pada view Blade, CSS/Tailwind dan modul JavaScript sumber. Hasil build hanya generated assets. Iframe dipakai pada indeks pembanding, tidak menjadi implementasi halaman aplikasi.
- R-34 PASS: toggle terang/gelap dipertahankan, tersimpan, dan diuji. Pemeriksaan meliputi seluruh layar; footer Master KPI dan wordmark pada permukaan gelap memakai token yang sesuai.
- R-35 PASS: sembilan modul JavaScript lolos sintaks, Chrome menjalankan Laravel nyata, seluruh 48 skenario lulus. Login/session/CSRF/logout dan akses diuji backend pada MySQL terisolasi. XLSX lolos pemeriksaan ZIP CRC dan XML untuk 22 bagian.
- R-36 PASS: pengingat, reset password, profil dan perubahan data dijelaskan sebagai simulasi lokal. Tidak mengklaim pengiriman pesan atau penyimpanan bisnis server.
- R-37 PASS: Design Read ditetapkan dari sumber, ENERGY 1 / RHYTHM 1 / MOTION 2; tahap akhir ini siap untuk audit manual, integrasi menunggu hasil audit pengguna.
- R-38 PASS: 30 JPG hasil salinan cocok dengan hash sumber. Tidak membuat fakta organisasi atau metrik baru sebagai klaim nyata.

## Purpose gate

- R-01 PASS: gradien hijau login mengikuti identitas sumber; tidak menambahkan glow/dekorasi acak.
- R-04 PASS: ikon SVG membantu mengenali navigasi, pencarian, kalender/periode, formulir dan tindakan.
- R-06 PASS: Figtree untuk UI dan Plus Jakarta Sans untuk wordmark mengikuti sumber, dihosting lokal dengan lisensi.
- R-07 PASS: motif login berasal dari sumber; halaman kerja memakai permukaan solid untuk membaca data.
- R-08 PASS: chevron menunjukkan dropdown, panah audit menunjukkan urutan layar, ikon kembali menunjukkan tujuan navigasi.
- R-09 PASS: badge menunjukkan status, kategori atau jumlah tugas, dengan label teks.
- R-10 PASS: blur ringan hanya pada navbar sticky untuk memisahkan lapisan; tabel dan panel tetap solid.
- R-12 PASS: bayangan pada modal/drawer/actionbar menunjukkan elevasi interaksi.
- R-13 PASS: tidak menambahkan glow; ring menunjukkan fokus keyboard.
- R-14 PASS: rail karyawan, tabel KPI, panel progres, profil dan drawer mempunyai proporsi sesuai fungsi, bukan ukuran kartu seragam.
- R-19 PASS: motion terbatas pada navigasi drawer, warna dan feedback; CSS reduced motion menonaktifkan transisi.
- R-22 PASS: tidak menambahkan ilustrasi generik atau identitas baru.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 tercatat pada panduan dan sesuai dashboard kerja yang tenang.
- Konsistensi PASS: tipografi, token, shell, radius, tabel, formulir dan feedback digunakan bersama melalui Blade/Tailwind.
- Fokus PASS: KU menonjolkan pengisian dan revisi, KD peninjauan/keputusan, HC sumber daya dan rekap. Login memusatkan formulir.
- Whitespace PASS: padding/gap dan lebar panel mengikuti sumber. Contact sheet dan layar penuh telah diperiksa, termasuk drawer dan ponsel.
- Accent PASS: permukaan netral dominan, hijau memberi konteks identitas, merah memberi penekanan tindakan. 60:30:10 merupakan hierarki visual, bukan perhitungan piksel.
- Identitas PASS: sidebar hijau, logo ABprove, wordmark, konteks rumah sakit, pilar KPI dan status berlabel mempertahankan karakter sumber.
- Design Read PASS: implementasi didasarkan pada materi pengguna, bukan template produk umum.

## Craftsmanship dan quality locks

- C-1 PASS: alasan layout, warna, font, panel dan motion dicatat dalam README fase ini.
- C-2 PASS: menu membuka halaman Blade dan tindakan menghasilkan perubahan/state/feedback lokal. Batas parser Excel dan susun manual dijelaskan pada UI serta dokumen, tanpa berpura-pura melakukan transaksi backend.
- C-3 PASS: seluruh bagian mendukung penilaian, pengelolaan atau pembandingan audit, tanpa bagian pemasaran tambahan.
- C-4 PASS: pemeriksaan mencakup tiga viewport, keyboard, tema, empty/error/validation, persistensi draft, pengajuan, Final dan download. Tujuh akun contoh menjaga unit/divisi saat navigasi.
- C-5 PASS: hasil pengujian disertai report, fixture diberi konteks contoh, dan keterbatasan pemeriksaan dinyatakan.
- R-05 PASS: komposisi mengikuti kebutuhan operasional, sesuai RHYTHM 1.
- R-11 PASS: radius panel, input, button dan avatar bervariasi sesuai perannya.
- R-15 PASS: CTA spesifik seperti Simpan draft, Ajukan ke Kepala Divisi, Tetapkan Final, Tambah karyawan dan Export Excel.
- R-16 PASS: tidak menambahkan buzzword pemasaran.
- R-20 PASS: identitas dan isi ABprove tetap dapat dikenali dari komposisi/isi, bukan hanya logo.
- R-21 PASS: terang menjadi default sesuai referensi; toggle gelap berfungsi, tanpa memaksakannya sebagai default.
- R-29 PASS: hijau, merah dan netral membentuk palet inti; warna tambahan mempunyai fungsi status dan label.
- R-30 PASS: sumber adalah desain ABprove milik pengguna, tanpa meniru identitas produk lain.
- R-31 PASS: keputusan visual utama mempunyai alasan tertulis pada README, dan screenshot tersedia untuk audit.

## Batas fase

Frontend utama sudah direfactor. Login/logout dan akses role tetap nyata, sedangkan data kerja/form bisnis masih lokal sesuai instruksi pengguna. Persetujuan KD langsung Final dan pengisian Kepala Unit oleh KD tidak menunggu keputusan lagi. Integrasi kontrak JSON, versi template, penempatan operasional, pagination dan parser XLSX dilakukan sesudah audit. Unlock, penilaian Kepala Divisi, akses anggota, SSO dan delegasi tetap mengikuti keputusan PRD berikutnya.
