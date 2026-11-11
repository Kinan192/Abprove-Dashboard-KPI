# Baseline layout disetujui

**Catatan revisi 10 November 2026:** arahan UI terbaru pengguna menggantikan penguncian komposisi/CSS layout-1.0. Implementasi aktif dan bukti terbaru ada di [revisi UI v4](../revision-v4/README.md). Manifest dan penjelasan di bawah tetap menjadi riwayat persetujuan sebelumnya.

Pengguna menyetujui layout saat ini pada 10 November 2026 WIB sebagai baseline sementara layout-1.0. Source sudah diterapkan di Laravel Blade dan Tailwind. Snapshot, ukuran dan hash sumber ada pada [manifest](manifest.json).

Perubahan schema/backend selanjutnya memakai baseline ini. Integrasi data boleh mengganti state dan binding formulir; perubahan visual besar memerlukan arahan baru. Data bisnis frontend saat persetujuan masih lokal di browser.

Backend v2 selesai tanpa perubahan pada 55 source baseline. [Pemeriksaan browser setelah revisi backend](qa/verification.json), [validasi backend](../../backend/v2/VALIDATION.md).

Integrasi v3 mengubah binding JS/Blade sesuai permintaan pengguna. Snapshot 55 file asli tetap dipertahankan; hash CSS, font dan aset tetap menjadi penjaga visual. Perubahan sumber untuk API dan penghapusan label simulasi dicatat terpisah pada docs/backend/v3/source-manifest.json. Pengujian aplikasi nyata ada di docs/backend/v3/browser-report.json, mencakup halaman tiap role pada tiga viewport. /design-review tetap memakai state lokal khusus audit.
