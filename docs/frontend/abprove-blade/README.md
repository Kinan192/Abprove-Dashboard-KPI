# Refactor frontend utama ABprove

9 November 2026. Refactor langsung di root Laravel, memakai Blade, Tailwind 4 dan Vite. Semua interaksi memakai JavaScript native; tidak ada Alpine, iframe pembungkus halaman aplikasi, atau proyek frontend bersarang yang menjadi aplikasi aktif.

## Arah desain

Sumber visual: `C:\Users\Kinan\Downloads\ABprove\ABprove_KPI_Kinerja.html` dan 30 JPG pengguna. ENERGY 1 / RHYTHM 1 / MOTION 2. Dashboard operasional rumah sakit, memakai sidebar hijau tua, permukaan abu/putih dan aksen merah. Komposisi 60:30:10 diterapkan sebagai hierarki permukaan/netral, konteks identitas dan penekanan aksi, bukan pengukuran literal piksel. Figtree untuk antarmuka, Plus Jakarta Sans untuk wordmark, keduanya lokal dan berlisensi.

| Pilihan | Tujuan |
|---|---|
| Sidebar 256 px, navbar 80 px | Mengikuti HTML/JPG ABprove terbaru, menggantikan geometri FigCraft terdahulu 232/64 |
| Konten scroll internal | Navigasi dan konteks periode tetap terlihat |
| Rail karyawan + lembar KPI | Mempermudah pengisian berulang tanpa kehilangan nama anggota |
| Tabel, tab, badge dan drawer | Menjaga perbandingan data, status dan tindakan tetap berdekatan |
| Logo/motif login dari sumber | Menjaga identitas ABprove, tanpa ilustrasi baru |
| Merah CTA, hijau identitas, warna status berlabel | Membedakan tindakan, konteks dan hasil penilaian |
| Dialog native, focus ring, reduced motion | Mendukung keyboard dan preferensi gerak pengguna |

## Halaman

| Role | View | URL aplikasi |
|---|---|---|
| Akun | Login dan lupa kata sandi | `/login`, `/forgot-password` |
| Kepala Unit | Beranda, Isi nilai, Pengajuan, Riwayat, KPI unit | `/unit/dashboard`, `/unit/score`, `/unit/submissions`, `/unit/history`, `/unit/kpis` |
| Kepala Unit | Anggota, Panduan, Profil, Notifikasi | `/unit/members`, `/unit/help`, `/unit/profile`, `/unit/notifications` |
| Kepala Divisi | Beranda, Persetujuan, Nilai Kepala Unit | `/division/dashboard`, `/division/approvals`, `/division/heads` |
| Kepala Divisi | Dashboard, KPI, Tim, Panduan, Profil, Notifikasi | `/division/analytics`, `/division/kpis`, `/division/team`, `/division/help`, `/division/profile`, `/division/notifications` |
| Super HC | Beranda, Rekap, Dashboard | `/hc/dashboard`, `/hc/recap`, `/hc/analytics` |
| Super HC | Karyawan, kepala unit dan dialog tambah/ubah | `/hc/organization/employees` |
| Super HC | Divisi/tim, akun, jabatan | `/hc/organization`, `/hc/organization/users`, `/hc/organization/positions` |
| Super HC | Master KPI, impor, penempatan | `/hc/kpi-templates`, `/hc/import`, `/hc/placement` |
| Super HC | Pengaturan, aktivitas, panduan, profil, notifikasi | `/hc/settings`, `/hc/audit`, `/hc/help`, `/hc/profile`, `/hc/notifications` |

`/design-review` menyediakan katalog 30 layar referensi. Deep link audit berbentuk `/design-review/{ku|kd|hc}/{view}`. Parameter `state=review`, `export`, `employee`, `heads`, `head`, `placement` membuka varian terkait. Iframe hanya dipakai pada indeks pembanding, isinya halaman Blade yang sama. Shell role tidak mempunyai pemilih role.

## Struktur

- `app/ViewModels/AbproveDesign.php`: data presentasi, role, menu dan pemetaan halaman.
- `resources/views/layouts/`: dokumen, shell sidebar/navbar dan container.
- `resources/views/kepala-unit/`, `kepala-divisi/`, `super-hc/`: halaman role.
- `resources/views/shared/` dan `components/abprove/`: tabel, editor, tab, profil, panduan, status, dialog dan formulir bersama.
- `resources/js/abprove/`: UI, store, editor/persetujuan, formulir, analitik, export XLSX dan indeks audit.
- `resources/css/app.css`: token Tailwind, font, komponen dan breakpoint.
- `resources/data/`: fixture lokal dan katalog layar; `public/design-reference/`: JPG asli untuk pembandingan.

## Perilaku yang dapat diaudit

Pengisian, hitung bobot, simpan draft, salin bulan sebelumnya, ajukan, tarik kembali, pengembalian dengan alasan, keputusan Final, penilaian kepala unit, pencarian/filter/tab, tren/matriks/detail bulan, formulir pengelolaan, kategori, profil, password validation, foto preview, pengingat lokal, dialog, tema, navigasi ponsel, CSV dan download XLSX.

Kepala Divisi menetapkan **Final**. Super HC tidak mempunyai aksi finalisasi. Label dan status `Disetujui` pada sumber lama dipetakan ke Final agar sesuai keputusan pengguna dan backend aktif. Kepala Divisi tidak mendapat input angka untuk anggota. Nilai integer 10?100, bobot 100%; periode lampau, pengajuan dan Final hanya baca.

State contoh disimpan pada localStorage `abprove-blade-audit-v1`, dibagi antarhalaman audit dalam origin yang sama. Reset lewat Pengaturan. Perubahan ini **tidak** mengubah database. Data tersebut bukan data akun asli. Tampilan login asli menggunakan auth backend; audit login menggunakan akun contoh terpisah dari sumber HTML. Password yang diketik pada form profil/kepala tidak disimpan.

Batas tahap desain: import Excel menampilkan state belum dihubungkan; CSV dapat dipratinjau dan disimpan lokal. Susun manual diarahkan ke Master KPI. Master yang diedit lokal tidak mengubah snapshot lembar nilai contoh yang sudah dinilai. Perubahan koleksi organisasi ditampilkan sebagai ringkasan rancangan lokal; validasi scope/penugasan operasional tetap dilakukan backend pada fase integrasi. Pengingat, reset password dan notifikasi tidak mengirim pesan.

## Pemeriksaan

`npm.cmd run build`, `npm.cmd run test:design`, `npm.cmd run verify:design`, dan `python tools/testing/run_backend_tests.py`. Build menghasilkan CSS Tailwind dan modul JS pada `public/build`. Backend diuji pada MySQL terisolasi, tanpa mengubah database pengembangan. Verifikasi visual memakai Chrome lokal serta font lokal; sampel kontras bukan sertifikasi WCAG menyeluruh.

Bukti: [browser report](browser-report.json), [verifikasi](verification.json), [screenshots](screenshots/), [quality gate](QUALITY_GATE.md), [hasil backend](../../backend/test-result.json).

## Setelah audit pengguna

Integrasi data kerja belum dilakukan sesuai instruksi. Hubungkan komponen baru ke kontrak JSON existing, termasuk UUID retry, lock_version, versi template, scope organisasi, periode server, paging, impor XLSX dan respons 401/419/409/422. Jangan mengganti snapshot/otorisasi dengan perhitungan browser.

Masih menunggu keputusan PRD yang sudah dicatat: unlock, penilaian Kepala Divisi, akses anggota, SSO dan delegasi. Kepemilikan finalisasi tidak menunggu keputusan lagi: tetap Kepala Divisi. Geometri dan warna terbaru mengikuti ABprove; tidak mengubah file FigCraft historis dalam refactor ini.
