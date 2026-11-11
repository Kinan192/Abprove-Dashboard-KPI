> Historis: preview statis ini sudah digantikan frontend Blade pada proyek utama. Gunakan `/design-review` di Laravel. Lihat `docs/frontend/abprove-blade/README.md`.

# Audit revisi frontend ABprove

Status: preview frontend selesai untuk audit manual, integrasi backend menunggu persetujuan pengguna. Acuan baru adalah HTML dan JPG di `C:\Users\Kinan\Downloads\ABprove`.

Mulai dari [indeks audit](../../../frontend/abprove-preview/audit.html) atau jalankan `npm.cmd run preview:design` dari root proyek dan buka `http://127.0.0.1:4174/`. [Panduan preview](../../../frontend/abprove-preview/README.md) memuat akun contoh, cakupan layar dan batas simulasi.

## Hasil revisi

- Desain ABprove diadopsi dari HTML sumber menjadi HTML/CSS/JS terpisah, dengan branding/logo yang diberikan pengguna.
- 30 layar/dialog mencakup seluruh acuan login, KU, KD dan HC. `assets/catalog.js` memetakan setiap layar ke satu JPG.
- Indeks audit menampilkan preview dan JPG berdampingan, tautan layar langsung, ukuran desktop/tablet/ponsel, serta navigasi layar berikutnya/sebelumnya.
- Figtree dan Plus Jakarta Sans disimpan lokal. Semua 30 JPG disalin dengan hash yang sama dengan sumber.
- Menu ganti role demo dalam profil dihapus sesuai arahan sebelumnya. Pemilih role hanya terdapat pada alat audit di luar UI produk.
- Warna teks pendukung/link/sumbu grafik diperkuat untuk keterbacaan. Tema gelap tetap berfungsi, termasuk kontras tombol dan avatar.
- Panel diberi fokus keyboard, trap Tab, Escape, label tombol ikon, inert saat tersembunyi dan pemulihan fokus.
- Callback fokus yang tertunda tidak lagi melempar error jika drawer ditutup cepat.
- Namespace penyimpanan preview terpisah; toast menyebut Preview lokal agar simulasi tidak disalahartikan sebagai respons server aplikasi.

## Arah visual dan alasan

Design Read: dashboard KPI untuk tiga role rumah sakit, mengikuti bahasa visual ABprove yang diberikan pengguna. **ENERGY 1 / RHYTHM 1 / MOTION 2**.

| Keputusan | Alasan |
|---|---|
| Sidebar hijau tua, tombol merah, permukaan putih/abu | Mengikuti identitas pada HTML dan JPG baru; acuan ini menggantikan palet mint/teal fase sebelumnya untuk revisi visual |
| Sidebar 256 px dan ringkas 76 px | Mengikuti geometri ABprove, bukan memaksakan ukuran shell lama 232 px |
| Header, pencarian, periode dan akun | Mempertahankan susunan serta kepadatan pada screenshot ABprove |
| Figtree dan Plus Jakarta Sans | Font ditentukan HTML sumber; self-host menjaga hasil tanpa internet |
| Tabel, rail karyawan, drawer, kartu progres | Tiap bentuk memberi ruang sesuai kegiatan pengisian, peninjauan dan pengelolaan |
| Grid/pola pada halaman login | Motif identitas yang memang sudah ada pada acuan pengguna |
| Motion singkat | Menjelaskan panel, state dan perpindahan halaman; prefers-reduced-motion tetap dihormati |
| Kontras sedikit lebih kuat | Membaca metadata dan label pada permukaan abu membutuhkan rasio teks yang cukup |
| Akses keyboard | Auditor dapat memakai Tab/Enter/Escape tanpa mengubah komposisi desain |

## Bukti pemeriksaan

- [Browser report](browser-report.json): snapshot 30 layar, indeks audit, login lokal/validasi/logout, draft/pengajuan, keputusan lokal KD, drawer HC, download Excel, tema, dan responsif tiap role pada 390/1024 px. Desktop memakai 1440×900.
- [Screenshot](screenshots/ku-home.png), [login](screenshots/login.png), [review KD](screenshots/kd-review.png), [HC](screenshots/hc-home.png), [ponsel](screenshots/ku-390.png).
- `contrast/`: pemeriksaan pasangan teks/background hasil computed style tiap layar, ditambah tema gelap. Sampling tidak mencakup disabled, elemen dekoratif, miniatur inert dalam panduan, atau teks pada gradient; ini bukan sertifikasi WCAG menyeluruh.
- [Manifest sumber](source-manifest.json): SHA256 HTML/JPG sumber dan fingerprint 123 berkas aplikasi yang dilindungi dari perubahan.
- [Verification](verification.json): integritas gambar, integritas berkas aplikasi, sintaks, inventaris dan hasil pengujian.
- [Delivery Gate](QUALITY_GATE.md): status per butir dan bukti.

Perbandingan visual memakai screenshot HTML yang dapat dioperasikan, bukan menjadikan JPG sebagai isi halaman. Gambar panduan sangat panjang; snapshot QA panduan dibatasi viewport pertama dan HTML sisanya tetap dapat digulir. Tidak ada klaim kesamaan piksel mutlak untuk isi/state yang sudah diubah saat simulasi.

## Temuan alur untuk tahap setelah audit

| Acuan ABprove | Keputusan/implementasi aplikasi saat ini | Tindak lanjut setelah audit |
|---|---|---|
| HC memfinalkan dan membuka kunci | Final hanya KD; unlock belum disahkan | Sesuaikan label, status, stepper dan tindakan sesudah keputusan desain |
| KD meninjau anggota, tanpa menu Nilai Kepala Unit | KD juga menilai dan menetapkan nilai KU | Tambahkan varian layar sesuai kebutuhan yang sudah diputuskan |
| Master KPI dapat diedit langsung | Template published immutable dan berversi | Petakan editor/draft/publish dan state hanya baca |
| Penempatan KPI per orang/per bulan | Template aktif berdasarkan jabatan dan masa berlaku | Tinjau kebutuhan assignment sebelum perubahan kontrak/schema |
| Form profil/password, reset lewat email | Login session tersedia; endpoint profil/reset email belum tersedia | Tetapkan kontrak dan kanal sebelum integrasi |
| Pengingat dan status baca lokal | Panel tugas server tersedia, belum pengiriman terjadwal | Tentukan kanal dan state persisten |
| Export Excel client dari data contoh | Rekap backend berformat TSV sesuai scope | Petakan export pada data nyata dan aturan scope |
| Hapus karyawan baru, perpindahan fleksibel | Organisasi memakai nonaktif/penempatan dengan guard dampak | Pertahankan batas domain ketika menghubungkan UI |

Tabel ini tidak mengubah PRD, schema, policies atau hak role. Seluruh interaksi preview tetap lokal sampai pengguna selesai mengaudit dan meminta progres integrasi.
