# Seeder lokal dan akun latihan

Jalankan dari root project setelah migrations tersedia:

```powershell
php artisan db:seed
```

DatabaseSeeder memanggil LocalDemoSeeder. Perintah hanya menerima APP_ENV=local dengan database `kpi_kinerja_dev` atau `kpi_kinerja_demo`. Pengujian otomatis mempunyai pengecualian khusus pada server/database terisolasi. Seeder tidak tersedia untuk produksi.

## Akun

| Login email | NIP alternatif | Role dan cakupan |
|---|---|---|
| hc.demo@kpi.test | DEMO-HC | Super HC, seluruh struktur |
| kd.umum@kpi.test | DEMO-KD-UMUM | Kepala Divisi Umum & SDM Contoh; Unit IT dan SDM |
| kd.medis@kpi.test | DEMO-KD-MEDIS | Kepala Divisi Pelayanan Medis Contoh; Unit UGD |
| ku.it@kpi.test | DEMO-KU-IT | Kepala Unit IT Contoh |
| ku.sdm@kpi.test | DEMO-KU-SDM | Kepala Unit SDM Contoh |
| ku.ugd@kpi.test | DEMO-KU-UGD | Kepala Unit UGD Contoh |

Kata sandi awal yang sama untuk keenam akun **dibuat acak saat seeding pertama**. Baca `password` pada `storage/app/private/local-demo-accounts.json`. File ini berada di luar public dan diabaikan Git. Jangan menyertakannya dalam commit atau distribusi source.

Jika ingin menetapkan kata sandi sendiri sebelum seeding pertama, sediakan environment variable `KPI_DEMO_PASSWORD` dengan minimal 12 karakter berisi huruf dan angka. Seeder tidak mengganti password akun yang telah ada. Jika password akun contoh diubah lewat UI, gunakan password terakhir tersebut; `password_matches:false` pada file lokal menandai bahwa password awal tidak lagi cocok.

## Data yang dibuat

- Dua divisi, tiga unit, dua jabatan, tiga karyawan Kepala Unit dan enam anggota biasa.
- Kepala unit terhubung ke akun dan ditempatkan di unitnya; penugasan kepala area dibuat lewat domain service.
- Dua template published tahun berjalan, masing-masing enam KPI dengan bobot tepat 100%.
- Jika bulan berjalan belum mempunyai periode, dibuat periode latihan terbuka: pengisian sampai tujuh hari, keputusan KD sepuluh hari, dan tutup empat belas hari sejak seeding pertama.
- Periode latihan baru memakai satu kategori **Contoh latihan** yang mencakup seluruh nilai. Ini tidak menetapkan batas kategori kinerja rumah sakit. Bila periode bulan berjalan sudah ada, jadwal dan kategorinya dipertahankan.
- Belum ada penilaian terisi, sehingga alur dapat dicoba mulai dari awal.

## Mencoba alur

1. Login `ku.it@kpi.test`, buka Isi Nilai, pilih Anggota IT Contoh, isi semua KPI, simpan lalu ajukan.
2. Logout dan login `kd.umum@kpi.test`; buka Persetujuan untuk mengembalikan dengan alasan atau ACC langsung Final. Pada Nilai Kepala Unit, KD juga mengisi nilai Kepala Unit IT dan SDM.
3. Login `hc.demo@kpi.test` untuk melihat rekap, struktur dan konfigurasi. HC tidak mempunyai keputusan Final.
4. Login `kd.medis@kpi.test` atau `ku.ugd@kpi.test` untuk mencoba cakupan divisi lain. Anggota IT/SDM tidak masuk ke cakupan tersebut.

Menjalankan seeder ulang tidak menggandakan baris, tidak mereset password, tidak memperpanjang periode, tidak memindahkan anggota dan tidak memulihkan penugasan yang sudah dicabut. Akun Super HC pengguna yang sudah ada dipertahankan. Untuk perubahan setelah latihan, gunakan pengelolaan HC biasa; hindari migrate:fresh karena menghapus database.
