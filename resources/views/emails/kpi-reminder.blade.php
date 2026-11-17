<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $reminder->subject }}</title>
    <style>
        body { margin:0; padding:0; }
        a { color:#065f46; }
        @media only screen and (max-width:480px) {
            .email-outer { padding:16px 8px !important; }
            .email-px { padding-left:20px !important; padding-right:20px !important; }
            .email-title { font-size:21px !important; line-height:29px !important; }
            .email-cell-x { padding-left:14px !important; padding-right:14px !important; }
            .email-button-wrap { width:100% !important; }
            .email-button { display:block !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;color:#334155;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
    <div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">Pengingat KPI {{ $period }} untuk {{ $recipientName }}. Lihat ringkasan tugas dan tenggat penilaian Anda.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f1f5f9">
        <tr><td class="email-outer" align="center" style="padding:32px 12px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
                {{-- Masthead: aksen emerald tipis + wordmark netral --}}
                <tr><td height="4" bgcolor="#047857" style="height:4px;font-size:0;line-height:0;background-color:#047857;border-radius:8px 8px 0 0">&nbsp;</td></tr>
                <tr><td class="email-px" style="padding:20px 32px;border-bottom:1px solid #e2e8f0">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                        <tr>
                            <td valign="middle" style="padding-right:12px;font-size:20px;font-weight:700;line-height:24px;letter-spacing:-0.3px;color:#0f172a;white-space:nowrap">ABprove</td>
                            <td valign="middle" width="1" bgcolor="#cbd5e1" style="width:1px;height:18px;background-color:#cbd5e1;font-size:0;line-height:0">&nbsp;</td>
                            <td valign="middle" style="padding-left:12px;font-size:14px;font-weight:600;line-height:24px;color:#475569;white-space:nowrap">KPI Kinerja</td>
                        </tr>
                    </table>
                </td></tr>

                {{-- Judul & penerima --}}
                <tr><td class="email-px" style="padding:32px 32px 0">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;line-height:18px;letter-spacing:0.8px;text-transform:uppercase;color:#047857">Pengingat penilaian bulanan</p>
                    <h1 class="email-title" style="margin:0 0 4px;font-size:24px;font-weight:700;line-height:32px;letter-spacing:-0.3px;color:#0f172a">{{ $isUnitHead ? 'Lengkapi penilaian KPI tim Anda' : 'Tindak lanjuti penilaian di divisi Anda' }}</h1>
                    @if ($period)<p style="margin:0;font-size:14px;line-height:22px;color:#64748b">Periode {{ $period }}</p>@endif
                </td></tr>
                <tr><td class="email-px" style="padding:24px 32px 0">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px">
                        <tr><td class="email-cell-x" style="padding:14px 18px">
                            <p style="margin:0 0 2px;font-size:12px;line-height:18px;color:#64748b">Kepada Yth.</p>
                            <p style="margin:0;font-size:16px;font-weight:700;line-height:24px;color:#0f172a;word-break:break-word;overflow-wrap:anywhere">{{ $recipientName }}</p>
                            <p style="margin:2px 0 0;font-size:13px;line-height:20px;color:#475569;word-break:break-word;overflow-wrap:anywhere">{{ $roleLabel }} &middot; {{ $details['area'] ?? 'Cakupan penugasan Anda' }}</p>
                        </td></tr>
                    </table>
                    <p style="margin:20px 0 0;font-size:15px;line-height:24px;color:#334155">{{ $isUnitHead ? 'Mohon lengkapi dan ajukan penilaian KPI staf dalam lingkup unit Anda. Pastikan data pengukuran dan bukti pendukung sudah diperiksa sebelum pengajuan.' : 'Mohon tinjau pengajuan penilaian staf serta lengkapi penilaian Kepala Unit dalam lingkup divisi Anda. Ringkasan berikut membantu Anda menentukan tindak lanjut yang diperlukan.' }}</p>
                </td></tr>

                {{-- Ringkasan tugas --}}
                <tr><td class="email-px" style="padding:28px 32px 0">
                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;line-height:20px;color:#0f172a">Ringkasan tugas Anda</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;border:1px solid #e2e8f0;border-radius:6px">
                        @if ($isUnitHead)
                            <tr>
                                <td class="email-cell-x" valign="middle" style="padding:14px 12px 14px 18px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:21px;color:#475569">Staf belum diajukan</td>
                                <td class="email-cell-x" valign="middle" align="right" style="padding:14px 18px 14px 8px;border-bottom:1px solid #e2e8f0;font-size:16px;font-weight:700;line-height:22px;color:#0f172a">{{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }} staf</td>
                            </tr>
                            <tr>
                                <td class="email-cell-x" valign="middle" style="padding:14px 12px 14px 18px;font-size:14px;line-height:21px;color:#475569">Termasuk perlu perbaikan</td>
                                <td class="email-cell-x" valign="middle" align="right" style="padding:14px 18px 14px 8px;font-size:16px;font-weight:700;line-height:22px;color:#0f172a">{{ $details['secondary'] ?? 0 }} staf</td>
                            </tr>
                        @else
                            <tr>
                                <td class="email-cell-x" valign="middle" style="padding:14px 12px 14px 18px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:21px;color:#475569">Pengajuan menunggu persetujuan</td>
                                <td class="email-cell-x" valign="middle" align="right" style="padding:14px 18px 14px 8px;border-bottom:1px solid #e2e8f0;font-size:16px;font-weight:700;line-height:22px;color:#0f172a">{{ $details['secondary'] ?? 0 }}</td>
                            </tr>
                            <tr>
                                <td class="email-cell-x" valign="middle" style="padding:14px 12px 14px 18px;font-size:14px;line-height:21px;color:#475569">Kepala Unit belum dinilai</td>
                                <td class="email-cell-x" valign="middle" align="right" style="padding:14px 18px 14px 8px;font-size:16px;font-weight:700;line-height:22px;color:#0f172a">{{ $details['pending'] ?? 0 }} dari {{ $details['total'] ?? 0 }}</td>
                            </tr>
                        @endif
                    </table>
                    <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:#64748b">Ringkasan berdasarkan data saat pengingat dikirim. Lihat aplikasi untuk progres terbaru.</p>
                </td></tr>

                {{-- Tenggat --}}
                @if ($hasDeadline)
                    <tr><td class="email-px" style="padding:20px 32px 0">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px">
                            <tr><td class="email-cell-x" style="padding:14px 18px">
                                <p style="margin:0 0 2px;font-size:12px;font-weight:700;line-height:18px;letter-spacing:0.6px;text-transform:uppercase;color:#92400e">{{ $overdue ? 'Tenggat telah lewat' : ($isUnitHead ? 'Batas pengajuan' : 'Batas tindak lanjut') }}</p>
                                <p style="margin:0;font-size:15px;font-weight:700;line-height:23px;color:#78350f">{{ $dueLabel }}</p>
                                @if ($overdue)<p style="margin:6px 0 0;font-size:13px;line-height:20px;color:#92400e">Silakan hubungi Admin atau Super HC untuk tindak lanjut jadwal penilaian.</p>@endif
                            </td></tr>
                        </table>
                    </td></tr>
                @endif

                {{-- Tindakan --}}
                <tr><td class="email-px" style="padding:28px 32px 0">
                    <table class="email-button-wrap" role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0">
                        <tr><td align="center" bgcolor="#047857" style="background-color:#047857;border-radius:6px">
                            <a class="email-button" href="{{ $actionUrl }}" style="display:inline-block;min-height:20px;padding:14px 28px;border:1px solid #047857;border-radius:6px;font-size:15px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;text-align:center">{{ $actionLabel }}</a>
                        </td></tr>
                    </table>
                    @if ($headsUrl)<p style="margin:14px 0 0;font-size:14px;line-height:22px"><a href="{{ $headsUrl }}" style="font-weight:600;color:#065f46;text-decoration:underline">Lengkapi juga penilaian Kepala Unit</a></p>@endif
                    <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#64748b">Masuk menggunakan akun {{ $roleLabel }} Anda untuk melanjutkan.</p>
                </td></tr>

                {{-- Pesan admin (terpisah, tenang) --}}
                <tr><td class="email-px" style="padding:28px 32px 0">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="border-top:1px solid #e2e8f0;padding-top:24px">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:700;line-height:18px;letter-spacing:0.6px;text-transform:uppercase;color:#64748b">Pesan dari Admin</p>
                        <p style="margin:0;padding:0 0 0 14px;border-left:3px solid #cbd5e1;font-size:14px;line-height:23px;color:#475569;word-break:break-word;overflow-wrap:anywhere">{!! nl2br(e($reminder->message)) !!}</p>
                    </td></tr></table>
                </td></tr>

                {{-- Penutup --}}
                <tr><td class="email-px" style="padding:28px 32px 28px">
                    <p style="margin:0;font-size:14px;line-height:22px;color:#334155">Terima kasih atas kerja sama Anda.</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:700;line-height:22px;color:#0f172a">Administrasi KPI Kinerja</p>
                </td></tr>

                {{-- Tautan cadangan --}}
                <tr><td class="email-px" bgcolor="#f8fafc" style="padding:18px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px">
                    <p style="margin:0 0 4px;font-size:12px;line-height:18px;color:#64748b">Jika tombol tidak dapat dibuka, gunakan tautan berikut:</p>
                    <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all;overflow-wrap:anywhere"><a href="{{ $actionUrl }}" style="color:#065f46;text-decoration:underline;word-break:break-all">{{ $actionUrl }}</a></p>
                    @if ($localLink)<p style="margin:10px 0 0;font-size:12px;line-height:18px;color:#92400e">Lingkungan uji lokal: tautan hanya dapat dibuka di komputer tempat aplikasi berjalan.</p>@endif
                </td></tr>
            </table>

            {{-- Footer --}}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td class="email-px" align="center" style="padding:20px 32px 0;font-size:12px;line-height:19px;color:#64748b">
                Email otomatis dari ABprove &middot; KPI Kinerja.<br>
                Anda menerima email ini berdasarkan penugasan dan preferensi notifikasi akun.<br>
                <a href="{{ $profileUrl }}" style="color:#475569;text-decoration:underline">Kelola preferensi email</a> &middot; Untuk bantuan, hubungi Admin organisasi Anda.
            </td></tr></table>
        </td></tr>
    </table>
</body>
</html>
