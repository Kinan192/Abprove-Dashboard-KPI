import { $, $$, node, text, field, error, optionList, initials } from '../flow-dom';
import { open, close, confirm, toast } from '../ui';
import { paginate } from '../pagination';
import { syncSearchableSelects } from '../searchable-select';
import { initHeadWizard } from './head-wizard';
import { initStaffTransfer } from './staff-transfer';
import {
    AREAS,
    freeHeads,
    headHint,
    setLabel,
    badge,
    pairs,
    period,
    when,
    monthLabel,
    currentMonth,
    placementNow,
    scheduledPlacement,
} from './shared';

const KINDS = {
    division: {
        set: 'divisions',
        title: 'Divisi',
        noun: 'divisi',
        description: 'Setiap divisi aktif dipimpin satu Kepala Divisi. Gunakan Kepala untuk mengganti, memindah, menukar, atau melepas kepala.',
        headers: ['Nama divisi', 'Kepala Divisi', 'Cakupan', 'Status', 'Tindakan'],
    },
    unit: {
        set: 'units',
        title: 'Unit',
        noun: 'unit',
        description: 'Unit berada di bawah satu divisi dan dipimpin satu Kepala Unit. KPI staf mengikuti Unit.',
        headers: ['Nama unit', 'Kepala Unit', 'Divisi', 'Status', 'Tindakan'],
    },
    position: {
        set: 'positions',
        title: 'Jabatan',
        noun: 'jabatan',
        description: 'Jabatan mengklasifikasikan pekerjaan staf. Hak akses ditentukan oleh akun yang dikelola Admin.',
        headers: ['Nama jabatan', 'Staf aktif', 'Status', 'Tindakan'],
    },
    staff: {
        set: 'staff',
        title: 'Data Staf',
        noun: 'staf',
        description: 'Data kepegawaian tanpa akun login. Gunakan Mutasi untuk memindahkan unit, satu per satu atau massal.',
        headers: ['Nama', 'Jabatan', 'Unit', 'KPI unit', 'Penilai', 'Status', 'Tindakan'],
    },
};
const RESOURCES = { division: 'divisions', unit: 'units', position: 'positions', staff: 'employees' };
const PAGE_KINDS = { struktur: 'division', karyawan: 'staff', jabatan: 'position' };

/** Master data for divisions, units, positions and staff (Super HC). Accounts are managed by Admin. */
export function initStructure(c, s) {
    const root = $('[data-flow-organization]'),
        body = $('[data-org-body]'),
        form = $('#entity-form'),
        heads = initHeadWizard(s),
        transfers = initStaffTransfer(s);
    const requested = new URLSearchParams(location.search).get('tab');
    let kind = KINDS[requested] ? requested : PAGE_KINDS[c.page] || 'division',
        detailController = null;
    const record = (type, id) => s.data[KINDS[type].set].find((r) => r.id === id);
    const position = (id) => s.data.positions.find((p) => p.id === id);
    const unitKpi = (unitId) => {
        const month = s.cycleKey;
        return s.data.kpis.findLast(
            (k) => !k.forPeople?.length && k.level === 'unit' && k.areaId === unitId && k.from <= month && (!k.until || k.until >= month),
        );
    };

    function render() {
        const config = KINDS[kind],
            q = $('[data-org-search]').value.trim().toLowerCase(),
            active = $('[data-org-active]').value;
        root.dataset.orgKind = kind;
        $$('[data-org-tab]').forEach((b) => {
            b.classList.toggle('active', b.dataset.orgTab === kind);
            b.setAttribute('aria-selected', String(b.dataset.orgTab === kind));
        });
        text(root, '[data-org-title]', config.title);
        text(root, '[data-org-description]', config.description);
        const primary = $('[data-org-primary]');
        primary.dataset.entityNew = kind;
        primary.textContent = `Tambah ${config.noun}`;
        $('[data-quick-unit]').hidden = kind !== 'division';
        $('[data-staff-bulk]').hidden = kind !== 'staff';
        $$('[data-org-count]', root).forEach((count) => {
            count.textContent = s.data[KINDS[count.dataset.orgCount].set].filter((r) => r.active).length;
            count.title = 'Jumlah data aktif';
        });
        body.closest('table').querySelector('thead tr').replaceChildren(
            ...config.headers.map((label, i, all) => node('th', label, i === all.length - 1 ? 'numeric' : '')),
        );

        const staffPerDivision = new Map();
        if (kind === 'division')
            for (const p of s.data.staff.filter((x) => x.active)) {
                const divisionId = s.unit(placementNow(s, p)?.unitId)?.divisionId;
                if (divisionId) staffPerDivision.set(divisionId, (staffPerDivision.get(divisionId) || 0) + 1);
            }
        const rows = s.data[config.set].filter(
            (r) =>
                `${r.name} ${r.nip || ''}`.toLowerCase().includes(q) &&
                (active === 'all' || r.active === (active === 'active')),
        );
        const renderRow = (r) => {
            const tr = node('tr'),
                identity = node('td'),
                name = node('button', r.name, 'table-name text-left font-semibold');
            tr.dataset.entityRow = r.id;
            name.type = 'button';
            name.dataset.entityDetail = r.id;
            if (kind === 'staff') {
                const who = node('div', null, 'reference-person'),
                    copy = node('div');
                copy.append(name, node('p', r.nip, 'mt-1 text-xs text-muted'));
                who.append(node('span', initials(r.name), 'avatar'), copy);
                identity.append(who);
            } else identity.append(name);
            tr.append(identity);
            const head = (id) => {
                const name = s.account(id)?.name;
                return node('td', name || 'Belum ditetapkan', name ? '' : r.active ? 'text-warning' : 'text-muted');
            };
            const cells = {
                division: () => {
                    const units = s.data.units.filter((u) => u.divisionId === r.id && u.active);
                    const staff = staffPerDivision.get(r.id) || 0;
                    return [head(r.headId), node('td', `${units.length} unit · ${staff} staf aktif`, 'text-muted')];
                },
                unit: () => [head(r.headId), s.division(r.divisionId)?.name || '-'],
                position: () => [node('td', `${s.data.staff.filter((p) => p.active && p.positionId === r.id).length} staf`, 'num')],
                staff: () => {
                    const unit = s.unit(placementNow(s, r)?.unitId),
                        kpi = unit && unitKpi(unit.id),
                        assessor = s.account(unit?.headId)?.name,
                        next = scheduledPlacement(r),
                        where = node('td', unit?.name || 'Tanpa penempatan');
                    if (next) where.append(node('small', `→ ${s.unit(next.unitId)?.name || '-'} mulai ${monthLabel(next.from)}`, 'block text-xs text-muted'));
                    return [
                        position(r.positionId)?.name || '-',
                        where,
                        node('td', unit ? kpi?.name || 'Belum disusun' : '-', unit && !kpi ? 'text-xs text-warning' : 'text-xs'),
                        node('td', assessor || 'Belum ditetapkan', assessor ? 'text-xs' : 'text-xs text-warning'),
                    ];
                },
            }[kind]();
            tr.append(...cells.map((cell) => (cell instanceof Node ? cell : node('td', cell))));
            const state = node('td');
            state.append(badge(r.active));
            const actions = node('td', null, 'numeric'),
                group = node('div', null, 'table-row-actions');
            const action = (label, key) => {
                const b = node('button', label, 'link v2-row-action');
                b.type = 'button';
                b.dataset[key] = r.id;
                group.append(b);
            };
            action('Ubah', 'entityEdit');
            if (r.active && (kind === 'division' || kind === 'unit')) action('Kepala', 'headChange');
            if (r.active && kind === 'staff') action('Mutasi', 'staffTransfer');
            actions.append(group);
            tr.append(state, actions);
            return tr;
        };
        body.replaceChildren();
        if (!rows.length) {
            const row = node('tr'),
                td = node('td', 'Belum ada data sesuai pencarian. Gunakan tombol Tambah untuk mulai.', 'empty');
            td.colSpan = config.headers.length;
            row.append(td);
            body.append(row);
        }
        paginate(body, 'organization', { token: kind + q + active, records: rows, renderRow });
    }

    /** Head pick is used when creating an area or reactivating one; active areas change heads via the wizard. */
    function syncHeadPick() {
        const type = field(form, 'kind').value,
            r = record(type, field(form, 'id').value),
            area = type === 'division' || type === 'unit',
            pick = area && (!r || (!r.active && field(form, 'active').checked)),
            select = field(form, 'headId');
        $('[data-head-pick]', form).hidden = !pick;
        select.disabled = !pick;
        $('[data-head-current]', form).hidden = !(area && r?.active);
        if (pick) {
            const role = AREAS[KINDS[type].set].role,
                candidates = freeHeads(s, role);
            optionList(select, candidates, `Pilih akun ${AREAS[KINDS[type].set].roleLabel}`);
            $('[data-head-help]', form).textContent = r
                ? `Area nonaktif tidak memiliki kepala. Pilih kepala untuk mengaktifkannya kembali. ${headHint(role, candidates.length)}`
                : headHint(role, candidates.length);
        }
        if (area && r?.active) text(form, '[data-head-current-name]', s.account(r.headId)?.name || 'Belum ditetapkan');
        syncSearchableSelects(form);
    }

    function edit(type, id = '') {
        const r = record(type, id),
            config = KINDS[type];
        form.reset();
        field(form, 'id').value = id;
        field(form, 'kind').value = type;
        $$('[data-entity-for]', form).forEach((group) => {
            const visible = group.dataset.entityFor.split(',').includes(type);
            group.hidden = !visible;
            $$('input,select,textarea', group).forEach((el) => (el.disabled = !visible));
        });
        setLabel(field(form, 'name'), type === 'staff' ? 'Nama lengkap' : `Nama ${config.noun}`);
        optionList(field(form, 'divisionId'), s.data.divisions.filter((x) => x.active || x.id === r?.divisionId), 'Pilih divisi induk');
        optionList(field(form, 'positionId'), s.data.positions.filter((x) => x.active || x.id === r?.positionId), 'Pilih jabatan');
        const current = r && type === 'staff' ? s.unit(placementNow(s, r)?.unitId) : null;
        optionList(
            field(form, 'unitId'),
            s.data.units
                .filter((u) => (u.active && s.division(u.divisionId)?.active) || u.id === current?.id)
                .map((u) => ({ id: u.id, name: `${u.name} · ${s.division(u.divisionId)?.name || '-'}` })),
            'Pilih unit',
        );
        if (r) {
            field(form, 'name').value = r.name;
            if (type === 'staff') {
                field(form, 'nip').value = r.nip;
                field(form, 'positionId').value = r.positionId;
                field(form, 'unitId').value = current?.id || '';
            }
            if (type === 'unit') field(form, 'divisionId').value = r.divisionId;
        }
        field(form, 'active').checked = r ? r.active : true;
        if (type === 'staff') {
            field(form, 'unitId').disabled = !!r;
            setLabel(field(form, 'unitId'), r ? 'Unit saat ini (gunakan Mutasi untuk memindahkan)' : 'Unit penempatan');
        }
        syncHeadPick();
        text(document, '#entity-dialog-title', `${r ? 'Ubah' : 'Tambah'} ${config.title}`);
        $('[data-form-error]', form).hidden = true;
        syncSearchableSelects(form);
        open('entity-dialog');
    }

    async function save() {
        const type = field(form, 'kind').value,
            r = record(type, field(form, 'id').value),
            name = field(form, 'name').value.trim(),
            active = field(form, 'active').checked,
            payload = { is_active: active };
        if (!name) return error(form, 'Nama wajib diisi.');
        if (type === 'staff')
            Object.assign(payload, {
                full_name: name,
                nip: field(form, 'nip').value.trim(),
                position_id: +field(form, 'positionId').value,
                ...(r ? {} : { unit_id: +field(form, 'unitId').value }),
            });
        else payload.name = name;
        if (type === 'unit') payload.division_id = +field(form, 'divisionId').value;
        if (!field(form, 'headId').disabled) {
            const head = field(form, 'headId').value;
            if (!head) return error(form, headHint(AREAS[KINDS[type].set].role, freeHeads(s, AREAS[KINDS[type].set].role).length));
            payload.head_user_id = +head;
        }
        if (
            r?.active &&
            !active &&
            !(await confirm(
                `Nonaktifkan ${r.name}? ${type === 'division' || type === 'unit' ? 'Kepala area dilepas otomatis. ' : ''}Penilaian non-Final terkait harus sudah selesai.`,
                { label: 'Nonaktifkan' },
            ))
        )
            return;
        await s.api.perform(form, async () => {
            await s.api.request(`/organization/${RESOURCES[type]}${r ? '/' + (r.dbId || r.id) : ''}`, r ? 'PATCH' : 'POST', payload);
            await s.refresh();
            close('entity-dialog');
            toast(r ? 'Perubahan berhasil disimpan.' : `${KINDS[type].title} ${name} ditambahkan.`);
        });
    }

    function historyList(title, rows, describe) {
        const section = node('section', null, 'org-history-block');
        section.append(node('h3', title));
        if (!rows.length) {
            section.append(node('p', 'Belum ada riwayat.', 'empty text-sm'));
            return section;
        }
        const list = node('ol', null, 'org-timeline');
        list.append(
            ...rows.map((row) => {
                const [heading, ...lines] = describe(row),
                    item = node('li');
                item.append(node('strong', heading), ...lines.filter(Boolean).map((line) => node('span', line)));
                return item;
            }),
        );
        section.append(list);
        return section;
    }

    async function loadHistory(type, r) {
        const host = $('[data-org-history]');
        host.replaceChildren();
        detailController?.abort();
        detailController = null;
        if (type === 'position') return;
        const controller = (detailController = new AbortController());
        host.append(node('p', 'Memuat riwayat…', 'text-sm text-muted'));
        try {
            const { data } = await s.api.request(`/organization/${RESOURCES[type]}/${r.dbId || r.id}`, 'GET', null, { signal: controller.signal });
            // A newer detail (or closing the dialog) aborted this one; its late response must not overwrite the host.
            if (controller.signal.aborted) return;
            const now = currentMonth();
            host.replaceChildren(
                ...(type === 'staff'
                    ? [
                          historyList('Riwayat penempatan', data.history, (p) => [
                              `${p.unit_name} · ${p.division_name}${p.from > now ? ' (terjadwal)' : ''}`,
                              period(p.from, p.until),
                              p.reason && `Alasan: ${p.reason}`,
                              `Dicatat ${p.created_by_name || 'sistem'} · ${when(p.created_at)} WIB`,
                          ]),
                      ]
                    : [
                          historyList(`Riwayat kepala ${KINDS[type].noun} ini`, data.history.area, (h) => [
                              h.user_name || '-',
                              `${when(h.assigned_at)} – ${h.revoked_at ? when(h.revoked_at) : 'sekarang'} WIB`,
                              h.note && `Catatan: ${h.note}`,
                              h.assigned_by_name && `Ditetapkan oleh ${h.assigned_by_name}`,
                          ]),
                          historyList('Riwayat penugasan kepala saat ini', data.history.head, (h) => [
                              `${h.role_key === 'kepala_unit' ? 'Kepala Unit' : 'Kepala Divisi'} ${h.area_name || '-'}`,
                              `${when(h.assigned_at)} – ${h.revoked_at ? when(h.revoked_at) : 'sekarang'} WIB`,
                              h.note && `Catatan: ${h.note}`,
                          ]),
                      ]),
            );
        } catch (e) {
            if (!controller.signal.aborted && e.name !== 'AbortError') host.replaceChildren(node('p', e.message, 'notice notice-error'));
        }
    }

    /** Units under a division (Divisi → Unit) from the loaded master list; inactive units stay listed with their status. */
    function divisionUnits(division) {
        const section = $('[data-org-division-units]'),
            list = $('[data-org-division-units-list]', section);
        list.replaceChildren();
        section.hidden = !division;
        if (!division) return;
        const units = s.data.units
            .filter((u) => u.divisionId === division.id)
            .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'id'));
        const ids = new Set(units.map((u) => u.id)),
            staff = new Map();
        // Current month only: active staff whose placement is in force now; future-only placements do not count.
        const month = currentMonth();
        for (const p of s.data.staff) {
            const unitId = p.active ? s.placement(p, month)?.unitId : null;
            if (ids.has(unitId)) staff.set(unitId, (staff.get(unitId) || 0) + 1);
        }
        const active = units.filter((u) => u.active).length;
        text(section, '[data-org-division-units-meta]', units.length ? `${active} aktif · ${units.length - active} nonaktif` : '');
        text(
            section,
            '[data-org-division-units-note]',
            units.length
                ? `Staf aktif dihitung dari penempatan ${monthLabel(currentMonth())}. Pilih Rincian untuk melihat kepala dan riwayat unit.`
                : 'Belum ada unit di divisi ini. Gunakan Tambah unit untuk membuat unit di bawah divisi ini.',
        );
        list.hidden = !units.length;
        list.append(
            ...units.map((u) => {
                const item = node('li', null, 'org-unit-item'),
                    copy = node('div', null, 'org-unit-copy'),
                    title = node('div', null, 'org-unit-title'),
                    meta = node('p', null, 'org-unit-meta'),
                    head = s.account(u.headId)?.name,
                    view = node('button', 'Rincian', 'btn btn-small');
                title.append(node('strong', u.name), badge(u.active));
                meta.append(
                    node('span', `Kepala Unit: ${head || 'Belum ditetapkan'}`, head || !u.active ? '' : 'text-warning'),
                    node('span', `${staff.get(u.id) || 0} staf aktif`),
                );
                view.type = 'button';
                view.dataset.divisionUnit = u.id;
                view.setAttribute('aria-label', `Lihat rincian unit ${u.name}`);
                copy.append(title, meta);
                item.append(copy, view);
                return item;
            }),
        );
    }

    function details(type, r) {
        const rows = [['Nama', r.name], ['Status', badge(r.active)]];
        if (type === 'staff') {
            const unit = s.unit(placementNow(s, r)?.unitId);
            rows.push(['NIP', r.nip], ['Jabatan', position(r.positionId)?.name], ['Unit', unit?.name], ['Divisi', s.division(unit?.divisionId)?.name], ['Penilai', s.account(unit?.headId)?.name]);
        }
        if (type === 'unit') rows.push(['Divisi', s.division(r.divisionId)?.name], ['Kepala Unit', s.account(r.headId)?.name || 'Belum ditetapkan']);
        if (type === 'division') rows.push(['Kepala Divisi', s.account(r.headId)?.name || 'Belum ditetapkan'], ['Unit aktif', String(s.data.units.filter((u) => u.divisionId === r.id && u.active).length)]);
        if (type === 'position') rows.push(['Staf aktif', String(s.data.staff.filter((p) => p.active && p.positionId === r.id).length)]);
        $('[data-org-detail]').replaceChildren(...pairs(rows).children);
        divisionUnits(type === 'division' ? r : null);
        text(document, '#org-detail-dialog-title', `Rincian ${KINDS[type].title}`);
        $('#org-detail-dialog .dialog-body').scrollTop = 0;
        const actions = $('[data-org-detail-actions]'),
            button = (label, fn, cls = 'btn') => {
                const b = node('button', label, cls);
                b.type = 'button';
                b.onclick = () => {
                    close('org-detail-dialog');
                    fn();
                };
                return b;
            };
        actions.replaceChildren(button('Hapus', () => destroy(type, r), 'btn btn-danger org-detail-delete'), button('Ubah data', () => edit(type, r.id)));
        if (r.active && (type === 'division' || type === 'unit')) actions.append(button('Ubah kepala…', () => heads.open(KINDS[type].set, r.id), 'btn btn-primary'));
        if (r.active && type === 'staff') actions.append(button('Mutasi…', () => transfers.open([r.id]), 'btn btn-primary'));
        loadHistory(type, r);
        open('org-detail-dialog');
    }

    async function destroy(type, r) {
        if (!(await confirm(`Hapus ${r.name}? Hanya data yang belum dipakai yang dapat dihapus; gunakan Nonaktif untuk data berhistori.`, { label: 'Hapus' }))) return;
        await s.api.perform(null, async () => {
            await s.api.request(`/organization/${RESOURCES[type]}/${r.dbId || r.id}`, 'DELETE', {});
            await s.refresh();
            toast(`${r.name} telah dihapus.`);
        });
    }

    root.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-org-tab]');
        if (tab && tab.dataset.orgTab !== kind) {
            kind = tab.dataset.orgTab;
            $('[data-org-search]').value = '';
            render();
        }
        const create = event.target.closest('[data-entity-new]');
        if (create) {
            const type = create.dataset.entityNew || kind;
            if (type !== kind) {
                kind = type;
                $('[data-org-search]').value = '';
                render();
            }
            edit(type);
        }
        if (event.target.closest('[data-staff-bulk]')) transfers.open();
        const button = event.target.closest('[data-entity-edit],[data-entity-detail],[data-head-change],[data-staff-transfer]');
        if (!button) return;
        const { entityEdit, entityDetail, headChange, staffTransfer } = button.dataset;
        if (entityEdit) edit(kind, entityEdit);
        if (entityDetail) details(kind, record(kind, entityDetail));
        if (headChange) heads.open(KINDS[kind].set, headChange);
        if (staffTransfer) transfers.open([staffTransfer]);
    });
    $('[data-head-change-open]', form).addEventListener('click', () => {
        const type = field(form, 'kind').value,
            id = field(form, 'id').value;
        close('entity-dialog');
        heads.open(KINDS[type].set, id);
    });
    form.addEventListener('change', (event) => {
        if (event.target.name === 'active') syncHeadPick();
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (form.reportValidity()) save();
    });
    $('#org-detail-dialog').addEventListener('close', () => detailController?.abort());
    // Opens the unit in place: the dialog stays open, so its async 'close' abort cannot cancel the new history request.
    $('[data-org-division-units]').addEventListener('click', (event) => {
        const unit = record('unit', event.target.closest('[data-division-unit]')?.dataset.divisionUnit);
        if (!unit) return;
        details('unit', unit);
        const title = $('#org-detail-dialog-title');
        title.tabIndex = -1;
        title.focus();
    });
    $('[data-org-search]').addEventListener('input', render);
    $('[data-org-active]').addEventListener('change', render);
    document.addEventListener('flow-updated', render);
    render();
}
