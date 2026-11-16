import { $, $$, labelCycle } from './flow-dom';
import { renderReference } from './reference';

function summarizeWorkspace(s, filters) {
    const people = s
        .people()
        .filter(
            (p) =>
                (!filters.unit_id || p.unitId === filters.unit_id) &&
                (!filters.division_id ||
                    p.divisionId === filters.division_id) &&
                (!filters.kind || p.type === filters.kind) &&
                (!filters.search ||
                    `${p.name} ${p.nip}`
                        .toLowerCase()
                        .includes(filters.search.toLowerCase())) &&
                (!filters.template_id ||
                    s.template(p)?.id === filters.template_id),
        );
    const statuses = {
        Belum: 'not_started',
        Diajukan: 'submitted',
        Dikembalikan: 'returned',
        Final: 'final',
    };
    const mapped = people.map((p) => ({
        ...p,
        status: statuses[s.assessment(p.id).status],
    }));
    const finals = people.filter((p) => s.assessment(p.id).status === 'Final');
    const scores = finals.map((p) => {
        const a = s.assessment(p.id);
        return {
            personId: p.id,
            kind: p.type,
            name: p.name,
            nip: p.nip,
            unit_name: p.unitName,
            division_name: p.divisionName,
            total: s.total(p.id),
            category: s.category(p.id).label,
            positive: a.positive || '',
            negative: a.negative || '',
            template_id: s.template(p)?.id,
        };
    });
    const groups = Map.groupBy(scores, (r) => r.kind + ':' + r.template_id);
    const item_averages = [];
    const rankings = [];
    for (const rows of groups.values()) {
        const k = s.template(s.person(rows[0].personId));
        k.items.forEach((i, index) => {
            const average =
                rows.reduce(
                    (sum, r) => sum + +s.assessment(r.personId).values[index],
                    0,
                ) / rows.length;
            item_averages.push({
                template_id: k.id,
                area:
                    rows[0].kind === 'member'
                        ? rows[0].unit_name
                        : rows[0].division_name,
                kind: rows[0].kind,
                name: i.name,
                weight: i.weight,
                average,
                count: rows.length,
            });
        });
        rankings.push({
            name: k.name,
            area:
                rows[0].kind === 'member'
                    ? rows[0].unit_name
                    : rows[0].division_name,
            kind: rows[0].kind,
            rows: rows.sort((a, b) => b.total - a.total),
        });
    }
    const statusGroups = (key, name) =>
        [...Map.groupBy(mapped, (p) => p[key]).values()].map((rows) => ({
            id: rows[0][key],
            name: rows[0][name],
            total: rows.length,
            ...Object.fromEntries(
                ['not_started', 'submitted', 'returned', 'final'].map((st) => [
                    st,
                    rows.filter((p) => p.status === st).length,
                ]),
            ),
        }));
    return {
        month: s.cycleKey,
        metrics: {
            total: people.length,
            final: finals.length,
            submitted: mapped.filter((p) => p.status === 'submitted').length,
            returned: mapped.filter((p) => p.status === 'returned').length,
            not_started: mapped.filter((p) => p.status === 'not_started')
                .length,
            average: scores.length
                ? scores.reduce((a, r) => a + r.total, 0) / scores.length
                : null,
        },
        item_averages,
        unit_status: statusGroups('unitId', 'unitName'),
        division_progress: statusGroups('divisionId', 'divisionName'),
        scores,
        findings: scores.filter((r) => r.positive || r.negative),
        rankings,
    };
}

export function initInsights(c, s, link) {
    if (!$('[data-insights-root]')) return;
    let sequence = 0,
        timer,
        controller;
    const month = s.cycleKey;
    $$('[data-period-label]').forEach(
        (e) => (e.textContent = labelCycle(month)),
    );
    $$('[data-period-short]').forEach(
        (e) => (e.textContent = labelCycle(month).split(' ')[0]),
    );
    const qs = new URLSearchParams(location.search);
    for (const name of ['division', 'unit']) {
        const f = $(`[data-filter="${name}"]`);
        if (f && qs.get(name)) f.value = qs.get(name);
    }
    function filters() {
        const result = {};
        for (const el of $$('[data-filter]')) {
            if (!el.value) continue;
            const name = {
                unit: 'unit_id',
                division: 'division_id',
                type: 'kind',
                template: 'template_id',
                search: 'search',
            }[el.dataset.filter];
            if (name) result[name] = el.value;
        }
        return result;
    }
    async function load() {
        const current = ++sequence;
        document.documentElement.dataset.insightsReady = 'loading';
        controller?.abort();
        controller = new AbortController();
        const error = $('[data-insights-error]');
        if (error) error.hidden = true;
        try {
            let d;
            const initial = c.initialInsights;
            delete c.initialInsights;
            if (
                initial?.cycle_id === s.cycle()?.dbId &&
                !Object.keys(filters()).length
            ) {
                d = initial;
            } else if (s.cycle()) {
                const f = new URLSearchParams({
                    cycle_id: s.cycle().dbId,
                    ...filters(),
                });
                d = (
                    await s.api.request('/data/insights?' + f, 'GET', null, {
                        signal: controller.signal,
                    })
                ).data;
            } else d = summarizeWorkspace(s, filters());
            if (current !== sequence) return;
            renderReference(c, s, d, link, filters());
            document.documentElement.dataset.insightsReady = 'true';
        } catch (e) {
            if (current !== sequence || e.name === 'AbortError') return;
            if (error) {
                error.textContent = e.message;
                error.hidden = false;
            }
            document.documentElement.dataset.insightsReady = 'error';
        } finally {
            if (current === sequence)
                document.dispatchEvent(new Event('insights-ready'));
        }
    }
    function schedule() {
        document.documentElement.dataset.insightsReady = 'loading';
        ++sequence;
        controller?.abort();
        clearTimeout(timer);
        timer = setTimeout(load, 180);
    }
    document.addEventListener('flow-updated', schedule);
    document.addEventListener('flow-filtered', schedule);
    load();
}
