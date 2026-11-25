import {
    Chart,
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    DoughnutController,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { $, $$, node, labelCycle, dateTime, status as badge } from './flow-dom';
import { toast } from './ui';
import { activityLabel, activitySubject } from './activity-labels';

Chart.register(
    ArcElement,
    DoughnutController,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
);

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
/** Distribution panel views; the chosen one survives page reloads. */
const VIEWS = ['histogram', 'categories'];
const VIEW_KEY = 'abprove.dashboard.distribution';

const formatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmt = (value) => (value == null ? '–' : formatter.format(value));
const pct = (value) => (value == null ? '–' : `${fmt(value)}%`);
/** Share of a denominator; no denominator means no percentage, never 0%. */
const share = (part, total) => (total ? (part * 100) / total : null);
const css = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** Charts are drawn only into a visible view, never into a 0-width hidden canvas. */
const visible = (view) =>
    !$(`.dashboard-distribution-view[data-panel="${view}"]`)?.hidden;
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

/** Small stroke icons for the metric tiles (same paths as x-abprove.icon). */
const ICONS = {
    average: 'M3 3v18h18 M6 15l4-5 5 3 6-9',
    waiting: 'M12 8v5l4 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    empty: 'M16 3l5 5 M4 20l4-1L21 6l-5-5L3 14l-1 7z',
    returned: 'M19 12H5 M11 6l-6 6 6 6',
    heads: 'M9 4H5v17h14V4h-4 M9 2h6v4H9z M8 11h8 M8 15h8',
    alert: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    due: 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4',
};
function icon(name, cls = 'icon') {
    const ns = 'http://www.w3.org/2000/svg',
        svg = document.createElementNS(ns, 'svg'),
        path = document.createElementNS(ns, 'path');
    for (const [key, value] of Object.entries({
        class: cls,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.75',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
    }))
        svg.setAttribute(key, value);
    path.setAttribute('d', ICONS[name]);
    svg.append(path);
    return svg;
}

/** WIB "YYYY-MM-DDTHH:mm" from the server → epoch ms. */
const wib = (value) => Date.parse(value + ':00+07:00');
/**
 * The role's own deadline: KU/KD use the server's effective date for their area (schedule + approved
 * extensions, `d.extension`), Super HC the closing date. `left` is negative once it has passed.
 */
function roleDeadline(state) {
    const { c, d } = state,
        cycle = d.cycle;
    if (!cycle || cycle.status === 'closed') return null;
    if (d.extension) {
        const at = wib(d.extension.due);
        return {
            key: d.extension.key,
            at: new Date(at).toISOString(),
            left: at - Date.now(),
            extended: d.extension.extended,
        };
    }
    const step = cycle.schedule.find((s) => s.key === ROLES[c.role].deadline),
        left = step ? Date.parse(step.at) - Date.now() : -1;
    return left > 0 ? { ...step, left } : null;
}
/** Short header/banner wording for each role deadline. */
const DUE_LABEL = {
    submission: 'Batas pengajuan',
    approval: 'Batas persetujuan',
    closes: 'Penutupan periode',
};
const dueTone = (left) =>
    left < 86400000 ? 'danger' : left < 3 * 86400000 ? 'warn' : 'calm';
/** "lewat 5 hari" / "lewat 3 jam" for a passed deadline. */
function overdue(ms) {
    const hours = Math.floor(-ms / 3600000);
    return hours >= 24
        ? `lewat ${Math.floor(hours / 24)} hari`
        : `lewat ${Math.max(1, hours)} jam`;
}

/**
 * Header chip: "Batas pengajuan · 2 hari lagi", "Perpanjangan · s.d. 3 Des · 2 hari lagi" or, once passed,
 * "Batas pengajuan · lewat 5 hari" in red. Hidden without a deadline.
 */
function due(state) {
    const host = $('[data-dashboard-due]'),
        step = roleDeadline(state);
    host.hidden = !step;
    if (!step) {
        host.replaceChildren();
        return;
    }
    const passed = step.left <= 0,
        units = state.d.extension?.units || [];
    // Division deadline passed but some units still have an extended approval window.
    if (passed && units.length) {
        const latest = units.map((u) => u.due).sort().at(-1),
            left = wib(latest) - Date.now();
        host.dataset.tone = dueTone(left) === 'calm' ? 'warn' : dueTone(left);
        host.title = units.map((u) => `${u.name} s.d. ${dateTime(new Date(wib(u.due)).toISOString())} WIB`).join(' · ');
        host.replaceChildren(
            icon('due'),
            node('span', `${units.length} unit diperpanjang`, 'dashboard-due-label'),
            node('strong', `s.d. ${shortDate(new Date(wib(latest)).toISOString())} · ${countdown(left)}`),
        );
        return;
    }
    host.dataset.tone = passed ? 'danger' : dueTone(step.left);
    host.title = `${DUE_LABEL[step.key]} · ${dateTime(step.at)} WIB`;
    host.replaceChildren(
        icon('due'),
        node(
            'span',
            step.extended ? 'Perpanjangan' : DUE_LABEL[step.key],
            'dashboard-due-label',
        ),
        node(
            'strong',
            passed
                ? overdue(step.left)
                : step.extended
                  ? `s.d. ${shortDate(step.at)} · ${countdown(step.left)}`
                  : countdown(step.left),
        ),
    );
}
const shortDate = (iso) =>
    new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));

/** Open work for this role; null when nothing waits. */
function openWork(state) {
    const { c, d, link } = state,
        m = d.metrics;
    if (c.role === 'ku') {
        const parts = [
            m.returned && `${fmt(m.returned)} dikembalikan Kepala Divisi`,
            m.not_started && `${fmt(m.not_started)} belum diisi`,
        ].filter(Boolean);
        return parts.length
            ? {
                  text: `Penilaian staf: ${parts.join(' · ')}`,
                  action: 'Isi nilai',
                  href: link('nilai'),
              }
            : null;
    }
    if (c.role === 'kd') {
        const waiting = m.kinds?.member?.submitted || 0,
            heads = m.kinds?.unit_head?.not_started || 0,
            parts = [
                waiting &&
                    `${fmt(waiting)} pengajuan staf menunggu persetujuan Anda`,
                heads && `${fmt(heads)} Kepala Unit belum dinilai`,
            ].filter(Boolean);
        return parts.length
            ? {
                  text: parts.join(' · '),
                  action: waiting ? 'Buka persetujuan' : 'Nilai Kepala Unit',
                  href: waiting
                      ? link('persetujuan', { status: 'Diajukan' })
                      : link('nilai-kepala'),
              }
            : null;
    }
    const parts = [
        m.not_started && `${fmt(m.not_started)} belum diisi`,
        m.returned && `${fmt(m.returned)} dikembalikan`,
        m.submitted && `${fmt(m.submitted)} menunggu Kepala Divisi`,
    ].filter(Boolean);
    return parts.length
        ? {
              text: `Belum Final: ${parts.join(' · ')}`,
              action: 'Lihat rekap',
              href: link('rekap', { status: 'all' }),
          }
        : null;
}

/**
 * Rule-based banner, first match wins:
 *  - Super HC with extension requests waiting → link to Perpanjangan;
 *  - KU/KD with a pending request → info, cancel button;
 *  - KU/KD past the deadline with work left → red, "Ajukan perpanjangan" (plus the rejection note if any);
 *  - otherwise open work, toned by how close the deadline is. Hidden when the period is closed or idle.
 */
function alertBanner(state) {
    const { c, d, link } = state,
        host = $('[data-dashboard-alert]'),
        closed = d.cycle?.status === 'closed',
        work = closed ? null : openWork(state),
        x = d.extension,
        pendingRequests = d.extensions?.pending || 0,
        body = node('p', null, 'dashboard-alert-text');
    let tone = 'calm',
        glyph = 'alert',
        action = null;
    if (!closed && c.role === 'hc' && pendingRequests) {
        tone = 'warn';
        body.append(
            node(
                'strong',
                `${fmt(pendingRequests)} permintaan perpanjangan menunggu keputusan.`,
            ),
        );
        action = node('a', 'Tinjau permintaan', 'btn btn-small');
        action.href = link('perpanjangan');
    } else if (!closed && x?.request?.status === 'pending') {
        tone = 'info';
        glyph = 'waiting';
        body.append(
            node('strong', 'Permintaan perpanjangan terkirim. '),
            node(
                'span',
                `Diminta sampai ${dateTime(new Date(wib(x.request.requestedDue)).toISOString())} WIB · menunggu keputusan Super HC.`,
            ),
        );
        action = node('button', 'Batalkan permintaan', 'btn btn-small');
        action.type = 'button';
        action.dataset.extensionCancel = String(x.request.id);
    } else if (work && x?.passed && x.units?.length) {
        // Division window over, but these units were extended: the head can still decide their submissions.
        tone = 'warn';
        body.append(
            node('strong', `Batas persetujuan divisi sudah lewat. `),
            node(
                'span',
                `Pengajuan dari ${x.units.map((u) => `${u.name} (s.d. ${shortDate(new Date(wib(u.due)).toISOString())})`).join(', ')} masih dapat diputuskan.`,
            ),
        );
        action = node('a', 'Buka persetujuan', 'btn btn-small');
        action.href = link('persetujuan', { status: 'Diajukan' });
    } else if (work && x?.passed) {
        tone = 'danger';
        const rejected = x.request?.status === 'rejected' ? x.request : null;
        if (rejected)
            body.append(
                node('strong', 'Perpanjangan tidak disetujui. '),
                node(
                    'span',
                    `“${rejected.note}” — ${rejected.decider || 'Super HC'}. `,
                ),
            );
        body.append(
            node(
                'strong',
                `${DUE_LABEL[x.key]} sudah lewat · ${work.text.replace(/^Penilaian staf: /, '')}. `,
            ),
            node(
                'span',
                c.role === 'kd'
                    ? 'Tanpa perpanjangan, saat periode ditutup pengajuan staf difinalkan otomatis dengan nilai Kepala Unit dan Kepala Unit yang belum dinilai ditandai Tidak dinilai.'
                    : 'Tanpa perpanjangan, penilaian ini ditandai Tidak dinilai saat periode ditutup.',
            ),
        );
        if (x.canRequest) {
            action = node('button', 'Ajukan perpanjangan', 'btn btn-small');
            action.type = 'button';
            action.dataset.extensionOpen = '';
        }
    } else if (work) {
        const step = roleDeadline(state);
        tone = step && step.left > 0 ? dueTone(step.left) : 'calm';
        // The header chip already shows the countdown; the banner only takes its tone.
        body.append(node('strong', work.text));
        action = node('a', work.action, 'btn btn-small');
        action.href = work.href;
    }
    host.hidden = !body.childNodes.length;
    if (host.hidden) {
        host.replaceChildren();
        return;
    }
    host.dataset.tone = tone;
    host.replaceChildren(icon(glyph), body, ...(action ? [action] : []));
}

/**
 * "Ajukan perpanjangan" dialog (KU/KD): facts of the area, quick +3/+7 day choices or a date (capped at the
 * next period's deadline), required reason. Sends POST /extensions and reloads the dashboard.
 */
function extensionDialog(state, reload) {
    const dialog = $('[data-extension-dialog]');
    if (!dialog || !state.d.extension) return;
    const { c, d } = state,
        x = d.extension,
        input = $('[data-extension-due]', dialog),
        reason = $('[data-extension-reason]', dialog),
        error = $('[data-extension-error]', dialog),
        m = d.metrics;
    const local = (ms) => {
        const t = new Date(ms + 7 * 3600000);
        return t.toISOString().slice(0, 16);
    };
    const base = Math.max(Date.now(), wib(x.due));
    const pick = (days) => {
        const target = new Date(base + days * 86400000);
        const value = local(target.getTime()).slice(0, 10) + 'T23:59';
        input.value = value > x.max ? x.max : value;
        for (const b of $$('[data-extension-days]', dialog))
            b.classList.toggle('active', Number(b.dataset.extensionDays) === days);
    };
    $('[data-extension-area]', dialog).textContent = c.actor?.scopeName || '–';
    $('[data-extension-current]', dialog).textContent =
        `${dateTime(new Date(wib(x.due)).toISOString())} WIB`;
    $('[data-extension-work]', dialog).textContent =
        c.role === 'ku'
            ? `${fmt(m.not_started)} belum diisi · ${fmt(m.returned)} dikembalikan`
            : `${fmt(m.kinds?.member?.submitted)} menunggu persetujuan · ${fmt(m.kinds?.unit_head?.not_started)} Kepala Unit belum dinilai`;
    $('[data-extension-max]', dialog).textContent =
        `Paling lambat ${dateTime(new Date(wib(x.max)).toISOString())} WIB (batas periode berikutnya).`;
    input.min = local(Date.now());
    input.max = x.max;
    pick(7);
    reason.value = '';
    error.hidden = true;
    dialog.onclick = (event) => {
        const days = event.target.closest('[data-extension-days]')?.dataset.extensionDays;
        if (days) pick(Number(days));
    };
    input.oninput = () => {
        for (const b of $$('[data-extension-days]', dialog))
            b.classList.remove('active');
    };
    $('[data-extension-form]', dialog).onsubmit = async (event) => {
        event.preventDefault();
        error.hidden = true;
        if (reason.value.trim().length < 20) {
            error.textContent = 'Alasan minimal 20 karakter.';
            error.hidden = false;
            reason.focus();
            return;
        }
        const submit = $('[data-extension-submit]', dialog);
        submit.disabled = true;
        try {
            await c.api.request('/extensions', 'POST', {
                cycle_id: d.cycle.id,
                due: input.value,
                reason: reason.value.trim(),
            });
            dialog.close();
            toast('Permintaan perpanjangan terkirim ke Super HC.');
            reload();
        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    };
    dialog.showModal();
    reason.focus();
}

/** SVG completion ring; the dash offset is the unfinished share. */
function ring(percent) {
    const ns = 'http://www.w3.org/2000/svg',
        svg = document.createElementNS(ns, 'svg'),
        r = 42,
        length = 2 * Math.PI * r;
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'dashboard-ring');
    svg.setAttribute('aria-hidden', 'true');
    for (const [cls, offset] of [
        ['dashboard-ring-track', 0],
        [
            'dashboard-ring-value',
            length * (1 - Math.min(100, percent || 0) / 100),
        ],
    ]) {
        const circle = document.createElementNS(ns, 'circle');
        for (const [key, value] of Object.entries({
            cx: 50,
            cy: 50,
            r,
            class: cls,
            'stroke-dasharray': length,
            'stroke-dashoffset': offset,
        }))
            circle.setAttribute(key, String(value));
        svg.append(circle);
    }
    return svg;
}

/** Bento hero: completion ring beside the status mix of every subject in scope. */
function hero(state) {
    const { c, d, link } = state,
        m = d.metrics,
        tile = node('section', null, 'dashboard-card dashboard-hero'),
        head = node('div', null, 'dashboard-hero-head'),
        figure = node('div', null, 'dashboard-hero-figure'),
        center = node('div', null, 'dashboard-ring-center'),
        side = node('div', null, 'dashboard-hero-side'),
        stack = node('div', null, 'dashboard-hero-stack'),
        legend = node('ul', null, 'dashboard-hero-legend'),
        body = node('div', null, 'dashboard-hero-body'),
        more = node(
            'a',
            c.role === 'ku' ? 'Lihat pengajuan' : 'Lihat progres',
            'link dashboard-hero-link',
        );
    tile.setAttribute('aria-label', 'Ketuntasan periode');
    head.append(
        node('span', 'Ketuntasan', 'dashboard-card-label'),
        node(
            'span',
            m.total
                ? `${fmt(m.final)} dari ${fmt(m.total)} subjek sudah Final`
                : 'Belum ada subjek dalam cakupan',
            'dashboard-hero-sub',
        ),
    );
    center.append(node('strong', pct(m.completion)), node('span', 'Final'));
    figure.append(ring(m.completion), center);
    // A closed period only has Final results and "Tidak dinilai" (everything left unfinished at closing).
    const closed = d.cycle?.status === 'closed',
        parts = closed
            ? [
                  ['final', 'Final', m.final || 0],
                  [
                      'not_started',
                      'Tidak dinilai',
                      (m.not_started || 0) + (m.returned || 0) + (m.submitted || 0),
                  ],
              ]
            : STATUS_ORDER.map((key) => [key, STATUSES[key].label, m[key] || 0]);
    for (const [key, label, value] of parts) {
        const li = node('li'),
            dot = node('i');
        if (value) {
            const seg = node('span');
            seg.dataset.status = key;
            seg.style.flexGrow = String(value);
            stack.append(seg);
        }
        dot.dataset.status = key;
        li.append(dot, node('span', label), node('strong', fmt(value)));
        legend.append(li);
    }
    stack.setAttribute('role', 'img');
    stack.setAttribute(
        'aria-label',
        STATUS_ORDER.map((key) => `${STATUSES[key].label} ${m[key] || 0}`).join(
            ', ',
        ),
    );
    more.href =
        c.role === 'ku'
            ? link('pengajuan', { status: 'all' })
            : '#dashboard-progress';
    side.append(stack, legend);
    body.append(figure, side);
    tile.append(head, body, more);
    return tile;
}

/** Open work gets a warning dot only when non-zero; the card tone stays positional. */
const attention = (value) => Boolean(value);
/** Closed period tiles: average, Final, "Tidak dinilai" (excluded from the average) and the closing date. */
function closedItems(state) {
    const { c, d, link } = state,
        m = d.metrics,
        none = (m.not_started || 0) + (m.returned || 0) + (m.submitted || 0),
        list = { ku: 'pengajuan', kd: 'persetujuan', hc: 'rekap' }[c.role],
        closes = d.cycle.schedule.find((step) => step.key === 'closes');
    return [
        {
            label: 'Final',
            icon: 'average',
            value: fmt(m.final),
            unit: m.total ? `dari ${fmt(m.total)}` : '',
            hint: 'Hasil resmi periode ini',
            href: link(list, { status: 'Final' }),
        },
        {
            label: 'Tidak dinilai',
            icon: 'empty',
            value: fmt(none),
            hint: 'Tidak selesai saat ditutup · dikecualikan dari rerata',
            href: link(list, { status: 'Tidak dinilai' }),
        },
        {
            label: 'Periode ditutup',
            icon: 'waiting',
            value: closes ? shortDate(closes.at) : '–',
            hint: 'Data hanya dapat dibaca',
            href: link(list, { status: 'all' }),
        },
    ];
}

/** Bento: completion hero plus four current-period tiles; no month-to-month comparison. */
function cards(state) {
    const { c, d, link } = state,
        m = d.metrics,
        role = ROLES[c.role];
    const items = [
        {
            label: 'Rerata nilai',
            icon: 'average',
            value: fmt(m.average),
            unit: m.average == null ? '' : '/100',
            hint: m.final
                ? `Dari ${m.final} hasil Final`
                : 'Belum ada hasil Final',
            href: role.report(link),
        },
    ];
    if (d.cycle?.status === 'closed') items.push(...closedItems(state));
    else if (c.role === 'ku')
        items.push(
            {
                label: 'Menunggu Kepala Divisi',
                icon: 'waiting',
                value: fmt(m.submitted),
                hint: 'Sudah Anda ajukan',
                href: link('pengajuan', { status: 'Diajukan' }),
            },
            {
                label: 'Belum diisi',
                icon: 'empty',
                value: fmt(m.not_started),
                hint: 'Staf yang belum dinilai',
                href: link('nilai'),
                attention: attention(m.not_started),
            },
            {
                label: 'Dikembalikan',
                icon: 'returned',
                value: fmt(m.returned),
                hint: 'Perbaiki lalu ajukan ulang',
                href: link('nilai'),
                attention: attention(m.returned),
            },
        );
    else if (c.role === 'kd') {
        const member = m.kinds?.member,
            heads = m.kinds?.unit_head;
        items.push(
            {
                label: 'Menunggu persetujuan',
                icon: 'waiting',
                value: fmt(member?.submitted),
                hint: 'Pengajuan staf dari Kepala Unit',
                href: link('persetujuan', { status: 'Diajukan' }),
                attention: attention(member?.submitted),
            },
            {
                label: 'Kepala Unit belum dinilai',
                icon: 'heads',
                value: fmt(heads?.not_started),
                hint: heads
                    ? `dari ${heads.total} Kepala Unit`
                    : 'Tidak ada Kepala Unit',
                href: link('nilai-kepala'),
                attention: attention(heads?.not_started),
            },
            {
                label: 'Dikembalikan',
                icon: 'returned',
                value: fmt(m.returned),
                hint: 'Menunggu perbaikan Kepala Unit',
                href: link('persetujuan', { status: 'Dikembalikan' }),
            },
        );
    } else
        items.push(
            {
                label: 'Menunggu Kepala Divisi',
                icon: 'waiting',
                value: fmt(m.submitted),
                hint: 'Diajukan Kepala Unit',
                href: link('rekap', { status: 'Diajukan' }),
            },
            {
                label: 'Belum diisi',
                icon: 'empty',
                value: fmt(m.not_started),
                hint: 'Belum dinilai atasan',
                href: link('rekap', { status: 'Belum' }),
                attention: attention(m.not_started),
            },
            {
                label: 'Dikembalikan',
                icon: 'returned',
                value: fmt(m.returned),
                hint: 'Dikembalikan Kepala Divisi',
                href: link('rekap', { status: 'Dikembalikan' }),
                attention: attention(m.returned),
            },
        );
    $('[data-dashboard-cards]').replaceChildren(
        hero(state),
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
                icon(item.icon, 'icon dashboard-card-icon'),
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
    if (!total || !visible('categories')) {
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
                // The legend carries every figure; no tooltip to clip.
                plugins: { tooltip: { enabled: false } },
            },
        },
        `Diagram donat sebaran kategori dari ${fmt(total)} hasil Final: ${items
            .map((item) => `${item.label} ${fmt(item.count)} (${pct(share(item.count, total))})`)
            .join(', ')}.`,
        'Jumlah per kategori tersedia pada daftar di samping diagram.',
    );
}

/** Interval label: lower bound inclusive, upper exclusive except the bin ending at 100, which includes 100. */
const rangeLabel = (bin) =>
    `${bin.lower} hingga ${bin.upper === 100 ? '' : '<'}${bin.upper}`;

/**
 * Final results counted per narrow fixed range (bin_width points) of their
 * raw total score, from one scoped SQL aggregate. Only the occupied extent is
 * drawn: first through last non-empty range, empty ranges inside it kept as
 * real zeros, so every in-range Final result is shown. Bars show counts only;
 * the "Data histogram" table is the text alternative. Final results without a
 * 0–100 score are named in the caption as excluded, never binned.
 */
function histogram(state) {
    const m = state.d.metrics,
        h = state.d.histogram,
        filled = (bin) => bin.count > 0,
        shown = h.total
            ? h.bins.slice(h.bins.findIndex(filled), h.bins.findLastIndex(filled) + 1)
            : [],
        labels = shown.map(rangeLabel),
        host = $('[data-dashboard-chart="histogram"]'),
        empty = $('[data-dashboard-histogram-empty]'),
        excluded = h.excluded
            ? ` ${fmt(h.excluded)} hasil Final tanpa nilai 0–100 tidak dihitung.`
            : '';
    $('[data-dashboard-histogram-caption]').textContent =
        (h.total
            ? `${fmt(h.total)} hasil Final dari ${fmt(m.total)} subjek · interval ${h.bin_width} poin · nilai ${shown[0].lower}–${shown.at(-1).upper}.`
            : m.total
              ? `Belum ada hasil Final${h.excluded ? ' bernilai 0–100' : ''} dari ${fmt(m.total)} subjek.`
              : 'Belum ada subjek dalam cakupan pada periode ini.') + excluded;
    empty.textContent = 'Belum ada hasil Final bernilai 0–100 untuk histogram.';
    empty.hidden = Boolean(h.total);
    $('.dashboard-histogram-data').hidden = !h.total;
    $('[data-dashboard-histogram-rows]').replaceChildren(
        ...shown.map((bin, index) => {
            const tr = node('tr'),
                th = node('th', labels[index]);
            th.scope = 'row';
            tr.append(th, cell(fmt(bin.count), 'Jumlah'));
            return tr;
        }),
    );
    if (!h.total || !visible('histogram')) {
        clearChart(host);
        return;
    }
    const ink = css('--color-muted'),
        line = css('--color-line'),
        font = { size: 12, family: getComputedStyle(document.body).fontFamily };
    draw(
        host,
        {
            type: 'bar',
            data: {
                labels: shown.map((bin) => `${bin.lower}–${bin.upper}`),
                datasets: [
                    {
                        data: shown.map((bin) => bin.count),
                        backgroundColor: css('--dashboard-final'),
                        hoverBackgroundColor: css('--dashboard-final-hover'),
                        borderRadius: 3,
                        barPercentage: 0.9,
                        categoryPercentage: 0.92,
                        maxBarThickness: 40,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                resizeDelay: 80,
                layout: { padding: { top: 4 } },
                // Whole column hover, so empty ranges still report their real 0.
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { color: line },
                        ticks: { color: ink, font, maxRotation: 0, autoSkipPadding: 6 },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: line },
                        border: { display: false },
                        ticks: { color: ink, font, precision: 0, maxTicksLimit: 4 },
                        title: { display: true, text: 'Jumlah hasil Final', color: ink, font },
                    },
                },
                plugins: {
                    tooltip: {
                        displayColors: false,
                        padding: 6,
                        titleFont: font,
                        bodyFont: font,
                        callbacks: {
                            title: (items) => `Nilai ${labels[items[0].dataIndex]}`,
                            label: (item) => `${fmt(item.raw)} hasil Final`,
                        },
                    },
                },
            },
        },
        `Histogram ${fmt(h.total)} hasil Final per rentang nilai: ${shown
            .map((bin, index) => `${labels[index]}: ${fmt(bin.count)}`)
            .join(', ')}.`,
        'Jumlah per rentang nilai tersedia pada tabel Data histogram.',
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
    due(state);
    alertBanner(state);
    cards(state);
    distribution(state);
    histogram(state);
    agenda(state);
    tasks(state);
    progress(state);
    indicators(state);
    activities(state);
}
/** Clears every data host and both charts; safe for errors and no-cycle months. */
function blank(root, message) {
    for (const host of $$('[data-dashboard-due],[data-dashboard-alert]', root)) {
        host.hidden = true;
        host.replaceChildren();
    }
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
    $('[data-dashboard-histogram-caption]', root).textContent = '';
    const histogramEmpty = $('[data-dashboard-histogram-empty]', root);
    histogramEmpty.textContent = message;
    histogramEmpty.hidden = false;
    $('[data-dashboard-histogram-rows]', root).replaceChildren();
    $('.dashboard-histogram-data', root).hidden = true;
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
            // Email link "Ajukan perpanjangan" (?extension=request) opens the dialog once.
            if (
                !askedFromLink &&
                new URLSearchParams(location.search).get('extension') === 'request' &&
                data.extension?.canRequest
            ) {
                askedFromLink = true;
                extensionDialog(root.dashboardState, load);
            }
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
    let askedFromLink = false;
    root.addEventListener('click', async (event) => {
        if (event.target.closest('[data-dashboard-reload]')) load();
        if (event.target.closest('[data-extension-open]') && ready())
            extensionDialog(root.dashboardState, load);
        const cancel = event.target.closest('[data-extension-cancel]');
        if (cancel) {
            cancel.disabled = true;
            try {
                await c.api.request(
                    `/extensions/${cancel.dataset.extensionCancel}/cancel`,
                    'POST',
                    {},
                );
                toast('Permintaan perpanjangan dibatalkan.');
                load();
            } catch (e) {
                toast(e.message, true);
                cancel.disabled = false;
            }
        }
        const view = event.target.closest(
            '.dashboard-distribution-tabs [data-panel-tab]',
        )?.dataset.panelTab;
        if (view)
            try {
                localStorage.setItem(VIEW_KEY, view);
            } catch {}
    });
    document.addEventListener('flow-updated', () => {
        clearTimeout(timer);
        timer = setTimeout(load, 180);
    });
    const redraw = () => {
        if (!ready()) return;
        distribution(root.dashboardState);
        histogram(root.dashboardState);
    };
    // Chart colours are read from CSS tokens, so they redraw on theme change.
    new MutationObserver(redraw).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    // initPanels toggles `hidden` on tab click/arrow keys; the shown view draws
    // once laid out and the hidden one releases its chart.
    const views = new MutationObserver(redraw);
    for (const view of $$('.dashboard-distribution-view', root))
        views.observe(view, { attributes: true, attributeFilter: ['hidden'] });
    let saved = null;
    try {
        saved = localStorage.getItem(VIEW_KEY);
    } catch {}
    if (VIEWS.includes(saved))
        $(`.dashboard-distribution-tabs [data-panel-tab="${saved}"]`, root)?.click();
    setInterval(() => {
        if (!ready()) return;
        agenda(root.dashboardState);
        due(root.dashboardState);
        alertBanner(root.dashboardState);
    }, 60000);
    load();
}
