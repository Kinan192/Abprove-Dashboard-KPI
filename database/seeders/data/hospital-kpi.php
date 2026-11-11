<?php

// Targets and names are fictional fixtures for testing. Every metric uses a percentage.
$items = static function (array $metrics, string $area): array {
    $metrics[] = ['Dokumentasi', 'Kelengkapan bukti kinerja', 'Entri laporan dengan bukti yang dapat ditelusuri', 'Entri laporan '.$area.' yang diperiksa', '95%'];
    $metrics[] = ['Tindak Lanjut', 'Penyelesaian tindak lanjut tepat waktu', 'Tindak lanjut selesai sesuai tenggat', 'Tindak lanjut '.$area.' yang jatuh tempo', '90%'];
    $weights = [30, 25, 20, 15, 10];

    return array_map(static function (array $metric, int $weight): array {
        [$pillar, $name, $numerator, $denominator, $target] = $metric;

        return [
            'pillar' => $pillar,
            'name' => $name,
            'numerator' => $numerator,
            'denominator' => $denominator,
            'measurement_formula' => 'Pembilang ÷ penyebut × 100%. Jika penyebut nol, tandai tidak berlaku pada rekap sumber.',
            'target_text' => '≥ '.$target,
            'weight_percent' => $weight,
        ];
    }, $metrics, $weights);
};

$unit = static fn (string $name, array $jobs, array $metrics): array => [
    'name' => $name,
    'jobs' => $jobs,
    'items' => $items($metrics, $name),
];
$division = static fn (string $name, array $metrics, array $units): array => [
    'name' => $name,
    'items' => $items($metrics, $name),
    'units' => $units,
];

return [
    $division('Pelayanan Medik', [
        ['Tata Kelola Klinis', 'Reviu mutu pelayanan unit', 'Reviu mutu selesai sesuai jadwal', 'Reviu mutu terjadwal', '95%'],
        ['Ketersediaan Layanan', 'Pemenuhan jadwal petugas', 'Jadwal yang terisi sesuai rencana', 'Jadwal petugas yang ditetapkan', '98%'],
        ['Koordinasi Klinis', 'Evaluasi hambatan rujukan', 'Hambatan rujukan dengan hasil evaluasi', 'Hambatan rujukan yang dieskalasi', '95%'],
    ], [
        $unit('Instalasi Gawat Darurat', ['Dokter Jaga IGD', 'Perawat Triase', 'Petugas Administrasi IGD'], [
            ['Mutu Layanan', 'Kelengkapan asesmen awal', 'Kunjungan dengan asesmen awal lengkap', 'Kunjungan IGD yang diaudit', '95%'],
            ['Ketepatan Waktu', 'Triase sesuai standar waktu internal', 'Kunjungan dengan triase sesuai batas waktu internal', 'Kunjungan yang membutuhkan triase', '95%'],
            ['Koordinasi Klinis', 'Dokumentasi serah terima rujukan', 'Rujukan dengan serah terima terdokumentasi', 'Rujukan dari IGD', '95%'],
        ]),
        $unit('Rawat Jalan Medik', ['Dokter Poliklinik', 'Asisten Pelayanan Poliklinik'], [
            ['Ketepatan Waktu', 'Kesiapan sesi poliklinik', 'Sesi mulai sesuai jadwal', 'Sesi poliklinik terjadwal', '90%'],
            ['Dokumentasi Klinis', 'Kelengkapan catatan kunjungan', 'Catatan kunjungan terisi lengkap', 'Catatan kunjungan yang diaudit', '95%'],
            ['Koordinasi Klinis', 'Pencatatan rencana tindak lanjut', 'Kunjungan dengan rencana tindak lanjut tertulis', 'Kunjungan yang membutuhkan kontrol', '95%'],
        ]),
        $unit('Rawat Inap Medik', ['Dokter Ruangan', 'Koordinator Pelayanan Rawat Inap'], [
            ['Dokumentasi Klinis', 'Kelengkapan ringkasan pulang', 'Ringkasan pulang terisi lengkap', 'Ringkasan pulang yang diaudit', '98%'],
            ['Ketepatan Waktu', 'Reviu harian pasien sesuai jadwal', 'Reviu harian tercatat sesuai jadwal', 'Reviu harian yang dijadwalkan', '95%'],
            ['Koordinasi Klinis', 'Konfirmasi rencana pulang', 'Rencana pulang dikonfirmasi ke tim terkait', 'Pasien dengan rencana pulang', '95%'],
        ]),
        $unit('Kamar Operasi', ['Perawat Instrumen', 'Perawat Sirkuler'], [
            ['Keselamatan Pasien', 'Kelengkapan daftar periksa operasi', 'Operasi dengan daftar periksa lengkap', 'Operasi yang diaudit', '100%'],
            ['Ketepatan Waktu', 'Persiapan ruang sebelum operasi', 'Ruang siap sesuai jadwal', 'Jadwal operasi elektif', '95%'],
            ['Ketertelusuran', 'Pencatatan set instrumen', 'Set instrumen dengan catatan pemakaian lengkap', 'Set instrumen yang digunakan', '98%'],
        ]),
        $unit('Pelayanan Intensif', ['Dokter Pelayanan Intensif', 'Perawat Perawatan Intensif'], [
            ['Dokumentasi Klinis', 'Kelengkapan catatan pemantauan', 'Giliran jaga dengan catatan lengkap', 'Giliran jaga yang diaudit', '98%'],
            ['Koordinasi Klinis', 'Kelengkapan serah terima pasien intensif', 'Serah terima dengan data wajib lengkap', 'Serah terima yang diaudit', '95%'],
            ['Kesiapan Sarana', 'Pemeriksaan alat sebelum giliran jaga', 'Giliran jaga dengan bukti cek alat', 'Giliran jaga yang wajib melakukan cek alat', '98%'],
        ]),
        $unit('Rehabilitasi Medik', ['Fisioterapis', 'Terapis Okupasi'], [
            ['Mutu Layanan', 'Pencatatan hasil sesi terapi', 'Sesi dengan catatan hasil lengkap', 'Sesi terapi yang terlaksana', '95%'],
            ['Evaluasi Layanan', 'Asesmen ulang sesuai jadwal', 'Asesmen ulang diselesaikan sesuai jadwal', 'Asesmen ulang yang dijadwalkan', '90%'],
            ['Komunikasi Pasien', 'Dokumentasi edukasi latihan mandiri', 'Pasien dengan bukti edukasi', 'Pasien yang membutuhkan latihan mandiri', '95%'],
        ]),
    ]),
    $division('Keperawatan', [
        ['Perencanaan SDM', 'Pemenuhan kebutuhan perawat per giliran', 'Giliran dengan kebutuhan tenaga terpenuhi', 'Giliran jaga yang direncanakan', '98%'],
        ['Mutu Asuhan', 'Reviu hasil audit asuhan', 'Laporan audit yang direviu Kepala Unit', 'Laporan audit asuhan yang diterima', '95%'],
        ['Pengembangan Tim', 'Pemenuhan rencana pembinaan', 'Sesi pembinaan terlaksana', 'Sesi pembinaan yang direncanakan', '90%'],
    ], [
        $unit('Keperawatan Rawat Inap', ['Perawat Pelaksana Rawat Inap', 'Perawat Penanggung Jawab Shift'], [
            ['Dokumentasi Asuhan', 'Kelengkapan catatan asuhan', 'Catatan asuhan lengkap', 'Catatan asuhan yang diperiksa', '95%'],
            ['Keselamatan Pasien', 'Dokumentasi pemeriksaan identitas', 'Tindakan dengan verifikasi identitas tercatat', 'Tindakan yang diaudit', '100%'],
            ['Komunikasi Tim', 'Kelengkapan serah terima giliran', 'Serah terima dengan informasi wajib lengkap', 'Serah terima yang diaudit', '95%'],
        ]),
        $unit('Keperawatan Rawat Jalan', ['Perawat Poliklinik', 'Perawat Edukasi Pasien'], [
            ['Kesiapan Layanan', 'Kesiapan alat poliklinik', 'Sesi dengan daftar periksa alat lengkap', 'Sesi poliklinik terjadwal', '98%'],
            ['Dokumentasi Asuhan', 'Kelengkapan asesmen keperawatan', 'Asesmen yang lengkap', 'Kunjungan yang membutuhkan asesmen', '95%'],
            ['Komunikasi Pasien', 'Pencatatan edukasi pasien', 'Edukasi pasien yang tercatat', 'Kunjungan dengan edukasi terencana', '95%'],
        ]),
    ]),
    $division('Penunjang Diagnostik', [
        ['Ketepatan Waktu', 'Reviu hasil pemantauan waktu diagnostik', 'Laporan waktu layanan ditinjau', 'Laporan waktu layanan terjadwal', '95%'],
        ['Mutu Diagnostik', 'Penyelesaian evaluasi penyimpangan mutu', 'Evaluasi penyimpangan selesai tepat waktu', 'Penyimpangan mutu yang perlu evaluasi', '95%'],
        ['Ketersediaan Layanan', 'Kepatuhan jadwal pemeliharaan alat', 'Pemeliharaan selesai sesuai jadwal', 'Pemeliharaan alat terjadwal', '98%'],
    ], [
        $unit('Laboratorium Klinik', ['Analis Teknologi Laboratorium Medik', 'Petugas Penerimaan Spesimen'], [
            ['Ketertelusuran', 'Kelengkapan identifikasi spesimen', 'Spesimen berlabel dan tercatat lengkap', 'Spesimen yang diperiksa', '98%'],
            ['Ketepatan Waktu', 'Rilis hasil laboratorium sesuai SLA', 'Hasil rutin dirilis dalam SLA internal', 'Pemeriksaan laboratorium rutin selesai', '95%'],
            ['Mutu Diagnostik', 'Pencatatan kendali mutu internal', 'Sesi pemeriksaan dengan log kendali mutu lengkap', 'Sesi yang wajib mencatat kendali mutu', '100%'],
        ]),
        $unit('Radiologi', ['Radiografer', 'Petugas Administrasi Radiologi'], [
            ['Mutu Diagnostik', 'Citra diterima tanpa pengulangan', 'Pemeriksaan dengan citra diterima pertama kali', 'Pemeriksaan pencitraan yang ditinjau', '96%'],
            ['Ketepatan Waktu', 'Penyelesaian antrean pemeriksaan terjadwal', 'Pemeriksaan yang dimulai sesuai jadwal', 'Pemeriksaan pencitraan terjadwal', '90%'],
            ['Keselamatan Pasien', 'Kelengkapan daftar periksa radiologi', 'Pemeriksaan dengan daftar periksa lengkap', 'Pemeriksaan yang mensyaratkan daftar periksa', '98%'],
        ]),
    ]),
    $division('Farmasi dan Perbekalan', [
        ['Ketersediaan', 'Ketersediaan obat prioritas', 'Item prioritas tersedia pada tanggal pemantauan', 'Item prioritas pada daftar pemantauan', '97%'],
        ['Mutu Layanan', 'Reviu laporan pelayanan resep', 'Laporan pelayanan resep selesai direviu', 'Laporan resep yang dijadwalkan', '95%'],
        ['Pengendalian Persediaan', 'Penyelesaian evaluasi risiko kedaluwarsa', 'Item berisiko dengan rencana penanganan', 'Item berisiko yang teridentifikasi', '98%'],
    ], [
        $unit('Farmasi Rawat Jalan', ['Apoteker Pelayanan', 'Tenaga Teknis Kefarmasian'], [
            ['Ketepatan Waktu', 'Penyelesaian resep dalam SLA', 'Resep selesai sesuai standar waktu internal', 'Resep yang dilayani', '90%'],
            ['Keselamatan Pasien', 'Dokumentasi verifikasi resep', 'Resep dengan catatan verifikasi lengkap', 'Resep yang diaudit', '98%'],
            ['Komunikasi Pasien', 'Pencatatan konseling obat', 'Penyerahan obat dengan bukti konseling', 'Penyerahan obat yang membutuhkan konseling', '95%'],
        ]),
        $unit('Gudang Farmasi', ['Petugas Stok Obat', 'Petugas Distribusi Farmasi'], [
            ['Pengendalian Persediaan', 'Kesesuaian stok fisik dengan sistem', 'Item dengan jumlah fisik sesuai sistem', 'Item yang dihitung', '98%'],
            ['Ketertelusuran', 'Pencatatan bets dan kedaluwarsa', 'Penerimaan dengan bets dan kedaluwarsa tercatat', 'Penerimaan obat yang memerlukan pencatatan bets', '100%'],
            ['Ketepatan Waktu', 'Distribusi obat sesuai jadwal', 'Permintaan obat dipenuhi sesuai tenggat', 'Permintaan distribusi obat yang jatuh tempo', '95%'],
        ]),
    ]),
    $division('Mutu dan Keselamatan', [
        ['Tata Kelola Mutu', 'Reviu indikator prioritas', 'Indikator prioritas dengan hasil reviu', 'Indikator prioritas yang terjadwal', '95%'],
        ['Manajemen Risiko', 'Penyelesaian analisis insiden sesuai tenggat', 'Analisis insiden diselesaikan tepat waktu', 'Analisis insiden yang jatuh tempo', '95%'],
        ['Audit Internal', 'Pemenuhan kalender audit internal', 'Audit internal selesai sesuai kalender', 'Audit internal yang dijadwalkan', '90%'],
    ], [
        $unit('Manajemen Mutu', ['Analis Mutu Layanan', 'Auditor Internal Mutu'], [
            ['Mutu Data', 'Validasi data indikator bulanan', 'Data indikator lolos validasi', 'Data indikator yang diperiksa', '95%'],
            ['Ketepatan Waktu', 'Distribusi hasil audit tepat waktu', 'Laporan audit didistribusikan sesuai tenggat', 'Laporan audit yang jatuh tempo', '95%'],
            ['Audit Internal', 'Kelengkapan dokumentasi audit', 'Audit dengan catatan dan bukti lengkap', 'Audit internal yang selesai', '98%'],
        ]),
        $unit('Keselamatan Pasien', ['Petugas Keselamatan Pasien', 'Analis Risiko Klinis'], [
            ['Manajemen Risiko', 'Kelengkapan kaji awal insiden', 'Insiden dengan kaji awal lengkap', 'Insiden yang masuk daftar kaji awal', '98%'],
            ['Ketepatan Waktu', 'Distribusi rekomendasi insiden', 'Rekomendasi disampaikan sesuai tenggat', 'Rekomendasi yang jatuh tempo', '95%'],
            ['Pencegahan', 'Verifikasi perbaikan keselamatan', 'Perbaikan dengan bukti verifikasi', 'Perbaikan yang selesai dilaporkan', '90%'],
        ]),
    ]),
    $division('Administrasi Pasien', [
        ['Akses Layanan', 'Reviu waktu tunggu administrasi', 'Rekap waktu tunggu ditinjau Kepala Unit', 'Rekap waktu tunggu yang dijadwalkan', '95%'],
        ['Mutu Data', 'Penyelesaian koreksi data pasien', 'Koreksi data pasien selesai sesuai tenggat', 'Koreksi data pasien yang jatuh tempo', '95%'],
        ['Pengalaman Pasien', 'Eskalasi keluhan lintas unit', 'Keluhan lintas unit diteruskan sesuai SLA', 'Keluhan yang perlu diteruskan lintas unit', '95%'],
    ], [
        $unit('Pendaftaran dan Admisi', ['Petugas Pendaftaran', 'Petugas Admisi Rawat Inap'], [
            ['Mutu Data', 'Kelengkapan data pendaftaran', 'Pendaftaran dengan data wajib lengkap', 'Pendaftaran yang diaudit', '98%'],
            ['Ketepatan Waktu', 'Pendaftaran dalam SLA loket', 'Pendaftaran selesai sesuai SLA loket', 'Pendaftaran yang selesai dilayani', '90%'],
            ['Ketertelusuran', 'Verifikasi dokumen admisi', 'Admisi dengan verifikasi dokumen tercatat', 'Admisi yang membutuhkan verifikasi', '98%'],
        ]),
        $unit('Layanan Pelanggan', ['Petugas Informasi Pasien', 'Petugas Penanganan Keluhan'], [
            ['Pengalaman Pasien', 'Respons awal keluhan dalam SLA', 'Keluhan yang ditanggapi sesuai SLA', 'Keluhan yang diterima', '95%'],
            ['Dokumentasi', 'Kelengkapan log keluhan', 'Keluhan dengan kategori dan status lengkap', 'Keluhan yang tercatat', '98%'],
            ['Ketepatan Waktu', 'Penyelesaian permintaan informasi', 'Permintaan informasi selesai sesuai tenggat', 'Permintaan informasi yang jatuh tempo', '95%'],
        ]),
    ]),
    $division('Rekam Medis dan Informasi', [
        ['Mutu Data', 'Reviu mutu rekam medis', 'Rekap mutu rekam medis selesai direviu', 'Rekap mutu yang dijadwalkan', '95%'],
        ['Pengendalian Akses', 'Reviu permintaan akses rekam medis', 'Permintaan akses diperiksa sesuai prosedur', 'Permintaan akses yang diajukan', '100%'],
        ['Ketepatan Waktu', 'Penyelesaian backlog dokumen', 'Dokumen backlog diselesaikan sesuai tenggat', 'Dokumen backlog pada rencana kerja', '90%'],
    ], [
        $unit('Pengodean Klinis', ['Koder Rawat Inap', 'Koder Rawat Jalan'], [
            ['Mutu Data', 'Ketepatan kode pada audit sampel', 'Berkas dengan kode sesuai hasil audit', 'Berkas pengodean yang diaudit', '95%'],
            ['Ketepatan Waktu', 'Pengodean selesai sesuai SLA', 'Berkas dikodekan dalam SLA', 'Berkas lengkap yang siap dikodekan', '95%'],
            ['Koordinasi', 'Penyelesaian klarifikasi kode', 'Klarifikasi kode selesai sesuai tenggat', 'Klarifikasi kode yang jatuh tempo', '90%'],
        ]),
        $unit('Arsip Rekam Medis', ['Petugas Arsip Medis', 'Petugas Digitalisasi Berkas'], [
            ['Ketertelusuran', 'Kesesuaian indeks dan berkas arsip', 'Berkas cocok dengan indeks penyimpanan', 'Berkas arsip yang diaudit', '98%'],
            ['Ketepatan Waktu', 'Pemenuhan permintaan berkas', 'Permintaan berkas dipenuhi sesuai SLA', 'Permintaan berkas yang berwenang', '95%'],
            ['Mutu Data', 'Validasi hasil digitalisasi', 'Berkas digital lolos pemeriksaan keterbacaan', 'Berkas yang didigitalisasi', '98%'],
        ]),
    ]),
    $division('Keuangan', [
        ['Ketepatan Waktu', 'Pemenuhan jadwal tutup buku', 'Tahap tutup buku diselesaikan tepat waktu', 'Tahap tutup buku yang dijadwalkan', '95%'],
        ['Pengendalian Keuangan', 'Reviu selisih rekonsiliasi', 'Selisih yang ditinjau dan ditindaklanjuti', 'Selisih yang teridentifikasi', '95%'],
        ['Pengelolaan Klaim', 'Reviu klaim tertunda', 'Klaim tertunda dengan penanggung jawab dan tenggat', 'Klaim tertunda yang perlu ditangani', '95%'],
    ], [
        $unit('Akuntansi', ['Staf Buku Besar', 'Staf Rekonsiliasi'], [
            ['Mutu Data', 'Kelengkapan bukti jurnal', 'Jurnal dengan dokumen pendukung yang sah', 'Jurnal yang diaudit', '98%'],
            ['Ketepatan Waktu', 'Rekonsiliasi sesuai jadwal', 'Akun direkonsiliasi tepat waktu', 'Akun dalam jadwal rekonsiliasi', '95%'],
            ['Pengendalian Keuangan', 'Penyelesaian koreksi jurnal', 'Koreksi jurnal diselesaikan sesuai tenggat', 'Koreksi jurnal yang jatuh tempo', '95%'],
        ]),
        $unit('Penagihan dan Klaim', ['Verifikator Klaim', 'Petugas Penagihan'], [
            ['Mutu Klaim', 'Kelengkapan berkas klaim saat pengajuan', 'Pengajuan lolos cek kelengkapan awal', 'Pengajuan klaim yang diverifikasi', '95%'],
            ['Ketepatan Waktu', 'Klaim terkirim sebelum tenggat', 'Klaim terkirim tepat waktu', 'Klaim siap kirim yang jatuh tempo', '95%'],
            ['Pengendalian Piutang', 'Pencatatan tindak lanjut piutang', 'Piutang jatuh tempo dengan catatan tindak lanjut', 'Piutang yang jatuh tempo', '90%'],
        ]),
    ]),
    $division('SDM dan Diklat', [
        ['Tata Kelola SDM', 'Reviu pembaruan data pegawai', 'Pembaruan data pegawai lolos reviu', 'Pembaruan data yang masuk jadwal reviu', '98%'],
        ['Pengembangan SDM', 'Realisasi rencana pengembangan kompetensi', 'Program pengembangan terlaksana', 'Program pengembangan yang direncanakan', '90%'],
        ['Layanan Internal', 'Reviu layanan administrasi SDM', 'Rekap layanan SDM ditinjau Kepala Unit', 'Rekap layanan SDM terjadwal', '95%'],
    ], [
        $unit('Administrasi SDM', ['Staf Data Kepegawaian', 'Staf Administrasi Personalia'], [
            ['Mutu Data', 'Kelengkapan berkas kepegawaian', 'Berkas dengan dokumen wajib lengkap', 'Berkas pegawai yang diaudit', '98%'],
            ['Ketepatan Waktu', 'Penyelesaian perubahan data pegawai', 'Perubahan data selesai sesuai tenggat', 'Permintaan perubahan data yang jatuh tempo', '95%'],
            ['Tata Kelola SDM', 'Pemantauan dokumen berkala', 'Dokumen berkala yang statusnya ditinjau', 'Dokumen berkala dalam daftar pemantauan', '98%'],
        ]),
        $unit('Pendidikan dan Pelatihan', ['Koordinator Pelatihan', 'Administratur Pelatihan'], [
            ['Pengembangan SDM', 'Pelaksanaan sesi pelatihan', 'Sesi terlaksana sesuai jadwal', 'Sesi pelatihan terjadwal', '90%'],
            ['Mutu Data', 'Pencatatan hasil pelatihan', 'Peserta dengan kehadiran dan hasil tercatat', 'Peserta yang menyelesaikan pelatihan', '98%'],
            ['Evaluasi', 'Pengumpulan evaluasi peserta', 'Peserta dengan evaluasi terisi', 'Peserta yang diminta mengisi evaluasi', '90%'],
        ]),
    ]),
    $division('Sarana dan Umum', [
        ['Keandalan Sarana', 'Pemenuhan rencana pemeliharaan fasilitas', 'Pemeliharaan preventif diselesaikan', 'Pemeliharaan preventif terjadwal', '95%'],
        ['Layanan Internal', 'Pemantauan permintaan perbaikan prioritas', 'Permintaan prioritas dengan status tindak lanjut', 'Permintaan perbaikan prioritas yang diterima', '98%'],
        ['Mutu Lingkungan', 'Reviu hasil inspeksi lingkungan', 'Hasil inspeksi direviu sesuai jadwal', 'Hasil inspeksi yang dijadwalkan', '95%'],
    ], [
        $unit('Pemeliharaan Fasilitas', ['Teknisi Listrik', 'Teknisi Mekanikal Gedung'], [
            ['Keandalan Sarana', 'Penyelesaian inspeksi preventif', 'Inspeksi preventif selesai tepat waktu', 'Inspeksi preventif terjadwal', '95%'],
            ['Ketepatan Waktu', 'Respons permintaan perbaikan dalam SLA', 'Permintaan dengan respons awal sesuai SLA', 'Permintaan perbaikan yang diterima', '95%'],
            ['Ketertelusuran', 'Pencatatan hasil perbaikan', 'Perintah kerja selesai dengan hasil tercatat', 'Perintah kerja perbaikan yang selesai', '98%'],
        ]),
        $unit('Sanitasi', ['Petugas Sanitasi Lingkungan', 'Petugas Pengelolaan Limbah'], [
            ['Mutu Lingkungan', 'Kelengkapan inspeksi sanitasi', 'Inspeksi sanitasi dengan daftar periksa lengkap', 'Inspeksi sanitasi yang dijadwalkan', '95%'],
            ['Ketertelusuran', 'Pencatatan serah terima limbah', 'Serah terima limbah dengan bukti lengkap', 'Serah terima limbah yang dilakukan', '100%'],
            ['Ketepatan Waktu', 'Penyelesaian temuan kebersihan', 'Temuan kebersihan selesai sesuai tenggat', 'Temuan kebersihan yang jatuh tempo', '95%'],
        ]),
    ]),
    $division('Teknologi Informasi', [
        ['Keandalan Sistem', 'Reviu gangguan layanan TI', 'Gangguan prioritas dengan hasil reviu', 'Gangguan prioritas yang perlu direviu', '95%'],
        ['Tata Kelola Perubahan', 'Evaluasi perubahan sistem terencana', 'Perubahan dengan bukti pengujian dan evaluasi', 'Perubahan terencana yang diterapkan', '98%'],
        ['Keamanan Informasi', 'Reviu akses akun aplikasi', 'Akses akun diperiksa sesuai jadwal', 'Akses akun dalam daftar reviu', '98%'],
    ], [
        $unit('Aplikasi Rumah Sakit', ['Analis Aplikasi SIMRS', 'Staf Dukungan Aplikasi'], [
            ['Layanan Internal', 'Penyelesaian tiket aplikasi dalam SLA', 'Tiket aplikasi ditutup dalam SLA', 'Tiket aplikasi yang selesai', '90%'],
            ['Mutu Rilis', 'Kelengkapan pengujian sebelum rilis', 'Rilis dengan bukti uji lengkap', 'Rilis aplikasi yang diterapkan', '98%'],
            ['Dokumentasi', 'Pencatatan solusi tiket berulang', 'Tiket berulang yang memiliki panduan solusi', 'Tiket berulang yang teridentifikasi', '95%'],
        ]),
        $unit('Infrastruktur TI', ['Administrator Jaringan', 'Administrator Server'], [
            ['Keandalan Sistem', 'Keberhasilan pencadangan terjadwal', 'Pencadangan terjadwal yang berhasil', 'Pencadangan yang dijadwalkan', '98%'],
            ['Keamanan Informasi', 'Penyelesaian pembaruan keamanan', 'Pembaruan keamanan selesai sesuai tenggat', 'Pembaruan keamanan yang jatuh tempo', '95%'],
            ['Ketepatan Waktu', 'Respons gangguan jaringan sesuai SLA', 'Gangguan dengan respons awal sesuai SLA', 'Gangguan jaringan yang dilaporkan', '95%'],
        ]),
    ]),
    $division('Pengadaan dan Logistik', [
        ['Perencanaan', 'Reviu pemenuhan rencana pengadaan', 'Rekap rencana pengadaan selesai direviu', 'Rekap pengadaan yang dijadwalkan', '95%'],
        ['Ketersediaan', 'Pemenuhan barang operasional prioritas', 'Permintaan barang prioritas dipenuhi tepat waktu', 'Permintaan barang prioritas yang jatuh tempo', '95%'],
        ['Pengendalian Persediaan', 'Reviu selisih persediaan barang', 'Selisih persediaan dengan tindak lanjut tercatat', 'Selisih yang teridentifikasi', '98%'],
    ], [
        $unit('Pengadaan Barang', ['Petugas Pembelian', 'Staf Evaluasi Pemasok'], [
            ['Ketepatan Waktu', 'Penerbitan pesanan sesuai tenggat', 'Pesanan diterbitkan sesuai tenggat', 'Permintaan pembelian lengkap yang jatuh tempo', '95%'],
            ['Ketertelusuran', 'Kelengkapan dokumen pengadaan', 'Transaksi pengadaan dengan dokumen lengkap', 'Transaksi pengadaan yang diperiksa', '98%'],
            ['Mutu Pemasok', 'Penyelesaian evaluasi pemasok', 'Evaluasi pemasok diselesaikan', 'Evaluasi pemasok yang dijadwalkan', '95%'],
        ]),
        $unit('Gudang Umum', ['Petugas Penerimaan Barang', 'Petugas Persediaan Umum'], [
            ['Pengendalian Persediaan', 'Kesesuaian stok barang operasional', 'Item dengan stok fisik sesuai sistem', 'Item yang dihitung', '98%'],
            ['Ketertelusuran', 'Pencatatan penerimaan barang', 'Penerimaan dengan bukti dan jumlah tercatat lengkap', 'Penerimaan barang yang diperiksa', '98%'],
            ['Ketepatan Waktu', 'Pengeluaran barang dalam SLA', 'Permintaan pengeluaran dilayani sesuai SLA', 'Permintaan pengeluaran barang yang lengkap', '95%'],
        ]),
    ]),
];
