# Pemeriksaan database

Paket test dan laporan pengujian historis telah dihapus dari source proyek. Untuk memeriksa status instalasi pada koneksi yang dikonfigurasi:

```powershell
php artisan migrate:status
```

Perintah tersebut hanya membaca status migrasi. Untuk memeriksa pemasangan baru, gunakan database kosong atau salinan yang terpisah; jangan menjalankan `migrate:fresh` pada data pengguna.

Jaga FK scope, XOR subjek, bobot KPI 100%, skor wajib, snapshot Final, audit append-only, dan UUID receipt sesuai [skema](SCHEMA.md) serta [kontrak transaksi](TRANSACTIONS-V2.md). Kebijakan otorisasi dan total lintas baris tetap ditangani service transaksional; CHECK bukan penggantinya.
