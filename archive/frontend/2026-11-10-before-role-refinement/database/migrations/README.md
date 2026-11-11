# Migrations KPI

000001-000004 adalah baseline backend lama yang dipertahankan. 000005 memasang snapshot SQL v2 pada instalasi kosong setelah memeriksa seluruh tabel data lama. Bila ada akun/staf/penilaian atau data lainnya, migration berhenti sebelum DDL dengan DOMAIN_V2_DATA_CONVERSION_REQUIRED.

Source snapshot: sql/2026_11_10_domain_v2.sql, setara database/schema/schema.mysql.sql. Target mempunyai 20 tabel domain, ditambah tabel migrations Laravel. Import SQL manual dan bootstrap migrations tidak boleh digunakan bersamaan pada database yang sama.

Down migration v2 tidak menghapus schema otomatis. Pemulihan memakai backup/database salinan. [Rencana adopsi](../../docs/database/MIGRATION-V2.md), [validasi](../../docs/database/VALIDATION.md).
