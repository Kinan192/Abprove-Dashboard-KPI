# Revisi UI per role v1.4

Acuan: [kebutuhan v1.4](../../requirements/REVISI-PER-ROLE-v1.4.md), berdasarkan daftar pengguna. Gaya ABprove, shell, halaman profil bertab, warna status, ukuran sidebar/navbar dan UI lain di luar daftar revisi dipertahankan. Backup source: archive/frontend/2026-11-10-before-role-refinement/.

## Kepala Unit

- Isi nilai menampilkan nama, NIP dan bulan secara ringkas. Label penilai serta rangkaian nama template/versi yang berulang dihapus khusus halaman ini. Data bernama “Contoh”/NIP DEMO tetap berasal dari seeder DB; tidak disamarkan menjadi pegawai asli.
- Rail dan pemilih ponsel diurutkan Dikembalikan → Diajukan → Belum diisi → Final, sebelum pagination. Proses pengisian tetap memakai API, integer 10–100 dan konfirmasi pengiriman.
- Pengajuan mempunyai Urutan nilai: awal, terendah dahulu, tertinggi dahulu. Seluruh hasil filter diurutkan sebelum dibagi per 10 baris; nilai kosong selalu di belakang.
- KPI Unit tanpa kolom Tindakan, badge Hanya baca, judul template dan paragraf penilai. Informasi pengelola diganti sesuai permintaan: “KPI diatur oleh SDM, Hubungi SDM untuk usulan perubahan.”
- Pemilih KPI unit hanya memuat unit dalam divisi akun, default unit sendiri. Katalog kpiUnits terpisah dari data units/staff/assessments. Cakupan staf dan nilai tetap unit sendiri di backend; mengganti parameter URL tidak memberikan akses tambahan.
- Anggota Unit tidak mempunyai dropdown unit. Data tetap berasal dari unit yang ditugaskan pada akun.

## Kepala Divisi

- Progres beranda dibatasi 5 unit per halaman. Tes menggunakan lebih dari 5 unit agar perpindahan halaman benar-benar teruji.
- Tinjau mempunyai kolom nilai tepat satu bulan sebelumnya, hanya dari hasil Final. Label Naik/Turun/Tetap membandingkan nilai integer per KPI; bukan persentase perubahan yang dapat menyesatkan.
- Definisi, pilar, numerator, denominator, formula, target dan bobot harus sama. ID indikator boleh berbeda antarversi. Jika definisi berubah atau tidak dapat dipasangkan secara unik, tampil “Indikator tidak sebanding”. Bulan tanpa Final tampil kosong secara eksplisit. Total hanya dibandingkan bila seluruh susunan KPI sebanding; tidak mengambil bulan lain untuk menggantikan data kosong.
- Jejak keputusan memakai label tindakan manusia, pelaku, WIB dan catatan. Saat baru diajukan, teks menyatakan menunggu keputusan; peristiwa pengajuan tetap ditampilkan sebagai aktivitas yang sah. Jika tidak ada aktivitas, ada empty state yang jelas. Riwayat dipaginasi 3 per halaman.
- Dashboard memakai filter unit dan jenis penilaian; dropdown kelompok KPI dihilangkan. Rata-rata KPI menjadi 10 baris per halaman, sementara tabel definisi KPI tetap 5.
- KPI Divisi diringkas seperti KPI Unit, tanpa hak mengubah indikator/bobot.

## Super HC

- Progres per unit di setiap divisi memakai 5 baris dan pagination. Pembagian divisi beranda yang sudah ada dipertahankan.
- Jejak keputusan pada Rekap memakai komponen yang sama dengan KD. Kode seperti assessment.approve tidak ditampilkan mentah. Catatan lama yang tercatat pada peristiwa Final diberi label “Catatan peristiwa”, bukan ditampilkan seolah-olah pengembalian baru; audit DB tidak dihapus.
- Filter dashboard dan pagination Rata-rata KPI mengikuti KD. Peringkat, status unit, temuan dan laporan lain dipertahankan.
- Empty state tabel Struktur & Staf berada di tengah, termasuk filter Nonaktif.
- Jabatan dan Unit penempatan pada Tambah/Ubah staf menggunakan combobox yang dapat diketik. Unit disertai divisi untuk membedakan nama yang sama. Hanya pilihan ID master yang dapat dikirim; teks pencarian yang belum dipilih tidak dianggap valid. Lebih dari 10 hasil meminta pencarian lebih spesifik. Keyboard panah, Enter, Escape dan Tab didukung; unit staf yang sudah ditempatkan tetap diganti melalui Pindahkan staf.
- Bantuan teknis Better Auth pada pembuatan akun dihapus dari UI. Validasi sandi backend dipertahankan.
- Judul KPI kini menyebut area sebagai heading. Nama dokumen KPI tidak lagi menyerupai kolom pencarian; tindakan Ubah nama KPI membuka dialog khusus. Nama tetap dipakai untuk ekspor dan riwayat, lalu disimpan bersama perubahan indikator.
- Bulan penggunaan dan riwayat menjadi tombol “Atur bulan penggunaan & riwayat KPI”. Penjelasan membedakan kapan indikator mulai dipakai dengan jadwal pengisian pada Periode & kategori.
- Pilar berupa teks bebas dengan saran dari pilar yang sudah dipakai. Wajib terisi dan maksimum 64 karakter pada editor/dialog, impor, API dan CHECK database. Tidak mengubah snapshot lama.
- Cakupan KPI dihapus dari sidebar, tab dan halaman aktif. URL lama diarahkan ke KPI & Periode. Pengelolaan penempatan staf tetap ada karena diperlukan untuk menentukan unit staf. Tab Pengguna pada Periode & kategori dihapus; Akun Kepala tetap tersedia.

Filter kelompok KPI secara teknis menyaring ID versi template, sehingga tidak sepenuhnya identik dengan filter unit. Penyederhanaan dashboard memakai unit dan jenis untuk menentukan KPI pada alur bulanan; versi historis tetap tersedia melalui riwayat KPI. Data dan snapshot versi tidak dihapus.

## Database dan batas akses

Migration tambahan 000008 hanya mengganti batas daftar pilar dengan CHECK teks wajib 1–64 karakter. Tidak menjalankan migrate:fresh, reset atau reseed pada database pengguna. Backup privat dan verifikasi hash baris template, indikator, penilaian serta snapshot dilakukan oleh tools/database/apply_flexible_pillars.php; hasil pada [laporan migration lokal](local-migration.json).

Otorisasi penilaian tetap pada backend: KU menilai staf sendiri, KD memutuskan dan menilai KU dalam divisinya, HC mengelola tanpa kewenangan Final. Endpoint katalog KPI satu divisi tidak memperluas endpoint anggota/penilaian. Keputusan ini tercatat pada [DECISIONS](../../backend/DECISIONS.md).

## Bukti untuk review

[47 tes UI](browser-report.json), [pengukuran halaman/panel aplikasi](visual-report.json), [kontras dan sumber](design-qa/verification.json), [ringkasan validasi](validation-summary.json), [quality gate](QUALITY_GATE.md). Pengujian mutasi memakai MySQL sementara dan Better Auth asli. Bukti backend disalin pada backend-test-result.json, live-browser-report.json dan phpunit.xml.

Hasil akhir: build, Pint dan Prettier lulus; 84 tes PHP/766 assertion, sembilan skenario integrasi dan 47 tes UI lulus. Setelah popover diperbaiki agar tidak terpotong footer, CRUD akun/jabatan/divisi/unit/staf diuji ulang dan lulus pada server nyata terisolasi. Bukti tambahan: staff-popover-browser-report.json. Sebanyak 96 tampilan halaman dan 132 panel tidak mempunyai overflow horizontal; seluruh 76 pemeriksaan desktop 1440×900 muat tanpa scroll vertikal pada data yang diuji. Sebanyak 2.031 pasangan warna teks/latar diperiksa tanpa isu kontras yang terdeteksi. Data lebih panjang dan viewport lain tetap dapat menggulir secara alami.

Contoh komponen jejak: [pengembalian dan pengajuan ulang](screenshots/jejak-pengajuan-ulang.png), [keadaan kosong](screenshots/jejak-kosong.png). Kedua contoh ini menggunakan fixture audit berlabel untuk menunjukkan variasi keadaan tanpa mengubah nilai pengguna. Screenshot aplikasi nyata tersedia pada screenshots/.

[Jejak Final dari DB lokal](screenshots/live-hc-jejak-final.png) menunjukkan nama tindakan dan catatan yang tersimpan pada audit sebenarnya. [Isi nilai KU](screenshots/live-ku-score.png), [urutan nilai menurun](screenshots/live-ku-sort-desc.png), [KPI HC](screenshots/live-hc-kpi.png) dan [pencarian staf](screenshots/live-hc-staff-search.png) juga diambil dari aplikasi berakun.

Perintah: npm.cmd run build, npm.cmd run test:ui, npm.cmd run verify:design, node tools/design-review/revision-v4.mjs, python tools/testing/run_backend_tests.py, python tools/testing/validate_schema_v3.py. Nama skrip revision-v4 dipertahankan dari alat audit sebelumnya; UI aktif tetap ABprove dengan kebutuhan v1.4.

Design Read meneruskan ENERGY 1 / RHYTHM 1 / MOTION 2. Tab dan spacing yang disetujui tetap dipakai. Judul area memberi konteks tanpa terlihat sebagai filter; tombol pengaturan memperjelas fitur; combobox mengurangi pencarian manual; linimasa memisahkan aksi, pelaku dan alasan tanpa kode teknis. Tidak menambah font, logo, foto atau aset visual baru.
