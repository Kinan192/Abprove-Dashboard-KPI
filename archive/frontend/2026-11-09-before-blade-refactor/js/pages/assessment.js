import { get, write, pageState, clone, number } from '../lib/api';
import { loadLookups } from '../lib/ui';

const validScore = (value) => /^(?:[1-9][0-9]|100)$/.test(String(value));
const weightUnits = (value) => {
    const [a, b = ''] = String(value).split('.');
    return Number(a) * 10000 + Number(b.padEnd(4, '0').slice(0, 4));
};
export function assessmentPage() {
    return {
        ...pageState(),
        rows: [],
        current: null,
        loadedCycle: null,
        search: '',
        unitFilter: '',
        tab: 'submitted',
        personTab: 'all',
        units: [],
        timeline: [],
        timelinePagination: null,
        timelineBusy: false,
        comparison: null,
        categories: [],
        dirty: false,
        detailBusy: false,
        detailError: '',
        selectedIds: [],
        get ui() {
            return this.$store.ui;
        },
        get review() {
            return (
                this.ui.page === 'approvals' ||
                (this.current?.assessment_kind === 'member' &&
                    this.ui.role === 'kepala_divisi')
            );
        },
        get canEdit() {
            if (
                !this.current ||
                !['draft', 'returned'].includes(this.current.status)
            )
                return false;
            const role = this.ui.role,
                kind = this.current.assessment_kind;
            const writable =
                (role === 'kepala_unit' && kind === 'member') ||
                (role === 'kepala_divisi' && kind === 'unit_head');
            const cycle = this.ui.cycles.find(
                (c) => Number(c.id) === Number(this.current.cycle_id),
            );
            const deadline =
                role === 'kepala_unit'
                    ? cycle?.submission_due_at
                    : cycle?.approval_due_at;
            return (
                writable &&
                cycle?.status === 'open' &&
                Date.now() >= Date.parse(cycle.opens_at) &&
                Date.now() <= Date.parse(deadline) &&
                Date.now() <= Date.parse(cycle.closes_at)
            );
        },
        get filled() {
            return (
                this.current?.items.filter((i) => validScore(i.score)).length ||
                0
            );
        },
        get complete() {
            return (
                !!this.current?.items.length &&
                this.filled === this.current.items.length
            );
        },
        get weightTotal() {
            return (
                this.current?.items.reduce(
                    (s, i) => s + weightUnits(i.weight_percent_snapshot),
                    0,
                ) / 10000 || 0
            );
        },
        get total() {
            return (
                this.current?.items.reduce(
                    (s, i) =>
                        s +
                        (validScore(i.score)
                            ? Number(i.score) *
                              weightUnits(i.weight_percent_snapshot)
                            : 0),
                    0,
                ) / 1000000 || 0
            );
        },
        get category() {
            const c = this.categories.find(
                (c) =>
                    this.total >= Number(c.lower_bound) &&
                    (c.upper_bound === null ||
                        this.total < Number(c.upper_bound)),
            );
            return this.complete
                ? c?.label || 'Kategori belum tersedia'
                : 'Nilai sementara';
        },
        get visibleRows() {
            return this.personTab === 'needed'
                ? this.rows.filter(
                      (r) =>
                          !r.status || ['draft', 'returned'].includes(r.status),
                  )
                : this.rows;
        },
        result(item) {
            return validScore(item.score)
                ? number(
                      (Number(item.score) *
                          weightUnits(item.weight_percent_snapshot)) /
                          1000000,
                  )
                : 'Belum diisi';
        },
        async init() {
            const params = new URLSearchParams(location.search);
            this.unitFilter = params.get('unit_id') || '';
            this.search = params.get('search') || '';
            this.$watch('dirty', (value) => {
                this.ui.unsaved = value;
            });
            await this.load();
            const selected = this.rows.find(
                (row) => row.id === Number(params.get('employee_id')),
            );
            if (selected) await this.choose(selected);
            window.addEventListener('beforeunload', (e) => {
                if (this.dirty) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        },
        async load(page = 1) {
            this.selectedIds = [];
            await this.fetchPage(async () => {
                if (this.loadedCycle !== String(this.ui.cycleId)) {
                    this.current = null;
                    this.dirty = false;
                    this.loadedCycle = String(this.ui.cycleId);
                }
                if (!this.ui.cycleId) {
                    this.rows = [];
                    this.current = null;
                    return;
                }
                if (this.ui.assessmentId) {
                    await this.openAssessment(this.ui.assessmentId);
                    return;
                }
                const review = this.ui.page === 'approvals';
                const endpoint = review
                    ? '/assessments'
                    : this.ui.page === 'heads'
                      ? '/heads'
                      : '/members';
                const params = {
                    cycle_id: this.ui.cycleId,
                    search: this.search,
                    unit_id: this.unitFilter,
                    page,
                };
                if (review) {
                    params.status = this.tab === 'all' ? '' : this.tab;
                    params.kind = 'member';
                }
                const [result, lookup, cycle] = await Promise.all([
                    get(this.ui.prefix + endpoint, params),
                    loadLookups(this.ui),
                    get('/cycles/' + this.ui.cycleId),
                ]);
                this.rows = result.data;
                this.pagination = result;
                this.units = lookup.units;
                this.categories = cycle.data.categories;
            });
        },
        async choose(row) {
            const select = async () => {
                this.detailBusy = true;
                this.detailError = '';
                try {
                    if (this.ui.page === 'approvals')
                        await this.openAssessment(row.id);
                    else if (row.assessment_id)
                        await this.openAssessment(row.assessment_id);
                    else {
                        const result = await write(
                            this.ui.prefix + '/assessments',
                            {
                                employee_id: row.id,
                                cycle_id: Number(this.ui.cycleId),
                            },
                        );
                        await this.openAssessment(result.data.id);
                        row.assessment_id = result.data.id;
                        row.status = result.data.status;
                    }
                } catch (error) {
                    this.detailError = error.message;
                } finally {
                    this.detailBusy = false;
                    this.$nextTick(() => {
                        if (innerWidth < 1024 && this.current) {
                            const heading =
                                document.querySelector('.person-heading h2');
                            heading?.setAttribute('tabindex', '-1');
                            heading?.focus();
                            heading?.scrollIntoView({
                                block: 'start',
                                behavior: matchMedia(
                                    '(prefers-reduced-motion:reduce)',
                                ).matches
                                    ? 'instant'
                                    : 'smooth',
                            });
                        }
                    });
                }
            };
            if (this.dirty)
                this.ui.ask({
                    title: 'Perubahan belum disimpan',
                    message:
                        'Pindah karyawan akan meninggalkan isian yang belum disimpan.',
                    label: 'Tinggalkan perubahan',
                    run: select,
                });
            else await select();
        },
        async openAssessment(id) {
            this.detailBusy = true;
            this.detailError = '';
            try {
                const response = await get(
                    this.ui.prefix + '/assessments/' + id,
                );
                this.current = clone(response.data);
                this.dirty = false;
                this.errors = {};
                this.formError = '';
                if (this.ui.assessmentId)
                    this.ui.cycleId = String(this.current.cycle_id);
                const [timeline, comparison, cycle] = await Promise.all([
                    get(this.ui.prefix + '/assessments/' + id + '/timeline'),
                    get(
                        this.ui.prefix +
                            '/data/assessments/' +
                            id +
                            '/comparison',
                    ),
                    get('/cycles/' + this.current.cycle_id),
                ]);
                this.timeline = timeline.data;
                this.timelinePagination = timeline;
                this.comparison = comparison.data;
                this.categories = cycle.data.categories;
            } finally {
                this.detailBusy = false;
            }
        },
        async moreTimeline() {
            if (!this.timelinePagination?.next_page_url || this.timelineBusy)
                return;
            this.timelineBusy = true;
            const id = this.current.id;
            try {
                const response = await get(
                    this.ui.prefix + '/assessments/' + id + '/timeline',
                    { page: this.timelinePagination.current_page + 1 },
                );
                if (this.current?.id === id) {
                    this.timeline.push(...response.data);
                    this.timelinePagination = response;
                }
            } catch (error) {
                this.ui.toast(error.message, true);
            } finally {
                this.timelineBusy = false;
            }
        },
        async save() {
            if (!this.canEdit) return;
            this.errors = {};
            this.formError = '';
            const invalid = this.current.items.find(
                (i) =>
                    i.score !== null && i.score !== '' && !validScore(i.score),
            );
            if (invalid) {
                this.formError =
                    'Nilai harus bilangan bulat antara 10 dan 100.';
                document.getElementById('score-' + invalid.id)?.focus();
                return false;
            }
            this.busy = true;
            try {
                const scores = this.current.items.map((i) => ({
                    id: i.id,
                    score:
                        i.score === null || i.score === ''
                            ? null
                            : Number(i.score),
                }));
                await write(
                    this.ui.prefix +
                        '/assessments/' +
                        this.current.id +
                        '/draft',
                    {
                        lock_version: this.current.lock_version,
                        scores,
                        positive_finding: this.current.positive_finding,
                        negative_finding: this.current.negative_finding,
                    },
                    'PATCH',
                );
                await this.openAssessment(this.current.id);
                this.ui.toast('Draft berhasil disimpan.');
                return true;
            } catch (error) {
                this.fail(error);
                if (error.status === 409)
                    this.formError +=
                        ' Muat ulang untuk meninjau versi terbaru. Isian Anda belum diganti.';
                return false;
            } finally {
                this.busy = false;
            }
        },
        submit() {
            if (!this.canEdit || !this.complete) return;
            const isHead = this.current.assessment_kind === 'unit_head';
            this.ui.ask({
                title: isHead
                    ? 'Tetapkan nilai Kepala Unit?'
                    : 'Ajukan penilaian?',
                message:
                    `${this.current.employee_name_snapshot} · ${this.ui.month(this.ui.cycle?.assessment_month)} · ${number(this.total)}. ` +
                    (isHead
                        ? 'Keputusan Anda langsung Final dan nilai terkunci.'
                        : 'Penilaian dikirim ke Kepala Divisi untuk ditinjau.'),
                label: isHead ? 'Tetapkan nilai Final' : 'Ajukan penilaian',
                run: async () => {
                    if (this.dirty && !(await this.save()))
                        throw new Error(
                            this.formError || 'Draft belum tersimpan.',
                        );
                    await write(
                        this.ui.prefix +
                            '/assessments/' +
                            this.current.id +
                            '/submit',
                        { lock_version: this.current.lock_version },
                    );
                    this.dirty = false;
                    await this.openAssessment(this.current.id);
                    await this.refreshRows();
                    this.ui.toast(
                        isHead
                            ? 'Nilai Kepala Unit telah Final.'
                            : 'Penilaian berhasil diajukan.',
                    );
                },
            });
        },
        decide(action) {
            if (!this.current) return;
            const returning = action === 'return';
            this.ui.ask({
                title: returning
                    ? 'Kembalikan penilaian?'
                    : 'ACC dan tetapkan Final?',
                message:
                    `${this.current.employee_name_snapshot} · Nilai ${number(this.current.total_score_raw)}. ` +
                    (returning
                        ? 'Kepala Unit akan menerima alasan untuk memperbaiki penilaian.'
                        : 'ACC Anda adalah keputusan akhir. Nilai akan terkunci.'),
                label: returning
                    ? 'Kembalikan ke Kepala Unit'
                    : 'ACC dan tetapkan Final',
                reasonRequired: returning,
                run: async (reason) => {
                    await write(
                        '/division/assessments/' +
                            this.current.id +
                            '/' +
                            action,
                        {
                            lock_version: this.current.lock_version,
                            ...(returning ? { reason } : {}),
                        },
                    );
                    await this.openAssessment(this.current.id);
                    await this.refreshRows();
                    this.ui.toast(
                        returning
                            ? 'Penilaian dikembalikan untuk revisi.'
                            : 'Penilaian telah Final.',
                    );
                },
            });
        },
        withdraw() {
            this.ui.ask({
                title: 'Tarik kembali pengajuan?',
                message:
                    'Penilaian kembali menjadi Draft dan dapat Anda perbaiki.',
                label: 'Tarik kembali',
                run: async () => {
                    await write(
                        '/unit/assessments/' + this.current.id + '/withdraw',
                        { lock_version: this.current.lock_version },
                    );
                    await this.openAssessment(this.current.id);
                    await this.refreshRows();
                    this.ui.toast('Pengajuan ditarik kembali.');
                },
            });
        },
        async refreshRows() {
            if (!this.ui.assessmentId) {
                const id = this.current?.id;
                await this.load();
                if (id) await this.openAssessment(id);
            }
        },
        reloadCurrent() {
            if (this.current)
                this.ui.ask({
                    title: 'Muat ulang penilaian?',
                    message:
                        'Isian yang belum disimpan akan diganti dengan data terbaru dari server.',
                    label: 'Muat ulang data',
                    run: () => this.openAssessment(this.current.id),
                });
        },
        copyPrevious() {
            if (!this.comparison?.available) return;
            this.ui.ask({
                title: 'Salin nilai bulan sebelumnya?',
                message:
                    'Nilai dari template yang sama akan mengisi draft. Temuan tidak ikut disalin.',
                label: 'Salin ke draft',
                run: async () => {
                    const map = new Map(
                        this.comparison.items.map((i) => [i.id, i.score]),
                    );
                    this.current.items.forEach((i) => {
                        if (map.has(i.id)) i.score = map.get(i.id);
                    });
                    this.dirty = true;
                },
            });
        },
        bulkApprove() {
            const rows = this.rows.filter((r) =>
                this.selectedIds.map(Number).includes(r.id),
            );
            if (!rows.length) return;
            this.ui.ask({
                title: `ACC ${rows.length} penilaian sekaligus?`,
                message:
                    'Seluruh penilaian yang dipilih langsung Final. Jika satu data berubah, seluruh batch dibatalkan.',
                label: `ACC ${rows.length} penilaian`,
                run: async () => {
                    await write('/division/approvals/bulk', {
                        assessments: rows.map((r) => ({
                            id: r.id,
                            lock_version: r.lock_version,
                        })),
                    });
                    await this.load();
                    this.ui.toast('Penilaian terpilih telah Final.');
                },
            });
        },
        get returnReason() {
            return (
                this.timeline.find((e) => e.action === 'assessment.return')
                    ?.reason || ''
            );
        },
        delta(item) {
            const old = this.comparison?.items.find((i) => i.id === item.id);
            if (!old || item.weighted_result_raw === null)
                return 'Tidak sebanding';
            const diff =
                Number(item.weighted_result_raw) - Number(old.previous_result);
            return (diff > 0 ? '+' : '') + number(diff);
        },
        nextInput(event) {
            const inputs = [...document.querySelectorAll('input[data-score]')];
            const n = inputs.indexOf(event.target);
            inputs[n + 1]?.focus();
        },
    };
}
