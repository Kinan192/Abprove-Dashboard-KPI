import { get, write, request, pageState, clone } from '../lib/api';
import { loadLookups } from '../lib/ui';

export const pillars = [
    'Technical Care',
    'Access',
    'Coordination and Continuity',
    'Interpersonal Care',
    'Efficient',
];
const itemFields = [
    'pillar',
    'name',
    'numerator',
    'denominator',
    'measurement_formula',
    'target_text',
    'weight_percent',
];
const blankItem = () => ({
    pillar: 'Technical Care',
    name: '',
    numerator: null,
    denominator: null,
    measurement_formula: null,
    target_text: null,
    weight_percent: '100.0000',
});
function templatePayload(form) {
    return {
        position_id: Number(form.position_id),
        name: form.name,
        template_year: Number(form.template_year),
        effective_from: form.effective_from,
        effective_until: form.effective_until,
        items: form.items.map((item) =>
            Object.fromEntries(
                itemFields.map((k) => [
                    k,
                    k === 'weight_percent'
                        ? String(item[k]).replace(',', '.')
                        : item[k] || null,
                ]),
            ),
        ),
    };
}
export function templatesPage() {
    return {
        ...pageState(),
        rows: [],
        lookups: { positions: [] },
        form: { items: [] },
        editingId: null,
        selected: null,
        positionFilter: '',
        year: new Date().getFullYear(),
        imported: null,
        importBusy: false,
        importError: '',
        pillars,
        get ui() {
            return this.$store.ui;
        },
        get readonly() {
            return this.ui.page === 'kpis';
        },
        get weightTotal() {
            return (
                this.form.items.reduce((s, i) => {
                    const v = String(i.weight_percent).replace(',', '.');
                    if (!/^\d{1,3}(?:\.\d{1,4})?$/.test(v)) return s;
                    const [a, b = ''] = v.split('.');
                    return s + Number(a) * 10000 + Number(b.padEnd(4, '0'));
                }, 0) / 10000
            );
        },
        get templateReadonly() {
            return !!this.form.status && this.form.status !== 'draft';
        },
        async init() {
            await this.load();
            if (this.ui.page === 'template-editor')
                await this.edit(
                    this.ui.templateId
                        ? { id: Number(this.ui.templateId) }
                        : null,
                );
        },
        async load(page = 1) {
            await this.fetchPage(async () => {
                if (this.readonly && !this.ui.cycleId) {
                    this.rows = [];
                    return;
                }
                const [response, lookups] = await Promise.all([
                    get(
                        this.readonly
                            ? this.ui.prefix + '/data/kpis'
                            : '/hc/kpi-templates',
                        {
                            cycle_id: this.readonly ? this.ui.cycleId : null,
                            position_id: this.positionFilter,
                            template_year: this.readonly ? null : this.year,
                            page,
                        },
                    ),
                    loadLookups(this.ui),
                ]);
                this.rows = response.data;
                this.pagination = this.readonly
                    ? { total: this.rows.length, current_page: 1, last_page: 1 }
                    : response;
                this.lookups = lookups;
                if (this.readonly) this.selected = this.rows[0] || null;
            });
        },
        positionName(id) {
            return (
                this.lookups.positions.find((p) => p.id === Number(id))?.name ||
                'Jabatan'
            );
        },
        async edit(row = null, newVersion = false) {
            this.errors = {};
            this.formError = '';
            this.editingId = row && !newVersion ? row.id : null;
            const year = Number(this.year) || new Date().getFullYear();
            this.form = row
                ? clone((await get('/hc/kpi-templates/' + row.id)).data)
                : {
                      position_id: '',
                      name: '',
                      template_year: year,
                      effective_from: year + '-01-01',
                      effective_until: year + '-12-31',
                      items: [blankItem()],
                  };
            if (newVersion) {
                this.form.status = 'draft';
                this.form.name += ' · versi baru';
            }
            this.$refs.template.showModal();
        },
        addItem() {
            this.form.items.push({ ...blankItem(), weight_percent: '0' });
        },
        removeItem(index) {
            this.form.items.splice(index, 1);
        },
        async save() {
            this.busy = true;
            this.errors = {};
            this.formError = '';
            try {
                if (this.weightTotal !== 100)
                    throw new Error('Total bobot harus tepat 100%.');
                await write(
                    '/hc/kpi-templates' +
                        (this.editingId ? '/' + this.editingId : ''),
                    templatePayload(this.form),
                    this.editingId ? 'PATCH' : 'POST',
                );
                this.$refs.template.close();
                this.imported = null;
                await this.load();
                this.ui.toast('Draft template berhasil disimpan.');
            } catch (error) {
                this.fail(error);
            } finally {
                this.busy = false;
            }
        },
        publish(row) {
            this.ui.ask({
                title: 'Publikasikan template KPI?',
                message:
                    row.name +
                    ' akan menjadi acuan penilaian sesuai masa berlaku. Template yang dipublikasikan tidak dapat diubah langsung.',
                label: 'Publikasikan template',
                run: async () => {
                    await write('/hc/kpi-templates/' + row.id + '/publish');
                    await this.load();
                    this.ui.toast('Template berhasil dipublikasikan.');
                },
            });
        },
        async previewFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.importBusy = true;
            this.importError = '';
            this.imported = null;
            try {
                const data = new FormData();
                data.append('file', file);
                this.imported = (
                    await request('/hc/kpi-templates/import-preview', {
                        method: 'POST',
                        body: data,
                    })
                ).data;
            } catch (error) {
                this.importError = error.message;
            } finally {
                this.importBusy = false;
            }
        },
        async applyImport() {
            if (!this.imported?.valid) return;
            await this.edit();
            this.form.items = clone(this.imported.items);
        },
        async viewTemplate(row) {
            try {
                this.selected = this.readonly
                    ? row
                    : (await get('/hc/kpi-templates/' + row.id)).data;
                this.$refs.preview.showModal();
            } catch (error) {
                this.ui.toast(error.message, true);
            }
        },
    };
}

const toWib = (value) =>
    value
        ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16)
        : '';
const categoriesExample = () => [
    { code: 'kurang', label: 'Kurang', lower_bound: '0', upper_bound: '70' },
    { code: 'cukup', label: 'Cukup', lower_bound: '70', upper_bound: '80' },
    { code: 'baik', label: 'Baik', lower_bound: '80', upper_bound: '90' },
    {
        code: 'sangat_baik',
        label: 'Sangat Baik',
        lower_bound: '90',
        upper_bound: null,
    },
];
export function settingsPage() {
    return {
        ...pageState(),
        rows: [],
        form: { categories: [] },
        editingId: null,
        dates: [
            ['opens_at', 'Mulai pengisian'],
            ['submission_due_at', 'Batas pengisian Kepala Unit'],
            ['approval_due_at', 'Batas keputusan Kepala Divisi'],
            ['closes_at', 'Penutupan periode'],
        ],
        get ui() {
            return this.$store.ui;
        },
        async init() {
            await this.load();
        },
        async load(page = 1) {
            await this.fetchPage(async () => {
                const response = await get('/hc/cycles', { page });
                this.rows = response.data;
                this.pagination = response;
            });
        },
        async edit(row = null) {
            this.editingId = row?.id || null;
            this.formError = '';
            this.errors = {};
            if (row) {
                this.form = clone((await get('/hc/cycles/' + row.id)).data);
                this.form.assessment_month = this.form.assessment_month.slice(
                    0,
                    7,
                );
                this.dates.forEach(
                    ([key]) => (this.form[key] = toWib(this.form[key])),
                );
            } else
                this.form = {
                    assessment_month: '',
                    opens_at: '',
                    submission_due_at: '',
                    approval_due_at: '',
                    closes_at: '',
                    status: 'planned',
                    categories: [
                        {
                            code: '',
                            label: '',
                            lower_bound: '0',
                            upper_bound: null,
                        },
                    ],
                };
            this.$refs.cycle.showModal();
        },
        exampleCategories() {
            this.form.categories = categoriesExample();
        },
        addCategory() {
            this.form.categories.push({
                code: '',
                label: '',
                lower_bound: '',
                upper_bound: null,
            });
        },
        async save() {
            this.busy = true;
            this.formError = '';
            this.errors = {};
            try {
                const data = {
                    assessment_month: this.form.assessment_month + '-01',
                    status: this.form.status,
                    categories: this.form.categories.map((c) => ({
                        code: c.code,
                        label: c.label,
                        lower_bound: String(c.lower_bound).replace(',', '.'),
                        upper_bound:
                            c.upper_bound === null || c.upper_bound === ''
                                ? null
                                : String(c.upper_bound).replace(',', '.'),
                    })),
                };
                this.dates.forEach(
                    ([key]) => (data[key] = this.form[key] + ':00+07:00'),
                );
                await write(
                    '/hc/cycles' + (this.editingId ? '/' + this.editingId : ''),
                    data,
                    this.editingId ? 'PATCH' : 'POST',
                );
                this.$refs.cycle.close();
                await this.load();
                const cycles = await get('/cycles');
                this.ui.cycles = cycles.data;
                if (!this.ui.cycleId)
                    this.ui.cycleId = String(this.ui.cycles[0]?.id || '');
                this.ui.toast('Periode dan kategori berhasil disimpan.');
            } catch (error) {
                this.fail(error);
            } finally {
                this.busy = false;
            }
        },
        closeCycle(row) {
            this.ui.ask({
                title: 'Tutup periode penilaian?',
                message:
                    this.ui.month(row.assessment_month) +
                    ' tidak lagi menerima perubahan nilai. Pastikan seluruh tugas telah ditinjau.',
                label: 'Tutup periode',
                run: async () => {
                    await write('/hc/cycles/' + row.id + '/close');
                    await this.load();
                    this.ui.cycles = (await get('/cycles')).data;
                    this.ui.toast('Periode telah ditutup.');
                },
            });
        },
    };
}
