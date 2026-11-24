# KPI Kinerja

Aplikasi MVC Laravel 13, PHP 8.3+, MySQL, Blade, Tailwind CSS 4, Vite, dan JavaScript native. Better Auth pada `services/auth` menangani autentikasi; aturan bisnis tetap di Laravel.

## Menjalankan proyek

Panduan lengkap dari clone GitHub, prasyarat, konfigurasi database, hingga akun Admin pertama: [installation.md](installation.md).

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

`kpi:create-admin` hanya untuk akun **Admin** pertama; kata sandi diminta interaktif. Akun Super HC, Kepala Divisi, dan Kepala Unit dibuat Admin dari menu Akun Pengguna. Untuk memakai data yang sama dengan komputer pengembangan, jalankan `php artisan migrate --seed` pada database kosong sebagai ganti `migrate` + `kpi:create-admin`. Perbarui data seeder dengan `php artisan kpi:export-seed` (lihat [installation.md](installation.md)). Jangan menjalankan `key:generate` ulang pada instalasi yang sudah memiliki `APP_KEY`.

Email pengingat memakai mailer Laravel (SMTP). Isi `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, dan `MAIL_FROM_ADDRESS` pada `.env`. Dengan `QUEUE_CONNECTION=sync` email dikirim langsung; dengan `QUEUE_CONNECTION=database` jalankan `php artisan queue:work`.

**Pengingat otomatis** diatur Admin melalui **Pengingat Email**: aktif/nonaktif, hari H- (misalnya 14, 7, 3), jam kirim WIB, dan role penerima. Kepala Unit mengikuti batas pengajuan; Kepala Divisi mengikuti batas persetujuan. Hanya kepala aktif yang mengizinkan email dan masih memiliki tugas pada periode dibuka yang menerima pengingat. Pengaturan awal nonaktif.

Jalankan scheduler Laravel: `php artisan schedule:work` untuk lokal, atau `php artisan schedule:run` setiap menit melalui cron/Task Scheduler di server. Scheduler terpisah dari antrean email dan tidak dijalankan oleh launcher. Pratinjau tanpa pengiriman: `php artisan kpi:auto-reminders --dry-run`. Pengiriman berulang/bersamaan tidak menduplikasi email jadwal yang sama; log menampilkan pengirim **Otomatis**. Hari yang terlewat tidak dikirim susulan, tetapi scheduler dapat mengejar jadwal pada hari yang sama.

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

**Admin** mengelola akun login (buat, ubah, nonaktifkan, hapus akun tanpa histori, atur ulang kata sandi), membaca seluruh log (aktivitas, login/logout termasuk percobaan gagal, status email), dan mengirim email pengingat pengisian/persetujuan KPI. **Super HC** mengelola struktur, staf, penunjukan dan mutasi kepala/staf, KPI, dan periode; Super HC tidak mengelola akun. KU menilai staf; KD dapat menyesuaikan usulan nilai, mengembalikan dengan catatan per KPI, atau menyetujui menjadi Final, serta menilai Kepala Unit. Penilaian Final hanya baca. Akses data dibatasi role dan area.

**Riwayat penilaian** mencatat pengajuan, koreksi KD, pengembalian beserta catatan per KPI, pengajuan ulang, pembatalan, dan persetujuan (termasuk massal). Nama, jabatan, penugasan, unit/divisi, waktu, dan perubahan nilai disimpan saat tindakan dilakukan. Pergantian kepala tidak mengganti identitas pelaku lama; kepala aktif pada area yang sama dapat melanjutkan penilaian yang belum Final. Pembatalan tidak menghapus riwayat. Data lama yang belum memiliki snapshot identitas ditandai secara eksplisit, bukan dianggap sebagai identitas historis yang pasti. Migrasi `2026_11_22_000020` dan `000021` menambah riwayat permanen serta snapshot audit; tidak memakai `migrate:fresh`.

**Koreksi KD** menyimpan nilai efektif terpisah dari usulan dan input pengukuran KU, termasuk KPI berformula. Catatan koreksi opsional; pengembalian wajib memiliki catatan umum atau minimal satu catatan per KPI. KU dapat memperbaiki dan mengajukan ulang; koreksi KD lama direset tanpa menghapus riwayat. Monitoring dan ekspor memakai nilai efektif KD. Migrasi `2026_11_23_000023` menambah penyimpanan koreksi ini; jalankan `php artisan migrate` pada instalasi lama.

**KPI & Periode** memakai **Pola KPI** tanpa jalur penerima. Satu pola berisi KPI, target, dan bobot yang sama untuk staf maupun Kepala Unit; HC dapat memilih keduanya sekaligus dalam satu penerapan, tanpa membuat dua pola. Satu orang memakai satu pola per periode dan total bobot wajib tepat 100%. Filter jenis penerima hanya mempersempit daftar orang, bukan membatasi pola. Penilai tetap mengikuti jenis orang: KU menilai staf, KD menilai Kepala Unit. *Cek bobot* menampilkan seluruh penerima termasuk yang belum berpola; kelengkapan Kepala Unit dipantau terpisah dan tidak menghalangi pembukaan periode.

Periode baru disimpan sebagai **Direncanakan**. Setelah menyiapkan pola 100%, terapkan ke seluruh staf eligible, periksa **Cek bobot**, lalu buka periode. Pola dan penugasan lama tetap dipertahankan saat pengaturan jalur dihapus. Perubahan KPI tidak menimpa snapshot atau nilai yang sudah tersimpan; periode ditutup tetap hanya-baca. Penjelasan panjang dan tombol **Selengkapnya** di workspace dihapus, bukan dipindahkan ke panel bantuan.

**Pemakai pola** dibuka melalui tautan **N pemakai** di kolom Pemakai, termasuk pola dengan **0 pemakai**. Daftar menampilkan nama, NIP, jenis penerima, unit/divisi, dan status penilaian pada periode terpilih, termasuk pemakai tidak aktif. Tambah atau lepas pemakai dari halaman ini; tindakan tersebut tidak diduplikasi di menu **⋮**. Pemakai yang sudah dinilai serta periode ditutup tetap hanya-baca.

**Impor pola KPI**: buka **KPI & Periode → Pola KPI → Impor pola** pada periode tujuan. Mendukung template CSV/XLSX dan workbook master RSAB dengan banyak sheet. Untuk master RSAB, unggah file, cari dan pilih sheet, lalu **Periksa pilihan**. Satu sheet menjadi satu pola baru; tahun pada nama file/sheet tidak mengganti periode tujuan. Sheet kosong atau tabel tanpa batas TOTAL ditandai tidak dapat dipakai.

Header master dideteksi dari nama kolom, termasuk variasi posisi judul. Numerator/denominator menjadi variabel formula; format persentase Excel dinormalisasi dengan skala yang konsisten. Kolom **Approval**, **NILAI**, hasil JAN–DEC, baris total, dan tabel referensi setelah TOTAL tidak ikut diimpor. File sumber tidak diubah.

Pratinjau awal menampilkan seluruh KPI, disertai jumlah yang siap dan perlu dilengkapi. **Perbaiki** hanya ditampilkan untuk KPI yang tidak valid atau belum lengkap; KPI valid berstatus **OK** dengan tindakan **Ubah** opsional. Filter **Hanya bermasalah** tidak aktif otomatis. Jika dipilih, ringkasan menunjukkan jumlah hasil filter dibanding seluruh KPI; pilihan filter tetap dipertahankan saat memperbaiki baris. Arah yang tidak dicantumkan sumber mengikuti **Naik**; informasinya ditampilkan sekali, bukan sebagai kesalahan di setiap baris. HC dapat mengubah arah sebelum impor, tanpa wajib mengonfirmasi tiap KPI.

**Tambah/Ubah KPI** dalam pola dan **Ubah/Perbaiki** saat impor memakai satu komponen editor dan pengendali formula yang sama: dropdown satuan, variabel manual/tetap, operator, rekomendasi, pemeriksaan, dan uji hitung. Pada impor, **Simpan & periksa** hanya mengirim perubahan baris untuk diperiksa server; file sumber tidak berubah. Koreksi bertahap, **Batal**, **Kembalikan asli**, serta persetujuan penggantian ketentuan sumber tetap tersedia. Variabel dikirim terstruktur agar nama yang mengandung `;` atau `=` dan angka tetap tidak berubah akibat penguraian ulang teks.

Baris **Total bobot seluruh N KPI** di bawah kolom **Bobot KPI** menjumlahkan seluruh KPI yang dipilih untuk impor, bukan hanya baris pada halaman aktif atau hasil filter. Status menunjukkan **Sesuai 100%**, **Kurang**, atau **Lebih**, hingga empat desimal, dan dihitung ulang setelah **Simpan & periksa**. Jika ada bobot tidak valid, total diberi label **terbaca** disertai jumlah bobot yang perlu diperbaiki.

Untuk beberapa pola, total gabungan tidak dibandingkan dengan 100%; **setiap pola wajib 100%**. Ringkasan masing-masing pola tetap menampilkan total dan selisihnya. Pola yang belum tepat 100% tetap draf dan belum dapat diterapkan.

**Target capaian** adalah sasaran KPI sesuai satuannya, bukan bobot. Arah **Naik** ditampilkan sebagai **Lebih tinggi lebih baik**, sedangkan **Turun** sebagai **Lebih rendah lebih baik**. Kolom **Bobot KPI** menunjukkan kontribusi masing-masing KPI; total kontribusi dalam satu pola harus 100%.

Baris berbobot seperti **Turunan Target/KPI dari atasan** tetap wajib dilengkapi, bukan dibuang. Target nol memakai aturan nol kasus; ambang yang jelas dikonversi ke formula IF. Ketentuan bertingkat, celah batas, atau aturan yang tidak dapat dipetakan tepat tetap menghalangi impor sampai diperbaiki atau HC secara eksplisit menyetujui formula pengganti. Konversi/perbaikan menyimpan asal sheet, baris, target, formula, dan ketentuan sumber.

Maksimal 1.000 KPI terpilih, 200 KPI per pola, dan file 2 MB. Nama pola yang sudah ada tidak ditimpa; semua KPI terpilih divalidasi ulang dan disimpan atomik. Pilihan sheet atau koreksi yang berubah harus diperiksa sebelum diimpor. Pola belum 100% disimpan sebagai draf. Pemakai dan nilai historis tidak ditambahkan otomatis; terapkan pola setelah impor.

**Impor staf**: buka **Struktur & Staf → Staf → Impor staf**. Template CSV/XLSX memuat NIP, nama lengkap, kode jabatan, kode unit, dan bulan efektif `YYYY-MM`; XLSX menyertakan daftar kode dan format teks untuk menjaga nol awal NIP. Maksimal 500 staf tanpa akun login dan 2 MB. Pratinjau menandai kesalahan per baris; penyimpanan atomik membuat staf beserta penempatan efektifnya, tanpa duplikasi saat permintaan dikirim ulang.

**Pemilih periode** memakai isian tahun dengan tombol sebelumnya/berikutnya (2000–2100) dan 12 pilihan bulan, bukan daftar tahun yang terus memanjang. Bulan yang belum tersedia menyediakan tindakan membuat periode dengan bulan terisi otomatis. Pergantian periode hanya memuat pola, penerima, dan nilai bulan tujuan; permintaan lama dibatalkan agar hasilnya tidak menimpa pilihan terbaru. Penyimpanan hanya mengganti pola dan penugasan bulan aktif, tanpa menimpa bulan lain. Tindakan pada daftar pola dan periode tersedia dalam menu **⋮**, termasuk navigasi keyboard dan Escape.

**Gunakan KPI dari periode lain**: pilih bulan tujuan, buka **Pola KPI**, lalu pilih periode sumber dan **Gunakan di [bulan tujuan]**. Pola, rumus, target, dan bobot menjadi salinan terpisah; nilai dan temuan tidak ikut disalin, serta periode sumber tidak berubah. Sumber dimuat saat diperlukan. Gunakan menu **⋮ → Ubah pola** untuk menyesuaikan KPI salinan dan pastikan bobot tepat 100%. Penugasan dibawa untuk orang yang masih eligible pada bulan tujuan; pola bernama sama dilewati dan penugasan yang sudah ada tidak ditimpa.

Daftar Periode menampilkan jadwal per tahap, status kesiapan, dan tombol **Lihat N staf** yang membuka staf belum berpola. Tombol **Buka periode** nonaktif sampai seluruh staf eligible memakai pola 100%. Menggunakan KPI sebelumnya hanya membawa pola dan penugasan yang ada di periode sumber; staf pada unit yang belum punya pola di periode sumber harus diberi pola baru atau pola yang sudah ada melalui langkah **Terapkan ke staf**.

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

Form dan rincian memakai popup tengah yang tingginya mengikuti isi, bukan panel kanan setinggi layar. Form pendek memakai lebar 540px, rincian/editor panjang 760px; pada layar kecil lebarnya mengikuti viewport. Isi panjang digulir di dalam popup, sementara header dan tombol footer tetap terjangkau. Sidebar navigasi dan menu akun tetap memakai perilakunya sendiri.

Dashboard semua role memakai empat kartu pastel dengan angka periode saat ini, tanpa perbandingan rerata antararea atau badge pembanding bulan sebelumnya. Dashboard KU hanya berisi jadwal, distribusi nilai Final dan indikator KPI dalam satu baris panel sejajar; tabel Status staf dan preview Prioritas dihapus karena pekerjaan rinci tersedia pada Isi nilai dan Anggota Unit. Dashboard KD/HC memakai dua baris: distribusi nilai dan jadwal di atas, Progres per unit/divisi serta sorotan Prioritas/KPI/Aktivitas di bawah. Tinggi baris mengikuti isi, bukan dipaksa memenuhi layar; tabel dan daftar panjang tetap memiliki batas tinggi dan scroll lokal.

Distribusi nilai memakai histogram hasil Final bernilai 0–100, dikelompokkan per interval 2 poin (batas atas tidak termasuk, kecuali 100). Grafik menampilkan rentang pertama sampai terakhir yang berisi data, dengan rentang kosong di antaranya tetap bernilai nol. Tinggi batang menunjukkan jumlah hasil, bukan rerata; tabel Data histogram menyediakan angka dan batas interval yang tepat. Final tanpa nilai valid tidak dihitung dan jumlahnya disebutkan. Pilihan Kategori menggantikan histogram dengan donut; keduanya tidak digambar sekaligus. Legenda donut menampilkan kategori, jumlah, persentase dan rerata tanpa popup terpotong. Tanpa hasil Final tidak dibuat grafik atau segmen palsu.

Pada desktop normal, dashboard KU diringkas agar tidak memerlukan scroll halaman; KD/HC membatasi tinggi progres dan sorotan dengan header tabel tetap terlihat. Panel pada setiap baris mengikuti batas atas dan bawah yang sama. Layar kecil/zoom memakai alur vertikal agar data dan tindakan tidak terpotong; pada ponsel batas tinggi daftar dilepas. Sidebar menjadi drawer dan tab dapat dioperasikan dengan keyboard. Gaya dashboard berada di `resources/css/role-dashboard.css`. Setelah mengubah frontend, jalankan `npm.cmd run build` bila tidak memakai Vite dev server; halaman biasa memuat aset dari `public/build`.

Laporan penilaian tidak lagi memiliki tab Ringkasan, grafik tren, atau perbandingan rerata antarunit. KU mulai pada Nilai karyawan; KD/HC mulai pada Rata-rata KPI. Matriks nilai bulanan, Status unit, Peringkat & temuan, peninjauan penilaian dan ekspor tetap tersedia sesuai role.

**Ekspor HC dan Kepala Divisi** menyediakan satu bulan, triwulan kalender (I–IV), semester (Januari–Juni atau Juli–Desember), dan satu tahun. Pilih cakupan divisi/unit, jenis penilaian, status, serta Excel atau CSV. Server mengambil seluruh data dalam rentang, bukan hanya bulan atau halaman tabel yang terbuka. Kepala Divisi tetap terbatas pada divisinya; filter di luar kewenangan ditolak. Excel memuat ringkasan, rekap bulanan, rata-rata per orang untuk rentang lebih dari sebulan, serta rincian KPI opsional. CSV memuat rekap bulanan. Rata-rata hanya memakai nilai Final; usulan dan nilai yang dikembalikan tidak dihitung sebagai hasil disetujui.

Tim Divisi mulai pada **Semua unit dalam divisi**, menampilkan staf dari seluruh unit dalam cakupan Kepala Divisi dengan kolom Unit; memilih satu unit mempersempit daftar dan Reset mengembalikan semua unit. Filter tampil langsung sebagai kontrol terpisah, tanpa dialog Filter atau langkah penerapan tambahan. Rentang bulan berlaku pada tabel KPI/nilai karyawan dan urutan rata-rata pada nilai karyawan; petunjuk menyebut tab yang terpengaruh. Unit global berlaku konsisten pada peringkat, temuan dan nilai karyawan. Peringkat tetap dihitung per kelompok KPI, bukan menjadi kompetisi lintas pola/jenis; setiap baris menyebut kelompoknya. Pilihan Semua unit tidak memperluas otorisasi di luar divisi akun. Temuan memakai **Negatif** sebagai bawaan, dengan pilihan **Positif** atau **Semua (negatif dahulu)**; tanpa temuan negatif ditampilkan pesan kosong, bukan otomatis menggantinya dengan temuan positif. Pergantian jenis mereset pagination temuan.

Rincian Divisi pada Struktur & Staf menampilkan daftar unit aktif/nonaktif di bawah divisi, kepala unit dan jumlah staf aktif yang penempatannya berlaku pada bulan WIB saat ini. Penempatan yang baru berlaku di masa depan tidak dihitung sebagai staf aktif bulan ini. Tombol Rincian membuka unit terkait dalam modal yang sama, tanpa menyisakan daftar unit divisi sebelumnya.

Dashboard menghitung rerata Final dan ketuntasan langsung untuk periode terpilih; subjek yang belum dinilai tetap termasuk penyebut ketuntasan. Query tren historis, pembanding bulan sebelumnya dan perbandingan area yang tidak lagi dipakai dihapus. Saat pemuatan gagal, grafik dan data lama dibersihkan; Muat ulang memulihkan isi dari server tanpa perubahan data bisnis.

```powershell
npm.cmd run build
php artisan route:list --except-vendor
```

Sandbox review, prototype terpisah, test case, screenshot, laporan pengujian, dan arsip desain tidak disertakan. Dependency dan aset runtime tetap dipertahankan. Setelah memindahkan atau menambah kelas PHP, jalankan `composer dump-autoload`.

Acuan fitur: [revisi per role](docs/requirements/REVISI-PER-ROLE-v1.4.md), [alur penilaian](docs/requirements/ALUR-KPI-v1.3.md), dan [PRD](docs/requirements/PRD-KPI-Kinerja-Revisi-v1.2.md).
