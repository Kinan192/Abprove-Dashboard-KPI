import {
    $,
    $$,
    node,
    text,
    number,
    labelCycle,
    dateTime,
    empty,
} from './flow-dom';
import { paginate } from './pagination';
import { activityLabel, activitySubject } from './activity-labels';
import { renderReference } from './reference';

function reviewButton(row, month, label = 'Rincian') {
    const b = node('button', label, 'link');
    b.type = 'button';
    b.dataset.reviewPerson = row.personId;
    b.dataset.reviewCycle = month;
    return b;
}
function table(root, headers, key, rows, size = 10) {
    if (!root) return null;
    root.replaceChildren();
    const wrap = node('div', null, 'table-wrap');
    const t = node('table', null, 'data-table');
    const h = node('thead'),
        tr = node('tr');
    headers.forEach((label) => tr.append(node('th', label)));
    h.append(tr);
    const body = node('tbody');
    t.append(h, body);
    wrap.append(t);
    root.append(wrap);
    rows.forEach((row) => body.append(row));
    if (!rows.length) {
        const tr = node('tr'),
            td = node('td', 'Belum ada data pada periode ini.', 'empty');
        td.colSpan = headers.length;
        tr.append(td);
        body.append(tr);
    }
    paginate(body, key, { size });
    return body;
}
function statusRow(p, role, link, division = false, withProgress = false) {
    const tr = node('tr');
    const name = node('td');
    name.append(node('strong', p.name, 'block font-semibold'));
    const progress = node('progress');
    progress.max = p.total || 1;
    progress.value = p.final;
    progress.className = 'status-progress';
    progress.setAttribute(
        'aria-label',
        `${p.name}: ${p.final} dari ${p.total} Final`,
    );
    name.title = p.name;
    if (withProgress) name.append(progress);
    tr.append(name);
    for (const key of [
        'total',
        'not_started',
        'submitted',
        'returned',
        'final',
    ])
        tr.append(node('td', p[key], 'numeric'));
    const action = node('td');
    const a = node('a', 'Lihat', 'link');
    a.href = link(
        role === 'hc' ? 'rekap' : role === 'kd' ? 'persetujuan' : 'pengajuan',
        { [division ? 'division' : 'unit']: p.id, status: 'all' },
    );
    action.append(a);
    tr.append(action);
    return tr;
}
function preview(root, rows, month, limit, findings = false) {
    if (!root) return;
    root.replaceChildren();
    for (const row of rows.slice(0, limit)) {
        const entry = node('div', null, 'preview-entry');
        const b = reviewButton(row, month, row.name);
        entry.append(
            b,
            node(
                'p',
                findings
                    ? row.positive || row.negative
                    : `${row.unit_name} · ${number(row.total)}`,
                'text-xs text-muted line-clamp-2',
            ),
        );
        root.append(entry);
    }
    if (!rows.length)
        empty(
            root,
            findings
                ? 'Belum ada temuan dari penilaian Final.'
                : 'Belum ada hasil Final.',
        );
}

function reviewData(s, filters) {
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
    const dashboard = $('[data-role-dashboard]');
    if (dashboard) {
        $('[data-dashboard-report]').href =
            c.role === 'ku'
                ? link('riwayat')
                : link('dashboard', { detail: 'laporan' });
        $('[data-dashboard-reload]').addEventListener('click', () =>
            location.reload(),
        );
    }
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
    const quarter = $('[data-matrix-quarter]');
    if (quarter) quarter.value = Math.floor((+month.slice(5) - 1) / 3);
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
    function homeExtras(d) {
        const progress = $('[data-home-progress]');
        if (progress)
            table(
                progress,
                [
                    c.role === 'hc' ? 'Divisi' : 'Unit',
                    'Total',
                    'Belum',
                    'Menunggu',
                    'Revisi',
                    'Final',
                    '',
                ],
                'home-progress',
                (c.role === 'hc' ? d.division_progress : d.unit_status).map(
                    (p) => statusRow(p, c.role, link, c.role === 'hc', true),
                ),
                5,
            );
        preview($('[data-home-findings]'), d.findings, month, 2, true);
        const activity = $('[data-home-activities]');
        if (activity) {
            activity.replaceChildren();
            for (const a of s.data.activities.slice(0, 3)) {
                const row = node('a', null, 'preview-entry block');
                row.href = link('aktivitas');
                row.append(
                    node('strong', activityLabel(a.action), 'text-xs block'),
                    node(
                        'p',
                        `${a.who} · ${dateTime(a.at)} WIB`,
                        'text-xs text-muted',
                    ),
                    node(
                        'p',
                        activitySubject(a),
                        'text-xs text-muted line-clamp-1',
                    ),
                );
                activity.append(row);
            }
            if (!activity.childElementCount)
                empty(activity, 'Belum ada aktivitas.');
        }
        const cycle = $('[data-home-cycle-progress]');
        if (cycle) {
            cycle.replaceChildren();
            const n =
                c.role === 'ku'
                    ? d.metrics.final + d.metrics.submitted
                    : d.metrics.final;
            cycle.append(
                node(
                    'p',
                    `${n} dari ${d.metrics.total} ${c.role === 'ku' ? 'sudah diajukan atau Final' : 'sudah Final'}`,
                    'text-sm mb-2',
                ),
            );
            const p = node('progress');
            p.className = 'cycle-progress';
            p.max = d.metrics.total || 1;
            p.value = n;
            p.setAttribute('aria-label', 'Progres penilaian');
            cycle.append(p);
            if (d.metrics.returned)
                cycle.append(
                    node(
                        'p',
                        `${d.metrics.returned} penilaian perlu diperbaiki`,
                        'text-xs text-warning mt-2',
                    ),
                );
        }
        const kpi = $('[data-home-kpi]');
        if (kpi) {
            kpi.replaceChildren();
            const p = s.people('member')[0],
                k = p && s.template(p);
            kpi.append(
                node('strong', k?.name || 'KPI belum disusun', 'text-sm'),
                node(
                    'p',
                    k
                        ? `${k.items.length} indikator · total bobot ${k.items.reduce((n, i) => n + i.weight, 0)}%`
                        : 'Hubungi Super HC untuk menyiapkan KPI.',
                    'text-xs text-muted mt-2',
                ),
            );
        }
        const chart = $('[data-home-trend]');
        if (chart) {
            chart.replaceChildren();
            const keys = [month];
            for (let i = 0; i < 11; i++) {
                const [y, m] = keys[0].split('-').map(Number);
                keys.unshift(
                    `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`,
                );
            }
            const vals = keys.map((key) => {
                const p = s
                    .people('member', key)
                    .filter((p) => s.assessment(p.id, key).status === 'Final');
                return p.length
                    ? p.reduce((n, p) => n + s.total(p.id, key), 0) / p.length
                    : null;
            });
            if (vals.every((v) => v == null))
                empty(chart, 'Belum ada hasil Final untuk ditampilkan.');
            else {
                const ns = 'http://www.w3.org/2000/svg',
                    svg = document.createElementNS(ns, 'svg');
                svg.setAttribute('viewBox', '0 0 600 110');
                svg.setAttribute('aria-label', 'Tren nilai Final');
                svg.setAttribute('role', 'img');
                let segment = [];
                const flush = () => {
                    if (segment.length > 1) {
                        const line = document.createElementNS(ns, 'polyline');
                        line.setAttribute('points', segment.join(' '));
                        line.setAttribute('fill', 'none');
                        line.setAttribute('stroke', 'var(--color-success)');
                        line.setAttribute('stroke-width', '2');
                        svg.append(line);
                    }
                    segment = [];
                };
                vals.forEach((v, i) => {
                    if (v == null) {
                        flush();
                        return;
                    }
                    const x = 15 + (i * 570) / 11,
                        y = 100 - v * 0.85;
                    segment.push(`${x},${y}`);
                    const point = document.createElementNS(ns, 'circle');
                    point.setAttribute('cx', x);
                    point.setAttribute('cy', y);
                    point.setAttribute('r', 3);
                    point.setAttribute('fill', 'var(--color-success)');
                    svg.append(point);
                });
                flush();
                chart.append(
                    svg,
                    node(
                        'p',
                        `${labelCycle(keys[0])} - ${labelCycle(month)}`,
                        'text-xs text-muted',
                    ),
                );
            }
        }
    }
    async function render(d) {
        if ($('[data-role-dashboard]')) {
            const { renderRoleDashboard } = await import('./dashboard');
            renderRoleDashboard(c, s, d, link);
            return;
        }
        if ($('[data-reference-layout]')) {
            renderReference(c, s, d, link, filters());
            return;
        }
        $$('[data-insight-metric]').forEach(
            (e) =>
                (e.textContent =
                    e.dataset.insightMetric === 'average'
                        ? number(d.metrics.average)
                        : (d.metrics[e.dataset.insightMetric] ?? 0)),
        );
        const avg = $('[data-item-averages]');
        if (avg) {
            avg.replaceChildren();
            for (const item of d.item_averages) {
                const tr = node('tr'),
                    name = node('td');
                name.title = `${item.name} · ${item.area} · ${item.count} Final`;
                name.append(
                    node(
                        'strong',
                        item.name,
                        'block font-semibold line-clamp-2',
                    ),
                    node(
                        'p',
                        `${item.area} · ${item.kind === 'member' ? 'Staf' : 'Kepala Unit'} · ${item.count} Final`,
                        'text-xs text-muted',
                    ),
                );
                tr.append(
                    name,
                    node('td', number(item.average), 'numeric font-semibold'),
                    node('td', `${number(item.weight)}%`, 'numeric'),
                );
                avg.append(tr);
            }
            if (!d.item_averages.length) {
                const tr = node('tr'),
                    td = node('td', 'Belum ada nilai Final per KPI.', 'empty');
                td.colSpan = 3;
                tr.append(td);
                avg.append(tr);
            }
            paginate(avg, 'item-averages', {
                size: 5,
                token: JSON.stringify(filters()),
            });
        }
        if ($('[data-unit-status]'))
            table(
                $('[data-unit-status]'),
                ['Unit', 'Total', 'Belum', 'Menunggu', 'Revisi', 'Final', ''],
                'unit-status',
                d.unit_status.map((p) => statusRow(p, c.role, link)),
                10,
            );
        preview(
            $('[data-rank-preview]'),
            d.rankings.flatMap((g) => g.rows.slice(0, 1)),
            month,
            2,
        );
        preview($('[data-findings-preview]'), d.findings, month, 2, true);
        const scores = $('[data-staff-scores]');
        if (scores) {
            scores.replaceChildren();
            for (const row of d.scores) {
                const tr = node('tr'),
                    name = node('td'),
                    find = node('td'),
                    action = node('td');
                name.append(
                    node('strong', row.name, 'block font-semibold'),
                    node(
                        'p',
                        row.kind === 'member' ? 'Staf' : 'Kepala Unit',
                        'text-xs text-muted',
                    ),
                );
                find.append(
                    node(
                        'p',
                        row.positive || row.negative || 'Belum ada temuan.',
                        'line-clamp-2 text-xs',
                    ),
                );
                action.append(reviewButton(row, month));
                tr.append(
                    name,
                    node('td', row.unit_name),
                    node('td', number(row.total), 'numeric font-semibold'),
                    node('td', row.category),
                    find,
                    action,
                );
                scores.append(tr);
            }
            emptyTable(scores, 6, 'Belum ada nilai Final per karyawan.');
            paginate(scores, 'staff-scores', {
                size: 10,
                token: JSON.stringify(filters()),
            });
        }
        const findings = $('[data-staff-findings]');
        if (findings) {
            findings.replaceChildren();
            for (const row of d.findings) {
                const tr = node('tr'),
                    name = node('td'),
                    a = node('td'),
                    pos = node('td', row.positive || '-', 'finding-cell'),
                    neg = node('td', row.negative || '-', 'finding-cell');
                name.append(
                    node('strong', row.name, 'block font-semibold'),
                    node('p', row.unit_name, 'text-xs text-muted'),
                );
                pos.title = row.positive;
                neg.title = row.negative;
                a.append(reviewButton(row, month));
                tr.append(name, pos, neg, a);
                findings.append(tr);
            }
            emptyTable(findings, 4, 'Belum ada temuan dari penilaian Final.');
            paginate(findings, 'staff-findings', {
                size: 10,
                token: JSON.stringify(filters()),
            });
        }
        const rank = $('[data-ranking-v4]');
        if (rank) {
            rank.replaceChildren();
            d.rankings.forEach((group, index) => {
                const section = node('section', null, 'card widget');
                section.append(
                    node(
                        'h2',
                        `${group.area} · ${group.kind === 'member' ? 'Staf' : 'Kepala Unit'}`,
                        'section-title',
                    ),
                    node('p', group.name, 'text-xs text-muted mt-1 mb-3'),
                );
                const host = node('div');
                section.append(host);
                table(
                    host,
                    ['Peringkat', 'Nama', 'Unit', 'Nilai', ''],
                    `ranking-${index}`,
                    group.rows.map((row, i) => {
                        const tr = node('tr'),
                            a = node('td');
                        a.append(reviewButton(row, month));
                        tr.append(
                            node('td', i + 1),
                            node('td', row.name),
                            node('td', row.unit_name),
                            node(
                                'td',
                                number(row.total),
                                'numeric font-semibold',
                            ),
                            a,
                        );
                        return tr;
                    }),
                    10,
                );
                rank.append(section);
            });
            if (!rank.childElementCount)
                empty(rank, 'Belum ada hasil Final untuk diperingkatkan.');
            paginate(rank, 'ranking-groups', { size: 1 });
        }
        const matrix = $('[data-matrix-body]');
        if (matrix) {
            const year = month.slice(0, 4),
                q = +quarter.value,
                ms = Array.from(
                    { length: 3 },
                    (_, i) =>
                        `${year}-${String(q * 3 + i + 1).padStart(2, '0')}`,
                );
            const h = $('[data-matrix-head]');
            h.replaceChildren();
            const tr = node('tr');
            tr.append(node('th', 'Nama / jenis'));
            ms.forEach((m) =>
                tr.append(node('th', labelCycle(m).split(' ')[0], 'numeric')),
            );
            h.append(tr);
            matrix.replaceChildren();
            const broad = s.people().filter((p) => {
                const f = filters();
                return (
                    (!f.unit_id || p.unitId === f.unit_id) &&
                    (!f.division_id || p.divisionId === f.division_id) &&
                    (!f.kind || p.type === f.kind) &&
                    (!f.search ||
                        `${p.name} ${p.nip}`
                            .toLowerCase()
                            .includes(f.search.toLowerCase()))
                );
            });
            for (const p of broad) {
                const r = node('tr');
                r.append(node('td', p.name));
                for (const m of ms) {
                    const td = node('td', null, 'numeric');
                    if (s.assessment(p.id, m).status === 'Final')
                        td.append(
                            reviewButton(
                                { personId: p.id },
                                m,
                                number(s.total(p.id, m)),
                            ),
                        );
                    else td.textContent = '-';
                    r.append(td);
                }
                matrix.append(r);
            }
            emptyTable(matrix, 4, 'Belum ada anggota pada cakupan ini.');
            paginate(matrix, 'matrix', {
                size: 10,
                token: JSON.stringify(filters()),
            });
        }
        homeExtras(d);
    }
    function emptyTable(body, count, message) {
        if (body.childElementCount) return;
        const tr = node('tr'),
            td = node('td', message, 'empty');
        td.colSpan = count;
        tr.append(td);
        body.append(tr);
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
                s.live &&
                initial?.cycle_id === s.cycle()?.dbId &&
                !Object.keys(filters()).length
            ) {
                d = initial;
            } else if (s.live && s.cycle()) {
                const f = new URLSearchParams({
                    cycle_id: s.cycle().dbId,
                    ...filters(),
                });
                d = (
                    await s.api.request('/data/insights?' + f, 'GET', null, {
                        signal: controller.signal,
                    })
                ).data;
            } else d = reviewData(s, filters());
            if (current !== sequence) return;
            await render(d);
            document.documentElement.dataset.insightsReady = 'true';
        } catch (e) {
            if (current !== sequence || e.name === 'AbortError') return;
            if (error) {
                error.textContent = dashboard
                    ? 'Ringkasan dan grafik belum dapat dimuat. Coba muat ulang.'
                    : e.message;
                error.hidden = false;
            }
            if (dashboard) {
                $('[data-dashboard-reload]').hidden = false;
                $('[data-dashboard-metrics]').textContent =
                    'Ringkasan belum tersedia.';
                for (const chart of dashboard.querySelectorAll('[aria-busy]')) {
                    chart.setAttribute('aria-busy', 'false');
                    chart.replaceChildren(
                        node(
                            'p',
                            'Grafik belum tersedia.',
                            'dashboard-loading',
                        ),
                    );
                }
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
    quarter?.addEventListener('change', schedule);
    load();
}
