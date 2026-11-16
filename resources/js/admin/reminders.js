import { $, $$, confirm, toast } from '../abprove/ui';
import { node, field } from '../abprove/flow-dom';
import { ROLE_LABELS, monthLabel } from './labels';

const STATUS_LABELS = { planned: 'direncanakan', open: 'dibuka', closed: 'ditutup' };

function workload(recipient) {
    return recipient.role === 'kepala_unit'
        ? `${recipient.pending} dari ${recipient.total} staf belum diajukan · ${recipient.secondary} dikembalikan`
        : `${recipient.secondary} menunggu persetujuan · ${recipient.pending} dari ${recipient.total} Kepala Unit belum dinilai`;
}

export async function initReminders(config) {
    const { api } = config;
    const form = $('#reminder-form');
    const tbody = $('[data-recipient-rows]');
    const sendButton = $('[data-reminder-send]');
    const selectAll = $('[data-recipient-all]');
    let recipients = [];
    let controller = null;

    function defaults() {
        const cycle = field(form, 'cycle_id').selectedOptions[0]?.dataset.month;
        const period = cycle ? monthLabel(cycle) : '';
        field(form, 'subject').value = `Pengingat penilaian KPI ${period}`.trim();
        field(form, 'message').value =
            field(form, 'target').value === 'division_heads_pending'
                ? `Mohon segera meninjau dan menyetujui penilaian KPI periode ${period} serta melengkapi nilai Kepala Unit sebelum batas waktu.`
                : `Mohon segera melengkapi dan mengajukan penilaian KPI staf periode ${period} sebelum batas waktu pengajuan.`;
    }

    function selected() {
        return $$('[data-recipient]:checked', tbody).map((box) => Number(box.value));
    }
    function sync() {
        const count = selected().length;
        $('[data-selected-count]').textContent = count;
        sendButton.disabled = count === 0;
        const boxes = $$('[data-recipient]:not(:disabled)', tbody);
        selectAll.checked = boxes.length > 0 && boxes.every((box) => box.checked);
    }

    function render() {
        const deliverable = recipients.filter((r) => r.deliverable).length;
        $('[data-recipient-summary]').textContent = recipients.length
            ? `${recipients.length} penerima sesuai kriteria · ${deliverable} dapat dikirimi email.`
            : 'Tidak ada penerima: semua pekerjaan pada kriteria ini sudah selesai.';
        tbody.replaceChildren(
            ...recipients.map((recipient) => {
                const tr = node('tr');
                const pick = node('td');
                const box = node('input');
                Object.assign(box, { type: 'checkbox', value: recipient.user_id, checked: recipient.deliverable, disabled: !recipient.deliverable });
                box.className = 'size-4 accent-primary';
                box.dataset.recipient = '';
                box.setAttribute('aria-label', `Pilih ${recipient.name}`);
                pick.append(box);
                const email = node('td');
                email.append(node('span', recipient.email || 'Tanpa email', 'block'));
                if (recipient.opted_out) email.append(node('span', 'Email pengingat dimatikan di profil', 'text-xs text-muted'));
                tr.append(
                    pick,
                    node('td', recipient.name),
                    node('td', ROLE_LABELS[recipient.role]),
                    node('td', recipient.area || '-'),
                    node('td', workload(recipient)),
                    node('td', recipient.due_at || '-'),
                    email,
                );
                return tr;
            }),
        );
        sync();
    }

    async function preview() {
        const cycle = field(form, 'cycle_id').value;
        if (!cycle) return;
        controller?.abort();
        controller = new AbortController();
        tbody.setAttribute('aria-busy', 'true');
        try {
            const params = new URLSearchParams({ cycle_id: cycle, target: field(form, 'target').value });
            recipients = (await api.request(`/data/reminders/preview?${params}`, 'GET', null, { signal: controller.signal })).data;
            render();
        } catch (error) {
            if (error.name !== 'AbortError') toast(error.message, true);
        } finally {
            tbody.removeAttribute('aria-busy');
        }
    }

    const { data: cycles } = await api.request('/data/reminders/cycles');
    const cycleSelect = field(form, 'cycle_id');
    cycleSelect.replaceChildren(
        ...cycles.map((cycle) => {
            const option = new Option(`${monthLabel(cycle.month)} · ${STATUS_LABELS[cycle.status] || cycle.status}`, cycle.id);
            option.dataset.month = cycle.month;
            option.disabled = cycle.status === 'closed';
            return option;
        }),
    );
    const firstOpen = cycles.find((cycle) => cycle.status === 'open') || cycles.find((cycle) => cycle.status !== 'closed');
    if (firstOpen) cycleSelect.value = firstOpen.id;
    else $('[data-recipient-summary]').textContent = 'Belum ada periode yang terbuka.';

    for (const name of ['cycle_id', 'target'])
        field(form, name).addEventListener('change', () => {
            defaults();
            preview();
        });
    tbody.addEventListener('change', sync);
    selectAll.addEventListener('change', () => {
        $$('[data-recipient]:not(:disabled)', tbody).forEach((box) => (box.checked = selectAll.checked));
        sync();
    });
    sendButton.addEventListener('click', async () => {
        if (!form.reportValidity()) return;
        const ids = selected();
        const ok = await confirm(`Kirim email pengingat ke ${ids.length} penerima?`, { label: 'Kirim email' });
        if (!ok) return;
        api.perform(form, async () => {
            const result = await api.request('/reminders', 'POST', {
                cycle_id: Number(field(form, 'cycle_id').value),
                target: field(form, 'target').value,
                user_ids: ids,
                subject: field(form, 'subject').value.trim(),
                message: field(form, 'message').value.trim(),
            });
            toast(`${result.data.queued} email pengingat diproses. Lihat status di Log sistem → Email pengingat.`);
        });
    });
    defaults();
    preview();
}
