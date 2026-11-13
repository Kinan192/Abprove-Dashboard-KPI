import '../../../css/goals-prototype.css';
import { $, $$, open, close, confirm, toast } from '../ui';
import {
    clone,
    uid,
    TYPES,
    monthLabel,
    monthRange,
    nextMonth,
    measurementErrors,
    goalErrors,
    cycleErrors,
    templateGoals,
    templateWeight,
    templateErrors,
    saveGoal,
    publishTemplate,
    duplicateGoal,
    removeGoal,
    saveCycle,
    activateCycle,
    repeatCycle,
    closeCycle,
    record,
    assessmentAction,
    assessmentTotal,
    category,
    achievement,
} from './domain.js';
import { emptyGoal, emptyCycle, seedGoals } from './fixtures.js';
import {
    esc,
    btn,
    field,
    check,
    note,
    empty,
    num,
    date,
    errorFields,
    definition,
} from './markup.js';
import {
    goalList,
    goalRows,
    goalForm,
    goalDetail,
    templateList,
    templateDetail,
    owner,
} from './views.js';
import { cycleList, cycleRows, cycleForm, cycleDetail } from './cycle-views.js';
import {
    roleContext,
    permitted,
    assessmentList,
    assessmentView,
} from './workflow-views.js';

const KEY = 'abprove.goals-cycle.design-review.v1';
let data, storageError;
function load() {
    try {
        storageError = null;
        const raw = localStorage.getItem(KEY);
        data = raw ? JSON.parse(raw) : seedGoals();
        if (
            data.version !== 1 ||
            !['goals', 'templates', 'cycles', 'assessments', 'audit'].every(
                (k) => Array.isArray(data[k]),
            )
        )
            throw new Error('Format data prototype tidak sesuai.');
        if (!raw) localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
        storageError = e.message;
    }
}
export function prepareGoalShell(c, s) {
    if (!c.review)
        throw new Error('Prototype Goals hanya tersedia pada design-review.');
    load();
    if (data && !storageError)
        s.data.cycles = data.cycles.map((c) => ({
            ...c,
            id: c.month,
            status: ['active', 'approval'].includes(c.status)
                ? 'open'
                : ['closed', 'archived'].includes(c.status)
                  ? 'closed'
                  : 'planned',
        }));
}
export function initGoalPrototype(c, s) {
    if (!data && !storageError) prepareGoalShell(c, s);
    const root = $('[data-goal-prototype]'),
        content = $('[data-gp-content]');
    const role = roleContext(c.role);
    let dirty = false,
        drawerDirty = false,
        drawerKind,
        drawerIndex,
        chosenType,
        busy = false,
        currentHref = location.href;
    const ctx = {
        data,
        role,
        pages: {},
        f: {
            search: '',
            cycle:
                new URLSearchParams(location.search).get('cycle') || '2026-11',
            type: '',
            status: '',
            pillar: '',
            division: '',
            unit: '',
            position: '',
            owner: '',
        },
        cf: { search: '', year: '', status: '' },
        cycleId: '2026-11',
        step: 0,
        working: null,
        cycleWorking: null,
        assessmentWorking: null,
    };
    function parameters() {
        return new URLSearchParams(location.search);
    }
    function screen() {
        return (
            parameters().get('screen') ||
            (c.role !== 'hc'
                ? 'assessments'
                : c.page === 'pengaturan'
                  ? 'cycles'
                  : 'goals')
        );
    }
    ctx.url = (name, params = {}) => {
        const section =
            name.startsWith('cycle') || name === 'cycles'
                ? 'pengaturan'
                : 'kpi';
        const url = new URL(
            c.role === 'hc'
                ? c.links[section]
                : c.links[c.role === 'ku' ? 'nilai' : 'persetujuan'],
            location.origin,
        );
        url.searchParams.delete('month');
        const entityCycle =
            name === 'goal-detail'
                ? data.goals.find((g) => g.id === params.id)?.cycleId
                : name === 'cycle-detail'
                  ? data.cycles.find((c) => c.id === params.id)?.id
                  : name === 'assessment'
                    ? data.assessments.find((a) => a.id === params.id)?.cycleId
                    : null;
        url.searchParams.set(
            'cycle',
            params.cycle || entityCycle || ctx.cycleId,
        );
        url.searchParams.set('screen', name);
        if (c.role !== 'hc') url.searchParams.set('redesign', 'goals');
        for (const [key, value] of Object.entries(params))
            url.searchParams.set(key, value);
        return url.href;
    };
    function message(error) {
        let el = $('[data-gp-global-error]', root);
        if (!el) {
            el = document.createElement('p');
            el.className = 'gp-note error';
            el.dataset.gpGlobalError = '';
            el.setAttribute('role', 'alert');
            content.before(el);
        }
        el.textContent = error.message || String(error);
        el.hidden = false;
        el.scrollIntoView({ block: 'nearest' });
    }
    async function commit(mutate, label = 'Perubahan prototype disimpan.') {
        if (busy) return null;
        busy = true;
        content.setAttribute('aria-busy', 'true');
        $$('[data-gp-action]').forEach(
            (b) => (b.dataset.wasDisabled = b.disabled ? '1' : '0'),
        );
        $$('[data-gp-action]').forEach((b) => (b.disabled = true));
        try {
            const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (!stored || (stored.revision || 0) !== (data.revision || 0))
                throw new Error(
                    'Data prototype telah berubah di tab lain. Isian Anda tetap ada; muat ulang data terbaru sebelum menyimpan kembali.',
                );
            const next = clone(data),
                result = mutate(next);
            next.revision = (data.revision || 0) + 1;
            localStorage.setItem(KEY, JSON.stringify(next));
            data = next;
            ctx.data = next;
            toast(label);
            return result === undefined ? true : result;
        } catch (e) {
            message(e);
            return null;
        } finally {
            busy = false;
            content.setAttribute('aria-busy', 'false');
            $$('[data-gp-action]').forEach((b) => {
                b.disabled = b.dataset.wasDisabled === '1';
                delete b.dataset.wasDisabled;
            });
        }
    }
    async function leave() {
        if (!dirty) return true;
        return await confirm(
            'Perubahan form belum disimpan. Pilih Batal untuk kembali dan Simpan Draft, atau buang perubahan untuk meninggalkan form.',
            { label: 'Buang perubahan' },
        );
    }
    async function navigate(name, params = {}, force = false) {
        if (!force && !(await leave())) return;
        dirty = false;
        ctx.step = 0;
        ctx.detailTab = 'details';
        ctx.cycleTab = 'information';
        ctx.assessmentTab = 'scores';
        ctx.assessmentWorking = null;
        const target = ctx.url(name, params),
            targetCycle = new URL(target).searchParams.get('cycle');
        if (targetCycle !== ctx.cycleId) ctx.f.cycle = targetCycle;
        history.pushState({}, '', target);
        currentHref = location.href;
        render();
        $('#main-content')?.scrollTo({ top: 0, behavior: 'auto' });
    }
    function syncGoal() {
        const form = $('#gp-goal-form');
        if (!form || !ctx.working) return;
        for (const input of [...form.elements])
            if (input.name)
                ctx.working[input.name] =
                    input.type === 'checkbox' ? input.checked : input.value;
        if (ctx.working.type === 'individual')
            ctx.working.ownerId =
                data.templates.find((t) => t.id === ctx.working.templateId)
                    ?.positionId || '';
    }
    function syncCycle() {
        const form = $('#gp-cycle-form');
        if (!form || !ctx.cycleWorking) return;
        const cycle = ctx.cycleWorking;
        for (const input of [...form.elements])
            if (
                input.name &&
                !['templateIds', 'sb', 'b', 'c'].includes(input.name)
            )
                cycle[input.name] = input.value;
        if ($('[name=templateIds]', form))
            cycle.templateIds = $$('[name=templateIds]:checked', form).map(
                (e) => e.value,
            );
        for (const key of ['sb', 'b', 'c'])
            if (form.elements[key])
                cycle.categories[key] = form.elements[key].value;
    }
    function syncAssessment() {
        const form = $('#gp-assessment-form');
        if (!form || !ctx.assessmentWorking) return;
        $$('[data-gp-score]', form).forEach(
            (input) =>
                (ctx.assessmentWorking.scores[input.dataset.gpScore] =
                    input.value),
        );
        for (const key of ['positive', 'negative'])
            if (form.elements[key])
                ctx.assessmentWorking[key] = form.elements[key].value;
    }
    function filterRows() {
        const host = $('[data-gp-results]');
        if (host) host.innerHTML = goalRows(ctx);
    }
    function render() {
        const previousError = $('[data-gp-global-error]', root);
        if (previousError) previousError.hidden = true;
        if (storageError) {
            content.innerHTML = `${note(`Data prototype tidak dapat dibaca: ${storageError}`, 'error')}${btn('reset-prototype', 'Muat ulang data contoh')}`;
            content.setAttribute('aria-busy', 'false');
            return;
        }
        const params = parameters(),
            name = screen(),
            id = params.get('id');
        ctx.cycleId = data.cycles.some((c) => c.id === params.get('cycle'))
            ? params.get('cycle')
            : '2026-11';
        ctx.data = data;
        if (name === 'goal-detail')
            ctx.cycleId =
                data.goals.find((g) => g.id === id)?.cycleId || ctx.cycleId;
        if (name === 'assessment')
            ctx.cycleId =
                data.assessments.find((a) => a.id === id)?.cycleId ||
                ctx.cycleId;
        $$(
            '[data-gp-nav]',
            root.querySelector('.gp-nav') || document.createElement('div'),
        ).forEach((a) => {
            const key = a.dataset.gpNav;
            a.href = ctx.url(key);
            const active =
                (key === 'goals' && name.startsWith('goal')) ||
                (key === 'templates' && name.startsWith('template')) ||
                (key === 'cycles' && name.startsWith('cycle'));
            a.classList.toggle('active', active);
            if (active) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
        });
        if (c.role !== 'hc' && !['assessments', 'assessment'].includes(name)) {
            content.innerHTML = note(
                'Fitur pengelolaan KPI dan periode hanya tersedia untuk Super HC.',
                'error',
            );
            return;
        }
        if (name === 'goal-create' && !ctx.working)
            ctx.working = emptyGoal(ctx.cycleId);
        if (name === 'cycle-create' && !ctx.cycleWorking)
            ctx.cycleWorking = emptyCycle(firstUnusedMonth());
        if (name === 'assessment' && ctx.assessmentWorking?.id !== id) {
            const a = data.assessments.find((a) => a.id === id);
            ctx.assessmentWorking = a ? clone(a) : null;
        }
        const views = {
            goals: () => goalList(ctx),
            'goal-create': () => goalForm(ctx),
            'goal-detail': () => goalDetail(ctx, id),
            templates: () => templateList(ctx),
            'template-detail': () => templateDetail(ctx, id),
            cycles: () => cycleList(ctx),
            'cycle-create': () => cycleForm(ctx),
            'cycle-detail': () => cycleDetail(ctx, id),
            assessments: () => assessmentList(ctx),
            assessment: () => assessmentView(ctx, id),
        };
        content.innerHTML = (
            views[name] || (() => empty('Halaman tidak ditemukan'))
        )();
        const selectedCycle = data.cycles.find((c) => c.id === ctx.cycleId);
        if (
            name === 'template-detail' &&
            ['closed', 'archived'].includes(selectedCycle?.status)
        )
            $$(
                '[data-gp-action="template-goal"],[data-gp-action="publish-template"],[data-gp-action="edit-goal"]',
                content,
            ).forEach((button) => (button.disabled = true));
        if (
            name === 'cycle-create' &&
            ctx.cycleWorking?.id &&
            data.assessments.some((a) => a.cycleId === ctx.cycleWorking.id)
        ) {
            const form = $('#gp-cycle-form');
            if (form?.elements.month) form.elements.month.disabled = true;
            $$('[name="templateIds"]', form).forEach(
                (input) => (input.disabled = true),
            );
        }
        content.setAttribute('aria-busy', 'false');
        const title = $('.top-title');
        if (title)
            title.textContent =
                c.role === 'hc'
                    ? name.startsWith('cycle')
                        ? 'Pengaturan Periode'
                        : 'Master KPI / Goals'
                    : role.role === 'ku'
                      ? 'Isi nilai'
                      : 'Persetujuan';
        const scope = $('.top-scope');
        if (scope) scope.textContent = role.scope;
        if (c.role !== 'hc')
            $$('[data-profile-name],[data-actor-name]').forEach(
                (e) => (e.textContent = role.name),
            );
        $$('[data-month-label]').forEach(
            (e) => (e.textContent = monthLabel(ctx.cycleId)),
        );
        $$('[data-month-short]').forEach(
            (e) => (e.textContent = monthLabel(ctx.cycleId).slice(0, 3)),
        );
        const tasks = data.assessments.filter(
            (a) =>
                a.cycleId === ctx.cycleId &&
                permitted(a, role) &&
                (role.role === 'hc'
                    ? a.status === 'Disetujui'
                    : role.role === 'kd'
                      ? a.status === 'Diajukan'
                      : ['Belum diisi', 'Draft', 'Dikembalikan'].includes(
                            a.status,
                        )),
        );
        $$('[data-notification-count]').forEach((e) => {
            e.textContent = tasks.length;
            e.hidden = !tasks.length;
            e.closest('button').setAttribute(
                'aria-label',
                `Buka notifikasi, ${tasks.length} tugas prototype`,
            );
        });
        const notifications = $(
            '[data-notification-list],[data-notification-preview]',
        );
        if (notifications)
            notifications.innerHTML = tasks.length
                ? tasks
                      .slice(0, 4)
                      .map(
                          (a) =>
                              `<a class="menu-item" href="${esc(ctx.url('assessment', { id: a.id }))}" data-gp-nav="assessment" data-id="${a.id}">${esc(data.staff.find((p) => p.id === a.staffId)?.name)} · ${esc(a.status)}</a>`,
                      )
                      .join('')
                : empty('Tidak ada tugas pada periode ini.');
        root.dataset.prototypeReady = 'true';
    }
    function firstUnusedMonth(from = '2026-11') {
        let month = nextMonth(from);
        while (data.cycles.some((c) => c.month === month))
            month = nextMonth(month);
        return month;
    }
    async function startGoal(goal) {
        if (!(await leave())) return;
        ctx.working = clone(goal);
        await navigate('goal-create', {}, true);
    }
    function openType() {
        chosenType = null;
        $$('[name=gp-type]').forEach((e) => (e.checked = false));
        $('[data-gp-action=choose-type]').disabled = true;
        open('gp-type');
    }
    function drawer(kind, html, label = 'Terapkan') {
        drawerKind = kind;
        drawerDirty = false;
        $('[data-gp-drawer-content]').innerHTML = html;
        $('#gp-drawer-title').textContent =
            {
                kr: 'Key Result',
                config: 'Konfigurasi Goal',
                filters: 'Filter Goal',
                template: 'Template KPI Jabatan',
                repeat: 'Duplikasi periode',
                actual: 'Perbarui aktual',
            }[kind] || 'Pengaturan';
        $('[data-gp-drawer-save]').textContent = label;
        open('gp-drawer');
    }
    async function cancelDrawer() {
        if (
            drawerDirty &&
            !(await confirm(
                'Isian drawer belum diterapkan. Buang perubahan ini?',
                { label: 'Buang perubahan' },
            ))
        )
            return;
        drawerDirty = false;
        close('gp-drawer');
    }
    function showKr(index) {
        syncGoal();
        drawerIndex = index;
        const kr =
            index == null
                ? { ...emptyGoal(), name: '', weight: '', description: '' }
                : clone(ctx.working.keyResults[index]);
        drawer(
            'kr',
            `<form id="gp-drawer-form" novalidate>${field('name', 'Nama Key Result', kr.name, { required: true, maxlength: 150 })}${field('description', 'Deskripsi', kr.description, { textarea: true })}<div class="gp-space">${field(
                'direction',
                'Measurement type',
                kr.direction,
                {
                    options: [
                        ['increase', 'Increase KPI'],
                        ['decrease', 'Decrease KPI'],
                    ],
                    placeholder: false,
                },
            )}${field('unit', 'Unit pengukuran', kr.unit, {
                options: [
                    ['percent', 'Persen (%)'],
                    ['number', 'Angka'],
                    ['idr', 'Rupiah (Rp)'],
                ],
                placeholder: false,
            })}${field('baseline', 'Baseline', kr.baseline, { type: 'number', step: 'any' })}${field('target', 'Target', kr.target, { type: 'number', step: 'any', required: true })}${ctx.working.krWeighted ? field('weight', 'Bobot Key Result (%)', kr.weight, { type: 'number', min: 0, max: 100, step: '0.0001', required: true }) : note('Key Results dicatat sebagai pendukung. Agregasi progress dan bobot setara belum menjadi aturan scoring.')}</div></form>`,
            'Simpan Key Result',
        );
    }
    function showConfig() {
        syncGoal();
        const g = ctx.working;
        drawer(
            'config',
            `<form id="gp-drawer-form" novalidate><h3>Goal Details</h3>${field('weight', 'Goal Weight / bobot KPI (%)', g.weight, { type: 'number', min: '0.0001', max: 100, step: '0.0001', required: true })}${check('repeat', 'Repeat Goal', g.repeat, 'Salin konfigurasi melalui duplikasi periode; aktual tidak disalin.')}${check('noBaseline', 'Tanpa baseline', g.noBaseline, 'Target tetap dicatat; progress otomatis menunggu keputusan rumus.')}<h3 class="gp-space">Target Details</h3>${field(
                'direction',
                'Measurement type',
                g.direction,
                {
                    options: [
                        ['increase', 'Increase KPI'],
                        ['decrease', 'Decrease KPI'],
                    ],
                    placeholder: false,
                },
            )}${check('precision', 'Tampilkan persentase aktual', g.precision, 'Pembulatan hanya memengaruhi tampilan, bukan nilai yang disimpan.')}${check('krWeighted', 'Gunakan bobot Key Result', g.krWeighted, 'Metadata rancangan. Total KR harus 100%; tidak mengubah skor karyawan.')}${note('Update total achievement: input manual. Align Goal, contributors, dan update per event merupakan P1, belum diaktifkan.')}</form>`,
        );
    }
    async function saveGoalForm(publish) {
        syncGoal();
        const g = clone(ctx.working);
        if (publish) {
            const errors = goalErrors(data, g);
            if (Object.keys(errors).length) {
                errorFields($('#gp-goal-form'), errors);
                return message(new Error(Object.values(errors)[0]));
            }
            if (
                !(await confirm(
                    `Publikasikan KPI untuk ${owner(data, g)} pada ${monthLabel(g.cycleId)}? Seluruh Goal dalam template harus valid dengan bobot 100%.`,
                    { label: 'Publikasikan' },
                ))
            )
                return;
        }
        const saved = await commit(
            (next) => saveGoal(next, g, publish),
            publish
                ? 'Goal pada prototype dipublikasikan.'
                : 'Draft Goal tersimpan di browser.',
        );
        if (saved) {
            dirty = false;
            ctx.working = null;
            await navigate('goal-detail', { id: saved.id }, true);
        }
    }
    async function action(name, id) {
        if (name === 'measurement-details') {
            syncGoal();
            const g = ctx.working;
            drawer(
                'measurement',
                `<form id="gp-drawer-form">${field('numerator', 'Numerator', g.numerator, { textarea: true })}${field('denominator', 'Denominator', g.denominator, { textarea: true })}${field('formula', 'Formula pengukuran', g.formula, { textarea: true })}${note('Definisi ini tampil pada tabel KPI dan disalin ke snapshot; tidak menggantikan nilai manual 10–100.')}</form>`,
                'Simpan detail pengukuran',
            );
            $('#gp-drawer-title').textContent = 'Detail pengukuran KPI';
            return;
        }
        if (name === 'new-goal') {
            if (!(await leave())) return;
            ctx.working = null;
            openType();
            return;
        }
        if (name === 'change-type') {
            syncGoal();
            openType();
            return;
        }
        if (name === 'choose-type') {
            if (!chosenType) return;
            const existing = screen() === 'goal-create' && ctx.working;
            if (
                existing &&
                existing.type !== chosenType &&
                !(await confirm(
                    'Ubah jenis Goal? Pemilik dan template yang bergantung jenis akan direset.',
                    { label: 'Ubah tipe' },
                ))
            )
                return;
            const g = existing
                ? {
                      ...clone(existing),
                      type: chosenType,
                      templateId: '',
                      ownerId: chosenType === 'company' ? 'hospital' : '',
                  }
                : emptyGoal(ctx.f.cycle || ctx.cycleId, chosenType);
            close('gp-type');
            ctx.working = g;
            await navigate('goal-create', {}, true);
            dirty = !!existing;
            return;
        }
        if (name === 'save-goal-draft' || name === 'publish-goal')
            return saveGoalForm(name === 'publish-goal');
        if (name === 'goal-next') {
            syncGoal();
            const errors = goalErrors(data, ctx.working),
                fields =
                    ctx.step === 0
                        ? ['name', 'pillar', 'templateId', 'ownerId', 'cycleId']
                        : ctx.step === 1
                          ? [
                                'direction',
                                'unit',
                                'baseline',
                                'target',
                                'weight',
                            ]
                          : ctx.step === 2
                            ? ['keyResults']
                            : [];
            const relevant = Object.fromEntries(
                Object.entries(errors).filter(([k]) => fields.includes(k)),
            );
            if (!errorFields($('#gp-goal-form'), relevant)) return;
            ctx.step++;
            render();
            return;
        }
        if (name === 'goal-back') {
            syncGoal();
            ctx.step = Math.max(0, ctx.step - 1);
            render();
            return;
        }
        if (name === 'cancel-goal') return navigate('goals');
        if (name === 'edit-goal' || name === 'duplicate-goal') {
            const original = data.goals.find((g) => g.id === id);
            if (!original) throw new Error('Goal tidak ditemukan.');
            if (name === 'edit-goal' && original.status === 'draft')
                return startGoal(original);
            const copy = duplicateGoal(original);
            if (name === 'edit-goal') {
                copy.name = original.name;
                copy.revision = original.revision + 1;
                copy.cycleId =
                    data.cycles.find(
                        (c) =>
                            c.month > original.cycleId &&
                            ['draft', 'scheduled'].includes(c.status),
                    )?.id || '';
            }
            return startGoal(copy);
        }
        if (name === 'add-kr' || name === 'edit-kr')
            return showKr(name === 'add-kr' ? null : +id);
        if (name === 'remove-kr') {
            if (
                await confirm('Hapus Key Result dari rancangan Goal ini?', {
                    label: 'Hapus',
                })
            ) {
                ctx.working.keyResults.splice(+id, 1);
                dirty = true;
                render();
            }
            return;
        }
        if (name === 'goal-config') return showConfig();
        if (name === 'cancel-drawer') return cancelDrawer();
        if (name === 'archive-goal' || name === 'delete-goal') {
            if (
                !(await confirm(
                    name === 'archive-goal'
                        ? 'Arsipkan Goal ini? Snapshot penilaian sebelumnya tetap utuh.'
                        : 'Hapus Draft Goal yang belum digunakan?',
                    {
                        label:
                            name === 'archive-goal'
                                ? 'Arsipkan'
                                : 'Hapus Draft',
                    },
                ))
            )
                return;
            if (
                await commit((next) =>
                    removeGoal(next, id, name === 'archive-goal'),
                )
            )
                await navigate('goals', {}, true);
            return;
        }
        if (name === 'goal-filters') {
            const f = ctx.f;
            drawer(
                'filters',
                `<form id="gp-drawer-form">${field('pillar', 'Pilar', f.pillar, { options: [...new Set(data.goals.map((g) => g.pillar))].map((p) => [p, p]), placeholder: 'Semua pilar' })}${field('division', 'Divisi', f.division, { options: data.divisions, placeholder: 'Semua divisi' })}${field('unit', 'Unit', f.unit, { options: data.units.filter((u) => !f.division || u.divisionId === f.division), placeholder: 'Semua unit' })}${field('position', 'Jabatan', f.position, { options: data.positions, placeholder: 'Semua jabatan' })}${field('owner', 'Cari pemilik / cakupan', f.owner)}</form>`,
                'Terapkan filter',
            );
            return;
        }
        if (name === 'reset-filters') {
            for (const key of Object.keys(ctx.f)) ctx.f[key] = '';
            ctx.pages.goals = 0;
            render();
            return;
        }
        if (name === 'template-goal') {
            const t = data.templates.find((t) => t.id === id);
            const g = {
                ...emptyGoal(ctx.cycleId),
                templateId: id,
                ownerId: t.positionId,
            };
            return startGoal(g);
        }
        if (name === 'publish-template') {
            if (
                await confirm(
                    'Publikasikan seluruh Goal pada template ini? Total bobot harus 100%.',
                    { label: 'Publikasikan' },
                )
            ) {
                if (
                    await commit((next) =>
                        publishTemplate(next, id, ctx.cycleId),
                    )
                )
                    render();
            }
            return;
        }
        if (name === 'new-template') {
            drawer(
                'template',
                `<form id="gp-drawer-form" novalidate>${field('name', 'Nama template', '', { required: true })}${field('positionId', 'Jabatan', '', { required: true, options: data.positions })}${field('unitId', 'Unit', '', { required: true, options: data.units })}<p class="gp-field-error" data-gp-error="template" hidden></p>${note('Template menetapkan KPI Individual kepada jabatan dalam unit. Staf tidak diberi akun baru.')}</form>`,
                'Buat template',
            );
            return;
        }
        if (name === 'export-template') {
            const rows = templateGoals(data, id, ctx.cycleId),
                csv = [
                    [
                        'Pilar',
                        'KPI',
                        'Numerator',
                        'Denominator',
                        'Formula pengukuran',
                        'Target',
                        'Bobot (%)',
                    ],
                    ...rows.map((g) => [
                        g.pillar,
                        g.name,
                        g.numerator,
                        g.denominator,
                        g.formula,
                        g.targetText,
                        g.weight,
                    ]),
                ]
                    .map((row) =>
                        row
                            .map(
                                (value) =>
                                    `"${String(value ?? '').replaceAll('"', '""')}"`,
                            )
                            .join(','),
                    )
                    .join('\r\n');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(
                new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
            );
            a.download = `KPI-${id}-${ctx.cycleId}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast('Definisi KPI prototype diekspor.');
            return;
        }
        if (name === 'update-actual') {
            const g = data.goals.find((g) => g.id === id);
            drawerIndex = id;
            drawer(
                'actual',
                `<form id="gp-drawer-form" novalidate>${field('actual', 'Aktual pencapaian', g.actual ?? '', { type: 'number', step: 'any', required: true })}${note(`Baseline ${g.baseline}, target ${g.target}. Aktual ini tidak mengubah nilai penilaian 10–100.`)}</form>`,
                'Simpan aktual',
            );
            return;
        }
        if (name === 'new-cycle') {
            if (!(await leave())) return;
            ctx.cycleWorking = emptyCycle(firstUnusedMonth());
            await navigate('cycle-create', {}, true);
            return;
        }
        if (name === 'edit-cycle') {
            const cycle = data.cycles.find((c) => c.id === id);
            ctx.cycleWorking = clone(cycle);
            await navigate('cycle-create', {}, true);
            return;
        }
        if (name === 'cycle-next') {
            syncCycle();
            const errors = cycleErrors(
                    data,
                    ctx.cycleWorking,
                    ctx.cycleWorking.id,
                ),
                fields =
                    ctx.step === 0
                        ? ['name', 'month', 'locked']
                        : ctx.step === 1
                          ? [
                                'opens',
                                'submission',
                                'approval',
                                'finalization',
                                'closes',
                            ]
                          : ['categories', 'templateIds'];
            if (
                !errorFields(
                    $('#gp-cycle-form'),
                    Object.fromEntries(
                        Object.entries(errors).filter(([k]) =>
                            fields.includes(k),
                        ),
                    ),
                )
            )
                return;
            ctx.step++;
            render();
            return;
        }
        if (name === 'cycle-back') {
            syncCycle();
            ctx.step--;
            render();
            return;
        }
        if (name === 'cancel-cycle') return navigate('cycles');
        if (name === 'save-cycle' || name === 'schedule-cycle') {
            syncCycle();
            const cycle = clone(ctx.cycleWorking),
                errors = cycleErrors(data, cycle, cycle.id);
            if (Object.keys(errors).length) {
                errorFields($('#gp-cycle-form'), errors);
                throw new Error(Object.values(errors)[0]);
            }
            if (
                !(await confirm(
                    `Simpan jadwal ${cycle.name}? ${cycle.templateIds.length} template dipilih; bulan penilaian ${monthLabel(cycle.month)}.`,
                    {
                        label:
                            name === 'schedule-cycle' ? 'Jadwalkan' : 'Simpan',
                    },
                ))
            )
                return;
            if (name === 'schedule-cycle') cycle.status = 'scheduled';
            const saved = await commit((next) => saveCycle(next, cycle));
            if (saved) {
                dirty = false;
                ctx.cycleWorking = null;
                await navigate(
                    'cycle-detail',
                    { id: saved.id, cycle: saved.id },
                    true,
                );
            }
            return;
        }
        if (name === 'repeat-cycle') {
            drawerIndex = id;
            const source = data.cycles.find((c) => c.id === id);
            drawer(
                'repeat',
                `<form id="gp-drawer-form" novalidate>${note(`Sumber: ${source.name}. Baseline dan target disalin sesuai konfigurasi sumber; penggunaan aktual akhir sebagai baseline menunggu kebijakan.`)}${field('month', 'Bulan tujuan', firstUnusedMonth(source.month), { type: 'month', required: true })}${definition(
                    [
                        [
                            'Yang disalin',
                            'Template, jabatan, KPI, target, baseline, dan bobot.',
                        ],
                        [
                            'Yang dimulai kosong',
                            'Aktual, skor penilaian, temuan, pengajuan, dan keputusan.',
                        ],
                        [
                            'Status tujuan',
                            'Draft · perlu diperiksa dan dipublikasikan kembali.',
                        ],
                    ],
                )}</form>`,
                'Buat salinan periode',
            );
            return;
        }
        if (name === 'activate-cycle') {
            const cycle = data.cycles.find((c) => c.id === id),
                errors = cycle.templateIds.flatMap((t) =>
                    templateErrors(data, t, id),
                );
            if (errors.length || !cycle.templateIds.length)
                throw new Error(
                    errors[0] ||
                        'Pilih minimal satu template KPI sebelum aktivasi.',
                );
            if (
                !(await confirm(
                    `Aktifkan ${cycle.name}? ${data.staff.filter((p) => cycle.templateIds.includes(p.templateId)).length} lembar penilaian dibuat dari snapshot template; nilai dimulai kosong.`,
                    { label: 'Aktifkan' },
                ))
            )
                return;
            if (await commit((next) => activateCycle(next, id))) render();
            return;
        }
        if (name === 'close-cycle') {
            const pending = data.assessments.filter(
                (a) => a.cycleId === id && a.status !== 'Final',
            ).length;
            if (pending)
                throw new Error(
                    `Masih ada ${pending} penilaian belum Final. Penutupan diblokir sampai seluruh penilaian selesai.`,
                );
            if (
                await confirm(
                    'Tutup periode ini? Hasil Final tetap hanya baca.',
                    { label: 'Tutup periode' },
                )
            ) {
                if (await commit((next) => closeCycle(next, id))) render();
            }
            return;
        }
        if (name === 'archive-cycle' || name === 'delete-cycle') {
            if (
                !(await confirm(
                    name === 'archive-cycle'
                        ? 'Arsipkan periode tertutup tanpa menghapus hasil historis?'
                        : 'Hapus periode Draft yang belum dipakai?',
                    { label: name === 'archive-cycle' ? 'Arsipkan' : 'Hapus' },
                ))
            )
                return;
            const result = await commit((next) => {
                const cycle = next.cycles.find((c) => c.id === id);
                if (name === 'archive-cycle') {
                    if (cycle.status !== 'closed')
                        throw new Error(
                            'Hanya periode tertutup dapat diarsipkan.',
                        );
                    cycle.status = 'archived';
                } else {
                    if (
                        cycle.status !== 'draft' ||
                        next.assessments.some((a) => a.cycleId === id) ||
                        next.goals.some((g) => g.cycleId === id)
                    )
                        throw new Error(
                            'Periode yang sudah mempunyai Goal atau penilaian tidak dapat dihapus.',
                        );
                    next.cycles = next.cycles.filter((c) => c.id !== id);
                }
                record(
                    next,
                    'cycle',
                    id,
                    name === 'archive-cycle'
                        ? 'Periode diarsipkan'
                        : 'Periode Draft dihapus',
                );
            });
            if (result) await navigate('cycles', {}, true);
            return;
        }
        if (name === 'impact-cycle') {
            const cycle = data.cycles.find((c) => c.id === id),
                staff = data.staff.filter((p) =>
                    cycle.templateIds.includes(p.templateId),
                );
            $('[data-gp-impact-content]').innerHTML =
                definition([
                    ['Periode', esc(cycle.name)],
                    ['Divisi', new Set(staff.map((p) => p.divisionId)).size],
                    ['Unit', new Set(staff.map((p) => p.unitId)).size],
                    ['Anggota', staff.length],
                    ['Template', cycle.templateIds.length],
                    [
                        'Penilaian Final',
                        data.assessments.filter(
                            (a) => a.cycleId === id && a.status === 'Final',
                        ).length,
                    ],
                ]) +
                note(
                    'Perubahan master tidak menulis ulang snapshot Final. Aktual dan skor tidak disalin saat duplikasi.',
                );
            open('gp-impact');
            return;
        }
        if (name.startsWith('assessment-')) {
            syncAssessment();
            const operation = name.slice('assessment-'.length),
                a = data.assessments.find((a) => a.id === id);
            let payload = ctx.assessmentWorking
                ? {
                      scores: ctx.assessmentWorking.scores,
                      positive: ctx.assessmentWorking.positive,
                      negative: ctx.assessmentWorking.negative,
                  }
                : {};
            if (
                operation === 'submit' &&
                assessmentTotal({ ...a, scores: payload.scores }) == null
            ) {
                const el = $('[data-gp-assessment-error]');
                if (el) {
                    el.hidden = false;
                    el.textContent =
                        'Lengkapi seluruh nilai KPI dengan bilangan bulat 10–100 sebelum mengajukan.';
                }
                return;
            }
            if (operation === 'return') {
                const reason = await confirm(
                    'Kembalikan penilaian ke Kepala Unit. Alasan wajib agar revisi jelas.',
                    { reason: true, label: 'Kembalikan' },
                );
                if (!reason) return;
                payload = { reason };
            } else if (
                operation !== 'draft' &&
                !(await confirm(
                    {
                        submit: 'Ajukan nilai lengkap untuk ditinjau Kepala Divisi?',
                        withdraw:
                            'Tarik pengajuan menjadi Draft sebelum disetujui?',
                        approve:
                            'Setujui penilaian tanpa mengubah angka? Selanjutnya menunggu finalisasi Super HC.',
                        finalize:
                            'Finalkan penilaian Disetujui? Hasil, bobot, dan kategori akan terkunci.',
                    }[operation],
                    {
                        label: {
                            submit: 'Ajukan',
                            withdraw: 'Tarik pengajuan',
                            approve: 'Setujui',
                            finalize: 'Finalkan',
                        }[operation],
                    },
                ))
            )
                return;
            const saved = await commit((next) =>
                assessmentAction(next, id, operation, payload, role),
            );
            if (saved) {
                dirty = false;
                ctx.assessmentWorking = clone(saved);
                render();
            }
            return;
        }
        if (name === 'reset-prototype') {
            if (
                await confirm(
                    'Hapus hanya data prototype Goals pada browser ini dan muat contoh awal?',
                    { label: 'Muat data contoh' },
                )
            ) {
                localStorage.removeItem(KEY);
                storageError = null;
                data = seedGoals();
                localStorage.setItem(KEY, JSON.stringify(data));
                ctx.data = data;
                ctx.working = null;
                ctx.cycleWorking = null;
                ctx.assessmentWorking = null;
                dirty = false;
                await navigate(
                    c.role === 'hc' ? 'goals' : 'assessments',
                    {},
                    true,
                );
            }
            return;
        }
    }
    async function saveDrawer(form) {
        const values = Object.fromEntries(new FormData(form));
        if (drawerKind === 'measurement') {
            Object.assign(ctx.working, values);
            dirty = true;
        } else if (drawerKind === 'kr') {
            const e = measurementErrors({ ...values, noBaseline: false });
            if (!values.name?.trim()) e.name = 'Nama Key Result wajib diisi.';
            if (
                ctx.working.krWeighted &&
                !(+values.weight > 0 && +values.weight <= 100)
            )
                e.weight = 'Bobot KR wajib lebih dari 0 sampai 100%.';
            if (!errorFields(form, e)) return;
            const kr = {
                ...values,
                id:
                    drawerIndex == null
                        ? uid('kr')
                        : ctx.working.keyResults[drawerIndex].id,
                noBaseline: false,
                actual: null,
            };
            if (drawerIndex == null) ctx.working.keyResults.push(kr);
            else ctx.working.keyResults[drawerIndex] = kr;
            dirty = true;
        } else if (drawerKind === 'config') {
            if (!(+values.weight > 0 && +values.weight <= 100)) {
                errorFields(form, {
                    weight: 'Bobot wajib lebih dari 0 sampai 100%.',
                });
                return;
            }
            if (
                form.elements.noBaseline.checked !== ctx.working.noBaseline &&
                !(await confirm(
                    'Ubah penggunaan baseline? Jika tanpa baseline, progress otomatis belum dihitung sampai rumus disepakati.',
                    { label: 'Terapkan' },
                ))
            )
                return;
            Object.assign(ctx.working, {
                weight: values.weight,
                direction: values.direction,
                repeat: form.elements.repeat.checked,
                noBaseline: form.elements.noBaseline.checked,
                precision: form.elements.precision.checked,
                krWeighted: form.elements.krWeighted.checked,
            });
            dirty = true;
        } else if (drawerKind === 'filters') {
            Object.assign(ctx.f, values);
            ctx.pages.goals = 0;
        } else if (drawerKind === 'template') {
            const e = {};
            if (!values.name?.trim()) e.name = 'Nama template wajib diisi.';
            if (!values.positionId) e.positionId = 'Pilih jabatan.';
            if (!values.unitId) e.unitId = 'Pilih unit.';
            if (
                data.templates.some(
                    (t) =>
                        t.positionId === values.positionId &&
                        t.unitId === values.unitId,
                )
            )
                e.template =
                    'Template untuk jabatan dan unit ini sudah tersedia.';
            if (!errorFields(form, e)) return;
            const t = {
                ...values,
                id: uid('tpl'),
                divisionId: data.units.find((u) => u.id === values.unitId)
                    .divisionId,
                active: true,
                revision: 1,
            };
            if (
                !(await commit((next) => {
                    next.templates.push(t);
                    record(
                        next,
                        'template',
                        t.id,
                        'Template jabatan dibuat',
                        t.name,
                    );
                }))
            )
                return;
        } else if (drawerKind === 'repeat') {
            if (!values.month) {
                errorFields(form, { month: 'Pilih bulan tujuan.' });
                return;
            }
            const result = await commit(
                (next) => repeatCycle(next, drawerIndex, values.month),
                'Periode Draft disalin tanpa aktual dan penilaian.',
            );
            if (!result) return;
            drawerDirty = false;
            close('gp-drawer');
            await navigate(
                'cycle-detail',
                { id: result.id, cycle: result.id },
                true,
            );
            return;
        } else if (drawerKind === 'actual') {
            if (values.actual === '' || !Number.isFinite(+values.actual)) {
                errorFields(form, { actual: 'Isi angka aktual yang valid.' });
                return;
            }
            const goal = data.goals.find((g) => g.id === drawerIndex);
            if (goal.noBaseline) {
                errorFields(form, {
                    actual: 'Rumus tanpa baseline belum diaktifkan.',
                });
                return;
            }
            if (
                !(await commit((next) => {
                    const g = next.goals.find((g) => g.id === drawerIndex);
                    g.actual = +values.actual;
                    record(
                        next,
                        'goal',
                        g.id,
                        'Aktual diperbarui',
                        `Aktual ${values.actual}; nilai penilaian tetap.`,
                    );
                }))
            )
                return;
        }
        drawerDirty = false;
        close('gp-drawer');
        render();
    }
    document.addEventListener('click', (event) => {
        const nav = event.target.closest('[data-gp-nav]');
        if (nav && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            event.stopPropagation();
            const target = new URL(nav.href);
            navigate(
                nav.dataset.gpNav,
                Object.fromEntries(
                    [...target.searchParams].filter(
                        ([key]) =>
                            key !== 'screen' &&
                            key !== 'month' &&
                            key !== 'redesign',
                    ),
                ),
            ).catch(message);
            return;
        }
        const actionButton = event.target.closest('[data-gp-action]');
        if (actionButton) {
            action(
                actionButton.dataset.gpAction,
                actionButton.dataset.id,
            ).catch(message);
            return;
        }
        const pager = event.target.closest('[data-gp-page]');
        if (pager) {
            syncAssessment();
            ctx.pages[pager.dataset.gpPage] =
                (ctx.pages[pager.dataset.gpPage] || 0) + +pager.dataset.delta;
            render();
            return;
        }
        const status = event.target.closest('[data-gp-status]');
        if (status) {
            ctx.f.status = status.dataset.gpStatus;
            ctx.pages.goals = 0;
            render();
            return;
        }
        const detail = event.target.closest('[data-gp-detail-tab]');
        if (detail) {
            ctx.detailTab = detail.dataset.gpDetailTab;
            render();
            return;
        }
        const cycle = event.target.closest('[data-gp-cycle-tab]');
        if (cycle) {
            ctx.cycleTab = cycle.dataset.gpCycleTab;
            render();
            return;
        }
        const assessment = event.target.closest('[data-gp-assessment-tab]');
        if (assessment) {
            syncAssessment();
            ctx.assessmentTab = assessment.dataset.gpAssessmentTab;
            render();
        }
    });
    document.addEventListener('submit', (event) => {
        if (event.target.id === 'gp-drawer-form') {
            event.preventDefault();
            saveDrawer(event.target).catch(message);
        }
        if (
            ['gp-goal-form', 'gp-cycle-form', 'gp-assessment-form'].includes(
                event.target.id,
            )
        )
            event.preventDefault();
    });
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (target.closest('#gp-goal-form')) {
            dirty = true;
            syncGoal();
            const errors = measurementErrors(ctx.working),
                form = $('#gp-goal-form');
            $$('[data-gp-error]', form).forEach((el) => {
                if (
                    ['target', 'baseline', 'direction', 'unit'].includes(
                        el.dataset.gpError,
                    )
                ) {
                    el.textContent = errors[el.dataset.gpError] || '';
                    el.hidden = !errors[el.dataset.gpError];
                }
            });
            const weight = $('[data-gp-live-weight]');
            if (weight)
                weight.textContent = `${num(templateWeight(ctx.working.templateId ? templateGoals(data, ctx.working.templateId, ctx.working.cycleId, ctx.working) : [ctx.working]), 4)}%`;
        }
        if (target.closest('#gp-cycle-form')) {
            dirty = true;
            syncCycle();
        }
        if (target.closest('#gp-drawer-form')) drawerDirty = true;
        if (
            target.closest('#gp-assessment-form') &&
            (target.matches('[data-gp-score]') ||
                target.name === 'positive' ||
                target.name === 'negative')
        ) {
            dirty = true;
            syncAssessment();
            const a = ctx.assessmentWorking,
                total = assessmentTotal(a),
                cycle = data.cycles.find((c) => c.id === a.cycleId);
            const valid =
                target.value === '' ||
                (/^\d+$/.test(target.value) &&
                    +target.value >= 10 &&
                    +target.value <= 100);
            if (target.dataset.gpScore) {
                const hint = $(
                    `[data-gp-score-error="${target.dataset.gpScore}"]`,
                );
                hint.hidden = valid;
                hint.textContent = valid ? '' : 'Bilangan bulat 10–100.';
                target.setAttribute('aria-invalid', String(!valid));
                const g = a.snapshot.find(
                    (g) => g.id === target.dataset.gpScore,
                );
                $(`[data-gp-contribution="${g.id}"]`).textContent =
                    valid && target.value !== ''
                        ? num((+target.value * +g.weight) / 100, 2)
                        : '—';
            }
            $('[data-gp-total]').textContent = num(total, 2);
            $('[data-gp-category]').textContent =
                total == null
                    ? 'Belum lengkap'
                    : category(total, cycle.categories);
        }
        if (target.dataset.gpSearch === 'goals') {
            ctx.f.search = target.value;
            ctx.pages.goals = 0;
            filterRows();
        }
        if (target.dataset.gpSearch === 'cycles') {
            ctx.cf.search = target.value;
            ctx.pages.cycles = 0;
            $('[data-gp-cycle-results]').innerHTML = cycleRows(ctx);
        }
    });
    document.addEventListener('change', (event) => {
        const target = event.target;
        if (target.name === 'gp-type') {
            chosenType = target.value;
            $('[data-gp-action=choose-type]').disabled = false;
        }
        if (target.dataset.gpFilter) {
            ctx.f[target.dataset.gpFilter] = target.value;
            ctx.pages.goals = 0;
            filterRows();
        }
        if (target.dataset.gpCycleFilter) {
            ctx.cf[target.dataset.gpCycleFilter] = target.value;
            ctx.pages.cycles = 0;
            $('[data-gp-cycle-results]').innerHTML = cycleRows(ctx);
        }
        if (target.matches('[data-gp-assessment-filter]')) {
            ctx.assessmentFilter = target.value;
            ctx.pages.assessments = 0;
            render();
        }
        if (
            target.closest('#gp-goal-form') &&
            ['cycleId', 'noBaseline', 'templateId'].includes(target.name)
        ) {
            syncGoal();
            dirty = true;
            if (target.name === 'noBaseline') render();
            else if (target.name === 'cycleId') {
                const cycle = data.cycles.find((c) => c.id === target.value);
                $('[data-gp-goal-range]').textContent = cycle
                    ? monthRange(cycle.month).map(date).join(' — ')
                    : 'Pilih periode';
            } else if (target.name === 'templateId') {
                render();
                $('#gp-goal-form [name="templateId"]')?.focus();
            }
        }
        if (target.closest('#gp-cycle-form') && target.name === 'month') {
            syncCycle();
            const cycle = ctx.cycleWorking;
            if (!monthRange(target.value)[0]) return;
            cycle.name = `Penilaian ${monthLabel(target.value)}`;
            if (!cycle.id) {
                const defaults = emptyCycle(target.value);
                for (const key of [
                    'opens',
                    'submission',
                    'approval',
                    'finalization',
                    'closes',
                ])
                    cycle[key] = defaults[key];
            }
            const form = $('#gp-cycle-form');
            form.elements.name.value = cycle.name;
            $('[data-gp-cycle-range]').textContent = monthRange(target.value)
                .map(date)
                .join(' — ');
            dirty = true;
        }
        if (
            target.closest('#gp-drawer-form') &&
            drawerKind === 'filters' &&
            target.name === 'division'
        ) {
            const unit = $('#gp-drawer-form').elements.unit;
            unit.replaceChildren(
                new Option('Semua unit', ''),
                ...data.units
                    .filter(
                        (u) => !target.value || u.divisionId === target.value,
                    )
                    .map((u) => new Option(u.name, u.id)),
            );
        }
    });
    $('#gp-drawer').addEventListener('cancel', (event) => {
        event.preventDefault();
        cancelDrawer();
    });
    $('#gp-drawer').addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelDrawer();
        }
    });
    $('#gp-drawer').addEventListener(
        'click',
        (event) => {
            const dialog = $('#gp-drawer'),
                bounds = dialog.getBoundingClientRect();
            const outside =
                event.target === dialog &&
                (event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom);
            if (event.target.closest('[data-dialog-close]') || outside) {
                event.preventDefault();
                event.stopPropagation();
                cancelDrawer();
            }
        },
        true,
    );
    window.addEventListener('beforeunload', (event) => {
        if (dirty || drawerDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    window.addEventListener('popstate', () => {
        const target = location.href;
        if (dirty) {
            history.pushState({}, '', currentHref);
            const url = new URL(target);
            navigate(
                url.searchParams.get('screen') || 'goals',
                Object.fromEntries(
                    [...url.searchParams].filter(([key]) => key !== 'screen'),
                ),
            );
        } else {
            currentHref = target;
            ctx.working = null;
            ctx.cycleWorking = null;
            ctx.step = 0;
            render();
        }
    });
    window.addEventListener('storage', (event) => {
        if (event.key === KEY && (dirty || drawerDirty)) {
            message(
                new Error(
                    'Data prototype berubah di tab lain. Selesaikan atau salin isian Anda sebelum memuat ulang.',
                ),
            );
            return;
        }
        if (event.key === KEY && !dirty && !drawerDirty) {
            load();
            ctx.data = data;
            ctx.assessmentWorking = null;
            render();
        }
    });
    document.addEventListener(
        'click',
        async (event) => {
            const a = event.target.closest('a[href]');
            if (
                !a ||
                a.dataset.gpNav ||
                !dirty ||
                event.ctrlKey ||
                event.metaKey
            )
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (await leave()) {
                dirty = false;
                location.href = a.href;
            }
        },
        true,
    );
    render();
}
