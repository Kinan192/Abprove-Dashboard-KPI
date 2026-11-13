import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    DoughnutController,
    ArcElement,
} from 'chart.js';
import { $, node, labelCycle, dateTime, status } from './flow-dom';
import { activityLabel, activitySubject } from './activity-labels';
import { open } from './ui';
import { paginate } from './pagination';

Chart.register(
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    DoughnutController,
    ArcElement,
);

const format = (value) =>
    value == null
        ? '-'
        : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(
              value,
          );
const average = (values) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const palette = [
    ['final', 'Final', '--dashboard-chart'],
    ['submitted', 'Diajukan', '--color-info'],
    ['returned', 'Dikembalikan', '--dashboard-returned'],
    ['not_started', 'Belum diisi', '--dashboard-unfilled'],
];
const color = (variable) =>
    getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
function finals(s, c, key) {
    return s
        .people(c.role === 'ku' ? 'member' : 'all', key)
        .filter((p) => s.assessment(p.id, key).status === 'Final')
        .map((p) => s.total(p.id, key))
        .filter((v) => v != null && Number.isFinite(+v))
        .map(Number);
}
function options() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        resizeDelay: 80,
        plugins: {
            tooltip: {
                backgroundColor: '#1d2433',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                cornerRadius: 6,
                padding: 12,
                displayColors: false,
            },
        },
        scales: {
            x: {
                border: { display: false },
                grid: { display: false },
                ticks: {
                    color: color('--color-muted'),
                    font: { family: 'Figtree, sans-serif', size: 11 },
                    maxRotation: 0,
                },
            },
            y: {
                min: 0,
                max: 100,
                border: { display: false },
                grid: { color: color('--color-line'), drawTicks: false },
                ticks: {
                    color: color('--color-muted'),
                    padding: 10,
                    stepSize: 25,
                    font: { family: 'Figtree, sans-serif', size: 11 },
                },
            },
        },
    };
}
function draw(root, config, label, emptyMessage) {
    root.chartInstance?.destroy();
    const canvas = node('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    canvas.textContent =
        'Buka Data grafik untuk membaca seluruh nilai dalam tabel.';
    root.replaceChildren(canvas);
    root.dataset.chartLibrary = 'chart.js';
    root.dataset.empty = emptyMessage ? 'true' : 'false';
    root.setAttribute('aria-busy', 'false');
    root.chartInstance = new Chart(canvas, config);
    if (emptyMessage)
        root.append(node('p', emptyMessage, 'dashboard-chart-empty'));
}
function trend(root, state) {
    const { s, link, history } = state;
    const values = history.map((r) => r.value).filter((v) => v != null);
    const min = values.length
        ? Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 10)
        : 0;
    const config = options();
    config.scales.y.min = min;
    config.scales.y.ticks.stepSize = min >= 60 ? 10 : 25;
    config.interaction = { mode: 'index', intersect: false };
    config.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length
            ? 'pointer'
            : 'default';
        const row = history[elements[0]?.index];
        $('[data-dashboard-trend-detail]').textContent =
            row?.value != null
                ? `${labelCycle(row.key)} · ${format(row.value)} · ${row.count} hasil Final`
                : 'Pilih titik untuk membuka bulan tersebut.';
    };
    config.onClick = (_, elements) => {
        const row = history[elements[0]?.index];
        if (row?.value != null)
            location.assign(link('dashboard', { cycle: row.key }));
    };
    config.plugins.tooltip.callbacks = {
        title: (items) => labelCycle(history[items[0].dataIndex].key),
        label: (item) => `Nilai Final: ${format(item.parsed.y)}`,
        afterLabel: (item) =>
            `${history[item.dataIndex].count} penilaian Final`,
    };
    draw(
        root,
        {
            type: 'line',
            data: {
                labels: history.map((r) =>
                    labelCycle(r.key).split(' ')[0].slice(0, 3),
                ),
                datasets: [
                    {
                        label: 'Rata-rata nilai Final',
                        data: history.map((r) => r.value),
                        borderColor: color('--dashboard-chart'),
                        backgroundColor: color('--dashboard-chart') + '0d',
                        fill: true,
                        borderWidth: 2.5,
                        tension: 0.3,
                        spanGaps: false,
                        pointRadius: history.map((r, i) =>
                            i === history.length - 1 && r.value != null ? 4 : 0,
                        ),
                        pointHoverRadius: 5,
                        pointHitRadius: 15,
                        pointBackgroundColor: color('--color-paper'),
                        pointBorderWidth: 2.5,
                    },
                ],
            },
            options: config,
        },
        'Grafik garis rata-rata nilai Final per bulan',
        values.length ? '' : 'Belum ada hasil Final',
    );
    $('[data-dashboard-year]').textContent = s.cycleKey.slice(0, 4);
    $('[data-dashboard-scale]').textContent = `Skala ${min}–100`;
}
function comparisonRows(c, d) {
    if (c.role === 'ku')
        return (d.item_averages || [])
            .filter((r) => r.kind === 'member' && r.average != null)
            .map((r) => ({ ...r, value: +r.average }))
            .sort((a, b) => a.value - b.value || a.name.localeCompare(b.name));
    return [...((c.role === 'hc' ? d.division_progress : d.unit_status) || [])]
        .filter((r) => r.total > 0)
        .sort(
            (a, b) =>
                a.final / a.total - b.final / b.total ||
                a.name.localeCompare(b.name),
        );
}
function scopeLink(row, state) {
    const { c, link } = state;
    return c.role === 'ku'
        ? link('riwayat')
        : link(c.role === 'hc' ? 'rekap' : 'persetujuan', {
              [c.role === 'hc' ? 'division' : 'unit']: row.id,
              status: 'all',
          });
}
function comparison(root, state) {
    if (state.c.role === 'hc') {
        completion(root, state);
        return;
    }
    const { c, rows } = state,
        pages = Math.max(1, Math.ceil(rows.length / 5));
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    const shown = rows.slice(state.page * 5, state.page * 5 + 5),
        config = options();
    state.shown = shown;
    config.indexAxis = 'y';
    config.interaction = { mode: 'index', axis: 'y', intersect: false };
    config.scales.x = {
        ...config.scales.y,
        stacked: c.role !== 'ku',
        min: 0,
        max: 100,
        ticks: {
            ...config.scales.y.ticks,
            stepSize: 50,
            callback: (v) => `${v}${c.role === 'ku' ? '' : '%'}`,
        },
    };
    config.scales.y = {
        stacked: c.role !== 'ku',
        border: { display: false },
        grid: { display: false },
        ticks: {
            color: color('--color-ink'),
            font: { family: 'Figtree, sans-serif', size: 11 },
            autoSkip: false,
            callback: function (index) {
                const name = this.getLabelForValue(index);
                return name.length > 21 ? name.slice(0, 20) + '…' : name;
            },
        },
    };
    config.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length
            ? 'pointer'
            : 'default';
    };
    config.onClick = (_, elements) => {
        const row = shown[elements[0]?.index];
        if (row) location.assign(scopeLink(row, state));
    };
    config.plugins.tooltip.callbacks = {
        title: (items) => shown[items[0].dataIndex].name,
        label: (item) => {
            const row = shown[item.dataIndex];
            return c.role === 'ku'
                ? `Rata-rata: ${format(row.value)} (${row.count} Final)`
                : `${palette[item.datasetIndex][1]}: ${row[palette[item.datasetIndex][0]]} penilaian`;
        },
        footer: (items) =>
            c.role === 'ku'
                ? 'Nilai sebelum dikalikan bobot'
                : `${shown[items[0].dataIndex].final} dari ${shown[items[0].dataIndex].total} sudah Final`,
    };
    const datasets =
        c.role === 'ku'
            ? [
                  {
                      label: 'Rata-rata nilai KPI',
                      data: shown.map((r) => r.value),
                      backgroundColor: color('--dashboard-chart'),
                      borderRadius: 4,
                      barThickness: 16,
                  },
              ]
            : palette.map(([key, label, variable]) => ({
                  label,
                  data: shown.map((r) => (r[key] / r.total) * 100),
                  backgroundColor: color(variable),
                  barThickness: 16,
                  borderWidth: 0,
              }));
    draw(
        root,
        {
            type: 'bar',
            data: { labels: shown.map((r) => r.name), datasets },
            options: config,
        },
        c.role === 'ku'
            ? 'Grafik batang rata-rata nilai KPI'
            : 'Grafik batang bertumpuk progres penilaian',
        rows.length
            ? ''
            : c.role === 'ku'
              ? 'Belum ada nilai Final per KPI'
              : 'Belum ada penilaian pada periode ini',
    );
    const legend = $('[data-dashboard-legend]');
    legend.replaceChildren();
    if (c.role !== 'ku')
        for (const [, label, variable] of palette) {
            const item = node('span'),
                swatch = node('i');
            swatch.style.background = color(variable);
            item.append(swatch, document.createTextNode(label));
            legend.append(item);
        }
    else legend.textContent = 'Nilai mentah 10–100, sebelum dikalikan bobot.';
    $('[data-dashboard-paging]').hidden = rows.length <= 5;
    $('[data-dashboard-page-summary]').textContent =
        `${state.page * 5 + 1}–${Math.min((state.page + 1) * 5, rows.length)} dari ${rows.length}`;
    $('[data-dashboard-page-label]').textContent =
        `${state.page + 1} / ${pages}`;
    $('[data-dashboard-prev]').disabled = state.page === 0;
    $('[data-dashboard-next]').disabled = state.page >= pages - 1;
}
function metrics(root, state) {
    const { c, s, d, link, history } = state,
        m = d.metrics;
    const previous = history.at(-2)?.value,
        current = m.average == null ? null : +m.average;
    const delta =
        previous == null || current == null ? null : current - previous;
    $('[data-dashboard-average]').textContent = format(current);
    $('[data-dashboard-delta]').textContent =
        delta == null
            ? `${m.final} hasil Final bulan ini`
            : `${delta > 0 ? '+' : ''}${format(delta)} poin dari bulan lalu`;
    const rows = [
        [
            c.role === 'ku'
                ? 'Anggota unit'
                : c.role === 'kd'
                  ? 'Staf & Kepala Unit'
                  : 'Subjek penilaian',
            m.total,
            c.role === 'hc' ? 'Seluruh organisasi' : 'Dalam cakupan Anda',
            link(c.role === 'hc' ? 'rekap' : 'tim'),
        ],
    ];
    if (c.role === 'ku')
        rows.push(
            [
                'Belum diisi',
                m.not_started,
                'Mulai penilaian staf',
                link('nilai'),
            ],
            [
                'Dikembalikan',
                m.returned,
                'Perbaiki sebelum diajukan',
                link('nilai', { status: 'Dikembalikan' }),
            ],
            [
                'Menunggu persetujuan',
                m.submitted,
                'Sudah diajukan ke Kepala Divisi',
                link('pengajuan', { status: 'Diajukan' }),
            ],
        );
    else if (c.role === 'kd')
        rows.push(
            [
                'Menunggu persetujuan',
                m.submitted,
                'Pengajuan staf dalam divisi Anda',
                link('persetujuan'),
            ],
            [
                'Kepala Unit belum dinilai',
                s
                    .people('unit_head')
                    .filter((p) => s.assessment(p.id).status !== 'Final')
                    .length,
                'Penilaian langsung oleh Anda',
                link('nilai-kepala'),
            ],
            [
                'Dikembalikan',
                m.returned,
                'Menunggu perbaikan Kepala Unit',
                link('persetujuan', { status: 'Dikembalikan' }),
            ],
        );
    else
        rows.push(
            [
                'Sudah Final',
                m.final,
                'Keputusan Kepala Divisi',
                link('rekap', { status: 'Final' }),
            ],
            [
                'Menunggu persetujuan',
                m.submitted,
                'Ditinjau Kepala Divisi',
                link('rekap', { status: 'Diajukan' }),
            ],
            [
                'Perlu tindak lanjut',
                +m.not_started + +m.returned,
                `${m.not_started} belum diisi · ${m.returned} dikembalikan`,
                link('rekap'),
            ],
        );
    root.replaceChildren();
    for (const [label, value, hint, href] of rows) {
        const a = node('a', null, 'dashboard-metric');
        a.href = href;
        a.append(
            node('span', label, 'figure-label'),
            node('strong', value, 'figure-value'),
            node('span', hint, 'figure-hint'),
        );
        root.append(a);
    }
}
function agenda(state) {
    const { s, c, link } = state,
        cycle = s.cycle();
    $('[data-dashboard-cycle-month]').textContent = labelCycle(s.cycleKey);
    $('[data-dashboard-cycle-status]').textContent = cycle
        ? { open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' }[
              cycle.status
          ] || cycle.status
        : 'Belum diatur';
    const rows = [
        ['Mulai pengisian', cycle?.opens],
        ['Batas pengajuan staf', cycle?.submission],
        ['Batas ACC & nilai Kepala Unit', cycle?.approval],
        ['Penutupan periode', cycle?.closes],
    ];
    const root = $('[data-dashboard-deadlines]');
    root.replaceChildren();
    for (const [label, value] of rows) {
        const li = node('li');
        li.append(
            node('strong', label),
            node('span', value ? dateTime(value) + ' WIB' : 'Belum diatur'),
        );
        root.append(li);
    }
    const next = rows[c.role === 'ku' ? 1 : c.role === 'kd' ? 2 : 3];
    $('[data-dashboard-next-deadline]').textContent =
        `${next[0]}: ${next[1] ? dateTime(next[1]) + ' WIB' : 'belum diatur'}`;
    $('[data-dashboard-agenda-action]').href = link(
        { ku: 'nilai', kd: 'nilai-kepala', hc: 'pengaturan' }[c.role],
    );
}
function findings(state) {
    const { c, d, link } = state,
        root = $('[data-dashboard-findings]');
    if (!root) return;
    root.replaceChildren();
    const rows = [...(d.findings || [])].sort(
        (a, b) => Number(Boolean(b.negative)) - Number(Boolean(a.negative)),
    );
    for (const row of rows.slice(0, 2)) {
        const a = node('a', null, 'dashboard-finding'),
            label = node(
                'span',
                row.negative ? 'Perlu ditingkatkan' : 'Pencapaian',
                'dashboard-finding-label',
            );
        label.dataset.kind = row.negative ? 'negative' : 'positive';
        a.href = link(
            c.role === 'hc'
                ? 'rekap'
                : c.role === 'kd'
                  ? 'persetujuan'
                  : 'pengajuan',
            { person: row.personId },
        );
        a.append(
            label,
            node('strong', row.name),
            node('p', row.negative || row.positive),
        );
        root.append(a);
    }
    if (!rows.length)
        root.append(
            node('p', 'Belum ada temuan dari hasil Final.', 'dashboard-empty'),
        );
    $('[data-dashboard-findings-all]').href =
        c.role === 'ku'
            ? link('riwayat', { panel: 'findings' })
            : link('dashboard', { detail: 'laporan', panel: 'results' });
}
function completion(root, state) {
    const { history, link } = state,
        config = options();
    config.scales.y.ticks.callback = (value) => `${value}%`;
    config.plugins.tooltip.callbacks = {
        title: (items) => labelCycle(history[items[0].dataIndex].key),
        label: (item) => `${format(item.parsed.y)}% sudah Final`,
        afterLabel: (item) =>
            `${history[item.dataIndex].count} dari ${history[item.dataIndex].total} subjek`,
    };
    config.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length
            ? 'pointer'
            : 'default';
    };
    config.onClick = (_, elements) => {
        const row = history[elements[0]?.index];
        if (row?.completion != null)
            location.assign(link('dashboard', { cycle: row.key }));
    };
    draw(
        root,
        {
            type: 'bar',
            data: {
                labels: history.map((row) =>
                    labelCycle(row.key).split(' ')[0].slice(0, 3),
                ),
                datasets: [
                    {
                        label: 'Ketuntasan penilaian',
                        data: history.map((row) => row.completion),
                        backgroundColor: color('--dashboard-chart'),
                        borderRadius: 3,
                        maxBarThickness: 22,
                    },
                ],
            },
            options: config,
        },
        'Grafik batang persentase ketuntasan penilaian setiap bulan',
        history.some((row) => row.completion != null)
            ? ''
            : 'Belum ada periode penilaian',
    );
    $('[data-dashboard-legend]').textContent =
        'Final ÷ jumlah subjek pada bulan yang sama.';
    $('[data-dashboard-paging]').hidden = true;
}
function lowKpis(root, state) {
    const rows = (state.d.item_averages || [])
        .filter((row) => row.average != null)
        .toSorted(
            (a, b) => +a.average - +b.average || a.name.localeCompare(b.name),
        )
        .slice(0, 5);
    state.lowKpis = rows;
    const config = options();
    config.indexAxis = 'y';
    config.scales.x = {
        ...config.scales.y,
        min: 0,
        max: 100,
        ticks: { ...config.scales.y.ticks, stepSize: 50 },
    };
    config.scales.y = {
        border: { display: false },
        grid: { display: false },
        ticks: {
            color: color('--color-ink'),
            font: { family: 'Figtree, sans-serif', size: 10 },
            autoSkip: false,
            callback: function (value) {
                const name = this.getLabelForValue(value);
                return name.length > 18 ? name.slice(0, 17) + '…' : name;
            },
        },
    };
    config.plugins.tooltip.callbacks = {
        title: (items) => [
            rows[items[0].dataIndex].name,
            rows[items[0].dataIndex].area,
        ],
        label: (item) => `Rata-rata: ${format(item.parsed.x)}`,
        afterLabel: (item) =>
            `${rows[item.dataIndex].count} hasil Final · bobot ${format(+rows[item.dataIndex].weight)}%`,
    };
    config.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length
            ? 'pointer'
            : 'default';
    };
    config.onClick = (_, elements) => {
        if (elements.length) {
            chartData(state, 'low-kpi');
            open('dashboard-data-dialog');
        }
    };
    draw(
        root,
        {
            type: 'bar',
            data: {
                labels: rows.map((row) => row.name),
                datasets: [
                    {
                        label: 'Rata-rata indikator',
                        data: rows.map((row) => +row.average),
                        backgroundColor: color('--dashboard-chart'),
                        barThickness: 12,
                        borderRadius: 3,
                    },
                ],
            },
            options: config,
        },
        'Grafik lima indikator KPI dengan rata-rata Final terendah',
        rows.length ? '' : 'Belum ada hasil Final per KPI',
    );
}
function categories(root, state) {
    const groups = [
        ...Map.groupBy(
            state.d.scores || [],
            (row) => row.category || 'Belum berkategori',
        ),
    ]
        .map(([name, rows]) => ({
            name,
            rows,
            average: average(rows.map((row) => +row.total)),
        }))
        .sort((a, b) => b.average - a.average);
    state.categories = groups;
    const colors = [
        color('--dashboard-chart'),
        '#69aa91',
        '#accfbe',
        '#d5e5dc',
        color('--color-info'),
        color('--color-warning'),
    ];
    const config = options();
    delete config.scales;
    config.cutout = '64%';
    config.radius = '94%';
    config.plugins.tooltip.displayColors = true;
    config.plugins.tooltip.callbacks = {
        label: (item) =>
            `${item.label}: ${item.raw} hasil Final (${format((item.raw / state.d.scores.length) * 100)}%)`,
    };
    config.onHover = (event, elements) => {
        event.native.target.style.cursor = elements.length
            ? 'pointer'
            : 'default';
    };
    config.onClick = (_, elements) => {
        const group = groups[elements[0]?.index];
        if (group) {
            chartData(state, 'categories', group.name);
            open('dashboard-data-dialog');
        }
    };
    draw(
        root,
        {
            type: 'doughnut',
            data: {
                labels: groups.map((g) => g.name),
                datasets: [
                    {
                        data: groups.map((g) => g.rows.length),
                        backgroundColor: groups.map(
                            (_, i) => colors[i % colors.length],
                        ),
                        borderWidth: 2,
                        borderColor: color('--color-paper'),
                        hoverOffset: 3,
                    },
                ],
            },
            options: config,
        },
        'Diagram donat sebaran kategori nilai Final',
        groups.length ? '' : 'Belum ada hasil Final',
    );
    const legend = $('[data-dashboard-category-legend]');
    legend.replaceChildren();
    groups.forEach((group, i) => {
        const button = node('button', null, 'dashboard-category-item'),
            dot = node('i');
        button.type = 'button';
        button.dataset.dashboardCategory = group.name;
        dot.style.background = colors[i % colors.length];
        button.append(
            dot,
            node('span', group.name),
            node('strong', group.rows.length),
        );
        legend.append(button);
    });
}
function tasks(root, state) {
    const { c, s, link } = state;
    root.replaceChildren();
    if (c.role === 'hc') {
        for (const entry of (s.data.activities || []).slice(0, 2)) {
            const a = node('a', null, 'dashboard-task');
            a.href = link('aktivitas');
            a.append(
                node('strong', activityLabel(entry.action)),
                node('p', activitySubject(entry), 'dashboard-task-detail'),
                node(
                    'small',
                    `${entry.who}${entry.at ? ' · ' + dateTime(entry.at) + ' WIB' : ''}`,
                    'text-muted',
                ),
            );
            root.append(a);
        }
    } else {
        const candidates = s
            .people('member')
            .filter((p) =>
                c.role === 'kd'
                    ? s.assessment(p.id).status === 'Diajukan'
                    : ['Dikembalikan', 'Belum'].includes(
                          s.assessment(p.id).status,
                      ),
            );
        candidates.sort(
            (a, b) =>
                (s.assessment(a.id).status === 'Dikembalikan' ? 0 : 1) -
                    (s.assessment(b.id).status === 'Dikembalikan' ? 0 : 1) ||
                a.name.localeCompare(b.name),
        );
        for (const p of candidates.slice(0, 2)) {
            const a = node('a', null, 'dashboard-task'),
                badge = node('span');
            a.href = link(c.role === 'ku' ? 'nilai' : 'persetujuan', {
                person: p.id,
            });
            status(badge, s.assessment(p.id).status);
            a.append(
                node('strong', p.name),
                node('p', `${p.job} · ${p.unitName}`, 'dashboard-task-detail'),
                badge,
                node(
                    'span',
                    c.role === 'ku' ? 'Buka penilaian' : 'Tinjau pengajuan',
                    'dashboard-task-action',
                ),
            );
            root.append(a);
        }
    }
    if (!root.childElementCount)
        root.append(
            node(
                'p',
                c.role === 'hc'
                    ? 'Belum ada aktivitas tercatat.'
                    : c.role === 'kd'
                      ? 'Tidak ada pengajuan yang menunggu persetujuan.'
                      : 'Semua penilaian sudah diajukan atau Final.',
                'dashboard-empty',
            ),
        );
}
function chartData(state, kind, selectedCategory = '') {
    const table = node('table', null, 'data-table'),
        head = node('thead'),
        header = node('tr'),
        body = node('tbody');
    const trendData = kind === 'trend';
    if (
        kind === 'low-kpi' ||
        (kind === 'comparison' && state.c.role === 'hc')
    ) {
        const coverage = kind === 'comparison';
        const headings = coverage
            ? ['Bulan', 'Hasil Final', 'Jumlah subjek', 'Ketuntasan']
            : ['Indikator', 'Cakupan', 'Rata-rata', 'Jumlah Final', 'Bobot'];
        headings.forEach((label) => header.append(node('th', label)));
        head.append(header);
        const rows = coverage ? state.history : state.lowKpis;
        for (const row of rows) {
            const tr = node('tr');
            const values = coverage
                ? [
                      labelCycle(row.key),
                      row.count,
                      row.total,
                      row.completion == null
                          ? '-'
                          : format(row.completion) + '%',
                  ]
                : [
                      row.name,
                      row.area,
                      format(+row.average),
                      row.count,
                      format(+row.weight) + '%',
                  ];
            values.forEach((value) => tr.append(node('td', value)));
            body.append(tr);
        }
        if (!rows.length) {
            const tr = node('tr'),
                td = node('td', 'Belum ada data pada periode ini.', 'empty');
            td.colSpan = headings.length;
            tr.append(td);
            body.append(tr);
        }
        table.append(head, body);
        $('[data-dashboard-data-table]').replaceChildren(table);
        paginate(body, 'dashboard-data', {
            token: `${kind}:${state.s.cycleKey}`,
        });
        return;
    }
    if (kind === 'categories') {
        ['Nama', 'Unit', 'Nilai Final', 'Kategori'].forEach((label) =>
            header.append(node('th', label)),
        );
        head.append(header);
        for (const row of state.d.scores.filter(
            (row) => !selectedCategory || row.category === selectedCategory,
        )) {
            const tr = node('tr');
            for (const value of [
                row.name,
                row.unit_name,
                format(+row.total),
                row.category,
            ])
                tr.append(node('td', value));
            body.append(tr);
        }
        if (!body.childElementCount) {
            const tr = node('tr'),
                td = node('td', 'Belum ada hasil Final.', 'empty');
            td.colSpan = 4;
            tr.append(td);
            body.append(tr);
        }
        table.append(head, body);
        $('[data-dashboard-data-table]').replaceChildren(table);
        paginate(body, 'dashboard-data', {
            token: `categories:${selectedCategory}`,
        });
        return;
    }
    const headings = trendData
        ? ['Bulan', 'Rata-rata Final', 'Jumlah Final']
        : state.c.role === 'ku'
          ? ['KPI', 'Rata-rata', 'Jumlah Final']
          : [
                state.c.role === 'hc' ? 'Divisi' : 'Unit',
                'Final',
                'Diajukan',
                'Dikembalikan',
                'Belum diisi',
            ];
    headings.forEach((label) => header.append(node('th', label)));
    head.append(header);
    for (const row of trendData ? state.history : state.shown) {
        const tr = node('tr'),
            name = node('td'),
            a = node('a', trendData ? labelCycle(row.key) : row.name, 'link');
        a.href = trendData
            ? state.link('dashboard', { cycle: row.key })
            : scopeLink(row, state);
        name.append(a);
        tr.append(name);
        for (const value of trendData
            ? [format(row.value), row.count]
            : state.c.role === 'ku'
              ? [format(row.value), row.count]
              : [row.final, row.submitted, row.returned, row.not_started])
            tr.append(node('td', value, 'numeric'));
        body.append(tr);
    }
    if (!body.childElementCount) {
        const tr = node('tr'),
            td = node('td', 'Belum ada data pada periode ini.', 'empty');
        td.colSpan = headings.length;
        tr.append(td);
        body.append(tr);
    }
    table.append(head, body);
    $('[data-dashboard-data-table]').replaceChildren(table);
    paginate(body, 'dashboard-data', {
        token: `${kind}:${state.s.cycleKey}:${state.page}`,
    });
}
export function renderRoleDashboard(c, s, d, link) {
    const root = $('[data-role-dashboard]');
    if (!root) return;
    const keys = Array.from(
        { length: +s.cycleKey.slice(5) },
        (_, i) => `${s.cycleKey.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`,
    );
    const state = {
        c,
        s,
        d,
        link,
        rows: comparisonRows(c, d),
        page: 0,
        history: keys.map((key) => {
            const values = finals(s, c, key);
            const total = s.people(
                c.role === 'ku' ? 'member' : 'all',
                key,
            ).length;
            const scheduled = s.data.cycles.some((cycle) => cycle.id === key);
            return {
                key,
                value: average(values),
                count: values.length,
                total,
                completion:
                    scheduled && total ? (values.length / total) * 100 : null,
            };
        }),
    };
    root.dashboardState = state;
    root.querySelectorAll('[data-dashboard-data]').forEach((button) => {
        button.disabled = false;
    });
    $('[data-dashboard-report]').href =
        c.role === 'ku'
            ? link('riwayat')
            : link('dashboard', { detail: 'laporan' });
    $('[data-dashboard-all]').href = link(
        { ku: 'nilai', kd: 'persetujuan', hc: 'aktivitas' }[c.role],
    );
    $('[data-dashboard-headline]').textContent =
        `${labelCycle(s.cycleKey)} · ${c.role === 'ku' ? 'Staf dalam unit Anda' : c.role === 'kd' ? 'Staf dan Kepala Unit dalam divisi Anda' : 'Seluruh staf dan Kepala Unit'}`;
    metrics($('[data-dashboard-metrics]'), state);
    const redraw = () => {
        trend($('[data-dashboard-trend]'), root.dashboardState);
        comparison($('[data-dashboard-comparison]'), root.dashboardState);
        categories($('[data-dashboard-categories]'), root.dashboardState);
        if (c.role === 'hc')
            lowKpis($('[data-dashboard-low-kpi]'), root.dashboardState);
    };
    redraw();
    tasks($('[data-dashboard-tasks]'), state);
    agenda(state);
    findings(state);
    if (!root.dataset.bound) {
        root.dataset.bound = 'true';
        root.addEventListener('click', (event) => {
            const category = event.target.closest('[data-dashboard-category]');
            if (category) {
                chartData(
                    root.dashboardState,
                    'categories',
                    category.dataset.dashboardCategory,
                );
                open('dashboard-data-dialog');
                return;
            }
            const dataButton = event.target.closest('[data-dashboard-data]');
            if (dataButton) {
                chartData(
                    root.dashboardState,
                    dataButton.dataset.dashboardData,
                );
                return;
            }
            const button = event.target.closest(
                '[data-dashboard-prev],[data-dashboard-next]',
            );
            if (!button) return;
            root.dashboardState.page += button.hasAttribute(
                'data-dashboard-next',
            )
                ? 1
                : -1;
            comparison($('[data-dashboard-comparison]'), root.dashboardState);
        });
        new MutationObserver(redraw).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
    }
}
