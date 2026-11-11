# Keputusan backend domain v2 / integrasi v3

Tambahan v1.4: KU dapat membaca definisi KPI unit dalam divisi yang sama melalui katalog kpiUnits. Daftar units/staff/assessments tetap hanya unit sendiri. Pilar KPI menerima teks bebas 1–64 karakter; API, impor dan CHECK database memakai batas yang sama. Tidak mengubah kewenangan nilai atau Final. [Matriks revisi](../requirements/REVISI-PER-ROLE-v1.4.md).

Berlaku 10 November 2026, berdasarkan alur v1.3 dan persetujuan layout-1.0. Kontrak aktif ada pada [backend v2](v2/README.md); source backend lama disimpan di archive/backend/2026-11-10-before-domain-v2.

| Area | Keputusan |
|---|---|
| Akun | HC/KD/KU saja; role saat ini pada users, eligibility historis tetap dipertahankan |
| Kepala Unit | Akun + scope assignment, tidak membutuhkan staf/employee dummy |
| Staf | Data employees tanpa akun; placement per bulan |
| KPI | Scope Unit untuk staf, Divisi untuk Kepala Unit; versi terbit atomik, tanpa endpoint draft |
| Penilaian | Kirim semua angka sekaligus; Belum adalah absence of row; tidak ada skor NULL/draft |
| Keputusan | KD saja; staf submitted -> Final/return, Kepala Unit langsung Final oleh KD |
| Pembatalan | KU submitted -> hapus header/item, audit dan UUID receipt tetap |
| Histori | Akses menurut scope snapshot di area akun saat ini, selaras UI; transfer tidak memindahkan histori |
| Struktur | Akun dahulu; area+head/staf+placement atomik; non-Final terdampak menghalangi perubahan |
| Status area | Nonaktif mencabut scope kepala; reaktivasi memeriksa akun kembali; riwayat tetap ada |
| Hapus | Master belum dirujuk boleh dihapus; data berhistori memakai Nonaktif |
| Jadwal | UTC disimpan, WIB ditampilkan; bulan penilaian terpisah dari bulan pemrosesan |
| Konfigurasi historis | Versi baru tidak menabrak penilaian terpakai; tidak mengubah hasil historis |
| Profil/notifikasi | Profil/password/foto privat nyata, tugas dan status baca; pesan eksternal belum dikirim |
| Adopsi | Database lama dipertahankan; migration fresh-only menolak data existing sebelum DDL |

Unlock Final, penilai Kepala Divisi, delegasi, akses staf pribadi dan kebijakan retensi/pruning UUID belum ditambahkan. Ini tidak memulihkan kewenangan finalisasi HC.

Batas terbaru v3: binding frontend ke API sudah diterapkan, dengan Better Auth dan middleware konteks terbaru. Database pengembangan v3 terpisah sudah diaktifkan tanpa mengubah legacy. Konversi data legacy, UAT manual pengguna dan pengujian beban besar tetap terpisah. [Panduan aktif](v3/README.md).
