# Routes v3

Sumber aktif routes/web.php. [Daftar runtime JSON](routes-runtime.json), [kontrak endpoint lengkap](../backend/v2/README.md).

Seluruh route bisnis menggunakan web/CSRF, guard Better Auth, konteks role dan schema.v2. GET HTML dirender Blade; JSON serta mutasi memerlukan domain v2 dan migration auth. GET /{unit|division|hc}/data/workspace menyediakan DTO terikat scope untuk aplikasi berakun. Tidak ada endpoint draft/start/submit parsial/publish terpisah atau finalisasi HC.

Role prefix: unit, division, hc. CRUD organisasi/KPI/periode berada pada hc. Pengisian staff ada di unit; pengisian Kepala Unit serta approve/return/bulk staff ada di division. Profil/notifikasi tersedia pada prefix sesuai role. Source route:list diambil setelah route cache dibangun.
