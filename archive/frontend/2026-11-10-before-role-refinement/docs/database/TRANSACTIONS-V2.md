# Kontrak transaksi backend v2

Semua mutasi melalui session + CSRF + UUID request_id. Mutasi mengunci aktor, memuat ulang role/scope, memeriksa receipt UUID, lalu mengunci area/subject/assessment terkait dan menulis data, audit serta receipt dalam transaksi yang sama.

## Terapkan KPI

Kunci area Unit/Divisi -> pastikan kepala/area aktif -> kunci atau buat kpi_scope -> validasi seluruh item dan bobot 100 -> tentukan versi dari next_version -> periksa bulan belum memakai penilaian dan setelah versi terakhir -> tutup masa versi sebelumnya -> insert header belum tersegel -> insert semua item -> segel dan validasi trigger -> naikkan counter -> audit + receipt -> commit.

Tidak ada endpoint simpan draft. Import-preview tidak menulis database. Hapus versi hanya bila tidak direferensi assessment; hapus item/header dalam transaksi dan perbaiki rentang versi tetangga. Counter versi tidak dikurangi.

## Kirim penilaian

GET lembar hanya membaca subject, scope, cycle dan versi KPI. Form belum dikirim tidak memiliki baris database.

POST lengkap -> validasi jenis subject dari role server -> kunci cycle, area, subject/placement/assignment dan template -> periksa tenggat serta versi -> pastikan seluruh source item cocok tepat sekali -> hitung total DECIMAL server -> insert header submitted lengkap -> insert seluruh item dengan nilai NOT NULL -> untuk kepala unit, lengkapi kategori dan Final oleh KD -> audit + receipt -> commit. Tidak ada transaksi start/draft/submit terpisah.

Pengajuan pertama menggunakan employee_id untuk staf atau subject_user_id untuk kepala. Resubmission menggunakan assessment_id + lock_version, seluruh skor dan temuan. Field scope, bobot, total, status, kategori dan pelaku dari browser tidak dipercaya.

## KD review dan keputusan

KU tidak dapat mengubah submitted. KD membaca snapshot staf, kemudian return dengan alasan atau approve langsung Final. Bulk maksimal 100, seluruh batch berhasil atau seluruhnya rollback; kunci ID terurut. HC tidak dapat memberi angka, return, approve atau finalize.

Untuk Final, pastikan seluruh item lengkap, bobot 100, total cocok, kategori tepat satu, reviewer masih KD divisi. Tuliskan metadata Final sekaligus. Setelah itu header/item tidak dapat diedit atau dihapus.

## Pembatalan dan retry

KU hanya membatalkan pengajuan staf unitnya dalam jadwal. Kunci assessment submitted -> hapus item/header -> audit pembatalan dengan ID lama -> simpan receipt -> commit. GET subjek menjadi Belum diisi.

Replay UUID harus diperiksa sebelum lookup record yang sudah dihapus, sesudah memuat ulang aktor/konteks. Receipt hanya dikembalikan jika aktor, action, context dan hash payload identik. UUID salah memberi 409, bukan menerapkan operasi kedua. Response pembatalan berupa receipt, bukan baris draft.

## Struktur dan akun

Buat akun dahulu. Divisi/unit dan penugasan kepala dibuat dalam satu transaksi agar tidak tersisa area tanpa kepala akibat kegagalan. Staf dan penempatan awal juga atomik. Satu kepala aktif per akun/area dijaga constraint.

Transfer menggunakan bulan efektif, alasan dan expected_placement_id; tolak overlap atau pekerjaan non-Final pada rentang perubahan. Ganti kepala menggunakan expected_assignment_id dan alasan; blokir penilaian non-Final terdampak. Role akun sendiri tidak dapat diubah, akun sendiri tidak dapat dinonaktifkan/dihapus.

## Penguncian

Pertahankan urutan konsisten: aktor -> area induk -> area unit -> subject -> cycle/template -> assessment -> item. Serialize semua mutasi struktur/KPI yang menyentuh area lewat lock area yang sama. Deadlock di-retry terbatas; konflik lock_version tidak di-retry dengan menaikkan versi sendiri.

CHECK/FK tidak menggantikan validasi lintas baris/otorisasi. DDL schema dan migrasi tidak dijalankan sebagai bagian request bisnis.
