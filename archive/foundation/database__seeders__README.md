# Seeder mendatang

DDL saat ini menyertakan seed roles super_hc, kepala_divisi, kepala_unit. Belum ada password/admin default, akun produksi, atau data karyawan nyata. Seeder Laravel kelak harus idempotent dan menyediakan fixture dua divisi. Fixture pengujian SQL terpisah di tests/Database, bukan seeder produksi.
