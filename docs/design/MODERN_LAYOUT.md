# Layout Dashboard KPI Kinerja

Diperbarui: 8 November 2026.

Layout mengikuti referensi dashboard pengguna. Palet kini mengikuti DESIGN_SYSTEM.md dengan arahan warna 60:30:10. Fungsi dan alur tetap mengacu pada PRD.

## Proporsi warna

| Porsi | Keluarga warna | Penggunaan |
|---|---|---|
| 60% dominan | #FFFFFF / #F8FAFA | Panel, tabel, sidebar, dan formulir |
| 30% pendukung | #EDF8F6 / #D2EFEA / #F1F4F4 | Latar kerja, ringkasan, dan pilihan |
| 10% aksen | #076C63 / #087F73 / #075A53 | Navbar, tindakan utama, tren, dan penekanan |

Teks utama #162833, teks pendukung #52616B, judul beraksen #0D3D39, border #E0E7E7. Status Diajukan, Disetujui, Dikembalikan, Final, dan error memakai warna semantik asli design system serta label teks.

60:30:10 merupakan target komposisi visual. Pengukuran tiga beranda desktop memakai piksel warna solid dari tiga keluarga di atas, dinormalisasi setelah mengeluarkan teks, border, antialias, dan warna semantik. Rincian hasil ada pada COLOR_RATIO_QA.json. Dialog dan halaman dengan kepadatan data berbeda mengikuti peran warna yang sama.

## Struktur dan ukuran

- Desktop 1440 × 900; sidebar tetap 232 px dan navbar tetap 64 px.
- Dashboard Content: x232/y64, 1208 × 836; clip aktif dan scroll vertikal.
- Ponsel 390 × 844; header 64 px dan content viewport 780 px.
- Tablet 1024 × 900.
- Dialog dan drawer menjadi overlay dengan ukuran sesuai isi.
- Page Kepala Unit, Kepala Divisi dan Super HC terpisah.
- Target sentuh ponsel minimal 44 px; tombol desktop 40 px.
- Font Inter, radius panel 14–16 px dan kontrol 8–12 px.

## Prototype dan bukti

Navigasi, tab, checkbox, dialog, dan feedback prototype tetap aktif. Setelah pembaruan warna: 1.284 On Click tetap terhubung, 0 tujuan hilang, 0 tautan lintas role, dan 6 skenario runtime tambahan lulus. Pasangan warna teks yang digunakan memenuhi batas kontras yang diperiksa; putih pada teal #076C63 memiliki rasio 6,30:1.

Panduan native 60:30:10 ditambahkan pada bagian bawah frame Fondasi & komponen. Bagian ini dapat dicapai dengan scroll.

## Berkas

- KPI-Kinerja-UIUX.figcraft: desain terbaru dan prototype.
- KPI-Kinerja-UIUX-before-60-30-10.figcraft: cadangan sebelum pergantian palet.
- PNG beranda dan halaman kerja: preview warna terbaru.
- COLOR_RATIO_QA.json: pengukuran warna, kontras dan uji tambahan.
- PROTOTYPE_TEST_REPORT.md: laporan prototype.


## Revisi Divisi & Tim

Pengelolaan beberapa Kepala Divisi dan Kepala Unit diperjelas. Sidebar Kepala Divisi memiliki Tim Divisi, sidebar Kepala Unit memiliki Anggota Unit. Rincian dan batas prototype ada pada TEAM_MANAGEMENT.md. Pengujian terbaru: 240 frame dan 28 skenario runtime.
