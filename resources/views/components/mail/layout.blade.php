@props(['title', 'preheader' => '', 'eyebrow' => null, 'heading', 'lead' => null, 'profileUrl' => null, 'localLink' => false, 'fallbackUrl' => null])
@php($t = config('mail_theme'))
{{-- Shared email shell: tosca hairline masthead, Swiss-style heading block, content slot, quiet footer.
     Table layout and inline styles only, for Outlook/Gmail compatibility. --}}
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ $title }}</title>
    <style>
        body { margin:0; padding:0; }
        a { color:{{ $t['brand'] }}; }
        @media only screen and (max-width:520px) {
            .m-outer { padding:12px 8px !important; }
            .m-px { padding-left:20px !important; padding-right:20px !important; }
            .m-title { font-size:22px !important; line-height:28px !important; }
            .m-stack, .m-stack > tbody, .m-stack > tbody > tr, .m-stack td.m-col { display:block !important; width:100% !important; }
            .m-stack td.m-gap { display:none !important; }
            .m-stack td.m-col + td.m-gap + td.m-col { padding-top:8px !important; }
            .m-btn-wrap { width:100% !important; }
            .m-btn { display:block !important; }
            .m-hide { display:none !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:{{ $t['canvas'] }};color:{{ $t['body'] }};font-family:{{ $t['font'] }};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
    @if ($preheader)<div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">{{ $preheader }}</div>@endif
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:{{ $t['canvas'] }}">
        <tr><td class="m-outer" align="center" style="padding:32px 12px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:{{ $t['paper'] }};border:1px solid {{ $t['line'] }};border-radius:12px;overflow:hidden">
                {{-- Masthead: 3px tosca rule, wordmark left, product name right --}}
                <tr><td height="3" bgcolor="{{ $t['brand_fill'] }}" style="height:3px;font-size:0;line-height:0;background-color:{{ $t['brand_fill'] }}">&nbsp;</td></tr>
                <tr><td class="m-px" style="padding:18px 32px;border-bottom:1px solid {{ $t['line'] }}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>
                        <td valign="middle" style="font-size:20px;font-weight:800;line-height:24px;letter-spacing:-0.5px;color:{{ $t['brand'] }};white-space:nowrap">AB<span style="font-weight:600;color:{{ $t['ink'] }}">pro</span><span style="font-weight:800;color:{{ $t['logo_red'] }}">&#10003;</span><span style="font-weight:600;color:{{ $t['ink'] }}">e</span></td>
                        <td valign="middle" align="right" class="m-hide" style="font-size:12px;line-height:16px;color:{{ $t['muted'] }};white-space:nowrap">KPI Kinerja<br><span style="color:{{ $t['faint'] }}">RS Awal Bros Botania</span></td>
                    </tr></table>
                </td></tr>

                {{-- Heading block --}}
                <tr><td class="m-px" style="padding:28px 32px 0">
                    @if ($eyebrow)<p style="margin:0 0 10px;font-size:11px;font-weight:600;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:{{ $t['brand'] }}">{{ $eyebrow }}</p>@endif
                    <h1 class="m-title" style="margin:0;font-size:24px;font-weight:700;line-height:30px;letter-spacing:-0.6px;color:{{ $t['ink'] }}">{{ $heading }}</h1>
                    @if ($lead)<p style="margin:10px 0 0;font-size:15px;line-height:24px;color:{{ $t['body'] }}">{!! $lead !!}</p>@endif
                </td></tr>

                {{ $slot }}

                {{-- Sign-off --}}
                <tr><td class="m-px" style="padding:28px 32px">
                    <p style="margin:0;font-size:14px;line-height:22px;color:{{ $t['body'] }}">Terima kasih atas kerja sama Anda.</p>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:700;line-height:22px;color:{{ $t['ink'] }}">Tim HC · ABprove KPI Kinerja</p>
                </td></tr>

                @if ($fallbackUrl)
                {{-- Fallback link for clients that block buttons --}}
                <tr><td class="m-px" bgcolor="{{ $t['subtle'] }}" style="padding:16px 32px;background-color:{{ $t['subtle'] }};border-top:1px solid {{ $t['line'] }}">
                    <p style="margin:0 0 4px;font-size:12px;line-height:18px;color:{{ $t['muted'] }}">Jika tombol tidak dapat dibuka, salin tautan berikut ke browser:</p>
                    <p style="margin:0;font-size:12px;line-height:18px;word-break:break-all"><a href="{{ $fallbackUrl }}" style="color:{{ $t['brand'] }};text-decoration:underline">{{ $fallbackUrl }}</a></p>
                    @if ($localLink)<p style="margin:8px 0 0;font-size:12px;line-height:18px;color:{{ $t['tones']['warn']['label'] }}">Lingkungan uji lokal: tautan hanya terbuka di komputer tempat aplikasi berjalan.</p>@endif
                </td></tr>
                @endif
            </table>

            {{-- Footer --}}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td class="m-px" align="center" style="padding:18px 32px 0;font-size:12px;line-height:19px;color:{{ $t['faint'] }}">
                Email otomatis dari ABprove · KPI Kinerja, RS Awal Bros Botania. Mohon tidak membalas email ini.<br>
                @if ($profileUrl)<a href="{{ $profileUrl }}" style="color:{{ $t['muted'] }};text-decoration:underline">Kelola preferensi email</a> · @endif Bantuan: hubungi Admin atau Super HC.
            </td></tr></table>
        </td></tr>
    </table>
</body>
</html>
