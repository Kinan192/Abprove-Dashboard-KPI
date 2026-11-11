import {
    $,
    $$,
    node,
    text,
    optionList,
    number,
    labelCycle,
    dateTime,
    empty,
} from './flow-dom';
import { open, toast } from './ui';
import { XL } from './xlsx';
import { previousMonth } from './flow-store';
export function initFlowReports(c, s, a, link) {
    const year = s.cycleKey.slice(0, 4),
        months = Array.from(
            { length: 12 },
            (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
        );
    function filteredPeople(key = s.cycleKey) {
        return a.filtered(key, true);
    }
    function analytics() {
        if (!$('[data-flow-analytics]')) return;
        const rows = filteredPeople(),
            values = rows.map((p) => s.total(p.id)).filter((x) => x != null),
            avg = values.length
                ? values.reduce((n, x) => n + x, 0) / values.length
                : null;
        const before = filteredPeople(previousMonth(s.cycleKey))
                .map((p) => s.total(p.id, previousMonth(s.cycleKey)))
                .filter((x) => x != null),
            previous = before.length
                ? before.reduce((n, x) => n + x, 0) / before.length
                : null;
        const metrics = {
            average: number(avg),
            final: rows.length,
            excellent: rows.filter((p) => s.category(p.id).key === 'excellent')
                .length,
            change:
                avg != null && previous != null && previous !== 0
                    ? `${number(((avg - previous) / previous) * 100)}%`
                    : '-',
        };
        $$('[data-analytic]').forEach(
            (e) => (e.textContent = metrics[e.dataset.analytic]),
        );
        const head = $('[data-matrix-head]');
        head.replaceChildren();
        const hr = node('tr');
        hr.append(node('th', 'Nama / jenis'));
        months.forEach((m) =>
            hr.append(
                node('th', labelCycle(m).split(' ')[0].slice(0, 3), 'numeric'),
            ),
        );
        head.append(hr);
        const body = $('[data-matrix-body]');
        body.replaceChildren();
        const broad = s.people().filter((p) => {
            const vars = Object.fromEntries(
                $$('[data-filter]').map((e) => [e.dataset.filter, e.value]),
            );
            return (
                (!vars.unit || p.unitId === vars.unit) &&
                (!vars.division || p.divisionId === vars.division) &&
                (!vars.type || p.type === vars.type) &&
                (!vars.search ||
                    `${p.name} ${p.nip}`
                        .toLowerCase()
                        .includes(vars.search.toLowerCase()))
            );
        });
        for (const p of broad) {
            const tr = node('tr'),
                td = node('td');
            td.append(
                node('strong', p.name, 'block font-semibold'),
                node(
                    'span',
                    p.type === 'member' ? 'Staf' : 'Kepala Unit',
                    'block text-xs text-muted',
                ),
            );
            tr.append(td);
            months.forEach((m) => {
                const cell = node('td', null, 'numeric'),
                    valid = filteredPeople(m).some((x) => x.id === p.id);
                if (valid) {
                    const b = node(
                        'button',
                        number(s.total(p.id, m)),
                        'heat-cell heat-mid',
                    );
                    b.type = 'button';
                    b.dataset.reviewPerson = p.id;
                    b.dataset.reviewCycle = m;
                    b.setAttribute(
                        'aria-label',
                        `${p.name}, ${labelCycle(m)}, nilai ${number(s.total(p.id, m))}`,
                    );
                    cell.append(b);
                } else cell.textContent = '-';
                tr.append(cell);
            });
            body.append(tr);
        }
        if (!broad.length) {
            const tr = node('tr'),
                td = node('td', 'Tidak ada hasil sesuai filter.', 'empty');
            td.colSpan = 13;
            tr.append(td);
            body.append(tr);
        }
        const group = $('[data-flow-series]');
        group.replaceChildren();
        let segment = [];
        const segments = [];
        months.forEach((m, i) => {
            const vals = filteredPeople(m)
                .map((p) => s.total(p.id, m))
                .filter((v) => v != null);
            if (!vals.length) {
                if (segment.length) segments.push(segment);
                segment = [];
                return;
            }
            const average = vals.reduce((n, v) => n + v, 0) / vals.length;
            segment.push(`${10 + (i * 780) / 11},${170 - average * 1.5}`);
        });
        if (segment.length) segments.push(segment);
        for (const points of segments) {
            const line = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'polyline',
            );
            line.setAttribute('points', points.join(' '));
            line.setAttribute('stroke', 'var(--color-primary)');
            line.setAttribute('stroke-width', '2.5');
            line.setAttribute('fill', 'none');
            group.append(line);
        }
        const labels = $('[data-chart-months]');
        labels.replaceChildren();
        months.forEach((m) =>
            labels.append(node('span', labelCycle(m).slice(0, 3))),
        );
        const rank = $('[data-ranking]');
        rank.replaceChildren();
        const groups = Map.groupBy(
            rows,
            (p) => `${p.type}|${s.template(p)?.id}`,
        );
        for (const group of groups.values()) {
            const panel = node('section', null, 'card p-5');
            panel.append(
                node('h3', s.template(group[0]).name, 'section-title'),
                node(
                    'p',
                    `${group[0].type === 'member' ? 'Staf' : 'Kepala Unit'} · versi ${s.template(group[0]).version}`,
                    'mt-1 mb-4 text-xs text-muted',
                ),
            );
            group
                .sort((x, y) => s.total(y.id) - s.total(x.id))
                .forEach((p, i) => {
                    const b = node(
                        'button',
                        `${i + 1}. ${p.name} · ${number(s.total(p.id))}`,
                        'block w-full border-b border-line py-3 text-left text-sm',
                    );
                    b.type = 'button';
                    b.dataset.reviewPerson = p.id;
                    panel.append(b);
                });
            rank.append(panel);
        }
        if (!rank.childElementCount)
            empty(rank, 'Belum ada hasil Final untuk diperingkatkan.');
    }
    function home() {
        const people = s.people(),
            counts = { total: people.length };
        people.forEach((p) => {
            const status = s.assessment(p.id).status;
            counts[status] = (counts[status] || 0) + 1;
        });
        $$('[data-metric]').forEach(
            (e) => (e.textContent = counts[e.dataset.metric] || 0),
        );
        $$('[data-nav-count]').forEach((e) => {
            const key = e.dataset.navCount;
            const value =
                key === 'nilai'
                    ? (counts.Belum || 0) + (counts.Dikembalikan || 0)
                    : key === 'persetujuan'
                      ? people.filter(
                            (p) =>
                                p.type === 'member' &&
                                s.assessment(p.id).status === 'Diajukan',
                        ).length
                      : key === 'pengajuan'
                        ? counts.Dikembalikan || 0
                        : counts.Final || 0;
            e.textContent = value || '';
            e.hidden = !value;
        });
        const root = $('[data-home-tasks]');
        if (!root) return;
        root.replaceChildren();
        if (c.role === 'hc') {
            for (const u of s.scopedUnits()) {
                const persons = people.filter((p) => p.unitId === u.id),
                    complete = persons.filter(
                        (p) => s.assessment(p.id).status === 'Final',
                    ).length;
                const div = node(
                    'div',
                    null,
                    'flex flex-wrap items-center gap-4 p-5',
                );
                div.append(
                    node(
                        'div',
                        `${u.name} · ${s.account(u.headId)?.name || 'belum ada kepala'}`,
                        'grow text-sm font-semibold',
                    ),
                    node(
                        'span',
                        `${complete}/${persons.length} Final`,
                        'text-sm text-muted',
                    ),
                );
                const b = node('button', 'Catat pengingat', 'link');
                b.type = 'button';
                b.dataset.remindUnit = u.id;
                div.append(b);
                root.append(div);
            }
        } else {
            const tasks = people.filter((p) =>
                c.role === 'ku'
                    ? ['Belum', 'Dikembalikan'].includes(
                          s.assessment(p.id).status,
                      )
                    : p.type === 'member' &&
                      s.assessment(p.id).status === 'Diajukan',
            );
            for (const p of tasks) {
                const ael = node('a', null, 'block p-5 hover:bg-subtle');
                ael.href = link(c.role === 'ku' ? 'nilai' : 'persetujuan', {
                    person: p.id,
                });
                ael.append(
                    node('strong', p.name, 'block font-semibold'),
                    node(
                        'p',
                        `${s.assessment(p.id).status === 'Belum' ? 'Belum diisi' : s.assessment(p.id).status} · ${p.unitName}`,
                        'mt-1 text-xs text-muted',
                    ),
                );
                if (s.assessment(p.id).reason)
                    ael.append(
                        node(
                            'p',
                            s.assessment(p.id).reason,
                            'mt-2 text-sm text-warning',
                        ),
                    );
                root.append(ael);
            }
        }
        if (!root.childElementCount)
            empty(
                root,
                'Tidak ada tugas pada kategori ini. Periksa penilaian Kepala Unit jika Anda adalah KD.',
            );
        const heads = s.people('unit_head');
        text(
            document,
            '[data-head-progress]',
            `${heads.filter((p) => s.assessment(p.id).status === 'Final').length}/${heads.length} Kepala Unit sudah Final; ${heads.filter((p) => s.assessment(p.id).status !== 'Final').length} masih perlu diselesaikan.`,
        );
    }
    function team() {
        const root = $('[data-team-structure]');
        if (!root) return;
        root.replaceChildren();
        for (const u of s.scopedUnits()) {
            const panel = node('section', null, 'card p-5');
            panel.append(
                node('h2', u.name, 'section-title'),
                node(
                    'p',
                    `Divisi ${s.division(u.divisionId)?.name} · Kepala Unit ${s.account(u.headId)?.name}`,
                    'mt-2 text-sm text-muted',
                ),
            );
            for (const p of s
                .people('member')
                .filter((p) => p.unitId === u.id)) {
                const a = node(
                    'a',
                    `${p.name} · ${p.job} · ${s.assessment(p.id).status === 'Belum' ? 'Belum diisi' : s.assessment(p.id).status}`,
                    'block border-t border-line py-3 mt-3 text-sm',
                );
                a.href = link(c.role === 'ku' ? 'nilai' : 'persetujuan', {
                    person: p.id,
                });
                panel.append(a);
            }
            root.append(panel);
        }
        if (!root.childElementCount)
            empty(root, 'Belum ada unit dalam cakupan akun ini.');
    }
    function notifications() {
        const tasks = s
            .people()
            .filter((p) =>
                c.role === 'ku'
                    ? s.assessment(p.id).status === 'Dikembalikan'
                    : c.role === 'kd'
                      ? p.type === 'member'
                          ? s.assessment(p.id).status === 'Diajukan'
                          : s.assessment(p.id).status === 'Belum'
                      : s.assessment(p.id).status !== 'Final',
            );
        for (const root of [
            $('[data-notification-list]'),
            $('[data-notification-page]'),
        ].filter(Boolean)) {
            root.replaceChildren();
            for (const p of tasks) {
                const a = node('a', null, 'block p-4 hover:bg-subtle');
                a.href = link(
                    c.role === 'ku'
                        ? 'nilai'
                        : c.role === 'kd' && p.type === 'unit_head'
                          ? 'nilai-kepala'
                          : c.role === 'kd'
                            ? 'persetujuan'
                            : 'rekap',
                    { person: p.id },
                );
                a.append(
                    node('strong', p.name, 'block text-sm font-semibold'),
                    node(
                        'p',
                        `${p.type === 'member' ? 'Staf' : 'Kepala Unit'} · ${s.assessment(p.id).status === 'Belum' ? 'Belum diisi' : s.assessment(p.id).status}`,
                        'mt-1 text-xs text-muted',
                    ),
                );
                root.append(a);
            }
            if (!tasks.length)
                empty(root, 'Tidak ada tugas yang perlu ditindaklanjuti.');
        }
        $$('[data-notification-count]').forEach((e) => {
            e.textContent = tasks.length;
            e.hidden =
                !tasks.length ||
                s.data.read.includes(`${s.actor.id}|${s.cycleKey}`);
        });
    }
    function exportSummary() {
        const filtered = $('[data-flow-export-scope]')?.value === 'filtered',
            rows = filtered
                ? a.filtered(s.cycleKey, !!$('[data-flow-analytics]'))
                : s.people();
        text(
            document,
            '[data-export-summary]',
            `${rows.length} orang · ${labelCycle(s.cycleKey)} · ${filtered ? 'mengikuti filter layar' : 'seluruh cakupan akun'} · data contoh lokal`,
        );
        return rows;
    }
    function download() {
        const rows = exportSummary();
        const summary = {
            name: 'Rekap',
            cols: [30, 18, 28, 30, 20, 18, 16, 18, 35, 35],
            rows: [
                ['DATA CONTOH LOKAL - KPI Kinerja'],
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
    function render() {
        home();
        team();
        notifications();
        analytics();
        exportSummary();
    }
    document.addEventListener('flow-updated', render);
    document.addEventListener('flow-filtered', render);
    $('[data-flow-export-scope]')?.addEventListener('change', exportSummary);
    document.addEventListener('click', (e) => {
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'download-export') download();
        if (action === 'read-notifications') {
            s.data.read.push(`${s.actor.id}|${s.cycleKey}`);
            s.save('Tandai notifikasi dibaca', s.cycleKey);
            toast('Notifikasi lokal ditandai dibaca.');
        }
        const r = e.target.closest('[data-remind-unit]');
        if (r) {
            s.save(
                'Catat pengingat',
                `Unit ${s.unit(r.dataset.remindUnit).name}; tidak ada pesan dikirim.`,
            );
            toast('Pengingat dicatat lokal. Tidak ada pesan yang dikirim.');
        }
    });
    const templates = [
        ...new Map(
            s
                .people()
                .flatMap((p) => months.map((m) => s.template(p, m)))
                .filter(Boolean)
                .map((k) => [k.id, k]),
        ).values(),
    ].map((k) => ({ id: k.id, name: `${k.name} · versi ${k.version}` }));
    optionList(
        $('[data-filter="template"]'),
        templates,
        'Semua versi KPI (peringkat per kelompok)',
    );
    render();
    if (c.state === 'export') open('export-dialog');
}
