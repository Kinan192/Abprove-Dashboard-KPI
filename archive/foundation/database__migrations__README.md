# Rencana migrations

Belum ada migration PHP executable. Urutan ekuivalen DDL:

1. `users`.
2. `roles`.
3. `user_roles`.
4. `divisions`.
5. `units`.
6. `positions`.
7. `employees`.
8. `scope_assignments`.
9. `employee_placements`.
10. `kpi_templates`.
11. `kpi_items`.
12. `assessment_cycles`.
13. `cycle_categories`.
14. `assessments`.
15. `assessment_items`.
16. `audit_events`.

Seed tiga role setelah tabel roles dibuat. DDL kanonis saat ini ../schema/schema.mysql.sql. Saat migrasi Laravel diterapkan, buktikan schema ekuivalen (FK/CHECK/index/generated), jangan membuat tabel dua kali. DDL MySQL tidak dapat dianggap rollback penuh lintas semua CREATE TABLE; uji bootstrap pada database kosong terisolasi dan hapus database uji bila gagal. Down migration berurutan terbalik hanya untuk lingkungan pengembangan yang disetujui.
