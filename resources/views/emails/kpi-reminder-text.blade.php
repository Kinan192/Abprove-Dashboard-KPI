ABprove | KPI Kinerja · RS Awal Bros Botania
PENGINGAT PENILAIAN BULANAN — {{ $period }}

Yth. {{ $recipientName }},
{{ $roleLabel }} — {{ $details['area'] ?? 'Cakupan penugasan Anda' }}

@if ($isUnitHead)
Mohon lengkapi dan ajukan penilaian KPI staf dalam lingkup unit Anda. Pastikan data pengukuran dan bukti pendukung sudah diperiksa sebelum pengajuan.

RINGKASAN TUGAS ANDA
Staf belum diajukan: {{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }} staf
Termasuk perlu perbaikan: {{ $details['secondary'] ?? 0 }} staf
@else
Mohon tinjau pengajuan penilaian staf serta lengkapi penilaian Kepala Unit dalam lingkup divisi Anda.

RINGKASAN TUGAS ANDA
Pengajuan menunggu persetujuan: {{ $details['secondary'] ?? 0 }}
Kepala Unit belum dinilai: {{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }}
@endif
Ringkasan berdasarkan data saat pengingat dikirim. Lihat aplikasi untuk progres terbaru.

@if ($hasDeadline)
{{ $overdue ? 'TENGGAT TELAH LEWAT' : ($isUnitHead ? 'BATAS PENGAJUAN' : 'BATAS TINDAK LANJUT') }}
{{ $dueLabel }}
@if ($overdue)
Ajukan perpanjangan kepada Super HC. Tanpa perpanjangan, penilaian yang belum selesai ditandai Tidak dinilai saat periode ditutup.
@endif

@endif
PESAN DARI ADMIN
{!! $reminder->message !!}

{{ $actionLabel }}:
{{ $actionUrl }}
@if ($headsUrl)

Lengkapi juga penilaian Kepala Unit:
{{ $headsUrl }}
@endif

Masuk menggunakan akun {{ $roleLabel }} Anda untuk melanjutkan.
@if ($localLink)
Lingkungan uji lokal: tautan hanya dapat dibuka di komputer tempat aplikasi berjalan.
@endif

Terima kasih atas kerja sama Anda.
Administrasi KPI Kinerja

Email otomatis dari ABprove | KPI Kinerja.
Anda menerima email ini berdasarkan penugasan dan preferensi notifikasi akun.
Kelola preferensi email: {{ $profileUrl }}
Untuk bantuan, hubungi Admin organisasi Anda.
