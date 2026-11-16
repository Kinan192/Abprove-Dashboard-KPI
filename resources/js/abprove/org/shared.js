import { node, status } from '../flow-dom';
import { when, monthLabel } from '../../admin/labels';

export { when, monthLabel };

/** Mirrors PlacementService::MAX_BATCH. */
export const MAX_BATCH = 500;

export const AREAS = {
    units: { kind: 'unit', label: 'Unit', role: 'ku', roleLabel: 'Kepala Unit' },
    divisions: { kind: 'division', label: 'Divisi', role: 'kd', roleLabel: 'Kepala Divisi' },
};

const wibMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
});

/** Current calendar month in WIB ("YYYY-MM"), as OrganizationRules::month(). */
export const currentMonth = () => wibMonth.format(new Date()).slice(0, 7);

/** Earliest placement month ("YYYY-MM"), as OrganizationRules::earliestPlacementMonth(). */
export function earliestPlacementMonth(s) {
    const now = currentMonth();
    const open = s.data.cycles
        .filter((cycle) => cycle.status === 'open')
        .map((cycle) => cycle.id)
        .sort()[0];
    return open && open < now ? open : now;
}

/** Placement in force this month, else the latest one (staff placed only in the future). */
export const placementNow = (s, staff) =>
    s.placement(staff, currentMonth()) || staff.placements.at(-1) || null;

/** First placement that starts after the current month, if any. */
export const scheduledPlacement = (staff) =>
    staff.placements.find((p) => p.from > currentMonth()) || null;

/** Active head accounts of a role that lead no area. Accounts are read-only here; Admin creates them. */
export function freeHeads(s, role) {
    const busy = new Set(
        [...s.data.units, ...s.data.divisions]
            .map((area) => area.headId)
            .filter(Boolean),
    );
    return s.data.accounts
        .filter((a) => a.role === role && a.active && !busy.has(a.id))
        .map((a) => ({ id: a.id, name: a.nip ? `${a.name} · ${a.nip}` : a.name }));
}

export function headHint(role, count) {
    const label = role === 'ku' ? 'Kepala Unit' : 'Kepala Divisi';
    return count
        ? `${count} akun ${label} aktif belum memimpin area. Akun dibuat oleh Admin.`
        : `Belum ada akun ${label} aktif yang bebas. Akun dibuat oleh Admin; minta Admin membuat atau mengaktifkan akun ${label}.`;
}

export const period = (from, until) =>
    `${monthLabel(from)} – ${until ? monthLabel(until) : 'sekarang'}`;

/** Replaces the text of a flow-input label, keeping its required marker. */
export function setLabel(control, value) {
    const label = control.closest('label').querySelector('.label');
    label.firstChild.nodeValue = value;
}

export function badge(active) {
    const span = node('span');
    status(span, active ? 'Aktif' : 'Nonaktif');
    return span;
}

/** Server blockers ({code, message}[]) as an error notice, or null when there are none. */
export function blockerNotice(blockers, title) {
    if (!blockers?.length) return null;
    const box = node('div', null, 'notice notice-error org-blockers');
    box.setAttribute('role', 'alert');
    const list = node('ul');
    list.append(...blockers.map((b) => node('li', b.message)));
    const body = node('div');
    if (title) body.append(node('strong', title, 'block'));
    body.append(list);
    box.append(body);
    return box;
}

/** Term/description list for detail and impact panels. */
export function pairs(rows, cls = 'record-detail') {
    const dl = node('dl', null, cls);
    for (const [term, value] of rows) {
        const dd = node('dd');
        if (value instanceof Node) dd.append(value);
        else dd.textContent = value ?? '-';
        dl.append(node('dt', term), dd);
    }
    return dl;
}
