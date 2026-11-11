# Alur KPI v1.3 - perubahan yang disetujui

Dasar: PDF review 12 halaman yang disetujui pengguna dan arahan terbaru. Berlaku untuk frontend yang disetujui dan kontrak backend v2. Binding data backend ke frontend belum dijalankan.

## Urutan persiapan Super HC

1. Akun: hanya Super HC, Kepala Divisi dan Kepala Unit. Nama, NIP/email, role, status dan sandi awal. Akun staf tidak dibuat.
2. Jabatan: HC menambahkan jabatan pekerjaan. Jabatan berbeda dari role akses akun.
3. Divisi: pilih akun Kepala Divisi aktif yang sudah dibuat dan belum memimpin divisi lain.
4. Unit: pilih divisi induk dan akun Kepala Unit aktif yang sudah dibuat dan belum memimpin unit lain.
5. Staf: masukkan identitas, NIP, jabatan dan unit; tanpa email login, password atau akun.
6. KPI Unit: HC mengisi indikator, target/formula dan bobot untuk KU menilai staf pada unit tersebut.
7. KPI Divisi: HC mengisi indikator, target/formula dan bobot untuk KD menilai kepala unit di divisi tersebut.
8. Periode: tentukan bulan yang dinilai, jadwal pengisian/persetujuan, kategori, buka dan tutup periode.

## Penilaian tanpa penyimpanan sementara

KU memilih staf, mengisi semua nilai 10-100, mengajukan dengan konfirmasi. KD meninjau angka staf tanpa mengubah, lalu ACC langsung Final atau mengembalikan dengan alasan wajib. KU memperbaiki dan mengajukan ulang.

KD mengisi semua KPI Divisi untuk Kepala Unit, kemudian menetapkan langsung Final. Tidak ada tahap simpan Draft, status Draft, autosave input penilaian atau persetujuan HC.

Form belum dikirim hanya berada dalam memori halaman. Meninggalkan form menampilkan peringatan; jika dibuang, isinya tidak disimpan. Pembatalan pengajuan mengembalikan status Belum diisi dan menghapus nilai pengajuan setelah konfirmasi, bukan membuat Draft.

## KPI dan histori

HC menyusun definisi KPI; KU/KD hanya mengisi angka penilaian. Bobot tepat 100%. KPI berlaku per Unit atau per Divisi dan memiliki versi/masa berlaku. Pratinjau tidak menyimpan definisi. Terapkan membuat versi terbit, sedangkan snapshot penilaian yang sudah digunakan tetap dipertahankan. Perubahan yang menabrak periode penilaian terpakai diblokir.

KPI bukan lagi penempatan bebas per orang/jabatan. Jabatan mengklasifikasikan staf. Halaman Cakupan KPI menjelaskan Unit -> staf dan Divisi -> Kepala Unit.

## Cakupan dan perubahan struktur

Penanggung jawab ditetapkan dari akun yang sudah ada. Form struktur tidak membuat akun baru diam-diam. Perpindahan staf dan pergantian kepala memperlihatkan asal/tujuan, alasan, dampak serta konfirmasi. Nonaktif tidak menghapus histori. Laporan menggabungkan jenis Staf dan Kepala Unit sesuai hak akses; analitik memakai Final dan peringkat hanya pada versi KPI yang sebanding.

## Batas integrasi berikutnya

Backend v2 sudah mengimplementasikan kirim lengkap atomik, KPI scoped Unit/Divisi, akun kepala terpisah dari staf dan pembatalan tanpa Draft. Schema dan endpoint baru diuji pada MySQL terisolasi. Source/database lama dipertahankan; migrasi data dan binding frontend mengikuti handoff v2.

Unlock Final, penilaian Kepala Divisi, akses hasil pribadi staf dan delegasi tetap belum ditetapkan.
