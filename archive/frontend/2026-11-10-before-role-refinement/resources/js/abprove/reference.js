import {
    $,
    $$,
    node,
    number,
    labelCycle,
    dateTime,
    status,
    empty,
} from './flow-dom';
import { paginate } from './pagination';
import { activityLabel, activitySubject } from './activity-labels';

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
const initials = (name) =>
    name
        .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
        .split(/[ ,]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join('');
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
function table(root, headings, rows, key, size = 10, cls = '') {
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
    rows.forEach((r) => body.append(r));
    if (!rows.length) {
        const tr = node('tr'),
            td = cell('Belum ada data pada periode atau filter ini.', 'empty');
        td.colSpan = headings.length;
        tr.append(td);
        body.append(tr);
    }
    paginate(body, key, { size });
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
    for (const { r, kind, value } of entries) {
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
        root.append(row);
    }
    if (!entries.length) empty(root, 'Belum ada temuan dari penilaian Final.');
    paginate(root, pager, {
        size: limit,
        token: key + rows.map((r) => r.personId).join(','),
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
function home(c, s, d, link) {
    const m = d.metrics,
        cycle = s.cycle(),
        month = s.cycleKey,
        people = s.people(),
        members = people.filter((p) => p.type === 'member'),
        hour = +new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            hourCycle: 'h23',
            timeZone: 'Asia/Jakarta',
        }).format(new Date());
    text(
        '[data-reference-greeting]',
        `Selamat ${hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 18 ? 'sore' : 'malam'}, ${s.actor?.name || c.actor.nama}.`,
    );
    text(
        '[data-reference-headline]',
        c.role === 'ku'
            ? `${m.not_started + m.returned} dari ${m.total} karyawan belum diajukan.`
            : c.role === 'kd'
              ? `${m.submitted} penilaian menunggu persetujuan Anda.`
              : `${m.final} penilaian sudah Final oleh Kepala Divisi.`,
    );
    const due = (value) =>
        value ? `${dateTime(value)} WIB` : 'Periode belum diatur';
    text('[data-reference-submission-due]', due(cycle?.submission));
    text(
        '[data-reference-approval-due]',
        `Batas persetujuan ${due(cycle?.approval)}`,
    );
    text('[data-reference-closes]', `Ditutup ${due(cycle?.closes)}`);
    figures(
        $('[data-reference-home-figures]'),
        c.role === 'ku'
            ? [
                  ['Karyawan unit', m.total, 'anggota unit'],
                  [
                      'Sudah diajukan',
                      m.submitted + m.final,
                      `${m.submitted} menunggu Kepala Divisi`,
                  ],
                  [
                      'Dikembalikan',
                      m.returned,
                      'perlu perbaikan',
                      'text-warning',
                  ],
                  ['Belum diajukan', m.not_started, 'belum diisi'],
              ]
            : [
                  [
                      'Rata-rata nilai divisi',
                      number(m.average),
                      'hasil Final',
                      'text-info',
                  ],
                  ['Menunggu Anda', m.submitted, 'penilaian untuk ditinjau'],
                  [
                      'Dikembalikan',
                      m.returned,
                      'sedang diperbaiki unit',
                      'text-warning',
                  ],
                  [
                      'Belum diajukan unit',
                      m.not_started,
                      'staf dan Kepala Unit',
                  ],
              ],
    );
    const ring = $('[data-reference-ring]');
    if (ring) {
        ring.replaceChildren(node('span', `${m.final}/${m.total}`));
        ring.style.setProperty(
            '--completion',
            `${(m.final / Math.max(1, m.total)) * 100}%`,
        );
    }
    if (c.role === 'hc') {
        const steps = $('[data-home-cycle-progress]');
        steps.replaceChildren();
        for (const [count, label, hint] of [
            [
                m.final + m.submitted + m.returned,
                'dinilai',
                'oleh penilai sesuai role',
            ],
            [m.submitted, 'menunggu', 'persetujuan Kepala Divisi'],
            [m.final, 'Final', 'dikunci Kepala Divisi'],
        ]) {
            const el = node('div');
            el.append(
                node('b', `${count}/${m.total} ${label}`),
                node('span', hint),
            );
            steps.append(el);
        }
        const root = $('[data-home-progress]');
        root.replaceChildren();
        for (const group of d.division_progress) {
            const section = node('section', null, 'reference-progress-group'),
                heading = node('div', null, 'section-heading'),
                division = s.division(group.id),
                name = node('div'),
                host = node('div');
            name.append(
                node('h3', group.name, 'section-title'),
                node(
                    'span',
                    s.account(division?.headId)?.name || '',
                    'text-xs text-muted',
                ),
            );
            heading.append(name);
            section.append(heading, host);
            root.append(section);
            progress(
                host,
                d.unit_status.filter(
                    (u) => s.unit(u.id)?.divisionId === group.id,
                ),
                s,
                link,
                c.role,
                'home-division-' + group.id,
            );
        }
        if (!root.childElementCount)
            empty(
                root,
                'Belum ada divisi dan unit. Mulai dari akun kepala dan struktur.',
            );
        paginate(root, 'home-divisions', { size: 1 });
        const activity = $('[data-home-activities]');
        activity.replaceChildren();
        for (const a of s.data.activities.slice(0, 4)) {
            const row = node('a', null, 'reference-feed-item'),
                body = node('div', null, 'reference-feed-body');
            row.href = link('aktivitas');
            row.append(node('span', initials(a.who), 'avatar'));
            body.append(
                node('strong', `${a.who} `),
                node('span', activityLabel(a.action).toLowerCase()),
                node('p', activitySubject(a), 'feed-meta'),
                node('p', `${dateTime(a.at)} WIB`, 'feed-meta'),
            );
            row.append(body);
            activity.append(row);
        }
        if (!activity.childElementCount)
            empty(activity, 'Belum ada aktivitas.');
        feed($('[data-home-findings]'), d.findings, month, 'home-findings', 4);
    } else if (c.role === 'kd') {
        progress(
            $('[data-home-progress]'),
            d.unit_status,
            s,
            link,
            c.role,
            'home-progress',
        );
        table(
            $('[data-reference-waiting]'),
            ['Nama', 'Status', 'Total nilai', 'Kategori', ''],
            members
                .filter((p) => s.assessment(p.id).status === 'Diajukan')
                .map((p) => {
                    const tr = node('tr'),
                        name = cell(null),
                        st = cell(null),
                        a = cell(null);
                    name.append(person(p, p.unitName));
                    const badge = node('span', null, 'status');
                    status(badge, 'Diajukan');
                    st.append(badge);
                    a.append(review(p, month, 'Tinjau'));
                    tr.append(
                        name,
                        st,
                        cell(number(s.total(p.id)), 'numeric font-semibold'),
                        cell(s.category(p.id).label),
                        a,
                    );
                    return tr;
                }),
            'home-waiting',
            10,
        );
        const heads = s.people('unit_head');
        text(
            '[data-head-progress]',
            `${heads.filter((p) => s.assessment(p.id).status === 'Final').length}/${heads.length} Kepala Unit sudah Final.`,
        );
    } else {
        const root = $('[data-reference-returns]'),
            returned = members.filter(
                (p) => s.assessment(p.id).status === 'Dikembalikan',
            );
        root.replaceChildren();
        text('[data-reference-return-count]', `${returned.length} penilaian`);
        for (const p of returned) {
            const a = s.assessment(p.id),
                card = node('div', null, 'card reference-return-card'),
                copy = node('div', null, 'min-w-0 grow'),
                head = node('div', null, 'flex flex-wrap items-center gap-3'),
                badge = node('span', null, 'status');
            status(badge, 'Dikembalikan');
            head.append(node('strong', p.name, 'font-semibold'), badge);
            copy.append(
                head,
                node('p', `${p.job}, NIP ${p.nip}`, 'text-xs text-muted mt-1'),
                node(
                    'p',
                    `Catatan Kepala Divisi: ${a.reason || 'Tinjau kembali penilaian.'}`,
                    'return-note',
                ),
            );
            card.append(
                copy,
                action('Perbaiki nilai', link('nilai', { person: p.id }), true),
            );
            root.append(card);
        }
        if (!returned.length)
            root.append(
                node(
                    'p',
                    'Tidak ada penilaian yang perlu diperbaiki.',
                    'card p-5 text-muted',
                ),
            );
        paginate(root, 'home-returns', { size: 1 });
        table(
            $('[data-reference-next]'),
            ['Karyawan', 'Jabatan', 'Status', 'Terakhir diubah', 'Tindakan'],
            members
                .filter((p) => s.assessment(p.id).status === 'Belum')
                .map((p) => {
                    const tr = node('tr'),
                        name = cell(null),
                        badge = node('span', null, 'status'),
                        st = cell(null),
                        a = cell(null, 'numeric');
                    status(badge, 'Belum');
                    name.append(person(p, `NIP ${p.nip}`));
                    st.append(badge);
                    a.append(
                        action('Mulai isi', link('nilai', { person: p.id })),
                    );
                    tr.append(
                        name,
                        cell(p.job),
                        st,
                        cell('-', 'text-muted'),
                        a,
                    );
                    return tr;
                }),
            'home-next',
            3,
        );
        const rootProgress = $('[data-home-cycle-progress]'),
            p = node('progress');
        p.max = m.total || 1;
        p.value = m.submitted + m.final;
        p.setAttribute('aria-label', 'Progres pengajuan');
        rootProgress.replaceChildren(
            node('p', `${p.value} dari ${m.total} sudah diajukan`),
            p,
        );
        const follow = $('[data-reference-followups]');
        follow.replaceChildren();
        for (const [label, n, state] of [
            ['Penilaian dikembalikan', m.returned, 'Dikembalikan'],
            ['Belum dinilai', m.not_started, 'Belum'],
            ['Menunggu Kepala Divisi', m.submitted, 'Diajukan'],
            ['Sudah Final', m.final, 'Final'],
        ]) {
            const el = node('div');
            const term = node('dt'),
                count = node('dd');
            status(term, state, label);
            status(count, state, String(n));
            el.append(term, count);
            follow.append(el);
        }
        const kpis = $('[data-home-kpi]');
        kpis.replaceChildren();
        const templates = [
            ...new Map(
                members
                    .map((p) => s.template(p))
                    .filter(Boolean)
                    .map((k) => [k.id, k]),
            ).values(),
        ];
        for (const k of templates) {
            const el = node('div');
            el.append(
                node('strong', k.name, 'font-semibold'),
                node(
                    'p',
                    `${k.items.length} KPI, bobot ${k.items.reduce((a, i) => a + i.weight, 0)}%`,
                    'text-xs text-muted mt-1',
                ),
            );
            kpis.append(el);
        }
        if (!templates.length) empty(kpis, 'KPI belum disusun oleh Super HC.');
        const keys = yearKeys(month);
        lineChart(
            $('[data-home-trend]'),
            keys,
            keys.map((key) =>
                mean(
                    s
                        .people('member', key)
                        .filter(
                            (p) => s.assessment(p.id, key).status === 'Final',
                        )
                        .map((p) => s.total(p.id, key)),
                ),
            ),
        );
    }
}
function report(c, s, d, link, filters) {
    const month = s.cycleKey,
        keys = yearKeys(month),
        visible = rangedKeys(s),
        people = (key) =>
            s.people('all', key).filter((p) => matches(p, filters, s, key)),
        finals = (key) =>
            people(key).filter(
                (p) => s.assessment(p.id, key).status === 'Final',
            ),
        m = d.metrics;
    text('[data-reference-year]', month.slice(0, 4));
    const catCounts = Map.groupBy(d.scores, (r) => r.category),
        distribution = [...catCounts]
            .map(([label, rows]) => `${rows.length} ${label.toLowerCase()}`)
            .join(', ');
    figures($('[data-reference-report-figures]'), [
        [
            'Rata-rata nilai Final',
            format(m.average),
            'periode terpilih',
            'text-info',
        ],
        [
            'Sudah dinilai',
            `${m.final + m.submitted + m.returned} / ${m.total}`,
            'staf dan Kepala Unit',
        ],
        [
            'Sudah Final',
            `${Math.round((m.final / Math.max(1, m.total)) * 100)}%`,
            `${m.final} penilaian`,
        ],
        [
            'Sebaran kategori',
            `${catCounts.size} kategori`,
            distribution || 'Belum ada hasil Final',
        ],
    ]);
    const categoryVisual = $(
        '[data-reference-report-figures] > div:last-child .figure-value',
    );
    if (categoryVisual) {
        categoryVisual.replaceChildren();
        categoryVisual.classList.add('reference-category-visual');
        const distributionBar = node('div', null, 'reference-bar');
        distributionBar.setAttribute('role', 'img');
        distributionBar.setAttribute(
            'aria-label',
            distribution || 'Belum ada kategori Final',
        );
        for (const [label, rows] of catCounts) {
            const part = node('span');
            part.style.width = `${(rows.length / Math.max(1, m.final)) * 100}%`;
            part.style.background =
                label === 'Sangat Baik'
                    ? 'var(--color-success)'
                    : label === 'Baik'
                      ? 'var(--color-info)'
                      : label === 'Cukup'
                        ? 'var(--color-warning)'
                        : 'var(--color-primary)';
            distributionBar.append(part);
        }
        categoryVisual.append(distributionBar);
    }
    lineChart(
        $('[data-reference-trend]'),
        keys,
        keys.map((key) => mean(finals(key).map((p) => s.total(p.id, key)))),
    );
    const avgs = $('[data-reference-unit-averages]');
    if (avgs) {
        avgs.replaceChildren();
        for (const [name, rows] of Map.groupBy(d.scores, (r) => r.unit_name)) {
            const avg = mean(rows.map((r) => +r.total)),
                el = node('div', null, 'reference-unit-average'),
                caption = node('div'),
                bar = node('div', null, 'reference-bar'),
                fill = node('span');
            caption.append(node('span', name), node('b', format(avg)));
            fill.style.width = `${avg}%`;
            bar.append(fill);
            el.append(caption, bar);
            avgs.append(el);
        }
        if (!avgs.childElementCount)
            empty(avgs, 'Belum ada rata-rata Final per unit.');
    }
    const kpiBody = $('[data-item-averages]');
    if (kpiBody) {
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
        for (const r of groups.values()) {
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
            kpiBody.append(tr);
        }
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
            size: 5,
            token: JSON.stringify(filters),
        });
    }
    if ($('[data-unit-status]'))
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
    if (rank) {
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
        const group = d.rankings[+select.value || 0];
        table(
            rank,
            ['Peringkat', 'Nama', 'Nilai', 'Kategori'],
            (group?.rows || []).map((r, i) => {
                const tr = node('tr'),
                    name = cell(null),
                    b = review(r, month);
                b.replaceChildren(person(r, r.unit_name));
                name.append(b);
                tr.append(
                    cell(i + 1, 'text-muted'),
                    name,
                    cell(number(r.total), 'numeric font-semibold'),
                    cell(r.category, 'text-success font-semibold'),
                );
                return tr;
            }),
            'ranking',
            10,
            'reference-ranking-table',
        );
    }
    feed($('[data-staff-findings]'), d.findings, month);
    const matrix = $('[data-matrix-body]');
    if (matrix) {
        matrixHead($('[data-matrix-head]'), visible, 'Nama', true);
        matrix.replaceChildren();
        for (const p of people(month)) {
            const tr = node('tr'),
                name = cell(null),
                vals = visible.map((key) =>
                    s.assessment(p.id, key).status === 'Final'
                        ? s.total(p.id, key)
                        : null,
                );
            name.append(person(p, p.type === 'member' ? p.job : 'Kepala Unit'));
            tr.append(name);
            visible.forEach((key, i) =>
                tr.append(
                    matrixCell(
                        vals[i],
                        key,
                        month,
                        vals[i] == null
                            ? null
                            : review(p, key, format(vals[i])),
                    ),
                ),
            );
            tr.append(
                cell(
                    format(mean(vals.filter((v) => v !== null))),
                    'numeric text-info font-semibold',
                ),
            );
            matrix.append(tr);
        }
        if (!matrix.childElementCount) {
            const tr = node('tr'),
                td = cell('Tidak ada karyawan pada filter ini.', 'empty');
            td.colSpan = visible.length + 2;
            tr.append(td);
            matrix.append(tr);
        }
        paginate(matrix, 'staff-scores', {
            size: 10,
            token: JSON.stringify(filters),
        });
    }
}
export function renderReference(c, s, d, link, filters) {
    const root = $('[data-reference-layout]');
    if (!root) return;
    root.referenceState = { c, s, d, link, filters };
    if (!root.dataset.referenceBound) {
        root.dataset.referenceBound = 'true';
        root.addEventListener('change', (e) => {
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
    if (root.dataset.referenceLayout === 'home') home(c, s, d, link);
    else report(c, s, d, link, filters);
}
