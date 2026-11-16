import {
    $,
    $$,
    node,
    text,
    optionList,
    labelCycle,
    empty,
    status,
} from './flow-dom';
import { toast } from './ui';
import { paginate } from './pagination';
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
    function team() {
        const root = $('[data-team-structure]');
        if (!root) return;
        const select = $('[data-team-unit]'),
            old = select?.value;
        const units = s.scopedUnits();
        optionList(select, units, 'Pilih unit');
        const unitId = units.some((u) => u.id === old)
            ? old
            : units[0]?.id || '';
        if (select) select.value = unitId;
        const unit = s.unit(unitId);
        root.replaceChildren();
        const summary = $('[data-team-summary]');
        summary.replaceChildren();
        if (unit) {
            summary.append(
                node('h2', unit.name, 'section-title'),
                node(
                    'p',
                    `Kepala Unit: ${s.account(unit.headId)?.name} / Divisi: ${s.division(unit.divisionId)?.name}`,
                    'mt-2 text-xs text-muted',
                ),
            );
            for (const p of s
                .people('member')
                .filter((p) => p.unitId === unit.id)) {
                const tr = node('tr'),
                    name = node('td');
                name.append(
                    node('strong', p.name, 'block font-semibold'),
                    node('p', p.nip, 'mt-1 text-xs text-muted'),
                );
                const action = node('td'),
                    a = node('a', 'Buka penilaian', 'link');
                a.href = link(c.role === 'ku' ? 'nilai' : 'persetujuan', {
                    person: p.id,
                });
                action.append(a);
                const assessmentStatus = node('td'),
                    assessmentBadge = node('span', '', '');
                status(assessmentBadge, s.assessment(p.id).status);
                assessmentStatus.append(assessmentBadge);
                tr.append(name, node('td', p.job), assessmentStatus, action);
                root.append(tr);
            }
        }
        if (!root.childElementCount) {
            const tr = node('tr'),
                td = node('td', 'Belum ada staf di unit ini.', 'empty');
            td.colSpan = 4;
            tr.append(td);
            root.append(tr);
        }
        paginate(root, 'team', { token: unitId });
    }
    const notificationState = { page: 1, perPage: 10 };
    let notificationRequest;
    function notificationRow(n) {
        const row = node('a', null, 'block p-4 hover:bg-subtle');
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
                not_started: 'Belum diisi',
            }[n.status] || n.status;
        row.append(
            node('strong', n.name, 'block text-sm font-semibold'),
            node(
                'p',
                `${n.kind === 'member' ? 'Staf' : 'Kepala Unit'} · ${state}`,
                'mt-1 text-xs text-muted',
            ),
        );
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
            // The drawer shows the server preview; the notification page lists every task.
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
    function exportSummary() {
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
    function render() {
        navCounts();
        team();
        notifications();
        exportSummary();
    }
    document.addEventListener('flow-updated', render);
    document.addEventListener('flow-filtered', exportSummary);
    $('[data-flow-export-scope]')?.addEventListener('change', exportSummary);
    $('[data-team-unit]')?.addEventListener('change', team);
    document.addEventListener('click', async (e) => {
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'download-export') {
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
