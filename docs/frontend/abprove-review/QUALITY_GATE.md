# Delivery Gate revisi ABprove

Status: **PASS untuk preview frontend lokal**, 9 November 2026. Antislop mode during mengikuti pilihan sesi pengguna. Arah berasal dari HTML dan 30 gambar pengguna. Integrasi aplikasi sengaja menunggu audit manual, sesuai instruksi terbaru.

Bukti: [41 skenario browser](browser-report.json), [verifikasi](verification.json), [manifest sumber](source-manifest.json), `contrast/*.json` dan `screenshots/`. File aplikasi Laravel yang dilindungi berjumlah 123 dan seluruh hash tetap sama. Server QA hanya melayani berkas preview. Tidak ada pengujian backend/database yang dijalankan pada fase ini.

## Hard Gate

- R-02 PASS: teks baru yang ditulis untuk indeks, feedback dan dokumentasi tidak menggunakan em dash. Teks pada HTML/JPG pengguna diperlakukan sebagai materi sumber dan dipertahankan; tidak diklaim sebagai copy baru agen.
- R-03 PASS: browser memeriksa overflow pada 1440 px dan setiap role pada 390/1024 px; indeks audit juga diperiksa pada 390 px. Navigasi ponsel, drawer dan kontrol tetap dapat dioperasikan.
- R-17 PASS: angka di preview berasal dari fixture HTML yang diberikan pengguna, bukan klaim data rumah sakit; indeks dan README menyatakan data contoh lokal.
- R-18 PASS: tidak menambahkan testimonial atau foto orang. Nama/initial avatar berasal dari acuan pengguna.
- R-23 PASS: logo, identitas, daftar menu, pola login dan data contoh diadopsi dari HTML/JPG yang diminta, tanpa membuat identitas baru.
- R-24 PASS: 30 deep link layar dan gambar acuan diuji; menu role mempunyai handler go yang nyata pada frontend lokal. Indeks memeriksa layar berikutnya/sebelumnya dan tab pembanding.
- R-25 PASS: sampling computed text/background seluruh 30 layar dan tema gelap menghasilkan nol pasangan yang melanggar batas AA. Gradient/dekorasi/disabled/miniatur inert dikecualikan dari sampling; copyright login memakai putih dengan rasio minimal 5,316:1 terhadap ujung gradient paling terang. Ini bukan sertifikasi aksesibilitas menyeluruh.
- R-26 PASS: aksi literal data-act mempunyai handler; filter dan input nama template memakai listener input/change. Login, simpan/pengajuan, keputusan, drawer, tema, export dan indeks diklik pada browser. Feedback menyebut preview lokal, tanpa menyiratkan penyimpanan server.
- R-27 PASS: login memiliki loading/error/validasi; pencarian/filter memiliki keadaan kosong; state draft, pengajuan, return, Final dan dialog disediakan data sumber. Error login serta feedback lokal diuji.
- R-28 PASS: panduan membahas fitur KPI, role dan langkah kerja yang tersedia pada sumber, tanpa FAQ pemasaran tambahan.
- R-32 PASS: tombol ikon diberi label, baris aksi dapat memakai Enter/Space, panel menangani fokus/trap Tab/Escape serta background inert; callback fokus tertunda aman saat panel ditutup.
- R-33 PASS: UI berada dalam HTML/CSS/JS sumber yang dapat diedit. Import awal hanya memisahkan style/script dari HTML pengguna; perubahan ditulis pada source. serve/verify/contrast adalah alat layanan atau inspeksi dan tidak memodifikasi CSS/JS tampilan.
- R-34 PASS: tema terang/gelap bekerja; kontras tombol, link, avatar dan grafik gelap disesuaikan. Tema dioperasikan dalam tes dan screenshot disimpan.
- R-35 PASS: delapan berkas JS diperiksa sintaksnya, preview benar-benar dijalankan di Chrome, 41 skenario lulus, dan jalur file HTML langsung juga diuji dengan font termuat tanpa request HTTP. Detail click-through tercatat di browser report.
- R-36 PASS: tidak ada klaim produksi/sertifikasi/performa baru; reset password, pengingat dan keputusan dijelaskan sebagai simulasi, bukan transaksi backend.
- R-37 PASS: sumber visual dan Design Read ditetapkan sebelum perubahan, ENERGY 1 / RHYTHM 1 / MOTION 2. Tahap ini secara eksplisit untuk audit, bukan peluncuran aplikasi terintegrasi.
- R-38 PASS: data/identitas ilustrasi berasal dari materi pengguna; tidak menambahkan anggota/statistik rumah sakit sebagai fakta. Salinan gambar diverifikasi SHA256.

## Purpose Gate

- R-01 PASS: gradient hijau pada login dan area grafik berasal dari acuan, berfungsi sebagai identitas/representasi data; tidak menambahkan glow.
- R-04 PASS: SVG ikon merepresentasikan navigasi, edit, persetujuan, export dan struktur sesuai fungsi dari sumber.
- R-06 PASS: Figtree untuk antarmuka dan Plus Jakarta Sans untuk wordmark mengikuti pilihan sumber; keduanya disimpan lokal beserta lisensi.
- R-07 PASS: motif grid login disertakan pengguna sebagai bagian identitas ABprove; tidak menambahkan motif latar pada halaman kerja.
- R-08 PASS: chevron dipakai pada dropdown, periode dan perpindahan karyawan; panah pada indeks menunjukkan pembukaan tab.
- R-09 PASS: badge mengomunikasikan jumlah tugas, status dan kategori; label preview menyatakan konteks audit, bukan klaim pemasaran.
- R-10 PASS: header sticky menggunakan blur ringan bawaan sumber; panel/data/sidebar tetap solid.
- R-12 PASS: elevasi digunakan untuk drawer/modal/popover/actionbar sesuai lapisan interaksi, bukan diterapkan sebagai dekorasi seluruh kartu.
- R-13 PASS: tidak menambahkan glow; focus ring menunjukkan fokus keyboard.
- R-14 PASS: rail, tabel, panel progres, profil dan drawer mempunyai ukuran sesuai isi. Struktur berulang mendukung RHYTHM 1.
- R-19 PASS: transisi sumber singkat menjelaskan panel/view/feedback; reduced motion tetap disediakan. Screenshot tema menunggu animasi selesai.
- R-22 PASS: tidak menambahkan ilustrasi generik; seluruh materi visual mempunyai sumber pada ABprove.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 dinyatakan sebelum implementasi dan dicatat di README audit.
- Konsistensi PASS: dashboard operasional tenang, pola tabel/form konsisten, motion terbatas pada perpindahan dan feedback.
- Fokus PASS: login menonjolkan form, KU menonjolkan tugas/lembar KPI, KD menonjolkan peninjauan, HC menonjolkan resource yang dikelola.
- Whitespace PASS: padding panel, gap toolbar dan pemisahan rail/drawer mengikuti acuan; pemeriksaan overflow dan screenshot tidak menunjukkan teks keluar wadah.
- Accent PASS: merah menandai tindakan dan status aktif, hijau tua menjadi identitas/sidebar, permukaan netral mendominasi area baca.
- Motif identitas PASS: wordmark, sidebar hijau, status berlabel, tabel KPI dan grafik garis konsisten pada ketiga role.
- Design Read PASS: visual dibaca dari HTML/JPG pengguna, tidak ditentukan dari template generik.

## Craftsmanship dan quality locks

- C-1 PASS: alasan warna, layout, tipografi, panel, spacing dan motion ditulis pada README audit.
- C-2 PASS: seluruh menu mempunyai state tujuan; keputusan/form menghasilkan state/feedback lokal. Scope simulasi dan belum integrasi dinyatakan jelas.
- C-3 PASS: setiap bagian mengikuti kebutuhan penilaian atau alat pembandingan audit, tanpa menambah bagian pemasaran.
- C-4 PASS: browser mencakup desktop/tablet/ponsel, login gagal, keyboard, drawer, konfirmasi, tema, dan download; font serta navigasi HTML langsung bekerja tanpa internet.
- C-5 PASS: fixture dan screenshot dijelaskan sebagai data ilustrasi milik sumber, tanpa klaim hasil uji produksi.
- R-05 PASS: komposisi mengikuti halaman pengguna dan struktur operasional KPI, sesuai RHYTHM 1.
- R-11 PASS: variasi radius antara panel, input, tombol dan avatar dipertahankan dari sumber; tidak menyamakan semua bentuk menjadi pil.
- R-15 PASS: CTA spesifik, seperti Simpan draft, Ajukan ke Kepala Divisi, Tambah karyawan, Atur KPI dan Export Excel.
- R-16 PASS: teks baru tidak memakai buzzword AI/marketing; istilah domain mengikuti sumber.
- R-20 PASS: identitas ABprove, warna, pilar KPI dan konteks rumah sakit dapat dikenali pada komposisi.
- R-21 PASS: tema terang menjadi acuan JPG; toggle gelap sumber dipertahankan dan diuji, bukan ditunda.
- R-29 PASS: hijau, merah dan netral mengikuti sumber; warna kategori/template mempunyai fungsi semantik serta label.
- R-30 PASS: acuan adalah desain yang diberikan pengguna, tanpa meniru identitas produk lain.
- R-31 PASS: tabel alasan keputusan di README audit mencakup seluruh pilihan visual utama.

## Batas persetujuan

PASS berarti preview siap diaudit manual dengan cakupan di atas. Pengguna belum menyetujui desain akhir. Finalisasi HC, unlock, penilaian Kepala Unit oleh KD, versi template dan kontrak penempatan KPI tetap menjadi catatan penyelarasan. Tidak ada progres integrasi dilakukan sebelum hasil audit pengguna.
