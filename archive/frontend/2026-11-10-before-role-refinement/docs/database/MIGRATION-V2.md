# Adopsi schema v2

## Status

Schema target baru sudah tersedia. Database aplikasi lama tidak dikosongkan, diimpor ulang, atau dikonversi selama perancangan. Source layout yang disetujui tersimpan pada archive/frontend/2026-11-10-approved-layout. Source backend lama tersimpan pada archive/backend/2026-11-10-before-domain-v2.

## Database kosong

Backend v2 perlu migration yang memasang schema target pada database baru/kosong. Baseline migration 000001-000004 adalah jejak lama dan tidak diubah. Bila migration jembatan mendeteksi data domain existing, hentikan sebelum DDL. MySQL melakukan implicit commit pada DDL, sehingga rollback transaksi bukan jaminan pemulihan schema.

Untuk pengujian, gunakan MySQL terisolasi melalui tools/testing/validate_schema_v2.py. Tidak ada nama database Laragon existing pada SQL target; file tidak menjalankan DROP DATABASE/CREATE DATABASE.

## Database lama berisi data

Konversi data merupakan pekerjaan terpisah dari pemasangan schema kosong:

1. Ambil backup dan buktikan restore pada database salinan.
2. Inventaris semua users, role, assignment, staf, placement, template, siklus, assessment, audit dan UUID receipt. Simpan ID mapping.
3. Kepala Unit lama yang tersimpan sebagai employee ber-user dipetakan menjadi subject_user_id + head_assignment_id. Staf biasa tetap employees tanpa user_id. Konflik identitas atau akun/role ambigu dilaporkan, bukan ditebak.
4. Template berdasarkan jabatan tidak dapat langsung dianggap KPI Unit/Divisi. Petakan setiap versi ke area yang benar berdasarkan keputusan HC dan snapshot penilaian. Pertahankan indikator/bobot historis.
5. Final hanya dipindahkan dengan seluruh metadata/snapshot yang valid; hasil sebelum/sesudah harus sama. Status approved legacy tidak dipromosikan ke Final otomatis.
6. Draft/null score tidak dapat masuk schema baru. Inventaris dan ekspor untuk review; jangan mengubahnya menjadi submitted/Final atau membuang data diam-diam.
7. Waktu placement lama berbasis timestamp perlu dipetakan ke bulan efektif secara eksplisit. Audit kejadian asal tetap dipertahankan.
8. Validasi jumlah baris per jenis/status, semua total/kategori Final, cakupan, FK, UUID retry dan laporan sebelum cutover.
9. Pindahkan koneksi hanya setelah hasil konversi valid. Simpan database lama untuk pemulihan; jangan memakai migrate:fresh pada data pengguna.

Tidak ada rollback otomatis dari model akun-only head ke model kepala sebagai employee. Pemulihan menggunakan database salinan/backup, bukan penghapusan tabel pada database aktif.

## Memasang untuk lingkungan baru di Laragon

Source backend v2 siap, sedangkan database kpi_kinerja_dev yang lama masih berisi akun dan data. Untuk mencoba v2 tanpa mengubah database itu:

1. Buat database kosong kpi_kinerja_v2_dev melalui phpMyAdmin.
2. Simpan konfigurasi koneksi lama, lalu arahkan DB_DATABASE pada .env ke database baru. Kredensial MySQL tidak perlu ditulis ke source.
3. Jalankan perintah berikut pada root project:

```powershell
php artisan config:clear
php artisan migrate
php artisan db:seed
npm.cmd run build
php artisan serve
```

Seeder lokal membuat enam akun contoh dan struktur/KPI sesuai v2, tanpa mereset akun existing. Kredensial acak disimpan secara lokal pada storage/app/private/local-demo-accounts.json. Database baru merupakan lingkungan terpisah; data dari database lama tidak otomatis disalin. Gunakan kpi:create-admin bila menginginkan HC awal tanpa data contoh.

Pilih migration Laravel untuk aplikasi. File schema.mysql.sql adalah definisi fisik untuk review/validasi database kosong; jangan mengimpor SQL itu lalu menjalankan baseline migrations pada database yang sama.

Jangan mengubah koneksi ke database baru sebelum siap menggunakan lingkungan tersebut. Perancangan dan pengujian oleh agen tidak mengganti .env, tidak membuat database v2 pada server Laragon, dan tidak menjalankan migration 000005 terhadap data pengguna.
