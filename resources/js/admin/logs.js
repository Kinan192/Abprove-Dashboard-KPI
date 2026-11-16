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
        const button = node('button', 'Lihat', 'link');
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
    login: (event) =>
        row(
            when(event.occurred_at),
            event.user_name ? `${event.user_name} · ${ROLE_LABELS[event.role_key] || ''}` : 'Tidak dikenal',
            event.identifier,
            badge(...(LOGIN_EVENTS[event.event] || ['Belum', event.event])),
            event.ip_address,
            node('td', event.user_agent || '-', 'admin-ellipsis'),
        ),
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
        const heading = node('p', `${activityLabel(data.action)} · ${data.actor_name || 'Sistem'} · ${when(data.recorded_at)}`, 'text-sm text-muted mb-3');
        const table = node('table', null, 'data-table');
        const head = node('tr');
        head.append(node('th', 'Kolom'), node('th', 'Sebelum'), node('th', 'Sesudah'));
        table.append(head);
        for (const key of keys) {
            const before = describe(data.before?.[key]);
            const after = describe(data.after?.[key]);
            const tr = row(key, before, after);
            if (before !== after) tr.classList.add('admin-changed');
            table.append(tr);
        }
        const wrap = node('div', null, 'table-wrap');
        wrap.append(table);
        host.replaceChildren(heading, keys.length ? wrap : node('p', 'Tidak ada data perubahan.', 'empty text-sm'));
        if (data.reason) host.append(node('p', `Alasan: ${data.reason}`, 'notice mt-3 text-sm'));
        open('audit-detail-dialog');
    });
    const initial = location.hash.slice(1);
    if (tables.has(initial)) $(`[data-panel-tab="${initial}"]`, root)?.click();
    show(tables.has(initial) ? initial : 'audit');
}
