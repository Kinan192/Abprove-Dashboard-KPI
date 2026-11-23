import {
    $,
    $$,
    node,
    text,
    optionList,
    labelCycle,
    empty,
    status,
    initials,
} from './flow-dom';
import { toast } from './ui';
import { paginate } from './pagination';

const MONTH_NAMES = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];
const ROMAN = ['I', 'II', 'III', 'IV'];
/** Parts per year of each export period; matches PeriodExport::PERIODS on the server. */
const PERIOD_PARTS = { month: 12, quarter: 4, semester: 2, year: 1 };
const PERIOD_PART_LABEL = {
    month: 'Bulan',
    quarter: 'Triwulan',
    semester: 'Semester',
};
const KIND_LABEL = { member: 'Staf', unit_head: 'Kepala Unit' };
const EXPORT_STATUS = {
    final: ['Final', 'Disetujui Kepala Divisi; nilai berlaku.'],
    submitted: ['Diajukan', 'Usulan menunggu persetujuan; nilai belum berlaku.'],
    returned: [
        'Dikembalikan',
        'Dikembalikan untuk diperbaiki; nilai belum berlaku.',
    ],
    not_started: ['Belum diisi', 'Belum ada pengajuan pada bulan tersebut.'],
};
const CYCLE_STATUS = {
    planned: 'Direncanakan',
    open: 'Dibuka',
    closed: 'Ditutup',
};
const monthName = (key) =>
    `${MONTH_NAMES[+key.slice(5) - 1]} ${key.slice(0, 4)}`;
function periodParts(type) {
    const size = 12 / PERIOD_PARTS[type],
        span = (i) =>
            `${MONTH_NAMES[(i - 1) * size]}–${MONTH_NAMES[i * size - 1]}`;
    if (type === 'month')
        return MONTH_NAMES.map((name, i) => ({ id: i + 1, name }));
    if (type === 'quarter')
        return ROMAN.map((r, i) => ({
            id: i + 1,
            name: `Triwulan ${r} (${span(i + 1)})`,
        }));
    if (type === 'semester')
        return [1, 2].map((i) => ({
            id: i,
            name: `Semester ${i} (${span(i)})`,
        }));
    return [];
}
/** Same months and label as PeriodExport::period(). */
function describePeriod(type, year, index) {
    const size = 12 / PERIOD_PARTS[type],
        first = (index - 1) * size + 1,
        months = Array.from(
            { length: size },
            (_, i) => `${year}-${String(first + i).padStart(2, '0')}`,
        ),
        span =
            size === 1
                ? monthName(months[0])
                : `${MONTH_NAMES[first - 1]}–${MONTH_NAMES[first + size - 2]} ${year}`;
    const label = {
        month: span,
        quarter: `Triwulan ${ROMAN[index - 1]} ${year}`,
        semester: `Semester ${index} ${year}`,
        year: `Tahun ${year}`,
    }[type];
    return { months, span, label };
}
const fileSlug = (value) =>
    String(value)
        .normalize('NFKD')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'Cakupan';
function save(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type })),
        anchor = node('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
/** RFC 4180 CSV with BOM; text that a spreadsheet would run as a formula is prefixed with an apostrophe. */
function csvText(rows) {
    const cell = (v) => {
        if (v == null) return '';
        if (typeof v === 'number') return String(v);
        let value = String(v);
        if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
        return /[",\r\n]/.test(value)
            ? `"${value.replace(/"/g, '""')}"`
            : value;
    };
    return `\ufeff${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}
/**
 * Workbook of one period export: summary, monthly recap, per-person period averages (ranges over
 * one month) and KPI item rows when requested. `csv` holds the monthly recap as plain rows.
 */
function periodWorkbook(d, XL, actorName) {
    const ST = XL.ST,
        text = (v, s = ST.txt) => ({ v: v ?? '', s }),
        num = (v, s = ST.dec) => ({ v: v == null || v === '' ? null : +v, s }),
        head = (labels) => labels.map((v) => ({ v, s: ST.head })),
        statusName = (key) => EXPORT_STATUS[key][0],
        finalOnly = d.scope.status === 'final',
        statuses = finalOnly ? ['final'] : Object.keys(EXPORT_STATUS);
    const periodText =
        d.period.label === d.period.span
            ? d.period.label
            : `${d.period.label} (${d.period.span})`;
    const divisionText = d.scope.division?.name || 'Semua divisi',
        unitText =
            d.scope.unit?.name ||
            (d.scope.division ? 'Semua unit dalam divisi' : 'Semua unit'),
        kindText = KIND_LABEL[d.scope.kind] || 'Staf & Kepala Unit',
        scopeText = `${divisionText} · ${unitText} · ${kindText}`;
    const intro = (title) => [
        [{ v: title, s: ST.title }],
        [{ v: `${periodText} · ${scopeText}`, s: ST.muted }],
        [],
    ];

    const s = d.summary,
        monthTotals = (m, style) =>
            [
                ...statuses.map((k) => ({ v: m[k], s: style.count })),
                ...(finalOnly ? [] : [{ v: m.total, s: style.count }]),
                { v: m.average, s: style.average },
            ],
        summaryRows = [
            ...intro('Rekap Penilaian KPI'),
            [{ v: 'Periode', s: ST.lbl }, periodText],
            [
                { v: 'Bulan dicakup', s: ST.lbl },
                d.period.months.map(monthName).join(', '),
            ],
            [{ v: 'Divisi', s: ST.lbl }, divisionText],
            [{ v: 'Unit', s: ST.lbl }, unitText],
            [{ v: 'Jenis penilaian', s: ST.lbl }, kindText],
            [
                { v: 'Status diekspor', s: ST.lbl },
                finalOnly
                    ? 'Final saja (nilai disetujui)'
                    : 'Semua status: Final, Diajukan, Dikembalikan, Belum diisi',
            ],
            [
                { v: 'Dibuat', s: ST.lbl },
                `${d.generated_at} WIB${actorName ? ` · ${actorName}` : ''}`,
            ],
            [],
            head([
                'Bulan',
                'Status periode',
                ...statuses.map(statusName),
                ...(finalOnly ? [] : ['Jumlah']),
                'Rata-rata Final',
            ]),
            ...s.months.map((m) => [
                text(monthName(m.month)),
                text(CYCLE_STATUS[m.cycle_status] || 'Belum dibuat', ST.txtC),
                ...monthTotals(m, { count: ST.num, average: ST.dec }),
            ]),
            [
                { v: 'Total periode', s: ST.totL },
                { v: '', s: ST.totL },
                ...monthTotals(s, { count: ST.totT, average: ST.totV }),
            ],
            [],
            [{ v: 'Keterangan', s: ST.lbl }],
            ...statuses.map((k) => [
                text(statusName(k)),
                text(EXPORT_STATUS[k][1]),
            ]),
            ['Rata-rata hanya dihitung dari penilaian Final.'],
            [
                'Nama, jabatan, unit, divisi dan KPI memakai snapshot saat penilaian diajukan.',
            ],
            [
                'Pemutus Final memakai nama saat Final ditetapkan; data lama ditandai "catatan lama · nama saat ini".',
            ],
            ...(finalOnly
                ? []
                : [
                      [
                          'Baris Belum diisi hanya dibuat untuk periode yang sudah dibuka.',
                      ],
                  ]),
        ];

    const recapColumns = [
        ['Bulan', 16, (r) => monthName(r.month)],
        ['NIP', 18, (r) => r.nip],
        ['Nama', 30, (r) => r.name],
        ['Jenis', 13, (r) => KIND_LABEL[r.kind]],
        ['Jabatan', 24, (r) => r.position],
        ['Divisi', 24, (r) => r.division],
        ['Unit', 24, (r) => r.unit],
        [
            'Kelompok KPI',
            28,
            (r) => (r.template ? `${r.template} · versi ${r.template_version}` : ''),
        ],
        ['Status', 14, (r) => statusName(r.status)],
        ['Keterangan status', 34, (r) => EXPORT_STATUS[r.status][1]],
        ['Nilai total', 12, (r) => r.total, true],
        ['Kategori', 16, (r) => r.category],
        ['Diajukan (WIB)', 18, (r) => r.submitted_at],
        ['Final (WIB)', 18, (r) => r.finalized_at],
        ['Diputuskan oleh', 24, (r) => r.finalized_by],
        ['Temuan positif', 36, (r) => r.positive],
        ['Temuan negatif', 36, (r) => r.negative],
        ['Alasan pengembalian', 36, (r) => r.return_reason],
    ];
    const recapValues = d.rows.map((r) => recapColumns.map(([, , get]) => get(r)));
    const sheets = [
        { name: 'Ringkasan', cols: [26, 22, 14, 14, 14, 14, 14, 16], rows: summaryRows },
        {
            name: 'Rekap bulanan',
            cols: recapColumns.map(([, width]) => width),
            freeze: [3, 4],
            rows: [
                ...intro('Rekap bulanan per orang'),
                head(recapColumns.map(([label]) => label)),
                ...recapValues.map((values) =>
                    values.map((v, i) =>
                        recapColumns[i][3] ? num(v) : text(v),
                    ),
                ),
            ],
        },
    ];

    if (d.period.months.length > 1) {
        const people = new Map();
        // Rows are ordered by month, so the last row of a person carries the latest snapshot.
        for (const r of d.rows) {
            const p = people.get(r.subject) || { months: {} };
            people.set(r.subject, Object.assign(p, r, { months: p.months }));
            p.months[r.month] = r;
        }
        const kindOrder = (k) => (k === 'member' ? 1 : 0);
        const sorted = [...people.values()].sort(
            (x, y) =>
                x.division.localeCompare(y.division, 'id') ||
                x.unit.localeCompare(y.unit, 'id') ||
                kindOrder(x.kind) - kindOrder(y.kind) ||
                x.name.localeCompare(y.name, 'id'),
        );
        sheets.push({
            name: 'Rata-rata periode',
            cols: [18, 30, 13, 24, 24, ...d.period.months.map(() => 11), 11, 14, 11, 11, 18],
            freeze: [2, 4],
            rows: [
                ...intro('Rata-rata nilai Final per orang'),
                head([
                    'NIP',
                    'Nama',
                    'Jenis',
                    'Divisi',
                    'Unit',
                    ...d.period.months.map(monthName),
                    'Bulan Final',
                    'Rata-rata Final',
                    'Tertinggi',
                    'Terendah',
                    'Kategori terakhir',
                ]),
                ...sorted.map((p) => {
                    const finals = d.period.months
                        .map((m) => p.months[m])
                        .filter((r) => r?.status === 'final');
                    const totals = finals.map((r) => r.total);
                    return [
                        text(p.nip),
                        text(p.name),
                        text(KIND_LABEL[p.kind]),
                        text(p.division),
                        text(p.unit),
                        ...d.period.months.map((m) => {
                            const r = p.months[m];
                            if (!r) return text('', ST.txtC);
                            return r.status === 'final'
                                ? num(r.total)
                                : text(statusName(r.status), ST.stat);
                        }),
                        num(finals.length, ST.num),
                        num(
                            totals.length
                                ? totals.reduce((a, b) => a + b, 0) / totals.length
                                : null,
                        ),
                        num(totals.length ? Math.max(...totals) : null),
                        num(totals.length ? Math.min(...totals) : null),
                        text(finals.at(-1)?.category || ''),
                    ];
                }),
            ],
        });
    }

    if (d.definitions.length) {
        const order = new Map();
        d.rows.forEach((r, i) => r.assessment_id && order.set(r.assessment_id, i));
        const items = d.items
            .filter((item) => order.has(item[0]))
            .sort((x, y) => order.get(x[0]) - order.get(y[0]) || x[1] - y[1]);
        sheets.push({
            name: 'Rincian KPI',
            cols: [16, 18, 30, 13, 24, 14, 22, 50, 24, 10, 10, 12],
            freeze: [3, 4],
            rows: [
                ...intro('Rincian nilai per indikator KPI'),
                head([
                    'Bulan',
                    'NIP',
                    'Nama',
                    'Jenis',
                    'Unit',
                    'Status',
                    'Pilar',
                    'Indikator KPI',
                    'Target',
                    'Bobot (%)',
                    'Nilai',
                    'Hasil berbobot',
                ]),
                ...items.map(([id, , definition, score, weighted]) => {
                    const r = d.rows[order.get(id)],
                        [pillar, kpi, target, weight] = d.definitions[definition];
                    return [
                        text(monthName(r.month)),
                        text(r.nip),
                        text(r.name),
                        text(KIND_LABEL[r.kind]),
                        text(r.unit),
                        text(statusName(r.status)),
                        text(pillar),
                        text(kpi),
                        text(target),
                        num(weight),
                        num(score),
                        num(weighted),
                    ];
                }),
            ],
        });
    }

    const csv = [
        [
            'Periode laporan',
            'Cakupan',
            ...recapColumns.map(([label]) => label),
        ],
        ...recapValues.map((values) => [periodText, scopeText, ...values]),
    ];
    return { sheets, csv };
}
export function initFlowReports(c, s, a, link) {
    const year = s.cycleKey.slice(0, 4),
        months = Array.from(
            { length: 12 },
            (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
        );
    /** Navigation badges come from the server, so they are right on every page profile. */
    function navCounts() {
        const counts = s.data.navCounts || {};
        $$('[data-nav-count]').forEach((e) => {
            const value = counts[e.dataset.navCount] || 0;
            e.textContent = value || '';
            e.hidden = !value;
        });
    }
    /**
     * Team roster over the units already in the account scope. An empty unit
     * selection means every scoped unit; a stale selection falls back to all.
     */
    function team() {
        const root = $('[data-team-structure]');
        if (!root) return;
        const select = $('[data-team-unit]'),
            units = s.scopedUnits(),
            head = root.closest('table')?.tHead?.rows[0];
        optionList(
            select,
            units,
            c.role === 'kd' ? 'Semua unit dalam divisi' : 'Semua unit',
        );
        const chosen = select?.value ? s.unit(select.value) : null,
            unit = chosen || (units.length === 1 ? units[0] : null),
            shown = unit ? [unit] : units,
            order = new Map(shown.map((u, i) => [u.id, i])),
            showUnit = !!head?.querySelector('[data-team-unit-column]'),
            columns = head?.cells.length || 4,
            members = s
                .people('member')
                .filter((p) => order.has(p.unitId))
                .sort((a, b) => order.get(a.unitId) - order.get(b.unitId));
        root.replaceChildren();
        const summary = $('[data-team-summary]');
        summary.replaceChildren();
        if (unit)
            summary.append(
                node('h3', unit.name, 'section-title'),
                node(
                    'p',
                    `Kepala Unit: ${s.account(unit.headId)?.name || 'Belum ditetapkan'} · Divisi: ${s.division(unit.divisionId)?.name || '-'} · ${members.length} staf`,
                    'mt-0.5 text-xs text-muted',
                ),
            );
        else if (units.length) {
            const divisions = [
                ...new Set(
                    units.map((u) => s.division(u.divisionId)?.name || '-'),
                ),
            ];
            summary.append(
                node(
                    'h3',
                    c.role === 'kd' ? 'Semua unit dalam divisi' : 'Semua unit',
                    'section-title',
                ),
                node(
                    'p',
                    `${units.length} unit · ${members.length} staf · Divisi: ${divisions.join(', ')}`,
                    'mt-0.5 text-xs text-muted',
                ),
            );
        } else
            summary.append(
                node('h3', 'Belum ada unit dalam cakupan', 'section-title'),
            );
        for (const p of members) {
            const tr = node('tr'),
                name = node('td');
            tr.dataset.teamUnitId = p.unitId;
            name.append(
                node('strong', p.name, 'block font-semibold'),
                node('p', p.nip, 'mt-1 text-xs text-muted'),
            );
            const action = node('td', null, 'numeric'),
                a = node('a', 'Buka penilaian', 'link');
            a.href = link(c.role === 'ku' ? 'nilai' : 'persetujuan', {
                person: p.id,
            });
            action.append(a);
            const assessmentStatus = node('td'),
                assessmentBadge = node('span', '', '');
            status(assessmentBadge, s.assessment(p.id).status);
            assessmentStatus.append(assessmentBadge);
            tr.append(name);
            if (showUnit)
                tr.append(node('td', s.unit(p.unitId)?.name || p.unitName));
            tr.append(node('td', p.job), assessmentStatus, action);
            root.append(tr);
        }
        if (!members.length) {
            const tr = node('tr'),
                td = node(
                    'td',
                    !units.length
                        ? 'Belum ada unit dalam cakupan.'
                        : unit
                          ? 'Belum ada staf di unit ini.'
                          : 'Belum ada staf di unit dalam cakupan.',
                    'empty',
                );
            td.colSpan = columns;
            tr.append(td);
            root.append(tr);
        }
        paginate(root, 'team', { token: unit?.id || 'all' });
    }
    const notificationState = { page: 1, perPage: 10 };
    let notificationRequest;
    function notificationRow(n) {
        const row = node(
            'a',
            null,
            'flex items-center gap-3 px-4 py-3 text-ink no-underline transition-colors hover:bg-subtle',
        );
        row.href = link(
            c.role === 'ku'
                ? 'nilai'
                : c.role === 'kd' && n.kind === 'unit_head'
                  ? 'nilai-kepala'
                  : c.role === 'kd'
                    ? 'persetujuan'
                    : 'rekap',
            { person: n.person_id },
        );
        const state =
            {
                submitted: 'Diajukan',
                returned: 'Dikembalikan',
                not_started: 'Belum',
            }[n.status] || n.status;
        const copy = node('span', null, 'min-w-0 grow'),
            badge = node('span');
        copy.append(
            node('strong', n.name, 'block truncate text-sm font-semibold'),
            node(
                'span',
                n.kind === 'member' ? 'Staf' : 'Kepala Unit',
                'mt-0.5 block text-xs text-muted',
            ),
        );
        status(badge, state);
        row.append(node('span', initials(n.name), 'avatar'), copy, badge);
        return row;
    }
    /** The notification page reads one server page of tasks at a time. */
    async function notificationPage(root) {
        const cycle = s.cycle();
        notificationRequest?.abort();
        if (!cycle) {
            root.replaceChildren();
            return empty(root, 'Periode belum dibuat oleh Super HC.');
        }
        const controller = (notificationRequest = new AbortController());
        root.setAttribute('aria-busy', 'true');
        try {
            const result = await s.api.request(
                '/notifications?' +
                    new URLSearchParams({
                        cycle_id: cycle.dbId,
                        page: notificationState.page,
                        per_page: notificationState.perPage,
                    }),
                'GET',
                null,
                { signal: controller.signal },
            );
            if (!result.data.length) {
                root.replaceChildren();
                empty(root, 'Tidak ada tugas yang perlu ditindaklanjuti.');
            }
            paginate(root, 'notifications-page', {
                token: cycle.id,
                records: result.data,
                renderRow: notificationRow,
                server: {
                    total: result.total,
                    page: result.current_page,
                    perPage: result.per_page,
                    onChange(page, perPage) {
                        notificationState.page = page;
                        notificationState.perPage = perPage;
                        notificationPage(root);
                    },
                },
            });
        } catch (error) {
            if (error.name === 'AbortError') return;
            root.replaceChildren();
            empty(root, error.message);
        } finally {
            if (notificationRequest === controller)
                root.removeAttribute('aria-busy');
        }
    }
    function notifications() {
        const summary = s.data.notifications || {
            items: [],
            total: 0,
            unread: 0,
        };
        const menu = $('[data-notification-list]');
        if (menu) {
            // The popup shows the server preview; the notification page lists every task.
            menu.replaceChildren();
            if (!summary.items.length)
                empty(menu, 'Tidak ada tugas yang perlu ditindaklanjuti.');
            paginate(menu, 'notifications-menu', {
                size: 4,
                records: summary.items,
                renderRow: notificationRow,
            });
            let more = menu.nextElementSibling?.matches('[data-notification-more]')
                ? menu.nextElementSibling
                : null;
            if (summary.total > summary.items.length && c.links.notifikasi) {
                if (!more) {
                    more = node('a', null, 'link mt-4 inline-block text-sm');
                    more.dataset.notificationMore = '';
                    menu.after(more);
                }
                more.href = link('notifikasi');
                more.textContent = `Lihat semua ${summary.total} tugas`;
            } else more?.remove();
        }
        const page = $('[data-notification-page]');
        if (page) notificationPage(page);
        $$('[data-notification-count]').forEach((e) => {
            e.textContent = summary.unread;
            e.hidden = !summary.unread;
            e.closest('button')?.setAttribute(
                'aria-label',
                e.hidden
                    ? 'Buka notifikasi'
                    : `Buka notifikasi, ${summary.unread} belum dibaca`,
            );
        });
    }
    /** Kepala Unit keeps the single-month export of the loaded workspace. */
    function exportSummary() {
        if (periodExport) return [];
        const filtered = $('[data-flow-export-scope]')?.value === 'filtered',
            rows = filtered
                ? a.filtered(s.cycleKey, !!$('.analytics-v4'))
                : s.people();
        text(
            document,
            '[data-export-summary]',
            `${rows.length} orang · ${labelCycle(s.cycleKey)} · ${filtered ? 'mengikuti filter layar' : 'seluruh cakupan akun'}`,
        );
        return rows;
    }
    async function download() {
        const { XL } = await import('./xlsx');
        const rows = exportSummary();
        const summary = {
            name: 'Rekap',
            cols: [30, 18, 28, 30, 20, 18, 16, 18, 35, 35],
            rows: [
                ['KPI Kinerja'],
                [
                    'Nama',
                    'Jenis',
                    'Unit',
                    'Divisi',
                    'Bulan',
                    'Status',
                    'Total',
                    'Kategori',
                    'Temuan positif',
                    'Temuan negatif',
                ],
                ...rows.map((p) => [
                    p.name,
                    p.type === 'member' ? 'Staf' : 'Kepala Unit',
                    p.unitName,
                    p.divisionName,
                    labelCycle(s.cycleKey),
                    s.assessment(p.id).status,
                    s.total(p.id),
                    s.category(p.id).label,
                    s.assessment(p.id).positive,
                    s.assessment(p.id).negative,
                ]),
            ],
        };
        const sheets = [
            summary,
            ...rows.map((p) => ({
                name: p.name,
                cols: [38, 20, 12, 12, 16],
                rows: [
                    [p.name, p.unitName, 'Snapshot KPI'],
                    ['KPI', 'Target', 'Bobot', 'Nilai', 'Hasil'],
                    ...(s.template(p)?.items || []).map((r, i) => [
                        r.name,
                        r.target,
                        r.weight,
                        s.assessment(p.id).values[i] == null
                            ? null
                            : +s.assessment(p.id).values[i],
                        s.assessment(p.id).values[i] == null
                            ? null
                            : (+s.assessment(p.id).values[i] * r.weight) / 100,
                    ]),
                ],
            })),
        ];
        const bytes = XL.build(sheets),
            url = URL.createObjectURL(
                new Blob([bytes], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                }),
            ),
            anchor = node('a');
        anchor.href = url;
        anchor.download = `KPI_${s.cycleKey}_${rows.length}_data.xlsx`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        toast(`${rows.length} orang diekspor sesuai cakupan.`);
    }
    /**
     * Super HC and Kepala Divisi export a month, quarter, semester or year. The server returns every
     * cycle of the range in the account scope; the dialog only chooses the period and the organization.
     */
    const field = (name) => $(`[data-export-${name}]`);
    const periodExport =
        (c.role === 'hc' || c.role === 'kd') && !!field('period');
    let anchorMonth = +s.cycleKey.slice(5);
    function selectedPeriod() {
        const type = field('period').value,
            year = +field('year').value,
            index = type === 'year' ? 1 : +field('index').value;
        return { type, year, index, ...describePeriod(type, year, index) };
    }
    function fillIndex() {
        const type = field('period').value,
            select = field('index'),
            rows = periodParts(type);
        field('index-wrap').hidden = !rows.length;
        field('index-label').textContent = PERIOD_PART_LABEL[type] || '';
        select.replaceChildren(...rows.map((r) => new Option(r.name, r.id)));
        if (rows.length)
            select.value = String(
                Math.ceil(anchorMonth / (12 / PERIOD_PARTS[type])),
            );
    }
    function fillUnits() {
        const division = field('division')?.value || '';
        const units = s.data.units
            .filter((u) => !division || u.divisionId === division)
            .map((u) => ({
                id: u.id,
                name: u.active ? u.name : `${u.name} (nonaktif)`,
            }))
            .sort((x, y) => x.name.localeCompare(y.name, 'id'));
        optionList(
            field('unit'),
            units,
            c.role === 'kd' || division ? 'Semua unit dalam divisi' : 'Semua unit',
        );
    }
    function exportDivisionName() {
        if (c.role === 'kd') return s.data.divisions[0]?.name || 'Divisi Anda';
        const select = field('division');
        return select.value
            ? select.selectedOptions[0].textContent
            : 'Semua divisi';
    }
    /** Dialog defaults follow the month and filters on screen; every field stays editable. */
    function prefillExport() {
        const year = s.cycleKey.slice(0, 4),
            years = [
                ...new Set([
                    year,
                    ...s.data.cycles.map((cycle) => cycle.id.slice(0, 4)),
                ]),
            ].sort((x, y) => y - x);
        anchorMonth = +s.cycleKey.slice(5);
        field('year').replaceChildren(...years.map((y) => new Option(y, y)));
        field('year').value = year;
        fillIndex();
        const division = field('division');
        if (division) {
            optionList(
                division,
                [...s.data.divisions]
                    .map((d) => ({
                        id: d.id,
                        name: d.active ? d.name : `${d.name} (nonaktif)`,
                    }))
                    .sort((x, y) => x.name.localeCompare(y.name, 'id')),
                'Semua divisi',
            );
            division.value = $('[data-filter="division"]')?.value || '';
        }
        fillUnits();
        const unit = $('[data-filter="unit"]')?.value || '';
        field('unit').value = [...field('unit').options].some(
            (o) => o.value === unit,
        )
            ? unit
            : '';
        field('kind').value = $('[data-filter="type"]')?.value || '';
        describeExport();
    }
    function describeExport() {
        const p = selectedPeriod(),
            csv = field('format').value === 'csv',
            unit = field('unit'),
            opened = p.months.filter((m) => s.cycle(m)).length;
        field('items').disabled = csv;
        const parts = [
            p.label === p.span ? p.label : `${p.label} (${p.span})`,
            exportDivisionName(),
            unit.value
                ? unit.selectedOptions[0].textContent
                : unit.options[0].textContent,
            KIND_LABEL[field('kind').value] || 'Staf & Kepala Unit',
            field('status').value === 'final'
                ? 'Final saja'
                : 'Semua status',
        ];
        const notes = [
            !opened
                ? 'Belum ada periode penilaian pada rentang ini.'
                : opened < p.months.length
                  ? `${opened} dari ${p.months.length} bulan sudah memiliki periode penilaian.`
                  : `${p.months.length} bulan dengan periode penilaian.`,
        ];
        if (csv)
            notes.push(
                'CSV berisi rekap bulanan; rincian KPI tersedia di format Excel.',
            );
        text(
            document,
            '[data-export-summary]',
            `${parts.join(' · ')}. ${notes.join(' ')}`,
        );
        const button = $('#export-dialog [data-flow-action="download-export"]');
        if (button) button.disabled = !opened;
    }
    async function downloadPeriod() {
        const p = selectedPeriod(),
            format = field('format').value,
            query = new URLSearchParams({
                period: p.type,
                year: p.year,
                status: field('status').value,
                include_items:
                    format === 'xlsx' && field('items').checked ? '1' : '0',
            });
        if (p.type !== 'year') query.set('index', p.index);
        for (const [key, name] of [
            ['division_id', 'division'],
            ['unit_id', 'unit'],
            ['kind', 'kind'],
        ])
            if (field(name)?.value) query.set(key, field(name).value);
        const { data } = await s.api.request('/data/report-export?' + query);
        const { XL } = await import('./xlsx');
        const book = periodWorkbook(data, XL, c.actor?.nama || ''),
            name = `Rekap-KPI_${data.period.key}_${fileSlug(data.scope.unit?.name || data.scope.division?.name || 'Semua-divisi')}`;
        if (format === 'csv')
            save(
                csvText(book.csv),
                `${name}.csv`,
                'text/csv;charset=utf-8',
            );
        else
            save(
                XL.build(book.sheets, {
                    title: `Rekap Penilaian KPI ${data.period.label}`,
                }),
                `${name}.xlsx`,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );
        toast(
            data.rows.length
                ? `${data.rows.length} baris penilaian ${data.period.label} diekspor.`
                : `Tidak ada penilaian pada ${data.period.label} untuk cakupan ini; berkas dibuat tanpa baris penilaian.`,
        );
    }
    function render() {
        navCounts();
        team();
        notifications();
        exportSummary();
    }
    document.addEventListener('flow-updated', render);
    document.addEventListener('flow-filtered', exportSummary);
    $('[data-flow-export-scope]')?.addEventListener('change', exportSummary);
    if (periodExport) {
        field('period').addEventListener('change', () => {
            fillIndex();
            describeExport();
        });
        field('index').addEventListener('change', () => {
            const type = field('period').value;
            anchorMonth =
                (+field('index').value - 1) * (12 / PERIOD_PARTS[type]) + 1;
            describeExport();
        });
        field('division')?.addEventListener('change', () => {
            fillUnits();
            describeExport();
        });
        for (const name of ['year', 'unit', 'kind', 'status', 'format'])
            field(name).addEventListener('change', describeExport);
    }
    $('[data-team-unit]')?.addEventListener('change', team);
    document.addEventListener('click', async (e) => {
        if (periodExport && e.target.closest('[data-dialog-open="export-dialog"]'))
            prefillExport();
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'download-export') {
            if (periodExport) return s.api.perform(null, downloadPeriod);
            return s.api.perform(null, async () => {
                await s.refresh();
                // Exports cover the selected month in full, whatever the page window holds.
                await s.ensureMonths([s.cycleKey]);
                await download();
            });
        }
        if (action === 'read-notifications') {
            return s.api.perform(null, async () => {
                await s.api.request('/notifications/read', 'POST', {
                    cycle_id: s.cycle().dbId,
                });
                await s.refresh();
                toast('Notifikasi ditandai dibaca.');
            });
        }
    });
    const templateFilter = $('[data-filter="template"]');
    if (templateFilter) {
        // Template groups come from the months this page holds (the report year, Final results).
        const loaded = months.filter((m) => s.loaded(m, true));
        const templates = [
            ...new Map(
                s
                    .people()
                    .flatMap((p) => loaded.map((m) => s.template(p, m)))
                    .filter(Boolean)
                    .map((k) => [k.id, k]),
            ).values(),
        ].map((k) => ({ id: k.id, name: `${k.name} · versi ${k.version}` }));
        optionList(templateFilter, templates, 'Semua kelompok KPI');
    }
    render();
}
