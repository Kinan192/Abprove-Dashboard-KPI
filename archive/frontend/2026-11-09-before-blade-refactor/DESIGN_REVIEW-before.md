# Review implementasi terhadap FigCraft

Sumber: `design/prototypes/KPI-Kinerja-UIUX.figcraft`, diperiksa melalui FigCraft MCP pada dokumen lokal id 2, seluruh page dengan kedalaman 20. Hasil inspeksi tersimpan pada [outline](figcraft-outline.json) dan [layer/state/interaksi](figcraft-inspection.json). Enam frame utama diekspor melalui MCP ke `reference/`. File native tidak diubah pada fase implementasi frontend ini.

## Keputusan visual

Design Read: dashboard operasional untuk Kepala Unit, Kepala Divisi dan Super HC, bahasa visual tenang dengan mint/teal sesuai design system; **ENERGY 1 / RHYTHM 1 / MOTION 2**. Arah ini mengikuti permintaan dashboard pengguna dan sumber FigCraft, bukan template pemasaran.

| Keputusan | Alasan |
|---|---|
| Tema terang tetap | Desain yang disetujui memakai panel putih, workspace mint dan navbar teal untuk pekerjaan tabel/formulir; mempertahankan acuan yang diminta |
| 60:30:10 | Putih/netral menjadi area baca dominan, mint memisahkan konteks, teal menandai navigasi dan aksi utama |
| Sidebar 232 px + navbar 64 px | Sama dengan geometri frame desktop; navigasi dan periode tetap terlihat selama bekerja |
| Scroll internal | Menjaga shell konsisten sementara daftar, editor dan laporan bertambah panjang |
| Inter lokal | Sama dengan frame, mudah dibaca pada tabel padat dan angka, tidak bergantung CDN |
| Spacing 4/8 px, panel 16 px | Mengikuti jarak/radius acuan, mengelompokkan input dan memisahkan keputusan dari data |
| Panel berbeda ukuran | Ringkasan, daftar anggota, editor dan tenggat memiliki kebutuhan ruang berbeda |
| Outline icon dengan nama aksi | Ikon clipboard/check/table/users mewakili fungsi penilaian, persetujuan, KPI dan organisasi; tanpa ilustrasi/identitas baru |
| Transisi singkat, skeleton dan feedback | Menjelaskan drawer, pergantian state dan respons server; menghormati prefers-reduced-motion |
| Badge berlabel | Warna semantik Final/menunggu/revisi berasal dari design system dan tetap terbaca tanpa membedakan warna |
| Editor ponsel per KPI | Kolom desktop berubah menjadi blok berlabel sehingga nilai/bobot tetap dapat dibaca dan diisi pada lebar 390 px |
| Grafik dengan tabel alternatif | Tren memakai Final nyata, tidak menghubungkan bulan kosong sebagai nol; tabel memberi angka rinci yang dapat dibaca keyboard |

Token utama: `#FFFFFF/#F8FAFA` dominan; `#EDF8F6/#D2EFEA/#F1F4F4` pendukung; `#076C63/#087F73/#075A53` aksen. Teks `#162833/#52616B`, judul `#0D3D39`. Warna status mengikuti tabel semantik DESIGN_SYSTEM. Komposisi 60:30:10 adalah target hierarki visual, bukan aturan setiap halaman harus mempunyai jumlah piksel yang sama. [visual-qa.json](visual-qa.json) mencatat rasio solid beranda dan kontras pasangan teks.

## Pemetaan frame ke implementasi

| Frame acuan | Implementasi/state nyata | Referensi | Screenshot |
|---|---|---|---|
| 103 Login | auth/login; validasi, loading, password toggle dan login role akun | [FigCraft](reference/login.png) | [HTML](screenshots/login-desktop.png) |
| 133 Beranda KU | dashboard, ringkasan progres, tren Final, tugas, tenggat dan akses cepat | [FigCraft](reference/unit-dashboard.png) | [HTML](screenshots/unit-dashboard-desktop.png) |
| 208 Isi Nilai | assessmentPage: pemilihan anggota, input, draft, pengajuan, return, Final, pembanding, konfirmasi | [FigCraft](reference/score.png) | [HTML](screenshots/score-desktop.png) |
| 731 Review KD | assessmentPage mode review: angka readonly, alasan return, ACC Final/bulk | [FigCraft](reference/division-review.png) | [HTML](screenshots/division-review-desktop.png) |
| 975 Beranda HC | dashboard HC dengan tugas konfigurasi dan rekap, tanpa keputusan nilai | [FigCraft](reference/hc-dashboard.png) | [HTML](screenshots/hc-dashboard-desktop.png) |
| 1542 Divisi & Tim | organizationPage, hirarki divisi/unit/kepala/anggota, form dan preview dampak | [FigCraft](reference/organization.png) | [HTML](screenshots/organization-desktop.png) |

Frame varian tidak dibuat menjadi URL demo terpisah. Tab status dan filter mengubah query data; dialog menjadi native dialog; varian draft/submitted/returned/final mengikuti response server; toast/status menggantikan frame sukses/gagal. Halaman tiap role tetap memiliki route/navigasi tersendiri. Komponen shell, tabel, input, badge, pagination dan dialog digunakan bersama.

## Hasil perbandingan screenshot

- Desktop: sidebar 232 px, navbar 64 px dan origin workspace x232/y64 dipertahankan; judul beranda 20 px, judul editor 26 px. Panel, tabel tugas berikutnya dan outline icon mengikuti acuan. Tugas hanya memuat draft yang terlihat atau anggota yang benar-benar belum mempunyai assessment periode tersebut, sehingga histori tersembunyi tidak muncul sebagai tugas baru.
- Login: komposisi dua kolom mint/form, hierarki teks dan input mengikuti frame; isi menjelaskan alur keputusan KD terbaru.
- Editor: daftar di kiri dan lembar di kanan, target/bobot/hasil serta temuan dipertahankan; baris dipadatkan untuk enam KPI, footer menampilkan subtotal/total dan aksi yang sesuai status.
- Review: angka anggota menjadi teks, delta hanya tersedia bila pembanding kompatibel. Keputusan akhir menyebut KD secara eksplisit.
- Beranda HC: angka dan grafik berasal dari periode sebenarnya; menu finalisasi HC di prototype lama diganti Rekap sesuai instruksi terbaru.
- Organisasi: struktur yang terlihat adalah data dari server. Dialog mengirim preview, expected ID, alasan dan konfirmasi; bukan perpindahan antarframe statis.
- Tablet/ponsel: [tablet](screenshots/unit-dashboard-tablet.png), [beranda ponsel](screenshots/unit-dashboard-mobile.png) dan [editor ponsel](screenshots/score-mobile.png) diperiksa. Shell menjadi drawer pada lebar di bawah 1024 px; konten tidak melebar keluar workspace. Tabel laporan yang banyak kolom bergulir di wrapper, editor berubah menjadi blok KPI.

Perbedaan yang disengaja: angka/nama fixture menggantikan contoh desain; banyaknya unit/item mengikuti database; bulan tanpa Final menampilkan data kosong; chart menggunakan skala 0–100; aksi HC Final tidak diterapkan; KD memiliki editor Kepala Unit; beberapa field master dan validasi lebih lengkap mengikuti kontrak server. Ini bukan perbandingan piksel persis karena konten dan kewenangan sumber telah berubah.

## Verifikasi

Click-through tersimpan pada [browser-report.json](browser-report.json): login, seluruh menu role, editor/revisi/ACC, Kepala Unit, filter/unduh, organisasi, master, dialog, keyboard, responsif dan retry. Pembatasan lintas role/cakupan, Final immutable, integer, bobot, impor XLSX dan seeder lokal turut diuji pada [51 pengujian backend](../backend/test-result.json). [QUALITY_GATE](QUALITY_GATE.md) merinci bukti setiap butir penyerahan.
