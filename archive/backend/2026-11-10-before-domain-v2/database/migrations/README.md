# Migrations aktif

1. `2026_11_08_000001_create_kpi_domain`: baseline 16 tabel dan seed role, bersumber snapshot SQL di subfolder sql. Jangan mengubah snapshot setelah migration dipakai.
2. `2026_11_08_000002_create_operation_requests`: transaksi replay UUID, tabel ke-17.
3. `2026_11_08_000003_add_unit_head_assessments`: jenis assessment dan FK assignment Kepala Unit, sesuai keputusan final pada KD.
4. `2026_11_08_000004_protect_final_rows`: trigger perlindungan Final header/items.

Gunakan `php artisan migrate` pada database kosong. Jangan memakai database yang sudah di-import SQL fondasi; baseline menolaknya. Jangan menjalankan migrate:fresh pada database pengguna. Pengujian memakai database/server baru melalui tools/testing/run_backend_tests.py.

Session/cache memakai file dan queue sync, sehingga tidak membutuhkan tabel framework tambahan. Tidak ada user, password atau kategori default. Akun HC pertama dibuat interaktif menggunakan `php artisan kpi:create-admin`.
