# Delivery Gate frontend

8 November 2026. Mode antislop **during**, sesuai pilihan pengguna. Cakupan: source Blade/JS/CSS yang dikirim, halaman tiga role dan fixture pengujian terisolasi. Bukti runtime: [backend](../backend/test-result.json), [browser](browser-report.json), [isolasi](test-environment.json). Bukti visual: [review](DESIGN_REVIEW.md), [screenshot](screenshots/unit-dashboard-desktop.png), [token/rasio](visual-qa.json). Ini bukan sertifikasi aksesibilitas atau klaim kesiapan produksi.

## Hard Gate

- R-02 PASS: pencarian karakter em dash pada resources/views, resources/js dan resources/css menghasilkan nol temuan.
- R-03 PASS: browser mengukur document/workspace tanpa overflow pada 1440, 1024, 780 dan 390 px; editor KPI ponsel memakai blok berlabel, tabel laporan memakai wrapper scroll.
- R-17 PASS: ringkasan, tren dan progres berasal dari scoped query MySQL; bulan tanpa Final bernilai null, tidak diisi angka ilustrasi.
- R-18 PASS: tidak ada testimonial atau avatar foto fiktif; profil menampilkan akun yang login.
- R-23 PASS: struktur navigasi dan motif visual bersumber dari FigCraft/PRD; teks merek dipertahankan, tidak dibuat logo resmi baru. Fixture screenshot jelas berlabel Uji.
- R-24 PASS: tes menelusuri setiap menu KU/KD/HC; route HTML per role diuji dan menghasilkan halaman, serta tautan detail memakai ID data server.
- R-25 PASS: 15 pasangan token teks/background pada visual-qa memenuhi AA normal, minimum 5,181:1; teks pendukung memakai #52616B, bukan warna ikon subdued.
- R-26 PASS: kontrol memakai href nyata, event Alpine, submit, native details atau input terikat state; pencarian source tidak menemukan href kosong, javascript:void atau TODO kontrol palsu. Keputusan/mutasi menuju endpoint server.
- R-27 PASS: page-state bersama menyediakan loading/kosong/error/retry; tes browser menyuntikkan HTTP 503 lalu memulihkan data dengan Coba lagi; validasi field dan status draft/Final diuji.
- R-28 PASS: bantuan membahas pengisian, bobot, tenggat, revisi dan cakupan role; tidak ada FAQ pemasaran generik.
- R-32 PASS: login/form menggunakan label, tombol/link native dan focus ring; tes menekan Enter pada skor, Ctrl K dan Escape pada dialog; dialog native mengelola fokus.
- R-33 PASS: UI ditulis pada Blade, JS dan CSS sumber repository; inspect_visual.py hanya membaca token/screenshot dan menulis laporan, tidak mengubah tampilan lewat skrip eksternal.
- R-34 PASS: tema terang mengikuti sumber desain yang diminta; tidak ada toggle tema setengah jadi.
- R-35 PASS: build Vite dijalankan, aplikasi dijalankan pada PHP/MySQL nyata, 14 skenario Playwright mencatat click-through menu/form/dialog/alur nilai; penelusuran handler turut memeriksa aksi dengan kondisi data khusus. Rincian cakupan ada di bawah, tanpa mengklaim pengujian seluruh kombinasi data produksi.
- R-36 PASS: README dan UI tidak mengklaim sertifikasi, keamanan mutlak atau performa produksi; batas UAT/beban/deployment ditulis eksplisit.
- R-37 PASS: Design Read dinyatakan sebelum implementasi berdasarkan brief pengguna, design system dan frame FigCraft; dials tercatat pada DESIGN_REVIEW.
- R-38 PASS: UI memakai data server; data pengujian dibuat hanya pada database sementara dengan nama Uji. Contoh batas kategori hanya diterapkan lewat aksi eksplisit HC.

## Purpose Gate

- R-01 PASS: tidak ada glow/gradient dekoratif; gradient skeleton mengomunikasikan pemuatan data.
- R-04 PASS: outline icon clipboard/check/table/users menjelaskan penilaian, keputusan, KPI dan tim, sama dengan bahasa acuan; alasan tercatat pada review desain.
- R-06 PASS: Inter dipilih karena dipakai FigCraft dan terbaca dalam tabel; tidak ada judul monospace besar atau label uppercase dengan tracking dekoratif.
- R-07 PASS: tidak ada background grid/dot dekoratif; garis pada grafik semata-mata sumbu data.
- R-08 PASS: panah dipakai untuk kembali/keluar atau navigasi, bukan tambahan dekorasi pada setiap CTA.
- R-09 PASS: badge menyatakan status domain draft/diajukan/return/Final/aktif; tidak ada label AI/Beta/Secure/marketing.
- R-10 PASS: panel/sidebar/navbar bersifat solid, tanpa lapisan glassmorphism.
- R-12 PASS: border memisahkan panel; shadow terbatas pada dialog/toast/drawer untuk konteks overlay.
- R-13 PASS: tidak ada glow pada komponen.
- R-14 PASS: panel ringkasan, rail anggota, editor, tabel dan tenggat berbeda ukuran sesuai isi; grid konsisten mendukung RHYTHM 1.
- R-19 PASS: transisi singkat menjelaskan hover/drawer/dialog/loading, tanpa parallax/bounce; CSS prefers-reduced-motion menonaktifkan animasi.
- R-22 PASS: tidak ada ilustrasi generik yang ditambahkan; layar difokuskan pada data/formulir produk.

## Liveliness

- Dials PASS: ENERGY 1 / RHYTHM 1 / MOTION 2 tertulis dalam Design Read.
- Konsistensi PASS: shell tenang dan pola tabel/form berulang; gerak dipakai hanya untuk perpindahan state dan feedback.
- Fokus layar PASS: login menonjolkan form; beranda menonjolkan progres/tugas; editor menonjolkan lembar KPI dan keputusan; HC menonjolkan resource yang dikelola.
- Whitespace PASS: padding panel, gap grid, toolbar dan footer memisahkan data, kontrol dan keputusan; angka/label tidak saling menimpa pada screenshot.
- Accent PASS: teal menandai navbar, ringkasan prioritas dan CTA; komposisi putih/mint/teal dicatat pada visual-qa.
- Motif identitas PASS: workspace mint, navbar teal dan tabel KPI berangka tabular diulang pada ketiga role sesuai FigCraft.
- Design Read PASS: brief, pembacaan visual, dials dan alasan keputusan tercatat di DESIGN_REVIEW.

## Craftsmanship dan quality locks

- C-1 PASS: warna, layout, font, spacing, panel, ikon dan motion masing-masing mempunyai alasan satu baris pada review desain.
- C-2 PASS: handler halaman terhubung ke scoped endpoint nyata; role yang tidak berwenang tidak mendapat aksi keputusan, dan backend tetap menolak request yang dibuat manual.
- C-3 PASS: bagian halaman melayani tugas, jadwal, penilaian, organisasi atau pelaporan KPI; tanpa hero/pricing/testimonial tambahan.
- C-4 PASS: responsif, keyboard, dialog, validasi, retry, draft kotor dan Final readonly diuji; kontrol disabled menjelaskan kondisi domain. Kasus lintas role/scope diuji backend.
- C-5 PASS: semua angka aplikasi berasal dari query; screenshot fixture dibedakan dari data rumah sakit dan sumber desain ilustratif.
- R-05 PASS: komposisi dashboard/rail/editor mengikuti kebutuhan KPI dan frame pengguna, konsisten dengan RHYTHM 1; tidak menambahkan template landing page.
- R-11 PASS: panel radius 16 px, input/tombol radius lebih kecil dan badge status ringkas; bentuk komponen tidak disamaratakan menjadi pil.
- R-15 PASS: CTA spesifik, misalnya Simpan draft, Ajukan penilaian, ACC dan tetapkan Final, Publikasikan template dan Tinjau dan konfirmasi.
- R-16 PASS: tidak ada copy AI marketing/buzzword pada halaman yang dikirim.
- R-20 PASS: identitas berasal dari mint/teal, sidebar role, siklus bulanan, pilar KPI dan hierarki unit/divisi yang spesifik pada produk.
- R-21 PASS: tema terang tetap mengikuti desain yang disetujui, sebagaimana alasan tertulis pada DESIGN_REVIEW; tidak memaksakan dark mode.
- R-29 PASS: warna inti netral/mint/teal; tambahan warna memiliki arti status domain yang ditentukan DESIGN_SYSTEM dan selalu disertai teks.
- R-30 PASS: tampilan menerapkan file FigCraft dan referensi dashboard pengguna, tanpa menyalin identitas produk lain.
- R-31 PASS: tabel keputusan pada DESIGN_REVIEW menuliskan tujuan setiap keputusan visual utama.

## Cakupan click-through dan review kontrol

| Area | Bukti |
|---|---|
| Login dan shell | Login gagal/berhasil, password toggle, semua menu tiga role, pencarian halaman/Ctrl K, profil, Escape, drawer, logout batal/berhasil, periode dan peringatan isian |
| Pengisian | Akses langsung dari tugas beranda, pilih anggota, cari, integer salah, Enter, temuan, simpan, subtotal 82,75, ajukan, tarik kembali, revisi dan salin bulan sebelumnya |
| Keputusan KD | Angka anggota readonly, return wajib alasan, revisi KU, ACC Final immutable, penilaian KU naungannya; endpoint bulk atomik turut diuji backend |
| HC organisasi | Buat/ubah divisi/unit, nonaktif/aktif kembali unit, jabatan/akun/karyawan, preview/konfirmasi penempatan, dialog kepala; grant/revoke dan guard dampak diperiksa pada handler dan pengujian backend |
| Master | Bobot 95 ditolak/100 diterima, draft, publish, preview CSV, lanjut editor, kategori dan jadwal; parser XLSX/formula diuji PHP |
| Data/laporan | Menu, tab, filter, pencarian, pagination terikat API, detail snapshot/timeline dengan muat lanjutan, unduhan TSV; ekspor memakai filter dan scope yang sama |
| Kegagalan dan akses | 503/retry browser, JSON/HTML forbidden dan scoped 404, integer/bobot/Final/version/replay/CSRF/session backend, logout mencabut sesi |
| Responsif dan visual | Screenshot desktop/tablet/ponsel ditinjau terhadap ekspor frame MCP; overflow diperiksa browser; kontras/rasio solid dihitung read-only |

Pemeriksaan akhir tambahan: 82 berkas PHP lolos syntax check, Laravel Pint dan Composer validate lulus, npm audit melaporkan nol vulnerability. View/route compilation dan daftar route diperiksa sebelum penyerahan. Seeder lokal menambahkan akun/data latihan berlabel Contoh hanya atas permintaan pengguna, dengan pengujian login, isolasi dan idempotensi. Keterbatasan yang masih membutuhkan keputusan produk tercantum pada README frontend dan DECISIONS; tidak diisi dengan aksi demo.
