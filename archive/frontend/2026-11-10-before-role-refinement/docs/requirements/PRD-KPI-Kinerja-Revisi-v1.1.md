# PRD KPI Kinerja

## Sistem Penilaian Kinerja Bulanan

**Versi 1.1 | 8 November 2026 | Revisi kebutuhan dan acuan implementasi**

Status: draft untuk review SDM dan IT. Perubahan yang dinyatakan sebagai keputusan pengguna sudah dimasukkan; butir OPEN tetap membutuhkan keputusan pemilik produk sebelum implementasi terkait.

KPI Kinerja adalah aplikasi internal rumah sakit untuk penilaian bulanan berbasis KPI jabatan. Kepala Unit mengisi nilai, Kepala Divisi meninjau dan menyetujui, lalu Super HC memfinalkan. Aplikasi mendukung banyak divisi, banyak Kepala Divisi, banyak unit, dan banyak Kepala Unit dengan cakupan anggota masing-masing.

### Perubahan utama versi ini

- Super HC mengelola Divisi & Tim, kepala divisi, unit, kepala unit, dan penempatan anggota secara eksplisit.
- Contoh hierarki: Divisi Umum & SDM membawahi Unit SDM, Logistik, dan IT. Setiap unit memiliki penanggung jawabnya sendiri.
- Kepala Divisi hanya meninjau anggota pada unit dalam naungannya; Kepala Unit hanya mengisi nilai anggota unitnya. Pembatasan berlaku pada seluruh akses data.
- Pemindahan anggota dan pergantian penanggung jawab memiliki konfirmasi, peninjauan dampak, dan audit. Histori Final tidak dipindahkan atau ditulis ulang.
- Desktop menggunakan sidebar dan navbar tetap, dengan konten dalam container dashboard. Halaman setiap role terpisah; sidebar tidak memuat tombol ganti role atau mode demo.
- UI mengikuti palet design system dengan komposisi visual 60% netral, 30% hijau pucat, dan 10% teal. Viewport desain dibuat konsisten.
- Prototype FigCraft menjadi acuan interaksi dan tampilan. Prototype belum membuktikan autentikasi, penyimpanan, atau otorisasi backend.

### Cara membaca

P0 = wajib untuk pilot; P1 = rilis lanjutan; P2 = penyempurnaan. KEPUTUSAN = arahan pengguna terbaru. USUL = rincian desain yang perlu ditinjau. OPEN = keputusan yang belum ditetapkan. ID kebutuhan lama dipertahankan; ORG dan kebutuhan tim baru ditambahkan.

Dokumen ini mengonsolidasikan PRD sumber 7 November 2026 dengan arahan pengguna dan desain FigCraft terbaru. Bukan catatan bahwa aplikasi produksi telah selesai.

<!-- pagebreak -->

## 1. Masalah, tujuan, dan cakupan

Penilaian saat ini tersebar di Excel/Google Sheets menurut jabatan atau unit. Rekap, tindak lanjut, dan revisi sulit dipantau. Sistem baru menyediakan satu lembar per karyawan per bulan, rumus seragam, alur persetujuan, struktur organisasi, dan audit.

| Sasaran | Metrik | Target awal |
|---|---|---|
| Tepat waktu | Pengajuan sebelum batas pengisian | Minimal 95% |
| Siklus cepat | Seluruh penilaian Final sejak awal bulan pemrosesan | Maksimal 15 hari |
| Pengisian mudah | Rata-rata waktu per karyawan | Maksimal 3 menit |
| Rekap terpusat | Rekap bulanan manual yang masih dibutuhkan | 0 setelah rollout |
| Ketertelusuran | Perubahan nilai, status, dan penempatan yang diaudit | 100% |

Target bisnis merupakan usulan awal dari PRD sumber dan perlu dikonfirmasi SDM. Pengukuran harus memakai data produksi/pilot, bukan angka ilustrasi prototype.

### Peran dan batas kewenangan

| Peran | Cakupan | Kewenangan utama |
|---|---|---|
| Super HC / SDM | Seluruh organisasi | Mengelola struktur dan akses, Master KPI, siklus, kategori, rekap, pengembalian, dan finalisasi |
| Kepala Divisi | Unit dan anggota pada divisi yang ditugaskan | Meninjau, menyetujui, mengembalikan, dan membaca dashboard divisinya |
| Kepala Unit | Anggota pada unit yang ditugaskan | Mengisi nilai, temuan, menyimpan draft, mengajukan, dan melihat pengajuan/riwayat |

Kepala Divisi tidak mengubah angka nilai dan tidak memfinalkan. Super HC tidak mengisi nilai atas nama Kepala Unit. Kepala Unit tidak mengubah Master KPI/bobot atau nilai yang sudah Disetujui/Final. Istilah "menilai" untuk Kepala Divisi pada kebutuhan terbaru berarti review dan keputusan persetujuan.

### Di luar rilis pertama

Penilaian 360 derajat, penilaian diri/kompetensi, payroll/bonus/remunerasi, pengambilan numerator/denominator otomatis dari SIMRS, dan goal/OKR berjenjang tidak termasuk. Akses karyawan untuk melihat nilai sendiri tetap OPEN.

<!-- pagebreak -->

## 2. Struktur organisasi dan cakupan tim

**KEPUTUSAN:** hierarki operasional adalah Super HC > Divisi > Unit > Anggota. Jabatan menjadi atribut anggota yang menentukan template KPI, bukan pengganti keanggotaan unit.

| Tingkat | Data dan hubungan | Contoh ilustrasi |
|---|---|---|
| Divisi | Nama, status aktif, penanggung jawab Kepala Divisi, daftar unit | Umum & SDM |
| Unit | Nama, divisi induk, status aktif, Kepala Unit, daftar anggota | SDM, Logistik, IT |
| Anggota / karyawan | Identitas, NIP, unit, jabatan, status penempatan | Anggota IT 01 pada Unit IT |
| Penugasan akun | Role, cakupan yang sah, status aktif, jejak perubahan | KD Umum & SDM; KU IT |

Divisi Umum & SDM dapat mempunyai satu Kepala Divisi yang membawahi tiga Kepala Unit. Kepala Unit IT mengisi nilai anggota IT; Kepala Divisi Umum & SDM meninjau penilaian dari SDM, Logistik, dan IT. Kepala Divisi lain hanya menangani divisinya sendiri. Struktur ini mendukung banyak penanggung jawab secara bersamaan pada area berbeda.

### Aturan struktur

1. Setiap unit mempunyai divisi induk yang jelas; setiap anggota mempunyai penempatan unit yang dapat ditelusuri.
2. Penugasan Kepala Divisi dan Kepala Unit dikelola Super HC melalui akun aktif dengan role yang sesuai.
3. Unit yang baru dibuat tidak otomatis memiliki anggota. Anggota dipilih dan ditempatkan secara eksplisit.
4. Form unit/anggota harus membawa divisi dan unit yang sedang dipilih; tidak boleh jatuh ke divisi contoh lain.
5. Cakupan turunan ditampilkan sebelum penyimpanan, termasuk siapa yang memperoleh tanggung jawab review/pengisian.
6. Struktur yang masih memiliki anggota atau penilaian tidak boleh dihapus dengan menghilangkan referensi. Penonaktifan dan penanganan dampak perlu ditinjau.

**USUL:** UI menggunakan satu penanggung jawab aktif per divisi dan per unit. Dukungan delegasi, pejabat pengganti, atau satu orang menangani beberapa area perlu keputusan lebih lanjut; jumlah divisi/unit tidak dibatasi menjadi satu secara global.

Satu orang dapat memiliki lebih dari satu role sesuai PRD awal. Pemilihan konteks untuk akun multi-role tetap OPEN karena UI terbaru memisahkan halaman role dan menghapus tombol ganti role pada sidebar; jangan mengembalikan pemilih role demo ke aplikasi.

<!-- pagebreak -->

## 3. Login dan alur penilaian

Login menggunakan email/NIP dan kata sandi. Backend memuat role dan penugasan sah, lalu mengarahkan ke beranda sesuai konteks akun. Pengguna tidak boleh memilih cakupan yang tidak dimilikinya melalui URL, parameter, atau menu.

Pemilih periode menampilkan bulan penilaian secara eksplisit. Bulan yang dinilai berbeda dari bulan pemrosesan, misalnya Oktober 2026 dinilai/diproses pada November 2026. Jadwal menggunakan WIB dan dapat dikonfigurasi Super HC.

| Status | Makna / pemilik tugas | Perpindahan yang diizinkan |
|---|---|---|
| Belum diisi | Belum ada nilai untuk periode; Kepala Unit | Mulai mengisi menjadi Draft |
| Draft | Dapat dikerjakan Kepala Unit dalam cakupannya | Simpan Draft atau ajukan jika lengkap |
| Diajukan | Menunggu Kepala Divisi | Setujui, kembalikan, atau ditarik Kepala Unit sebelum disetujui |
| Dikembalikan | Perlu revisi Kepala Unit | Perbaiki dan ajukan ulang |
| Disetujui | Menunggu Super HC | Finalkan atau kembalikan ke Kepala Unit |
| Final | Selesai dan terkunci | Hanya baca; alur unlock belum ditetapkan |

### Alur Kepala Unit

Login > Beranda > pilih periode > Isi Nilai > pilih anggota unit > isi KPI dan temuan > simpan Draft / ajukan > konfirmasi > pantau Pengajuan. Pengajuan yang belum Disetujui dapat ditarik menjadi Draft. Pengembalian ditindaklanjuti dari catatan, kemudian diajukan ulang.

### Alur Kepala Divisi

Login > Beranda > Persetujuan > pilih unit dalam divisinya > baca lembar nilai, selisih, temuan, dan riwayat > Setujui / Kembalikan. Pengembalian oleh Kepala Divisi wajib mempunyai alasan. Persetujuan belum mengunci penilaian sebagai Final.

### Alur Super HC

Siapkan struktur, akun, template, dan siklus > pantau progres > Rekap & Finalisasi > pilih penilaian Disetujui > tinjau > konfirmasi > Final. Super HC dapat mengembalikan ke Kepala Unit. Alasan wajib bagi pengembalian Super HC adalah USUL yang perlu dikonfirmasi.

Jadwal sumber mengusulkan batas 5/10/15; prototype memakai contoh 8/10/15. Semua tanggal adalah konfigurasi, bukan perubahan tenggat baku yang sudah disahkan.

<!-- pagebreak -->

## 4. Kebutuhan umum dan Kepala Unit

| ID | Kebutuhan | Prioritas |
|---|---|---|
| U-1 | Login email/NIP dan kata sandi; role serta cakupan berasal dari data pengguna/penugasan sah. | P0 |
| U-2 | Desktop: sidebar dan navbar tetap, konten di container dashboard. Ponsel/tablet: burger membuka drawer. Menu sesuai role; profil dan keluar tersedia; tanpa tombol ganti role demo. | P0 |
| U-3 | Pemilih periode di navbar; periode/lembar Final ditampilkan hanya baca. | P0 |
| U-4 | Panel notifikasi tugas dalam aplikasi, tetap dibatasi cakupan. Progres/tugas utama tidak bergantung pada panel ini. | P1 |
| U-5 | Bantuan pengisian, contoh perhitungan, dan kategori. | P1 |
| U-6 | Navigasi tanpa reload penuh, transisi singkat, dan dukungan reduced motion. | P1 |
| KU-1 | Beranda berisi progres unit, tenggat, tugas belum selesai, serta penilaian dikembalikan beserta catatan. | P0 |
| KU-2 | Daftar anggota unit dengan cari/filter; lembar KPI menampilkan pilar, target, bobot, nilai, hasil. | P0 |
| KU-3 | Total/kategori tampil langsung; Enter menuju KPI berikutnya. | P0 |
| KU-4 | Temuan positif dan negatif opsional, tidak memengaruhi total. | P0 |
| KU-5 | Simpan Draft, ajukan dengan konfirmasi, lalu lanjut ke anggota berikutnya yang perlu dikerjakan. | P0 |
| KU-6 | Salin nilai bulan lalu sebagai Draft untuk KPI yang cocok; perbedaan template/sumber dijelaskan. | P1 |
| KU-7 | Tab Pengajuan: Dikembalikan, Menunggu, Disetujui, Final, Belum diajukan; detail posisi dan tarik kembali sebelum disetujui. | P0 |
| KU-8 | Riwayat: tren unit, matriks anggota x bulan, klik lembar historis dan temuan. Bulan tanpa data tidak ditampilkan sebagai nol. | P1 |
| KU-9 | KPI Unit: template per jabatan, hanya baca. | P1 |
| KU-10 | Anggota Unit menampilkan unit/divisi induk, Kepala Unit, anggota, jabatan, dan status penilaian; dapat menuju Isi Nilai. Pengelolaan penempatan oleh Super HC. | P0 |

U-2 menggantikan ketentuan burger-only desktop pada sumber. U-4 tetap P1 untuk menyelesaikan perbedaan prioritas antara tabel sumber dan catatan notifikasi rilis pertama. Kanal email/WhatsApp tidak menjadi syarat pilot.

<!-- pagebreak -->

## 5. Kebutuhan Kepala Divisi dan Super HC

| ID | Kebutuhan | Prioritas |
|---|---|---|
| KD-1 | Beranda: antrean, tenggat, progres tiap unit dalam divisi. Pengiriman pengingat menunggu media dan keputusan implementasi. | P0 |
| KD-2 | Persetujuan per unit; tab Menunggu, Dikembalikan, Disetujui, Semua; penanda temuan. | P0 |
| KD-3 | Lembar hanya baca, selisih KPI yang sebanding dengan bulan lalu, tahapan dan riwayat. | P0 |
| KD-4 | Setujui/kembalikan dengan konfirmasi; alasan wajib untuk pengembalian; setelah sukses lanjut antrean. | P0 |
| KD-5 | Pilih beberapa penilaian Diajukan dan setujui sekaligus, dengan jumlah dan cakupan pilihan yang jelas. | P1 |
| KD-6 | Dashboard terbatas divisinya: filter yang sah, tren, rata-rata, kategori, dan rincian. | P1 |
| KD-7 | Tim Divisi menampilkan divisi, kepala, unit, Kepala Unit, dan anggota dalam naungan; menuju review penilaian. Tidak mengelola penempatan atau angka. | P0 |
| SDM-1 | Beranda organisasi: jumlah per status, progres divisi/unit, tenggat, aktivitas. | P0 |
| SDM-2 | Rekap: tab status, filter, detail, kembalikan; finalisasi satu/massal hanya untuk Disetujui, dengan konfirmasi dan penguncian. | P0 |
| SDM-3 | Salin rekap untuk ditempel ke Excel: nama, jabatan, unit, divisi, bulan, status, total, kategori, temuan. UI memakai format tabular; unduh .xlsx bukan klaim fitur yang sudah tersedia. | P0 |
| SDM-4 | Analitik: filter divisi/unit/jabatan/kategori; rata-rata, sebaran, tren 12 bulan, KPI per bulan, peringkat sebanding, temuan. | P1 |
| SDM-5 | Master KPI per jabatan/tahun: pilar, KPI, numerator, denominator, formula, target teks, bobot; tambah/edit/hapus baris dan validasi 100%. | P0 |
| SDM-6 | Impor Excel dengan pratinjau dan kesalahan per baris/template; tidak menyimpan data invalid. | P1 |
| SDM-7 | Atur jadwal siklus dan batas kategori, dengan validasi rentang dan konfirmasi perubahan. | P0 |
| SDM-8 | Pengguna & Struktur: akun, role, cakupan, karyawan, Divisi & Tim; dijabarkan dalam ORG-1 sampai ORG-12. | P0 |
| SDM-9 | Pengingat otomatis menjelang tenggat; kanal dan operasional ditetapkan kemudian. | P2 |

Analitik hasil menggunakan penilaian Final. Antrean/progres operasional menggunakan status proses, bukan menyamakan kategori hasil dengan status persetujuan. Peringkat hanya dalam kelompok jabatan/template yang sebanding.

<!-- pagebreak -->

## 6. Kebutuhan Divisi & Tim

Seluruh kebutuhan ORG berikut P0. Struktur multi-divisi harus didukung sejak arsitektur awal walaupun pilot operasional dimulai pada satu divisi.

| ID | Kebutuhan dan hasil yang diharapkan |
|---|---|
| ORG-1 | Daftar divisi dengan nama, Kepala Divisi, jumlah unit/anggota, dan status. Memilih divisi memperbarui rincian pada area kerja yang sama. |
| ORG-2 | Tambah/ubah divisi dan tetapkan akun Kepala Divisi yang sah. Divisi baru mempunyai empty state dan tindakan buat unit pertama. |
| ORG-3 | Tambah/ubah unit dengan divisi induk yang eksplisit dan Kepala Unit. Induk mengikuti divisi yang dipilih; tidak menggunakan induk contoh yang salah. |
| ORG-4 | Rincian unit menampilkan divisi induk, Kepala Divisi, Kepala Unit, anggota, NIP, dan jabatan. |
| ORG-5 | Pilih/tambahkan anggota dengan penempatan tujuan yang jelas; cegah penempatan aktif ganda yang tidak sah. |
| ORG-6 | Pindahkan anggota: asal, tujuan divisi/unit, penanggung jawab tujuan, alasan, peninjauan dampak, konfirmasi, dan hasil. |
| ORG-7 | Ganti Kepala Divisi/Kepala Unit melalui akun ber-role sesuai. Tampilkan cakupan tanggung jawab sebelum penetapan. |
| ORG-8 | Atur akun dan cakupan pada menu Pengguna; tampilkan unit turunan untuk Kepala Divisi dan unit spesifik untuk Kepala Unit. |
| ORG-9 | Tampilkan Tim Divisi dan Anggota Unit sebagai menu masing-masing role; akses pengelolaan tetap pada Super HC. |
| ORG-10 | Audit tambah/ubah/nonaktif struktur, penugasan kepala, penempatan dan pemindahan: pelaku, waktu, alasan bila relevan, nilai sebelum/sesudah. |
| ORG-11 | Penonaktifan struktur/akun tidak menghapus histori. Blokir atau arahkan penyelesaian anggota, kepala, dan penilaian aktif yang terdampak. |
| ORG-12 | Setelah penyimpanan nyata, daftar, jumlah anggota, cakupan, pencarian, dan tampilan role terkait diperbarui konsisten. Perubahan lintas entitas harus atomik atau gagal tanpa mutasi parsial. |

### Alur pengelolaan

Super HC membuka Pengguna & Struktur > Divisi & Tim > tambah/pilih divisi > tetapkan Kepala Divisi > tambah/pilih unit > tetapkan Kepala Unit > tempatkan anggota. Untuk pemindahan, tampilkan ringkasan dampak dan konfirmasi sebelum menyimpan.

Daftar kandidat kepala harus memeriksa role dan status akun. Daftar kandidat anggota harus memperlihatkan penempatan yang ada; penambahan dari unit lain diarahkan ke alur pemindahan yang eksplisit.

Rincian tanggal efektif, perlakuan penilaian aktif, dan penanganan delegasi tetap OPEN. Sistem tidak boleh menebak pemindahan penilaian aktif atau memberi akses tambahan secara diam-diam.

<!-- pagebreak -->

## 7. Aturan nilai, bobot, dan Final

Nilai per KPI adalah bilangan bulat 10 sampai 100, inklusif. Kosong, pecahan, negatif, 0, dan 101 ditolak saat pengajuan. Draft boleh disimpan sebelum lengkap. Validasi dilakukan di klien dan server.

Jika bobot disimpan dalam persen: **hasil KPI = nilai x bobot / 100**. Total bulanan adalah jumlah seluruh hasil KPI. Jika bobot disimpan sebagai fraksi, gunakan nilai x fraksi; jangan membagi dua kali. Representasi penyimpanan bobot/presisi harus ditetapkan tim IT.

| Contoh KPI lengkap | Nilai | Bobot | Hasil |
|---|---|---|---|
| Kunjungan Pasien UGD | 90 | 15% | 13,50 |
| Pencapaian Pelatihan | 80 | 10% | 8,00 |
| Implementasi Budaya Prima | 100 | 10% | 10,00 |
| Kepatuhan dokumentasi | 85 | 25% | 21,25 |
| Waktu tanggap layanan | 75 | 20% | 15,00 |
| Efisiensi sumber daya | 75 | 20% | 15,00 |
| Total | | 100% | 82,75 |

Contoh ini menggunakan enam KPI sesuai UI, sehingga total bukan penjumlahan contoh parsial tiga KPI pada sumber. Target KPI merupakan teks bebas, misalnya 95%, Tidak ada, 0 complaint, atau <20%.

| Kategori default usulan | Rentang |
|---|---|
| Sangat Baik | Nilai >= 90 |
| Baik | 80 <= nilai < 90 |
| Cukup | 70 <= nilai < 80 |
| Kurang | Nilai < 70 |

Total ditampilkan dua desimal dengan koma; nilai mentah disimpan tanpa pembulatan tampilan. Batas kategori dapat dikonfigurasi Super HC dan tidak boleh tumpang tindih. Temuan positif/negatif tidak masuk rumus.

Total bobot template harus tepat 100%. Final menyimpan salinan KPI, bobot, identitas template/versi, konteks organisasi, dan hasil saat itu. Perubahan master atau penempatan tidak mengubah histori Final. Tidak ada edit langsung terhadap Final; unlock hanya untuk Super HC dan belum boleh diaktifkan sebelum status lanjutan, persetujuan ulang, dan auditnya diputuskan.

<!-- pagebreak -->

## 8. Model data konseptual

Struktur ini adalah kontrak konseptual, bukan penetapan database/framework final. ID stabil harus dipakai sebagai referensi; nama akun/divisi pada prototype bukan kunci relasi.

| Entitas | Data utama dan hubungan |
|---|---|
| Divisi | id, nama, status aktif; hubungan unit dan penugasan kepala |
| Unit | id, divisi_id, nama, status aktif; hubungan anggota dan penugasan kepala |
| Pengguna | id, nama, email/NIP, kredensial/identitas SSO, status aktif |
| Penugasan akses | pengguna_id, role, divisi_id/unit_id sesuai role, status; tanggal efektif dan delegasi perlu keputusan |
| Karyawan | id, NIP, nama, jabatan_id, status; dapat memiliki atau tidak memiliki akun |
| Penempatan anggota | karyawan_id, unit_id, konteks divisi, jejak asal/tujuan dan perubahan; mekanisme efektif perlu keputusan |
| Jabatan | id, nama, hubungan template KPI yang berlaku; tidak menggantikan unit keanggotaan |
| Template KPI | id, nama, tahun/masa berlaku, jabatan_id, versi, daftar KPI dan total bobot |
| KPI | template_id, urutan, pilar, nama, numerator, denominator, formula, target teks, bobot |
| Penilaian | id, karyawan_id, periode unik, status, konteks organisasi/template, temuan, total dan metadata keputusan |
| Nilai KPI | penilaian_id, identitas/salinan KPI, nilai, bobot dan hasil |
| Riwayat / audit | referensi entitas, pelaku, role/cakupan saat tindakan, waktu, aksi, sebelum/sesudah, alasan |
| Pengaturan siklus | periode penilaian, tanggal buka, batas isi, batas setuju, tutup, batas kategori |

Satu karyawan mempunyai satu penilaian per bulan/tahun. Pemindahan anggota tidak membuat penilaian duplikat untuk periode sama. Akun dan karyawan dipisahkan agar anggota yang dinilai tidak diwajibkan mempunyai akun login.

Pilar tetap: Technical Care, Access, Coordination and Continuity, Interpersonal Care, Efficient. Nama dan bobot historis harus dapat dibaca meskipun master saat ini berubah/nonaktif.

Perubahan organisasi dan penugasan disimpan sebagai jejak yang dapat ditelusuri. Keputusan tentang tanggal efektif, kepala pengganti, dan akses histori lintas penempatan harus diselesaikan sebelum fitur tersebut dipakai pada data nyata.

<!-- pagebreak -->

## 9. Otorisasi, audit, dan pemindahan

**P0:** otorisasi dilakukan di server pada setiap operasi, bukan hanya menyembunyikan tombol. Daftar, pencarian/saran, jumlah agregat, filter, detail, riwayat, salin rekap, dan analitik harus menerapkan cakupan yang sama.

| Operasi | Kepala Unit | Kepala Divisi | Super HC |
|---|---|---|---|
| Baca penilaian operasional | Unit yang ditugaskan | Divisi yang ditugaskan | Seluruh organisasi |
| Isi angka/temuan | Sesuai cakupan dan status yang dapat diedit | Tidak | Tidak |
| Ajukan / tarik sebelum disetujui | Sesuai cakupan | Tidak | Tidak |
| Setujui / kembalikan | Tidak | Sesuai cakupan; alasan kembali wajib | Kembalikan sesuai alur Super HC |
| Finalkan | Tidak | Tidak | Hanya status Disetujui |
| Kelola struktur, kepala, anggota dan akun | Tidak | Tidak | Ya |
| Buka kunci Final | Tidak | Tidak | Menunggu keputusan alur |

Menebak ID anggota divisi lain atau mengganti parameter divisi/unit tidak boleh memberikan data/izin. Permintaan ditolak tanpa membocorkan informasi di luar cakupan. Ketika penugasan dicabut atau akun nonaktif, akses terkait harus berhenti berlaku.

### Peninjauan dampak perubahan

Sebelum pemindahan anggota atau pergantian kepala, UI menampilkan asal/tujuan, penanggung jawab, alasan bila relevan, dan penilaian aktif yang terdampak. Simpan perubahan serta audit secara konsisten. Setelah berhasil, data dan cakupan diperbarui lintas layar; kegagalan tidak boleh menghasilkan sukses palsu.

Histori Final mempertahankan konteks organisasi, KPI, dan bobot saat finalisasi. Kebijakan siapa yang boleh melihat histori setelah perpindahan masih OPEN; jangan otomatis memberi kepala baru akses ke seluruh histori di luar naungannya. Sampai kebijakan disahkan, hindari pelebaran akses lintas konteks.

Perubahan nilai, temuan, status dan struktur penting dicatat dengan waktu/pelaku. Riwayat tidak dapat diedit/dihapus pengguna. Konflik perubahan bersamaan harus ditampilkan sebagai konflik versi, dengan muat ulang dan peninjauan sebelum melanjutkan.

<!-- pagebreak -->

## 10. Kontrak UI dan prototype

**KEPUTUSAN:** desktop memakai sidebar 232 px dan navbar 64 px yang tetap. Konten utama berada dalam container dashboard dan scroll vertikal di dalamnya. Role memiliki halaman/beranda sendiri; tidak ada tombol ganti role pada sidebar atau pemilih role demo.

| Role | Menu / halaman utama |
|---|---|
| Kepala Unit | Login, Beranda, Isi Nilai, Pengajuan, Riwayat, KPI Unit, Anggota Unit |
| Kepala Divisi | Login, Beranda, Persetujuan, persetujuan massal, Dashboard Divisi, Tim Divisi dan rincian anggota |
| Super HC | Login, Beranda, Rekap & Finalisasi, Master KPI/editor/impor, Pengaturan, Pengguna, Karyawan, Divisi & Tim, rincian unit, Analitik |

Dialog mencakup tambah divisi/unit, penetapan kepala, tambah/pilih anggota, pemindahan beserta konfirmasi, cakupan akun, ajukan, setujui, kembalikan, finalkan, dan keluar. Dialog membawa konteks entitas yang benar.

Viewport desain: desktop 1440 x 900, ponsel 390 x 844, tablet 1024 x 900. Ukuran ini acuan mockup; implementasi tetap responsif terhadap layar pengguna. Dialog mengikuti isi. Target interaktif minimal 40 px, sentuh minimal 44 px.

Palet mengikuti DESIGN_SYSTEM.md: sekitar 60% #FFFFFF/#F8FAFA, 30% #EDF8F6/#D2EFEA/#F1F4F4, dan 10% teal #076C63/#087F73/#075A53. Rasio merupakan komposisi visual, bukan persentase mutlak piksel setiap layar. Teks #162833/#52616B, judul beraksen #0D3D39, border #E0E7E7; font Inter dengan fallback sistem.

Status memiliki label, tidak mengandalkan warna: Diajukan biru, Disetujui hijau, Dikembalikan warning, Final ungu, Draft/Belum diisi netral. Kategori hasil tidak disamakan dengan status proses. State loading, empty, error, validasi, konflik, akses ditolak, dan sesi habis harus tersedia.

Prototype terbaru mempunyai 240 frame dan laporan 28 skenario pengelolaan tim lulus. Itu bukti interaksi desain, bukan uji aplikasi produksi. Input, data, mutasi, dan sinkronisasi antar-role masih snapshot/simulasi. Implementasi harus memenuhi kebutuhan nyata dokumen ini, termasuk ORG-12.

<!-- pagebreak -->

## 11. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| Hak akses | Otorisasi server per role, penugasan dan konteks data; tidak ada kebocoran lewat URL/API, agregat atau salin rekap. |
| Kunci data | Final hanya baca dan historinya tetap; unlock diblokir sampai aturan lanjut disahkan. |
| Keamanan | HTTPS, kata sandi di-hash, sesi berakhir setelah 30 menit tidak aktif. SSO merupakan opsi yang perlu keputusan. |
| Audit | Seluruh perubahan nilai/status/catatan dan struktur/penugasan/penempatan yang penting terlacak. |
| Konsistensi | Satu penilaian per karyawan per periode; perubahan terkait tidak parsial; cegah kiriman ganda dan konflik versi. |
| Performa | Target sumber: halaman terbuka <2 detik untuk 500 karyawan; total terasa langsung. Ukur pada skenario/perangkat pilot yang disepakati. |
| Perangkat | Desktop untuk input utama; tablet/ponsel untuk lihat dan menyetujui. Pengisian mobile perlu validasi kegunaan tersendiri. |
| Lokalisasi | Bahasa Indonesia, desimal koma, dua desimal tampilan, periode jelas, zona WIB. |
| Aksesibilitas | Keyboard, fokus terlihat, label kontrol, dialog mengelola fokus, kontras teks normal minimal 4,5:1 dan besar 3:1; reduced motion. |
| Cadangan | Backup harian dan retensi minimal 5 tahun sesuai kebutuhan sumber; uji pemulihan sebelum rollout. |
| Notifikasi | Tugas/progres P0; panel notifikasi P1; pengingat otomatis/kanal luar aplikasi P2. Media pengingat manual masih perlu keputusan. |

### Penanganan kegagalan

Validasi menunjukkan field dan alasan yang dapat ditindaklanjuti. Simpan/persetujuan/finalisasi tidak menampilkan sukses sebelum server mengonfirmasi. Dalam kondisi pending, cegah submit ganda. Kegagalan jaringan tidak boleh mengubah data secara parsial atau membuat penilaian ganda.

Data yang berubah oleh pihak lain memerlukan muat ulang dan peninjauan. Pengguna yang kehilangan cakupan harus ditolak pada permintaan berikutnya; jangan hanya mengandalkan cache/menu lama.

Batas kategori default, target bisnis, dan kondisi ukur performa harus disepakati dalam pilot. Nilai pada prototype merupakan data ilustrasi dan tidak menjadi bukti pemenuhan NFR.

<!-- pagebreak -->

## 12. Kriteria penerimaan

Kriteria berikut diuji pada aplikasi yang dibangun, terpisah dari pengujian prototype.

| ID | Skenario dan hasil yang diwajibkan |
|---|---|
| AC-1 | Login akun Kepala Unit/Kepala Divisi/Super HC membuka konteks sah. URL atau parameter role/divisi lain tidak memperluas akses. |
| AC-2 | Super HC membuat dua divisi, menetapkan kepala berbeda, lalu membuat unit dan kepala masing-masing. Form menyimpan induk yang dipilih dengan benar. |
| AC-3 | Tempatkan anggota SDM, Logistik dan IT di Umum & SDM. Kepala Divisi terkait melihat ketiga unit, sedangkan kepala divisi lain tidak melihat data mereka. |
| AC-4 | KU IT melihat/mengisi anggota IT saja. Cari, filter, jumlah, detail, dan akses langsung anggota SDM/Logistik di luar unit ditolak. |
| AC-5 | Ganti kepala melalui akun aktif ber-role sesuai; akses penanggung jawab baru/lama mengikuti penugasan sah dan perubahan diaudit. |
| AC-6 | Unit kosong mempunyai empty state. Penempatan anggota memperbarui daftar, jumlah dan cakupan secara konsisten; gagal simpan tidak mengubah sebagian data. |
| AC-7 | Pemindahan menampilkan asal/tujuan dan dampak, memerlukan konfirmasi, tercatat di audit, tidak menggandakan penilaian, dan tidak mengubah histori Final. Aturan penilaian aktif mengikuti keputusan yang disahkan. |
| AC-8 | Nilai 10 dan 100 diterima; kosong/pecahan/0/101 ditolak saat ajukan. Draft belum lengkap dapat disimpan. Enam KPI contoh menghasilkan bobot 100% dan total 82,75. |
| AC-9 | Ajukan hanya jika lengkap; tarik kembali sebelum Disetujui menjadi Draft. Kepala Divisi tidak dapat mengedit angka; pengembalian tanpa alasan ditolak. |
| AC-10 | Finalisasi hanya dari Disetujui, satu/massal dengan jumlah benar dan konfirmasi. Nilai Final dan snapshot KPI/bobot terkunci. Unlock tidak mengubah status sebelum kebijakannya tersedia. |
| AC-11 | Perubahan Master KPI tidak mengubah Final lama. Impor invalid tidak tersimpan; batas kategori/jadwal invalid ditolak. |
| AC-12 | Desktop/tablet/ponsel, keyboard, dialog, scroll, konflik, error, sesi habis, audit, retensi dan pemulihan diuji. Sukses hanya setelah konfirmasi server. |

Pengujian pembatasan lintas divisi wajib dilakukan sebelum pilot, meskipun peserta pilot hanya satu divisi. Gunakan fixture divisi kedua untuk memastikan isolasi data sejak awal.

<!-- pagebreak -->

## 13. Rencana rilis dan keputusan terbuka

### Tahapan rilis

1. **Pilot satu divisi:** seluruh P0, termasuk model multi-divisi, penempatan dan otorisasi; operasional satu divisi berjalan berdampingan dengan Excel satu siklus. Syarat lanjut: hitungan seluruh anggota pilot cocok dengan Excel, siklus selesai sebelum tanggal 15, dan uji isolasi divisi kedua lulus.
2. **Seluruh rumah sakit:** aktifkan semua divisi/unit; tambah impor, dashboard dan riwayat P1. Penghentian Excel sebagai alat operasional ditetapkan setelah validasi dan kesiapan rollout. Syarat lanjut: minimal 95% pengajuan tepat waktu selama dua siklus berturut-turut.
3. **Penyempurnaan:** pengingat otomatis, kanal email/WhatsApp, dan laporan tahunan (P2/usulan sumber). Jadwal kalender belum ditetapkan.

### OPEN sebelum implementasi terkait

| ID | Keputusan yang diperlukan |
|---|---|
| O-1 | Apakah turunan target/KPI dari atasan ikut dinilai, dan bobotnya? |
| O-2 | Pengesahan batas kategori 90/80/70 dan target bisnis. |
| O-3 | Akses karyawan melihat nilainya sendiri; siapa menilai Kepala Unit/Kepala Divisi? |
| O-4 | Akun baru, SSO rumah sakit atau integrasi Mekari Talenta? |
| O-5 | Konteks login untuk akun multi-role/multi-penugasan tanpa tombol ganti role demo; delegasi dan pejabat pengganti. |
| O-6 | Tanggal efektif perubahan unit/kepala dan perlakuan Draft/Diajukan/Disetujui yang sudah aktif. |
| O-7 | Kebijakan akses histori setelah perpindahan anggota atau pergantian kepala. |
| O-8 | Status setelah unlock, persetujuan ulang, alasan dan audit; sampai disahkan fitur tetap nonaktif. |
| O-9 | Mutasi setelah tenggat: blokir atau pengecualian tercatat? |
| O-10 | Media pengingat manual/otomatis; alasan wajib pengembalian oleh Super HC. |
| O-11 | Presisi penyimpanan bobot/nilai, aturan versi dan masa berlaku template. |
| O-12 | Materi identitas resmi, resolusi laptop pilot, dan skenario ukur performa. |

Kepala Divisi hanya review/approve/return merupakan baseline UI terbaru; jika hendak memberi hak edit angka, diperlukan perubahan kebutuhan tersendiri. Butir OPEN bukan keputusan yang boleh diisi otomatis oleh implementasi.

<!-- pagebreak -->

## 14. Ketertelusuran dan acuan

### Ringkasan perubahan terhadap PRD sumber

| Area | Keadaan sumber | Revisi v1.1 |
|---|---|---|
| Tim/organisasi | SDM-8 dan entitas divisi/unit masih ringkas | ORG-1..12, penugasan kepala, anggota, pemindahan, isolasi cakupan, dan acceptance lintas divisi |
| Navigasi desktop | Burger-only dan ganti role di profil/menu | Sidebar/navbar tetap, container dashboard; page per role; konteks multi-role OPEN |
| Halaman role | Menu pengisian/persetujuan/rekap | Tambah Anggota Unit dan Tim Divisi; pengelolaan lengkap pada Super HC |
| Final dan mutasi | KPI/bobot historis dipertahankan | Konteks organisasi/penugasan dan dampak perpindahan diperjelas; kebijakan aktif/histori OPEN |
| Notifikasi | U-4 P1 tetapi NFR menyebut rilis pertama | Tugas/progres P0, panel P1, pengingat otomatis P2; kanal belum diasumsikan |
| Contoh nilai | Tiga KPI parsial | Enam KPI lengkap, bobot 100%, total 82,75 |
| Prototype | Acuan tampilan umum | Palet design system 60:30:10, viewport konsisten, interaksi tim; dibedakan dari kesiapan aplikasi |

### Sumber acuan

- PRD KPI Kinerja: Sistem Penilaian Kinerja Bulanan, 7 November 2026, 10 halaman, PDF sumber pada folder Downloads.
- DESIGN_SYSTEM.md dan UI_UX_BLUEPRINT.md pada folder Downloads. Arahan pengguna terbaru tentang navigasi, pemisahan role dan tim mengungguli bagian lama yang bertentangan.
- Arahan percakapan: sidebar/navbar tetap, seluruh konten di dashboard; ukuran konsisten; page per role; prototype interaktif; warna design system 60:30:10; multi-divisi/unit dan pengelolaan tim oleh Super HC.
- Desain: ../../design/prototypes/KPI-Kinerja-UIUX.figcraft.
- Handoff tim: ../design/TEAM_MANAGEMENT.md.
- Bukti prototype: ../design/reports/TEAM_PROTOTYPE_TESTS.json dan TEAM_UI_AUDIT.json.

Dokumen sumber dipertahankan. PRD v1.1 tersedia sebagai PDF untuk review dan Markdown untuk revisi lanjutan. Prioritas dan acceptance di sini adalah kebutuhan aplikasi, bukan klaim bahwa snapshot prototype sudah menjalankan penyimpanan dan keamanan server.
