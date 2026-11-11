# Handoff frontend ke backend v2

Layout-1.0 tetap menjadi [baseline visual](../frontend/approved-layout/README.md). Integrasi v3 sudah mengganti fixture/localStorage aplikasi berakun dengan API nyata. [Implementasi dan batas saat ini](v3/README.md). Kontrak mutasi domain di bawah tetap berlaku.

1. Pastikan schema v2 aktif. API bisnis pada schema lama menolak dengan 503, tanpa mengubah data.
2. Gunakan cookie sesi Better Auth dan CSRF Laravel. Role dan scope berasal dari server; tidak ada role switch.
3. Endpoint list tetap menyediakan pagination server. UI saat ini memakai workspace lengkap yang sudah dibatasi scope server untuk filter/search/pagination dan analitik; tidak memotong dataset hanya pada halaman pertama. Dataset besar belum diuji beban.
4. Form penilaian GET tidak membuat data. POST lengkap memakai source_kpi_item_id, score dan UUID; resubmit juga lengkap dan memakai lock_version.
5. Label frontend Diajukan/Dikembalikan/Final memetakan submitted/returned/final. Belum berarti tidak ada baris.
6. HC menerapkan template dalam satu POST dengan scope_level + unit_id/division_id. Jabatan tidak memilih KPI.
7. Head assessment menggunakan subject_user_id, staff menggunakan employee_id. Jangan membuat employee untuk akun kepala.
8. Konfirmasi hapus/transfer/ganti kepala mengambil expected ID dari detail/preview. 409 memerlukan refresh, bukan menaikkan versi sendiri.
9. Pembatalan memberikan receipt deleted/not_started, bukan assessment draft. Replay bisa mengembalikan kondisi operasi pertama; refresh data terbaru.
10. Loading/empty/error/validasi/feedback mengikuti response backend. Profil/foto/preferensi dan notifikasi mempunyai endpoint sendiri.

Mode audit desain tetap menggunakan state lokal hingga binding ini dilaksanakan. Import CSV/XLSX server adalah preview; pengingat hanya dicatat, bukan dikirim. Rekap server TSV kompatibel Excel tersedia; formatter XLSX frontend dapat memakai data server sesuai cakupan bila format workbook dibutuhkan.
