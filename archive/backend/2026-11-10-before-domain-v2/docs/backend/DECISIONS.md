# Keputusan dan batas implementasi

Tanggal: 8 November 2026. Kebutuhan aktif: PRD v1.2 dan koreksi pengguna tentang kewenangan Kepala Divisi.

| Area | Perilaku backend |
|---|---|
| Keputusan nilai | Hanya Kepala Divisi. ACC anggota langsung Final; penilaian Kepala Unit diisi/ditetapkan langsung oleh KD |
| Super HC | Konfigurasi, organisasi, akun, monitoring, rekap; tidak memiliki route finalisasi/return/score/unlock |
| Jenis assessment | member atau unit_head, ditentukan oleh konteks server; satu lembar employee+cycle |
| O-2 kategori | Diisi HC eksplisit; validasi partisi. Batas 70/80/90 tidak di-seed otomatis |
| O-3 | KD menilai KU sudah diputuskan; penilai KD dan akses karyawan masih belum tersedia |
| O-4 | Session email/NIP/password; akun dibuat HC atau bootstrap CLI. Tidak ada SSO/registrasi publik |
| O-5 | Tepat satu assignment aktif per akun untuk konteks UI saat ini. Konteks ganda ditolak 409, bukan role switch |
| O-6 | Perubahan langsung saat disimpan. Transfer, pergantian/revocation kepala, perubahan jabatan berdampak non-Final diblokir; tidak ada perpindahan otomatis assessment |
| O-7 | Kepala hanya melihat assessment sejak masa assignment-nya dan placement yang belum berakhir. HC histori global; kebijakan akses historis tambahan belum ditetapkan |
| O-8 | Unlock tidak memiliki endpoint. Tidak ada hak keputusan HC yang dipulihkan secara tersirat |
| O-9 | KU sampai submission_due_at, KD sampai approval_due_at; cycle harus open dalam jendela waktu. Jadwal terpakai tidak diperpanjang via endpoint biasa |
| O-10 | Alasan KD return wajib. Panel notifikasi merangkum tugas server sesuai role; belum ada status baca, email/WhatsApp atau pengingat terjadwal |
| O-11 | Bobot persen 4 desimal, hasil 6 desimal. Snapshot dan kategori memakai nilai raw. Published immutable, masa berlaku tunggal; perubahan aturan butuh review |
| Akun kepala | Role eligibility terpisah dari assignment. KU wajib employee aktif, linked ke user, placement sesuai unit sebelum assignment |
| Legacy approved | Masih diterima CHECK baseline; workflow baru tidak menghasilkan approved dan tidak menawarkan konversi otomatis data lama |

`operation_requests` menyimpan response retry dalam transaksi bersama perubahan dan audit, terikat aktor/konteks/hash payload. Retensi/pruning UUID belum ditetapkan; jangan menghapusnya tanpa kebijakan retry yang disepakati. Tidak ada password/hash/token pada response retry atau audit.

Runtime lokal menggunakan root Laragon untuk pengembangan. Untuk deployment, buat akun migrator dan runtime terpisah, batasi akses audit menjadi SELECT/INSERT serta operation_requests SELECT/INSERT, gunakan HTTPS/cookie Secure, APP_DEBUG=false, backup, serta verifikasi restore. Ini belum konfigurasi deployment produksi.

Pengujian yang tersedia adalah fungsional, integritas, konflik versi/replay dan transaksi. Pengujian kompetisi paralel/beban 500 karyawan, proses backup/restore dan UAT belum dijalankan; tidak ada klaim kesiapan produksi.

Frontend menambahkan read API terotorisasi untuk lookup, analitik Final dan pembanding bulan sebelumnya. Impor CSV/XLSX hanya preview sebelum simpan draft/publish. Login/shell, seluruh menu role dan formulir operasional sudah diimplementasikan; kebijakan OPEN di atas tidak diganti oleh state UI.
