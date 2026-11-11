# Laporan Pengujian Prototype KPI Kinerja

Tanggal: 7 November 2026
Dokumen: KPI-Kinerja-UIUX.figcraft

## Hasil akhir

- PASS: 161 frame diperiksa melalui proto.preview; seluruh frame aktif yang diminta tampil dengan benar.
- PASS: 1099 area On Click aktif terdeteksi di mesin preview; tidak ada hotspot yang hilang.
- PASS: 1109 definisi On Click dibuat menggunakan proto.interaction.add.
- PASS: 1064 referensi navigasi diperiksa; 0 tujuan hilang dan 0 tautan lintas peran.
- PASS: 18 dari 18 skenario eksekusi prototype.
- PASS: dissolve 160 ms untuk perpindahan umum; smartAnimate 180–200 ms untuk tab dan checkbox; moveIn 200 ms untuk overlay/drawer.
- PASS: checkbox finalisasi mempunyai delapan state (0–3 pilihan). Jumlah pilihan, konfirmasi, dan hasil finalisasi sesuai state.
- PASS: semua trigger afterDelay untuk pengujian sudah dihapus. File akhir memakai On Click dan Escape yang disengaja.

## Metode

Seluruh frame dibuka dengan proto.preview. Hotspot yang dihasilkan FigCraft dibandingkan dengan definisi On Click pada layer yang terlihat. Navigasi, overlay stack, current frame, history, dan error diperiksa melalui inspect_ui.

Skenario runtime memakai trigger afterDelay sementara untuk menjalankan action prototype melalui mesin FigCraft MCP, kemudian trigger tersebut dihapus. Ini bukan klaim bahwa setiap tombol sudah diklik secara fisik.

Uji klik manual Computer Use tidak dijalankan: runtime tetap menolak akses dengan pesan `Computer Use was not approved to use FigCraft`, termasuk setelah pengguna memberi persetujuan.

## Skenario runtime

| Skenario | Hasil | Current / overlay |
|---|---|---|
| KU Beranda → Isi Nilai | PASS | 208 / [] |
| KU tab Menunggu | PASS | 5529 / [] |
| KU ajukan: dialog terbuka | PASS | 208 / [2227] |
| KU ajukan: konfirmasi ke sukses | PASS | 208 / [2308] |
| KU batal: dialog ditutup | PASS | 208 / [] |
| KD sidebar Persetujuan | PASS | 731 / [] |
| KD tab Dikembalikan | PASS | 6501 / [] |
| KD setujui: dialog dan sukses | PASS | 731 / [2313] |
| HC sidebar Rekap | PASS | 1068 / [] |
| HC finalisasi: konfirmasi ke hasil | PASS | 1068 / [2323] |
| Mobile drawer → Persetujuan | PASS | 3086 / [] |
| HC Master KPI → editor | PASS | 1239 / [] |
| HC editor → dialog baris | PASS | 1239 / [2418] |
| HC checkbox: toggle pilihan | PASS | 1068 / [] |
| HC checkbox A dilepas: 3 → 2 pilihan | PASS | 7786 / [] |
| HC checkbox A dipilih kembali: 2 → 3 pilihan | PASS | 1068 / [] |
| HC kosong: finalisasi menampilkan petunjuk | PASS | 7096 / [7088] |
| HC 2 pilihan: konfirmasi → hasil 2 Final | PASS | 7786 / [7926] |

## Kontrol yang memang nonaktif

- Simpan template ketika total bobot belum 100%.
- Impor template ketika pratinjau masih mempunyai kesalahan.
- Buka kunci Final yang alur lanjutannya belum ditetapkan.
- Ajukan pada state validasi yang masih belum lengkap.

Field input adalah bagian rancangan antarmuka, bukan integrasi autentikasi atau penyimpanan server. Prototype menyediakan alur navigasi, tab status, checkbox, dialog, dan feedback keputusan.

## Cakupan hotspot per frame

| ID | Frame | Area On Click aktif | Hilang |
|---|---|---:|---:|
| 3 | KPI Kinerja • Peta desain | 0 | 0 |
| 37 | Fondasi & komponen | 2 | 0 |
| 103 | Login • U-1 | 1 | 0 |
| 133 | Beranda • Kepala Unit | 14 | 0 |
| 208 | Isi Nilai • Kepala Unit | 20 | 0 |
| 336 | Pengajuan • Kepala Unit | 16 | 0 |
| 414 | Riwayat • Kepala Unit | 41 | 0 |
| 566 | KPI Unit • Kepala Unit | 10 | 0 |
| 1843 | Lembar Final & Riwayat | 11 | 0 |
| 1938 | Detail Pengajuan | 11 | 0 |
| 2131 | KPI Kinerja | 7 | 0 |
| 2192 | Akun • Kepala Unit | 2 | 0 |
| 2201 | Akun • Kepala Unit | 1 | 0 |
| 2217 | Periode penilaian | 3 | 0 |
| 2227 | Ajukan penilaian? | 2 | 0 |
| 2280 | Tarik kembali pengajuan? | 2 | 0 |
| 2296 | Keluar dari akun? | 2 | 0 |
| 2303 | Draft tersimpan | 1 | 0 |
| 2308 | Penilaian diajukan | 1 | 0 |
| 2456 | Notifikasi • P1 | 1 | 0 |
| 2469 | Cara pengisian nilai • P1 | 1 | 0 |
| 2824 | Perubahan belum disimpan | 3 | 0 |
| 2834 | Penilaian bulan ini • 390 | 5 | 0 |
| 2874 | Isi nilai • 390 | 4 | 0 |
| 2949 | Pengajuan • 390 | 5 | 0 |
| 2989 | Riwayat • 390 | 4 | 0 |
| 3021 | KPI unit • 390 | 2 | 0 |
| 3666 | KPI Kinerja • mobile | 8 | 0 |
| 3736 | Periode penilaian • mobile | 2 | 0 |
| 3744 | Ajukan penilaian? • mobile | 2 | 0 |
| 3782 | Draft tersimpan • mobile | 1 | 0 |
| 3787 | Penilaian diajukan • mobile | 1 | 0 |
| 3817 | Cara pengisian • P1 • mobile | 1 | 0 |
| 3824 | Login • 390 | 1 | 0 |
| 4231 | Salin nilai bulan lalu? | 2 | 0 |
| 5105 | Lembar penilaian • 390 | 3 | 0 |
| 5529 | Pengajuan • Menunggu | 17 | 0 |
| 5637 | Pengajuan • Disetujui | 15 | 0 |
| 5725 | Pengajuan • Final | 15 | 0 |
| 5813 | Pengajuan • Belum diajukan | 17 | 0 |
| 6939 | Isi Nilai • Perlu diisi | 18 | 0 |
| 648 | Beranda • Kepala Divisi | 14 | 0 |
| 731 | Persetujuan • Kepala Divisi | 19 | 0 |
| 860 | Dashboard Divisi • Kepala Divisi | 9 | 0 |
| 2152 | KPI Kinerja | 5 | 0 |
| 2237 | Setujui penilaian? | 2 | 0 |
| 2247 | Kembalikan penilaian? | 2 | 0 |
| 2313 | Penilaian disetujui | 1 | 0 |
| 2318 | Penilaian dikembalikan | 1 | 0 |
| 3054 | Persetujuan divisi • 390 | 6 | 0 |
| 3086 | Tinjau penilaian • 390 | 5 | 0 |
| 3140 | Dashboard divisi • 390 | 3 | 0 |
| 3454 | Lembar penilaian • 390 | 3 | 0 |
| 3638 | Data unit divisi • 390 | 3 | 0 |
| 3687 | KPI Kinerja • mobile | 6 | 0 |
| 3754 | Setujui penilaian? • mobile | 2 | 0 |
| 3761 | Kembalikan penilaian? • mobile | 2 | 0 |
| 3792 | Penilaian disetujui • mobile | 1 | 0 |
| 3797 | Penilaian dikembalikan • mobile | 1 | 0 |
| 3840 | Persetujuan • 1024 | 6 | 0 |
| 4155 | Setujui Sekaligus • Kepala Divisi | 13 | 0 |
| 4219 | Setujui 2 penilaian? | 2 | 0 |
| 4226 | 2 penilaian disetujui | 1 | 0 |
| 4994 | Login • U-1 | 1 | 0 |
| 5022 | Login • 390 | 1 | 0 |
| 5038 | Akun • Kepala Divisi | 2 | 0 |
| 5045 | Akun • Kepala Divisi | 1 | 0 |
| 5051 | Periode penilaian | 3 | 0 |
| 5061 | Periode penilaian • mobile | 2 | 0 |
| 5069 | Notifikasi • P1 | 1 | 0 |
| 5082 | Cara pengisian nilai • P1 | 1 | 0 |
| 5092 | Cara pengisian • P1 • mobile | 1 | 0 |
| 5098 | Keluar dari akun? | 2 | 0 |
| 5150 | Detail Pengajuan | 9 | 0 |
| 6501 | Persetujuan • Dikembalikan | 17 | 0 |
| 6647 | Persetujuan • Disetujui | 17 | 0 |
| 6793 | Persetujuan • Semua | 19 | 0 |
| 975 | Beranda • Super HC | 17 | 0 |
| 1068 | Rekap & Finalisasi • Super HC | 24 | 0 |
| 1159 | Master KPI • Super HC | 16 | 0 |
| 1239 | Editor Template KPI • Super HC | 19 | 0 |
| 1347 | Pengaturan Siklus & Kategori • Super HC | 12 | 0 |
| 1406 | Pengguna • Super HC | 18 | 0 |
| 1477 | Karyawan • Super HC | 18 | 0 |
| 1542 | Struktur Organisasi • Super HC | 26 | 0 |
| 1610 | Dashboard Analitik • Super HC | 12 | 0 |
| 1728 | Analitik Rinci • Super HC | 12 | 0 |
| 2033 | Detail Siap Final | 13 | 0 |
| 2169 | KPI Kinerja | 8 | 0 |
| 2258 | Kembalikan penilaian? | 2 | 0 |
| 2270 | Finalkan 3 penilaian? | 2 | 0 |
| 2288 | Simpan perubahan pengaturan? | 2 | 0 |
| 2323 | 3 penilaian menjadi Final | 1 | 0 |
| 2328 | Pengaturan tersimpan | 1 | 0 |
| 2333 | 3 baris berhasil disalin | 1 | 0 |
| 2338 | Konsep pengingat unit | 1 | 0 |
| 2347 | Atur pengguna & cakupan | 2 | 0 |
| 2371 | Edit karyawan | 2 | 0 |
| 2396 | Edit struktur organisasi | 2 | 0 |
| 2418 | Edit baris KPI | 3 | 0 |
| 2449 | Hapus baris KPI? | 2 | 0 |
| 2479 | Finalkan penilaian? | 2 | 0 |
| 2489 | Penilaian menjadi Final | 1 | 0 |
| 2494 | Penilaian dikembalikan | 1 | 0 |
| 2758 | Impor Master KPI • Super HC | 16 | 0 |
| 3171 | Rekap siklus • 390 | 5 | 0 |
| 3209 | Rekap & finalisasi • 390 | 7 | 0 |
| 3253 | Master KPI • 390 | 5 | 0 |
| 3290 | Pengaturan • 390 | 3 | 0 |
| 3325 | Pengguna & struktur • 390 | 7 | 0 |
| 3359 | Data karyawan • 390 | 5 | 0 |
| 3389 | Struktur organisasi • 390 | 4 | 0 |
| 3419 | Analitik rumah sakit • 390 | 3 | 0 |
| 3499 | Template KPI • 390 | 4 | 0 |
| 3542 | Atur pengguna • 390 | 3 | 0 |
| 3575 | Edit karyawan • 390 | 3 | 0 |
| 3608 | Edit struktur • 390 | 3 | 0 |
| 3704 | KPI Kinerja • mobile | 9 | 0 |
| 3772 | Finalkan 3 penilaian? • mobile | 2 | 0 |
| 3802 | 3 penilaian Final • mobile | 1 | 0 |
| 3807 | 3 baris disalin • mobile | 1 | 0 |
| 3812 | Simpan pengaturan? • mobile | 1 | 0 |
| 3917 | Rekap Siklus • 768 | 8 | 0 |
| 3981 | Template KPI • Valid 100% | 13 | 0 |
| 4065 | Lembar Final • Super HC | 13 | 0 |
| 4143 | Buka kunci Final • OPEN | 0 | 0 |
| 5265 | Login • U-1 | 1 | 0 |
| 5293 | Login • 390 | 1 | 0 |
| 5309 | Akun • Super HC | 2 | 0 |
| 5316 | Akun • Super HC | 1 | 0 |
| 5322 | Periode penilaian | 3 | 0 |
| 5332 | Periode penilaian • mobile | 2 | 0 |
| 5340 | Notifikasi • P1 | 1 | 0 |
| 5353 | Cara pengisian nilai • P1 | 1 | 0 |
| 5363 | Cara pengisian • P1 • mobile | 1 | 0 |
| 5369 | Keluar dari akun? | 2 | 0 |
| 5376 | Lembar penilaian • 390 | 3 | 0 |
| 5921 | Rekap • Diajukan | 19 | 0 |
| 6066 | Rekap • Final | 19 | 0 |
| 6211 | Rekap • Dikembalikan | 18 | 0 |
| 6345 | Rekap • Semua | 20 | 0 |
| 7088 | Pilih penilaian | 1 | 0 |
| 7096 | Rekap • Pilihan 000 | 24 | 0 |
| 7211 | Rekap • Pilihan 001 | 24 | 0 |
| 7326 | Rekap • Pilihan 010 | 24 | 0 |
| 7441 | Rekap • Pilihan 011 | 24 | 0 |
| 7556 | Rekap • Pilihan 100 | 24 | 0 |
| 7671 | Rekap • Pilihan 101 | 24 | 0 |
| 7786 | Rekap • Pilihan 110 | 24 | 0 |
| 7901 | Finalkan 1 penilaian? | 2 | 0 |
| 7911 | 1 penilaian menjadi Final | 1 | 0 |
| 7916 | Finalkan 2 penilaian? | 2 | 0 |
| 7926 | 2 penilaian menjadi Final | 1 | 0 |
| 2577 | State • empty | 4 | 0 |
| 2599 | State • loading | 3 | 0 |
| 2623 | State • error | 4 | 0 |
| 2645 | State • conflict | 4 | 0 |
| 2667 | State • forbidden | 4 | 0 |
| 2689 | State • session | 4 | 0 |
| 2711 | Validasi & focus input | 12 | 0 |
| 5437 | Review desain & handoff | 0 | 0 |

