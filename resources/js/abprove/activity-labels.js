const resources = {
    users: 'akun',
    positions: 'jabatan',
    divisions: 'divisi',
    units: 'unit',
    employees: 'staf',
    employee: 'staf',
    template: 'KPI',
    cycle: 'periode',
    profile: 'profil',
    assessment: 'penilaian',
};
const exact = {
    'assessment.approve':'Menyetujui penilaian Final', 'assessment.return':'Mengembalikan penilaian', 'assessment.resubmit':'Mengajukan ulang penilaian',
    login: 'Masuk ke sistem',
    'assessment.submitted': 'Mengajukan penilaian',
    'assessment.returned': 'Mengembalikan penilaian',
    'assessment.approved': 'Menyetujui penilaian Final',
    'assessment.finalized': 'Menetapkan Final',
    'assessment.head.final': 'Menetapkan nilai Kepala Unit',
    'assessment.resubmitted': 'Mengajukan ulang penilaian',
    'assessment.withdrawn': 'Membatalkan pengajuan',
    'template.applied': 'Menyimpan indikator KPI',
    'template.deleted': 'Menghapus perubahan KPI',
    'cycle.saved': 'Mengatur periode dan kategori',
    'cycle.closed': 'Menutup periode',
    'cycle.deleted': 'Menghapus periode',
    'employee.placed': 'Menempatkan staf',
    'employee.transferred': 'Memindahkan staf',
    'head.assigned': 'Mengganti penanggung jawab',
    'head.deactivated': 'Menonaktifkan penanggung jawab',
    'profile.updated': 'Memperbarui profil',
    'notifications.read': 'Membaca notifikasi',
    'reminder.recorded': 'Mencatat pengingat',
    'scope.revoked': 'Mencabut penugasan',
    'hc.granted': 'Memberikan akses Super HC',
};
export function activityLabel(action) {
    if (exact[action]) return exact[action];
    const [resource, verb] = action.split('.');
    return (
        ({ created: 'Menambah', updated: 'Mengubah', deleted: 'Menghapus' }[
            verb
        ] || 'Memperbarui') +
        ' ' +
        (resources[resource] || action.replaceAll('.', ' '))
    );
}
export function activitySubject(activity) {
    if(activity.action==='login') return 'Login berhasil.';
    const row = activity.after || activity.before;
    return (
        activity.summary ||
        row?.full_name ||
        row?.employee_name_snapshot ||
        row?.name ||
        row?.assessment_month ||
        activity.detail ||
        '-'
    );
}
