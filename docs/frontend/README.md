# Frontend aktif

Revisi aktif terbaru: [UI per role v1.4](role-refinement/README.md). Mengikuti daftar pengguna: prioritas pengisian, urutan nilai, KPI satu divisi, perbandingan bulan lalu, jejak keputusan, combobox staf, pilar fleksibel dan penyederhanaan menu. Halaman/UI lain di luar daftar revisi dipertahankan.

Implementasi aktif: [tab ringkas dan warna teks status](compact-tabs-status/README.md), mengikuti arahan terbaru pengguna untuk meminimalkan scroll sambil mempertahankan gaya HTML/JPG ABprove pada perbandingan design-review.

Laravel Blade + Tailwind + Vite + JavaScript native. Buka `/login` untuk sesi Better Auth dan data MySQL nyata; `/design-review` untuk simulasi audit berlabel. Keduanya memakai Blade dan komponen yang sama. Integrasi API tersedia pada [backend v3](../backend/v3/README.md).

Akun Kepala -> Jabatan -> Divisi & Unit -> Staf tanpa akun -> KPI Unit & Divisi -> Periode. Tidak ada penyimpanan Draft penilaian. Finalisasi tetap pada Kepala Divisi.

Fase `approved-layout`, `compact-crud`, `revision-v4`, `reference-alignment`, `abprove-blade` dan `abprove-review` merupakan riwayat. Catatan stacking pada reference-alignment telah digantikan oleh tab pada revisi aktif.
