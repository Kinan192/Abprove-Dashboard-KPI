import { $, node, dateTime, status as badge } from './flow-dom';
import { toast } from './ui';

/**
 * Super HC "Perpanjangan tenggat" page: requests from Kepala Unit / Kepala Divisi, areas past their deadline
 * without a request, direct grants (per area or for everyone) and closing the period. Data from
 * /hc/data/extensions; every decision is a mutation followed by a reload of the overview.
 */
const ROLE = {
    kepala_unit: 'Kepala Unit',
    kepala_divisi: 'Kepala Divisi',
    all: 'Semua',
};
const STATE = {
    pending: ['Diajukan', 'Menunggu'],
    approved: ['Aktif', 'Disetujui'],
    rejected: ['Dikembalikan', 'Ditolak'],
    cancelled: ['Belum', 'Dibatalkan'],
    expired: ['Belum', 'Kedaluwarsa'],
};
const fmt = new Intl.NumberFormat('id-ID');
const short = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(value + ':00+07:00'))
        : '–';
const full = (value) => (value ? `${dateTime(value)} WIB` : '–');
/** WIB "YYYY-MM-DDTHH:mm" of a date `days` after `from` (or now), at 23:59, never past `max`. */
function endOfDay(days, from, max) {
    const base =
        Math.max(Date.now(), from ? Date.parse(from + ':00+07:00') : 0) +
        days * 86400000;
    const value =
        new Date(base + 7 * 3600000).toISOString().slice(0, 10) + 'T23:59';
    return max && value > max ? max : value;
}
const addMinutes = (value, minutes) =>
    new Date(Date.parse(value + ':00+07:00') + minutes * 60000 + 7 * 3600000)
        .toISOString()
        .slice(0, 16);
function workText(role, work = {}) {
    if (role === 'kepala_unit')
        return `${fmt.format(work.not_started || 0)} belum diisi · ${fmt.format(work.returned || 0)} dikembalikan`;
    if (role === 'kepala_divisi')
        return `${fmt.format(work.submitted || 0)} menunggu persetujuan · ${fmt.format(work.heads_not_started || 0)} KU belum dinilai`;
    return 'Seluruh area';
}
function cell(...children) {
    const td = node('td');
    td.append(...children.filter(Boolean));
    return td;
}
const sub = (text) =>
    text ? node('span', text, 'block text-xs text-muted') : null;
function button(label, cls, data) {
    const b = node('button', label, cls);
    b.type = 'button';
    Object.assign(b.dataset, data);
    return b;
}

export function initExtensions(c, s) {
    const root = $('[data-extensions-root]');
    if (!root) return;
    let view = null;
    const month =
        new URLSearchParams(location.search).get('cycle') || s.cycleKey;

    async function load() {
        root.setAttribute('aria-busy', 'true');
        $('[data-ext-error]').hidden = true;
        try {
            const { data } = await c.api.request(
                `/data/extensions?cycle=${encodeURIComponent(month)}`,
            );
            view = data;
            render();
        } catch (e) {
            $('[data-ext-error]').textContent = e.message;
            $('[data-ext-error]').hidden = false;
        } finally {
            root.setAttribute('aria-busy', 'false');
        }
    }

    function render() {
        const { cycle, counts, requests, stuck } = view,
            open = cycle.status === 'open';
        $('[data-ext-caption]').textContent =
            `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(cycle.month + '-01T00:00:00+07:00'))} · batas pengajuan ${short(cycle.submission)}, persetujuan ${short(cycle.approval)}, penutupan ${short(cycle.closes)}${open ? '' : ' · ditutup'}`;
        for (const [key, value] of Object.entries(counts)) {
            const host = $(`[data-ext-count="${key}"]`);
            if (host) host.textContent = fmt.format(value);
        }
        $('[data-ext-grant-all]').hidden = !open;
        $('[data-ext-close]').hidden = !open;
        const running = $('[data-ext-running]');
        running.hidden = !cycle.runningUntil;
        running.textContent = cycle.runningUntil
            ? `Perpanjangan masih berjalan sampai ${full(cycle.runningUntil)}. Periode dapat ditutup setelahnya.`
            : '';
        $('[data-ext-close]').disabled = !!cycle.runningUntil;

        $('[data-ext-requests]').replaceChildren(
            ...(requests.length
                ? requests.map((r) => requestRow(r, open))
                : [
                      emptyRow(
                          7,
                          'Belum ada permintaan perpanjangan pada periode ini.',
                      ),
                  ]),
        );
        $('[data-ext-stuck]').replaceChildren(
            ...(stuck.length
                ? stuck.map((a, index) => stuckRow(a, index, open))
                : [
                      emptyRow(
                          5,
                          open
                              ? 'Tidak ada area yang tertahan.'
                              : 'Periode sudah ditutup; penilaian yang belum selesai menjadi Tidak dinilai.',
                      ),
                  ]),
        );
    }

    function emptyRow(span, text) {
        const tr = node('tr'),
            td = node('td', text, 'empty');
        td.colSpan = span;
        tr.append(td);
        return tr;
    }

    function requestRow(r, open) {
        const tr = node('tr'),
            state = node('span'),
            actions = node('div', null, 'row-actions');
        badge(state, STATE[r.status][0], STATE[r.status][1]);
        if (open && r.status === 'pending')
            actions.append(
                button('Tolak', 'btn btn-small btn-ghost', { extReject: r.id }),
                button('Setujui', 'btn btn-small btn-primary', {
                    extApprove: r.id,
                }),
            );
        const due =
            r.status === 'approved'
                ? [
                      node('strong', `s.d. ${short(r.due)}`),
                      sub(
                          r.approvalDue && r.role === 'kepala_unit'
                              ? `KD s.d. ${short(r.approvalDue)}`
                              : '',
                      ),
                  ]
                : [
                      node(
                          'span',
                          r.requestedDue
                              ? `diminta s.d. ${short(r.requestedDue)}`
                              : '–',
                      ),
                  ];
        const reason = node(
            'span',
            r.reason || (r.direct ? 'Diberikan langsung oleh Super HC.' : '–'),
            'line-clamp-2 text-muted',
        );
        reason.title = r.reason || '';
        tr.append(
            cell(
                node(
                    'strong',
                    r.direct ? r.decider || 'Super HC' : r.requester || '–',
                    'block font-semibold',
                ),
                sub(r.direct ? 'Pemberian langsung' : ROLE[r.role]),
            ),
            cell(
                node('span', r.area),
                sub(r.role === 'all' ? '' : ROLE[r.role]),
            ),
            cell(...due),
            cell(node('span', workText(r.role, r.work))),
            cell(
                reason,
                sub(
                    r.note && r.status !== 'pending'
                        ? `Catatan: ${r.note}`
                        : '',
                ),
            ),
            cell(state),
            cell(actions),
        );
        tr.cells[4].classList.add('max-w-[280px]');
        tr.cells[2].classList.add('whitespace-nowrap');
        return tr;
    }

    function stuckRow(a, index, open) {
        const tr = node('tr'),
            actions = node('div', null, 'row-actions');
        if (open)
            actions.append(
                button('Beri perpanjangan', 'btn btn-small', {
                    extGrant: index,
                }),
            );
        tr.append(
            cell(
                node('span', a.area),
                sub(a.role === 'kepala_unit' ? a.parent : 'Divisi'),
            ),
            cell(node('span', a.head || '–'), sub(ROLE[a.role])),
            cell(node('span', `lewat · ${short(a.due)}`, 'text-danger')),
            cell(node('span', workText(a.role, a.work))),
            cell(actions),
        );
        return tr;
    }

    // ---- Approve / grant ------------------------------------------------------------------------------------
    const approveDialog = $('[data-ext-approve-dialog]'),
        dueInput = $('[data-ext-due]'),
        approvalInput = $('[data-ext-approval]');
    let target = null,
        approvalTouched = false;
    function facts(rows) {
        $('[data-ext-approve-facts]').replaceChildren(
            ...rows.flatMap(([label, value]) => [
                node('dt', label),
                node('dd', value),
            ]),
        );
    }
    function openApprove(next) {
        target = next;
        approvalTouched = false;
        const { cycle } = view,
            division = next.role === 'kepala_divisi',
            max = division ? cycle.approvalMax : cycle.max;
        $('[data-ext-approve-title]').textContent =
            next.mode === 'approve'
                ? 'Setujui perpanjangan'
                : next.role === 'all'
                  ? 'Perpanjang semua area'
                  : 'Beri perpanjangan';
        $('[data-ext-approve-submit]').textContent =
            next.mode === 'approve'
                ? 'Setujui perpanjangan'
                : 'Beri perpanjangan';
        $('[data-ext-due-label]').textContent =
            next.role === 'all'
                ? 'Batas pengajuan baru (semua Kepala Unit)'
                : division
                  ? 'Batas persetujuan baru'
                  : 'Tenggat baru Kepala Unit';
        $('[data-ext-due-help]').textContent =
            `Paling lambat ${full(max)} (batas periode berikutnya).`;
        $('[data-ext-approval-wrap]').hidden = division;
        facts(next.facts);
        dueInput.max = max;
        dueInput.value = next.requestedDue || endOfDay(7, next.currentDue, max);
        approvalInput.max = cycle.approvalMax;
        syncApproval();
        $('[data-ext-note]').value = '';
        $('[data-ext-approve-error]').hidden = true;
        approveDialog.showModal();
        dueInput.focus();
    }
    function syncApproval() {
        if (approvalTouched || !dueInput.value) return;
        const value = addMinutes(dueInput.value, view.cycle.gapMinutes);
        approvalInput.value =
            value > view.cycle.approvalMax ? view.cycle.approvalMax : value;
    }
    dueInput.addEventListener('input', syncApproval);
    approvalInput.addEventListener('input', () => (approvalTouched = true));
    $('[data-ext-approve-form]').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = $('[data-ext-approve-error]'),
            submit = $('[data-ext-approve-submit]'),
            division = target.role === 'kepala_divisi',
            body = {
                due: dueInput.value,
                approval_due: division ? null : approvalInput.value || null,
                note: $('[data-ext-note]').value.trim() || null,
            };
        submit.disabled = true;
        error.hidden = true;
        try {
            if (target.mode === 'approve')
                await c.api.request(
                    `/extensions/${target.id}/approve`,
                    'POST',
                    body,
                );
            else
                await c.api.request('/extensions/grant', 'POST', {
                    ...body,
                    cycle_id: view.cycle.id,
                    role: target.role,
                    division_id: target.divisionId,
                    unit_id: target.unitId,
                });
            approveDialog.close();
            toast(
                target.mode === 'approve'
                    ? 'Perpanjangan disetujui.'
                    : 'Perpanjangan diberikan.',
            );
            load();
        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    });

    // ---- Reject ---------------------------------------------------------------------------------------------
    const rejectDialog = $('[data-ext-reject-dialog]');
    $('[data-ext-reject-form]').addEventListener('submit', async (event) => {
        event.preventDefault();
        const note = $('[data-ext-reject-note]'),
            error = $('[data-ext-reject-error]'),
            submit = $('[data-ext-reject-submit]');
        if (!note.value.trim()) {
            error.textContent = 'Alasan penolakan wajib diisi.';
            error.hidden = false;
            note.focus();
            return;
        }
        submit.disabled = true;
        try {
            await c.api.request(`/extensions/${target.id}/reject`, 'POST', {
                note: note.value.trim(),
            });
            rejectDialog.close();
            toast('Permintaan ditolak.');
            load();
        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
        } finally {
            submit.disabled = false;
        }
    });

    // ---- Close period ---------------------------------------------------------------------------------------
    const closeDialog = $('[data-ext-close-dialog]'),
        confirm = $('[data-ext-close-confirm]');
    confirm.addEventListener(
        'change',
        () => ($('[data-ext-close-submit]').disabled = !confirm.checked),
    );
    $('[data-ext-close-form]').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = $('[data-ext-close-error]'),
            submit = $('[data-ext-close-submit]');
        submit.disabled = true;
        try {
            const result = await c.api.request(
                `/cycles/${view.cycle.id}/close`,
                'POST',
                {},
            );
            closeDialog.close();
            toast(
                `Periode ditutup · ${fmt.format(result.data?.auto_finalized || 0)} penilaian difinalkan otomatis.`,
            );
            setTimeout(() => location.reload(), 900);
        } catch (e) {
            error.textContent = e.message;
            error.hidden = false;
            submit.disabled = false;
        }
    });

    root.addEventListener('click', (event) => {
        const approve = event.target.closest('[data-ext-approve]'),
            reject = event.target.closest('[data-ext-reject]'),
            grant = event.target.closest('[data-ext-grant]');
        if (approve) {
            const r = view.requests.find(
                (x) => x.id === Number(approve.dataset.extApprove),
            );
            openApprove({
                mode: 'approve',
                id: r.id,
                role: r.role,
                requestedDue: r.requestedDue,
                facts: [
                    ['Pemohon', `${r.requester} · ${ROLE[r.role]}`],
                    ['Area', r.area],
                    ['Diminta sampai', full(r.requestedDue)],
                    ['Belum selesai', workText(r.role, r.work)],
                ],
            });
        }
        if (reject) {
            const r = view.requests.find(
                (x) => x.id === Number(reject.dataset.extReject),
            );
            target = { id: r.id };
            $('[data-ext-reject-summary]').textContent =
                `${r.requester} · ${r.area} · diminta s.d. ${full(r.requestedDue)}`;
            $('[data-ext-reject-impact]').textContent =
                r.role === 'kepala_divisi'
                    ? 'Saat periode ditutup, pengajuan staf di divisi ini difinalkan otomatis dengan nilai Kepala Unit dan Kepala Unit yang belum dinilai ditandai Tidak dinilai.'
                    : `${workText(r.role, r.work)} di area ini akan ditandai Tidak dinilai saat periode ditutup.`;
            $('[data-ext-reject-note]').value = '';
            $('[data-ext-reject-error]').hidden = true;
            rejectDialog.showModal();
        }
        if (grant) {
            const a = view.stuck[Number(grant.dataset.extGrant)];
            openApprove({
                mode: 'grant',
                role: a.role,
                unitId: a.unitId,
                divisionId: a.divisionId,
                currentDue: a.due,
                facts: [
                    [
                        'Area',
                        `${a.area}${a.role === 'kepala_unit' ? ` · ${a.parent}` : ''}`,
                    ],
                    ['Penanggung jawab', `${a.head || '–'} · ${ROLE[a.role]}`],
                    ['Tenggat saat ini', full(a.due)],
                    ['Belum selesai', workText(a.role, a.work)],
                ],
            });
        }
        if (event.target.closest('[data-ext-grant-all]'))
            openApprove({
                mode: 'grant',
                role: 'all',
                currentDue: view.cycle.submission,
                facts: [
                    ['Cakupan', 'Semua Kepala Unit dan Kepala Divisi'],
                    ['Batas pengajuan saat ini', full(view.cycle.submission)],
                    ['Batas persetujuan saat ini', full(view.cycle.approval)],
                ],
            });
        if (event.target.closest('[data-ext-close]')) {
            const p = view.close;
            $('[data-ext-close-title]').textContent =
                `Tutup periode ${$('[data-ext-caption]').textContent.split(' · ')[0]}`;
            $('[data-ext-close-final]').textContent = fmt.format(
                p.final + p.autoFinal,
            );
            $('[data-ext-close-none]').textContent = fmt.format(p.notAssessed);
            $('[data-ext-close-auto]').textContent = fmt.format(p.autoFinal);
            $('[data-ext-close-returned]').textContent = fmt.format(p.returned);
            $('[data-ext-close-empty]').textContent = fmt.format(p.notStarted);
            $('[data-ext-close-confirm-text]').textContent =
                `Saya mengerti ${fmt.format(p.autoFinal)} penilaian difinalkan otomatis dan ${fmt.format(p.notAssessed)} ditandai Tidak dinilai.`;
            confirm.checked = false;
            $('[data-ext-close-submit]').disabled = true;
            $('[data-ext-close-error]').hidden = true;
            closeDialog.showModal();
        }
    });

    load();
}
