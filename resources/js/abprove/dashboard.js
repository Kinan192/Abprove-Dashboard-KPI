import { Chart, ArcElement, DoughnutController } from 'chart.js';
import { $, $$, node, labelCycle, dateTime, status as badge } from './flow-dom';
import { activityLabel, activitySubject } from './activity-labels';

Chart.register(ArcElement, DoughnutController);

const STATUSES = {
    final: { label: 'Final', badge: 'Final' },
    submitted: { label: 'Diajukan', badge: 'Diajukan' },
    returned: { label: 'Dikembalikan', badge: 'Dikembalikan' },
    not_started: { label: 'Belum diisi', badge: 'Belum' },
};
const STATUS_ORDER = ['final', 'submitted', 'returned', 'not_started'];
/** Metric card pastel tones in card order; role-dashboard.css defines both themes. */
const CARD_TONES = ['mint', 'sky', 'lilac', 'amber'];
const ROLES = {
    ku: {
        deadline: 'submission',
        report: (link, extra = {}) => link('riwayat', extra),
    },
    kd: {
        deadline: 'approval',
        tasksEmpty:
            'Tidak ada pengajuan menunggu dan seluruh Kepala Unit sudah dinilai.',
        report: (link, extra = {}) =>
            link('dashboard', { detail: 'laporan', ...extra }),
    },
    hc: {
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
/** Progress table area column per level (KD units, HC divisions). */
const AREAS = { unit: 'Unit', division: 'Divisi' };

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmt = (value) => (value == null ? '–' : formatter.format(value));
const pct = (value) => (value == null ? '–' : `${fmt(value)}%`);
/** Share of a denominator; no denominator means no percentage, never 0%. */
const share = (part, total) => (total ? (part * 100) / total : null);
const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** Linear blend of two `#rrggbb` tokens; `t` 0 → `from`, 1 → `to`. */
function blend(from, to, t) {
    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
        a = rgb(from),
        b = rgb(to);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
}

/** Table cell: strings/numbers become text, nodes (links) are appended. */
function cell(content, label, cls = '') {
    const isNode = content instanceof Node,
        td = node('td', isNode ? null : content, cls);
    if (isNode) td.append(content);
    td.dataset.label = label;
    return td;
}
function table(headings) {
    const t = node('table', null, 'data-table'),
        head = node('thead'),
        tr = node('tr'),
        body = node('tbody'),
        row = node('tr'),
        empty = node('td', 'Belum ada data pada periode ini.', 'empty');
    headings.forEach((heading) => {
        const th = node('th', heading);
        th.scope = 'col';
        tr.append(th);
    });
    head.append(tr);
    empty.colSpan = headings.length;
    row.append(empty);
    body.append(row);
    t.append(head, body);
    return t;
}
function emptyItem(list, message) {
    list.replaceChildren(node('li', message, 'dashboard-empty'));
}

function draw(host, config, label, fallback) {
    host.chart?.destroy();
    const canvas = node('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
    canvas.textContent = fallback;
    host.hidden = false;
    host.replaceChildren(canvas);
    host.chart = new Chart(canvas, config);
}
/** Removes the chart and its footprint; an empty month shows the outline ring. */
function clearChart(host) {
    host.chart?.destroy();
    host.chart = null;
    host.replaceChildren();
    host.hidden = true;
}
/** Hover highlights a segment; its full details stay in the readable legend. */
function highlight(host, index) {
    const chart = host.chart;
    if (!chart) return;
    chart.setActiveElements(index == null ? [] : [{ datasetIndex: 0, index }]);
    chart.update();
}

/** Open work gets a warning dot only when non-zero; the card tone stays positional. */
const attention = (value) => Boolean(value);
/** Four current-period totals; no month-to-month comparison. */
function cards(state) {
    const { c, d, link } = state,
        m = d.metrics,
        role = ROLES[c.role];
    const open = m.not_started + m.returned;
    const items = [
        {
            label: 'Rerata keseluruhan',
            value: fmt(m.average),
            unit: m.average == null ? '' : '/100',
            hint: m.final
                ? `Dari ${m.final} hasil Final`
                : 'Belum ada hasil Final',
            href: role.report(link),
        },
        {
            label: 'Ketuntasan',
            value: pct(m.completion),
            hint: m.total
                ? `${m.final} dari ${m.total} subjek sudah Final`
                : 'Belum ada subjek dalam cakupan',
            // KU has no progress table here: its staff statuses live on Pengajuan.
            href:
                c.role === 'ku'
                    ? link('pengajuan', { status: 'all' })
                    : '#dashboard-progress',
        },
    ];
    if (c.role === 'ku')
        items.push(
            {
                label: 'Menunggu Kepala Divisi',
                value: fmt(m.submitted),
                hint: 'Sudah Anda ajukan',
                href: link('pengajuan', { status: 'Diajukan' }),
            },
            {
                label: 'Perlu diisi',
                value: fmt(open),
                hint: `${m.not_started} belum diisi · ${m.returned} dikembalikan`,
                href: link('nilai'),
                attention: attention(open),
            },
        );
    else if (c.role === 'kd') {
        const member = m.kinds?.member,
            heads = m.kinds?.unit_head;
        items.push(
            {
                label: 'Menunggu persetujuan Anda',
                value: fmt(member?.submitted),
                hint: 'Pengajuan staf dari Kepala Unit',
                href: link('persetujuan', { status: 'Diajukan' }),
                attention: attention(member?.submitted),
            },
            {
                label: 'Kepala Unit belum dinilai',
                value: fmt(heads?.not_started),
                hint: heads ? `dari ${heads.total} Kepala Unit` : 'Tidak ada Kepala Unit',
                href: link('nilai-kepala'),
                attention: attention(heads?.not_started),
            },
        );
    } else
        items.push(
            {
                label: 'Menunggu persetujuan KD',
                value: fmt(m.submitted),
                hint: 'Diajukan Kepala Unit',
                href: link('rekap', { status: 'Diajukan' }),
            },
            {
                label: 'Belum diisi / dikembalikan',
                value: fmt(open),
                hint: `${m.not_started} belum diisi · ${m.returned} dikembalikan`,
                href: link('rekap', { status: 'all' }),
                attention: attention(open),
            },
        );
    $('[data-dashboard-cards]').replaceChildren(
        ...items.map((item, index) => {
            const a = node('a', null, 'dashboard-card'),
                value = node('strong', item.value, 'dashboard-card-value');
            a.href = item.href;
            a.dataset.tone = CARD_TONES[index];
            if (item.attention) a.dataset.attention = 'true';
            if (item.unit)
                value.append(node('small', item.unit, 'dashboard-card-unit'));
            a.append(
                node('span', item.label, 'dashboard-card-label'),
                value,
                node('span', item.hint, 'dashboard-card-hint'),
            );
            return a;
        }),
    );
}

/**
 * Final results split by their snapshot category (best category first, as
 * returned by the API). The denominator is Final results only; categories
 * without a Final result are absent and never invented. The legend carries
 * label, count, share and average permanently, so the small canvas has no
 * tooltip to clip.
 */
function distribution(state) {
    const { c, d, link } = state,
        m = d.metrics,
        rows = d.categories || [],
        total = rows.reduce((sum, row) => sum + row.total, 0),
        host = $('[data-dashboard-chart="categories"]'),
        legend = $('[data-dashboard-category-legend]'),
        high = css('--dashboard-category-high'),
        low = css('--dashboard-category-low'),
        items = rows.map((row, index) => ({
            label: row.label || row.code || 'Tanpa kategori',
            count: row.total,
            average: row.average,
            color: blend(high, low, rows.length > 1 ? index / (rows.length - 1) : 0),
        }));
    $('[data-dashboard-categories-report]').href = ROLES[c.role].report(link, {
        panel: 'scores',
    });
    $('[data-dashboard-category-figure]').textContent = total ? fmt(total) : '–';
    $('[data-dashboard-category-sub]').textContent = total
        ? 'hasil Final'
        : 'Belum ada Final';
    $('[data-dashboard-categories-caption]').textContent = total
        ? `Persentase dari ${fmt(total)} hasil Final (dari ${fmt(m.total)} subjek).`
        : m.total
          ? `Belum ada hasil Final dari ${fmt(m.total)} subjek.`
          : 'Belum ada subjek dalam cakupan pada periode ini.';
    $('[data-dashboard-donut]').dataset.empty = String(!total);
    legend.replaceChildren(
        ...items.map((item, index) => {
            const li = node('li', null, 'dashboard-stack-item'),
                swatch = node('i'),
                label = node('span', item.label, 'dashboard-stack-label');
            swatch.style.background = item.color;
            swatch.setAttribute('aria-hidden', 'true');
            if (item.average != null)
                label.append(
                    node('span', `rerata ${fmt(item.average)}`, 'dashboard-stack-average'),
                );
            li.append(
                swatch,
                label,
                node('strong', fmt(item.count)),
                node('small', pct(share(item.count, total))),
            );
            li.addEventListener('mouseenter', () => highlight(host, index));
            li.addEventListener('mouseleave', () => highlight(host, null));
            return li;
        }),
    );
    if (!total) {
        clearChart(host);
        return;
    }
    const paper = css('--color-paper'),
        colors = items.map((item) => item.color);
    draw(
        host,
        {
            type: 'doughnut',
            data: {
                labels: items.map((item) => item.label),
                datasets: [
                    {
                        data: items.map((item) => item.count),
                        backgroundColor: colors,
                        hoverBackgroundColor: colors,
                        borderColor: paper,
                        hoverBorderColor: paper,
                        borderWidth: 2,
                        hoverOffset: 5,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                resizeDelay: 80,
                cutout: '70%',
                layout: { padding: 6 },
            },
        },
        `Diagram donat sebaran kategori dari ${fmt(total)} hasil Final: ${items
            .map((item) => `${item.label} ${fmt(item.count)} (${pct(share(item.count, total))})`)
            .join(', ')}.`,
        'Jumlah per kategori tersedia pada daftar di samping diagram.',
    );
}

function indicators(state) {
    const { d } = state;
    for (const [key, rows] of Object.entries(d.indicators)) {
        const list = $(`[data-dashboard-indicators="${key}"]`);
        if (!list) continue;
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
                bar.style.width = `${Math.max(0, Math.min(100, row.average ?? 0))}%`;
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
/** Next milestone with countdown; a closed cycle never shows an upcoming deadline. */
function agenda(state) {
    const { c, d } = state,
        cycle = d.cycle,
        closed = cycle.status === 'closed',
        now = Date.now(),
        host = $('[data-dashboard-deadline]'),
        list = $('[data-dashboard-schedule]'),
        chip = $('[data-dashboard-cycle-status]');
    chip.textContent = CYCLE_STATUS[cycle.status] || cycle.status;
    chip.dataset.status = cycle.status;
    const next = closed
        ? null
        : cycle.schedule.find((step) => Date.parse(step.at) > now);
    host.replaceChildren();
    if (next) {
        const left = Date.parse(next.at) - now,
            when = node('span', countdown(left), 'dashboard-countdown');
        when.dataset.tone =
            left < 86400000 ? 'danger' : left < 3 * 86400000 ? 'warn' : 'calm';
        host.append(
            node('span', 'Berikutnya', 'dashboard-deadline-kicker'),
            node('strong', next.label),
            node('span', `${dateTime(next.at)} WIB`, 'dashboard-deadline-time'),
            when,
        );
    } else
        host.append(
            node(
                'strong',
                closed
                    ? 'Periode sudah ditutup'
                    : 'Seluruh jadwal periode ini telah lewat',
            ),
            node(
                'span',
                closed
                    ? 'Tidak ada tenggat aktif. Data periode ini tetap dapat dibaca.'
                    : 'Periode menunggu ditutup oleh Super HC.',
                'dashboard-deadline-time',
            ),
        );
    list.replaceChildren(
        ...cycle.schedule.map((step) => {
            const li = node('li'),
                at = Date.parse(step.at),
                time = node('time', `${dateTime(step.at)} WIB`);
            li.dataset.state =
                step === next
                    ? 'next'
                    : at <= now
                      ? 'past'
                      : closed
                        ? 'closed'
                        : 'upcoming';
            if (step.key === ROLES[c.role].deadline) li.dataset.relevant = 'true';
            time.dateTime = step.at;
            li.append(node('span', step.label), time);
            return li;
        }),
    );
}

/** KD/HC priority list; KU acts on staff from Isi nilai and Anggota Unit. */
function tasks(state) {
    const { c, d, link } = state,
        list = $('[data-dashboard-tasks]');
    if (!list || !d.tasks) return;
    $('[data-dashboard-task-count]').textContent = d.tasks.total
        ? fmt(d.tasks.total)
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
            if (row.status && STATUSES[row.status]) {
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
    for (const key of STATUS_ORDER)
        if (row[key]) {
            const segment = node('span');
            segment.dataset.status = key;
            segment.style.flexGrow = row[key];
            stack.append(segment);
        }
    stack.setAttribute('aria-hidden', 'true');
    wrap.append(
        stack,
        node(
            'span',
            `${fmt(row.final)}/${fmt(row.total)} Final · ${pct(share(row.final, row.total))}`,
        ),
    );
    return wrap;
}
/** Area row: counts grouped into Ketuntasan (Final/subjek) and the unfinished breakdown. */
function areaRow(row, label, href, sub = false) {
    const tr = node('tr', null, sub ? 'dashboard-subrow' : ''),
        name = cell(null, label),
        progress = cell(null, 'Ketuntasan'),
        pending = cell(null, 'Belum Final', 'dashboard-pending'),
        action = cell(null, 'Aksi'),
        open = node('a', 'Lihat', 'link');
    name.append(node('strong', row.name));
    progress.append(progressBar(row));
    pending.append(
        node('span', `${fmt(row.not_started)} belum diisi`),
        node(
            'span',
            `${fmt(row.submitted)} diajukan · ${fmt(row.returned)} dikembalikan`,
        ),
    );
    open.href = href;
    open.setAttribute('aria-label', `Lihat ${row.name}`);
    action.append(open);
    tr.append(name, progress, pending, action);
    return tr;
}
/** KD units or HC divisions (with their units behind a toggle); KU has no progress table. */
function progress(state) {
    const { d, link } = state,
        p = d.progress,
        host = $('[data-dashboard-progress]');
    if (!host || !p) return;
    const area = AREAS[p.level],
        t = table([area, 'Ketuntasan', 'Belum Final', 'Aksi']),
        body = $('tbody', t);
    t.classList.add('dashboard-progress-table', 'dashboard-progress-areas');
    host.replaceChildren(t);
    if (!p.rows.length) return;
    body.replaceChildren();
    if (p.level === 'unit') {
        body.append(
            ...p.rows.map((row) =>
                areaRow(row, area, link('persetujuan', { unit: row.id, status: 'all' })),
            ),
        );
        return;
    }
    for (const division of p.rows) {
        const tr = areaRow(
            division,
            area,
            link('rekap', { division: division.id, status: 'all' }),
        );
        const units = (division.units || []).map((unit) =>
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
        if (units.length) tr.firstChild.append(toggle);
        body.append(tr, ...units);
    }
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
    distribution(state);
    agenda(state);
    tasks(state);
    progress(state);
    indicators(state);
    activities(state);
}
/** Clears every data host and the chart; safe for errors and no-cycle months. */
function blank(root, message) {
    for (const host of $$('[data-dashboard-chart]', root)) clearChart(host);
    for (const list of $$('[data-dashboard-tasks],[data-dashboard-indicators],[data-dashboard-activities]', root))
        emptyItem(list, message);
    for (const host of $$('[data-dashboard-deadline],[data-dashboard-progress],[data-dashboard-cards]', root))
        host.replaceChildren(node('p', message, 'dashboard-empty'));
    for (const host of $$('[data-dashboard-category-legend],[data-dashboard-schedule]', root))
        host.replaceChildren();
    $('[data-dashboard-categories-caption]', root).textContent = '';
    $('[data-dashboard-donut]', root).dataset.empty = 'true';
    $('[data-dashboard-category-figure]', root).textContent = '–';
    $('[data-dashboard-category-sub]', root).textContent = 'Tanpa data';
    const count = $('[data-dashboard-task-count]', root);
    if (count) count.textContent = '';
    const chip = $('[data-dashboard-cycle-status]', root);
    chip.textContent = '–';
    delete chip.dataset.status;
}

export function initDashboard(c, s, link) {
    const root = $('[data-role-dashboard]');
    if (!root) return;
    let sequence = 0,
        controller,
        timer;
    const ready = () => root.dashboardState?.d.cycle;
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
            root.dashboardState = null;
            root.dataset.state = 'error';
            $('[data-dashboard-error]').hidden = false;
            blank(root, 'Data belum tersedia.');
        } finally {
            if (current === sequence) root.setAttribute('aria-busy', 'false');
        }
    }
    root.addEventListener('click', (event) => {
        if (event.target.closest('[data-dashboard-reload]')) load();
    });
    document.addEventListener('flow-updated', () => {
        clearTimeout(timer);
        timer = setTimeout(load, 180);
    });
    // Doughnut colours are read from CSS tokens, so it redraws on theme change.
    new MutationObserver(() => {
        if (ready()) distribution(root.dashboardState);
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    setInterval(() => {
        if (ready()) agenda(root.dashboardState);
    }, 60000);
    load();
}
