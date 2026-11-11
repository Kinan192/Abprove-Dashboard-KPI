import { get, request, number, month, dateTime } from './api';

export function uiStore(config) {
    const requested = String(config.requestedCycle || '');
    const remembered = sessionStorage.getItem('kpi-cycle-' + config.user.id);
    const available = (id) =>
        config.cycles.some((c) => String(c.id) === String(id));
    const initial = available(requested)
        ? requested
        : available(remembered)
          ? remembered
          : String(
                config.cycles.find((c) => c.status === 'open')?.id ||
                    config.cycles[0]?.id ||
                    '',
            );
    return {
        ...config,
        cycleId: initial,
        lastCycleId: initial,
        unsaved: false,
        toasts: [],
        sessionExpired: false,
        confirm: {
            title: '',
            message: '',
            label: 'Konfirmasi',
            reason: '',
            reasonRequired: false,
            busy: false,
            error: '',
            run: null,
        },
        get cycle() {
            return (
                this.cycles.find(
                    (c) => String(c.id) === String(this.cycleId),
                ) || null
            );
        },
        number,
        month,
        dateTime,
        status(value) {
            return (
                {
                    draft: 'Draft',
                    submitted: 'Diajukan',
                    returned: 'Dikembalikan',
                    final: 'Final',
                    not_started: 'Belum diisi',
                    planned: 'Terjadwal',
                    open: 'Dibuka',
                    closed: 'Ditutup',
                    published: 'Published',
                    retired: 'Diarsipkan',
                    active: 'Aktif',
                    inactive: 'Nonaktif',
                    approved: 'Status lama',
                }[value || 'not_started'] || value
            );
        },
        roleName(value) {
            return (
                {
                    kepala_unit: 'Kepala Unit',
                    kepala_divisi: 'Kepala Divisi',
                    super_hc: 'Super HC',
                }[value] || 'Pengelola'
            );
        },
        actionLabel(value) {
            return (
                {
                    'assessment.started': 'Penilaian dimulai',
                    'assessment.draft': 'Draft disimpan',
                    'assessment.submit': 'Penilaian diajukan / ditetapkan',
                    'assessment.approve': 'ACC Kepala Divisi, nilai Final',
                    'assessment.return': 'Penilaian dikembalikan',
                    'assessment.withdraw': 'Pengajuan ditarik',
                    'head.assigned': 'Kepala ditetapkan',
                    'employee.placed': 'Karyawan ditempatkan',
                    'employee.transferred': 'Karyawan dipindahkan',
                    'scope.granted': 'Akses diberikan',
                    'scope.revoked': 'Akses dicabut',
                    'template.saved': 'Draft template disimpan',
                    'template.published': 'Template dipublikasikan',
                    'cycle.saved': 'Periode disimpan',
                    'cycle.closed': 'Periode ditutup',
                    'bootstrap.admin': 'Akun HC pertama dibuat',
                    login: 'Pengguna masuk',
                    'users.created': 'Akun pengguna dibuat',
                    'users.updated': 'Akun pengguna diubah',
                    'employees.created': 'Karyawan dibuat',
                    'employees.updated': 'Karyawan diubah',
                    'divisions.created': 'Divisi dibuat',
                    'divisions.updated': 'Divisi diubah',
                    'units.created': 'Unit dibuat',
                    'units.updated': 'Unit diubah',
                    'positions.created': 'Jabatan dibuat',
                    'positions.updated': 'Jabatan diubah',
                }[value] || 'Perubahan data tercatat'
            );
        },
        link(path) {
            return (
                this.prefix +
                '/' +
                path +
                (this.cycleId ? '?cycle_id=' + this.cycleId : '')
            );
        },
        changeCycle() {
            if (this.unsaved) {
                const next = this.cycleId;
                this.cycleId = this.lastCycleId;
                this.ask({
                    title: 'Ganti periode penilaian?',
                    message:
                        'Isian yang belum disimpan akan ditinggalkan. Simpan draft terlebih dahulu jika masih diperlukan.',
                    label: 'Tinggalkan dan ganti periode',
                    run: async () => {
                        this.unsaved = false;
                        this.cycleId = next;
                        this.commitCycle();
                    },
                });
                return;
            }
            this.commitCycle();
        },
        commitCycle() {
            this.lastCycleId = this.cycleId;
            sessionStorage.setItem('kpi-cycle-' + this.user.id, this.cycleId);
            if (this.assessmentId) {
                location.href = this.link(
                    this.role === 'kepala_unit' ? 'submissions' : 'assessments',
                );
                return;
            }
            const url = new URL(location.href);
            url.searchParams.set('cycle_id', this.cycleId);
            history.replaceState(null, '', url);
            window.dispatchEvent(new CustomEvent('cycle-changed'));
        },
        toast(text, error = false) {
            const id = crypto.randomUUID();
            this.toasts.push({ id, text, error });
            setTimeout(() => this.dismiss(id), 6500);
        },
        dismiss(id) {
            this.toasts = this.toasts.filter((t) => t.id !== id);
        },
        ask({
            title,
            message,
            label = 'Konfirmasi',
            reasonRequired = false,
            run,
        }) {
            this.confirm = {
                title,
                message,
                label,
                reasonRequired,
                run,
                reason: '',
                busy: false,
                error: '',
            };
            window.dispatchEvent(new CustomEvent('open-confirm'));
        },
        cancelConfirm() {
            if (this.confirm.busy) return;
            document.querySelector('dialog[data-confirm]')?.close();
            this.confirm.run = null;
        },
        async performConfirm() {
            if (
                this.confirm.reasonRequired &&
                this.confirm.reason.trim().length < 3
            ) {
                this.confirm.error = 'Alasan minimal 3 karakter.';
                document.getElementById('confirmation-reason').focus();
                return;
            }
            this.confirm.busy = true;
            this.confirm.error = '';
            try {
                await this.confirm.run(this.confirm.reason.trim());
                document.querySelector('dialog[data-confirm]').close();
            } catch (error) {
                this.confirm.error =
                    error.status === 409
                        ? error.message +
                          ' Tutup dialog, lalu muat ulang data untuk meninjau perubahan.'
                        : error.message;
            } finally {
                this.confirm.busy = false;
            }
        },
    };
}

export function shell() {
    return {
        drawer: false,
        isMobile: innerWidth < 1024,
        navSearch: '',
        get filteredNav() {
            return this.$store.ui.navigation.filter((i) =>
                i[1]
                    .toLocaleLowerCase('id')
                    .includes(this.navSearch.toLocaleLowerCase('id')),
            );
        },
        init() {
            this.$refs.confirm.dataset.confirm = 'true';
            this.$refs.confirm.addEventListener('cancel', (event) =>
                event.preventDefault(),
            );
            document.querySelectorAll('dialog').forEach((dialog) =>
                dialog.addEventListener('keydown', (event) => {
                    if (event.key !== 'Escape') return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (dialog === this.$refs.confirm) {
                        if (!this.$store.ui.confirm.busy)
                            this.$store.ui.cancelConfirm();
                    } else dialog.close();
                }),
            );
            const media = matchMedia('(max-width:1023px)');
            media.addEventListener('change', (e) => {
                this.isMobile = e.matches;
                this.drawer = false;
            });
            window.addEventListener('session-expired', () => {
                this.$store.ui.sessionExpired = true;
            });
        },
        logout() {
            this.$store.ui.ask({
                title: 'Keluar dari akun?',
                message:
                    'Pastikan perubahan Anda sudah disimpan sebelum keluar.',
                label: 'Keluar dari akun',
                run: async () => {
                    await request('/logout', { method: 'POST', body: '{}' });
                    location.href = '/login';
                },
            });
        },
    };
}

export function loginPage() {
    return {
        identifier: '',
        password: '',
        showPassword: false,
        busy: false,
        error: '',
        errors: {},
        async submit() {
            this.busy = true;
            this.error = '';
            this.errors = {};
            try {
                const result = await request('/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        identifier: this.identifier,
                        password: this.password,
                    }),
                });
                location.href = result.data.home;
            } catch (error) {
                this.errors = error.errors || {};
                this.error =
                    error.status === 429
                        ? 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba kembali.'
                        : error.message;
                this.$nextTick(() =>
                    document.querySelector('[aria-invalid="true"]')?.focus(),
                );
            } finally {
                this.busy = false;
            }
        },
    };
}

export async function loadLookups(ui) {
    return (await get(ui.prefix + '/data/lookups')).data;
}
