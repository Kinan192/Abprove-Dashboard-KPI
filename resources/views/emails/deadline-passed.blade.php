{{-- Sent once when a KU/KD deadline passes with work left. Variables: $subject, $period, $recipientName,
     $roleLabel, $isUnitHead, $area, $dueLabel, $closesLabel, $stats (x-mail.stats items), $requestUrl,
     $profileUrl, $localLink. --}}
<x-mail.layout
    :title="$subject"
    :preheader="'Batas '.($isUnitHead ? 'pengajuan' : 'persetujuan').' '.$period.' sudah lewat. Ajukan perpanjangan sebelum periode ditutup.'"
    :eyebrow="'Tenggat terlewat · '.$period"
    :heading="$isUnitHead ? 'Batas pengajuan sudah lewat' : 'Batas persetujuan sudah lewat'"
    :lead="e('Masih ada penilaian di area Anda yang belum selesai. Penilaian tersebut tidak dapat diproses tanpa perpanjangan dari Super HC.')"
    :profile-url="$profileUrl"
    :fallback-url="$requestUrl"
    :local-link="$localLink">

    <x-mail.section :top="20"><x-mail.recipient :name="$recipientName" :role="$roleLabel" :area="$area"/></x-mail.section>

    <x-mail.section :top="12">
        <x-mail.callout tone="danger" :label="$isUnitHead ? 'Batas pengajuan' : 'Batas persetujuan'" :value="$dueLabel" badge="Lewat">@if ($isUnitHead)Tanpa perpanjangan, penilaian yang belum selesai akan ditandai <strong>Tidak dinilai</strong> saat periode ditutup ({{ $closesLabel }}) dan tidak masuk perhitungan rerata.@else Tanpa perpanjangan, saat periode ditutup ({{ $closesLabel }}) pengajuan staf difinalkan otomatis dengan nilai Kepala Unit, dan Kepala Unit yang belum dinilai ditandai <strong>Tidak dinilai</strong>.@endif</x-mail.callout>
    </x-mail.section>

    <x-mail.section label="Belum selesai"><x-mail.stats :items="$stats"/></x-mail.section>

    <x-mail.section :top="24">
        <x-mail.button :href="$requestUrl" label="Ajukan perpanjangan"/>
        <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:{{ config('mail_theme.muted') }}">Sertakan alasan keterlambatan. Super HC akan menyetujui dengan tanggal baru atau menolak permintaan Anda.</p>
    </x-mail.section>
</x-mail.layout>
