import {
    $,
    $$,
    node,
    number,
    labelCycle,
    status,
    empty,
    initials,
} from './flow-dom';
import { paginate } from './pagination';

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];
const mean = (values) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const format = (value, digits = 1) =>
    value == null
        ? '-'
        : new Intl.NumberFormat('id-ID', {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          }).format(value);
const text = (selector, value) =>
    $$(selector).forEach((el) => (el.textContent = value ?? '-'));
const cell = (value, cls = '') => node('td', value, cls);
const yearKeys = (key) =>
    Array.from(
        { length: 12 },
        (_, i) => `${key.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`,
    );
function action(label, href, primary = false) {
    const a = node('a', label, primary ? 'btn btn-primary' : 'btn btn-small');
    a.href = href;
    return a;
}
function review(row, key, label) {
    const b = node('button', label ?? row.name, 'link');
    b.type = 'button';
    b.dataset.reviewPerson = row.personId || row.id;
    b.dataset.reviewCycle = key;
    return b;
}
function person(p, subtitle) {
    const el = node('div', null, 'reference-person'),
        copy = node('div');
    el.append(node('span', initials(p.name), 'avatar'));
    copy.append(
        node('strong', p.name),
        node('small', subtitle ?? p.job ?? p.unitName ?? p.unit_name ?? ''),
    );
    el.append(copy);
    return el;
}
function table(
    root,
    headings,
    rows,
    key,
    size = 10,
    cls = '',
    { renderRow, token = '' } = {},
) {
    if (!root) return;
    root.replaceChildren();
    const wrap = node('div', null, 'table-wrap'),
        t = node('table', null, `data-table ${cls}`),
        head = node('thead'),
        tr = node('tr'),
        body = node('tbody');
    headings.forEach((h) => tr.append(node('th', h)));
    head.append(tr);
    t.append(head, body);
    const widths = cls.includes('reference-progress-table')
        ? ['34%', 'auto', '130px']
        : cls.includes('reference-ranking-table')
          ? ['10%', '48%', '18%', '24%']
          : null;
    if (widths) {
        const columns = node('colgroup');
        for (const width of widths) {
            const column = node('col');
            column.style.width = width;
            columns.append(column);
        }
        t.prepend(columns);
    }
    wrap.append(t);
    root.append(wrap);
    if (!renderRow) rows.forEach((r) => body.append(r));
    if (!rows.length) {
        const tr = node('tr'),
            td = cell('Belum ada data pada periode atau filter ini.', 'empty');
        td.colSpan = headings.length;
        tr.append(td);
        body.append(tr);
    }
    paginate(body, key, {
        size,
        token,
        records: renderRow ? rows : undefined,
        renderRow,
    });
    return body;
}
function figures(root, rows) {
    if (!root) return;
    root.replaceChildren();
    for (const [label, value, hint, cls = ''] of rows) {
        const div = node('div');
        div.append(
            node('p', label, 'figure-label'),
            node('p', value, `figure-value num ${cls}`),
            node('p', hint, 'figure-hint'),
        );
        root.append(div);
    }
}
function bar(row) {
    const el = node('div', null, 'reference-bar');
    el.setAttribute('role', 'img');
    el.setAttribute(
        'aria-label',
        `${row.final} Final, ${row.submitted} menunggu, ${row.returned} dikembalikan, ${row.not_started} belum diisi`,
    );
    for (const [key, cls] of [
        ['final', 'final'],
        ['submitted', 'submitted'],
        ['returned', 'returned'],
    ]) {
        if (!row[key]) continue;
        const part = node('span', null, cls);
        part.style.width = `${(row[key] / Math.max(1, row.total)) * 100}%`;
        el.append(part);
    }
    return el;
}
function progress(root, rows, s, link, role, key, size = 5) {
    return table(
        root,
        ['Unit', 'Status penilaian', 'Tindakan'],
        rows.map((row) => {
            const tr = node('tr'),
                u = s.unit(row.id),
                name = cell(null),
                state = cell(null),
                cta = cell(null, 'numeric');
            name.append(
                node('strong', row.name),
                node(
                    'p',
                    s.account(u?.headId)?.name || 'Belum ditetapkan',
                    'text-xs text-muted mt-1',
                ),
            );
            const caption = node('p', null, 'reference-progress-caption');
            for (const [value, label, count] of [
                ['Diajukan', 'menunggu', row.submitted],
                ['Final', 'Final', row.final],
                ['Dikembalikan', 'revisi', row.returned],
                ['Belum', 'belum diisi', row.not_started],
            ]) {
                if (caption.childNodes.length)
                    caption.append(document.createTextNode(', '));
                const span = node('span');
                status(span, value, `${count} ${label}`);
                caption.append(span);
            }
            state.append(bar(row), caption);
            const a = action(
                'Lihat rincian',
                link(role === 'hc' ? 'rekap' : 'persetujuan', {
                    unit: row.id,
                    status: 'all',
                }),
            );
            a.className = 'btn btn-ghost btn-small';
            cta.append(a);
            tr.append(name, state, cta);
            return tr;
        }),
        key,
        size,
        'reference-progress-table',
    );
}
function feed(root, rows, key, pager = 'staff-findings', limit = 10) {
    if (!root) return;
    root.replaceChildren();
    const entries = rows.flatMap((r) =>
        [
            ['positive', r.positive],
            ['negative', r.negative],
        ]
            .filter(([, value]) => value)
            .map(([kind, value]) => ({ r, kind, value })),
    );
    const renderRow = ({ r, kind, value }) => {
        const row = node('div', null, 'reference-feed-item'),
            body = node('div', null, 'reference-feed-body'),
            title = node('div');
        row.append(
            node(
                'span',
                kind === 'positive' ? '+' : '!',
                'reference-feed-icon' +
                    (kind === 'negative' ? ' negative' : ''),
            ),
        );
        title.append(
            review(r, key),
            node(
                'span',
                ` ${labelCycle(key).split(' ')[0]}, ${r.unit_name}`,
                'text-xs text-muted',
            ),
        );
        body.append(title, node('p', value));
        row.append(body);
        return row;
    };
    if (!entries.length) empty(root, 'Belum ada temuan dari penilaian Final.');
    paginate(root, pager, {
        size: limit,
        token: key + rows.map((r) => r.personId).join(','),
        records: entries,
        renderRow,
    });
}
function lineChart(root, keys, values) {
    if (!root) return;
    root.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg',
        el = (tag, attrs = {}) => {
            const e = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(attrs))
                e.setAttribute(k, String(v));
            return e;
        };
    const svg = el('svg', {
            viewBox: '0 0 800 210',
            role: 'img',
            'aria-label': 'Tren rata-rata nilai Final per bulan',
        }),
        valid = values.filter((v) => v !== null),
        low = valid.length
            ? Math.max(0, Math.floor((Math.min(...valid) - 10) / 10) * 10)
            : 0;
    const x = (i) => 42 + i * 66.8,
        y = (v) => 174 - ((v - low) / (100 - low)) * 154;
    for (let i = 0; i < 5; i++) {
        const v = low + ((100 - low) / 4) * i,
            py = y(v);
        svg.append(
            el('path', {
                d: `M42 ${py}H778`,
                stroke: 'var(--color-line)',
                fill: 'none',
            }),
        );
        const label = el('text', { x: 32, y: py + 4, 'text-anchor': 'end' });
        label.textContent = format(v, 0);
        svg.append(label);
    }
    let segment = [];
    const flush = () => {
        if (segment.length > 1) {
            const points = segment.map(([i, v]) => `${x(i)},${y(v)}`).join(' ');
            svg.append(
                el('polygon', {
                    points: `${x(segment[0][0])},174 ${points} ${x(segment.at(-1)[0])},174`,
                    fill: 'var(--color-primary)',
                    opacity: '.045',
                }),
                el('polyline', {
                    points,
                    fill: 'none',
                    stroke: 'var(--color-primary)',
                    'stroke-width': 2,
                }),
            );
        }
        segment = [];
    };
    values.forEach((v, i) => {
        if (v == null) {
            flush();
            return;
        }
        segment.push([i, v]);
    });
    flush();
    values.forEach((v, i) => {
        if (v == null) return;
        const dot = el('circle', {
            cx: x(i),
            cy: y(v),
            r: i === values.findLastIndex((v) => v !== null) ? 4 : 3,
            fill: 'var(--color-paper)',
            stroke: 'var(--color-primary)',
            'stroke-width': 2,
        });
        const title = el('title');
        title.textContent = `${labelCycle(keys[i])}: ${number(v)}`;
        dot.append(title);
        svg.append(dot);
    });
    keys.forEach((k, i) => {
        const label = el('text', { x: x(i), y: 198, 'text-anchor': 'middle' });
        label.textContent = months[+k.slice(5) - 1];
        svg.append(label);
    });
    root.append(svg);
    if (!valid.length)
        root.append(
            node(
                'p',
                'Belum ada hasil Final pada tahun ini.',
                'text-xs text-muted text-center py-2',
            ),
        );
}
function matches(p, f, s, key) {
    return (
        (!f.unit_id || p.unitId === f.unit_id) &&
        (!f.division_id || p.divisionId === f.division_id) &&
        (!f.kind || p.type === f.kind) &&
        (!f.search ||
            `${p.name} ${p.nip}`
                .toLowerCase()
                .includes(f.search.toLowerCase())) &&
        (!f.template_id || s.template(p, key)?.id === f.template_id)
    );
}
function rangedKeys(s) {
    const select = $('[data-report-range]'),
        all = yearKeys(s.cycleKey);
    if (select && !select.options.length) {
        select.append(
            new Option('Januari - Desember', 'year'),
            ...[
                'Januari - Maret',
                'April - Juni',
                'Juli - September',
                'Oktober - Desember',
            ].map((label, i) => new Option(label, String(i))),
        );
        select.value =
            innerWidth <= 900
                ? String(Math.floor((+s.cycleKey.slice(5) - 1) / 3))
                : 'year';
    }
    const q = select?.value ?? 'year';
    return q === 'year' ? all : all.slice(+q * 3, +q * 3 + 3);
}
function matrixHead(root, keys, label, average = false) {
    root.replaceChildren();
    const row = node('tr');
    row.append(node('th', label));
    keys.forEach((k) =>
        row.append(
            node(
                'th',
                months[+k.slice(5) - 1],
                k === root.dataset.current ? 'reference-selected-month' : '',
            ),
        ),
    );
    if (average) row.append(node('th', 'Rata-rata'));
    root.append(row);
}
function matrixCell(value, key, current, button) {
    const td = cell(null, key === current ? 'reference-selected-month' : '');
    if (value == null) {
        td.textContent = '-';
        td.classList.add('month-empty');
        return td;
    }
    const cls =
        value >= 90 ? 'heat-high' : value >= 80 ? 'heat-mid' : 'heat-low';
    const el = button || node('span', format(value, 1));
    el.className = `heat-cell ${cls}`;
    td.append(el);
    return td;
}
function dashboardComparison(root, c, d, month, filters) {
    if (!root) return;
    root.replaceChildren();
    const rows =
        c.role === 'ku'
            ? d.item_averages
                  .filter((r) => r.kind === 'member' && r.average != null)
                  .map((r) => ({
                      name: r.name,
                      average: +r.average,
                      count: r.count,
                  }))
            : [
                  ...Map.groupBy(d.scores, (r) =>
                      c.role === 'hc' ? r.division_name : r.unit_name,
                  ),
              ].map(([name, scores]) => ({
                  name,
                  average: mean(scores.map((r) => +r.total)),
                  count: scores.length,
              }));
    rows.sort((a, b) => a.average - b.average || a.name.localeCompare(b.name));
    if (!rows.length)
        empty(root, 'Belum ada nilai Final untuk perbandingan ini.');
    paginate(root, 'dashboard-comparison', {
        size: 5,
        token: JSON.stringify([month, filters]),
        records: rows,
        renderRow: (r) => {
            const row = node('div', null, 'dashboard-comparison-row'),
                heading = node('div', null, 'dashboard-comparison-label'),
                track = node('div', null, 'dashboard-comparison-track'),
                fill = node('span');
            row.setAttribute('role', 'img');
            row.setAttribute(
                'aria-label',
                `${r.name}: rata-rata ${format(r.average)}, dari ${r.count} hasil Final`,
            );
            row.dataset.chartLabel = r.name;
            row.dataset.chartValue = r.average;
            heading.append(
                node('span', r.name),
                node('strong', format(r.average)),
            );
            fill.style.width = `${Math.max(0, Math.min(100, r.average))}%`;
            track.append(fill);
            row.append(
                heading,
                track,
                node('small', `${r.count} hasil Final`, 'text-muted'),
            );
            return row;
        },
    });
}
function report(c, s, d, link, filters, panel) {
    const month = s.cycleKey,
        keys = yearKeys(month),
        visible = rangedKeys(s),
        people = (key) =>
            s
                .people(c.role === 'ku' ? 'member' : 'all', key)
                .filter((p) => matches(p, filters, s, key)),
        finals = (key) =>
            people(key).filter(
                (p) => s.assessment(p.id, key).status === 'Final',
            ),
        m = d.metrics;
    text('[data-reference-year]', month.slice(0, 4));
    if (panel === 'summary') {
        figures($('[data-reference-report-figures]'), [
            [
                'Rata-rata nilai Final',
                format(m.average),
                `${m.final} hasil Final periode terpilih`,
                'text-info',
            ],
            [
                c.role === 'hc' ? 'Sudah Final' : 'Belum dinilai',
                c.role === 'hc' ? m.final : m.not_started,
                c.role === 'ku' ? 'staf unit Anda' : 'staf dan Kepala Unit',
            ],
            ['Menunggu ACC', m.submitted, 'ditinjau Kepala Divisi'],
            ['Dikembalikan', m.returned, 'perlu diperbaiki penilai'],
        ]);
        dashboardComparison(
            $('[data-dashboard-comparison]'),
            c,
            d,
            month,
            filters,
        );
        lineChart(
            $('[data-reference-trend]'),
            keys,
            keys.map((key) => mean(finals(key).map((p) => s.total(p.id, key)))),
        );
        const avgs = $('[data-reference-unit-averages]');
        if (avgs) {
            avgs.replaceChildren();
            const groups = [
                ...Map.groupBy(
                    d.scores,
                    (r) =>
                        s.assessment(r.personId, month).scope?.unitId ||
                        r.unit_name,
                ).values(),
            ];
            const renderAverage = (rows) => {
                const avg = mean(rows.map((r) => +r.total)),
                    el = node('div', null, 'reference-unit-average'),
                    caption = node('div'),
                    bar = node('div', null, 'reference-bar'),
                    fill = node('span');
                caption.append(
                    node('span', rows[0].unit_name),
                    node('b', format(avg)),
                );
                fill.style.width = `${avg}%`;
                bar.append(fill);
                el.append(caption, bar);
                return el;
            };
            if (!groups.length)
                empty(avgs, 'Belum ada rata-rata Final per unit.');
            if (c.role === 'hc')
                paginate(avgs, 'unit-averages', {
                    size: 5,
                    token: JSON.stringify([month, filters]),
                    records: groups,
                    renderRow: renderAverage,
                });
            else groups.forEach((rows) => avgs.append(renderAverage(rows)));
        }
    }
    const kpiBody = $('[data-item-averages]');
    if (panel === 'kpi' && kpiBody) {
        const groups = new Map();
        for (const key of keys)
            for (const p of finals(key)) {
                const a = s.assessment(p.id, key),
                    template = s.template(p, key);
                if (!template) continue;
                template.items.forEach((item, index) => {
                    const id = `${p.type}:${template.id}:${item.id}`,
                        row = groups.get(id) || {
                            name: item.name,
                            area:
                                p.type === 'member'
                                    ? p.unitName
                                    : p.divisionName,
                            templateId: template.id,
                            kind: p.type,
                            values: {},
                        };
                    row.values[key] ??= [];
                    row.values[key].push(+a.values[index]);
                    groups.set(id, row);
                });
            }
        matrixHead($('[data-reference-kpi-head]'), visible, 'KPI / cakupan');
        kpiBody.replaceChildren();
        const renderRow = (r) => {
            const tr = node('tr'),
                name = cell(null);
            name.append(
                node('strong', r.name, 'block font-semibold'),
                node(
                    'small',
                    `${r.area} · ${r.kind === 'member' ? 'Staf' : 'Kepala Unit'}`,
                    'text-muted',
                ),
            );
            tr.append(name);
            visible.forEach((key) =>
                tr.append(matrixCell(mean(r.values[key] || []), key, month)),
            );
            return tr;
        };
        if (!groups.size) {
            const tr = node('tr'),
                td = cell(
                    'Belum ada rata-rata KPI dari penilaian Final.',
                    'empty',
                );
            td.colSpan = visible.length + 1;
            tr.append(td);
            kpiBody.append(tr);
        }
        paginate(kpiBody, 'item-averages', {
            size: 10,
            token: JSON.stringify([filters, visible]),
            records: [...groups.values()],
            renderRow,
        });
    }
    if (panel === 'units' && $('[data-unit-status]'))
        progress(
            $('[data-unit-status]'),
            d.unit_status,
            s,
            link,
            c.role,
            'unit-status',
        );
    const rank = $('[data-ranking-v4]'),
        select = $('[data-reference-rank-group]');
    if (panel === 'results' && rank) {
        let groups = d.rankings;
        if (select) {
            const previous = select.value;
            select.replaceChildren(
                ...d.rankings.map(
                    (g, i) =>
                        new Option(
                            `${g.area} · ${g.kind === 'member' ? 'Staf' : 'Kepala Unit'}`,
                            String(i),
                        ),
                ),
            );
            if ([...select.options].some((o) => o.value === previous))
                select.value = previous;
            groups = d.rankings.slice(
                +select.value || 0,
                (+select.value || 0) + 1,
            );
        }
        const rows = groups.flatMap((group) =>
            group.rows.map((row, index) => ({
                ...row,
                position: index + 1,
                groupLabel: `${group.area} · ${group.kind === 'member' ? 'Staf' : 'Kepala Unit'}`,
            })),
        );
        table(
            rank,
            ['Peringkat', 'Nama', 'Nilai', 'Kategori'],
            rows,
            'ranking',
            10,
            'reference-ranking-table',
            {
                token: JSON.stringify([month, filters, select?.value]),
                renderRow: (r) => {
                    const tr = node('tr'),
                        name = cell(null),
                        b = review(r, month);
                    b.replaceChildren(
                        person(r, c.role === 'hc' ? r.groupLabel : r.unit_name),
                    );
                    name.append(b);
                    tr.append(
                        cell(r.position, 'text-muted'),
                        name,
                        cell(number(r.total), 'numeric font-semibold'),
                        cell(r.category, 'text-success font-semibold'),
                    );
                    return tr;
                },
            },
        );
    }
    if (panel === 'results' || panel === 'findings')
        feed($('[data-staff-findings]'), d.findings, month);
    if (panel === 'scores') staffScores(s, filters, visible);
}

function staffScores(s, filters, visible) {
    const matrix = $('[data-matrix-body]');
    if (!matrix) return;

    const month = s.cycleKey;
    const order = $('[data-staff-score-order]')?.value;
    const rows = s
        .people('all', month)
        .filter((p) => matches(p, filters, s, month))
        .map((p) => {
            const values = visible.map((key) =>
                s.assessment(p.id, key).status === 'Final'
                    ? s.total(p.id, key)
                    : null,
            );
            return {
                p,
                values,
                average: mean(values.filter((value) => value !== null)),
            };
        });
    if (order === 'asc' || order === 'desc') {
        rows.sort((a, b) => {
            if (a.average === b.average)
                return a.p.name.localeCompare(b.p.name, 'id');
            if (a.average === null) return 1;
            if (b.average === null) return -1;
            return order === 'asc'
                ? a.average - b.average
                : b.average - a.average;
        });
    }

    matrixHead($('[data-matrix-head]'), visible, 'Nama', true);
    matrix.replaceChildren();
    const renderRow = ({ p, values, average }) => {
        const tr = node('tr');
        const name = cell(null);
        name.append(person(p, p.type === 'member' ? p.job : 'Kepala Unit'));
        tr.append(name);
        visible.forEach((key, i) => {
            const score = values[i];
            tr.append(
                matrixCell(
                    score,
                    key,
                    month,
                    score == null ? null : review(p, key, format(score)),
                ),
            );
        });
        tr.append(cell(format(average), 'numeric text-info font-semibold'));
        return tr;
    };
    if (!rows.length) {
        const tr = node('tr');
        const td = cell('Tidak ada karyawan pada filter ini.', 'empty');
        td.colSpan = visible.length + 2;
        tr.append(td);
        matrix.append(tr);
    }
    paginate(matrix, 'staff-scores', {
        size: 10,
        token: JSON.stringify([filters, visible, order]),
        records: rows,
        renderRow,
    });
}
export function renderReference(c, s, d, link, filters) {
    const root = $('[data-reference-layout]');
    if (!root) return;
    root.referenceState = { c, s, d, link, filters };
    root.referencePanel ||=
        $('[data-panel-tab][aria-selected="true"]', root)?.dataset.panelTab ||
        root.dataset.defaultPanel;
    if (!root.dataset.referenceBound) {
        root.dataset.referenceBound = 'true';
        root.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-panel-tab]');
            if (!tab) return;
            root.referencePanel = tab.dataset.panelTab;
            const v = root.referenceState;
            report(v.c, v.s, v.d, v.link, v.filters, root.referencePanel);
        });
        root.addEventListener('change', (e) => {
            if (e.target.matches('[data-staff-score-order]')) {
                const { s, filters } = root.referenceState;
                staffScores(s, filters, rangedKeys(s));
                return;
            }
            if (
                e.target.matches(
                    '[data-report-range],[data-reference-rank-group]',
                )
            ) {
                const v = root.referenceState;
                renderReference(v.c, v.s, v.d, v.link, v.filters);
            }
        });
    }
    report(c, s, d, link, filters, root.referencePanel);
}
