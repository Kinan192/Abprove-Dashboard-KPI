@php
    $pending = (int) ($details['pending'] ?? 0);
    $total = (int) ($details['total'] ?? 0);
    $secondary = (int) ($details['secondary'] ?? 0);
    $dueIn = $dueIn ?? null;
    $tone = $overdue ? 'danger' : ($dueTone ?? 'brand');
@endphp
<x-mail.layout
    :title="$reminder->subject"
    :preheader="'Pengingat KPI '.$period.' untuk '.$recipientName.($hasDeadline ? ' · batas '.$dueLabel : '')"
    :eyebrow="'Pengingat penilaian'.($period ? ' · '.$period : '')"
    :heading="$isUnitHead ? 'Lengkapi penilaian KPI staf Anda' : 'Tindak lanjuti penilaian di divisi Anda'"
    :lead="e($isUnitHead
        ? 'Mohon isi dan ajukan penilaian KPI staf di unit Anda. Periksa kembali data pengukuran sebelum mengajukan.'
        : 'Mohon tinjau pengajuan staf dari Kepala Unit dan lengkapi penilaian Kepala Unit di divisi Anda.')"
    :profile-url="$profileUrl"
    :fallback-url="$actionUrl"
    :local-link="$localLink">

    <x-mail.section :top="20"><x-mail.recipient :name="$recipientName" :role="$roleLabel" :area="$details['area'] ?? null"/></x-mail.section>

    @if ($hasDeadline)
    <x-mail.section :top="12">
        <x-mail.callout :tone="$tone"
            :label="$overdue ? 'Tenggat telah lewat' : ($isUnitHead ? 'Batas pengajuan' : 'Batas persetujuan')"
            :value="$dueLabel"
            :badge="$overdue ? 'Lewat' : $dueIn">@if ($overdue)Penilaian yang belum selesai tidak dapat diproses lagi. Ajukan perpanjangan kepada Super HC; tanpa perpanjangan, penilaian akan ditandai Tidak dinilai saat periode ditutup.@endif</x-mail.callout>
    </x-mail.section>
    @endif

    <x-mail.section label="Ringkasan tugas">
        @if ($isUnitHead)
            <x-mail.stats :items="[
                ['label' => 'Belum diajukan', 'value' => $pending, 'unit' => 'dari '.$total.' staf', 'note' => 'Isi lalu ajukan ke Kepala Divisi', 'tone' => 'neutral'],
                ['label' => 'Perlu perbaikan', 'value' => $secondary, 'unit' => 'staf', 'note' => 'Dikembalikan Kepala Divisi', 'tone' => 'warn'],
            ]"/>
            @if ($total > 0)<div style="height:14px;line-height:14px;font-size:0">&nbsp;</div><x-mail.progress :done="$total - $pending" :total="$total" :label="($total - $pending).' dari '.$total.' staf sudah diajukan'"/>@endif
        @else
            <x-mail.stats :items="[
                ['label' => 'Menunggu persetujuan', 'value' => $secondary, 'unit' => 'pengajuan', 'note' => 'Setujui, koreksi, atau kembalikan', 'tone' => 'info'],
                ['label' => 'Kepala Unit belum dinilai', 'value' => $pending, 'unit' => 'dari '.$total, 'note' => 'Dinilai langsung oleh Anda', 'tone' => 'neutral'],
            ]"/>
        @endif
        <p style="margin:10px 0 0;font-size:12px;line-height:18px;color:{{ config('mail_theme.faint') }}">Data per waktu pengiriman. Progres terbaru ada di aplikasi.</p>
    </x-mail.section>

    <x-mail.section :top="24">
        <x-mail.button :href="$actionUrl" :label="$actionLabel" :secondary-href="$headsUrl" secondary-label="Lengkapi juga penilaian Kepala Unit"/>
    </x-mail.section>

    @if (trim((string) $reminder->message) !== '')
    <x-mail.section :top="28"><x-mail.quote label="Pesan dari Admin">{!! nl2br(e($reminder->message)) !!}</x-mail.quote></x-mail.section>
    @endif
</x-mail.layout>
