import { $, $$, open } from '../abprove/ui';
import { node, status } from '../abprove/flow-dom';
import { activityLabel } from '../abprove/activity-labels';
import { remoteTable } from './remote-table';
import { ROLE_LABELS, when, monthLabel } from './labels';

const LOGIN_EVENTS = {
    login: ['Final', 'Login berhasil'],
    failed: ['Dikembalikan', 'Login gagal'],
    logout: ['Belum', 'Keluar'],
};
const EMAIL_STATUS = {
    sent: ['Final', 'Terkirim'],
    failed: ['Dikembalikan', 'Gagal'],
    queued: ['Diajukan', 'Antre'],
};

function badge(value, label) {
    const cell = node('td');
    const span = node('span');
    status(span, value, label);
    cell.append(span);
    return cell;
}

function row(...cells) {
    const tr = node('tr');
    tr.append(...cells.map((cell) => (cell instanceof Node ? cell : node('td', cell ?? '-'))));
    return tr;
}

const renderers = {
    audit: (event) => {
        const detail = node('td');
        const button = node('button', 'Lihat', 'link v2-row-action');
        button.type = 'button';
        button.dataset.auditOpen = event.id;
        detail.append(button);
        return row(
            when(event.recorded_at),
            event.actor_name || 'Sistem',
            ROLE_LABELS[event.actor_role_key] || '-',
            activityLabel(event.action),
            [event.summary, event.reason].filter(Boolean).join(' · ') || `${event.subject_type} #${event.subject_id}`,
            detail,
        );
    },
    login: (event) => {
        const account = node('td');
        if (event.user_name) account.append(node('strong', event.user_name, 'block'), node('span', ROLE_LABELS[event.role_key] || '-', 'text-xs text-muted'));
        else account.append(node('span', 'Tidak dikenal', 'text-muted'));
        return row(
            when(event.occurred_at),
            account,
            event.identifier,
            badge(...(LOGIN_EVENTS[event.event] || ['Belum', event.event])),
            node('td', event.ip_address || '-', 'num'),
            node('td', event.user_agent || '-', 'admin-ellipsis'),
        );
    },
    email: (mail) => {
        const state = badge(...(EMAIL_STATUS[mail.status] || ['Belum', mail.status]));
        if (mail.error) state.title = mail.error;
        const recipient = node('td');
        recipient.append(node('strong', mail.recipient_name, 'block'), node('span', `${mail.recipient_email} · ${ROLE_LABELS[mail.recipient_role] || ''}`, 'text-xs text-muted'));
        return row(when(mail.created_at), recipient, monthLabel(mail.assessment_month), mail.subject, state, mail.sender_name);
    },
};

function describe(value) {
    if (value === null || value === undefined || value === '') return '-';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function initLogs(config) {
    const root = $('[data-admin-logs]');
    const tables = new Map();
    for (const panel of $$('[data-log-panel]', root)) {
        const type = panel.dataset.logPanel;
        tables.set(
            type,
            remoteTable({
                api: config.api,
                root: panel,
                endpoint: `/data/logs/${type}`,
                key: `admin-log-${type}`,
                columns: 6,
                emptyText: 'Belum ada log yang cocok dengan filter.',
                renderRow: renderers[type],
                onLoaded: (result) => {
                    $('[data-log-count]', panel).textContent = `${result.total} entri`;
                },
            }),
        );
    }
    const loaded = new Set();
    const show = (type) => {
        if (!tables.has(type) || loaded.has(type)) return;
        loaded.add(type);
        tables.get(type).load();
    };
    root.addEventListener('click', async (event) => {
        const tab = event.target.closest('[data-panel-tab]');
        if (tab) show(tab.dataset.panelTab);
        const detailButton = event.target.closest('[data-audit-open]');
        if (!detailButton) return;
        const { data } = await config.api.request(`/data/logs/audit/${detailButton.dataset.auditOpen}`);
        const keys = [...new Set([...Object.keys(data.before || {}), ...Object.keys(data.after || {})])];
        const host = $('[data-audit-detail]');
        const summary = node('dl', null, 'record-detail detail-summary');
        for (const [term, value] of [
            ['Tindakan', activityLabel(data.action)],
            ['Pelaku', data.actor_name || 'Sistem'],
            ['Waktu (WIB)', when(data.recorded_at)],
        ])
            summary.append(node('dt', term), node('dd', value));
        const table = node('table', null, 'data-table admin-diff');
        const columns = ['Kolom', 'Sebelum', 'Sesudah'];
        const thead = node('thead');
        const head = node('tr');
        head.append(...columns.map((label) => node('th', label)));
        thead.append(head);
        const tbody = node('tbody');
        for (const key of keys) {
            const before = describe(data.before?.[key]);
            const after = describe(data.after?.[key]);
            const tr = row(key, before, after);
            columns.forEach((label, i) => (tr.cells[i].dataset.label = label));
            if (before !== after) tr.classList.add('admin-changed');
            tbody.append(tr);
        }
        table.append(thead, tbody);
        const wrap = node('div', null, 'table-wrap mt-4');
        wrap.append(table);
        host.replaceChildren(summary, keys.length ? wrap : node('p', 'Tidak ada data perubahan.', 'empty mt-4 text-sm'));
        if (data.reason) host.append(node('p', `Alasan: ${data.reason}`, 'notice mt-3 text-sm'));
        open('audit-detail-dialog');
    });
    const initial = location.hash.slice(1);
    if (tables.has(initial)) $(`[data-panel-tab="${initial}"]`, root)?.click();
    show(tables.has(initial) ? initial : 'audit');
}
