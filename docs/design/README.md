# Acuan desain

Acuan visual aktif: [Dashboard, 13 November 2026](../frontend/simple-dashboard/README.md), berdasarkan komposisi gambar dashboard pengguna dengan warna hijau ABprove yang dipertahankan. Dashboard adalah menu pertama tanpa Beranda; grafik frontend memakai Chart.js. File native acuan sebelumnya: [KPI-Kinerja-UIUX-Simple-Dashboard.figcraft](../../design/prototypes/KPI-Kinerja-UIUX-Simple-Dashboard.figcraft). Sumber 8 November tetap tersimpan. Daftar dan form KPI/periode berada pada layar terpisah; isi form tetap satu alur scroll.

Acuan terbaru KPI & periode: [design-review KPI](../../design-review/kpi-periode/README.md). Alur dan susunan KPI mengikuti `C:\Users\Kinan\Downloads\dgshfgs.html`: satu form scroll berisi Informasi KPI, Target & penilaian, Numerator/denominator & formula, dan Ditugaskan ke; dilanjutkan total bobot dan daftar KPI. Periode memakai form scroll utuh untuk bulan, jadwal, dan kategori, lalu daftar periode. Komponen, tipografi dan warna mengikuti ABPROVE. Keputusan akhir Kepala Divisi dan monitoring HC tetap mengikuti dokumen bisnis KPI sederhana; hasil masih prototype browser.

Instruksi pengguna untuk pekerjaan desain berikutnya: **jangan generate gambar, screenshot, PNG/JPG, ilustrasi, video, atau aset visual baru**. Gunakan HTML/CSS, komponen interaktif dan pemeriksaan DOM tanpa gambar.

Prototype khusus KPI / Goals dan Pengaturan Periode, 12 November 2026: [panduan review](REDESIGN-KPI-PERIODE-REVIEW.md). Dibuka pada `/design-review/hc/kpi` dan `/design-review/hc/pengaturan`; data simulasi berada di browser, sesuai pilihan pengguna sebelum integrasi backend.

Frontend aktif mengikuti ABprove dan [revisi layout/CRUD](../frontend/compact-crud/README.md). Dokumen FigCraft di bawah merupakan riwayat rancangan sebelumnya.

- Dokumen native historis: [FigCraft](../../design/prototypes/KPI-Kinerja-UIUX.figcraft).
- Preview: [Divisi & Tim](../../design/previews/Super-HC-Divisi-Tim.png), [Unit IT](../../design/previews/Super-HC-Unit-IT.png).
- Handoff: [Tim](TEAM_MANAGEMENT.md), [Layout](MODERN_LAYOUT.md).
- Pengujian: [laporan](PROTOTYPE_TEST_REPORT.md), [data rinci](reports/TEAM_PROTOTYPE_TESTS.json).
- Cadangan: ../../design/archive/.

Nama/path pada laporan historis dapat mencerminkan lokasi sebelum penataan; bukti JSON asli dipertahankan. Semua file baru terkait kode/schema ditaruh pada app/, database/ dan docs/; folder design/ bukan root aplikasi terpisah.
