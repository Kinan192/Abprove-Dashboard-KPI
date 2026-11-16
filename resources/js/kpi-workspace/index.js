import '../../css/kpi-workspace.css';
import { $, $$, confirm, toast } from '../abprove/ui.js';
import { paginate } from '../abprove/pagination.js';
import {
    ROLES,
    clone,
    derive,
    monthLabel,
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
} from './model.js';
import { esc, row, errorFields } from './markup.js';
import {
    stepNav,
    periodPicker,
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
    applyRole,
    patternTotal,
    othersWeight,
} from './views.js';
import {
    variablesMarkup,
    formulaReview,
    formulaTest,
    testResult,
    formulaTokens,
    weightLine,
} from './formula-editor.js';
import { humanFormula, recommendations } from './formula-config.js';
import { newPeriod } from './period-editor.js';

const SCREENS = ['periods', 'period-edit', 'patterns', 'pattern', 'apply', 'matrix', 'monitor', 'assessment'];
const PERIOD_SCREENS = ['periods', 'period-edit'];
const LIST_OF = { pattern: 'patterns', assessment: 'monitor', 'period-edit': 'periods' };
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
        applyPattern: '',
        pattern: null,
        kpi: null,
        kpiIndex: -1,
        testValues: {},
        period: null,
        periodEditing: '',
        message: '',
    };
    let dirty = false,
        currentHref = location.href;
    const screen = () => screenOf(c);
    ctx.url = (name, id = '', cycle = ctx.index.month) => {
        const url = new URL(c.links[PERIOD_SCREENS.includes(name) ? 'pengaturan' : 'kpi'], location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('screen', name);
        if (cycle) url.searchParams.set('cycle', cycle);
        if (id) url.searchParams.set('id', id);
        return url.href;
    };
    const fail = (e) => toast(e.message || String(e), true);
    function setData(payload) {
        accept(payload, s);
        ctx.data = data;
        ctx.index = derive(data);
        if (!ctx.index.patterns.get(ctx.applyPattern)?.complete) ctx.applyPattern = '';
        for (const id of ctx.selection) if (!ctx.index.people.has(id)) ctx.selection.delete(id);
    }
    async function load(month) {
        host.setAttribute('aria-busy', 'true');
        setData(await api.request(endpoint(month, screen())));
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
        ctx.kpiIndex = -1;
        ctx.testValues = {};
        ctx.period = null;
        ctx.periodEditing = '';
    }
    async function go(name, id = '', { cycle = ctx.index.month, keep = false, message = '' } = {}) {
        if (!keep) {
            if (!(await leave())) return;
            reset();
        }
        if (cycle !== ctx.index.month) {
            ctx.selection.clear();
            ctx.applyPattern = '';
        }
        ctx.message = message;
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
    async function render() {
        let name = screen();
        const id = params().get('id') || '',
            month = params().get('cycle') || data.selectedMonth;
        if (month !== data.selectedMonth || (needsAssessments(name) && !data.assessmentsLoaded)) await load(month);
        if (name === 'pattern' && !ctx.pattern) {
            const original = data.patterns.find((p) => p.id === id && p.periodId === ctx.index.month);
            if (id && !original) {
                name = 'patterns';
                history.replaceState({}, '', ctx.url(name));
                currentHref = location.href;
            } else ctx.pattern = original ? clone(original) : emptyPattern(ctx.index.month);
        }
        if (name === 'period-edit' && !ctx.period) {
            const original = data.periods.find((p) => p.id === id);
            ctx.period = original ? clone(original) : newPeriod(data);
            ctx.periodEditing = original?.id || '';
        }
        const views = {
            periods: () => periods(ctx),
            'period-edit': () => periodEdit(ctx),
            patterns: () => patterns(ctx),
            pattern: () => patternEdit(ctx),
            apply: () => apply(ctx),
            matrix: () => matrix(ctx),
            monitor: () => monitor(ctx),
            assessment: () => assessment(ctx, id),
        };
        host.innerHTML = `<div class="skp-toolbar">${stepNav(ctx, name)}${PERIOD_SCREENS.includes(name) ? '' : periodPicker(ctx)}</div>${views[name]()}`;
        host.setAttribute('aria-busy', 'false');
        root.dataset.ready = 'true';
        mountTables();
        $('.top-title').textContent = PERIOD_SCREENS.includes(name) ? 'Pengaturan Periode' : 'Pola KPI & Penerapan';
        $$('[data-month-label]').forEach((e) => (e.textContent = monthLabel(ctx.index.month)));
        $$('[data-month-short]').forEach((e) => (e.textContent = monthLabel(ctx.index.month).slice(0, 3)));
        for (const a of $$('[data-cycle-options] a')) {
            const url = new URL(location.href);
            url.searchParams.set('cycle', new URL(a.href).searchParams.get('cycle'));
            url.searchParams.delete('id');
            url.searchParams.set('screen', LIST_OF[name] || name);
            a.href = url.href;
        }
    }
    function token(key) {
        if (key === 'apply' || key === 'matrix')
            return `${ctx.index.month}|${ctx.applyPattern}|${JSON.stringify(ctx.filter)}`;
        if (key === 'monitor') return `${ctx.index.month}|${JSON.stringify(ctx.monitor)}`;
        return ctx.index.month;
    }
    function mountTables() {
        for (const tbody of $$('tbody[data-skp-rows]', host)) {
            const key = tbody.dataset.skpRows,
                definition = TABLES[key],
                records = definition.records(ctx);
            if (!records.length)
                tbody.innerHTML = `<tr><td colspan="${tbody.closest('table').tHead.rows[0].cells.length}" class="empty">${esc(definition.empty)}</td></tr>`;
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
        const summary = $('[data-skp-summary]', host);
        if (summary) summary.innerHTML = SUMMARIES[summary.dataset.skpSummary](ctx);
        mountTables();
    }
    function syncSelectAll() {
        const all = $('[data-skp-select-all]', host);
        if (!all) return;
        const rows = applyRows(ctx),
            selected = rows.filter((p) => ctx.selection.has(p.id)).length;
        all.checked = rows.length > 0 && selected === rows.length;
        all.indeterminate = selected > 0 && selected < rows.length;
    }
    function selectFiltered(on) {
        for (const p of applyRows(ctx)) on ? ctx.selection.add(p.id) : ctx.selection.delete(p.id);
        refreshResults();
    }
    function syncPattern() {
        const f = $('#skp-pattern-form');
        if (!f || !ctx.pattern) return;
        const name = f.elements.namedItem('patternName'),
            role = f.elements.namedItem('targetRole');
        if (name && !name.disabled) ctx.pattern.name = name.value;
        if (role && !role.disabled) ctx.pattern.targetRole = role.value;
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
            !(await confirm(`Total bobot pola ${total}%. Pola disimpan sebagai draf dan belum dapat diterapkan sampai tepat 100%. Simpan sebagai draf?`, { label: 'Simpan draf' }))
        )
            return;
        const saved = await commit((next) => savePattern(next, ctx.pattern, count), form);
        if (!saved) return;
        const complete = isComplete(saved.items);
        if (complete) ctx.applyPattern = saved.id;
        reset();
        await go('patterns', '', {
            keep: true,
            message: `Pola “${saved.name}” tersimpan. ${complete ? 'Lanjutkan ke langkah 3 · Terapkan ke staf.' : 'Lengkapi bobot hingga 100% sebelum diterapkan.'}`,
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
        await go('periods', '', { keep: true, message: `Periode “${p.name}” tersimpan.` });
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
        const who = ROLES[pattern.targetRole].toLowerCase();
        const message = `Terapkan pola “${pattern.name}” ke ${rows.length} ${who}?${replaced ? ` ${replaced} orang sudah memiliki pola lain dan akan DIGANTI: ${[...replacing].map(([name, n]) => `${name} (${n})`).join(', ')}.` : ''}${same ? ` ${same} orang sudah memakai pola ini dan tidak berubah.` : ''}`;
        if (!(await confirm(message, { label: replaced ? `Ganti pola ${replaced} orang & terapkan` : 'Terapkan pola' }))) return;
        const ids = rows.map((p) => p.id);
        if (await commit((next) => applyPattern(next, month, pattern.id, ids))) {
            ctx.selection.clear();
            ctx.message = `Pola “${pattern.name}” diterapkan ke ${rows.length} orang${replaced ? ` (${replaced} diganti)` : ''}.`;
            await render();
        }
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
                return edit('period-edit', '', () => (ctx.period = newPeriod(data)));
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
                if (!(await confirm(`Salin pola dan penugasan dari ${source.name} ke ${monthLabel(month)}?`, { label: 'Salin pola' })))
                    return;
                const r = await commit((next) => {
                    const result = copyPatterns(next, from, month, ctx.index.people);
                    if (!result.patterns) throw new Error('Semua pola pada periode sumber sudah ada di periode ini.');
                    return result;
                });
                if (r) {
                    ctx.message = `${r.patterns} pola disalin; ${r.assigned} orang langsung memakai pola${r.kept ? `, ${r.kept} orang tetap dengan pola yang sudah ada` : ''}${r.ineligible ? `, ${r.ineligible} penugasan dilewati karena orang tidak lagi eligible atau pola belum 100%` : ''}.${r.skipped.length ? ` Dilewati karena nama sudah ada: ${r.skipped.join(', ')}.` : ''}`;
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
                Object.assign(ctx.filter, { division: '', unit: '', position: '', role: 'staff', status: 'none', search: '' });
                return go('matrix');
            case 'select-filtered':
                return selectFiltered(true);
            case 'apply':
                return applySelected(false);
            case 'release':
                return applySelected(true);
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
                syncPattern();
                ctx.kpi = null;
                ctx.kpiIndex = -1;
                return render();
            case 'kpi-save': {
                syncPattern();
                syncKpi();
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
        const select = $('[data-skp-period-choice]');
        if (!value || !(await leave())) {
            if (select) select.value = ctx.index.month;
            return;
        }
        reset();
        const name = screen();
        await go(LIST_OF[name] || name, '', { cycle: value, keep: true });
    }
    document.addEventListener('click', (event) => {
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
        } else if (target.hasAttribute('data-fx-test')) {
            ctx.testValues[target.dataset.fxTest] = target.value;
            updateFormulaPanels();
        } else if (target.hasAttribute('data-skp-item-weight')) {
            ctx.pattern.items[+target.dataset.skpItemWeight].weight = target.value;
            dirty = true;
            $('[data-skp-pattern-total]').innerHTML = patternTotal(ctx.pattern.items);
            if (ctx.kpi) $('[data-fx-weight-total]').innerHTML = weightLine(othersWeight(ctx), ctx.kpi.weight);
        } else if (target.closest('#skp-kpi-form')) {
            dirty = true;
            syncKpi();
            updateFormulaPanels();
        } else if (target.closest('#skp-pattern-form')) {
            dirty = true;
            syncPattern();
        } else if (target.closest('#skp-period-form')) {
            dirty = true;
            ctx.period = readPeriod(target.form);
        }
    });
    document.addEventListener('change', (event) => {
        const target = event.target;
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
        } else if (target.hasAttribute('data-skp-period-choice')) changeMonth(target.value).catch(fail);
        else if (target.hasAttribute('data-skp-apply-pattern')) {
            const role = applyRole(ctx);
            ctx.applyPattern = target.value;
            ctx.message = '';
            if (applyRole(ctx) !== role) ctx.selection.clear();
            render().catch(fail);
        } else if (target.hasAttribute('data-skp-select')) {
            if (target.checked) ctx.selection.add(target.dataset.skpSelect);
            else ctx.selection.delete(target.dataset.skpSelect);
            target.closest('tr').classList.toggle('selected', target.checked);
            $('[data-skp-summary]', host).innerHTML = SUMMARIES.apply(ctx);
            syncSelectAll();
        } else if (target.hasAttribute('data-skp-select-all')) selectFiltered(target.checked);
        else if (target.closest('#skp-kpi-form')) {
            dirty = true;
            syncKpi();
            updateFormulaPanels(target.hasAttribute('data-fx-variable-source'));
        } else if (target.closest('#skp-pattern-form')) {
            dirty = true;
            syncPattern();
        }
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
            if (!a || a.dataset.skpNav || !dirty || event.ctrlKey || event.metaKey) return;
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
