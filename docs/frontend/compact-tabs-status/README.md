# Tab ringkas dan warna status penilaian

10 November 2026. Revisi ini memperbaiki susunan memanjang setelah penyesuaian acuan ABprove. Pengguna meminta pola button seperti Divisi/Unit/Jabatan, mengurangi scroll dan memberi warna pada teks status. Identitas, sidebar/navbar, palet, font, tabel dan formulir tetap memakai gaya acuan ABprove.

## Pembagian halaman

| Halaman | Bagian yang dipilih melalui tab/button |
|---|---|
| Profil semua role | Data diri, Keamanan, Pemberitahuan |
| Beranda KU | Tindak lanjut, Tren nilai Final; rail progres/KPI tetap terlihat |
| Beranda KD | Ringkasan & progres, Persetujuan & nilai KU |
| Beranda HC | Siklus & progres, Aktivitas & temuan |
| Riwayat KU | Nilai karyawan, Tren unit, Temuan staf |
| Dashboard KD/HC | Ringkasan, Rata-rata KPI, Status unit, Peringkat & temuan, Nilai karyawan |
| Periode & kategori HC | Jadwal, Kategori nilai, Daftar periode, Pengguna |
| Panduan | Langkah persiapan/penilaian sesuai role |

Struktur & Staf mempertahankan Divisi/Unit/Jabatan/Staf. KPI & Periode mempertahankan Indikator/Periode & kategori/Cakupan. Tidak ada bagian profil yang dihapus atau dipindah ke halaman demo. Formulir, dialog dan data server tetap bekerja pada aplikasi berakun.

## Warna teks status

| Status | Warna | Makna |
|---|---|---|
| Belum diisi | Abu-abu | Nilai belum dikirim |
| Diajukan | Biru | Menunggu keputusan Kepala Divisi |
| Dikembalikan | Oranye | Perlu diperbaiki Kepala Unit |
| Final | Hijau | Keputusan akhir, hanya baca |

Label tetap tertulis sehingga informasi tidak bergantung pada warna saja. Helper status digunakan pada tabel penilaian, anggota unit, rail nama dan label progres. Tema terang/gelap menggunakan token design system masing-masing; tidak mewarnai angka nilai berdasarkan status pengajuan.

## Kepadatan dan interaksi

- Tab memakai komponen Blade bersama, atribut ARIA, fokus terlihat, ArrowLeft/Right, Home/End serta Enter/Space. Isi formulir yang belum disimpan tetap berada pada panel saat berganti tab.
- Hanya panel terpilih yang tampil. Deep link `?panel=results#temuan` membuka bagian laporan yang dimaksud. Rentang bulan terlihat untuk matriks KPI/nilai karyawan dan mengikuti panel aktif.
- Pagination tetap 5 indikator KPI dan 10 record untuk tabel master, penilaian, nilai karyawan serta temuan. Tombol Ubah/Lainnya pada tabel organisasi dibuat sejajar agar tidak menggandakan tinggi baris.
- Ringkasan beranda menggunakan cuplikan: 3 pekerjaan berikutnya, 1 pengembalian per halaman, 1 divisi per halaman, 5 unit pada widget status dan 4 aktivitas. Tautan Lihat semua membuka daftar lengkap.
- Padding dan baris tabel dibuat lebih ringkas tanpa mengecilkan seluruh antarmuka. Detail temuan lengkap tetap dapat dibuka melalui nama/lembar nilai.
- Profil desktop 1440×900 diperiksa tanpa scroll pada ketiga tab. Konten panjang dan layar kecil tetap bisa menggulir vertikal; tidak memakai pemotongan konten atau `overflow:hidden` untuk menyembunyikan data.

## Alasan keputusan visual

Tab mengurangi beban satu container dan menjaga pola yang sudah dikenal dari Struktur & Staf. Sidebar 256 px/navbar 80 px, Figtree, Plus Jakarta Sans, logo, warna dasar netral/hijau dan aksen merah meneruskan HTML/JPG yang dipilih pengguna. Proporsi 60:30:10 tetap menjadi hirarki palet; biru/oranye/hijau pada status mempunyai fungsi operasional. Jarak 16–18 px memisahkan bagian tanpa membuat halaman memanjang. Avatar inisial dan ikon yang ada dipakai kembali, tanpa aset visual baru.

Design Read: dashboard operasional KPI bagi KU, KD dan Super HC dalam gaya ABprove, **ENERGY 1 / RHYTHM 1 / MOTION 2**. Fokus setiap panel mengikuti tugasnya: mengisi, meninjau, membaca hasil atau mengelola data.

## Bukti dan cara memeriksa

Buka http://127.0.0.1:8000/login lalu muat ulang penuh dengan Ctrl+F5. Pilih Profil dan klik ketiga tab; cek status pada Pengajuan/Persetujuan/Rekap dan Anggota Unit. `/design-review` tetap alat audit terpisah dengan fixture berlabel.

[Laporan UI](browser-report.json), [pengukuran aplikasi nyata](visual-report.json), [kontras dan aset](design-qa/verification.json), [ringkasan validasi](validation-summary.json), [delivery gate](QUALITY_GATE.md). Screenshot akhir tersimpan pada screenshots/ dan design-qa/screenshots/. Integrasi Better Auth, CRUD dan alur nilai diuji pada [MySQL sementara](../../backend/v3/test-result.json), bukan dengan mereset database lokal pengguna.

Hasil akhir: build, Pint dan Prettier lulus; 41 tes UI, 80 tes PHP/723 assertion dan 9 skenario browser dengan Better Auth asli lulus. Sebanyak 99 tampilan halaman dan 135 tampilan panel diperiksa pada tiga viewport, tanpa error JavaScript atau overflow horizontal. Seluruh 78 pemeriksaan desktop (1440×900, data lokal yang diuji) muat tanpa scroll vertikal. Ketiga tab profil pada semua role juga muat di tablet/ponsel uji, total 27 pemeriksaan. Teks/latar diperiksa pada 1.926 pasangan tanpa isu kontras yang terdeteksi. Data yang lebih panjang dan viewport lain tetap dapat menggulir secara alami.

Salinan bukti server pada revisi ini: [hasil backend](backend-test-result.json), [browser integrasi](live-browser-report.json) dan [JUnit](phpunit.xml). Source manifest mencatat 74 berkas bisnis tetap identik dengan baseline sebelum revisi UI. Perbandingan enam berkas historis pada verification.json memakai baseline backend/v3 yang lebih lama; itu bukan perubahan bisnis dalam revisi ini.

Source utama: resources/views/components/abprove/tabs.blade.php, shared/profil.blade.php, reference/home.blade.php, reference/analytics.blade.php, v2/cycles.blade.php, v2/guide.blade.php, resources/js/abprove/pagination.js, flow-dom.js, flow-org.js, flow-reports.js, reference.js dan resources/css/reference-layout.css. Backup sebelum revisi: archive/frontend/2026-11-10-before-compact-tabs/.

Perintah verifikasi: `npm.cmd run build`, `npm.cmd run test:ui`, `npm.cmd run verify:design`, `node tools/design-review/revision-v4.mjs`, `python tools/testing/run_backend_tests.py`. Skrip revision-v4 dipakai untuk memeriksa halaman aplikasi aktif; nama file tersebut tidak mengubah acuan visual ke layout v4.
