# Instalasi KPI Kinerja

Panduan ini memasang KPI Kinerja dari clone baru repositori GitHub sampai halaman login dapat digunakan. Aplikasi terdiri dari tiga bagian yang semuanya wajib:

- **Laravel (PHP)**: aplikasi utama dan aturan bisnis.
- **Better Auth (Node.js)** pada `services/auth`: layanan login, hanya mendengar di `127.0.0.1`.
- **MySQL**: satu database yang dipakai Laravel dan Better Auth bersama.

Frontend (Tailwind CSS 4 + Vite) dibangun menjadi `public/build`. Folder tersebut tidak ikut di repositori sehingga wajib dibangun setelah clone.

Contoh perintah memakai PowerShell di Windows. Gunakan `npm.cmd` (bukan `npm`) agar tidak terhalang execution policy PowerShell untuk `npm.ps1`. Di Linux/macOS, ganti `npm.cmd` dengan `npm`.

## 1. Prasyarat

| Perangkat | Versi | Periksa dengan |
| --- | --- | --- |
| Git | versi terbaru | `git --version` |
| PHP CLI | 8.3 atau lebih baru (`composer.json`: `^8.3`) | `php -v` |
| Composer | 2.x | `composer --version` |
| Node.js + npm | 22.12 atau lebih baru (disarankan Node 22 LTS) | `node -v`, `npm.cmd -v` |
| MySQL **atau** MariaDB | MySQL 8.4 LTS (disarankan) atau MariaDB 10.5+ (diuji di 11.4, umum di Linux) | `mysql --version` / `mariadb --version` |

Catatan versi:

- Node minimal 22.12 karena Vite 8 dan `laravel-vite-plugin` mensyaratkan `^20.19.0 || >=22.12.0`, sedangkan `kysely` (dependensi Better Auth) mensyaratkan `>=22.0.0`.
- Schema memakai CHECK constraint, foreign key, generated column, dan trigger InnoDB. MySQL 8.4 dan MariaDB 11.4 sudah diuji (migrasi, seeder, alur penilaian, perpanjangan, tutup periode). MySQL 5.7 tidak didukung.
- Di MariaDB isi `DB_CONNECTION=mariadb` (lihat langkah 4). Extension PHP yang dipakai tetap `pdo_mysql`.

Extension PHP yang wajib aktif (periksa dengan `php -m`):

- Diminta langsung oleh `composer.json`: `bcmath`, `pdo_mysql`, `zip`, `dom`.
- Diminta Laravel dan dependensinya: `ctype`, `fileinfo`, `filter`, `hash`, `iconv`, `json`, `libxml`, `mbstring`, `openssl`, `pcre`, `session`, `tokenizer`.

Di Windows, cari lokasi `php.ini` dengan `php --ini`, lalu aktifkan baris `extension=...` yang masih diberi tanda `;`. Instalasi Laragon/XAMPP biasanya sudah menyediakan file extension-nya.

## 2. Siapkan database kosong

MySQL harus sudah berjalan. Buat database **baru dan kosong** dengan client MySQL (bisa juga lewat phpMyAdmin/HeidiSQL dengan charset `utf8mb4` dan collation `utf8mb4_unicode_ci`):

```powershell
mysql -u root -p -e "CREATE DATABASE kpi_kinerja_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Jika muncul error `1007 database exists`, database dengan nama itu sudah ada dan mungkin berisi data. **Jangan pakai, kosongkan, atau hapus database tersebut.** Pilih nama lain, misalnya `kpi_kinerja`, lalu gunakan nama baru itu pada `DB_DATABASE` di langkah 4.

Akun MySQL yang dipakai aplikasi perlu hak penuh atas database tersebut, termasuk `CREATE`, `ALTER`, `DROP`, `INDEX`, `REFERENCES`, dan `TRIGGER`. Akun `root` lokal sudah memenuhi syarat ini.

Jangan mengimpor snapshot SQL (`database/schema/schema.mysql.sql` atau dump lama) ke database ini. Schema dipasang oleh migrasi Laravel.

## 3. Clone repositori dan pasang dependensi

```powershell
git clone https://github.com/Kinan192/Abprove-Dashboard-KPI.git
cd Abprove-Dashboard-KPI
```

Salin file konfigurasi:

```powershell
Copy-Item .env.example .env
```

Linux/macOS: `cp .env.example .env`

Pasang dependensi PHP dan Node:

```powershell
composer install
npm.cmd ci
```

`npm.cmd ci` di root juga memasang dependensi Better Auth karena `services/auth` terdaftar sebagai workspace npm. Tidak perlu menjalankan `npm install` terpisah di folder `services/auth`.

## 4. Atur `.env`

Buka `.env` dan sesuaikan minimal nilai berikut. Isi `DB_USERNAME` dan `DB_PASSWORD` dengan akun MySQL Anda sendiri, dan jangan commit atau membagikan file `.env`.

```dotenv
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql      # MariaDB (mis. Linux): mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kpi_kinerja_dev
DB_USERNAME=root
DB_PASSWORD=

# Lokal: email hanya ditulis ke storage/logs/laravel.log, tidak benar-benar terkirim.
MAIL_MAILER=log
QUEUE_CONNECTION=sync

BETTER_AUTH_PORT=3031
BETTER_AUTH_INTERNAL_URL=http://127.0.0.1:3031
```

Catatan:

- Biarkan `APP_KEY` dan `BETTER_AUTH_SECRET` kosong. Keduanya dibuat otomatis di langkah 5.
- Proyek ini tidak menyediakan seeder data contoh: `DatabaseSeeder` hanya mencetak pesan dan tidak membuat data. Akun Admin pertama dibuat pada langkah 5.
- Launcher menjalankan Laravel di port `PORT` (default `8000`, variabel opsional). Jika `PORT` diubah, ubah juga port di `APP_URL`. Jika `BETTER_AUTH_PORT` diubah, ubah juga `BETTER_AUTH_INTERNAL_URL`.

## 5. Buat kunci, pasang schema, dan buat Admin pertama

Jalankan perintah berikut berurutan di root proyek:

```powershell
php artisan key:generate
php artisan kpi:auth-key
php artisan migrate
php artisan kpi:create-admin
```

- `key:generate` mengisi `APP_KEY`. **Jalankan hanya pada instalasi baru yang `APP_KEY`-nya masih kosong.** Membuat ulang kunci pada instalasi yang sudah berjalan membuat sesi dan data terenkripsi lama tidak dapat dibaca.
- `kpi:auth-key` mengisi `BETTER_AUTH_SECRET` dengan nilai acak 64 karakter. Jika secret 32 karakter atau lebih sudah ada, perintah ini tidak mengubahnya.
- `migrate` memasang seluruh tabel domain, tabel Better Auth, dan tabel antrean ke database kosong. Tidak ada migrasi CLI Better Auth terpisah. Database harus benar-benar kosong: migrasi `000005` menolak data domain lama dengan `DOMAIN_V2_DATA_CONVERSION_REQUIRED`. Jangan mencoba migrasi instalasi baru pada database berisi data; sebagian migrasi sebelumnya mungkin sudah dijalankan.
- `kpi:create-admin` meminta nama, email login, kata sandi, dan konfirmasi kata sandi secara interaktif. Kata sandi minimal 12 karakter dan wajib berisi huruf serta angka. Tidak ada akun atau kata sandi bawaan. Perintah ini menolak berjalan jika Admin aktif sudah ada.

## 6. Bangun frontend dan jalankan aplikasi

```powershell
npm.cmd run build
npm.cmd run start
```

`npm.cmd run start` (`tools/serve.mjs`) menjalankan Better Auth di `127.0.0.1:3031` lalu server PHP bawaan untuk Laravel di `127.0.0.1:8000` dengan document root `public/`. Launcher menunggu kedua layanan siap sebelum mencetak:

```text
Project siap di http://127.0.0.1:8000/login. Tekan Ctrl+C untuk menghentikan layanan yang dimulai launcher ini.
```

Buka `http://127.0.0.1:8000/login` dan masuk dengan akun Admin dari langkah 5. Gunakan host yang **sama persis** dengan `APP_URL` (misalnya `127.0.0.1`, bukan `localhost`) agar cookie sesi dan tautan email konsisten.

Launcher tidak menjalankan MySQL, jadi MySQL harus sudah aktif sebelumnya. Hentikan aplikasi dengan `Ctrl+C`; launcher hanya menghentikan proses yang ia mulai sendiri.

Sebagai alternatif launcher, jalankan `npm.cmd run auth:start` dan `php artisan serve` di dua terminal terpisah.

### Mode pengembangan frontend (opsional)

Saat mengubah CSS/JS, biarkan `npm.cmd run start` tetap berjalan dan buka terminal kedua:

```powershell
npm.cmd run dev
```

Vite dev server hanya menyajikan aset dengan reload otomatis. Server ini bukan pengganti Laravel atau Better Auth. Setelah selesai, hentikan dengan `Ctrl+C` dan jalankan `npm.cmd run build` agar `public/build` kembali mutakhir.

## 7. Langkah awal di aplikasi

1. **Admin** masuk, lalu membuat akun Super HC, Kepala Divisi, dan Kepala Unit melalui menu **Akun Pengguna**.
2. **Super HC** menyusun divisi, unit, jabatan, dan staf di **Struktur & Staf**, lalu menunjuk Kepala Divisi/Kepala Unit pada area masing-masing. Staf dapat dimasukkan massal melalui **Staf → Impor staf** dengan template CSV/XLSX. Akun kepala belum bisa login sebelum mendapat penugasan aktif; pesan yang muncul adalah "Akun tidak aktif atau belum mendapat penugasan."
3. Di **KPI & Periode**, Super HC membuat periode (berstatus **Direncanakan**), membuat, menyalin, atau mengimpor pola KPI berbobot tepat 100%, lalu menerapkan pola ke seluruh staf eligible. Satu pola dapat dipakai staf dan Kepala Unit. Setelah itu Super HC memeriksa **Cek bobot** dan memilih **Buka periode**.
4. Kepala Unit mengisi nilai staf. Kepala Divisi dapat mengoreksi usulan langsung, mengembalikan dengan catatan per KPI, atau menetapkan Final, serta menilai Kepala Unit. Usulan, koreksi, identitas pelaku, dan persetujuan tersimpan dalam riwayat; hasil Final terkunci.

Rincian alur ada di `README.md` dan `docs/requirements/`.

## 8. Email pengingat dan antrean

- `MAIL_MAILER=log` aman untuk lokal karena email hanya ditulis ke `storage/logs/laravel.log`.
- Untuk benar-benar mengirim email, isi `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, dan `MAIL_FROM_ADDRESS` dengan data SMTP yang sah. Penerima di perangkat lain membutuhkan `APP_URL` yang dapat mereka akses; alamat `127.0.0.1` hanya berlaku di komputer aplikasi.
- Dengan `QUEUE_CONNECTION=sync`, email dikirim langsung oleh permintaan manual atau proses pengingat otomatis. Dengan `QUEUE_CONNECTION=database`, jalankan `php artisan queue:work` di terminal terpisah. Tabel antrean sudah dibuat oleh migrasi.

### Scheduler pengingat otomatis

1. Pada instalasi lama, jalankan `php artisan migrate`. Migrasi `2026_11_23_000022` menambah pengaturan jadwal dan kunci pencegah duplikasi pengiriman.
2. Admin membuka **Pengingat Email → Pengingat otomatis**, mengaktifkan jadwal, lalu mengatur hari H- (misalnya 14, 7, 3), jam WIB, serta penerima KU/KD. Pengaturan awal nonaktif. Jadwal KU memakai batas pengajuan; KD memakai batas persetujuan.
3. Untuk lokal, jalankan `php artisan schedule:work` pada terminal terpisah. Launcher `npm.cmd run start` tidak menjalankan scheduler. Untuk server Windows, konfigurasi Task Scheduler agar menjalankan PHP dengan argumen `artisan schedule:run` setiap menit dan direktori kerja root proyek. Di Linux/macOS, gunakan cron setiap menit:

   ```cron
   * * * * * cd /path/ke/proyek && php artisan schedule:run >> /dev/null 2>&1
   ```

4. Periksa penerima tanpa mengirim melalui `php artisan kpi:auto-reminders --dry-run`. Scheduler hanya mengirim kepada kepala aktif, mengizinkan email, dan masih memiliki tugas pada periode dibuka. Log email menampilkan pengirim **Otomatis**. Proses berulang tidak menduplikasi jadwal yang sama; antrean yang kedaluwarsa atau sudah tidak relevan tidak dikirim.

Scheduler harus tetap berjalan, terpisah dari `queue:work` bila memakai antrean database. Instalasi aplikasi tidak membuat layanan atau tugas OS otomatis.

## 9. Izin folder

Laravel dan launcher menulis ke `storage/` dan `bootstrap/cache/`. Di Windows, folder di dalam profil pengguna biasanya sudah dapat ditulis. Di Linux/macOS, pastikan pengguna yang menjalankan PHP dapat menulis ke folder tersebut, misalnya:

```bash
chmod -R ug+rw storage bootstrap/cache
```

## 10. Verifikasi

Perintah berikut hanya membaca status dan tidak mengubah data:

```powershell
php artisan migrate:status
php artisan about
curl.exe http://127.0.0.1:8000/up
curl.exe http://127.0.0.1:8000/_kpi/health
curl.exe http://127.0.0.1:3031/health
```

- `migrate:status` harus menampilkan seluruh migrasi yang tersedia, termasuk `2026_11_23_000022` dan `2026_11_23_000023`, berstatus `Ran`. Gunakan `php artisan migrate` untuk pembaruan, bukan `migrate:fresh`.
- `/up` adalah health check bawaan Laravel. `/_kpi/health` menandai server Laravel proyek ini (`"service":"kpi-kinerja"`) tetapi tidak memeriksa database.
- `http://127.0.0.1:3031/health` dari Better Auth memeriksa database. Nilai `"ready":true` berarti koneksi MySQL dan tabel sesi tersedia.

Di Linux/macOS, gunakan `curl` biasa.

## 11. Pemecahan masalah

**`Vite manifest not found` / `Unable to locate file in Vite manifest`**
Jalankan `npm.cmd run build`. Jika tampilan rusak setelah Vite dev server berhenti tidak normal, hapus file `public/hot` saja, bukan folder lain.

**`could not find driver`**
Extension `pdo_mysql` belum aktif di `php.ini` milik PHP CLI yang dipakai. Periksa dengan `php --ini` dan `php -m`. Di Linux biasanya paketnya `php8.3-mysql` (berlaku juga untuk MariaDB).

**MariaDB: `Schema ini membutuhkan MySQL 8 atau MariaDB` atau error sintaks `DROP CHECK`**
Kode lama sebelum dukungan MariaDB. Tarik versi terbaru (`git pull`); jika sebelumnya Anda mengubah file migrasi/config secara lokal, kembalikan dulu perubahan itu (`git restore database/migrations config/database.php`) agar tidak bentrok. Lalu pastikan `.env` berisi `DB_CONNECTION=mariadb`.

**`SQLSTATE[HY000] [2002]`**
MySQL belum berjalan, atau `DB_HOST`/`DB_PORT` salah.

**`SQLSTATE[HY000] [1045] Access denied`**
`DB_USERNAME`/`DB_PASSWORD` salah.

**`[1049] Unknown database`**
Database belum dibuat (lihat langkah 2).

Setelah mengubah `.env`, jalankan `php artisan config:clear` bila konfigurasi pernah di-cache.

**`DOMAIN_V2_DATA_CONVERSION_REQUIRED` atau `Base table or view already exists`**
Database tidak kosong atau berasal dari impor SQL. Arahkan `DB_DATABASE` ke database baru yang kosong. Jangan memakai `migrate:fresh`, `migrate:reset`, `db:wipe`, `DROP`, atau `TRUNCATE` pada database berisi data. Konversi data lama dijelaskan di `docs/database/MIGRATION-V2.md`.

**Error `1419` saat migrasi membuat trigger**
Akun MySQL non-root tidak boleh membuat trigger ketika binary logging aktif. Gunakan akun dengan hak yang memadai, atau minta administrator database mengizinkannya.

**"Layanan autentikasi belum berjalan" atau "belum siap"**
Better Auth tidak aktif atau tidak dapat dihubungi Laravel. Jalankan aplikasi lewat `npm.cmd run start`, lalu periksa `http://127.0.0.1:3031/health`. Penyebab lain yang umum:

- Pesan `BETTER_AUTH_SECRET minimal 32 karakter wajib diisi.` berarti `php artisan kpi:auth-key` belum dijalankan.
- `"ready":false` berarti MySQL mati atau migrasi belum dijalankan.
- `BETTER_AUTH_INTERNAL_URL` harus memakai port yang sama dengan `BETTER_AUTH_PORT`.

**Login berhasil tetapi kembali ke halaman login**
Buka aplikasi lewat host dan skema yang sama dengan `APP_URL`. Jika `APP_URL` memakai `https://`, cookie menjadi `Secure` dan tidak tersimpan bila aplikasi dibuka lewat `http://`.

**"Port ... sudah digunakan" atau "digunakan layanan lain atau konfigurasi project yang berbeda"**
Launcher menolak memakai port yang dipakai proses lain dan tidak pernah mematikannya. Cari proses tersebut dengan `Get-NetTCPConnection -LocalPort 8000` (PowerShell) atau `lsof -i :8000` (Linux/macOS). Hentikan proses itu hanya jika Anda tahu itu memang proses proyek ini. Pilihan lain: ubah `PORT`/`BETTER_AUTH_PORT` beserta `APP_URL`/`BETTER_AUTH_INTERNAL_URL`.

Launcher juga menganggap layanan sebagai "konfigurasi berbeda" bila `.env` diubah saat aplikasi berjalan. Dalam kasus itu, hentikan launcher lama dengan `Ctrl+C`, lalu jalankan ulang.

**"Proses start lain masih aktif"**
Ada launcher lain yang sedang memulai layanan. Tunggu sampai proses itu selesai, atau hentikan dari terminalnya sendiri.

## 12. Memperbarui instalasi yang sudah berjalan

```powershell
git pull
composer install
npm.cmd ci
php artisan migrate
npm.cmd run build
```

Ambil backup database sebelum `php artisan migrate`. Pada pembaruan, jangan menjalankan `key:generate`, jangan mengganti `BETTER_AUTH_SECRET`, dan jangan menjalankan `kpi:create-admin` lagi. Mengganti kunci akan memutus sesi dan data terenkripsi yang sudah ada.

## 13. Catatan production

Panduan ini ditujukan untuk lingkungan lokal. Untuk server production:

- `npm.cmd run start` dan `php artisan serve` adalah server pengembangan, bukan web server production. Arahkan document root web server ke folder `public/`.
- Gunakan `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` berawalan `https://`, dan `SESSION_SECURE_COOKIE=true`. Dengan `APP_URL` HTTPS, cookie Better Auth otomatis menjadi `Secure`.
- Jalankan Better Auth (`npm run auth:start`) sebagai layanan permanen di server yang sama. Layanan ini hanya mendengar di `127.0.0.1` dan tidak perlu dibuka ke publik.
- Bila memakai `QUEUE_CONNECTION=database`, jalankan `php artisan queue:work` sebagai layanan permanen.
