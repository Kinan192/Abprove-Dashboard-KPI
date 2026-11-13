# Design review KPI sederhana & periode

**Pembaruan 13 November 2026:** susunan daftar dan form telah dipisahkan sesuai koreksi pengguna. Daftar KPI/Goals mempunyai tombol Buat; tambah/edit membuka satu form scroll lengkap tanpa tabel daftar di bawahnya. Periode mengikuti pola yang sama. Halaman memakai [tema Simple Dashboard](../../docs/frontend/simple-dashboard/README.md). Tab KPI/Periode/Monitoring dan pemilih periode kini berada pada satu baris (pemilih di kanan), sehingga judul dan daftar naik satu baris. Penjelasan susunan satu halaman form+daftar di bawah ini merupakan riwayat sebelum koreksi tersebut.

Acuan layout dan alur KPI: `C:\Users\Kinan\Downloads\dgshfgs.html`. Form mengikuti susunan HTML dalam satu halaman scroll: Informasi KPI, Target & penilaian, Numerator/denominator & formula, Ditugaskan ke, lalu total bobot dan daftar KPI. Bulan penilaian tetap tersedia. Tipografi, warna, sidebar, navbar dan komponen memakai ABPROVE. Layout form bertab sebelumnya sudah diganti.

Acuan keputusan role: [ABPROVE-Design-Review-Revisi-KPI-Sederhana.md](ABPROVE-Design-Review-Revisi-KPI-Sederhana.md). Pekerjaan terbatas pada prototype KPI dan periode di design-review. **Instruksi pengguna berlaku untuk pekerjaan berikutnya: jangan generate gambar, screenshot, PNG/JPG, ilustrasi, video, atau aset visual baru.** Pengujian memakai interaksi browser dan ukuran DOM.

## Buka prototype

Gunakan `npm.cmd run start` seperti biasa, lalu buka:

| Layar | URL |
|---|---|
| Super HC — Master KPI | http://127.0.0.1:8000/design-review/hc/kpi |
| Super HC — Periode | http://127.0.0.1:8000/design-review/hc/pengaturan |
| Super HC — Monitoring KPI saja | http://127.0.0.1:8000/design-review/hc/kpi?screen=monitor |
| Kepala Unit — Penilaian Staf | http://127.0.0.1:8000/design-review/ku/nilai?redesign=kpi-sederhana |
| Kepala Divisi — Penilaian Kepala Unit | http://127.0.0.1:8000/design-review/kd/nilai-kepala?redesign=kpi-sederhana |
| Kepala Divisi — Persetujuan Staf | http://127.0.0.1:8000/design-review/kd/persetujuan?redesign=kpi-sederhana |

Semua halaman memakai shell dan komponen ABPROVE yang ada. Modul monitoring KPI berada di area prototype ini; dashboard aplikasi lainnya tetap memakai implementasi sebelumnya. Tidak ada tombol ganti role pada sidebar. Tautan per role di atas dipakai saat audit; gunakan browser dan origin yang sama agar data simulasi tersambung.

## Perubahan yang dapat diaudit

- Halaman KPI langsung menampilkan form **KPI Baru** lengkap dalam satu card, diikuti **Total bobot per karyawan** dan **Daftar KPI**, sesuai urutan HTML. Tabel memakai kolom Pilar, KPI & formula, Target, Penilaian, Bobot, Ditugaskan ke, Tindakan, dengan pagination 5 baris.
- Empat bagian form tampil berurutan dan bisa discroll di dalam container utama dashboard. Tombol Edit pada tabel memuat data ke form yang sama; Tambah KPI/Simpan perubahan memperbarui daftar dan total bobot. Tidak perlu membuka tab atau halaman lanjutan untuk melengkapi satu KPI.
- Dua pilihan penilaian: **Nilai manual oleh penilai (integer 10–100)** dan **Otomatis dari formula**. Definisi persentase/jumlah lama tetap dapat dibaca; saat diedit, definisi otomatis diadaptasi menjadi formula tanpa mengubah snapshot penilaian sebelumnya.
- Super HC menentukan variabel A–Z, nama input yang tampil kepada penilai, sumber diisi penilai/angka tetap, formula, satuan, target, arah capaian, bobot, dan konfigurasi konversi simulasi. KPI dapat dikaitkan ke KPI Kepala Unit dalam divisi dan bulan yang sama sebagai referensi turunan.
- Editor menyediakan tombol variabel/operator/fungsi, kritik dan rekomendasi formula di samping editor, pemeriksaan struktur, peringatan, serta uji angka contoh. Panel kritik mengikuti scroll area formula pada desktop dan turun di bawah editor pada layar lebih kecil.
- Pada bagian Ditugaskan ke, HC memilih unit/jabatan lalu mencentang penerima. Total bobot tersimpan tampil per karyawan dan bulan di bawah form, seperti HTML acuan. Bobot tidak 100% diperingatkan dan memblokir pengiriman penilaian.
- Pemilih periode bulan tersedia pada daftar/detail/penilaian/monitoring. Buat KPI memakai bulan yang sedang dipilih. Form KPI juga menampilkan field periode secara eksplisit. Pengaturan bulan lain tidak menyalin angka aktual. KPI yang telah digunakan harus dibuat sebagai definisi baru jika diperlukan untuk bulan lain.
- Kepala Unit hanya mengisi staf unitnya: Draft → Kirim → Menunggu ACC. Kepala Divisi ACC langsung Selesai atau mengembalikan dengan alasan. Tidak ada keputusan HC.
- Kepala Divisi memiliki dua tab: menilai Kepala Unit langsung (Draft → Selesaikan Penilaian), serta review/ACC staf. Tidak ada self-assessment Kepala Unit.
- Master KPI Kepala Divisi dapat dibuat, tetapi **tidak membentuk lembar atau menetapkan penilai Kepala Divisi**.
- Penilaian menampilkan satu KPI per panel agar input dan hasil tetap terbaca. Tombol KPI 1/2/3 mempertahankan isian dalam memori. Nilai total dihitung dari semua panel, bukan hanya yang sedang terlihat. Catatan/bukti disimpan per KPI.
- Pengaturan Periode langsung menampilkan satu form scroll: Informasi periode, Jadwal penilaian, Kategori nilai, lalu Daftar periode. Tambah/edit berjalan pada form yang sama tanpa drawer. Bulan, empat jadwal WIB, status Direncanakan/Aktif/Ditutup dan batas kategori tetap tersedia. Periode dengan hasil Selesai dikunci.
- Master dapat diedit/dihapus dengan konfirmasi. Snapshot Draft/pengajuan yang sudah dikerjakan dan hasil Selesai tidak ditulis ulang; lembar yang belum dimulai mengikuti definisi terkini. Total bobot 100% dan data lengkap wajib sebelum pengiriman/penyelesaian.

## Perhitungan untuk simulasi

| Contoh | Hasil pengukuran | Skor contoh | Nilai berbobot |
|---|---:|---:|---:|
| 65 tiket sesuai SLA / 80 tiket, target 95%, bobot 15% | 81,25% | 85,53 | 12,83 |
| 3 dokter / 4 direncanakan, target 95%, bobot 20% | 75% | 78,95 | 15,79 |
| 8 kegiatan / target 10, bobot 25% | 8 kegiatan | 80 | 20 |
| Manual 85, bobot 10% | — | 85 | 8,50 |
| Uptime `(A - B) / A * 100`, A = 43.200 menit, B = 60 menit, target 99,5%, bobot 100% | 99,86% | 100 | 100 |

Konversi otomatis adalah **usulan untuk preview**, bukan penggantian rumus produksi RS. Skala otomatis dapat diatur pada konfigurasi KPI; manual tetap 10–100. Arah menurun tidak diberi rumus diam-diam: HC harus memilih aturan usulan non-nol secara terpisah. Target nol memerlukan aturan khusus yang dipilih eksplisit. Pembanding nol, input kosong, atau aturan belum ditetapkan menampilkan `—` dan keterangan, serta memblokir penyelesaian.

## Skenario audit singkat

1. Pada Master KPI, pilih November. Isi Informasi KPI dan Target & penilaian, lalu scroll ke Numerator/denominator & formula. Beri nama variabel, uji angka dan pilih rekomendasi bila sesuai. Scroll ke Ditugaskan ke, pilih unit/jabatan dan centang penerima, lalu Tambah KPI. Periksa total bobot dan tabel di bawah form.
2. Pada Ditugaskan ke, pilih jabatan Kepala Divisi; lihat keterangan bahwa penilainya belum ditentukan.
3. Buka Penilaian Staf sebagai Kepala Unit IT, pilih staf berstatus Perlu Revisi. Isi KPI SLA 65/80, pelatihan 8, dan manual 85 pada panel masing-masing. Total 83,83. Simpan Draft atau Kirim.
4. Buka Persetujuan Staf sebagai Kepala Divisi. Angka hanya baca. Kembalikan dengan alasan, ajukan ulang dari KU, lalu Setujui; penilaian langsung Selesai.
5. Buka Penilaian Kepala Unit sebagai KD. Pilih kepala Pelayanan Medis, isi dokter 3 (pembanding 4 terkunci), manual koordinasi 85 dan mutu 85. Total 83,79. Selesaikan langsung sebagai KD.
6. Buka Monitoring KPI HC. Hanya tersedia Lihat hasil; tidak ada Input, ACC, atau Finalisasi.
7. Edit/hapus master yang digunakan penilaian Selesai dan pastikan snapshot hasil sebelumnya tetap terbaca. Coba pembanding 0 atau bobot tidak 100%; jangan sampai tampil hasil palsu atau dapat diselesaikan.
8. Buat periode baru, lalu KPI uptime berbobot 100% untuk satu staf IT saja. Gunakan A = total menit, B = downtime, pilih rekomendasi Uptime, lalu uji 43.200 dan 60. Simpan, isi penilaian sebagai KU dan ACC sebagai KD. Uji angka pada editor tidak ikut mengisi lembar staf.
9. Kembali ke November dan periksa bahwa KPI periode baru tidak tercampur. Edit formula setelah hasil Selesai, lalu periksa bahwa snapshot hasil dan riwayat Oktober tetap sama.

## Aturan editor formula

- Operator: `+`, `-`, `*`, `/`, `^`, kurung dan perbandingan `>`, `<`, `>=`, `<=`, `==`, `!=`.
- Fungsi: `IF`, `ROUND`, `MIN`, `MAX`, `ABS`. Contoh `ROUND(A / B * 100, 2)` atau `IF(B > 0, A / B * 100, 0)` jika aturan nol tersebut memang dipilih HC.
- Maksimal 26 variabel bernama A–Z, formula 1.200 karakter, kedalaman kurung/fungsi 40. Formula diparsing melalui AST; tidak menggunakan `eval` atau `new Function`.
- Variabel tidak dikenal, fungsi tidak didukung, input kosong, pembagian nol, dan hasil non-finite menampilkan kesalahan. Angka tetap berasal dari konfigurasi HC dan tidak bisa ditimpa penilai.
- Formula menghitung **realisasi**. Konversi menjadi nilai memakai target/arah/skala yang dikonfigurasi, kemudian nilai berbobot = nilai × bobot / 100. Pemeriksaan struktur bukan pengesahan ketentuan bisnis formula.
- Rekomendasi baru diterapkan setelah tombol **Pakai** dipilih. Peringatan rasio persen menyediakan **Kalikan 100**; tidak ada koreksi formula diam-diam.
- Master KPI Kepala Divisi tetap dapat disiapkan. Penilai Kepala Divisi belum ditentukan, sehingga prototype tidak membentuk lembar penilaian untuk role itu.

Data hanya tersimpan pada key browser `abprove.design-review.kpi-sederhana.v1`, terpisah dari prototype Goals sebelumnya. **Reset data contoh** hanya mereset key tersebut setelah konfirmasi. Batas role diuji pada perilaku prototype; autentikasi dan kebijakan server operasional tidak diganti oleh simulasi ini. Tidak ada request mutasi ke API bisnis.

## Sumber dan pengujian tanpa gambar

Kode halaman: `resources/views/design-review/kpi-periode.blade.php`. Logika UI/perhitungan: `resources/js/design-review/kpi-periode/`. CSS: `resources/css/design-review/kpi-periode.css`, memakai komponen dan palet ABPROVE yang ada.

```powershell
npm.cmd run build
npm.cmd run test:kpi-prototype
```

Alias `npm.cmd run test:goals-prototype` mengarah ke suite baru. Playwright menonaktifkan screenshot, trace dan video; pengujian responsivitas memeriksa ukuran DOM pada 1440, 768 dan 390 px. Hasil browser: [test-report.json](test-report.json).

Verifikasi revisi form scroll: build Vite berhasil, **39 tes perhitungan/aturan dan 8 skenario browser lulus**. Browser memeriksa urutan form/total bobot/daftar, CRUD pada halaman yang sama, variabel tetap/manual, IF, token operator, rekomendasi dan perbaikan formula, penerima individual, dua jalur penilaian, batas role, periode terpisah, snapshot, responsivitas, serta isian yang tetap utuh saat pagination dan pembatalan navigasi. Seluruh skenario memastikan tidak ada error JavaScript dan tidak ada request mutasi API bisnis. Pengujian tidak menghasilkan gambar.

## Pemeriksaan desain revisi formula

Arah desain mengikuti susunan HTML acuan dengan shell dan design system ABPROVE: ENERGY 1, RHYTHM 2, MOTION 1. Empat bagian dipisahkan garis dan nomor dalam satu form; perbedaan kolom dipakai untuk panel kritik formula. Scroll vertikal sengaja dipakai sesuai instruksi terbaru khusus KPI/periode. Font monospace hanya untuk ekspresi. Badge dipakai untuk status/validasi dan bobot.

- PASS, fungsi: suite browser merekam empat bagian form sekaligus, tambah/hapus variabel, sumber tetap, token formula, rekomendasi, koreksi, CRUD, pemilih bulan, penerima, kirim, revisi dan ACC. Pagination tidak menghapus isian; konfirmasi pindah halaman dapat dibatalkan.
- PASS, tata letak: ukuran DOM diuji pada 1440, 768 dan 390 px, termasuk formula dengan angka tetap, penerima dan form periode. Urutan form/total bobot/tabel diperiksa, tidak ada overflow horizontal halaman maupun grid formula, dan container utama dapat discroll. Tombol pagination minimal 44 px dan submit periode diuji dengan keyboard.
- PASS, state: loading dan kegagalan pemuatan memakai host prototype; data kosong dan validasi inline memakai komponen yang ada; input tidak valid memblokir simpan/kirim sesuai tahapnya. Penilaian Selesai tetap hanya baca.
- PASS, konsistensi: hanya modul KPI/periode yang memuat editor dan CSS tambahan. Sidebar/navbar, palet, font, komponen tabel dan dialog ABPROVE dipakai kembali; tidak menambah aset visual, pergantian role, self-assessment, bonus/minus nilai, atau tahap keputusan HC dari HTML contoh.
- PASS, bukti hasil: angka uji berasal dari input contoh yang diberi label simulasi; hasil lama diuji tidak berubah. Tidak ada klaim bahwa perubahan prototype ini sudah terintegrasi ke database atau API produksi.
