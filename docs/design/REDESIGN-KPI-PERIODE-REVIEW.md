# Review prototype KPI / Goals dan periode

**Catatan historis:** alur Goal dan finalisasi HC pada dokumen ini sudah digantikan untuk design-review oleh [revisi KPI sederhana](../../design-review/kpi-periode/README.md). Gunakan panduan terbaru untuk audit layar aktif.

Tanggal: 12 November 2026. Tahap yang dipilih pengguna: **prototype pada design-review dahulu**. Acuan field dan alur: [spesifikasi](../requirements/SPEC-Redesign-KPI-Periode-ABPROVE.md), [PRD v1.1](../requirements/PRD-KPI-Kinerja-Revisi-v1.1.md), dan foto `C:\Users\Kinan\Downloads\isi kpi.jpeg`. Referensi pola modal, form Goal, dan drawer adalah [panduan resmi Mekari Talenta](https://help-center.talenta.co/hc/id/articles/38679383253145-Bagaimana-Cara-Membuat-Goals-Tampilan-Baru); logo, shell, font, dan warna menggunakan ABPROVE.

## Membuka rancangan

Jalankan `npm.cmd run build`, lalu `npm.cmd run start` seperti biasa. Gunakan browser dan origin yang sama saat berpindah antar-role agar data simulasi tetap tersambung.

| Layar | URL lokal |
|---|---|
| Daftar Goals / membuat Goal | http://127.0.0.1:8000/design-review/hc/kpi |
| Template jabatan, kolom seperti foto | http://127.0.0.1:8000/design-review/hc/kpi?screen=template-detail&id=tpl-yanmed |
| Daftar periode | http://127.0.0.1:8000/design-review/hc/pengaturan |
| Detail periode November | http://127.0.0.1:8000/design-review/hc/pengaturan?screen=cycle-detail&id=2026-11 |
| Skenario Kepala Unit IGD | http://127.0.0.1:8000/design-review/ku/nilai?redesign=goals |
| Skenario Kepala Divisi Pelayanan Medis | http://127.0.0.1:8000/design-review/kd/persetujuan?redesign=goals |
| Skenario rekap/finalisasi Super HC | http://127.0.0.1:8000/design-review/hc/kpi?screen=assessments |

Route design-review hanya tersedia pada environment local/testing. Layar menandai bahwa data simulasi disimpan di browser. Tidak ada login baru, pengiriman nilai, atau mutasi database operasional. Pemisahan role di prototype menunjukkan perilaku UI; pembuktian keamanan server dan migrasi aturan bisnis merupakan pekerjaan integrasi berikutnya.

## Halaman dan tindakan

| Bagian | Interaksi yang tersedia |
|---|---|
| Daftar Goals | Cari, filter periode/jenis/status/pilar/divisi/unit/jabatan/pemilik, pagination 5 KPI, detail dan duplikasi |
| Buat Goal | Modal empat tipe, Detail Goal → Pengukuran → Key Results → Konfigurasi → Tinjau; simpan Draft parsial atau publikasi tervalidasi |
| Detail Goal | Informasi, pengukuran, Key Results, riwayat; edit Draft, versi berikutnya, duplikasi, arsip, hapus Draft belum terpakai |
| Detail pengukuran | Target numerik dan target teks terpisah; numerator, denominator, dan formula di drawer agar form utama ringkas |
| Key Results | Drawer tambah/edit, hapus dengan konfirmasi; opsional dan tidak menambah baris skor penilaian |
| Konfigurasi | Bobot, Repeat Goal, Tanpa baseline, presisi tampilan dan metadata bobot KR; rincian tersimpan pada Goal |
| Template jabatan | Tambah template berdasarkan jabatan dan unit; daftar, rincian, tambah KPI, publikasi, ekspor CSV; total bobot 100% |
| Periode | Daftar/filter, buat/ubah, kategori, jadwal WIB, pilih template, simpan Draft/jadwalkan, aktivasi, duplikasi, dampak, penutupan, arsip, hapus Draft tanpa referensi |
| Detail periode | Informasi periode, Jadwal proses, KPI berlaku, Progres & audit |
| Penilaian uji | KU mengisi integer 10–100, simpan Draft, ajukan, tarik pengajuan; KD membaca angka dan menyetujui/mengembalikan; HC memfinalkan hasil Disetujui |

Tabel definisi menggunakan **No., Pilar, KPI, Numerator, Denominator, Formula pengukuran, Target, Bobot (%), Tindakan**, mengikuti foto. Contoh Pelayanan Medis memiliki 11 indikator dengan bobot total 100%, dibagi 5 baris per halaman. Daftar periode, template, dan karyawan memakai 10 baris per halaman. Pada ponsel, tabel menjadi kartu berlabel; ukuran font tidak diperkecil agar tetap terbaca. Tombol pagination minimal 44 × 44 px.

Contoh awal terdiri dari 3 periode, 4 template jabatan, 46 Goal pada Oktober–November, 7 profil staf tanpa akun, dan 12 lembar snapshot pada template yang diaktifkan. November menampilkan keenam status; Oktober memberi contoh histori Final. Desember disiapkan sebagai periode Draft. Nama dan data merupakan contoh untuk review.

## Skenario audit yang disarankan

1. Buka template Pelayanan Medis. Cocokkan semua kolom dengan foto dan gunakan pagination untuk melihat indikator 6–11. Coba ekspor KPI.
2. Buat Goal Individual di periode Desember dan template SDM. Isi nama/pilar, baseline 80, target 95, target teks 95%, dan bobot 100%. Isi numerator/denominator/formula melalui drawer. Tambahkan atau edit Key Result, atur konfigurasi, lalu tinjau dan publikasikan.
3. Coba target 75 pada Increase dengan baseline 80; form harus menolak. Decrease menerima target lebih rendah. Coba bobot template 85% atau duplikasi yang membuat bobot melebihi 100%; publikasi harus ditolak. Simpan Draft tetap tersedia untuk isian parsial.
4. Duplikasi periode November ke Januari 2027. Periode tujuan menjadi Draft, konfigurasi Goal disalin, sementara aktual, skor, temuan dan keputusan kosong. Bulan yang sudah ada harus ditolak.
5. Publikasikan template yang dipilih pada periode tujuan; setelah seluruh template terbit dan 100%, aktifkan periode. Lembar penilaian dibentuk dari snapshot dan dimulai tanpa skor.
6. Untuk menyelesaikan satu siklus dari awal sampai penutupan dengan akun skenario yang tersedia, pilih hanya **IGD · Dokter Umum** pada periode Draft sebelum aktivasi. Ada tiga anggota IGD yang dapat dikerjakan melalui skenario Kepala Unit IGD dan Kepala Divisi Pelayanan Medis. Cakupan akun skenario ditulis pada navbar, tanpa tombol pergantian role.
7. Buka skenario KU pada bulan tujuan dengan menambahkan `&cycle=2027-01` pada URL. Isi semua nilai, simpan Draft, lalu ajukan. Pada skenario KD dengan bulan yang sama, tinjau tanpa mengubah angka, kembalikan dengan alasan atau setujui. Pada skenario HC, hanya hasil Disetujui yang dapat difinalkan.
8. Periksa snapshot Final dan jejak keputusan. Pengubahan atau pengarsipan master tidak boleh menulis ulang snapshot. Coba menutup periode dengan hasil belum Final; penutupan harus diblokir.
9. Coba meninggalkan form, menutup drawer dengan Escape/X, dan membuka dua tab saat mengedit. Isian belum disimpan harus mendapat konfirmasi; versi data yang berubah di tab lain tidak ditimpa diam-diam.
10. Gunakan **Reset data contoh** untuk mengembalikan contoh awal pada browser ini. Konfirmasi menyebutkan bahwa hanya data prototype yang dihapus.

## Ketentuan usulan dan batas simulasi

- Enam status dan finalisasi HC pada prototype mengikuti spesifikasi baru/PRD v1.1. Aplikasi operasional masih mengikuti kontrak v1.3: tanpa Draft dan keputusan akhir KD. Prototype ini tidak mengganti kontrak tersebut melalui perubahan UI saja.
- Empat tipe Goal dapat dibuat sebagai konfigurasi. Individual dipetakan ke template penilaian; Team/Organization/Company ditandai sebagai pemantauan dan tidak otomatis memengaruhi skor staf.
- Progress Increase/Decrease dengan baseline ditampilkan sebagai **ilustrasi rumus usulan**, terpisah dari nilai integer 10–100. Aktual 92, baseline 80, target 95 menghasilkan progress 80%; penilai tetap memasukkan skor sendiri. Progress di atas 100% tetap menampilkan angka aslinya.
- Tanpa baseline menyimpan target tetapi tidak mengaktifkan rumus progress yang belum disepakati. Agregasi progress KR, alignment hierarki, contributors, dan update per event belum diaktifkan.
- Bobot KR merupakan metadata rancangan dengan validasi 100% ketika dipilih. Bobot tersebut tidak dijumlahkan kembali ke skor penilaian.
- Repeat/duplikasi dijalankan melalui pilihan periode tujuan oleh HC. Baseline disalin dari konfigurasi sumber secara eksplisit; aktual akhir tidak otomatis menjadi baseline baru. Tidak ada pembuatan siklus otomatis.
- Penutupan dengan penilaian tertunda diblokir pada prototype. Pengecualian, overdue, dan aturan pengubahan periode setelah berjalan masih memerlukan kebijakan produk.
- Snapshot dibuat saat aktivasi dan dicopy ke lembar penilaian; hasil Final tidak memiliki tindakan edit. Ini demonstrasi perilaku pada browser, bukan pengganti constraint database atau policy backend.

## Pengujian dan berkas

```powershell
npm.cmd run build
npm.cmd run test:goals-prototype
```

Pengujian domain menggunakan Node test runner, sedangkan pengujian browser memakai Chrome/Playwright dan PHP lokal pada port 8026. Tidak menggunakan MySQL sebagai fixture. Pengujian browser menolak adanya request selain GET/HEAD selama skenario prototype.

Verifikasi akhir 12 November 2026: **build Vite berhasil; 25 tes domain dan 12 skenario browser lulus**. Skenario terakhir membuat periode dan Goal baru, mengaktifkan snapshot, menyelesaikan ketiga anggota IGD melalui KU → KD → HC, lalu menutup periode; hasil Final periode sebelumnya tetap identik. Screenshot diperiksa pada 1440 × 900, 768 px, dan 390 px. Tombol lanjut form detail/pengukuran tetap terlihat pada viewport desktop tanpa perlu menggulir ke bawah.

Hasil browser dan screenshot desktop/tablet/ponsel: [folder output](../../output/design-review/kpi-periode/). Implementasi UI: `resources/views/design-review/goals.blade.php`, `resources/js/abprove/goals/`, dan `resources/css/goals-prototype.css`. Modul dan CSS dimuat terpisah hanya ketika halaman prototype dibuka.
