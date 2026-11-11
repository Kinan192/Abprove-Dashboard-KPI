# Laporan Prototype KPI Kinerja — Divisi & Tim

Dokumen: KPI-Kinerja-UIUX.figcraft

- 240 / 240 frame lulus pemeriksaan proto.preview.
- 1903 definisi On Click; 0 tujuan hilang; 0 tautan lintas role.
- 1852 target klik terlihat diverifikasi; 0 target hilang.
- 28 / 28 skenario pengelolaan tim lulus.
- 0 trigger afterDelay sementara tersisa; 0 overflow panel tak disengaja.
- Desktop 1440 × 900, ponsel 390 × 844, tablet 1024 × 900. Dialog mengikuti isi.

## Metode

Pembuatan dan interaksi memakai server FigCraft MCP resmi yang terhubung ke aplikasi lokal. Setiap frame dibuka melalui proto.preview. Target On Click yang terlihat dibandingkan dengan hotspot mesin preview setelah memperhitungkan clipping. Skenario runtime menyalin action tombol pada afterDelay sementara, lalu menghapus seluruh trigger pengujian. Tidak ada klaim uji klik fisik untuk semua tombol.

## Skenario

| Alur | Hasil | Current akhir |
|---|---|---:|
| HC pilih divisi Pelayanan | PASS | 8981 |
| HC pilih divisi Keperawatan | PASS | 9145 |
| HC pilih divisi Penunjang | PASS | 9309 |
| HC buka Unit SDM dari baris pertama | PASS | 9801 |
| HC tambah divisi | PASS | 9473 |
| HC divisi baru tambah unit | PASS | 11676 |
| HC unit baru tambah anggota | PASS | 11840 |
| HC tambah unit di Umum SDM | PASS | 10129 |
| HC unit Pengadaan tambah anggota | PASS | 11512 |
| HC Unit IT tambah anggota | PASS | 10293 |
| HC pindahkan anggota IT ke SDM | PASS | 10457 |
| HC ganti Kepala Unit IT | PASS | 10621 |
| HC ganti Kepala Divisi Umum SDM | PASS | 13901 |
| KD buka Tim Divisi | PASS | 10785 |
| KD lihat anggota UGD | PASS | 10937 |
| KD lanjut ke persetujuan | PASS | 731 |
| KU buka Anggota Unit | PASS | 11089 |
| KU lanjut pengisian nilai | PASS | 208 |
| Ponsel HC buka anggota IT | PASS | 11238 |
| Ponsel KD buka Tim Divisi | PASS | 11268 |
| Ponsel KU buka Anggota Unit | PASS | 11300 |
| Tambah divisi dapat dibatalkan | PASS | 1542 |
| Scope Umum & SDM / SDM | PASS | 14416 |
| Scope Umum & SDM / Logistik | PASS | 14643 |
| Scope Pelayanan Medis / Pengadaan | PASS | 15035 |
| Scope Keperawatan / Pengadaan | PASS | 15467 |
| Scope Penunjang Medis / Pengadaan | PASS | 15899 |
| HC buka Unit IT dari divisi | PASS | 9637 |

## Cakupan UI

Tambah divisi dan Kepala Divisi; tambah unit dan Kepala Unit; penempatan anggota; pemindahan anggota dengan konfirmasi; daftar akun dengan cakupan; Tim Divisi untuk Kepala Divisi; Anggota Unit untuk Kepala Unit; dan tampilan ponsel. Panduan pada TEAM_MANAGEMENT.md. Snapshot dan input masih berupa prototype, belum terhubung ke backend.

Laporan sebelum revisi disimpan sebagai PROTOTYPE_TEST_REPORT-before-team.md. Data rinci tersedia pada TEAM_UI_AUDIT.json dan TEAM_PROTOTYPE_TESTS.json.
