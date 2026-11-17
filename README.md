# KPI Kinerja

Aplikasi MVC Laravel 13, PHP 8.3+, MySQL, Blade, Tailwind CSS 4, Vite, dan JavaScript native. Better Auth pada `services/auth` menangani autentikasi; aturan bisnis tetap di Laravel.

## Menjalankan proyek

Untuk instalasi baru, salin `.env.example` menjadi `.env` dan isi koneksi database:

```powershell
composer install
npm.cmd ci
php artisan key:generate
php artisan kpi:auth-key
php artisan migrate
php artisan kpi:create-admin
npm.cmd run build
npm.cmd run start
```

`kpi:create-admin` hanya untuk akun **Admin** pertama; kata sandi diminta interaktif. Akun Super HC, Kepala Divisi, dan Kepala Unit dibuat Admin dari menu Akun Pengguna. Tidak ada seeder data contoh. Jangan menjalankan `key:generate` ulang pada instalasi yang sudah memiliki `APP_KEY`.

Email pengingat memakai mailer Laravel (SMTP). Isi `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, dan `MAIL_FROM_ADDRESS` pada `.env`. Dengan `QUEUE_CONNECTION=sync` email dikirim langsung; dengan `QUEUE_CONNECTION=database` jalankan `php artisan queue:work`.

Pengingat tersedia dalam HTML responsif dan teks biasa, dengan sapaan penerima, ringkasan tugas sesuai role, tenggat WIB, serta tautan tindakan. Kepala Unit diarahkan ke pengisian staf; Kepala Divisi diarahkan ke persetujuan atau penilaian kepala sesuai tugasnya. Penerima harus memiliki penugasan aktif dan mengaktifkan notifikasi email. Untuk penggunaan di perangkat lain, isi `APP_URL` dengan alamat aplikasi yang dapat diakses penerima; alamat loopback hanya berlaku di komputer aplikasi. Template HTML (`resources/views/emails/kpi-reminder.blade.php`) bergaya korporat: masthead putih ABprove · KPI Kinerja dengan aksen emerald tipis, tipografi slate, tenggat amber lembut, satu tombol emerald utama, dan pesan Admin terpisah. Gunakan tabel dan CSS inline (lebar maks. 600px, tanpa aset/font eksternal) serta pastikan tetap terbaca tanpa overflow pada lebar 320px.

Buka http://127.0.0.1:8000/login. `npm.cmd run start` menjalankan Laravel dan Better Auth. Alternatif: `npm.cmd run auth:start` dan `php artisan serve` pada terminal terpisah. Untuk pengembangan frontend, jalankan `npm.cmd run dev`.

Document root webserver harus menunjuk ke `public/`. Better Auth dan MySQL harus aktif agar login dan halaman berakun dapat digunakan.

## Struktur MVC

- `app/Models`: model Eloquent dan penjagaan data.
- `app/Http/Controllers`: endpoint per area — `Admin/` (akun, log, pengingat), `SuperHc/` (struktur, mutasi, KPI & periode, aktivitas), `Auth/`, dan controller bersama KU/KD/HC di root (penilaian, dashboard, workspace, notifikasi, profil).
- `app/Http/Requests`: validasi per area (`Admin`, `Assessment`, `KpiMaster`, `Notification`, `Organization`, `Reporting`); mutasi turunan `MutationRequest` (wajib `request_id`).
- `app/Services`: transaksi dan aturan bisnis per domain (`Admin`, `Assessment`, `KpiMaster`, `Notification`, `Organization`, `Reporting`, `IdentityAccess`, `Audit`); `app/Queries`: query baca terikat cakupan akun; `app/Policies`: otorisasi record.
- `app/Jobs`, `app/Mail`: pengiriman email pengingat; `app/ViewModels`: metadata presentasi untuk Blade.
- `resources/views`: per fitur — `admin`, `assessments`, `dashboard`, `reports`, `kpi`, `organization`, `team`, `notifications`, `guide`, `profile`, `layouts`, `components`, `emails`.
- `resources/js`: `app.js` (bootstrap), `abprove/` (modul halaman bersama), `abprove/org/` (struktur & mutasi), `kpi-workspace/` (pola KPI & periode), `admin/` (halaman Admin).
- `routes/web.php` + `routes/web/{roles,hc,admin}.php`, `database`, `config`, `bootstrap`: rute, migrasi, skema, dan konfigurasi Laravel.
- `services/auth`: layanan Better Auth.
- `tools`: launcher dan pendukung HTTP yang dipakai aplikasi.

Lihat [struktur lengkap](docs/STRUCTURE.md), [arsitektur](docs/architecture/ARCHITECTURE.md), dan [rute](docs/architecture/ROUTES.md).

## Data dan perilaku bisnis

**Admin** mengelola akun login (buat, ubah, nonaktifkan, hapus akun tanpa histori, atur ulang kata sandi), membaca seluruh log (aktivitas, login/logout termasuk percobaan gagal, status email), dan mengirim email pengingat pengisian/persetujuan KPI. **Super HC** mengelola struktur, staf, penunjukan dan mutasi kepala/staf, KPI, dan periode; Super HC tidak lagi mengelola akun. KU menilai staf; KD menyetujui/mengembalikan pengajuan serta menilai Kepala Unit. Penilaian Final hanya baca. Akses data dibatasi role dan area.

**KPI & Periode** memakai **Pola KPI**: satu pola berisi daftar KPI formula dan bobot yang wajib tepat 100%; satu orang memakai satu pola per periode. Pola diterapkan massal ke staf hasil filter Divisi → Unit → Jabatan (mis. pola Bidan dan Perawat dalam satu unit). Langkah *Cek bobot* menampilkan seluruh staf eligible termasuk yang belum punya pola (0%), dan periode hanya bisa dibuka bila semuanya lengkap. Pola dapat disalin ke periode berikutnya. Snapshot penilaian yang telah tersimpan tetap dipertahankan sebagai histori.

Periode baru disimpan sebagai **Direncanakan**. Setelah membuat/menyalin pola 100%, terapkan ke seluruh staf eligible pada bulan penilaian, periksa **Cek bobot**, lalu pilih **Aktif** atau **Buka periode**. Form menampilkan jumlah staf yang belum lengkap dan tautan ke langkah terkait; kepala penilai aktif tetap diperiksa server. Jalur penerima pola yang sudah diterapkan dikunci agar tidak memindahkan penerima ke alur penilaian lain; gunakan **Duplikat untuk jalur lain** untuk membuat salinan tanpa mengubah penugasan asal. Periode ditutup tetap hanya-baca.

**Pilar** adalah teks bebas dengan saran: lima pilar bawaan, pilar tersimpan, dan pilar dari KPI dalam draft pola. Kosongkan kolom untuk melihat semua saran; nama baru tersedia untuk KPI berikutnya setelah ditambahkan ke draft dan tersimpan permanen setelah **Simpan pola**. Pilihan **Satuan** dikelompokkan menjadi Persentase & perbandingan, Waktu, Keuangan, Jumlah/volume, dan Nilai; satuan historis di luar daftar tetap dipertahankan dalam kelompok Satuan tersimpan.

**Mutasi**: Super HC dapat mengganti, memindahkan, menukar, atau melepas kepala unit/divisi secara atomik, serta memutasi satu atau banyak staf per bulan efektif. Setiap mutasi menampilkan pratinjau dampak dari server sebelum dikonfirmasi.

**Efisiensi data**: halaman hanya memuat section dan jendela bulan yang dibutuhkan (`config.sections`), dashboard memakai agregasi SQL (`/data/dashboard`), dan daftar log/aktivitas/akun memakai pagination server.

KPI dan periode disimpan pada server, bukan data dummy atau localStorage bisnis. Database, akun, file privat, dan `.env` lokal tidak dihapus oleh pembersihan source. Jangan menjalankan `migrate:fresh` pada database berisi data.

Gunakan migrasi Laravel untuk instalasi baru; jangan mengimpor snapshot SQL lalu menjalankan baseline migrasi pada database yang sama. Lihat [panduan migrasi](docs/database/MIGRATION-V2.md), [skema](docs/database/SCHEMA.md), dan [kontrak transaksi](docs/database/TRANSACTIONS-V2.md).

## Frontend dan pemeriksaan

Entri frontend: `resources/css/app.css` dan `resources/js/app.js`. Gunakan utility Tailwind atau `@apply` untuk styling umum. CSS khusus dipertahankan untuk token tema, grafik, dan perilaku responsif yang membutuhkan selector khusus.

Antarmuka memakai sidebar forest dengan menu aktif emerald dan penanda putih, kanvas bernuansa hijau, serta panel netral. Komposisi visual 60:30:10 memakai keluarga hijau sebagai warna dominan, permukaan netral sebagai pendamping, dan aksen semantik untuk status/perhatian. Tombol, form, tabel, dialog, dan kontrol segmented berbentuk pill konsisten di seluruh role. Pilihan Sistem/Terang/Gelap tersedia di bagian bawah sidebar dan menu akun; pilihan Sistem mengikuti perubahan tema perangkat. Token dan komponen bersama ada di `resources/css/app.css`; layout bersama di `reference-layout.css`, tabel/alur kerja di `table-workspace.css`, dan editor KPI di `kpi-workspace*.css`. Pertahankan atribut `data-*`, ID form/dialog, dan kontrak API saat mengubah layout.

Gunakan `--color-link` untuk teks beraksen hijau agar tetap terbaca pada kedua tema. `--color-primary-dark` adalah warna latar hover tombol, bukan token warna teks.

Untuk latar field nonaktif/readonly gunakan `background-color`, bukan shorthand `background`, agar ikon dropdown tidak kehilangan aturan posisi, ukuran, dan `no-repeat`. Pertahankan padding ujung sesuai tipe field dari komponen bersama supaya teks tidak menabrak ikon.

Dashboard semua role memakai empat kartu pastel dengan angka periode saat ini, tanpa perbandingan rerata antararea atau badge pembanding bulan sebelumnya. Dashboard KU hanya berisi jadwal dengan tindakan Isi nilai staf, sebaran kategori dan indikator KPI dalam satu baris panel sejajar; tabel Status staf dan preview Prioritas dihapus karena pekerjaan rinci tersedia pada Isi nilai dan Anggota Unit. Dashboard KD/HC memakai dua baris: kategori dan jadwal di atas, Progres per unit/divisi serta sorotan Prioritas/KPI/Aktivitas di bawah. Kedua panel bawah sejajar dan isinya dapat digulir secara lokal. Admin tetap memakai halaman akun sebagai beranda.

Donut menampilkan sebaran kategori dari hasil Final, bukan mengulang ketuntasan seluruh subjek. Legenda selalu menampilkan kategori, jumlah, persentase dan rerata, sehingga tidak memerlukan popup yang terpotong pada kanvas kecil. Hover legenda hanya menyorot segmen. Tanpa hasil Final tidak dibuat segmen palsu.

Pada desktop normal, dashboard KU diringkas agar tidak memerlukan scroll halaman; KD/HC membatasi tinggi progres dan sorotan dengan header tabel tetap terlihat. Panel pada setiap baris mengikuti batas atas dan bawah yang sama. Layar kecil/zoom memakai alur vertikal agar data dan tindakan tidak terpotong; pada ponsel batas tinggi daftar dilepas. Sidebar menjadi drawer dan tab dapat dioperasikan dengan keyboard. Gaya dashboard berada di `resources/css/role-dashboard.css`. Setelah mengubah frontend, jalankan `npm.cmd run build` bila tidak memakai Vite dev server; halaman biasa memuat aset dari `public/build`.

Laporan penilaian tidak lagi memiliki tab Ringkasan, grafik tren, atau perbandingan rerata antarunit. KU mulai pada Nilai karyawan; KD/HC mulai pada Rata-rata KPI. Matriks nilai bulanan, Status unit, Peringkat & temuan, peninjauan penilaian dan ekspor tetap tersedia sesuai role.

Tim Divisi mulai pada **Semua unit dalam divisi**, menampilkan staf dari seluruh unit dalam cakupan Kepala Divisi dengan kolom Unit; memilih satu unit mempersempit daftar dan Reset mengembalikan semua unit. Laporan memakai satu dialog Filter untuk unit/jenis, rentang bulan, urutan rata-rata dan jenis temuan. Pencarian dan Ekspor tetap di luar. Rentang bulan berlaku pada tabel KPI/nilai karyawan dan urutan rata-rata pada nilai karyawan; petunjuk menyebut tab yang terpengaruh. Unit global berlaku konsisten pada peringkat, temuan dan nilai karyawan. Peringkat tetap dihitung per kelompok KPI, bukan menjadi kompetisi lintas pola/jenis; setiap baris menyebut kelompoknya. Pilihan Semua unit tidak memperluas otorisasi di luar divisi akun. Temuan memakai **Negatif** sebagai bawaan, dengan pilihan **Positif** atau **Semua (negatif dahulu)**; tanpa temuan negatif ditampilkan pesan kosong, bukan otomatis menggantinya dengan temuan positif. Pergantian jenis mereset pagination temuan.

Rincian Divisi pada Struktur & Staf menampilkan daftar unit aktif/nonaktif di bawah divisi, kepala unit dan jumlah staf aktif yang penempatannya berlaku pada bulan WIB saat ini. Penempatan yang baru berlaku di masa depan tidak dihitung sebagai staf aktif bulan ini. Tombol Rincian membuka unit terkait dalam modal yang sama, tanpa menyisakan daftar unit divisi sebelumnya.

Dashboard menghitung rerata Final dan ketuntasan langsung untuk periode terpilih; subjek yang belum dinilai tetap termasuk penyebut ketuntasan. Query tren historis, pembanding bulan sebelumnya dan perbandingan area yang tidak lagi dipakai dihapus. Saat pemuatan gagal, grafik dan data lama dibersihkan; Muat ulang memulihkan isi dari server tanpa perubahan data bisnis.

```powershell
npm.cmd run build
php artisan route:list --except-vendor
```

Sandbox review, prototype terpisah, test case, screenshot, laporan pengujian, dan arsip desain tidak disertakan. Dependency dan aset runtime tetap dipertahankan. Setelah memindahkan atau menambah kelas PHP, jalankan `composer dump-autoload`.

Acuan fitur: [revisi per role](docs/requirements/REVISI-PER-ROLE-v1.4.md), [alur penilaian](docs/requirements/ALUR-KPI-v1.3.md), dan [PRD](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md).
