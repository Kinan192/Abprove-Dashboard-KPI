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
/** Findings feed views; negative entries always come first. */
const FINDINGS = {
    negative: {
        title: 'Temuan negatif',
        empty: 'Tidak ada temuan negatif pada filter ini.',
    },
    positive: {
        title: 'Temuan positif',
        empty: 'Tidak ada temuan positif pada filter ini.',
    },
    all: {
        title: 'Semua temuan',
        empty: 'Belum ada temuan dari penilaian Final pada filter ini.',
    },
};
const findingsView = () => {
    const value = $('[data-report-findings]')?.value;
    return FINDINGS[value] ? value : 'negative';
};
function feed(root, rows, key, view) {
    if (!root) return;
    root.replaceChildren();
    $$('[data-findings-kind-title]').forEach(
        (el) => (el.textContent = FINDINGS[view].title),
    );
    const entries = ['negative', 'positive']
        .filter((kind) => view === 'all' || kind === view)
        .flatMap((kind) =>
            rows
                .filter((r) => String(r[kind] ?? '').trim())
                .map((r) => ({ r, kind, value: r[kind] })),
        );
    const renderRow = ({ r, kind, value }) => {
        const negative = kind === 'negative',
            row = node('div', null, 'reference-feed-item'),
            body = node('div', null, 'reference-feed-body'),
            title = node('div'),
            icon = node(
                'span',
                negative ? '!' : '+',
                `reference-feed-icon ${kind}`,
            );
        icon.setAttribute('aria-hidden', 'true');
        row.dataset.findingKind = kind;
        title.append(
            node(
                'span',
                negative ? 'Negatif' : 'Positif',
                `reference-feed-kind ${kind}`,
            ),
            review(r, key),
            node(
                'span',
                ` ${labelCycle(key).split(' ')[0]}, ${r.unit_name}`,
                'text-xs text-muted',
            ),
        );
        body.append(title, node('p', value));
        row.append(icon, body);
        return row;
    };
    if (!entries.length) empty(root, FINDINGS[view].empty);
    paginate(root, 'staff-findings', {
        size: 10,
        token: JSON.stringify([key, view, rows.map((r) => r.personId)]),
        records: entries,
        renderRow,
    });
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
        // The filter badge and reset treat this screen-dependent range as the baseline.
        select.dataset.filterDefault = select.value;
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
            );
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
    const rank = $('[data-ranking-v4]');
    if (panel === 'results' && rank) {
        // Positions come from the server per KPI group (template + kind); they are
        // never merged into one cross-group rank, so every row names its group.
        const kindLabel = (kind) => (kind === 'member' ? 'Staf' : 'Kepala Unit'),
            groups = [...d.rankings].sort(
                (a, b) =>
                    String(a.area ?? '').localeCompare(String(b.area ?? ''), 'id') ||
                    (a.kind === b.kind ? 0 : a.kind === 'member' ? -1 : 1),
            ),
            base = (g) => `${g.area} · ${kindLabel(g.kind)}`,
            shared = new Set(
                groups
                    .map(base)
                    .filter((label, i, all) => all.indexOf(label) !== i),
            );
        const rows = groups.flatMap((group) =>
            group.rows.map((row, index) => ({
                ...row,
                position: index + 1,
                size: group.rows.length,
                groupLabel: shared.has(base(group))
                    ? `${base(group)} · ${group.name}`
                    : base(group),
            })),
        );
        const body = table(
            rank,
            [
                'Peringkat dalam kelompok',
                'Nama dan kelompok KPI',
                'Nilai',
                'Kategori',
            ],
            rows,
            'ranking',
            10,
            'reference-ranking-table',
            {
                token: JSON.stringify([month, filters]),
                renderRow: (r) => {
                    const tr = node('tr'),
                        position = cell(null, 'reference-rank-position'),
                        name = cell(null),
                        b = review(r, month),
                        current = s.category(r.personId),
                        category = cell(r.category, 'category');
                    if (current?.label === r.category)
                        category.dataset.category = current.key;
                    position.setAttribute(
                        'aria-label',
                        `Peringkat ${r.position} dari ${r.size} di kelompok ${r.groupLabel}`,
                    );
                    position.append(
                        node('strong', `#${r.position}`),
                        node('small', `dari ${r.size}`),
                    );
                    b.replaceChildren(person(r, `Kelompok: ${r.groupLabel}`));
                    name.append(b);
                    tr.dataset.rankGroup = r.groupLabel;
                    tr.append(
                        position,
                        name,
                        cell(number(r.total), 'numeric font-semibold'),
                        category,
                    );
                    return tr;
                },
            },
        );
        const caption = node(
            'caption',
            'Peringkat dihitung terpisah di setiap kelompok KPI (unit atau divisi dan jenis penilaian); nomor peringkat tidak dibandingkan antarkelompok.',
            'sr-only',
        );
        body?.parentElement.prepend(caption);
    }
    if (panel === 'results' || panel === 'findings')
        feed($('[data-staff-findings]'), d.findings, month, findingsView());
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
        tr.append(cell(format(average), 'numeric text-link font-semibold'));
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
/** Report-only filter fields show only on the tab they act on. */
function reportControls(panel) {
    $$('[data-report-control]').forEach((field) => {
        field.hidden = !field.dataset.reportControl.split(',').includes(panel);
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
            reportControls(root.referencePanel);
            const v = root.referenceState;
            report(v.c, v.s, v.d, v.link, v.filters, root.referencePanel);
        });
        // The filter group sits inside this root, so its range and sort fields
        // re-render locally without a server request.
        root.addEventListener('change', (e) => {
            if (e.target.matches('[data-staff-score-order]')) {
                const { s, filters } = root.referenceState;
                staffScores(s, filters, rangedKeys(s));
                return;
            }
            // Findings kind filters the loaded rows; unit/type/search stay server-side.
            if (e.target.matches('[data-report-findings]')) {
                if (!['results', 'findings'].includes(root.referencePanel))
                    return;
                const { s, d } = root.referenceState;
                feed(
                    $('[data-staff-findings]'),
                    d.findings,
                    s.cycleKey,
                    findingsView(),
                );
                return;
            }
            if (e.target.matches('[data-report-range]')) {
                const v = root.referenceState;
                renderReference(v.c, v.s, v.d, v.link, v.filters);
            }
        });
    }
    reportControls(root.referencePanel);
    report(c, s, d, link, filters, root.referencePanel);
}
