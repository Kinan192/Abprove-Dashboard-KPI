# Validasi schema

Target rancangan: MySQL 8.4 LTS. Mesin MySQL 8.4 belum tersedia; Docker CLI ada tetapi daemon tidak berjalan. Pengujian nyata memakai binary MySQL Community 9.6.0 lokal pada instance sementara baru, bukan server atau database pengguna.

Hasil: **32/32 pemeriksaan lulus**. Instance uji sudah dihentikan. Rincian mesin, kasus dan status ada di [validation-result.json](validation-result.json). Folder data/log uji sementara hanya berisi fixture sintetis; lokasinya tercatat di laporan dan tidak menjadi runtime project.

Yang diuji: pembuatan 16 tabel, tiga role, fixture dua divisi, formula generated total 82.750000, batas skor, identifier, jadwal, keunikan kepala/placement/assessment, FK konteks placement dan versi template, metadata Final/kategori, pembatasan delete historis, ketahanan snapshot, idempotency key unik, rollback audit, serta query scoped contoh.

Yang belum diuji/diimplementasikan: Laravel auth/policies/controller, otorisasi HTTP, penolakan pecahan sebelum konversi SQL, publish SUM bobot 100%, overlap kategori/template, lifecycle transaksi aplikasi, immutable Final, privilege runtime audit, konkurensi aplikasi dan migrasi Laravel. Query scoped contoh tidak membuktikan API aman karena API belum ada.

## Mengulang pada target

Python standard library dan binary server/client MySQL diperlukan. Runner selalu membuat datadir baru dan instance loopback dengan port sementara, memeriksa versi, mengimpor schema/fixture di database baru lalu menghentikan instance. Runner tidak menerima koneksi ke database yang sudah berjalan.

```powershell
python tools/database/validate_schema.py --mysql-bin 'C:\path\mysql-8.4\bin'
```

Default runner menolak versi selain 8.4. Hanya untuk mencocokkan pengujian lokal di atas, argumen `--expected-version-prefix 9.6` dipakai. Jangan menyamakan kelulusan 9.6 dengan sertifikasi 8.4. Sebelum konversi migrations/rollout, jalankan ulang 8.4 dan review semantik generated, CHECK, foreign keys serta SQL mode.

`TINYINT` menyimpan integer, tetapi MySQL dapat mengonversi input pecahan; validasi integer wajib di FormRequest/service. Metadata Final yang valid belum membuat row immutable. Penegakan Final/audit/role di aplikasi masih bagian implementasi mendatang.
