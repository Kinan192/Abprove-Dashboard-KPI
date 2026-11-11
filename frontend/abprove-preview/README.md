> Historis: preview statis ini sudah digantikan frontend Blade pada proyek utama. Gunakan `/design-review` di Laravel. Lihat `docs/frontend/abprove-blade/README.md`.

# Preview frontend ABprove

Revisi frontend untuk audit manual, 9 November 2026. Acuan: HTML dan 30 JPG dari `C:\Users\Kinan\Downloads\ABprove`. Tahap ini berdiri sendiri; integrasi Laravel/backend menunggu audit pengguna.

## Membuka preview

Cara langsung: buka `audit.html` di folder ini menggunakan Chrome atau Edge. Font dan gambar tersedia lokal; tidak memerlukan login database atau internet.

Alternatif melalui server statis, jalankan dari root proyek:

```powershell
npm.cmd run preview:design
```

Buka `http://127.0.0.1:4174/`. Hentikan server dengan Ctrl+C. Server hanya melayani berkas preview pada komputer lokal, terpisah dari aplikasi Laravel di port 8000.

Di indeks audit:

1. Pilih role dan halaman/dialog.
2. Bandingkan preview dengan gambar acuan, atau gunakan tab Preview/Gambar acuan.
3. Pilih viewport desktop 1440, tablet 1024, atau ponsel 390 px.
4. Gunakan Buka preview untuk mencoba interaksi pada tab tersendiri. Ukuran tab tersendiri mengikuti jendela browser; ukuran pilihan viewport dipakai pada iframe audit.
5. Gunakan Buka ukuran asli untuk melihat JPG acuan tanpa skala tampilan audit.

## Cakupan layar

- Login: halaman masuk dan lupa kata sandi.
- Kepala Unit: beranda, isi nilai, pengajuan, riwayat, KPI unit, panduan, profil.
- Kepala Divisi: beranda, persetujuan, drawer tinjau penilaian, dashboard divisi, KPI divisi, panduan, profil.
- Super HC: beranda, rekap/finalisasi, export Excel, dashboard, karyawan, tambah karyawan, kepala unit, tambah kepala unit, master KPI, penempatan KPI, Atur KPI, pengaturan, panduan, profil.

Semua 30 gambar acuan dapat dipilih di indeks. Panduan panjang tetap dapat digulir; screenshot QA panduan hanya menangkap viewport awal.

JPG sumber merupakan acuan desktop. Pilihan viewport tablet/ponsel menampilkan adaptasi responsif dari HTML, sementara kolom gambar tetap menampilkan JPG desktop asli.

## Akun contoh dari HTML sumber

Untuk mencoba form login lokal pada `index.html`:

| Role | Email | Password contoh |
|---|---|---|
| Super HC | rina.marlina@rs.co.id | Rina#2026 |
| Kepala Divisi Pelayanan Medis | hendra.kusuma@rs.co.id | Hendra#2026 |
| Kepala Divisi Penunjang Medis | ratna.dewi@rs.co.id | Ratna#2026 |
| Kepala Unit Gawat Darurat | agus.prasetyo@rs.co.id | Agus#2026 |
| Kepala Unit Rawat Inap | dewi.lestari@rs.co.id | Dewi#2026 |
| Kepala Unit Radiologi | rizky.hidayat@rs.co.id | Rizky#2026 |
| Kepala Unit Laboratorium PK | sari.puspita@rs.co.id | Sari#2026 |

Ini identitas/data ilustrasi yang sudah disertakan pengguna pada HTML sumber. Akun seeder Laravel dari tahap sebelumnya tidak dipakai di preview ini. Indeks audit dapat membuka layar langsung untuk pemeriksaan visual tanpa form login.

## Batas tahap review

State menggunakan browser dengan key `abprove-design-review-v1`. Form, perubahan profil, skor, pengajuan, persetujuan/finalisasi dan notifikasi hanya simulasi lokal. Reset kata sandi/pengingat tidak mengirim email atau pesan. Export Excel menghasilkan file contoh dari data browser. Upload Master KPI mengikuti demonstrasi pratinjau pada HTML sumber, belum parser impor aplikasi.

Untuk mengembalikan data latihan, gunakan Pengaturan → Kembalikan data contoh pada preview Super HC. Penghapusan atau reset preview hanya memengaruhi data browser preview.

**Perbedaan alur yang menunggu audit:** sumber ABprove masih memberi Final/unlock ke HC dan belum menampilkan penilaian Kepala Unit oleh KD. Penempatan KPI per karyawan/bulan, profil dan reset password juga berbeda dari kontrak backend saat ini. Tampilan sumber dipertahankan untuk audit; tidak ada keputusan bisnis backend yang diganti. Rincian: [catatan audit](../../docs/frontend/abprove-review/README.md).

## Struktur

```text
audit.html              Indeks perbandingan 30 layar
index.html              Shell frontend ABprove
assets/abprove.css      Gaya yang diadopsi dari HTML sumber
assets/abprove.js       Halaman, data contoh dan interaksi lokal sumber
assets/review.css       Kontras, fokus, ketahanan layout dan tema
assets/review.js        Deep link layar dan akses keyboard/dialog
assets/catalog.js       Pemetaan layar ke JPG acuan
assets/audit.*          Kontrol indeks audit
assets/fonts.*          Font Figtree dan Plus Jakarta Sans lokal
assets/fonts/           WOFF2 dan lisensi font
reference/              Salinan JPG serta Baca_saya.txt dari pengguna
```

Pengujian dari root: `npm.cmd run test:design`. Bukti dan quality gate ada di `docs/frontend/abprove-review/`. Sumber HTML dan JPG di Downloads dipertahankan.
