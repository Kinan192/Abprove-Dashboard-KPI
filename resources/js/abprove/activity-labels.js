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
const verbs = { created: 'Menambah', updated: 'Mengubah', deleted: 'Menghapus' };
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
    'head.assigned': 'Menetapkan penanggung jawab',
    'head.replaced': 'Mengganti kepala area',
    'head.moved': 'Memindahkan kepala ke area lain',
    'head.swapped': 'Menukar kepala dua area',
    'head.released': 'Melepas kepala dengan pengganti',
    'head.deactivated': 'Menonaktifkan penanggung jawab',
    'profile.updated': 'Memperbarui profil',
    'notifications.read': 'Membaca notifikasi',
    'reminder.recorded': 'Mencatat pengingat',
    'reminder.emailed': 'Mengirim email pengingat',
    'users.password_reset': 'Mengatur ulang kata sandi akun',
    'scope.revoked': 'Mencabut penugasan',
    'hc.granted': 'Memberikan akses Super HC',
};
export function activityLabel(action) {
    if (exact[action]) return exact[action];
    const [resource, verb] = action.split('.');
    return (
        (verbs[verb] || 'Memperbarui') +
        ' ' +
        (resources[resource] || action.replaceAll('.', ' '))
    );
}
/** Filter options for server-side action filters (prefix match); one option per label. */
export function activityActions() {
    const keys = [
        ...Object.keys(exact),
        ...['users', 'positions', 'divisions', 'units', 'employees'].flatMap(
            (resource) => Object.keys(verbs).map((verb) => `${resource}.${verb}`),
        ),
    ];
    const seen = new Set();
    return keys
        .map((id) => ({ id, name: activityLabel(id) }))
        .filter(({ name }) => !seen.has(name) && seen.add(name))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
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
