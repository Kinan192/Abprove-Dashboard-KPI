# Validasi implementasi v2

**PASS**, 10 November 2026 WIB. Urutan kerja: baseline layout disetujui -> schema baru + validasi MySQL -> implementasi backend -> pengujian dan handoff.

| Pemeriksaan | Hasil dan bukti |
|---|---|
| Layout ditetapkan | PASS: 55 source cocok persis dengan [baseline disetujui](../../frontend/approved-layout/manifest.json); snapshot tersimpan |
| Schema sebelum backend | PASS: [65 pemeriksaan SQL](../../database/schema-v2-validation.json), 20 tabel, 11 trigger, server MySQL 8.4.3 terisolasi |
| Snapshot migration | PASS: SQL kanonik identik dengan snapshot migration 000005; migration lama tetap dipertahankan |
| Akun dan struktur | PASS: akun dahulu, kepala berbasis akun, staf tanpa user_id, area/assignment dan staf/placement atomik |
| KPI Unit/Divisi | PASS: scoped template, bobot 100%, segel transaksi, versi monotonic dan perlindungan rentang terpakai |
| Tanpa draft | PASS: GET tidak membuat data; POST lengkap; skor null/desimal/kurang/foreign/duplicate ditolak tanpa baris parsial |
| Otorisasi | PASS: KU staf unitnya, KD dua jenis dalam divisinya; lintas scope 404 dan role salah 403; HC tidak memberi keputusan |
| Keputusan | PASS: return beralasan, resubmit lengkap, ACC staf langsung Final, Kepala Unit langsung Final oleh KD |
| Pembatalan/retry | PASS: header/item dihapus; audit bertahan; UUID replay masih valid setelah record dihapus; payload/aktor lain ditolak |
| Transaksi/version | PASS: lock_version stale 409, bulk seluruhnya rollback bila satu record gagal |
| Final/histori | PASS: API dan trigger melarang perubahan/penghapusan Final; snapshot dan scope lama tetap benar setelah pergantian kepala |
| CRUD | PASS: tambah/ubah/hapus sesuai dependensi; self-lockout dicegah; transfer dan perubahan kepala memeriksa pekerjaan terdampak |
| Laporan | PASS: Final-only, kelompok versi terpisah, scope sebelum filter/count/export, perbandingan definisi, formula TSV dinetralisasi |
| Profil/tugas | PASS: profil/password/foto privat serta read-state notifikasi diuji; pengingat tidak mengirim pesan eksternal |
| Session/CSRF | PASS: pengujian HTTP nyata login, CSRF, /me, logout dan pencabutan sesi |
| Laravel | PASS: [67 tes / 595 assertion](test-result.json), Pint, route cache dan view cache |
| Build/UI | PASS: Vite build; [verifikasi browser](../../frontend/approved-layout/qa/verification.json) tidak mencatat perubahan layout, error JS, Alpine atau masalah kontras pada 1417 pasangan |
| Data lama | PASS: migration menolak data existing sebelum DDL. [Readiness read-only](../../database/live-readiness.json) menunjukkan database lama tetap legacy; tidak ada write pada database aplikasi |

Laporan lengkap dan source sebelum revisi disimpan di archive/backend/2026-11-10-before-domain-v2. Test lama yang bergantung pada draft/template jabatan diarsipkan; test auth, import, seeder dan render role tetap berjalan bersama kontrak baru.

## Status penggunaan

Source backend dan schema siap untuk lingkungan baru/kosong serta pengujian. Database kpi_kinerja_dev masih mempunyai data lama dan belum dikonversi. API bisnis memberikan SCHEMA_UPGRADE_REQUIRED pada schema tersebut. Login dan halaman layout tetap tersedia.

Frontend bisnis masih memakai state lokal. Konversi data lama, aktivasi database v2, binding API ke Blade, UAT dan pengujian beban/kompetisi paralel menjadi pekerjaan berikutnya. [Langkah pemasangan dan konversi](../../database/MIGRATION-V2.md) disediakan tanpa menjalankan reset atau perubahan koneksi secara otomatis.

Pembersihan folder datadir MySQL sementara ditolak pemeriksaan otomatis dengan alasan blocked by policy. Folder diagnostik tetap ada; instance MySQL terisolasi sudah dihentikan. Ini tidak memengaruhi implementasi atau database Laragon.
