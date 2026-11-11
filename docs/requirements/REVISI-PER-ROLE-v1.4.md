# Revisi per role v1.4

Arahan pengguna 10 November 2026. Mengungguli bagian UI sebelumnya yang bertentangan. Perubahan dibatasi pada daftar ini; shell ABprove, tab ringkas profil, warna status, formulir penilaian lengkap dan kewenangan Final Kepala Divisi dipertahankan.

| Role/bagian | Kebutuhan dan perilaku |
|---|---|
| KU, Isi nilai | Hilangkan label penilai dan rangkaian metadata template/versi. Tampilkan nama, NIP dan bulan penilaian secara singkat. Urutan rail serta pemilih ponsel: Dikembalikan, Diajukan, Belum diisi, Final. Prioritas berlaku sebelum pagination; pencarian dan pengiriman API tetap nyata |
| KU, Pengajuan | Dropdown Urutan nilai: default, terendah dahulu, tertinggi dahulu. Urutkan seluruh hasil filter sebelum pagination. Nilai kosong selalu terakhir, bukan dianggap nol |
| KU, KPI Unit | Tanpa kolom Tindakan dan badge Hanya baca. Hilangkan judul template dan paragraf definisi/penilai. Informasi: “KPI diatur oleh SDM, Hubungi SDM untuk usulan perubahan.” Dropdown hanya KPI unit dalam divisi akun, default unit sendiri. Akses staf/nilai tidak ikut meluas |
| KU, Anggota Unit | Hilangkan pemilih unit. Daftar hanya unit akun; server tetap membatasi cakupan walaupun URL/request diubah |
| KD dan HC, Beranda | Tabel progres per unit maksimal 5 baris per halaman. Pagination diterapkan pada seluruh daftar, bukan potongan data permanen |
| KD dan HC, Tinjau | Jejak keputusan menjadi linimasa berlabel manusia, nama pelaku, waktu WIB dan alasan pengembalian. Bedakan belum ada keputusan dengan peristiwa pengajuan. Tidak menampilkan kode audit mentah. Catatan lama tetap dipertahankan sebagai catatan peristiwa |
| KD, Tinjau | Kolom Nilai bulan sebelumnya memakai penilaian Final tepat satu bulan sebelum bulan terpilih. Angka hanya dibandingkan jika definisi KPI, target dan bobot sesuai snapshot. Tampilkan naik/turun/tetap dan keadaan kosong/tidak sebanding secara eksplisit. Jangan mencari bulan lain untuk menggantikan bulan yang kosong |
| KD dan HC, Dashboard | Hapus filter kelompok KPI yang menambah batas template di samping unit/jenis. Filter unit/jenis/divisi tetap ada. Tabel Rata-rata KPI menjadi 10 baris per halaman; tabel definisi KPI tetap 5 |
| KD, KPI Divisi | Hilangkan badge Hanya baca, nama template dan paragraf definisi/penilai. Informasi pengelola SDM sama dengan KU. Hak mengubah tetap hanya HC |
| HC, Struktur & Staf | Empty state pencarian/status termasuk Nonaktif berada di tengah tabel |
| HC, Tambah/Ubah staf | Jabatan dan unit penempatan memakai dropdown yang dapat dicari. Pilihan tetap ID master yang valid, bukan teks bebas. Cari berdasarkan nama; unit menyertakan divisi untuk membedakan nama sama. Pemindahan staf tetap tindakan tersendiri |
| HC, Akun | Hilangkan bantuan teknis “Minimal 12 karakter, huruf dan angka. Dikelola melalui Better Auth.” Validasi kata sandi backend tetap berlaku |
| HC, KPI & Periode | Judul berupa identitas area, bukan input yang menyerupai pencarian. Nama template tetap dapat diubah lewat tindakan Ubah nama yang berlabel. Hilangkan paragraf definisi/penilai berulang. Pengaturan penggunaan tampil sebagai tombol “Atur bulan penggunaan & riwayat KPI” dengan penjelasan singkat |
| HC, Pilar | Input teks bebas dengan saran pilar yang sudah digunakan. Wajib terisi, maksimum 64 karakter; berlaku pada editor, dialog, impor, API dan database. Versi serta snapshot lama tetap utuh |
| HC, Penyederhanaan | Hapus Cakupan KPI dari sidebar, tab dan halaman aktif. Pemilihan area tetap pada KPI Unit/Divisi. Hapus tab Pengguna dari Periode & kategori; pengelolaan akun tetap di Akun Kepala |

## Batas keputusan

Nilai integer 10–100, total bobot 100%, tanpa Draft dan Final hanya KD tidak berubah. Perbandingan historis tidak mengubah nilai aktif. Akses KPI unit satu divisi hanya mengungkap definisi KPI, bukan staf/nilai unit lain. Perubahan pilar memerlukan migration tambahan yang mempertahankan isi database; tidak menjalankan migrate:fresh atau reseed database pengguna.

Nilai bulan lalu yang belum tersedia ditampilkan sebagai keadaan kosong, bukan angka buatan. Nama “Contoh”/NIP DEMO berasal dari data latihan tersimpan di DB; tidak diubah menjadi nama karyawan rekaan untuk menyamarkan seeder.
