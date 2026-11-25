{{-- To Super HC when a KU/KD asks for more time. Variables: $subject, $period, $recipientName,
     $requesterName, $requesterRole, $area, $originalDue, $requestedDue, $reason, $stats, $reviewUrl,
     $profileUrl, $localLink. --}}
<x-mail.layout
    :title="$subject"
    :preheader="$requesterName.' meminta perpanjangan '.$period.' sampai '.$requestedDue.'.'"
    :eyebrow="'Permintaan perpanjangan · '.$period"
    :heading="'Perpanjangan tenggat diminta'"
    :lead="'<strong>'.e($requesterName).'</strong> ('.e($requesterRole).', '.e($area).') meminta tambahan waktu untuk menyelesaikan penilaian.'"
    :profile-url="$profileUrl"
    :fallback-url="$reviewUrl"
    :local-link="$localLink">

    <x-mail.section :top="20">
        <x-mail.facts :rows="[
            'Area' => $area,
            'Tenggat semula' => $originalDue,
            'Diminta sampai' => $requestedDue,
        ]"/>
    </x-mail.section>

    <x-mail.section label="Belum selesai"><x-mail.stats :items="$stats"/></x-mail.section>

    <x-mail.section :top="24"><x-mail.quote label="Alasan dari pemohon">{{ $reason }}</x-mail.quote></x-mail.section>

    <x-mail.section :top="24">
        <x-mail.button :href="$reviewUrl" label="Tinjau permintaan"/>
        <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:{{ config('mail_theme.muted') }}">Perpanjangan Kepala Unit otomatis memberi Kepala Divisi tambahan waktu persetujuan untuk unit tersebut. Tanggal tidak dapat melewati batas pengajuan periode berikutnya.</p>
    </x-mail.section>
</x-mail.layout>
