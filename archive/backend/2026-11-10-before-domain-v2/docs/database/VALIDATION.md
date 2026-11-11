# Validasi database dan backend

Schema aktif diuji melalui migrations Laravel pada server MySQL **8.4.3** dengan datadir/port sementara. Pengujian tidak memakai atau menghapus database Laragon existing. Hasil terkini: [test-result.json](../backend/test-result.json).

Runner: `python tools/testing/run_backend_tests.py`. Memerlukan PHP dengan pdo_mysql/bcmath serta MySQL bin lokal; parameter --mysql-bin dapat mengganti lokasi executable. PHPUnit hanya diizinkan oleh fixture saat marker instance terisolasi tersedia. Tiap test mengembalikan data melalui rollback; server uji dihentikan pada finally.

Mencakup HTTP session/role/scope, lifecycle anggota dan Kepala Unit, angka raw/category, invalid integer, Final guard, stale version/replay, bulk rollback, transfer/head impact, template/publish/category. Smoke test HTTP sungguhan memeriksa CSRF dan cookie sesi dengan APP_ENV local.

Laporan validasi SQL fondasi 16 tabel terdahulu ada di archive/foundation. Runner `tools/database/validate_schema.py` tetap untuk baseline historis; hasilnya tidak mewakili backend aktif. Uji beban/paralel, backup/restore, akun SQL runtime terbatas dan UAT belum dilakukan.
