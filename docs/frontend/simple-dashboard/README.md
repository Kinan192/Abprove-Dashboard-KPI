# Dashboard ABprove

Revisi layout v2, 13 November 2026: Dashboard menjadi menu pertama untuk tiga role; Beranda dihapus. Warna hijau ABprove dipertahankan. Empat kartu ringkasan kini terpisah di atas sebuah workspace putih. Grafik tren lebar berada di kiri, diagram donat kategori dan agenda ringkas di kanan. Pada HC, baris bawah kini berisi ketuntasan bulanan, KPI perlu perhatian dan aktivitas terbaru. Progres per divisi serta temuan staf dihapus dari Dashboard HC. KU/KD tetap mempunyai progres/indikator, tindak lanjut dan temuan sesuai role. Filter dan tabel analisis tersedia melalui **Laporan lengkap**.

## Review

- Kepala Unit: `/design-review/ku/dashboard`.
- Kepala Divisi: `/design-review/kd/dashboard`.
- Super HC: `/design-review/hc/dashboard`.

Gunakan server yang sedang berjalan di `http://127.0.0.1:8000`. Bookmark Beranda lama diarahkan ke Dashboard dengan bulan terpilih tetap tersimpan. `/design-review` memakai data simulasi browser dan diberi label demikian. Halaman berakun tetap memakai store/API Laravel yang sudah tersedia.

## Grafik JavaScript

Grafik Dashboard memakai **Chart.js 4.6.1**. Modul grafik dimuat saat membuka Dashboard; halaman profil, editor dan administrasi tidak memuat library tersebut. Integrasi memakai komponen line, bar dan doughnut yang diperlukan. [Dokumentasi resmi integrasi](https://www.chartjs.org/docs/latest/getting-started/integration.html).

| Role | Grafik garis | Grafik batang | Diagram donat | Tindak lanjut |
|---|---|---|---|---|
| Kepala Unit | Rata-rata Final per bulan | Nilai mentah per KPI, terendah lebih dulu | Kategori hasil Final staf unit | Dikembalikan, lalu belum diisi |
| Kepala Divisi | Rata-rata Final dalam divisi | Progres status per unit | Kategori hasil Final divisi | Pengajuan staf menunggu persetujuan |
| Super HC | Rata-rata Final organisasi | Ketuntasan bulanan dan lima KPI dengan rata-rata terendah | Kategori hasil Final organisasi | Aktivitas terbaru |

Diagram donat mengelompokkan label kategori yang benar-benar ada pada hasil Final, bukan mengulang jumlah Belum/Diajukan/Final dari kartu ringkasan. Klik segmen atau legenda untuk membaca hasil dalam kategori tersebut. Temuan staf memakai catatan penilaian Final; agenda memakai jadwal periode yang tersimpan dan menampilkan seluruh jadwal melalui dialog. Data kosong tetap dinyatakan kosong.

Tren tidak menganggap bulan tanpa hasil Final sebagai nilai nol. Rentang sumbu Y ditulis di bawah judul. Tooltip menampilkan bulan, nilai dan jumlah Final. Klik titik untuk membuka bulan tersebut. Pada KD, grafik progres unit memakai persentase dan membuka persetujuan pada unitnya. Pada HC, grafik ketuntasan menghitung jumlah Final dibagi jumlah subjek pada setiap bulan; klik batang membuka bulan tersebut. KPI perlu perhatian memakai lima rata-rata indikator Final terendah, dengan nama cakupan, jumlah hasil dan bobot pada tooltip/tabel. Bulan tanpa periode tidak dibuat seolah memiliki data ketuntasan.

Tombol **Data grafik** membuka tabel yang dapat diakses dengan keyboard. Pengguna dapat membaca nilai dan memakai tautan navigasi tanpa mengoperasikan canvas. Grafik mengikuti tema terang/gelap dan perubahan lebar layar. Loading, data kosong, error pemuatan dan tombol coba ulang tersedia.

Tidak ada Python dalam implementasi chart atau dependency aplikasi. Script Python desain/pengujian yang sudah ada sebelumnya merupakan alat otomasi terpisah. Tidak ada gambar, screenshot, trace atau video baru yang diekspor pada revisi ini.

## Layout dan batas perubahan

Sidebar hijau 232 px, navbar 64 px. Canvas `#F6F8F7`, kertas putih, teks `#14211F`, muted `#5E6B68`, garis `#E3E8E6`, aksen utama `#0B6B57`, sidebar `#064E3B`, dan grafik `#0E8A63`. Warna status mempertahankan arti masing-masing. Font web tetap Figtree dan Plus Jakarta Sans yang sudah tersedia. Referensi komposisi berasal dari gambar dashboard pengguna; warna kuning pada referensi tidak dipakai.

## Penyegaran visual 13 November 2026

Lapisan tampilan dirapikan mengikuti hasil FigCraft Simple Dashboard dengan aksen hijau, tanpa mengubah alur, data, atau hak akses. Token warna, radius, dan densitas kini konsisten di `resources/css/app.css`, `simple-dashboard.css`, dan `table-workspace.css`:

- Navigasi: sidebar 232 px dengan label grup "Menu utama" dan "Akun & bantuan", item aktif berlatar hijau terang dengan garis aksen; navbar putih 64 px dengan pencarian, pemilih periode, notifikasi, dan akun berukuran 36 px.
- Kontrol: tombol radius 8 px (36 px desktop, 44 px ponsel), field radius 8 px dengan ring fokus hijau, segmented control putih di atas latar `--color-subtle`.
- Kartu: radius 12 px, garis hairline, bayangan 1 px. Kartu metrik Dashboard memakai latar `--color-subtle` tanpa garis dekoratif.
- Tabel: teks 13 px, header 11,5 px berlatar `#F8FAF9`, tanpa garis vertikal antar sel, hover hijau pucat. Status penilaian memakai pill berlatar lembut dan tetap dapat dibaca di tema gelap.
- Halaman daftar: tabel, pagination, dan catatan berada dalam satu kartu. Di layar 601–900 px tabel berubah menjadi kartu dua kolom agar kolom Tindakan tidak terpotong; di atas 900 px tabel tetap dan dapat digulir mendatar bila perlu.
- Tema gelap: header tabel, dialog filter, dan kartu metrik memakai permukaan gelap; tidak ada header tabel putih yang tertinggal.
- Inisial avatar mengabaikan gelar (dr., drg., apt., ns., prof.) dan selalu huruf kapital. Judul halaman Tim memakai "Anggota Unit" atau "Tim Divisi", bukan nama aplikasi.
- Gulir dokumen dikunci pada shell aplikasi; hanya area konten yang bergulir sehingga navbar tetap terlihat saat form KPI dibuka.

Verifikasi: `npm.cmd run build` lulus, 49 skenario Simple Dashboard dan 8 skenario prototype KPI lulus. `test:ui` (revision-v4) dan `verify:design` masih menargetkan DOM revisi lama (mis. editor KPI v4, tombol rename KPI, dan tab analitik lama) sehingga skenario tersebut tidak lagi sesuai dengan halaman design-review saat ini; keduanya tidak dipakai sebagai bukti penyegaran ini.

Pada 1440×900, ringkasan, ketiga grafik dan tindak lanjut muat tanpa scroll vertikal. Tablet/ponsel menumpuk bagian agar grafik tetap terbaca, dengan scroll halaman internal. Tidak ada scroll horizontal halaman. Tidak ada perubahan schema, autentikasi, rumus, hak akses atau keputusan Final Kepala Divisi.

## Revisi tabel

Tabel penilaian, laporan, organisasi, aktivitas, KPI dan tim menggunakan satu tombol **Filter**. Panel mempunyai header dengan ikon, pilihan berkelompok dalam dua kolom desktop/satu kolom ponsel, serta ringkasan berupa chip yang dapat dihapus satu per satu. Status penilaian yang semula berupa sederetan tombol dipindahkan ke panel tersebut; pencarian tetap terlihat. Filter unit mengikuti divisi yang dipilih. Badge menunjukkan jumlah filter aktif dan Reset filter mengembalikan pilihan awal. Rancangan ini juga dipakai oleh filter prototype KPI/Monitoring.

Tabel daftar mempunyai pilihan **10 / 25 / 50 baris**, default 10, termasuk daftar KPI/Goals, periode dan Monitoring KPI pada prototype. Mengubah ukuran mengembalikan pagination ke halaman pertama. Pilihan ukuran dipertahankan ketika mencari atau memfilter. Tabel pengisian nilai, navigasi samping dan grafik tidak menerima kontrol ukuran tabel.

Monitoring KPI tersedia di `/design-review/hc/kpi?screen=monitor`, dengan filter unit, jalur penilaian, status dan pencarian nama/NIP. Bagian ini memakai model simulasi KPI sederhana yang sudah ada dan tetap hanya baca untuk HC. Status/alur prototype tidak ditulis ulang dalam revisi layout; integrasi formula/monitoring ke backend tetap pekerjaan tersendiri.

Laporan rinci KD/HC tersedia melalui `dashboard?detail=laporan`; URL `/division/analytics` dan `/hc/analytics` tetap membuka laporan. Riwayat Kepala Unit tetap tersedia. Form/tabel fitur lain dipertahankan.

## Validasi revisi ini

- `npm.cmd run build`: PASS. Chunk Dashboard/Chart.js sekitar 198,4 kB mentah / 68,8 kB gzip, hanya dimuat pada Dashboard.
- `npm.cmd run test:simple-dashboard`: 49 skenario PASS. Mencakup 30 halaman pada 1440, 768 dan 390 px; navbar tambahan 320 px; tooltip/klik garis, batang dan donat; dialog data/agenda; laporan rinci; empty/error/retry; tema; badge; panel filter responsif, chip yang dapat dihapus, pilihan unit mengikuti divisi; pagination 10/25/50 dengan lebih dari 60 baris uji; filter Monitoring KPI.
- `npm.cmd run test:kpi-prototype`: 39 tes model/formula dan delapan skenario browser PASS, termasuk alur pengisian, revisi, keputusan KD serta histori.
- `php artisan view:cache`: PASS, seluruh template Blade terkompilasi.
- Pint/Prettier pada file yang diubah: PASS.
- Suite backend penuh tidak diulang untuk penggantian library grafik ini. Hasil backend sebelumnya disimpan terpisah, bukan diklaim sebagai hasil revisi Chart.js.

Pengujian menggunakan DOM, ukuran layout, interaksi browser dan instance Chart.js. Tidak ada klaim kesamaan pixel-perfect atau skor Lighthouse baru. [Hasil browser](browser-report.json), [ringkasan mesin](validation-summary.json), [pemeriksaan desain](delivery-gate.md).

## Dokumen native

[KPI-Kinerja-UIUX-Simple-Dashboard.figcraft](../../../design/prototypes/KPI-Kinerja-UIUX-Simple-Dashboard.figcraft) adalah acuan native sebelumnya: 50 screen, 693 interaksi On Click dan tiga flow role. [Validasi native sebelumnya](../../../output/design-review/simple-dashboard/validation.json). Sumber 8 November tetap tersimpan di `design/prototypes/KPI-Kinerja-UIUX.figcraft`. File native tidak dibangun ulang dalam revisi library Chart.js ini.

Jalankan aplikasi seperti biasa dengan `npm.cmd run start`; `npm.cmd run dev` untuk Vite saat pengembangan. Tidak perlu server Python.
