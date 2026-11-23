import '../../css/kpi-workspace.css';
import { $, $$, confirm, toast } from '../abprove/ui.js';
import { paginate } from '../abprove/pagination.js';
import {
    clone,
    derive,
    monthLabel,
    recipientMix,
    emptyKpi,
    emptyPattern,
    kpiErrors,
    cleanKpi,
    ruleFor,
    totalWeight,
    isComplete,
    patternErrors,
    savePattern,
    removePattern,
    applyPattern,
    duplicatePattern,
    copyPatterns,
    convertLegacy,
    openBlock,
    periodErrors,
    savePeriod,
    documentPayload,
    validYear,
    YEAR_MIN,
    YEAR_MAX,
} from './model.js';
import { esc, row, errorFields, empty, button } from './markup.js';
import {
    stepNav,
    periodPicker,
    loadingView,
    periods,
    periodEdit,
    patterns,
    patternEdit,
    apply,
    matrix,
    monitor,
    assessment,
    TABLES,
    SUMMARIES,
    unitOptions,
    applyRows,
    holders,
    holderRows,
    holderLock,
    patternTotal,
    othersWeight,
    patternImport,
} from './views.js';
import {
    downloadTemplate,
    selectedSheets,
    importControls,
    currentEdits,
    importKpi,
    importValues,
    editSummary,
    flagged,
    importCounts,
    commitHint,
    fileProblem,
    sheetMatch,
    visibleUsable,
    selectAllLabel,
    EDIT_FIELDS,
} from './pattern-import.js';
import {
    variablesMarkup,
    formulaReview,
    formulaTest,
    testResult,
    formulaTokens,
    weightLine,
} from './formula-editor.js';
import { humanFormula, recommendations } from './formula-config.js';
import { newPeriod, defaultPeriodName, defaultSchedule } from './period-editor.js';

const SCREENS = ['periods', 'period-edit', 'patterns', 'pattern', 'holders', 'import', 'apply', 'matrix', 'monitor', 'assessment'];
const PERIOD_SCREENS = ['periods', 'period-edit'];
const LIST_OF = { pattern: 'patterns', holders: 'patterns', import: 'patterns', assessment: 'monitor', 'period-edit': 'periods' };
const needsAssessments = (screen) => ['monitor', 'assessment'].includes(screen);
const params = () => new URLSearchParams(location.search);
const endpoint = (month, screen) =>
    `/hc/kpi-workspace?${new URLSearchParams({ cycle: month || '', include_assessments: needsAssessments(screen) ? '1' : '0' })}`;
const screenOf = (c) => {
    const screen = params().get('screen');
    return SCREENS.includes(screen) ? screen : c.page === 'pengaturan' ? 'periods' : 'patterns';
};
let data,
    revision = 0;
function accept(payload, s) {
    data = payload.data;
    revision = payload.revision;
    s.data.cycles = data.periods.map((p) => ({ ...p, dbId: p.businessId }));
}
async function prepare(c, s) {
    accept(await c.api.request(endpoint(params().get('cycle') || c.selectedCycle, screenOf(c))), s);
}
function init(c, s) {
    const api = c.api,
        root = $('[data-simple-kpi]'),
        host = $('[data-skp-content]');
    const ctx = {
        data,
        index: derive(data),
        filter: { division: '', unit: '', position: '', role: '', status: '', search: '' },
        monitor: { unit: '', kind: '', status: '', search: '' },
        selection: new Set(),
        /** "Pemakai pola" screen: the pattern shown, its filters, the change target and the selected holders. */
        holders: { patternId: '', search: '', role: '', state: '', target: '', selection: new Set() },
        applyPattern: '',
        pattern: null,
        kpi: null,
        kpiIndex: -1,
        importEdit: null,
        testValues: {},
        period: null,
        message: '',
        /** "Impor pola" screen: chosen file, RSAB sheet list, search and choice, HC row corrections (key → edit), server preview and file-level error. */
        importState: { file: null, format: '', sheets: [], sheetSearch: '', selected: new Set(), edits: new Map(), preview: null, error: '', request: 0, checking: false },
        /** Year shown by the period list (local filter; all periods are already loaded). */
        periodYear: data.selectedMonth.slice(0, 4),
    };
    let dirty = false,
        currentHref = location.href,
        /** Render sequence: only the latest render may paint, so rapid period switches never show stale data. */
        view = 0,
        loading = null,
        /** Filter requested together with a navigation (e.g. "Lihat staf tanpa pola"), applied after loading. */
        pendingFilter = null,
        /** Preview sequence: keys the preview table so a new file always repaints from page 1. */
        importSeq = 0,
        /** Preview request sequence: only the latest request for the same file, period and choice may apply. */
        importRequest = 0;
    const screen = () => screenOf(c);
    /** Period requested by the URL; differs from `ctx.index.month` only while it is loading. */
    const requestedMonth = () => params().get('cycle') || ctx.index.month;
    ctx.url = (name, id = '', cycle = requestedMonth()) => {
        const url = new URL(c.links[PERIOD_SCREENS.includes(name) ? 'pengaturan' : 'kpi'], location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('screen', name);
        if (cycle) url.searchParams.set('cycle', cycle);
        if (id) url.searchParams.set('id', id);
        return url.href;
    };
    const aborted = (e) => e?.name === 'AbortError';
    const fail = (e) => aborted(e) || toast(e.message || String(e), true);
    /** Holder screen state belongs to one pattern of one period. */
    const resetHolders = (patternId = '') =>
        Object.assign(ctx.holders, { patternId, search: '', role: '', state: '', target: '', selection: new Set() });
    const resetImport = () =>
        Object.assign(ctx.importState, { file: null, format: '', sheets: [], sheetSearch: '', selected: new Set(), edits: new Map(), preview: null, error: '', request: 0, checking: false });
    /** Selections, searches and status filters belong to one period; organisation filters stay while still valid. */
    function resetPeriodState() {
        const f = ctx.filter,
            m = ctx.monitor;
        ctx.selection.clear();
        ctx.applyPattern = '';
        resetHolders();
        resetImport();
        if (f.division && !ctx.index.divisions.has(f.division)) f.division = '';
        if (f.unit && !ctx.index.units.has(f.unit)) f.unit = '';
        if (f.position && !data.positions.some((p) => p.id === f.position)) f.position = '';
        if (m.unit && !ctx.index.units.has(m.unit)) m.unit = '';
        Object.assign(f, { status: '', search: '' });
        Object.assign(m, { status: '', search: '' });
        ctx.periodYear = ctx.index.month.slice(0, 4);
    }
    function setData(payload) {
        const previous = ctx.index.month;
        accept(payload, s);
        ctx.data = data;
        ctx.index = derive(data);
        if (previous !== ctx.index.month) resetPeriodState();
        if (!ctx.index.patterns.get(ctx.applyPattern)?.complete) ctx.applyPattern = '';
        for (const id of ctx.selection) if (!ctx.index.people.has(id)) ctx.selection.delete(id);
        const h = ctx.holders;
        for (const id of h.selection) if (ctx.index.assigned.get(id) !== h.patternId || ctx.index.assessed.has(id)) h.selection.delete(id);
    }
    /** Fetches one period; a newer request aborts the previous one. */
    async function fetchPeriod(month, name) {
        loading?.abort();
        const controller = (loading = new AbortController());
        try {
            return await api.request(endpoint(month, name), 'GET', null, { signal: controller.signal });
        } finally {
            if (loading === controller) loading = null;
        }
    }
    /** Applies `mutate` to a copy of the document and stores it; the server answer replaces local data. */
    async function commit(mutate, form = null) {
        let result;
        const ok = await api.perform(form, async () => {
            const next = clone(data);
            result = mutate(next);
            setData(
                await api.request(endpoint(next.selectedMonth, screen()), 'PUT', {
                    revision,
                    data: documentPayload(next),
                }),
            );
        });
        return ok ? (result ?? true) : null;
    }
    const leave = async () =>
        !dirty ||
        (await confirm('Perubahan belum disimpan. Buang perubahan dan lanjutkan?', {
            label: 'Buang perubahan',
        }));
    function reset() {
        dirty = false;
        ctx.pattern = null;
        ctx.kpi = null;
        ctx.importEdit = null;
        ctx.kpiIndex = -1;
        ctx.testValues = {};
        ctx.period = null;
        ctx.periodEditing = '';
    }
    async function go(name, id = '', { cycle = requestedMonth(), keep = false, message = '', filter = null } = {}) {
        if (!keep) {
            if (!(await leave())) return;
            reset();
        }
        ctx.message = message;
        pendingFilter = filter;
        history.pushState({}, '', ctx.url(name, id, cycle));
        currentHref = location.href;
        await render();
        $('#main-content')?.scrollTo({ top: 0 });
    }
    async function edit(name, id, setup) {
        if (!(await leave())) return;
        reset();
        setup();
        await go(name, id, { keep: true });
    }
    /** Replaces the content; keeps keyboard focus on the period controls while switching rapidly. */
    function paint(html) {
        const focused = document.activeElement?.id;
        host.innerHTML = html;
        if (focused?.startsWith('fx-period-')) document.getElementById(focused)?.focus();
    }
    const toolbar = (name, month, busy = false) =>
        `<div class="skp-toolbar">${stepNav(ctx, name, busy)}${PERIOD_SCREENS.includes(name) ? '' : periodPicker(ctx, month)}</div>`;
    async function render() {
        const seq = ++view;
        let name = screen();
        const id = params().get('id') || '',
            month = params().get('cycle') || data.selectedMonth;
        if (month !== data.selectedMonth || (needsAssessments(name) && !data.assessmentsLoaded)) {
            // Never leave the previous period's KPI or scores on screen while another period loads.
            if (month !== data.selectedMonth) paint(toolbar(name, month, true) + loadingView(month));
            host.setAttribute('aria-busy', 'true');
            let payload;
            try {
                payload = await fetchPeriod(month, name);
            } catch (e) {
                if (seq !== view || aborted(e)) return;
                host.setAttribute('aria-busy', 'false');
                paint(toolbar(name, month) + empty('Data periode gagal dimuat', e.message || String(e), button('reload-period', 'Coba lagi', '', 'btn')));
                return;
            }
            if (seq !== view) return;
            setData(payload);
        } else loading?.abort();
        if (pendingFilter) {
            Object.assign(ctx.filter, pendingFilter);
            pendingFilter = null;
        }
        if (name === 'pattern' && !ctx.pattern) {
            const original = data.patterns.find((p) => p.id === id && p.periodId === ctx.index.month);
            if (id && !original) {
                name = 'patterns';
                history.replaceState({}, '', ctx.url(name));
                currentHref = location.href;
            } else ctx.pattern = original ? clone(original) : emptyPattern(ctx.index.month);
        }
        if (name === 'holders') {
            // Pattern IDs belong to one period, so another period never shows the previous period's holders.
            if (!ctx.index.patterns.has(id)) {
                name = 'patterns';
                history.replaceState({}, '', ctx.url(name));
                currentHref = location.href;
            } else if (ctx.holders.patternId !== id) resetHolders(id);
        }
        if (name === 'period-edit' && !ctx.period) {
            const original = data.periods.find((p) => p.id === id);
            ctx.period = original ? clone(original) : newPeriod(data);
            ctx.periodEditing = original?.id || '';
        }
        if (name !== 'import') resetImport();
        const views = {
            periods: () => periods(ctx),
            'period-edit': () => periodEdit(ctx),
            patterns: () => patterns(ctx),
            pattern: () => patternEdit(ctx),
            holders: () => holders(ctx),
            import: () => patternImport(ctx),
            apply: () => apply(ctx),
            matrix: () => matrix(ctx),
            monitor: () => monitor(ctx),
            assessment: () => assessment(ctx, id),
        };
        paint(toolbar(name, ctx.index.month) + views[name]());
        host.setAttribute('aria-busy', 'false');
        root.dataset.ready = 'true';
        mountTables();
        $('.top-title').textContent = PERIOD_SCREENS.includes(name) ? 'Pengaturan Periode' : 'Pola KPI & Penerapan';
        // Keeps the top bar period menu, month labels and navigation links on the same period.
        document.dispatchEvent(new CustomEvent('flow-period-selected', { detail: { key: ctx.index.month } }));
    }
    function token(key) {
        if (key === 'apply' || key === 'matrix')
            return `${ctx.index.month}|${ctx.applyPattern}|${JSON.stringify(ctx.filter)}`;
        if (key === 'monitor') return `${ctx.index.month}|${JSON.stringify(ctx.monitor)}`;
        if (key === 'periods') return ctx.periodYear;
        if (key === 'holders') {
            const { patternId, search, role, state } = ctx.holders;
            return `${ctx.index.month}|${JSON.stringify({ patternId, search, role, state })}`;
        }
        if (key === 'importRows') return `${ctx.index.month}|${ctx.importState.preview?.seq}|${ctx.importState.preview?.onlyErrors}`;
        return ctx.index.month;
    }
    function mountTables() {
        for (const tbody of $$('tbody[data-skp-rows]', host)) {
            const key = tbody.dataset.skpRows,
                definition = TABLES[key],
                records = definition.records(ctx);
            if (!records.length)
                tbody.innerHTML = `<tr><td colspan="${tbody.closest('table').tHead.rows[0].cells.length}" class="empty">${esc(typeof definition.empty === 'function' ? definition.empty(ctx) : definition.empty)}</td></tr>`;
            paginate(tbody, `skp-${key}`, {
                token: token(key),
                records,
                renderRow: (record) => row(definition.row(ctx, record)),
            });
        }
        syncSelectAll();
    }
    function refreshResults() {
        if (screen() === 'apply') {
            const visible = new Set(applyRows(ctx).map((p) => p.id));
            for (const id of ctx.selection) if (!visible.has(id)) ctx.selection.delete(id);
        }
        if (screen() === 'holders') {
            const visible = new Set(selectableHolders().map((h) => h.id));
            for (const id of ctx.holders.selection) if (!visible.has(id)) ctx.holders.selection.delete(id);
        }
        const summary = $('[data-skp-summary]', host);
        if (summary) summary.innerHTML = SUMMARIES[summary.dataset.skpSummary](ctx);
        mountTables();
    }
    /** Holders of the current filter that may be released or changed. */
    const selectableHolders = () => holderRows(ctx).filter((h) => !holderLock(ctx, h));
    function syncSelectAll() {
        const sync = (all, rows, selection) => {
            if (!all) return;
            const selected = rows.filter((p) => selection.has(p.id)).length;
            all.checked = rows.length > 0 && selected === rows.length;
            all.indeterminate = selected > 0 && selected < rows.length;
        };
        sync($('[data-skp-select-all]', host), applyRows(ctx), ctx.selection);
        sync($('[data-skp-holder-select-all]', host), selectableHolders(), ctx.holders.selection);
    }
    function selectFiltered(on) {
        for (const p of applyRows(ctx)) on ? ctx.selection.add(p.id) : ctx.selection.delete(p.id);
        refreshResults();
    }
    function selectHolders(on) {
        for (const h of selectableHolders()) on ? ctx.holders.selection.add(h.id) : ctx.holders.selection.delete(h.id);
        refreshResults();
    }
    function syncPattern() {
        const f = $('#skp-pattern-form');
        if (!f || !ctx.pattern) return;
        const name = f.elements.namedItem('patternName');
        if (name && !name.disabled) ctx.pattern.name = name.value;
    }
    function syncKpi() {
        const f = $('#skp-kpi-form');
        if (!f || !ctx.kpi) return;
        const k = ctx.kpi,
            value = (name) => f.elements.namedItem(name).value;
        for (const name of ['name', 'pillar', 'unit', 'direction', 'target', 'weight', 'formula']) k[name] = value(name);
        k.policy = { rule: ruleFor(k.direction), zeroRule: value('zeroRule'), min: value('scoreMin'), max: value('scoreMax') };
        const variable = (key) => k.variables.find((v) => v.key === key);
        $$('[data-fx-variable-label]', f).forEach((el) => {
            const v = variable(el.dataset.fxVariableLabel);
            if (v) v.label = el.value;
        });
        $$('[data-fx-variable-source]', f).forEach((el) => {
            const v = variable(el.dataset.fxVariableSource);
            if (v) v.source = el.value;
        });
        $$('[data-fx-variable-fixed]', f).forEach((el) => {
            const v = variable(el.dataset.fxVariableFixed);
            if (v) v.value = el.value;
        });
        if (ctx.importEdit) ctx.importEdit.replaceRule = !!f.elements.namedItem('replace_rule')?.checked;
    }
    function readPeriod(f) {
        const base = ctx.period,
            value = (name, fallback) => {
                const el = f.elements.namedItem(name);
                return el && !el.disabled ? el.value : fallback;
            };
        return {
            ...base,
            id: value('month', base.id),
            name: value('name', base.name),
            status: value('status', base.status),
            opens: value('opens', base.opens),
            submission: value('submission', base.submission),
            approval: value('approval', base.approval),
            closes: value('closes', base.closes),
            categories: {
                sb: value('sb', base.categories.sb),
                b: value('b', base.categories.b),
                c: value('c', base.categories.c),
            },
        };
    }
    /** New period form: name and schedule follow the chosen month while they still hold the defaults. */
    function followMonth(form, from, to) {
        const name = form.elements.namedItem('name');
        if (name && name.value.trim() === defaultPeriodName(from)) name.value = defaultPeriodName(to);
        const before = Object.entries(defaultSchedule(from)),
            after = defaultSchedule(to),
            fields = before.map(([key]) => form.elements.namedItem(key));
        if (fields.every((el, i) => el && el.value === before[i][1])) fields.forEach((el) => (el.value = after[el.name]));
        ctx.period = readPeriod(form);
    }
    function updateFormulaPanels(rebuild = false) {
        const k = ctx.kpi;
        if (!k || !$('#skp-kpi-form')) return;
        if (rebuild) {
            $('[data-fx-variables]').innerHTML = variablesMarkup(k);
            $('[data-fx-test-panel]').innerHTML = formulaTest(k, ctx.testValues);
        } else {
            $('[data-fx-test-output]').innerHTML = testResult(k, ctx.testValues);
            for (const v of k.variables) {
                const label = $(`[data-fx-test-label="${v.key}"]`);
                if (label) label.textContent = v.label || 'Belum diberi nama';
                const input = v.source === 'fixed' && $(`[data-fx-test="${v.key}"]`);
                if (input) input.value = v.value ?? '';
            }
        }
        $('[data-fx-human]').textContent = humanFormula(k);
        $('[data-fx-tokens]').innerHTML = formulaTokens(k);
        $('[data-fx-review]').innerHTML = formulaReview(k);
        $('[data-fx-weight-total]').innerHTML = weightLine(othersWeight(ctx), k.weight);
    }
    async function openKpi(index) {
        syncPattern();
        syncKpi();
        ctx.kpiIndex = index;
        ctx.kpi = index >= 0 ? clone(ctx.pattern.items[index]) : emptyKpi();
        ctx.testValues = {};
        await render();
        $('#skp-kpi-editor')?.scrollIntoView({ block: 'start' });
        if (index >= 0) {
            const errors = kpiErrors(ctx.kpi);
            if (Object.keys(errors).length) errorFields($('#skp-kpi-form'), errors);
        }
    }
    async function formulaAction(name, id) {
        syncKpi();
        const k = ctx.kpi;
        if (!k) return;
        if (name === 'add-variable') {
            const key = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((key) => !k.variables.some((v) => v.key === key));
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
            const insert = `${start && !/[\s(]$/.test(input.value.slice(0, start)) ? ' ' : ''}${id}${id.endsWith('(') ? '' : ' '}`;
            input.value = input.value.slice(0, start) + insert + input.value.slice(end);
            k.formula = input.value;
            input.focus();
            input.setSelectionRange(start + insert.length, start + insert.length);
            updateFormulaPanels();
        }
        if (name === 'formula-preset' || name === 'formula-fix') {
            const preset = name === 'formula-preset' ? recommendations(k).find((r) => r.id === id) : { formula: id };
            if (!preset) return;
            k.formula = preset.formula;
            if (preset.unit) {
                k.unit = preset.unit;
                $('#skp-kpi-form [name=unit]').value = k.unit;
            }
            $('#skp-kpi-form [name=formula]').value = k.formula;
            updateFormulaPanels();
        }
        dirty = true;
    }
    async function savePatternForm(form) {
        syncPattern();
        if (ctx.kpi) {
            syncKpi();
            if (!(await confirm('KPI di editor belum ditambahkan ke pola. Simpan pola tanpa perubahan KPI tersebut?', { label: 'Simpan tanpa KPI itu' })))
                return;
        }
        const count = ctx.index.patterns.get(ctx.pattern.id)?.count || 0,
            errors = patternErrors(data, ctx.pattern, count);
        if (!errorFields(form, errors)) return;
        const total = totalWeight(ctx.pattern.items);
        if (
            total !== 100 &&
            !(await confirm(`Total bobot pola ${total}%. Pola disimpan sebagai draf dan baru dapat diterapkan setelah tepat 100%. Simpan sebagai draf?`, { label: 'Simpan draf' }))
        )
            return;
        const saved = await commit((next) => savePattern(next, ctx.pattern, count), form);
        if (!saved) return;
        const complete = isComplete(saved.items);
        if (complete) ctx.applyPattern = saved.id;
        reset();
        await go('patterns', '', {
            keep: true,
            message: `Pola “${saved.name}” tersimpan. ${complete ? 'Lanjutkan ke Terapkan pola.' : 'Lengkapi bobot hingga 100% sebelum diterapkan.'}`,
        });
    }
    async function savePeriodForm(form) {
        const p = readPeriod(form),
            old = data.periods.find((x) => x.id === ctx.periodEditing);
        if (!errorFields(form, periodErrors(data, p, old))) return;
        if (p.status !== (old?.status || 'planned')) {
            const question = {
                open: `Buka ${p.name}? Kepala Unit dan Kepala Divisi dapat mulai menilai sesuai jadwal.`,
                closed: `Tutup ${p.name}? Periode yang ditutup tidak dapat dibuka ulang dan hanya dapat dibaca.`,
                planned: `Kembalikan ${p.name} ke status Direncanakan?`,
            }[p.status];
            if (!(await confirm(question, { label: 'Simpan periode' }))) return;
        }
        if (!(await commit((next) => savePeriod(next, p, old), form))) return;
        reset();
        await go('periods', '', {
            keep: true,
            // A new period becomes the selected one, so its KPI setup starts from the right month.
            ...(old ? {} : { cycle: p.id }),
            message: old
                ? `Periode “${p.name}” tersimpan.`
                : `Periode “${p.name}” tersimpan sebagai Direncanakan. Terapkan pola KPI 100% ke seluruh staf sebelum dibuka.`,
        });
    }
    async function applySelected(release) {
        const rows = applyRows(ctx).filter((p) => ctx.selection.has(p.id));
        const month = ctx.index.month;
        if (release) {
            const ids = rows.filter((p) => ctx.index.assigned.has(p.id)).map((p) => p.id);
            if (!ids.length) return;
            if (!(await confirm(`Lepas pola dari ${ids.length} orang? Mereka menjadi belum punya pola (0%) dan periode tidak dapat dibuka sampai pola diterapkan kembali.`, { label: 'Lepas pola' })))
                return;
            if (await commit((next) => applyPattern(next, month, null, ids))) {
                ctx.selection.clear();
                ctx.message = `Pola dilepas dari ${ids.length} orang.`;
                await render();
            }
            return;
        }
        const pattern = ctx.index.patterns.get(ctx.applyPattern);
        if (!pattern || !rows.length) return;
        const replacing = new Map();
        let same = 0;
        for (const p of rows) {
            const current = ctx.index.assigned.get(p.id);
            if (current === pattern.id) same++;
            else if (current) {
                const name = ctx.index.patterns.get(current)?.name || 'pola lain';
                replacing.set(name, (replacing.get(name) || 0) + 1);
            }
        }
        const replaced = [...replacing.values()].reduce((n, v) => n + v, 0);
        const message = `Terapkan pola “${pattern.name}” ke ${rows.length} orang (${recipientMix(rows.map((p) => p.id))})?${replaced ? ` ${replaced} orang sudah memiliki pola lain dan akan DIGANTI: ${[...replacing].map(([name, n]) => `${name} (${n})`).join(', ')}.` : ''}${same ? ` ${same} orang sudah memakai pola ini dan tidak berubah.` : ''}`;
        if (!(await confirm(message, { label: replaced ? `Ganti pola ${replaced} orang & terapkan` : 'Terapkan pola' }))) return;
        const ids = rows.map((p) => p.id);
        if (await commit((next) => applyPattern(next, month, pattern.id, ids))) {
            ctx.selection.clear();
            ctx.message = `Pola “${pattern.name}” diterapkan ke ${rows.length} orang${replaced ? ` (${replaced} diganti)` : ''}.`;
            await render();
        }
    }
    /** "Pemakai pola": releases the selected holders, or moves them (eligible ones only) to another 100% pattern. */
    async function manageHolders(move) {
        const pattern = ctx.index.patterns.get(ctx.holders.patternId),
            month = ctx.index.month,
            rows = selectableHolders().filter((h) => ctx.holders.selection.has(h.id));
        if (!pattern || !rows.length) return;
        if (!move) {
            const ids = rows.map((h) => h.id);
            if (!(await confirm(`Lepas pola “${pattern.name}” dari ${ids.length} orang (${recipientMix(ids)})? Mereka belum punya pola sampai diberi pola lain.`, { label: 'Lepas pola' })))
                return;
            if (await commit((next) => applyPattern(next, month, null, ids))) {
                ctx.holders.selection.clear();
                ctx.message = `Pola “${pattern.name}” dilepas dari ${ids.length} orang.`;
                await render();
            }
            return;
        }
        const target = ctx.index.patterns.get(ctx.holders.target),
            ids = rows.filter((h) => h.eligible).map((h) => h.id),
            skipped = rows.length - ids.length;
        if (!target?.complete || target.id === pattern.id || !ids.length) return;
        if (!(await confirm(`Ganti pola ${ids.length} orang (${recipientMix(ids)}) dari “${pattern.name}” ke “${target.name}”?${skipped ? ` ${skipped} orang tidak aktif dilewati; mereka hanya dapat dilepas.` : ''}`, { label: 'Ganti pola' })))
            return;
        if (await commit((next) => applyPattern(next, month, target.id, ids))) {
            ctx.holders.selection.clear();
            ctx.message = `${ids.length} orang dipindahkan ke pola “${target.name}”.`;
            await render();
        }
    }
    /**
     * Uploads the chosen file for a row-level check; nothing is stored. Without `check` it is a new
     * file (sheet choice and corrections reset; an RSAB master answers with its sheet list only). With
     * `check` ({ sheets, edits, keepPage }) it re-checks the current file with exactly that choice and
     * those corrections; the previous preview stays visible but cannot be imported until the new one lands.
     * Returns `{ ok, error }`; `quiet` leaves a failure to the caller instead of the page.
     */
    async function previewImport(file, check = null, { quiet = false } = {}) {
        const state = ctx.importState,
            month = ctx.index.month,
            request = ++importRequest,
            sheets = check?.sheets || null,
            edits = check?.edits || [];
        if (check) Object.assign(state, { error: '', request });
        else {
            Object.assign(state, { file: file || null, format: '', sheets: [], sheetSearch: '', selected: new Set(), edits: new Map(), preview: null, error: '', request, checking: !!file });
            // A new file shows its name and "Membaca file…" right away, before the server answers.
            if (file && screen() === 'import' && !ctx.importEdit) await render();
        }
        const current = () => state.request === request && state.file === file && ctx.index.month === month;
        let ok = false,
            error = '';
        if (file)
            await api.perform(null, async () => {
                const form = new FormData();
                form.append('file', file);
                form.append('month', month);
                if (sheets) form.append('sheets', JSON.stringify(sheets));
                if (edits.length) form.append('edits', JSON.stringify(edits));
                try {
                    const result = await api.request('/hc/kpi-workspace/import-preview', 'POST', form),
                        d = result.data;
                    if (!current()) return;
                    const format = d.format === 'rsab' ? 'rsab' : 'template',
                        checked = format === 'rsab' ? (d.sheets || []).filter((s) => s.selected).map((s) => s.name) : [];
                    if (sheets && (format !== 'rsab' || checked.length !== sheets.length || checked.some((name, i) => name !== sheets[i])))
                        throw new Error('Hasil pemeriksaan tidak sesuai sheet yang dipilih. Periksa ulang.');
                    Object.assign(state, { format, sheets: format === 'rsab' ? d.sheets || [] : [] });
                    const keepPage = !!(check?.keepPage && state.preview),
                        seq = keepPage ? state.preview.seq : ++importSeq,
                        onlyErrors = flagged(d) && keepPage && state.preview.onlyErrors;
                    state.preview = { ...d, format, selection: sheets || [], edits, editsKey: JSON.stringify(edits), onlyErrors, seq };
                    ok = true;
                } catch (e) {
                    if (current()) error = e.message || String(e);
                }
            });
        if (current()) state.checking = false;
        if (error && !quiet) state.error = error;
        if (screen() === 'import' && !ctx.importEdit && !(quiet && error)) {
            await render();
            if (current() && !quiet) $('[data-skp-import-focus]', host)?.focus();
        }
        return { ok, error };
    }
    /** A file picked or dropped on the import screen: obviously wrong files fail here, the rest is checked by the server. */
    async function chooseImportFile(file) {
        if (!file) return;
        const problem = fileProblem(file);
        if (!problem) return previewImport(file);
        resetImport();
        Object.assign(ctx.importState, { file, error: problem });
        await render();
    }
    /** "Hapus"/"Batal": back to an empty upload; corrections made so far are lost, so they are confirmed first. */
    async function clearImport() {
        const edits = ctx.importState.edits.size;
        if (edits && !(await confirm(`Buang file ini beserta ${edits} perbaikan baris?`, { label: 'Buang' }))) return;
        resetImport();
        await render();
        $('[data-skp-import-file]', host)?.focus();
    }
    /** Re-checks the current file with the current sheet choice and corrections. */
    function recheckImport(options = {}) {
        const state = ctx.importState;
        return previewImport(state.file, { sheets: state.format === 'rsab' ? selectedSheets(state) : null, edits: currentEdits(state), keepPage: options.keepPage }, options);
    }
    /** Import rows use the same draft, form and formula actions as a pattern KPI. */
    async function openImportEdit(id) {
        const state = ctx.importState,
            p = state.preview;
        if (!p) return;
        if (importControls(state).stale) return toast('Periksa pilihan sheet dulu.', true);
        const [sheet, line] = JSON.parse(id),
            r = p.rows.find((x) => (x.sheet ?? null) === sheet && x.line === line);
        if (!r) return;
        const group = (row) => row.sheet ?? row.pattern.trim().toLowerCase(),
            others = p.rows.filter((row) => row !== r && group(row) === group(r));
        ctx.kpi = importKpi(r);
        ctx.kpiIndex = -1;
        ctx.testValues = {};
        ctx.importEdit = {
            row: r, key: id, baseline: importValues(ctx.kpi),
            others: others.every((row) => Number.isFinite(row.weight)) ? totalWeight(others) : null,
            replaceRule: !!state.edits.get(id)?.replace_rule,
        };
        await render();
        $('#skp-kpi-editor')?.scrollIntoView({ block: 'start' });
        $('#skp-kpi-form [name=name]')?.focus();
    }
    async function closeImportEdit() {
        const key = ctx.importEdit.key;
        ctx.importEdit = null;
        ctx.kpi = null;
        ctx.kpiIndex = -1;
        ctx.testValues = {};
        dirty = false;
        await render();
        const fix = $$('[data-skp-action="import-edit"]', host).find((b) => b.dataset.id === key);
        (fix || $('[data-skp-import-focus]', host))?.focus();
    }
    /** Save only changed values; source errors and original variable definitions survive unrelated edits. */
    async function saveImportEdit(reset = false) {
        const editing = ctx.importEdit;
        if (!editing || editing.saving) return;
        const state = ctx.importState,
            { row: r, key, baseline } = editing,
            previous = state.edits.get(key),
            message = $('#skp-kpi-form [data-form-error]');
        const show = (text) => {
            message.textContent = text;
            message.hidden = !text;
        };
        if (reset) state.edits.delete(key);
        else {
            const values = importValues(ctx.kpi),
                fields = { ...(previous?.fields || {}) };
            for (const [name] of EDIT_FIELDS)
                if (JSON.stringify(values[name]) !== JSON.stringify(baseline[name])) fields[name] = values[name];
            // Unlike an untouched source cell, an edited target must honor the chosen zero-target rule.
            if ('target' in fields) fields.zeroRule = values.zeroRule;
            const replace = editing.replaceRule;
            if (replace) fields.formula = values.formula;
            if (!Object.keys(fields).length && !replace) {
                if (!previous) return show('Belum ada perubahan.');
                state.edits.delete(key);
            } else state.edits.set(key, { sheet: r.sheet ?? null, line: r.line, fields, ...(replace ? { replace_rule: true } : {}) });
        }
        show('');
        editing.saving = true;
        const { ok, error } = await recheckImport({ quiet: true, keepPage: true });
        editing.saving = false;
        if (ctx.importEdit !== editing) return;
        if (!ok) {
            if (previous) state.edits.set(key, previous);
            else state.edits.delete(key);
            show(error || 'Pemeriksaan belum selesai. Coba lagi.');
            return;
        }
        await closeImportEdit();
    }
    /** Keeps the sheet checklist (search, ticks), its status and the import button in step with the choice, without repainting. */
    function syncImportSheets() {
        const state = ctx.importState,
            c = importControls(state),
            shown = new Set();
        for (const s of state.sheets) if (sheetMatch(s, state.sheetSearch)) shown.add(s.name);
        for (const box of $$('[data-skp-import-sheet]', host)) {
            box.checked = !box.disabled && state.selected.has(box.dataset.skpImportSheet);
            box.closest('label').hidden = !shown.has(box.dataset.skpImportSheet);
        }
        const none = $('[data-skp-import-sheet-none]', host),
            all = $('[data-skp-action="import-sheets"][data-id="all"]', host),
            status = $('[data-skp-import-selection]', host),
            reason = $('[data-skp-import-reason]', host),
            check = $('[data-skp-action="import-check"]', host),
            commit = $('[data-skp-action="import-commit"]', host),
            stale = $('[data-skp-import-stale]', host);
        if (none) none.hidden = shown.size > 0;
        if (all) {
            all.textContent = selectAllLabel(state);
            all.disabled = !visibleUsable(state).length;
        }
        if (status) status.textContent = c.status;
        if (reason) reason.textContent = commitHint(state);
        if (check) check.disabled = !c.check;
        if (commit) commit.disabled = !c.commit;
        if (stale) stale.hidden = !c.stale;
        $('.skp-import-preview', host)?.classList.toggle('stale', c.stale);
    }
    /** Adds the previewed file's patterns (RSAB: the checked sheets, with HC corrections) to the selected period; the server re-checks every row. */
    async function commitImport() {
        const state = ctx.importState,
            p = state.preview,
            file = state.file,
            month = ctx.index.month;
        if (!importControls(state).commit) return;
        const sheets = p.format === 'rsab' ? p.selection : null,
            kpis = p.patterns.reduce((n, x) => n + x.count, 0),
            drafts = p.patterns.filter((x) => !x.complete).length;
        if (!(await confirm(`Impor ${p.patterns.length} pola (${kpis} KPI)${sheets ? ` dari ${sheets.length} sheet` : ''} ke ${monthLabel(month)}? Pola baru belum punya pemakai.${drafts ? ` ${drafts} pola belum 100% disimpan sebagai draf.` : ''}${p.edits.length ? ` Perbaikan HC: ${editSummary(p.edits)}.` : ''}`, { label: 'Impor pola' })))
            return;
        // The file, period, sheet choice or corrections may have changed while the dialog was open.
        if (state.preview !== p || state.file !== file || ctx.index.month !== month || !importControls(state).commit) return;
        let imported;
        const ok = await api.perform(null, async () => {
            const form = new FormData();
            form.append('file', file);
            form.append('month', month);
            form.append('revision', String(revision));
            if (sheets) form.append('sheets', JSON.stringify(sheets));
            if (p.edits.length) form.append('edits', JSON.stringify(p.edits));
            const payload = await api.request(`/hc/kpi-workspace/import?${new URLSearchParams({ cycle: month, include_assessments: '0' })}`, 'POST', form);
            imported = payload.imported;
            setData(payload);
        });
        if (!ok) return;
        await go('patterns', '', {
            keep: true,
            message: `${imported.patterns} pola (${imported.kpis} KPI) diimpor. Tambahkan pemakai lewat kolom Pemakai.`,
        });
    }
    async function action(name, id) {
        if (['add-variable', 'remove-variable', 'formula-token', 'formula-preset', 'formula-fix'].includes(name))
            return formulaAction(name, id);
        const month = ctx.index.month,
            pattern = ctx.index.patterns.get(id);
        switch (name) {
            case 'nav':
                return go(id);
            case 'period-new':
                // `id`: a month (empty-period state) or nothing (period list: first free month of the shown year).
                return edit('period-edit', '', () => (ctx.period = newPeriod(data, id || (screen() === 'periods' ? ctx.periodYear : ''))));
            case 'reload-period':
                return render();
            case 'year-step': {
                const [key, delta] = id.split(':'),
                    current = key === 'list' ? ctx.periodYear : requestedMonth().slice(0, 4);
                return setYear(key, +current + +delta);
            }
            case 'period':
                return edit('period-edit', id, () => {
                    ctx.period = clone(data.periods.find((p) => p.id === id));
                    ctx.periodEditing = id;
                });
            case 'period-open': {
                const period = data.periods.find((p) => p.id === id),
                    block = openBlock(period);
                if (block) return toast(block, true);
                if (!(await confirm(`Buka ${period.name}? Kepala Unit dan Kepala Divisi dapat mulai menilai sesuai jadwal.`, { label: 'Buka periode' })))
                    return;
                if (await commit((next) => savePeriod(next, { ...period, status: 'open' }, period))) {
                    ctx.message = `${period.name} dibuka.`;
                    await render();
                }
                return;
            }
            case 'pattern-new':
                return edit('pattern', '', () => (ctx.pattern = emptyPattern(month)));
            case 'pattern-edit':
                return edit('pattern', id, () => (ctx.pattern = clone(data.patterns.find((p) => p.id === id))));
            case 'pattern-duplicate':
                await edit('pattern', '', () => (ctx.pattern = duplicatePattern(data, pattern)));
                dirty = true;
                return;
            case 'pattern-apply':
                ctx.applyPattern = id;
                ctx.selection.clear();
                return go('apply');
            case 'import-template':
                return downloadTemplate(id, month);
            case 'import-commit':
                return commitImport();
            case 'import-pick':
                return $('[data-skp-import-file]', host)?.click();
            case 'import-clear':
                return clearImport();
            case 'import-sheets': {
                // "Pilih semua" adds the usable sheets matching the search; "Kosongkan" clears the whole choice.
                const state = ctx.importState;
                state.selected = id === 'all' ? new Set([...state.selected, ...visibleUsable(state).map((s) => s.name)]) : new Set();
                return syncImportSheets();
            }
            case 'import-check':
                if (!importControls(ctx.importState).check) return;
                return recheckImport();
            case 'import-edit':
                return openImportEdit(id);
            case 'import-edit-reset':
                return saveImportEdit(true);
            case 'pattern-delete': {
                const question = pattern.count
                    ? `Hapus pola “${pattern.name}”? Pola dipakai ${pattern.count} orang; penugasan mereka dilepas sehingga mereka belum punya pola.`
                    : `Hapus pola “${pattern.name}”?`;
                if (!(await confirm(question, { label: 'Hapus pola' }))) return;
                if (await commit((next) => removePattern(next, id))) {
                    ctx.message = `Pola “${pattern.name}” dihapus.`;
                    await render();
                }
                return;
            }
            case 'copy-patterns': {
                const from = $('[data-skp-copy-source]').value,
                    source = data.periods.find((p) => p.id === from);
                if (!(await confirm(`Gunakan pola KPI ${source.name} di ${monthLabel(month)}? Pola disalin sebagai pola baru; periode sumber tidak berubah. Penugasan disalin untuk orang yang masih memenuhi syarat dan belum memiliki pola.`, { label: 'Gunakan KPI' })))
                    return;
                // Only the selected period is loaded; the source period's patterns are fetched on demand.
                const origin = await api.request(`/hc/kpi-workspace?${new URLSearchParams({ cycle: from, only: 'patterns' })}`);
                const r = await commit((next) => {
                    const result = copyPatterns(next, origin.data, month, ctx.index.people);
                    if (!result.patterns) throw new Error('Semua pola pada periode sumber sudah ada di periode ini.');
                    return result;
                });
                if (r) {
                    ctx.message = `${r.patterns} pola disalin; ${r.assigned} orang langsung memakai pola${r.kept ? `, ${r.kept} tetap dengan pola yang sudah ada` : ''}${r.ineligible ? `, ${r.ineligible} penugasan dilewati (tidak memenuhi syarat atau pola belum 100%)` : ''}.${r.skipped.length ? ` Nama sudah ada, dilewati: ${r.skipped.join(', ')}.` : ''} Sesuaikan KPI dan bobot bila perlu.`;
                    await render();
                }
                return;
            }
            case 'legacy-convert': {
                if (!(await confirm('Konversi KPI versi lama menjadi pola? Pola dengan total bobot 100% langsung diterapkan ke orang di area tersebut.', { label: 'Konversi' })))
                    return;
                const assigned = await commit((next) => convertLegacy(next, data.legacyTemplates, month, ctx.index));
                if (assigned !== null) {
                    ctx.message = `KPI lama dikonversi menjadi pola; ${assigned} orang langsung memakai pola.`;
                    await render();
                }
                return;
            }
            case 'show-missing':
                return go('matrix', '', {
                    ...(id ? { cycle: id } : {}),
                    filter: { division: '', unit: '', position: '', role: 'staff', status: 'none', search: '' },
                });
            case 'select-filtered':
                return selectFiltered(true);
            case 'apply':
                return applySelected(false);
            case 'release':
                return applySelected(true);
            case 'holder-release':
                return manageHolders(false);
            case 'holder-move':
                return manageHolders(true);
            case 'kpi-new':
                return openKpi(-1);
            case 'kpi-edit':
                return openKpi(+id);
            case 'kpi-remove': {
                syncPattern();
                syncKpi();
                const index = +id;
                ctx.pattern.items.splice(index, 1);
                if (ctx.kpiIndex === index) {
                    ctx.kpi = null;
                    ctx.kpiIndex = -1;
                } else if (ctx.kpiIndex > index) ctx.kpiIndex--;
                dirty = true;
                return render();
            }
            case 'kpi-cancel':
                if (ctx.importEdit) return closeImportEdit();
                syncPattern();
                ctx.kpi = null;
                ctx.kpiIndex = -1;
                return render();
            case 'kpi-save': {
                syncPattern();
                syncKpi();
                if (ctx.importEdit) return saveImportEdit();
                const form = $('#skp-kpi-form'),
                    errors = kpiErrors(ctx.kpi);
                if (errors.policy) $('.fx-settings', form).open = true;
                if (!errorFields(form, errors)) return;
                const item = cleanKpi(ctx.kpi);
                if (ctx.kpiIndex >= 0) ctx.pattern.items[ctx.kpiIndex] = item;
                else ctx.pattern.items.push(item);
                ctx.kpi = null;
                ctx.kpiIndex = -1;
                dirty = true;
                await render();
                $('.skp-items')?.scrollIntoView({ block: 'center' });
                return;
            }
        }
    }
    async function changeMonth(value) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '') || !(await leave())) {
            const current = requestedMonth();
            const month = $('[data-skp-period-choice]', host),
                year = $('[data-skp-year="picker"]', host);
            if (month) month.value = current;
            if (year) year.value = current.slice(0, 4);
            return;
        }
        reset();
        const name = screen();
        await go(LIST_OF[name] || name, '', { cycle: value, keep: true });
    }
    /** Year control: 'picker' switches the selected period (same month), 'list' filters the period list. */
    async function setYear(key, value) {
        const year = validYear(value);
        if (!year) {
            const input = $(`[data-skp-year="${key}"]`, host);
            if (input) input.value = key === 'list' ? ctx.periodYear : requestedMonth().slice(0, 4);
            return toast(`Isi tahun ${YEAR_MIN}–${YEAR_MAX}.`, true);
        }
        if (key === 'list') {
            ctx.periodYear = year;
            ctx.message = '';
            return render();
        }
        return changeMonth(`${year}-${requestedMonth().slice(5)}`);
    }
    /*
     * Shared "Reset filter" (table-tools) clears its selects one by one, each dispatching `change`.
     * The workspace resets the group's state once instead and refreshes after the click, so an
     * intermediate refresh can never leave part of the filters applied.
     */
    let resettingFilters = false;
    document.addEventListener(
        'click',
        (event) => {
            const reset = event.target.closest('[data-table-filter-reset]'),
                group = reset && host.contains(reset) ? reset.closest('[data-table-filters]') : null;
            if (!group) return;
            for (const el of $$('[data-skp-filter]', group)) ctx.filter[el.dataset.skpFilter] = '';
            for (const el of $$('[data-skp-monitor-filter]', group)) ctx.monitor[el.dataset.skpMonitorFilter] = '';
            for (const el of $$('[data-skp-holder-filter]', group)) ctx.holders[el.dataset.skpHolderFilter] = '';
            resettingFilters = true;
            setTimeout(() => {
                resettingFilters = false;
                const unit = $('[data-skp-filter="unit"]', host);
                if (unit) unit.innerHTML = unitOptions(ctx);
                refreshResults();
            });
        },
        true,
    );
    /* Row action menus: popover (top layer) opened by its `popovertarget` trigger. */
    const menuTrigger = (menu) => host.querySelector(`[data-skp-menu="${CSS.escape(menu.id)}"]`);
    const menuItems = (menu) => [...menu.querySelectorAll('[role="menuitem"]')];
    function placeMenu(menu) {
        const trigger = menuTrigger(menu);
        if (!trigger) return;
        const r = trigger.getBoundingClientRect(),
            gap = 4,
            edge = 8;
        menu.style.left = 'auto';
        menu.style.right = `${Math.max(edge, document.documentElement.clientWidth - r.right)}px`;
        menu.style.top = `${r.bottom + gap}px`;
        const m = menu.getBoundingClientRect();
        if (m.bottom > innerHeight - edge && r.top - m.height - gap >= edge) menu.style.top = `${r.top - m.height - gap}px`;
        if (m.left < edge) {
            menu.style.right = 'auto';
            menu.style.left = `${edge}px`;
        }
    }
    const closeMenus = () => $$('.skp-menu:popover-open', host).forEach((menu) => menu.hidePopover());
    document.addEventListener(
        'toggle',
        (event) => {
            const menu = event.target;
            if (!(menu instanceof HTMLElement) || !menu.classList.contains('skp-menu')) return;
            const open = event.newState === 'open';
            menuTrigger(menu)?.setAttribute('aria-expanded', String(open));
            if (!open) return;
            placeMenu(menu);
            const items = menuItems(menu);
            (menu.dataset.focus === 'last' ? items.at(-1) : items[0])?.focus({ preventScroll: true });
            delete menu.dataset.focus;
        },
        true,
    );
    document.addEventListener('keydown', (event) => {
        const trigger = event.target.closest?.('[data-skp-menu]');
        if (trigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            const menu = document.getElementById(trigger.dataset.skpMenu);
            if (!menu || menu.matches(':popover-open')) return;
            event.preventDefault();
            if (event.key === 'ArrowUp') menu.dataset.focus = 'last';
            menu.showPopover();
            return;
        }
        const menu = event.target.closest?.('.skp-menu');
        if (!menu) return;
        const items = menuItems(menu),
            index = items.indexOf(event.target),
            next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[event.key];
        if (next !== undefined) {
            event.preventDefault();
            items[(next + items.length) % items.length]?.focus();
        } else if (event.key === 'Escape' || event.key === 'Tab') {
            if (event.key === 'Escape') event.preventDefault();
            menu.hidePopover();
            menuTrigger(menu)?.focus();
        }
    });
    // A fixed popover would drift away from its row: close it instead of following scroll/resize.
    document.addEventListener('scroll', (event) => event.target.closest?.('.skp-menu') || closeMenus(), true);
    window.addEventListener('resize', closeMenus);
    document.addEventListener('click', (event) => {
        // Top bar period menu (flow-runtime): switch period in place, keeping the current screen.
        const option = event.target.closest('[data-cycle-option]');
        if (option && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            option.closest('dialog')?.close();
            changeMonth(option.dataset.cycleOption).catch(fail);
            return;
        }
        event.target.closest('.skp-menu [role="menuitem"]')?.closest('.skp-menu').hidePopover();
        const link = event.target.closest('[data-skp-nav]');
        if (link && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            go(link.dataset.skpNav, link.dataset.id || '', link.dataset.cycle ? { cycle: link.dataset.cycle } : {}).catch(fail);
            return;
        }
        const button = event.target.closest('[data-skp-action]');
        if (button && !button.disabled) action(button.dataset.skpAction, button.dataset.id).catch(fail);
    });
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (target.hasAttribute('data-skp-search')) {
            ctx.filter.search = target.value;
            refreshResults();
        } else if (target.hasAttribute('data-skp-monitor-search')) {
            ctx.monitor.search = target.value;
            refreshResults();
        } else if (target.hasAttribute('data-skp-holder-search')) {
            ctx.holders.search = target.value;
            refreshResults();
        } else if (target.hasAttribute('data-skp-import-sheet-search')) {
            ctx.importState.sheetSearch = target.value;
            syncImportSheets();
        } else if (target.hasAttribute('data-fx-test')) {
            ctx.testValues[target.dataset.fxTest] = target.value;
            updateFormulaPanels();
        } else if (target.hasAttribute('data-skp-item-weight')) {
            ctx.pattern.items[+target.dataset.skpItemWeight].weight = target.value;
            dirty = true;
            $('[data-skp-pattern-total]').innerHTML = patternTotal(ctx.pattern.items);
            if (ctx.kpi) $('[data-fx-weight-total]').innerHTML = weightLine(othersWeight(ctx), ctx.kpi.weight);
        } else if (target.closest('#skp-kpi-form') && !(target instanceof HTMLSelectElement)) {
            dirty = true;
            syncKpi();
            updateFormulaPanels();
        } else if (target.closest('#skp-pattern-form')) {
            dirty = true;
            syncPattern();
        } else if (target.closest('#skp-period-form')) {
            dirty = true;
            const before = ctx.period;
            ctx.period = readPeriod(target.form);
            if (target.name === 'month' && !ctx.periodEditing && /^\d{4}-(0[1-9]|1[0-2])$/.test(target.value))
                followMonth(target.form, before.id, target.value);
        }
    });
    document.addEventListener('change', (event) => {
        const target = event.target;
        if (resettingFilters && (target.dataset.skpFilter || target.dataset.skpMonitorFilter || target.dataset.skpHolderFilter)) return;
        if (target.dataset.skpFilter) {
            ctx.filter[target.dataset.skpFilter] = target.value;
            if (target.dataset.skpFilter === 'division') {
                if (ctx.filter.unit && ctx.index.units.get(ctx.filter.unit)?.divisionId !== target.value && target.value)
                    ctx.filter.unit = '';
                const unit = $('[data-skp-filter="unit"]', host);
                if (unit) unit.innerHTML = unitOptions(ctx);
            }
            refreshResults();
        } else if (target.dataset.skpMonitorFilter) {
            ctx.monitor[target.dataset.skpMonitorFilter] = target.value;
            refreshResults();
        } else if (target.dataset.skpHolderFilter) {
            ctx.holders[target.dataset.skpHolderFilter] = target.value;
            refreshResults();
        } else if (target.hasAttribute('data-skp-import-file')) chooseImportFile(target.files[0]).catch(fail);
        else if (target.hasAttribute('data-skp-import-sheet')) {
            const selected = ctx.importState.selected,
                name = target.dataset.skpImportSheet;
            if (target.checked) selected.add(name);
            else selected.delete(name);
            syncImportSheets();
        }
        else if (target.hasAttribute('data-skp-import-only')) {
            const p = ctx.importState.preview;
            if (p) {
                p.onlyErrors = target.checked;
                $('[data-skp-import-count]', host).textContent = importCounts(p).text;
            }
            mountTables();
        } else if (target.hasAttribute('data-skp-holder-target')) {
            ctx.holders.target = target.value;
            $('[data-skp-summary]', host).innerHTML = SUMMARIES.holders(ctx);
            $('[data-skp-holder-target]', host)?.focus();
        } else if (target.hasAttribute('data-skp-period-choice')) changeMonth(target.value).catch(fail);
        else if (target.hasAttribute('data-skp-year')) setYear(target.dataset.skpYear, target.value).catch(fail);
        else if (target.hasAttribute('data-skp-apply-pattern')) {
            // A pattern has no recipient type: the selected staff and Kepala Unit stay selected.
            ctx.applyPattern = target.value;
            ctx.message = '';
            render().catch(fail);
        } else if (target.hasAttribute('data-skp-select')) {
            if (target.checked) ctx.selection.add(target.dataset.skpSelect);
            else ctx.selection.delete(target.dataset.skpSelect);
            target.closest('tr').classList.toggle('selected', target.checked);
            $('[data-skp-summary]', host).innerHTML = SUMMARIES.apply(ctx);
            syncSelectAll();
        } else if (target.hasAttribute('data-skp-select-all')) selectFiltered(target.checked);
        else if (target.hasAttribute('data-skp-holder-select')) {
            if (target.checked) ctx.holders.selection.add(target.dataset.skpHolderSelect);
            else ctx.holders.selection.delete(target.dataset.skpHolderSelect);
            target.closest('tr').classList.toggle('selected', target.checked);
            $('[data-skp-summary]', host).innerHTML = SUMMARIES.holders(ctx);
            syncSelectAll();
        } else if (target.hasAttribute('data-skp-holder-select-all')) selectHolders(target.checked);
        else if (target.closest('#skp-kpi-form') && target instanceof HTMLSelectElement) {
            // Text fields already refresh on input. Rebuilding on blur would swallow a preset/token click.
            dirty = true;
            syncKpi();
            updateFormulaPanels(target.hasAttribute('data-fx-variable-source'));
        } else if (target.closest('#skp-pattern-form')) {
            dirty = true;
            syncPattern();
        }
    });
    // Drag & drop on the import upload card; elsewhere on the import screen a dropped file must not open in the tab.
    const dropzone = (event) => (screen() === 'import' && !ctx.importEdit ? event.target.closest?.('[data-skp-dropzone]') : null);
    document.addEventListener('dragover', (event) => {
        if (screen() !== 'import' || !event.dataTransfer?.types.includes('Files')) return;
        event.preventDefault();
        const zone = dropzone(event);
        event.dataTransfer.dropEffect = zone && !ctx.importState.checking ? 'copy' : 'none';
        zone?.classList.add('dragging');
    });
    document.addEventListener('dragleave', (event) => {
        const zone = dropzone(event);
        if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('dragging');
    });
    document.addEventListener('drop', (event) => {
        if (screen() !== 'import' || !event.dataTransfer?.types.includes('Files')) return;
        event.preventDefault();
        const zone = dropzone(event);
        zone?.classList.remove('dragging');
        if (zone && !ctx.importState.checking) chooseImportFile(event.dataTransfer.files[0]).catch(fail);
    });
    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (form.id === 'skp-pattern-form') {
            event.preventDefault();
            savePatternForm(form).catch(fail);
        } else if (form.id === 'skp-kpi-form') {
            event.preventDefault();
            action('kpi-save').catch(fail);
        } else if (form.id === 'skp-period-form') {
            event.preventDefault();
            savePeriodForm(form).catch(fail);
        }
    });
    window.addEventListener('beforeunload', (event) => {
        if (dirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    document.addEventListener(
        'click',
        (event) => {
            const a = event.target.closest('a[href]');
            if (!a || a.dataset.skpNav || a.dataset.cycleOption || !dirty || event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            leave().then((ok) => {
                if (!ok) return;
                dirty = false;
                location.href = a.href;
            });
        },
        true,
    );
    window.addEventListener('popstate', () => {
        const requested = location.href;
        const show = () => {
            currentHref = requested;
            reset();
            render().catch(fail);
        };
        if (!dirty) return show();
        history.pushState({}, '', currentHref);
        leave().then((ok) => {
            if (!ok) return;
            history.pushState({}, '', requested);
            show();
        });
    });
    render().catch(fail);
}
export { prepare as prepareKpiWorkspace, init as initKpiWorkspace };
