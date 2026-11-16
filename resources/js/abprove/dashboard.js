import {
    Chart,
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    DoughnutController,
    ArcElement,
} from 'chart.js';
import { $, $$, node, labelCycle, dateTime, status as badge } from './flow-dom';
import { activityLabel, activitySubject } from './activity-labels';
import { paginate } from './pagination';

Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    DoughnutController,
    ArcElement,
);

const STATUSES = {
    final: { label: 'Final', badge: 'Final' },
    submitted: { label: 'Diajukan', badge: 'Diajukan' },
    returned: { label: 'Dikembalikan', badge: 'Dikembalikan' },
    not_started: { label: 'Belum diisi', badge: 'Belum' },
};
const ROLES = {
    ku: {
        status: (key) => [
            ['final', 'submitted'].includes(key) ? 'pengajuan' : 'nilai',
            { status: STATUSES[key].badge },
        ],
        deadline: 'submission',
        tasksEmpty: 'Semua staf sudah diajukan atau Final.',
        report: (link, extra = {}) => link('riwayat', extra),
    },
    kd: {
        status: (key) => ['persetujuan', { status: STATUSES[key].badge }],
        deadline: 'approval',
        tasksEmpty:
            'Tidak ada pengajuan menunggu dan seluruh Kepala Unit sudah dinilai.',
        report: (link, extra = {}) =>
            link('dashboard', { detail: 'laporan', ...extra }),
    },
    hc: {
        status: (key) => ['rekap', { status: STATUSES[key].badge }],
        deadline: 'closes',
        tasksEmpty: 'Seluruh divisi sudah tuntas pada periode ini.',
        report: (link, extra = {}) =>
            link('dashboard', { detail: 'laporan', ...extra }),
    },
};
const CYCLE_STATUS = {
    open: 'Terbuka',
    closed: 'Ditutup',
    planned: 'Direncanakan',
};

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmt = (value) => (value == null ? '–' : formatter.format(value));
const pct = (value) => (value == null ? '–' : `${fmt(value)}%`);
const share = (part, total) => (total ? (part * 100) / total : 0);
const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const shortMonth = (key, withYear = false) =>
    new Date(`${key}-01T12:00:00+07:00`).toLocaleDateString('id-ID', {
        month: 'short',
        ...(withYear ? { year: '2-digit' } : {}),
        timeZone: 'Asia/Jakarta',
    });

function cell(content, label, cls = '') {
    const td = node('td', content, cls);
    td.dataset.label = label;
    return td;
}
function table(headings, rows) {
    const t = node('table', null, 'data-table'),
        head = node('thead'),
        tr = node('tr'),
        body = node('tbody');
    headings.forEach((heading) => tr.append(node('th', heading)));
    head.append(tr);
    for (const values of rows) {
        const row = node('tr');
        values.forEach((value, i) =>
            row.append(
                cell(value, headings[i], i ? 'numeric' : ''),
            ),
        );
        body.append(row);
    }
    if (!rows.length) {
        const row = node('tr'),
            td = node('td', 'Belum ada data pada periode ini.', 'empty');
        td.colSpan = headings.length;
        row.append(td);
        body.append(row);
    }
    t.append(head, body);
    return t;
}
function emptyItem(list, message) {
    list.replaceChildren(node('li', message, 'dashboard-empty'));
}

function chartOptions() {
    const muted = css('--color-muted'),
        ink = css('--color-ink'),
        family = getComputedStyle(document.body).fontFamily,
        font = { family, size: 11 };
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        resizeDelay: 80,
        layout: { padding: { top: 4 } },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: css('--color-paper'),
                borderColor: css('--color-line'),
                borderWidth: 1,
                titleColor: ink,
                bodyColor: ink,
                titleFont: { family, size: 12, weight: '600' },
                bodyFont: { family, size: 12 },
                titleMarginBottom: 6,
                cornerRadius: 8,
                caretSize: 5,
                padding: 10,
                boxPadding: 6,
                boxWidth: 8,
                boxHeight: 8,
                usePointStyle: true,
            },
        },
        scales: {
            x: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                    color: muted,
                    font,
                    padding: 6,
                    maxRotation: 0,
                    autoSkip: true,
                },
            },
            y: {
                min: 0,
                max: 100,
                border: { display: false, dash: [3, 4] },
                grid: { color: css('--color-line'), drawTicks: false },
                ticks: { color: muted, font, padding: 10, stepSize: 25 },
            },
        },
    };
}
function draw(host, config, label) {
    host.chart?.destroy();
    const canvas = node('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    canvas.textContent = 'Pilih Data grafik untuk membaca nilai dalam tabel.';
    host.replaceChildren(canvas);
    host.dataset.empty = 'false';
    host.chart = new Chart(canvas, config);
}
/** Replaces a chart with a compact message; `data-empty` lets the layout drop the chart height. */
function emptyChart(host, message) {
    host.chart?.destroy();
    host.chart = null;
    host.dataset.empty = 'true';
    host.replaceChildren(node('p', message, 'dashboard-empty'));
}
function pointer(event, elements) {
    event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
}

function delta(current, previous, unit, month) {
    if (current == null || previous == null)
        return { text: 'Belum ada pembanding', trend: 'none' };
    const diff = Math.round((current - previous) * 10) / 10;
    return {
        text: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${fmt(Math.abs(diff))} ${unit} vs ${shortMonth(month)}`,
        trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
}
function cards(state) {
    const { c, d, link } = state,
        m = d.metrics,
        prev = m.previous,
        role = ROLES[c.role];
    const open = m.not_started + m.returned;
    const items = [
        {
            label: 'Rerata nilai Final',
            value: fmt(m.average),
            unit: m.average == null ? '' : '/100',
            delta: delta(m.average, prev?.average, 'poin', prev?.month),
            hint: `${m.final} hasil Final`,
            tone: 'neutral',
            href: role.report(link),
        },
        {
            label: 'Ketuntasan',
            value: pct(m.completion),
            delta: delta(m.completion, prev?.completion, 'pp', prev?.month),
            hint: `${m.final} dari ${m.total} sudah Final`,
            tone: m.total && m.final === m.total ? 'good' : 'neutral',
            href: '#dashboard-completion',
        },
    ];
    if (c.role === 'ku')
        items.push(
            {
                label: 'Perlu diisi',
                value: fmt(open),
                hint: `${m.not_started} belum diisi · ${m.returned} dikembalikan`,
                tone: open ? 'warn' : 'good',
                href: link('nilai'),
            },
            {
                label: 'Menunggu Kepala Divisi',
                value: fmt(m.submitted),
                hint: 'Sudah diajukan, menunggu persetujuan',
                tone: 'info',
                href: link('pengajuan', { status: 'Diajukan' }),
            },
        );
    else if (c.role === 'kd') {
        const heads = m.kinds.unit_head;
        items.push(
            {
                label: 'Menunggu persetujuan Anda',
                value: fmt(m.kinds.member.submitted),
                hint: 'Pengajuan staf dari Kepala Unit',
                tone: m.kinds.member.submitted ? 'warn' : 'good',
                href: link('persetujuan', { status: 'Diajukan' }),
            },
            {
                label: 'Kepala Unit belum dinilai',
                value: fmt(heads.not_started),
                hint: `dari ${heads.total} Kepala Unit`,
                tone: heads.not_started ? 'warn' : 'good',
                href: link('nilai-kepala'),
            },
        );
    } else
        items.push(
            {
                label: 'Menunggu persetujuan KD',
                value: fmt(m.submitted),
                hint: 'Diajukan Kepala Unit',
                tone: 'info',
                href: link('rekap', { status: 'Diajukan' }),
            },
            {
                label: 'Belum diisi / dikembalikan',
                value: fmt(open),
                hint: `${m.not_started} belum diisi · ${m.returned} dikembalikan`,
                tone: open ? 'warn' : 'good',
                href: link('rekap', { status: 'all' }),
            },
        );
    const root = $('[data-dashboard-cards]');
    root.replaceChildren(
        ...items.map((item) => {
            const a = node('a', null, 'dashboard-card'),
                value = node('strong', item.value, 'dashboard-card-value');
            a.href = item.href;
            a.dataset.tone = item.tone;
            if (item.unit)
                value.append(node('small', item.unit, 'dashboard-card-unit'));
            a.append(node('span', item.label, 'dashboard-card-label'), value);
            if (item.delta) {
                const change = node('span', item.delta.text, 'dashboard-delta');
                change.dataset.trend = item.delta.trend;
                a.append(change);
            }
            a.append(node('span', item.hint, 'dashboard-card-hint'));
            return a;
        }),
    );
}

function completion(state) {
    const { c, d, link } = state,
        m = d.metrics;
    $('[data-dashboard-completion-figure]').textContent = m.total
        ? `${pct(m.completion)} Final`
        : '–';
    $('[data-dashboard-completion-caption]').textContent = m.total
        ? `${m.final} dari ${m.total} subjek sudah Final. Subjek yang belum dinilai ikut dihitung.`
        : 'Belum ada subjek dalam cakupan pada periode ini.';
    const stack = $('[data-dashboard-stack]'),
        legend = $('[data-dashboard-stack-legend]');
    stack.replaceChildren();
    legend.replaceChildren();
    const order = ['final', 'submitted', 'returned', 'not_started'];
    for (const key of order) {
        if (m[key]) {
            const segment = node('span', null, 'dashboard-stack-segment');
            segment.dataset.status = key;
            segment.style.flexGrow = m[key];
            stack.append(segment);
        }
        const [page, params] = ROLES[c.role].status(key),
            li = node('li'),
            a = node('a', null, 'dashboard-stack-item'),
            swatch = node('i');
        swatch.dataset.status = key;
        a.href = link(page, params);
        a.append(
            swatch,
            node('span', STATUSES[key].label),
            node('strong', fmt(m[key])),
            node('small', pct(share(m[key], m.total))),
        );
        li.append(a);
        legend.append(li);
    }
    stack.dataset.empty = String(!m.total);
    stack.setAttribute(
        'aria-label',
        m.total
            ? order
                  .map((key) => `${STATUSES[key].label} ${m[key]}`)
                  .join(', ') + ` dari ${m.total} subjek`
            : 'Belum ada subjek',
    );
}

function trend(state) {
    const { d, link } = state,
        rows = d.trend,
        host = $('[data-dashboard-chart="trend"]'),
        config = chartOptions();
    config.interaction = { mode: 'index', intersect: false };
    config.onHover = pointer;
    config.onClick = (_, elements) => {
        const row = rows[elements[0]?.index];
        if (row?.scheduled && row.month !== d.month)
            location.assign(link('dashboard', { cycle: row.month }));
    };
    config.plugins.tooltip.callbacks = {
        title: (items) => labelCycle(rows[items[0].dataIndex].month),
        label: (item) => `Rerata Final: ${fmt(item.raw)} / 100`,
        afterLabel: (item) => {
            const row = rows[item.dataIndex];
            return `${row.final} hasil Final dari ${row.total} subjek`;
        },
    };
    const current = rows.length - 1,
        latest = rows[current],
        primary = css('--dashboard-primary');
    if (!rows.some((row) => row.average != null))
        emptyChart(
            host,
            'Belum ada hasil Final dalam 12 bulan terakhir. Rincian per bulan tersedia di Data grafik.',
        );
    else draw(
        host,
        {
            type: 'line',
            data: {
                labels: rows.map((row, i) =>
                    shortMonth(row.month, i === 0 || row.month.endsWith('-01')),
                ),
                datasets: [
                    {
                        label: 'Rerata nilai Final',
                        data: rows.map((row) => row.average),
                        borderColor: primary,
                        backgroundColor: primary,
                        borderWidth: 2,
                        tension: 0.3,
                        spanGaps: false,
                        pointRadius: rows.map((_, i) => (i === current ? 4.5 : 3)),
                        pointHoverRadius: 5.5,
                        pointHitRadius: 14,
                        pointBackgroundColor: rows.map((_, i) =>
                            i === current ? primary : css('--color-paper'),
                        ),
                        pointHoverBackgroundColor: primary,
                        pointBorderWidth: 2,
                    },
                ],
            },
            options: config,
        },
        `Grafik garis rerata nilai Final 12 bulan. ${labelCycle(d.month)}: ${
            latest.average == null
                ? 'belum ada hasil Final'
                : `${fmt(latest.average)} dari ${latest.final} hasil Final`
        }. Bulan tanpa hasil Final tidak digambar.`,
    );
    const view = $('[data-dashboard-table="trend"]');
    view.replaceChildren(
        table(
            ['Bulan', 'Rerata Final', 'Final', 'Subjek', 'Ketuntasan'],
            rows.map((row) => [
                labelCycle(row.month),
                fmt(row.average),
                row.scheduled ? row.final : '–',
                row.scheduled ? row.total : '–',
                row.scheduled ? pct(row.completion) : 'Tidak ada periode',
            ]),
        ),
    );
}

const CATEGORY_COLORS = 5;
function categories(state) {
    const rows = state.d.categories,
        total = rows.reduce((sum, row) => sum + row.total, 0),
        colors = rows.map((_, i) =>
            css(`--dashboard-category-${Math.min(i, CATEGORY_COLORS - 1) + 1}`),
        ),
        host = $('[data-dashboard-chart="categories"]'),
        legend = $('[data-dashboard-category-legend]'),
        center = $('[data-dashboard-donut-center]');
    const config = chartOptions();
    delete config.scales;
    config.cutout = '74%';
    config.layout = { padding: 4 };
    config.plugins.tooltip.callbacks = {
        label: (item) =>
            `${item.label}: ${item.raw} (${pct(share(item.raw, total))})`,
    };
    center.replaceChildren(
        node('strong', fmt(total)),
        node('span', 'hasil Final'),
    );
    legend.replaceChildren();
    if (!total) {
        emptyChart(host, 'Belum ada hasil Final.');
        center.replaceChildren();
    } else
        draw(
            host,
            {
                type: 'doughnut',
                data: {
                    labels: rows.map((row) => row.label),
                    datasets: [
                        {
                            data: rows.map((row) => row.total),
                            backgroundColor: colors,
                            borderColor: css('--color-paper'),
                            borderWidth: 3,
                            hoverOffset: 3,
                        },
                    ],
                },
                options: config,
            },
            `Diagram donat sebaran kategori: ${rows.map((row) => `${row.label} ${row.total}`).join(', ')}`,
        );
    rows.forEach((row, i) => {
        const li = node('li', null, 'dashboard-category-item'),
            swatch = node('i');
        swatch.style.background = colors[i];
        li.append(
            swatch,
            node('span', row.label),
            node('strong', fmt(row.total)),
            node('small', `${pct(share(row.total, total))} · rerata ${fmt(row.average)}`),
        );
        legend.append(li);
    });
    $('[data-dashboard-table="categories"]').replaceChildren(
        table(
            ['Kategori', 'Jumlah', 'Persentase', 'Rerata nilai'],
            rows.map((row) => [
                row.label,
                row.total,
                pct(share(row.total, total)),
                fmt(row.average),
            ]),
        ),
    );
}

const PERFORMANCE_LIMIT = 6;
const PERFORMANCE = {
    division: { title: 'Rerata nilai Final per divisi', area: 'Divisi' },
    unit: { title: 'Rerata nilai Final per unit', area: 'Unit' },
    indicator: { title: 'KPI dengan rerata nilai terendah', area: 'KPI' },
};
const clip = (text, max = 22) =>
    text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
/** Bar host grows with plotted rows (capped) and collapses to its message when empty; never keeps a stale size. */
function fitPerformance(host, rows) {
    host.style.height = rows ? `${Math.min(176, 70 + 26 * rows)}px` : 'auto';
}
/** Writes each bar's score at its end so values read without hovering. */
const barValues = {
    id: 'dashboardBarValues',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart,
            values = chart.data.datasets[0].data;
        ctx.save();
        ctx.font = `600 11px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = 'middle';
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
            const text = fmt(values[i]),
                inside = bar.x + ctx.measureText(text).width + 10 > chartArea.right;
            ctx.fillStyle = css(inside ? '--color-paper' : '--color-ink');
            ctx.textAlign = inside ? 'right' : 'left';
            ctx.fillText(text, bar.x + (inside ? -6 : 6), bar.y);
        });
        ctx.restore();
    },
};
function performance(state) {
    const { d } = state,
        { level, rows } = d.performance,
        meta = PERFORMANCE[level],
        area = level !== 'indicator',
        host = $('[data-dashboard-chart="performance"]'),
        scored = rows.filter((row) => row.average != null),
        shown = scored.slice(0, PERFORMANCE_LIMIT),
        subjects = new Map(d.progress.rows.map((row) => [row.id, row.total])),
        kpis = new Map(d.indicators.lowest.map((row) => [row.name, row])),
        noun = meta.area.toLowerCase();
    $('[data-dashboard-performance-title]').textContent = meta.title;
    const coverage = area
        ? `${scored.length} dari ${rows.length} ${noun} memiliki hasil Final (${d.metrics.final} dari ${d.metrics.total} subjek).`
        : `Rerata nilai indikator dari ${d.metrics.final} hasil Final staf.`;
    const notes = [
        coverage,
        area && scored.length < rows.length
            ? `${rows.length - scored.length} ${noun} tanpa hasil Final tidak digambar.`
            : '',
        shown.length < scored.length
            ? `Menampilkan ${shown.length} terendah dari ${scored.length}; daftar lengkap di Data grafik.`
            : '',
    ];
    $('[data-dashboard-performance-caption]').textContent = notes
        .filter(Boolean)
        .join(' ');
    if (!shown.length) {
        fitPerformance(host, 0);
        emptyChart(
            host,
            area
                ? `Belum ada ${noun} dengan hasil Final pada periode ini.`
                : 'Belum ada nilai indikator dari hasil Final.',
        );
    } else {
        fitPerformance(host, shown.length);
        const config = chartOptions(),
            { x, y } = config.scales;
        config.indexAxis = 'y';
        config.interaction = { mode: 'nearest', axis: 'y', intersect: false };
        config.layout = { padding: { top: 0, right: 4 } };
        config.scales = {
            x: { ...y, ticks: { ...y.ticks, padding: 6 } },
            y: {
                ...x,
                ticks: {
                    ...x.ticks,
                    autoSkip: false,
                    callback: (_, i) => clip(shown[i].name),
                },
            },
        };
        config.plugins.tooltip.callbacks = {
            title: (items) => shown[items[0].dataIndex].name,
            label: (item) => `Rerata Final: ${fmt(item.raw)} / 100`,
            afterLabel: (item) => {
                const row = shown[item.dataIndex];
                if (!area) {
                    const kpi = kpis.get(row.name);
                    return `${row.total} nilai${kpi ? ` · ${kpi.units} unit · ${kpi.pillar}` : ''}`;
                }
                const total = subjects.get(row.id);
                return total
                    ? `${row.total} hasil Final dari ${total} subjek (${pct(share(row.total, total))})`
                    : `${row.total} hasil Final`;
            },
        };
        draw(
            host,
            {
                type: 'bar',
                data: {
                    labels: shown.map((row) => row.name),
                    datasets: [
                        {
                            label: meta.title,
                            data: shown.map((row) => row.average),
                            backgroundColor: css('--dashboard-primary'),
                            borderRadius: 4,
                            barPercentage: 0.75,
                            categoryPercentage: 0.85,
                            maxBarThickness: 18,
                        },
                    ],
                },
                options: config,
                plugins: [barValues],
            },
            `Grafik batang ${meta.title.toLowerCase()}, skala 0–100: ${shown
                .map((row) => `${row.name} ${fmt(row.average)} (${row.total} ${area ? 'hasil Final' : 'nilai'})`)
                .join(', ')}`,
        );
    }
    $('[data-dashboard-table="performance"]').replaceChildren(
        table(
            area
                ? [meta.area, 'Rerata Final', 'Hasil Final', 'Subjek', 'Cakupan']
                : ['KPI', 'Pilar', 'Rerata nilai', 'Jumlah nilai', 'Unit'],
            rows.map((row) => {
                if (!area) {
                    const kpi = kpis.get(row.name);
                    return [row.name, kpi?.pillar ?? '–', fmt(row.average), row.total, kpi ? kpi.units : '–'];
                }
                const total = subjects.get(row.id) ?? 0;
                return [
                    row.name,
                    row.average == null ? 'Belum ada Final' : fmt(row.average),
                    row.total,
                    total,
                    total ? pct(share(row.total, total)) : '–',
                ];
            }),
        ),
    );
}

function indicators(state) {
    const { d } = state;
    for (const [key, rows] of Object.entries(d.indicators)) {
        const list = $(`[data-dashboard-indicators="${key}"]`);
        if (!rows.length) {
            emptyItem(list, 'Belum ada nilai indikator dari hasil Final.');
            continue;
        }
        list.replaceChildren(
            ...rows.map((row) => {
                const li = node('li', null, 'dashboard-indicator'),
                    text = node('div', null, 'dashboard-indicator-text'),
                    track = node('div', null, 'dashboard-indicator-track'),
                    bar = node('span');
                li.dataset.tone = key === 'lowest' ? 'low' : 'high';
                bar.style.width = `${Math.max(0, Math.min(100, row.average))}%`;
                track.append(bar);
                track.setAttribute('aria-hidden', 'true');
                text.append(
                    node('strong', row.name),
                    node(
                        'small',
                        `${row.pillar} · ${row.total} nilai · ${row.units} unit`,
                    ),
                );
                li.append(text, track, node('b', fmt(row.average)));
                return li;
            }),
        );
    }
    $('[data-dashboard-indicators-all]').href = ROLES[state.c.role].report(
        state.link,
        { panel: 'kpi' },
    );
}

function countdown(ms) {
    const minutes = Math.floor(ms / 60000),
        days = Math.floor(minutes / 1440),
        hours = Math.floor((minutes % 1440) / 60);
    if (days) return `${days} hari ${hours} jam lagi`;
    if (hours) return `${hours} jam ${minutes % 60} menit lagi`;
    return `${Math.max(1, minutes)} menit lagi`;
}
function agenda(state) {
    const { c, d } = state,
        cycle = d.cycle,
        now = Date.now(),
        host = $('[data-dashboard-deadline]'),
        list = $('[data-dashboard-schedule]');
    $('[data-dashboard-cycle-status]').textContent =
        CYCLE_STATUS[cycle.status] || cycle.status;
    $('[data-dashboard-cycle-status]').dataset.status = cycle.status;
    const next = cycle.schedule.find((step) => Date.parse(step.at) > now);
    host.replaceChildren();
    if (next) {
        const left = Date.parse(next.at) - now,
            when = node('span', countdown(left), 'dashboard-countdown');
        when.dataset.tone =
            left < 86400000 ? 'danger' : left < 3 * 86400000 ? 'warn' : 'calm';
        host.append(
            node('strong', next.label),
            node('span', `${dateTime(next.at)} WIB`, 'dashboard-deadline-time'),
            when,
        );
    } else
        host.append(
            node('strong', 'Seluruh jadwal periode ini telah lewat'),
            node(
                'span',
                cycle.status === 'closed'
                    ? 'Periode sudah ditutup.'
                    : 'Periode menunggu ditutup oleh Super HC.',
                'dashboard-deadline-time',
            ),
        );
    list.replaceChildren(
        ...cycle.schedule.map((step) => {
            const li = node('li'),
                at = Date.parse(step.at);
            li.dataset.state =
                step === next ? 'next' : at <= now ? 'past' : 'upcoming';
            if (step.key === ROLES[c.role].deadline) li.dataset.relevant = 'true';
            li.append(
                node('span', step.label),
                node('time', `${dateTime(step.at)} WIB`),
            );
            li.lastChild.dateTime = step.at;
            return li;
        }),
    );
}

function tasks(state) {
    const { c, d, link } = state,
        list = $('[data-dashboard-tasks]');
    $('[data-dashboard-task-count]').textContent = d.tasks.total
        ? `(${d.tasks.total})`
        : '';
    if (!d.tasks.rows.length) {
        emptyItem(list, ROLES[c.role].tasksEmpty);
        return;
    }
    list.replaceChildren(
        ...d.tasks.rows.map((row) => {
            const li = node('li'),
                a = node('a', null, 'dashboard-task'),
                body = node('span', null, 'dashboard-task-body');
            a.href = link(row.page, row.params);
            body.append(
                node('strong', row.title),
                node(
                    'small',
                    row.at
                        ? `${row.detail} · diajukan ${dateTime(row.at)} WIB`
                        : row.detail,
                ),
            );
            a.append(body);
            if (row.status) {
                const status = node('span');
                badge(status, STATUSES[row.status].badge);
                a.append(status);
            }
            a.append(node('span', row.action, 'dashboard-task-action'));
            li.append(a);
            return li;
        }),
    );
}

function progressBar(row) {
    const wrap = node('div', null, 'dashboard-mini'),
        stack = node('span', null, 'dashboard-mini-stack');
    for (const key of ['final', 'submitted', 'returned', 'not_started'])
        if (row[key]) {
            const segment = node('span');
            segment.dataset.status = key;
            segment.style.flexGrow = row[key];
            stack.append(segment);
        }
    stack.setAttribute('aria-hidden', 'true');
    wrap.append(stack, node('span', pct(share(row.final, row.total))));
    return wrap;
}
function areaRow(row, label, href, sub = false) {
    const tr = node('tr', null, sub ? 'dashboard-subrow' : ''),
        name = cell(null, label),
        progress = cell(null, 'Ketuntasan'),
        action = cell(null, ''),
        open = node('a', 'Lihat', 'link');
    name.append(node('strong', row.name));
    progress.append(progressBar(row));
    open.href = href;
    open.setAttribute('aria-label', `Lihat ${row.name}`);
    action.append(open);
    tr.append(
        name,
        cell(fmt(row.total), 'Subjek', 'numeric'),
        cell(fmt(row.not_started), 'Belum diisi', 'numeric'),
        cell(fmt(row.submitted), 'Diajukan', 'numeric'),
        cell(fmt(row.returned), 'Dikembalikan', 'numeric'),
        cell(fmt(row.final), 'Final', 'numeric'),
        progress,
        action,
    );
    return tr;
}
function progress(state) {
    const { c, d, link } = state,
        p = d.progress,
        host = $('[data-dashboard-progress]');
    const area = { division: 'Divisi', unit: 'Unit' }[p.level];
    const headings = area
        ? [area, 'Subjek', 'Belum diisi', 'Diajukan', 'Dikembalikan', 'Final', 'Ketuntasan', '']
        : ['Nama', 'Status', 'Nilai', 'Kategori', ''];
    const t = table(headings, []),
        body = $('tbody', t);
    host.replaceChildren(t);
    if (!p.rows.length) return;
    body.replaceChildren();
    if (p.level === 'division') {
        for (const division of p.rows) {
            const tr = areaRow(
                division,
                area,
                link('rekap', { division: division.id, status: 'all' }),
            );
            const units = division.units.map((unit) =>
                areaRow(unit, 'Unit', link('rekap', { unit: unit.id, status: 'all' }), true),
            );
            const toggle = node('button', null, 'dashboard-expand');
            toggle.type = 'button';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', `Tampilkan ${units.length} unit di ${division.name}`);
            toggle.append(node('span', `${units.length} unit`));
            toggle.addEventListener('click', () => {
                const expanded = toggle.getAttribute('aria-expanded') !== 'true';
                toggle.setAttribute('aria-expanded', String(expanded));
                units.forEach((row) => (row.hidden = !expanded));
            });
            units.forEach((row) => (row.hidden = true));
            tr.firstChild.append(toggle);
            body.append(tr, ...units);
        }
        return;
    }
    const render =
        p.level === 'unit'
            ? (row) =>
                  areaRow(row, area, link('persetujuan', { unit: row.id, status: 'all' }))
            : (row) => {
                  const tr = node('tr'),
                      name = cell(null, 'Nama'),
                      statusCell = cell(null, 'Status'),
                      action = cell(null, ''),
                      open = node('a', ['returned', 'not_started'].includes(row.status) ? 'Isi nilai' : 'Lihat', 'link');
                  name.append(node('strong', row.name), node('small', row.position));
                  const pill = node('span');
                  badge(pill, STATUSES[row.status].badge);
                  statusCell.append(pill);
                  open.href = link(
                      ['returned', 'not_started'].includes(row.status) ? 'nilai' : 'pengajuan',
                      { person: row.person },
                  );
                  action.append(open);
                  tr.append(
                      name,
                      statusCell,
                      cell(fmt(row.score), 'Nilai', 'numeric'),
                      cell(row.category || '–', 'Kategori'),
                      action,
                  );
                  return tr;
              };
    paginate(body, `dashboard-progress-${c.role}`, {
        token: d.month,
        records: p.rows,
        renderRow: render,
    });
}

function activities(state) {
    const list = $('[data-dashboard-activities]');
    if (!list) return;
    const rows = state.d.activities || [];
    if (!rows.length) {
        emptyItem(list, 'Belum ada aktivitas tercatat.');
        return;
    }
    list.replaceChildren(
        ...rows.map((entry) => {
            const li = node('li', null, 'dashboard-activity');
            li.append(
                node('strong', activityLabel(entry.action)),
                node('span', activitySubject(entry)),
                node('small', `${entry.who} · ${dateTime(entry.at)} WIB`),
            );
            return li;
        }),
    );
}

function renderCharts(state) {
    trend(state);
    categories(state);
    performance(state);
}
function render(root, state) {
    const { c, d, link } = state;
    $('[data-dashboard-month]').textContent = labelCycle(d.month);
    $('[data-dashboard-report]').href = ROLES[c.role].report(link);
    $('[data-dashboard-empty]').hidden = Boolean(d.cycle);
    root.dataset.empty = String(!d.cycle);
    if (!d.cycle) {
        blank(root, 'Belum ada periode penilaian.');
        return;
    }
    cards(state);
    completion(state);
    renderCharts(state);
    agenda(state);
    tasks(state);
    indicators(state);
    progress(state);
    activities(state);
    $$('[data-dashboard-toggle]', root).forEach((button) => {
        button.disabled = false;
    });
}
function blank(root, message) {
    for (const host of $$('[data-dashboard-chart]', root)) emptyChart(host, message);
    fitPerformance($('[data-dashboard-chart="performance"]', root), 0);
    for (const list of $$('[data-dashboard-tasks],[data-dashboard-indicators],[data-dashboard-activities]', root))
        emptyItem(list, message);
    for (const host of $$('[data-dashboard-deadline],[data-dashboard-progress],[data-dashboard-cards]', root))
        host.replaceChildren(node('p', message, 'dashboard-empty'));
    for (const host of $$('[data-dashboard-stack],[data-dashboard-stack-legend],[data-dashboard-category-legend],[data-dashboard-donut-center],[data-dashboard-schedule],[data-dashboard-table]', root))
        host.replaceChildren();
    $('[data-dashboard-completion-figure]').textContent = '–';
    $('[data-dashboard-cycle-status]').textContent = '–';
    $('[data-dashboard-performance-caption]').textContent = '';
}

export function initDashboard(c, s, link) {
    const root = $('[data-role-dashboard]');
    if (!root) return;
    let sequence = 0,
        controller,
        timer;
    async function load() {
        const current = ++sequence;
        controller?.abort();
        controller = new AbortController();
        root.dataset.state = 'loading';
        root.setAttribute('aria-busy', 'true');
        $('[data-dashboard-error]').hidden = true;
        try {
            const { data } = await c.api.request(
                '/data/dashboard?' + new URLSearchParams({ cycle: s.cycleKey }),
                'GET',
                null,
                { signal: controller.signal },
            );
            if (current !== sequence) return;
            root.dashboardState = { c, d: data, link };
            render(root, root.dashboardState);
            root.dataset.state = 'ready';
        } catch (e) {
            if (current !== sequence || e.name === 'AbortError') return;
            root.dataset.state = 'error';
            $('[data-dashboard-error]').hidden = false;
            blank(root, 'Data belum tersedia.');
        } finally {
            if (current === sequence) root.setAttribute('aria-busy', 'false');
        }
    }
    root.addEventListener('click', (event) => {
        if (event.target.closest('[data-dashboard-reload]')) {
            load();
            return;
        }
        const toggle = event.target.closest('[data-dashboard-toggle]');
        if (!toggle) return;
        const key = toggle.dataset.dashboardToggle,
            showTable = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', String(showTable));
        toggle.textContent = showTable ? 'Tampilkan grafik' : 'Data grafik';
        $(`[data-dashboard-table="${key}"]`).hidden = !showTable;
        toggle
            .closest('.dashboard-panel')
            .classList.toggle('dashboard-show-table', showTable);
    });
    document.addEventListener('flow-updated', () => {
        clearTimeout(timer);
        timer = setTimeout(load, 180);
    });
    new MutationObserver(() => {
        if (root.dashboardState?.d.cycle) renderCharts(root.dashboardState);
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    setInterval(() => {
        if (root.dashboardState?.d.cycle) agenda(root.dashboardState);
    }, 60000);
    load();
}
