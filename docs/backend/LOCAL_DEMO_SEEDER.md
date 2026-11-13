# Akun latihan lokal v3

Seeder adalah DatabaseSeeder -> LocalDemoSeeder. Jalankan setelah semua migration selesai pada database dev/demo. Database aktif kpi_kinerja_v3_dev. [Panduan saat ini](v3/README.md).

```powershell
php artisan db:seed
```

| Email | Role |
|---|---|
| hc.demo@kpi.test | Super HC |
| hc.operasional@kpi.test | Super HC |
| hc.administrasi@kpi.test | Super HC |
| hc.monitoring@kpi.test | Super HC |
| kd.umum@kpi.test | Kepala Divisi Umum & SDM |
| kd.medis@kpi.test | Kepala Divisi Medis |
| kd.keperawatan@kpi.test | Kepala Divisi Keperawatan |
| kd.keuangan@kpi.test | Kepala Divisi Keuangan |
| ku.it@kpi.test | Kepala Unit IT |
| ku.sdm@kpi.test | Kepala Unit SDM |
| ku.ugd@kpi.test | Kepala Unit UGD |
| ku.logistik@kpi.test | Kepala Unit Logistik |
| ku.rawatinap@kpi.test | Kepala Unit Rawat Inap |
| ku.rawatjalan@kpi.test | Kepala Unit Rawat Jalan |
| ku.icu@kpi.test | Kepala Unit ICU |
| ku.tatausaha@kpi.test | Kepala Unit Tata Usaha |

Password acak lokal tersimpan pada storage/app/private/local-demo-accounts.json. Seeder tidak mengganti password akun yang sudah ada. Tidak ada password tetap pada source. Akun contoh ini berbeda dari fixture pada /design-review.

Jumlah pada database baru: 4 HC, 4 KD, 8 KU, 4 divisi, 8 unit, 84 staf dan 12 KPI area. Total data demo adalah 100 orang (16 akun + 84 staf). Empat unit pertama berisi 11 staf dan empat unit lainnya 10 staf tanpa akun. Umum & SDM menaungi IT, SDM dan Logistik; Medis menaungi UGD dan Rawat Inap; Keperawatan menaungi Rawat Jalan dan ICU; Keuangan menaungi Tata Usaha.

Seeder membuat akun dahulu, jabatan, struktur beserta kepala, staf tanpa akun, KPI Unit/Divisi, periode berjalan dan empat kategori. Staf pertama per unit Diajukan, kedua Dikembalikan, ketiga sampai keenam Final, sisanya Belum diisi. Satu KU sudah Final dan tujuh belum diisi pada instalasi baru. Total 49 penilaian: 33 Final, 8 Diajukan, 8 Dikembalikan. Temuan positif dan perbaikan disertakan untuk pengujian riwayat. Tidak ada Draft atau employee untuk akun kepala.

KPI baru berisi 7 indikator dengan bobot 20/15/15/15/15/10/10 (100%). Template yang sudah ada, terutama yang dipakai penilaian, tetap dipertahankan beserta jumlah indikatornya. Batas 5 baris merupakan kapasitas per halaman, bukan kewajiban menambah indikator pada KPI lama. Satu unit tetap mempunyai satu Kepala Unit aktif; banyak akun KU tersedia melalui delapan unit berbeda.

Rerun tidak menggandakan master, mengubah sandi existing atau menimpa keputusan existing. Data contoh yang dibatalkan lalu di-seed ulang dapat dibuat kembali untuk memulihkan skenario latihan. Environment production dan schema lama ditolak sebelum insert. Untuk seed pertama boleh menentukan KPI_DEMO_PASSWORD (minimal 12 karakter, huruf dan angka); jangan menyimpannya pada source publik.

Untuk HC pertama tanpa data latihan, gunakan php artisan kpi:create-admin. Aplikasi normal kini memakai data nyata, termasuk seluruh halaman dan mutasinya. Login membutuhkan Better Auth: npm.cmd run start, atau npm.cmd run auth:start bersama php artisan serve.
