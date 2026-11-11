> Pembaruan v1.3: frontend terbaru menghapus Draft penilaian, memakai KPI scoped Unit/Divisi, serta akun kepala yang dibuat sebelum struktur. Backend bisnis pada dokumen ini belum diubah. Sebelum integrasi diperlukan kirim lengkap atomik, pembatalan tanpa Draft, scope KPI baru dan penetapan akun-kepala-karyawan yang konsisten. Lihat `docs/requirements/ALUR-KPI-v1.3.md`.

# Penyesuaian kewenangan frontend

Prototype FigCraft di folder design dibuat sebelum koreksi keputusan akhir. Sumber visual diperiksa langsung melalui MCP; file native dipertahankan. Frontend Blade/Alpine sudah menerapkan penyesuaian berikut berdasarkan PRD v1.2 dan klarifikasi pengguna terbaru.

- HC: ubah Rekap & Finalisasi menjadi Rekap. Hapus Finalkan, Return dan antrean keputusan HC; tampilkan KD sebagai pemutus pada detail/timeline.
- KD: ACC penilaian anggota langsung menghasilkan Final. Angka anggota tetap hanya baca; pengembalian wajib alasan.
- KD: tambah menu Nilai Kepala Unit. Daftar berisi kepala aktif dalam divisi; editor KPI memakai bobot/snapshot server. Simpan Draft dan Tetapkan Nilai Final adalah dua aksi terpisah.
- KU: hanya anggota yang dinilai; tidak memasukkan Kepala Unit sendiri pada daftar pengisian. Status pengajuan Menunggu/Dikembalikan/Final; tidak ada tahap menunggu HC.
- Pertahankan sidebar/navbar, container dashboard, palet 60:30:10 dan viewport konsisten. Jangan menambahkan role switch demo.
- Gunakan /me untuk role/home dan semua API daftar terotorisasi. Simpan cookie/CSRF; UUID retry dan lock_version harus ditangani sesuai panduan backend.
- Konflik, sesi habis, data kosong, draft belum lengkap, nilai Final readonly, serta guard transfer/histori harus terlihat dan dapat ditindaklanjuti.

Implementasi, halaman, screenshot dan hasil pengujian tersedia di [docs/frontend](../frontend/README.md). Komponen/tampilan mengikuti desain, sementara izin, status, angka, dan keputusan mengikuti server. Impor CSV/XLSX, analitik Final, salin bulan sebelumnya yang kompatibel dan panel tugas/notifikasi sudah tersedia. Pengiriman pengingat, status baca, akses karyawan, penilaian Kepala Divisi dan unlock belum menjadi perilaku aplikasi.
