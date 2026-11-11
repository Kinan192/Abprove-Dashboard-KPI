# Backend dan frontend terhubung v3

Laravel 13/PHP tetap menangani MVC, validasi, otorisasi, transaksi KPI, audit dan laporan. Blade, Tailwind 4, Vite dan JavaScript native tetap dipakai. Better Auth 1.7.18 berjalan pada Node 22 di loopback sebagai penyedia login dan sesi, memakai MySQL yang sama. Tidak ada Alpine atau layanan Python pada runtime aplikasi.

## Menjalankan

MySQL Laragon harus berjalan. Root project adalah direktori yang berisi artisan.

```powershell
npm.cmd ci
php artisan migrate
php artisan kpi:auth-key
php artisan optimize:clear
npm.cmd run build
npm.cmd run start
```

Buka http://127.0.0.1:8000/login. Perintah start menjalankan Better Auth dan PHP sekaligus. Alternatif dua terminal: `npm.cmd run auth:start` dan `php artisan serve`. Vite saat pengembangan tetap `npm.cmd run dev`. Laragon/Apache tetap mengarah ke public/ dan membutuhkan layanan auth terpisah. Node membaca .env root; mulai ulang Node setelah mengubah koneksi, origin atau secret.

BETTER_AUTH_INTERNAL_URL harus menuju loopback layanan auth; jangan arahkan ke aplikasi Laravel sendiri. APP_URL harus origin publik aplikasi yang tepat. Untuk HTTPS gunakan URL HTTPS, cookie Secure dan konfigurasi Laravel HTTPS yang sesuai. Secret dibuat sekali oleh kpi:auth-key, tidak dicetak atau ditanam pada source. Tidak ada pendaftaran akun publik.

## Database yang aktif

Database lokal aktif sekarang **kpi_kinerja_v3_dev**. Database **kpi_kinerja_dev** lama tetap utuh; data lamanya tidak diimpor otomatis. Backup konfigurasi sebelumnya ada di storage/app/private/integration-backup/.env.before-v3. [Catatan aktivasi](local-activation.json) memuat jumlah record sebelum perubahan dan jumlah seed baru.

Migration 000005 memasang domain v2 pada database kosong, 000006 memindahkan hash users.password ke auth_accounts dan memasang tabel Better Auth, 000007 menambahkan waktu aktivitas sesi. Migration domain tetap menolak database legacy berisi data. Jangan menjalankan migrate:fresh pada database lama. SQL fresh lengkap v3 tersedia di database/schema/schema.mysql.sql; pilih migration Laravel atau impor SQL, jangan keduanya pada database yang sama.

## Kontrak autentikasi

- Browser mengirim login email/NIP ke Laravel dengan CSRF. Laravel menemukan identitas email lalu meminta Better Auth melakukan verifikasi kata sandi dan membuat sesi. Token mentah tidak dikirim pada JSON browser.
- Cookie kpi_session ditandatangani Better Auth, HttpOnly dan SameSite=Lax; Secure pada HTTPS. Laravel tidak mengenkripsinya ulang. Sesi PHP menyimpan CSRF/flash, tidak menentukan identitas login.
- Guard request meminta get-session ke Better Auth, memeriksa sesi database, status akun, kelayakan role, penugasan, dan status area induk. Cookie cache auth dinonaktifkan. Role dari query, form atau localStorage tidak dipercaya.
- Sesi terikat ke role dan ID penugasan saat login. Pergantian kepala/role, penonaktifan atau pencabutan scope menghentikan akses. Batas tidak aktif 30 menit disimpan di database, sehingga menghapus cookie sesi PHP tidak memperpanjangnya. Masa berlaku sesi dikonfigurasi 8 jam dengan pembaruan berkala Better Auth selama sesi aktif.
- auth_accounts adalah satu sumber hash kredensial. Bcrypt kompatibel PHP dipakai melalui callback Better Auth. Setter password model User menulis akun credential pada transaksi Laravel; users tidak lagi mempunyai kolom password. Ubah kata sandi/email mencabut sesi akun, dan perubahan password memerlukan login ulang.
- Koneksi Laravel dan setiap koneksi pool Better Auth menetapkan sesi MySQL ke UTC secara eksplisit. Jadwal ditampilkan dalam WIB. Pengujian v3 juga memakai server MySQL dengan zona bawaan +07:00 untuk memeriksa perbedaan konfigurasi Laragon.
- Layanan auth tidak tersedia menghasilkan 503; tidak ada fallback login/session Laravel lama. CSRF, pembatasan percobaan login, policy, scope dan otorisasi mutasi tetap berlaku.

## Binding frontend

GET /{unit|division|hc}/data/workspace memuat data yang sudah dibatasi server berdasarkan role dan area: organisasi, roster, KPI, periode, kategori, snapshot penilaian, profil, tugas dan aktivitas. Tidak memuat hash, token auth atau foto privat akun lain. Tabel, pencarian, filter dan pagination berjalan pada kumpulan data resmi dalam scope tersebut. Dataset tidak dipotong diam-diam. Dataset besar belum diuji beban dan nantinya dapat memakai endpoint paginator per fitur.

Pada aplikasi normal tidak ada fixture bisnis atau simpan data bisnis ke localStorage. Isian nilai berada dalam memori sampai pengiriman lengkap. Setiap tindakan simpan memakai endpoint mutasi v2, CSRF dan UUID request, kemudian memuat ulang respons server. Error tidak diganti data contoh. /design-review tetap sandbox audit lokal yang terpisah dari aplikasi berakun.

| Fitur | Integrasi |
|---|---|
| Shell dan login | Role akun asli, nama/cakupan, pencarian, periode, menu, logout |
| Akun/jabatan/divisi/unit/staf | Tambah, ubah, aktif/nonaktif, hapus terjaga dependensi; staf tanpa akun |
| Kepala dan penempatan | Akun lebih dahulu, expected assignment/placement, alasan, konfirmasi dan scope baru |
| KPI Unit/Divisi | Indikator pada editor, bobot 100%, versi atomik, hapus versi belum dipakai, preview impor CSV/XLSX |
| Periode/kategori | Buat/ubah sebelum dipakai, buka setelah siap, tutup, hapus belum dipakai; WIB ke UTC |
| Penilaian | KU kirim/ajukan ulang/batalkan; KD kembalikan dengan alasan, ACC Final, ACC pilihan, nilai KU langsung Final |
| Riwayat/laporan/analitik | Snapshot resmi, total server, kategori Final, filter dan peringkat per jenis/versi, Excel dari data scope |
| Profil | Nama/email/telepon, foto privat, password dan preferensi nyata |
| Notifikasi/aktivitas | Tugas server, status baca persisten, audit perubahan |

Finalisasi tetap hanya Kepala Divisi. HC tidak dapat mengisi atau memutuskan angka. Tidak ada Draft. Final hanya baca, nilai integer 10-100. API backend memeriksa ulang semua syarat meskipun UI sudah memvalidasi.

## Data latihan

`php artisan db:seed` menyediakan 4 HC, 4 KD, 8 KU, 4 divisi, 8 unit, 96 staf, 12 KPI area dan contoh pengajuan/returned/Final. Enam staf per unit belum diisi. KPI baru berisi 7 indikator, sedangkan KPI lama yang dipakai tetap utuh. Rerun tidak mengubah sandi akun existing, menimpa hasil existing atau menggandakan master. Seeder hanya menerima environment dan database pengembangan yang diizinkan. [Daftar akun](../LOCAL_DEMO_SEEDER.md).

## Revisi UI v4 dan laporan per indikator

GET /{unit|division|hc}/data/insights menghitung rata-rata per indikator dari snapshot Final, status penilaian per unit, progres divisi, nilai per orang, temuan dan peringkat per kelompok KPI. Scope server diterapkan sebelum filter unit/divisi/jenis/template/pencarian. Hasil yang indikatornya berbeda tidak digabung menjadi satu peringkat. Tampilan mengikuti periode terpilih, termasuk label November.

Kode master divisi/unit/jabatan kini dibuat otomatis oleh layanan organisasi jika tidak dikirim. Kode record lama tetap dipertahankan; tidak ada kolom kode yang harus diisi pengguna. Perubahan ini memakai schema yang tersedia, tanpa reset atau pengubahan snapshot Final. [Revisi UI dan matriks kebutuhan](../../frontend/revision-v4/README.md).

## Pengujian

```powershell
python tools/testing/run_backend_tests.py
python tools/testing/validate_schema_v2.py
npm.cmd run test:ui
npm.cmd run verify:design
npm.cmd run build
php vendor/bin/pint --test app routes database/seeders tests/Feature tests/Support
```

Runner backend membuat MySQL sementara, menjalankan migration dan tes Laravel, lalu Better Auth asli, PHP HTTP dan tes browser dengan akun terisolasi. Pengujian tersebut tidak memakai database Laragon sebagai fixture. Transport auth pada tes Laravel transaksi dimock secara eksplisit; pembuktian cookie/login/CRUD browser dilakukan terpisah melalui layanan asli. Hasil: test-result.json, browser-report.json dan screenshots/ pada folder ini.

## Batas yang tetap berlaku

Pengiriman email/WhatsApp dan reset sandi lewat email belum dikonfigurasi. Tombol pengingat hanya mencatat audit dan menyatakan bahwa pesan belum dikirim. Pemulihan akun melalui Super HC pada menu Akun Kepala. Delegasi penilai, membuka ulang Final dan penilaian KD belum menjadi fitur yang disetujui. Tidak ada keputusan PRD yang menghalangi alur inti saat ini.

Referensi integrasi resmi: [MySQL](https://better-auth.com/docs/adapters/mysql), [opsi Better Auth](https://better-auth.com/docs/reference/options), [cookie](https://better-auth.com/docs/concepts/cookies).
