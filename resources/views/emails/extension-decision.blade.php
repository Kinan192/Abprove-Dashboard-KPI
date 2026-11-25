{{-- To the requester after Super HC decides. Variables: $subject, $approved, $period, $recipientName,
     $roleLabel, $area, $decidedBy, $note, $newDue (approved), $dueIn, $chainNote (KD window note or null),
     $originalDue, $actionUrl, $profileUrl, $localLink. --}}
<x-mail.layout
    :title="$subject"
    :preheader="$approved ? 'Perpanjangan disetujui sampai '.$newDue.'.' : 'Permintaan perpanjangan '.$period.' tidak disetujui.'"
    :eyebrow="'Keputusan perpanjangan · '.$period"
    :heading="$approved ? 'Perpanjangan disetujui' : 'Perpanjangan tidak disetujui'"
    :lead="e($approved
        ? 'Anda mendapat tambahan waktu untuk menyelesaikan penilaian di area Anda. Selesaikan sebelum tenggat baru berikut.'
        : ($roleLabel === 'Kepala Divisi' ? 'Super HC tidak menyetujui permintaan perpanjangan Anda. Saat periode ditutup, pengajuan staf difinalkan otomatis dengan nilai Kepala Unit dan Kepala Unit yang belum dinilai ditandai Tidak dinilai.' : 'Super HC tidak menyetujui permintaan perpanjangan Anda. Penilaian yang belum selesai akan ditandai Tidak dinilai saat periode ditutup.'))"
    :profile-url="$profileUrl"
    :fallback-url="$actionUrl"
    :local-link="$localLink">

    <x-mail.section :top="20"><x-mail.recipient :name="$recipientName" :role="$roleLabel" :area="$area"/></x-mail.section>

    <x-mail.section :top="12">
        @if ($approved)
            <x-mail.callout tone="success" label="Tenggat baru" :value="$newDue" :badge="$dueIn">{{ $chainNote }}</x-mail.callout>
        @else
            <x-mail.callout tone="neutral" label="Tenggat tetap" :value="$originalDue" badge="Ditolak"/>
        @endif
    </x-mail.section>

    <x-mail.section :top="24"><x-mail.quote :label="'Catatan dari '.$decidedBy">{{ $note }}</x-mail.quote></x-mail.section>

    @if ($approved)
    <x-mail.section :top="24"><x-mail.button :href="$actionUrl" :label="$roleLabel === 'Kepala Unit' ? 'Lanjutkan penilaian staf' : 'Buka persetujuan'"/></x-mail.section>
    @endif
</x-mail.layout>
