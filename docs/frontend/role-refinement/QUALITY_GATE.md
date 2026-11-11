# Delivery gate: revisi per role v1.4

PASS. Bukti utama: [ringkasan](validation-summary.json), [47 tes UI](browser-report.json), [9 skenario server](live-browser-report.json), [uji ulang CRUD staf](staff-popover-browser-report.json), [84 tes PHP/766 assertion](phpunit.xml), [responsivitas](visual-report.json), [kontras/aset/sintaks](design-qa/verification.json), [migration lokal](local-migration.json) dan [hash sumber](source-manifest.json).

## Hard gate

- R-02 PASS: copy tambahan memakai tanda baca biasa; tidak menambah em dash pada UI.
- R-03 PASS: 96 tampilan halaman dan 132 panel pada tiga viewport tidak mempunyai overflow horizontal. Seluruh 76 pemeriksaan desktop 1440×900 muat tanpa scroll vertikal pada data uji. Kolom pembanding diuji juga pada 1024/390 px; dropdown staf memakai popover agar tidak terpotong footer dialog.
- R-17 PASS: nilai, progres dan laporan berasal dari API/workspace; pengurutan tidak mengubah nilai dan tidak menganggap kosong sebagai nol. Bulan tanpa Final tidak diberi angka buatan.
- R-18 PASS: tidak membuat testimoni, foto atau akun fiktif untuk tampilan produksi. Contoh keadaan audit memakai fixture yang berlabel.
- R-23 PASS: logo/font/JPG tetap aset pengguna; 37 referensi diperiksa hash. Combobox dan pengelompokan mengikuti instruksi pengguna tanpa aset baru.
- R-24 PASS: menu aktif dan tautannya diuji. Cakupan KPI dihapus; URL lama mengarah ke KPI. Staf tetap di unit sendiri dan kartu/tautan yang tersisa berfungsi.
- R-25 PASS: 2.031 pasangan warna teks/latar pada halaman, dialog, combobox dan tema diperiksa tanpa isu AA yang terdeteksi. Sampling bukan sertifikasi penuh; disabled/dekorasi/gradient dikecualikan.
- R-26 PASS: 47 tes mengoperasikan prioritas rail, sort lintas pagination, tab/filter, histori, pembanding, pilar, rename dan pencarian. Sembilan skenario server menguji penyimpanan nyata; CRUD diulang setelah perbaikan popover.
- R-27 PASS: terdapat keadaan kosong jejak keputusan, bulan tanpa Final, KPI tidak sebanding, pencarian tanpa hasil, input belum dipilih, validasi pilar dan akses ditolak. Loading/error/Final hanya baca dipertahankan.
- R-28 PASS: panduan tetap berisi langkah kerja role; tidak menambah FAQ generik.
- R-32 PASS: combobox mendukung ARIA, panah, Enter, Escape dan Tab; teks bebas tidak menjadi ID master. Tab profil tetap diuji dengan keyboard. Dialog tetap dapat ditutup dan mempunyai fokus terlihat.
- R-33 PASS: implementasi ditulis pada Blade/CSS/JS sumber melalui apply_patch dan dibangun Vite. Screenshot hanya bukti audit, bukan pengganti UI.
- R-34 PASS: halaman dan state baru diperiksa pada tema terang/gelap; font, field, menu dan warna status tetap terbaca.
- R-35 PASS: build, Pint dan Prettier lulus. 84 tes PHP/766 assertion, 9 skenario Better Auth nyata, 47 tes UI dan uji ulang CRUD staf lulus. Snapshot screenshot disimpan untuk pemeriksaan visual.
- R-36 PASS: tidak membuat klaim sertifikasi, beban produksi atau kesamaan piksel mutlak. Batas sampling dan data latihan dijelaskan.
- R-37 PASS: arah visual ABprove tetap ENERGY 1 / RHYTHM 1 / MOTION 2; matriks v1.4 membatasi area perubahan.
- R-38 PASS: data pada aplikasi berasal dari DB; fixture audit untuk variasi jejak diberi keterangan. Nama seeder tidak disamarkan menjadi karyawan asli.

## Purpose gate

- R-01 PASS: tidak menambah gradient; login sumber tetap dipertahankan.
- R-04 PASS: ikon yang dipakai ulang menunjukkan pengaturan/riwayat, ekspor dan tindakan sebenarnya. Chevron combobox menandai pilihan yang dapat dibuka.
- R-06 PASS: Figtree dan Plus Jakarta Sans tetap identitas sumber; tidak menambah font atau tracking dekoratif.
- R-07 PASS: tidak menambah pola latar dekoratif pada dashboard.
- R-08 PASS: panah hanya menyampaikan urutan, navigasi, dropdown dan pagination.
- R-09 PASS: status dan jumlah menyampaikan keadaan penilaian; tidak menambah badge pemasaran.
- R-10 PASS: panel/form tetap solid; navbar sumber tidak diubah.
- R-12 PASS: shadow pada popover membedakan lapisan pilihan yang mengambang di atas dialog, bukan pada semua kartu.
- R-13 PASS: tidak menambah glow; fokus tetap outline yang fungsional.
- R-14 PASS: komposisi beranda, tabel, profil dan shell dipertahankan. Pembanding menambah satu kolom sesuai tugas tinjau; linimasa memisahkan pelaku/alasan.
- R-19 PASS: popover segera merespons input; tidak menambah animasi dekoratif atau scroll-reveal. Motion yang ada tetap menghormati reduced motion.
- R-22 PASS: tidak membuat ilustrasi, foto atau maskot baru.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 diteruskan dari acuan pengguna, dijelaskan pada README.
- Konsistensi PASS: ritme dan komponen ABprove tetap; pencarian staf mengikuti bentuk field yang sudah dipakai.
- Fokus PASS: KU memprioritaskan pengembalian/pengajuan, KD membandingkan dan memutuskan, HC memilih master serta mengatur KPI.
- Whitespace PASS: tab ringkas sebelumnya tetap; dropdown dan pagination mencegah penumpukan pilihan/data pada container.
- Accent PASS: merah untuk aksi utama dan hijau identitas tetap; status/perubahan nilai memakai warna semantik beserta label.
- Identity PASS: logo, font, sidebar dan istilah KPI per role tidak diganti.
- Design Read PASS: keputusan judul area, tombol penggunaan, combobox dan linimasa mempunyai alasan tertulis pada README.

## Craftsmanship dan consistency locks

- C-1 PASS: setiap perubahan berhubungan langsung dengan matriks v1.4. Hash membuktikan shell, profil, login, beranda Blade dan CSS dasar tetap identik dengan backup.
- C-2 PASS: kontrol menghasilkan perubahan state, pencarian ID, request API, dialog atau unduhan. Kontrol readonly/disabled tetap mempunyai makna.
- C-3 PASS: Cakupan KPI dan pengguna periode yang tidak dibutuhkan dihilangkan; penempatan staf dan Akun Kepala tetap melayani proses nyata.
- C-4 PASS: tiga role, tiga viewport, dua tema, keyboard dan state kosong/berubah/Final diuji. Popover tidak terpotong footer; scroll alami tetap tersedia untuk data panjang.
- C-5 PASS: angka uji bersumber dari report. Backup dan hash membuktikan migration tidak mengubah baris template/indikator/penilaian/snapshot; tidak reseed DB pengguna.
- R-05 PASS: tidak menambah struktur landing page atau pola dashboard baru di luar acuan.
- R-11 PASS: radius panel, field dan avatar tetap; tidak menjadikan semua komponen berbentuk pill.
- R-15 PASS: CTA spesifik seperti Ubah nama KPI, Atur bulan penggunaan & riwayat KPI, Tambah staf dan Simpan perubahan.
- R-16 PASS: tidak menambah buzzword pemasaran.
- R-20 PASS: istilah dan keputusan tetap spesifik alur KPI KU/KD/HC.
- R-21 PASS: pilihan terang/gelap yang ada tetap bekerja; default tidak diubah.
- R-29 PASS: hirarki 60:30:10 netral/hijau/merah dipertahankan. Warna operasional berasal dari token design system, selalu disertai teks.
- R-30 PASS: mengikuti acuan ABprove yang diminta pengguna, bukan meniru produk lain.
- R-31 PASS: alasan tata letak, judul, tombol, pilar dan pembanding tercatat pada README; snapshot mencatat semua source yang berubah.

Services bisnis, policies, middleware dan routes tetap identik dengan backup revisi ini. Perubahan backend dibatasi katalog KPI satu divisi, request pilar dan redirect halaman lama; migration 000008 mengganti CHECK tanpa menghapus data. verification.json memakai baseline backend/v3 yang lebih lama, sedangkan source-manifest.json memakai backup tepat sebelum revisi ini agar perubahan historis tidak dianggap perubahan baru.
