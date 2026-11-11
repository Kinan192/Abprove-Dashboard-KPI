# Validasi schema dan backend v2

- [SQL langsung](schema-v2-validation.json): 65 pemeriksaan MySQL 8.4.3 terisolasi, 20 tabel dan 11 trigger.
- [Backend](../backend/v2/test-result.json): 67 tes Laravel, 595 assertion, serta HTTP nyata untuk CSRF/login/session/logout.
- Source layout dibandingkan dengan seluruh 55 hash baseline yang disetujui.
- Database aplikasi lama tidak diimpor ulang, dikosongkan atau dikonversi.

Pengujian SQL meliputi FK scope composite, XOR subjek, akun kepala tanpa employee, skor wajib 10-100, segel KPI 100%, keutuhan Final, penguncian header/item/snapshot, pembatalan tanpa draft, audit append-only dan penghapusan master terpakai.

Pengujian backend meliputi pengiriman atomik, penolakan partial/foreign/duplicate item, batas role/unit/divisi, hak KD/KU/HC, return dan resubmit lengkap, Final, konflik versi, UUID/replay setelah delete, bulk rollback, template/version/counter, siklus, CRUD, transfer/pergantian kepala, profil/password/foto privat, notifikasi, Final-only analytics, perbandingan, ekspor dan penolakan migrasi pada database berisi data.

```powershell
python tools/testing/validate_schema_v2.py
python tools/testing/run_backend_tests.py
```

Kedua runner membuat datadir/port/server MySQL sementara dan menghentikannya setelah selesai. Backend tetap PHP/Laravel. MySQL Laragon pada 3306 tidak menjadi target fixture pengujian.

Keputusan akses, total lintas baris, overlap tanggal, kategori dan otorisasi masih memerlukan layanan transaksional; CHECK bukan pengganti validasi tersebut. Pengujian ini belum mencakup beban 500 staf, kompetisi paralel atau cutover data lama.
