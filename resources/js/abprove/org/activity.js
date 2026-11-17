import { $, node, optionList } from '../flow-dom';
import { open } from '../ui';
import { activityLabel, activityActions } from '../activity-labels';
import { remoteTable } from '../../admin/remote-table';
import { ROLE_LABELS, when } from '../../admin/labels';

const FIELDS = {
    name: 'Nama',
    full_name: 'Nama staf',
    employee_name_snapshot: 'Nama yang dinilai',
    email: 'Email',
    login_nip: 'NIP akun',
    nip: 'NIP',
    role_key: 'Role',
    is_active: 'Aktif',
    status: 'Status',
    assessment_month: 'Bulan penilaian',
    total_score_raw: 'Nilai akhir',
    positive_finding: 'Temuan positif',
    negative_finding: 'Perlu ditingkatkan',
    return_reason: 'Alasan pengembalian',
    reason: 'Alasan',
    note: 'Catatan',
    operation: 'Jenis perubahan kepala',
    head_user_id: 'Kepala',
    user_id: 'Akun',
    released_user_ids: 'Kepala yang dilepas',
    unit_id: 'Unit',
    division_id: 'Divisi',
    position_id: 'Jabatan',
    effective_from: 'Mulai penempatan',
    effective_until: 'Akhir penempatan',
    batch_size: 'Jumlah staf dalam mutasi massal',
    scope_level: 'Jenis KPI',
    items: 'Jumlah indikator',
};
const STATUS = { submitted: 'Diajukan', returned: 'Dikembalikan', final: 'Final', open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' };
const OPERATIONS = { assign: 'Penetapan awal', replace: 'Ganti kepala', move: 'Pindah area', swap: 'Tukar kepala', release: 'Lepas kepala' };
const DAY = 86_400_000;
const wibDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });

/** Super HC activity history: GET /hc/audit pages on the server; snapshots load per row on demand. */
export function initActivity(s) {
    const root = $('[data-activity-root]'),
        periodSelect = $('[data-activity-period]', root),
        range = $('[data-activity-range]', root),
        from = $('[data-filter="from"]', root),
        to = $('[data-filter="to"]', root),
        details = new Map();
    optionList($('[data-filter="action"]', root), activityActions(), 'Semua tindakan');

    function format(key, value) {
        if (value == null || value === '') return '-';
        if (key === 'items') return Array.isArray(value) ? `${value.length} indikator` : '-';
        if (key === 'role_key') return ROLE_LABELS[value] || value;
        if (key === 'status') return STATUS[value] || value;
        if (key === 'operation') return OPERATIONS[value] || value;
        if (key === 'is_active') return value ? 'Ya' : 'Tidak';
        if (key === 'user_id' || key === 'head_user_id') return s.account(String(value))?.name || `Akun #${value}`;
        if (key === 'released_user_ids') return value.map((id) => s.account(String(id))?.name || `Akun #${id}`).join(', ') || '-';
        if (key === 'unit_id') return s.unit(String(value))?.name || `Unit #${value}`;
        if (key === 'division_id') return s.division(String(value))?.name || `Divisi #${value}`;
        if (key === 'position_id') return s.data.positions.find((p) => p.id === String(value))?.name || `Jabatan #${value}`;
        if (key === 'scope_level') return value === 'unit' ? 'KPI Unit' : 'KPI Divisi';
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    function show(event) {
        const host = $('[data-activity-detail]'),
            summary = node('dl', null, 'record-detail detail-summary');
        for (const [term, value] of [
            ['Tindakan', activityLabel(event.action)],
            ['Pelaku', `${event.actor_name || 'Sistem'}${event.actor_role ? ` · ${ROLE_LABELS[event.actor_role] || event.actor_role}` : ''}`],
            ['Waktu (WIB)', when(event.recorded_at)],
            ['Alasan', event.reason || '-'],
        ])
            summary.append(node('dt', term), node('dd', value));
        const keys = [...new Set([...Object.keys(event.before || {}), ...Object.keys(event.after || {})])].filter((key) => FIELDS[key]);
        const content = [summary];
        if (keys.length) {
            const table = node('table', null, 'data-table'),
                columns = ['Data', 'Sebelum', 'Sesudah'],
                head = node('tr'),
                body = node('tbody');
            head.append(...columns.map((label) => node('th', label)));
            const thead = node('thead');
            thead.append(head);
            for (const key of keys) {
                const before = event.before ? format(key, event.before[key]) : '-',
                    after = event.after ? format(key, event.after[key]) : '-',
                    tr = node('tr');
                tr.append(node('td', FIELDS[key]), node('td', before), node('td', after));
                columns.forEach((label, i) => (tr.cells[i].dataset.label = label));
                if (before !== after) tr.dataset.changed = '';
                body.append(tr);
            }
            table.append(thead, body);
            const wrap = node('div', null, 'table-wrap org-diff mt-4');
            wrap.append(table);
            content.push(wrap);
        } else content.push(node('p', 'Tindakan tercatat tanpa perubahan data profil atau penilaian.', 'empty mt-4 text-sm'));
        host.replaceChildren(...content);
        open('activity-dialog');
    }

    const table = remoteTable({
        api: s.api,
        root,
        endpoint: '/audit',
        key: 'activities',
        columns: 5,
        emptyText: 'Tidak ada aktivitas sesuai filter.',
        onLoaded: (result) => {
            $('[data-activity-count]', root).textContent = `${result.total} aktivitas`;
        },
        renderRow(event) {
            const tr = node('tr'),
                detail = node('td'),
                button = node('button', 'Lihat', 'link v2-row-action');
            button.type = 'button';
            button.dataset.activityId = event.id;
            detail.append(button);
            tr.append(
                node('td', when(event.recorded_at), 'text-xs whitespace-nowrap'),
                node('td', event.actor_name || 'Sistem', 'font-semibold'),
                node('td', activityLabel(event.action)),
                node('td', [event.summary, event.reason].filter(Boolean).join(' · ') || '-', 'finding-cell'),
                detail,
            );
            return tr;
        },
    });

    /** Turns the period shortcut into the WIB date range sent as from/to. */
    function applyPeriod() {
        const value = periodSelect.value,
            today = wibDate.format(new Date()),
            daysAgo = (n) => wibDate.format(new Date(Date.now() - n * DAY));
        range.hidden = value !== 'custom';
        if (value !== 'custom') {
            [from.value, to.value] = {
                today: [today, today],
                7: [daysAgo(6), today],
                30: [daysAgo(29), today],
                month: [today.slice(0, 8) + '01', today],
            }[value] || ['', ''];
        }
        from.dispatchEvent(new Event('input', { bubbles: true }));
    }
    root.addEventListener('change', (event) => {
        if (event.target === periodSelect) applyPeriod();
        // Filter chips and "Reset filter" only dispatch change; the remote table listens to input.
        else if (!event.isTrusted && event.target.matches('select[data-filter]'))
            event.target.dispatchEvent(new Event('input', { bubbles: true }));
    });
    root.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-activity-id]');
        if (!button || button.disabled) return;
        const id = button.dataset.activityId;
        if (!details.has(id)) {
            button.disabled = true;
            try {
                details.set(id, (await s.api.request(`/data/activities/${id}`)).data);
            } catch (error) {
                $('[data-activity-detail]').replaceChildren(node('p', error.message, 'notice notice-error'));
                open('activity-dialog');
                return;
            } finally {
                button.disabled = false;
            }
        }
        show(details.get(id));
    });
    table.load();
}
