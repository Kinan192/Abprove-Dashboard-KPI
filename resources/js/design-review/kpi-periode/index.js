import '../../../css/design-review/kpi-periode.css';
import { $, $$, open, confirm, toast } from '../../abprove/ui.js';
import {
    KEY,
    METHODS,
    TARGETS,
    STATUSES,
    clone,
    context,
    permitted,
    seed,
    emptyKpi,
    saveKpi,
    removeKpi,
    kpiErrors,
    calculate,
    totalWeight,
    totals,
    assess,
    monthLabel,
    periodErrors,
    savePeriod,
} from './model.js';
import {
    esc,
    note,
    empty,
    num,
    errorFields,
} from '../../abprove/goals/markup.js';
import {
    button,
    nav,
    master,
    masterRows,
    edit,
    detail,
    card,
    results,
    roster,
    assessment,
    monitor,
    monitorRows,
    periods,
    periodEdit,
    periodPicker,
} from './views.js';
import {
    editableKpi,
    humanFormula,
    recommendations,
} from './formula-config.js';
import {
    variablesMarkup,
    formulaReview,
    formulaTest,
    formulaTokens,
    recipients,
    assignmentMarkup,
    monthlyWeights,
} from './formula-editor.js';
import { newPeriod } from './period-editor.js';
let data, storageError, remoteMode = false, remoteRevision = 0, remoteData = null;
let remoteQueue = Promise.resolve();
const needsAssessments = (screen) => ['monitor', 'assessment'].includes(screen);
function load() {
    if (remoteMode) {
        storageError = null;
        data = remoteData;
        return;
    }
    try {
        storageError = null;
        const raw = localStorage.getItem(KEY);
        data = raw ? JSON.parse(raw) : seed();
        if (
            data.version !== 1 ||
            ![
                'kpis',
                'periods',
                'assessments',
                'people',
                'units',
                'audit',
            ].every((k) => Array.isArray(data[k]))
        )
            throw new Error('Data prototype tidak sesuai.');
        if (!raw) localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
        storageError = e.message;
    }
}
async function prepare(c, s) {
    if (c.kpiWorkspace) {
        const month = new URLSearchParams(location.search).get('cycle') || c.selectedCycle || new Date().toISOString().slice(0, 7);
        const screen = new URLSearchParams(location.search).get('screen') || (c.page === 'pengaturan' ? 'periods' : 'master');
        const response = await fetch(`/hc/kpi-workspace?cycle=${encodeURIComponent(month)}&include_assessments=${needsAssessments(screen) ? 1 : 0}`, {
            headers: { Accept: 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(payload.message || 'KPI workspace gagal dimuat.');
        remoteMode = true;
        remoteData = payload.data;
        remoteRevision = payload.revision || 0;
        load();
        s.data.cycles = data.periods.map((p) => ({ ...p, id: p.id, dbId: p.businessId }));
        return;
    }
    if (!c.review)
        throw new Error('Prototype hanya tersedia di design-review.');
    load();
    if (!storageError)
        s.data.cycles = data.periods.map((p) => ({ ...p, id: p.id }));
}
async function saveRemote(next) {
    const screen = new URLSearchParams(location.search).get('screen') || 'master';
    const response = await fetch(`/hc/kpi-workspace?cycle=${encodeURIComponent(next.selectedMonth || new Date().toISOString().slice(0, 7))}&include_assessments=${needsAssessments(screen) ? 1 : 0}`, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')
                ?.content,
        },
        body: JSON.stringify({ revision: remoteRevision, data: { version: next.version, kpis: next.kpis, periods: next.periods } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(
            Object.values(payload.errors || {})
                .flat()
                .join(' ') ||
                payload.message ||
                'Perubahan KPI gagal disimpan.',
        );
    remoteRevision = payload.revision;
    return payload.data;
}
function init(c, s) {
    const root = $('[data-simple-kpi]'),
        host = $('[data-skp-content]'),
        role = context(c.role);
    const ctx = {
        data,
        role,
        pages: {},
        periodId: remoteMode ? data.selectedMonth : '2026-11',
        filter: { search: '', unit: '', role: '' },
        statusFilter: '',
        working: null,
        testValues: {},
        periodWorking: null,
        periodEditing: '',
        assessmentWorking: null,
        kpiIndex: 0,
    };
    let dirty = false,
        periodDirty = false,
        previewKpi,
        previewInput = {},
        currentHref = location.href;
    const params = () => new URLSearchParams(location.search);
    const screen = () =>
        params().get('screen') ||
        (role.role === 'hc'
            ? c.page === 'pengaturan'
                ? 'periods'
                : c.page === 'rekap'
                  ? 'monitor'
                  : 'master'
            : role.role === 'ku'
              ? 'staff'
              : c.page === 'nilai-kepala'
                ? 'heads'
                : 'staff');
    ctx.url = (name, id = '') => {
        const page =
            role.role === 'hc'
                ? ['periods', 'period-edit'].includes(name)
                    ? 'pengaturan'
                    : 'kpi'
                : role.role === 'ku'
                  ? 'nilai'
                  : name === 'heads'
                    ? 'nilai-kepala'
                    : 'persetujuan';
        const url = new URL(c.links[page], location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('screen', name);
        const period =
            name === 'detail'
                ? data.kpis.find((k) => k.id === id)?.periodId
                : name === 'assessment'
                  ? data.assessments.find((a) => a.id === id)?.periodId
                  : null;
        url.searchParams.set('cycle', period || ctx.periodId);
        if (id) url.searchParams.set('id', id);
        if (role.role !== 'hc')
            url.searchParams.set('redesign', 'kpi-sederhana');
        return url.href;
    };
    function fail(e) {
        let el = $('[data-skp-error]', root);
        if (!el) {
            el = document.createElement('p');
            el.className = 'gp-note error';
            el.dataset.skpError = '';
            el.setAttribute('role', 'alert');
            host.before(el);
        }
        el.textContent = e.message || String(e);
        el.hidden = false;
    }
    async function commit(fn) {
        if (remoteMode) {
            try {
                const next = clone(data),
                    result = fn(next);
                next.revision = (data.revision || 0) + 1;
                remoteQueue = remoteQueue.catch(() => {}).then(() => saveRemote(next));
                data = await remoteQueue;
                remoteData = data;
                ctx.data = data;
                s.data.cycles = data.periods.map((p) => ({ ...p, dbId: p.businessId }));
                toast('Perubahan KPI & periode tersimpan.');
                return result ?? true;
            } catch (e) {
                fail(e);
                return null;
            }
        }
        try {
            const current = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (!current || (current.revision || 0) !== (data.revision || 0))
                throw new Error(
                    'Data prototype berubah di tab lain. Isian tetap ada; muat ulang sebelum menyimpan.',
                );
            const next = clone(data),
                result = fn(next);
            next.revision = (data.revision || 0) + 1;
            localStorage.setItem(KEY, JSON.stringify(next));
            data = next;
            ctx.data = next;
            toast('Perubahan prototype tersimpan di browser.');
            return result ?? true;
        } catch (e) {
            fail(e);
            return null;
        }
    }
    async function leave() {
        return (
            (!dirty && !periodDirty) ||
            (await confirm(
                'Perubahan belum disimpan. Kembali untuk menyimpan atau buang perubahan untuk keluar.',
                { label: 'Buang perubahan' },
            ))
        );
    }
    async function refreshRemote(month) {
        const include = needsAssessments(screen());
        if (!remoteMode || !month || (data.selectedMonth === month && (!include || data.assessmentsLoaded))) return;
        const response = await fetch(`/hc/kpi-workspace?cycle=${encodeURIComponent(month)}&include_assessments=${include ? 1 : 0}`, { headers: { Accept: 'application/json' } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'KPI bulan terpilih gagal dimuat.');
        remoteRevision = payload.revision;
        data = remoteData = payload.data;
        ctx.data = data;
        s.data.cycles = data.periods.map((p) => ({ ...p, dbId: p.businessId }));
    }
    async function go(name, id = '', force = false) {
        if (!force && !(await leave())) return;
        if (!force) {
            ctx.working = null;
            ctx.periodWorking = null;
            ctx.periodEditing = '';
            ctx.testValues = {};
        }
        dirty = false;
        periodDirty = false;
        ctx.kpiIndex = 0;
        ctx.assessmentWorking = null;
        history.pushState({}, '', ctx.url(name, id));
        currentHref = location.href;
        await refreshRemote(params().get('cycle'));
        render();
        $('#main-content')?.scrollTo({ top: 0 });
    }
    function sync() {
        const f = $('#skp-kpi-form');
        if (!f || !ctx.working) return;
        for (const input of [...f.elements])
            if (input.name) {
                if (
                    ['scoreRule', 'zeroRule', 'scoreMin', 'scoreMax'].includes(
                        input.name,
                    )
                )
                    continue;
                ctx.working[input.name] =
                    input.type === 'checkbox' ? input.checked : input.value;
            }
        for (const [name, key] of [
            ['scoreRule', 'rule'],
            ['zeroRule', 'zeroRule'],
            ['scoreMin', 'min'],
            ['scoreMax', 'max'],
        ])
            if (f.elements[name])
                ctx.working.policy[key] = f.elements[name].value;
        $$('[data-fx-variable-label]', f).forEach((el) => {
            const v = ctx.working.variables.find(
                (v) => v.key === el.dataset.fxVariableLabel,
            );
            if (v) v.label = el.value;
        });
        $$('[data-fx-variable-source]', f).forEach((el) => {
            const v = ctx.working.variables.find(
                (v) => v.key === el.dataset.fxVariableSource,
            );
            if (v) v.source = el.value;
        });
        $$('[data-fx-variable-fixed]', f).forEach((el) => {
            const v = ctx.working.variables.find(
                (v) => v.key === el.dataset.fxVariableFixed,
            );
            if (v) v.value = el.value;
        });
        if ($('[data-fx-assignee]', f)) {
            ctx.working.assignmentMode = 'selected';
            ctx.working.assigneeIds = $$('[data-fx-assignee]:checked', f).map(
                (el) => el.dataset.fxAssignee,
            );
        }
    }
    function updateFormulaPanels(rebuild = false) {
        if (!$('#skp-kpi-form')) return;
        if (rebuild) {
            $('[data-fx-variables]').innerHTML = variablesMarkup(
                ctx.working,
                ctx.testValues,
            );
            $('[data-fx-tokens]').innerHTML = formulaTokens(ctx.working);
            $('[data-fx-test-panel]').innerHTML = formulaTest(ctx);
        } else {
            const template = document.createElement('template');
            template.innerHTML = formulaTest(ctx);
            $('[data-fx-test-output]').innerHTML =
                template.content.querySelector(
                    '[data-fx-test-output]',
                ).innerHTML;
            for (const v of ctx.working.variables || []) {
                const label = $(`[data-fx-test-label="${v.key}"]`);
                if (label) label.textContent = v.label || 'Belum diberi nama';
                if (v.source === 'fixed') {
                    const input = $(`[data-fx-test="${v.key}"]`);
                    if (input) input.value = v.value ?? '';
                }
            }
        }
        $('[data-fx-human]').textContent = humanFormula(ctx.working);
        $('[data-fx-tokens]').innerHTML = formulaTokens(ctx.working);
        $('[data-fx-review]').innerHTML = formulaReview(ctx);
    }
    function newKpi() {
        return editableKpi({
            ...emptyKpi(ctx.periodId),
            method: 'formula',
            unit: '%',
            assignmentMode: 'selected',
            variables: [
                { key: 'A', label: '', source: 'manual' },
                { key: 'B', label: '', source: 'manual' },
            ],
            formula: 'A / B * 100',
            policy: {
                rule: 'target-normalized',
                zeroRule: 'pending',
                min: 10,
                max: 100,
            },
        });
    }
    function scrollEditor(selector = '#skp-kpi-form') {
        $(selector)?.scrollIntoView({ block: 'start' });
    }
    function syncPeriod() {
        const f = $('#skp-period-form');
        if (!f || !ctx.periodWorking) return;
        const v = Object.fromEntries(new FormData(f));
        if (!v.month) return;
        ctx.periodWorking = {
            id: v.month,
            name: v.name,
            status: v.status,
            opens: v.opens,
            submission: v.submission,
            approval: v.approval,
            closes: v.closes,
            categories: { sb: v.sb, b: v.b, c: v.c },
        };
    }
    async function changeMonth(value) {
        if (!data.periods.some((p) => p.id === value)) return;
        if (!(await leave())) {
            const select = $('[data-skp-period-choice]');
            if (select) select.value = ctx.periodId;
            return;
        }
        const name = screen(),
            old = data.assessments.find((a) => a.id === params().get('id'));
        await refreshRemote(value);
        const url = new URL(location.href);
        url.searchParams.set('cycle', value);
        if (name === 'assessment') {
            const next = data.assessments.find(
                (a) =>
                    a.periodId === value &&
                    a.personId === old?.personId &&
                    permitted(a, role),
            );
            if (next) url.searchParams.set('id', next.id);
            else {
                url.searchParams.delete('id');
                url.searchParams.set(
                    'screen',
                    role.role === 'hc'
                        ? 'monitor'
                        : role.role === 'ku'
                          ? 'staff'
                          : old?.subjectType === 'unit_head'
                            ? 'heads'
                            : 'staff',
                );
            }
        } else if (['detail', 'edit'].includes(name)) {
            url.searchParams.delete('id');
            url.searchParams.set('screen', 'master');
        }
        dirty = false;
        periodDirty = false;
        ctx.working = null;
        ctx.assessmentWorking = null;
        ctx.pages = {};
        ctx.kpiIndex = 0;
        history.pushState({}, '', url.href);
        currentHref = location.href;
        render();
    }
    function updateInputs(target, preview = false) {
        const k = preview
            ? previewKpi
            : ctx.assessmentWorking?.snapshot.find(
                  (k) => k.id === target.dataset.kpi,
              );
        if (!k) return;
        const input = preview
            ? previewInput
            : (ctx.assessmentWorking.inputs[k.id] ||= {});
        input[target.dataset.skpInput] = target.value;
        const section = target.closest('[data-skp-card]');
        $('.skp-results', section).innerHTML = results(k, input);
        if (!preview) {
            dirty = true;
            const t = totals(ctx.assessmentWorking).total;
            $('[data-skp-total]').textContent = num(t, 2);
        }
    }
    function render() {
        const e = $('[data-skp-error]', root);
        if (e) e.hidden = true;
        if (storageError) {
            host.innerHTML =
                note(
                    `Data simulasi tidak dapat dimuat: ${storageError}`,
                    'error',
                ) + button('reset', 'Muat data contoh');
            host.setAttribute('aria-busy', 'false');
            root.dataset.ready = 'true';
            return;
        }
        ctx.data = data;
        if (remoteMode && ((params().get('cycle') && data.selectedMonth !== params().get('cycle')) || (needsAssessments(screen()) && !data.assessmentsLoaded))) {
            refreshRemote(params().get('cycle') || ctx.periodId).then(render).catch(fail);
            return;
        }
        ctx.periodId = data.periods.some((p) => p.id === params().get('cycle'))
            ? params().get('cycle')
            : remoteMode ? data.selectedMonth : '2026-11';
        const name = screen(),
            id = params().get('id');
        if (name === 'detail')
            ctx.periodId =
                data.kpis.find((k) => k.id === id)?.periodId || ctx.periodId;
        if (name === 'assessment') {
            const a = data.assessments.find((a) => a.id === id);
            if (a) ctx.periodId = a.periodId;
            if (ctx.assessmentWorking?.id !== id)
                ctx.assessmentWorking = a ? clone(a) : null;
        }
        if (name === 'edit' && !ctx.working) {
            const original =
                name === 'edit' && data.kpis.find((k) => k.id === id);
            ctx.working = original ? editableKpi(original) : newKpi();
        }
        if (name === 'period-edit' && !ctx.periodWorking) {
            const original = data.periods.find((p) => p.id === id);
            ctx.periodWorking = original ? clone(original) : newPeriod(data);
            ctx.periodEditing = original?.id || '';
        }
        const hc = role.role === 'hc';
        const allowed = hc
            ? [
                  'master',
                  'edit',
                  'detail',
                  'monitor',
                  'assessment',
                  'periods',
                  'period-edit',
              ]
            : role.role === 'ku'
              ? ['staff', 'assessment']
              : ['heads', 'staff', 'assessment'];
        if (!allowed.includes(name)) {
            host.innerHTML = empty(
                'Akses tidak tersedia',
                'Layar ini tidak termasuk cakupan role.',
            );
            return;
        }
        const tabs = hc
            ? [
                  ['master', 'KPI / Goals'],
                  ['periods', 'Periode'],
                  ['monitor', 'Monitoring KPI'],
              ]
            : role.role === 'kd'
              ? [
                    ['heads', 'Penilaian Kepala Unit'],
                    ['staff', 'Persetujuan Staf'],
                ]
              : [['staff', 'Penilaian Staf']];
        const navigation = `<nav class="seg w-fit skp-nav" aria-label="Bagian KPI">${tabs.map(([key, label]) => `<a href="${esc(ctx.url(key))}" data-skp-nav="${key}" class="${name === key || (key === 'master' && ['edit', 'detail'].includes(name)) || (key === 'periods' && name === 'period-edit') ? 'active' : ''}">${label}</a>`).join('')}</nav>`;
        const views = {
            master: () => master(ctx),
            edit: () => edit(ctx),
            detail: () => detail(ctx, id),
            heads: () => roster(ctx, 'heads'),
            staff: () => roster(ctx, 'staff'),
            assessment: () => assessment(ctx, id),
            monitor: () => monitor(ctx),
            periods: () => periods(ctx),
            'period-edit': () => periodEdit(ctx),
        };
        host.innerHTML =
            navigation +
            (['edit', 'period-edit', 'periods'].includes(name)
                ? ''
                : periodPicker(ctx)) +
            views[name]();
        host.setAttribute('aria-busy', 'false');
        root.dataset.ready = 'true';
        $('.top-title').textContent = hc
            ? ['periods', 'period-edit'].includes(name)
                ? 'Pengaturan Periode'
                : 'Master KPI'
            : role.role === 'ku'
              ? 'Penilaian Staf'
              : 'Penilaian KPI';
        $('.top-scope').textContent = role.scope;
        $$('[data-month-label]').forEach(
            (e) => (e.textContent = monthLabel(ctx.periodId)),
        );
        $$('[data-month-short]').forEach(
            (e) => (e.textContent = monthLabel(ctx.periodId).slice(0, 3)),
        );
        const cycleMenu = $('[data-cycle-options]');
        if (cycleMenu) {
            cycleMenu.innerHTML = data.periods
                .toSorted((a, b) => b.id.localeCompare(a.id))
                .map((period) => {
                    const url = new URL(location.href);
                    url.searchParams.set('cycle', period.id);
                    if (name === 'assessment') {
                        url.searchParams.delete('id');
                        url.searchParams.set(
                            'screen',
                            role.role === 'hc'
                                ? 'monitor'
                                : role.role === 'ku'
                                  ? 'staff'
                                  : ctx.assessmentWorking?.subjectType ===
                                      'unit_head'
                                    ? 'heads'
                                    : 'staff',
                        );
                    }
                    return `<a class="menu-item text-xs" href="${esc(url.href)}">${esc(period.name)} · ${{ open: 'Aktif', planned: 'Direncanakan', closed: 'Ditutup' }[period.status]}</a>`;
                })
                .join('');
        }
        $$('[data-notification-count]').forEach((e) => {
            e.hidden = true;
            e.textContent = '0';
        });
        if (role.role !== 'hc')
            $$('[data-profile-name]').forEach(
                (e) => (e.textContent = role.name),
            );
        for (const a of $$('aside a[href]')) {
            const url = new URL(a.href);
            if (
                [
                    'nilai',
                    'nilai-kepala',
                    'pengajuan',
                    'persetujuan',
                    'rekap',
                ].some(
                    (p) =>
                        c.links[p] &&
                        new URL(c.links[p]).pathname === url.pathname,
                )
            ) {
                url.searchParams.set('redesign', 'kpi-sederhana');
                a.href = url.href;
            }
        }
    }
    function showPreview(id) {
        sync();
        const k = id ? data.kpis.find((k) => k.id === id) : ctx.working;
        if (!k) return;
        previewKpi = clone(k);
        previewInput =
            k.method === 'manual'
                ? { value: 85 }
                : k.method === 'formula'
                  ? Object.fromEntries(
                        (k.variables || []).map((v, i) => [
                            `variable_${v.key}`,
                            ctx.testValues[v.key] ?? (i === 0 ? 65 : 80),
                        ]),
                    )
                  : k.method === 'ratio'
                    ? {
                          actual: k.denominatorSource === 'fixed' ? 3 : 65,
                          comparison: 80,
                      }
                    : { actual: 8 };
        $('[data-skp-preview]').innerHTML =
            note(
                'Simulasi form penilai. Angka di preview tidak disimpan sebagai nilai pegawai.',
            ) + card(previewKpi, previewInput, true, true);
        open('skp-preview');
    }
    async function periodForm(id) {
        if (!(await leave())) return;
        ctx.periodEditing = id || '';
        ctx.periodWorking = id
            ? clone(data.periods.find((p) => p.id === id))
            : newPeriod(data);
        periodDirty = false;
        ctx.periodSaved = '';
        await go('period-edit', id || '', true);
        scrollEditor('#skp-period-form');
    }
    async function action(name, id) {
        if (
            [
                'add-variable',
                'remove-variable',
                'formula-token',
                'formula-preset',
                'formula-fix',
            ].includes(name)
        ) {
            sync();
            const k = ctx.working;
            if (!k) return;
            if (name === 'add-variable') {
                const key = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(
                    (key) => !(k.variables || []).some((v) => v.key === key),
                );
                if (!key) return;
                k.variables.push({ key, label: '', source: 'manual' });
                updateFormulaPanels(true);
                $(`[data-fx-variable-label="${key}"]`)?.focus();
            }
            if (name === 'remove-variable') {
                k.variables = k.variables.filter((v) => v.key !== id);
                delete ctx.testValues[id];
                updateFormulaPanels(true);
            }
            if (name === 'formula-token') {
                const input = $('#skp-kpi-form [name=formula]');
                const start = input.selectionStart ?? input.value.length,
                    end = input.selectionEnd ?? start;
                const token = `${start && !/[\s(]$/.test(input.value.slice(0, start)) ? ' ' : ''}${id}${id.endsWith('(') ? '' : ' '}`;
                input.value =
                    input.value.slice(0, start) +
                    token +
                    input.value.slice(end);
                k.formula = input.value;
                input.focus();
                input.setSelectionRange(
                    start + token.length,
                    start + token.length,
                );
                updateFormulaPanels();
            }
            if (name === 'formula-preset' || name === 'formula-fix') {
                const preset =
                    name === 'formula-preset'
                        ? recommendations(k).find((r) => r.id === id)
                        : { formula: id };
                if (!preset) return;
                k.formula = preset.formula;
                if (preset.unit) k.unit = preset.unit;
                $('#skp-kpi-form [name=formula]').value = k.formula;
                updateFormulaPanels();
            }
            dirty = true;
            return;
        }
        if (name === 'new') {
            if (!(await leave())) return;
            ctx.working = newKpi();
            ctx.savedMessage = '';
            ctx.testValues = {};
            await go('edit', '', true);
            scrollEditor();
            return;
        }
        if (name === 'edit') {
            if (!(await leave())) return;
            ctx.working = editableKpi(data.kpis.find((k) => k.id === id));
            ctx.savedMessage = '';
            ctx.testValues = {};
            await go('edit', id, true);
            scrollEditor();
            return;
        }
        if (name === 'cancel') {
            if (!(await leave())) return;
            ctx.working = null;
            ctx.testValues = {};
            ctx.savedMessage = '';
            await go('master', '', true);
            scrollEditor();
            return;
        }
        if (name === 'preview') return showPreview(id);
        if (name === 'save') {
            sync();
            const e = kpiErrors(data, ctx.working);
            if (e.policy || e.rubric) $('.fx-settings').open = true;
            if (!errorFields($('#skp-kpi-form'), e)) {
                const invalid = $(
                    '[data-gp-error]:not([hidden])',
                    $('#skp-kpi-form'),
                );
                invalid?.scrollIntoView({ block: 'center' });
                return;
            }
            const saved = await commit((next) => saveKpi(next, ctx.working, role));
            if (saved) {
                dirty = false;
                ctx.working = null;
                ctx.testValues = {};
                ctx.savedMessage = `KPI "${saved.name}" tersimpan untuk ${monthLabel(saved.periodId)}.`;
                ctx.periodId = saved.periodId;
                ctx.filter.search = '';
                ctx.pages['simple-master'] = Math.floor(
                    data.kpis
                        .filter((k) => k.periodId === saved.periodId)
                        .findIndex((k) => k.id === saved.id) / 5,
                );
                return go('master', '', true);
            }
            return;
        }
        if (name === 'delete') {
            if (
                await confirm(
                    'Hapus Master KPI ini? Penilaian yang sudah Selesai tetap mempertahankan snapshot dan hasilnya.',
                    { label: 'Hapus KPI' },
                )
            ) {
                if (await commit((next) => removeKpi(next, id, role))) {
                    if (ctx.working?.id === id) {
                        ctx.working = null;
                        dirty = false;
                    }
                    render();
                }
            }
            return;
        }
        if (name === 'new-period' || name === 'period')
            return periodForm(name === 'period' ? id : null);
        if (['draft', 'send', 'complete', 'approve', 'return'].includes(name)) {
            const row = data.assessments.find((a) => a.id === id);
            let payload = ctx.assessmentWorking
                ? {
                      inputs: ctx.assessmentWorking.inputs,
                      positive: ctx.assessmentWorking.positive,
                      negative: ctx.assessmentWorking.negative,
                  }
                : {};
            if (['send', 'complete'].includes(name)) {
                const r = totals(row, payload.inputs),
                    invalid = r.results.findIndex((r) => r.score == null);
                if (invalid >= 0 || totalWeight(row.snapshot) !== 100) {
                    ctx.kpiIndex = Math.max(0, invalid);
                    render();
                    const error = $('[data-skp-assessment-error]');
                    error.hidden = false;
                    error.textContent =
                        totalWeight(row.snapshot) !== 100
                            ? 'Total bobot harus 100% sebelum penilaian dikirim/diselesaikan.'
                            : 'Lengkapi seluruh KPI; periksa angka aktual, pembanding, atau nilai manual.';
                    return;
                }
            }
            if (name === 'return') {
                const reason = await confirm(
                    'Kembalikan penilaian staf ke Kepala Unit. Jelaskan bagian yang perlu direvisi.',
                    { reason: true, label: 'Kembalikan untuk Revisi' },
                );
                if (!reason) return;
                payload = { reason };
            } else if (
                name !== 'draft' &&
                !(await confirm(
                    {
                        send: 'Kirim penilaian lengkap kepada Kepala Divisi?',
                        complete:
                            'Selesaikan penilaian Kepala Unit? Keputusan berakhir di Kepala Divisi dan hasil menjadi hanya baca.',
                        approve:
                            'ACC penilaian staf tanpa mengubah angka? Hasil langsung Selesai.',
                    }[name],
                    {
                        label: {
                            send: 'Kirim Penilaian',
                            complete: 'Selesaikan Penilaian',
                            approve: 'Setujui',
                        }[name],
                    },
                ))
            )
                return;
            const saved = await commit((next) =>
                assess(next, id, name, payload, role),
            );
            if (saved) {
                dirty = false;
                ctx.assessmentWorking = clone(saved);
                render();
            }
            return;
        }
        if (name === 'reset') {
            if (
                await confirm(
                    'Reset hanya data contoh KPI sederhana di browser ini? Database aplikasi tidak berubah.',
                    { label: 'Reset data contoh' },
                )
            ) {
                data = seed();
                localStorage.setItem(KEY, JSON.stringify(data));
                storageError = null;
                dirty = false;
                ctx.working = null;
                ctx.assessmentWorking = null;
                await go(
                    role.role === 'hc'
                        ? 'master'
                        : role.role === 'ku'
                          ? 'staff'
                          : 'heads',
                    '',
                    true,
                );
            }
            return;
        }
    }
    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-skp-nav]');
        if (link && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            go(link.dataset.skpNav, link.dataset.id).catch(fail);
            return;
        }
        const b = event.target.closest('[data-skp-action]');
        if (b) {
            action(b.dataset.skpAction, b.dataset.id).catch(fail);
            return;
        }
        const pager = event.target.closest('[data-gp-page]');
        if (pager) {
            ctx.pages[pager.dataset.gpPage] =
                (ctx.pages[pager.dataset.gpPage] || 0) + +pager.dataset.delta;
            render();
            return;
        }
        const index = event.target.closest('[data-skp-kpi-index]');
        if (index) {
            ctx.kpiIndex = +index.dataset.skpKpiIndex;
            render();
            return;
        }
        const status = event.target.closest('[data-skp-status]');
        if (status) {
            ctx.statusFilter = status.dataset.skpStatus;
            ctx.pages['simple-roster'] = 0;
            render();
        }
    });
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (target.hasAttribute('data-skp-monitor-search')) {
            ctx.monitorFilter.search = target.value;
            ctx.pages['simple-monitor'] = 0;
            $('[data-skp-monitor-results]').innerHTML = monitorRows(ctx);
            return;
        }
        if (target.hasAttribute('data-fx-test')) {
            ctx.testValues[target.dataset.fxTest] = target.value;
            updateFormulaPanels();
            return;
        }
        if (target.closest('#skp-kpi-form')) {
            dirty = true;
            sync();
            if (target.hasAttribute('data-fx-assignee')) {
                const id = target.dataset.fxAssignee;
                $('[data-fx-assignment]').innerHTML = assignmentMarkup(ctx);
                $(`[data-fx-assignee="${id}"]`)?.focus();
                return;
            }
            updateFormulaPanels();
        }
        if (target.dataset.skpInput) {
            updateInputs(target, !!target.closest('#skp-preview'));
        }
        if (target.hasAttribute('data-skp-search')) {
            ctx.filter.search = target.value;
            ctx.pages['simple-master'] = 0;
            $('[data-skp-master-results]').innerHTML = masterRows(ctx);
        }
        if (target.closest('#skp-period-form')) {
            periodDirty = true;
            syncPeriod();
        }
    });
    document.addEventListener('change', (event) => {
        const target = event.target;
        if (target.hasAttribute('data-gp-page-size')) {
            const size = +target.value;
            if ([10, 25, 50].includes(size)) {
                ctx.pageSizes ||= {};
                ctx.pageSizes[target.dataset.gpPageSize] = size;
                ctx.pages[target.dataset.gpPageSize] = 0;
                render();
            }
            return;
        }
        if (target.dataset.skpMonitorFilter) {
            ctx.monitorFilter[target.dataset.skpMonitorFilter] = target.value;
            ctx.pages['simple-monitor'] = 0;
            $('[data-skp-monitor-results]').innerHTML = monitorRows(ctx);
            return;
        }
        if (target.hasAttribute('data-skp-period-choice')) {
            changeMonth(target.value).catch(fail);
            return;
        }
        if (target.closest('#skp-kpi-form')) {
            sync();
            dirty = true;
            if (target.name === 'direction') {
                ctx.working.policy.rule =
                    target.value === 'higher' ? 'target-normalized' : 'pending';
            }
            if (
                target.name === 'method' &&
                target.value === 'formula' &&
                !ctx.working.variables.length
            ) {
                ctx.working.variables = [
                    { key: 'A', label: 'Realisasi', source: 'manual' },
                    { key: 'B', label: 'Pembanding', source: 'manual' },
                ];
                ctx.working.formula = 'A / B * 100';
                ctx.working.unit = '%';
                ctx.working.policy.min = 10;
            }
            if (['periodId', 'unitId', 'targetRole'].includes(target.name)) {
                const eligible = new Set(
                    recipients(data, ctx.working).map((p) => p.id),
                );
                ctx.working.assigneeIds = ctx.working.assigneeIds.filter((id) =>
                    eligible.has(id),
                );
            }
            if (target.hasAttribute('data-fx-variable-source')) {
                updateFormulaPanels(true);
                return;
            }
            if (
                [
                    'method',
                    'direction',
                    'unitId',
                    'targetRole',
                    'periodId',
                ].includes(target.name)
            ) {
                render();
                $(`#skp-kpi-form [name="${target.name}"]`)?.focus();
            }
        }
        if (target.dataset.skpFilter) {
            ctx.filter[target.dataset.skpFilter] = target.value;
            ctx.pages['simple-master'] = 0;
            ctx.pages['simple-weights'] = 0;
            $('[data-skp-master-results]').innerHTML = masterRows(ctx);
            const weights = $('[data-skp-weight-results]');
            if (weights) weights.innerHTML = monthlyWeights(ctx);
        }
        if (target.hasAttribute('data-skp-person')) {
            const requested = target.value;
            go('assessment', requested)
                .then(() => {
                    if (params().get('id') !== requested)
                        target.value = params().get('id');
                })
                .catch(fail);
        }
    });
    document.addEventListener('submit', (event) => {
        if (event.target.id === 'skp-kpi-form') {
            event.preventDefault();
            action('save').catch(fail);
        }
        if (event.target.id === 'skp-period-form') {
            event.preventDefault();
            const f = event.target,
                v = Object.fromEntries(new FormData(f)),
                p = {
                    id: v.month,
                    name: v.name,
                    status: v.status,
                    opens: v.opens,
                    submission: v.submission,
                    approval: v.approval,
                    closes: v.closes,
                    categories: { sb: v.sb, b: v.b, c: v.c },
                },
                e = periodErrors(data, p);
            if (!errorFields(f, e)) return;
            confirm('Simpan pengaturan periode dan kategori ini?', {
                label: 'Simpan periode',
            })
                .then(async (ok) => {
                    if (
                        ok &&
                        await commit((next) =>
                            savePeriod(next, p, ctx.periodEditing, role),
                        )
                    ) {
                        periodDirty = false;
                        ctx.periodWorking = newPeriod(data);
                        ctx.periodEditing = '';
                        ctx.periodSaved = `Periode "${p.name}" tersimpan.`;
                        go('periods', '', true).catch(fail);
                    }
                })
                .catch(fail);
        }
    });
    window.addEventListener('beforeunload', (event) => {
        if (dirty || periodDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    document.addEventListener(
        'click',
        (event) => {
            const a = event.target.closest('a[href]');
            if (
                a &&
                !a.dataset.skpNav &&
                (dirty || periodDirty) &&
                !event.ctrlKey &&
                !event.metaKey
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                leave().then((ok) => {
                    if (ok) {
                        dirty = false;
                        periodDirty = false;
                        location.href = a.href;
                    }
                });
            }
        },
        true,
    );
    window.addEventListener('popstate', () => {
        const requested = location.href;
        if (dirty || periodDirty) {
            history.pushState({}, '', currentHref);
            leave().then((ok) => {
                if (ok) {
                    dirty = false;
                    periodDirty = false;
                    history.pushState({}, '', requested);
                    currentHref = requested;
                    ctx.working = null;
                    ctx.periodWorking = null;
                    ctx.periodEditing = '';
                    ctx.assessmentWorking = null;
                    render();
                }
            });
        } else {
            currentHref = requested;
            ctx.working = null;
            ctx.periodWorking = null;
            ctx.periodEditing = '';
            ctx.assessmentWorking = null;
            render();
        }
    });
    window.addEventListener('storage', (event) => {
        if (remoteMode || event.key !== KEY) return;
        if (dirty || periodDirty) {
            fail(
                new Error(
                    'Data prototype berubah di tab lain. Isian Anda tetap dipertahankan.',
                ),
            );
            return;
        }
        load();
        ctx.assessmentWorking = null;
        render();
    });
    render();
}
export { prepare as prepareGoalShell, init as initGoalPrototype };
