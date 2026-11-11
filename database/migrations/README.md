# Migrations KPI

000001-000004 adalah baseline backend lama yang dipertahankan. 000005 memasang snapshot SQL v2 pada instalasi kosong setelah memeriksa seluruh tabel data lama. Bila ada akun/staf/penilaian atau data lainnya, migration berhenti sebelum DDL dengan DOMAIN_V2_DATA_CONVERSION_REQUIRED.

Source snapshot awal: sql/2026_11_10_domain_v2.sql. SQL fisik terkini pada database/schema/schema.mysql.sql mencakup upgrade Better Auth dan pilar fleksibel. Target awal mempunyai 20 tabel domain, ditambah tabel migrations Laravel. Import SQL manual dan bootstrap migrations tidak boleh digunakan bersamaan pada database yang sama.

000006–000007 memasang Better Auth dan batas idle sesi. 000008 memperbolehkan pilar KPI khusus melalui penggantian CHECK, tetap wajib 1–64 karakter. Migration ini tidak mengubah baris indikator, template atau penilaian. Down menolak bila pilar khusus sudah digunakan agar data tidak dihapus/diganti. Pengembangan lokal menggunakan backup privat sebelum migration tersebut, bukan migrate:fresh.

Down migration v2 tidak menghapus schema otomatis. Pemulihan memakai backup/database salinan. [Rencana adopsi](../../docs/database/MIGRATION-V2.md), [validasi](../../docs/database/VALIDATION.md).
