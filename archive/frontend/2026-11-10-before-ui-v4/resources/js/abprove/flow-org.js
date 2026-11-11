import {
    $,
    $$,
    node,
    text,
    optionList,
    field,
    error,
    dateTime,
    empty,
} from './flow-dom';
import { open, close, confirm, toast } from './ui';
import { uid, previousMonth } from './flow-store';
import { paginate } from './pagination';
export function initOrganization(c, s, link) {
    let kind = {
        akun: 'account',
        jabatan: 'position',
        struktur: 'division',
        karyawan: 'staff',
    }[c.page];
    const sets = {
        account: 'accounts',
        position: 'positions',
        division: 'divisions',
        unit: 'units',
        staff: 'staff',
    };
    const labels = {
        account: [
            'Akun Kepala',
            'Hanya Kepala Unit, Kepala Divisi dan Super HC yang memiliki akun. Buat akun sebelum menetapkan penanggung jawab.',
        ],
        position: [
            'Jabatan',
            'Jabatan mengklasifikasikan pekerjaan staf. Role akun menentukan hak akses.',
        ],
        division: [
            'Divisi',
            'Pilih Kepala Divisi dari akun KD aktif yang sudah dibuat.',
        ],
        unit: [
            'Unit',
            'Pilih divisi induk dan akun Kepala Unit yang sudah dibuat.',
        ],
        staff: [
            'Data Staf',
            'Masukkan data kepegawaian tanpa akun login. KPI mengikuti Unit.',
        ],
    };
    const roles = { ku: 'Kepala Unit', kd: 'Kepala Divisi', hc: 'Super HC' };
    const form = $('#entity-form');
    const resources = {
        account: 'users',
        position: 'positions',
        division: 'divisions',
        unit: 'units',
        staff: 'employees',
    };
    function readiness() {
        const done = {
            akun:
                s.data.accounts.some((a) => a.active && a.role === 'ku') &&
                s.data.accounts.some((a) => a.active && a.role === 'kd'),
            jabatan: s.data.positions.some((p) => p.active),
            struktur:
                s.data.divisions.some((d) => d.active) &&
                s.data.units.some((u) => u.active),
            karyawan: s.data.staff.some((p) => p.active),
            kpi:
                s.data.units.some((u) => u.active) &&
                s.data.divisions.some((d) => d.active) &&
                s.data.units
                    .filter((u) => u.active)
                    .every((u) =>
                        s.data.kpis.some(
                            (k) => k.level === 'unit' && k.areaId === u.id,
                        ),
                    ) &&
                s.data.divisions
                    .filter((d) => d.active)
                    .every((d) =>
                        s.data.kpis.some(
                            (k) => k.level === 'division' && k.areaId === d.id,
                        ),
                    ),
            pengaturan: s.data.cycles.some((x) => x.status === 'open'),
        };
        $$('[data-setup-state]').forEach((e) => {
            e.classList.toggle('text-success', done[e.dataset.setupState]);
            e.textContent = done[e.dataset.setupState]
                ? '✓'
                : String(Object.keys(done).indexOf(e.dataset.setupState) + 1);
        });
    }
    function render() {
        readiness();
        if (!kind) return;
        text(document, '[data-org-title]', labels[kind][0]);
        text(document, '[data-org-description]', labels[kind][1]);
        const button = $('[data-org-primary]');
        button.dataset.entityNew = kind;
        button.textContent = `Tambah ${kind === 'account' ? 'akun' : kind === 'position' ? 'jabatan' : kind === 'staff' ? 'staf' : kind}`;
        text(
            document,
            '[data-org-col2]',
            kind === 'account'
                ? 'Role'
                : kind === 'staff'
                  ? 'Jabatan'
                  : kind === 'position'
                    ? 'Kegunaan'
                    : 'Penanggung jawab',
        );
        text(
            document,
            '[data-org-col3]',
            kind === 'account'
                ? 'Penugasan'
                : kind === 'position'
                  ? 'Staf terkait'
                  : 'Cakupan',
        );
        const body = $('[data-org-body]'),
            q = $('[data-org-search]').value.toLowerCase(),
            active = $('[data-org-active]').value;
        body.replaceChildren();
        const rows = s.data[sets[kind]].filter(
            (r) =>
                `${r.name} ${r.nip || r.code || ''}`
                    .toLowerCase()
                    .includes(q) &&
                (active === 'all' ||
                    (r.active === true) === (active === 'active')),
        );
        for (const r of rows) {
            const tr = node('tr');
            tr.dataset.entityRow = r.id;
            const identity = node('td');
            identity.append(
                Object.assign(
                    node(
                        'button',
                        r.name,
                        'table-name text-left font-semibold',
                    ),
                    { type: 'button', onclick: () => details(r) },
                ),
                node(
                    'p',
                    r.email || r.nip || r.code,
                    'mt-1 text-xs text-muted',
                ),
            );
            tr.append(identity);
            let second = '',
                third = '';
            if (kind === 'account') {
                second = roles[r.role];
                const d = s.data.divisions.find(
                        (d) => d.headId === r.id && d.active,
                    ),
                    u = s.data.units.find((u) => u.headId === r.id && u.active);
                third =
                    d?.name ||
                    u?.name ||
                    (r.role === 'hc'
                        ? 'Seluruh organisasi'
                        : 'Belum ditugaskan');
            }
            if (kind === 'position') {
                second = 'Klasifikasi pekerjaan';
                third = `${s.data.staff.filter((p) => p.positionId === r.id).length} staf`;
            }
            if (kind === 'division') {
                second = s.account(r.headId)?.name || 'Belum ditetapkan';
                third = `${s.data.units.filter((u) => u.divisionId === r.id).length} unit`;
            }
            if (kind === 'unit') {
                second = s.account(r.headId)?.name || 'Belum ditetapkan';
                third = s.division(r.divisionId)?.name || '-';
            }
            if (kind === 'staff') {
                second =
                    s.data.positions.find((p) => p.id === r.positionId)?.name ||
                    '-';
                third = s.unit(s.placement(r)?.unitId)?.name || '-';
            }
            tr.append(
                node('td', second),
                node('td', third),
                node(
                    'td',
                    r.active ? 'Aktif' : 'Nonaktif',
                    r.active ? 'text-success text-xs' : 'text-muted text-xs',
                ),
            );
            const actions = node('td', null, 'numeric');
            const edit = node('button', 'Ubah', 'link v2-row-action');
            edit.type = 'button';
            edit.dataset.entityEdit = r.id;
            actions.append(edit);
            const more = node('button', 'Lainnya', 'link v2-row-action');
            more.type = 'button';
            more.dataset.entityMore = r.id;
            actions.append(more);
            tr.append(actions);
            body.append(tr);
        }
        if (!rows.length) {
            const row = node('tr'),
                td = node(
                    'td',
                    'Belum ada data sesuai pencarian. Gunakan tombol Tambah untuk mulai.',
                    'empty',
                );
            td.colSpan = 5;
            row.append(td);
            body.append(row);
        }
        text(document, '[data-org-count]', `${rows.length} data ditampilkan`);
        paginate(body, 'organization', { token: kind + q + active });
    }
    function deletionBlock(r) {
        const assessments = Object.entries(s.data.assessments);
        if (kind === 'account') {
            if (r.id === s.actor.id)
                return 'Akun yang sedang digunakan tidak dapat dihapus.';
            if (
                [...s.data.units, ...s.data.divisions].some(
                    (x) => x.headId === r.id,
                ) ||
                s.data.heads.some((x) => x.accountId === r.id)
            )
                return 'Akun memiliki penugasan atau histori kepala. Ganti penanggung jawab dan gunakan status Nonaktif.';
        }
        if (
            kind === 'position' &&
            s.data.staff.some((x) => x.positionId === r.id)
        )
            return 'Jabatan masih dirujuk oleh staf. Ubah penempatan jabatan atau gunakan status Nonaktif.';
        if (
            kind === 'division' &&
            (s.data.units.some((x) => x.divisionId === r.id) ||
                s.data.heads.some((x) => x.divisionId === r.id) ||
                s.data.kpis.some(
                    (x) => x.level === 'division' && x.areaId === r.id,
                ) ||
                assessments.some(([, a]) => a.scope.divisionId === r.id))
        )
            return 'Divisi memiliki unit, KPI atau histori. Gunakan status Nonaktif setelah dependensinya diselesaikan.';
        if (
            kind === 'unit' &&
            (s.data.staff.some((x) =>
                x.placements.some((p) => p.unitId === r.id),
            ) ||
                s.data.kpis.some(
                    (x) => x.level === 'unit' && x.areaId === r.id,
                ) ||
                assessments.some(
                    ([key, a]) =>
                        a.scope.unitId === r.id ||
                        s.data.heads.some(
                            (h) =>
                                h.unitId === r.id && key.startsWith(h.id + '|'),
                        ),
                ))
        )
            return 'Unit memiliki staf, KPI atau histori penilaian. Gunakan status Nonaktif setelah dependensinya diselesaikan.';
        if (
            kind === 'staff' &&
            assessments.some(([key]) => key.startsWith(r.id + '|'))
        )
            return 'Staf memiliki riwayat penilaian. Gunakan status Nonaktif agar histori tetap utuh.';
        return '';
    }
    function details(r) {
        const root = $('[data-record-detail]');
        root.replaceChildren();
        const pairs = [
            ['Nama', r.name],
            ['Status', r.active ? 'Aktif' : 'Nonaktif'],
        ];
        if (r.nip) pairs.push(['NIP', r.nip]);
        if (r.email) pairs.push(['Email', r.email], ['Role', roles[r.role]]);
        if (r.code) pairs.push(['Kode', r.code]);
        if (r.headId) pairs.push(['Kepala', s.account(r.headId)?.name]);
        if (r.divisionId)
            pairs.push(['Divisi', s.division(r.divisionId)?.name]);
        if (kind === 'staff')
            pairs.push(
                [
                    'Jabatan',
                    s.data.positions.find((x) => x.id === r.positionId)?.name,
                ],
                ['Unit', s.unit(s.placement(r)?.unitId)?.name],
            );
        pairs.forEach(([k, v]) => {
            const d = node('div');
            d.append(
                node('dt', k, 'text-xs text-muted'),
                node('dd', v || '-', 'mt-1 text-sm'),
            );
            root.append(d);
        });
        $('#record-detail-dialog-title').textContent =
            'Rincian ' + labels[kind][0];
        const editButton = $('[data-detail-edit]');
        editButton.hidden = false;
        editButton.onclick = () => {
            close('record-detail-dialog');
            edit(kind, r.id);
        };
        open('record-detail-dialog');
    }
    function actions(r) {
        const root = $('[data-entity-actions]');
        root.replaceChildren();
        text(document, '[data-actions-name]', r.name);
        const add = (label, fn, disabled = false) => {
            const b = node('button', label, 'menu-item');
            b.type = 'button';
            b.disabled = disabled;
            b.onclick = () => {
                close('entity-actions-dialog');
                fn();
            };
            root.append(b);
        };
        add('Lihat rincian', () => details(r));
        if (kind === 'staff')
            add('Pindahkan staf', () => transfer(r.id), !r.active);
        add(r.active ? 'Nonaktifkan' : 'Aktifkan', () => {
            edit(kind, r.id);
            field(form, 'active').checked = !r.active;
        });
        const block = deletionBlock(r);
        add(
            'Hapus data',
            async () => {
                if (deletionBlock(r)) return toast(deletionBlock(r), true);
                if (
                    !(await confirm(
                        `Hapus ${r.name}? Data yang belum digunakan ini akan dihapus.`,
                    ))
                )
                    return;
                if (s.live)
                    return s.api.perform(null, async () => {
                        await s.api.request(
                            '/organization/' +
                                resources[kind] +
                                '/' +
                                (r.dbId || r.id),
                            'DELETE',
                            {},
                        );
                        await s.refresh();
                        render();
                        toast('Data telah dihapus.');
                    });
                s.data[sets[kind]] = s.data[sets[kind]].filter(
                    (x) => x.id !== r.id,
                );
                if (kind === 'unit')
                    s.data.heads = s.data.heads.filter(
                        (x) => x.unitId !== r.id,
                    );
                s.save('Hapus ' + kind, r.name, r, null);
                render();
                toast('Data yang belum digunakan telah dihapus.');
            },
            !!block,
        );
        if (
            kind === 'account' &&
            c.review &&
            r.active &&
            r.role !== 'hc' &&
            [...s.data.units, ...s.data.divisions].some(
                (x) => x.headId === r.id,
            )
        ) {
            const a = node('a', 'Lihat cakupan akun', 'menu-item');
            a.href = `/design-review/${r.role}/beranda?account=${encodeURIComponent(r.id)}&cycle=${s.cycleKey}`;
            root.append(a);
        }
        text(
            document,
            '[data-actions-note]',
            block || 'Hapus tersedia karena data belum digunakan.',
        );
        open('entity-actions-dialog');
    }
    function candidates(type, id) {
        const role = type === 'division' ? 'kd' : 'ku';
        return s.data.accounts.filter(
            (a) =>
                a.role === role &&
                a.active &&
                !s.data[type === 'division' ? 'divisions' : 'units'].some(
                    (r) => r.id !== id && r.headId === a.id && r.active,
                ),
        );
    }
    function previewHead() {
        if (!form || !['unit', 'division'].includes(field(form, 'kind').value))
            return;
        const type = field(form, 'kind').value,
            id = field(form, 'id').value,
            record = s.data[sets[type]].find((r) => r.id === id),
            head = s.account(field(form, 'headId').value);
        const pending = id
            ? s.pending(
                  type === 'unit' ? id : null,
                  type === 'division' ? id : null,
              )
            : [];
        field(form, 'reason').closest('label').hidden =
            !record || record.headId === head?.id;
        text(
            form,
            '[data-head-impact]',
            `${head ? `Penanggung jawab: ${head.name}. ` : ''}${type === 'unit' ? `Divisi: ${s.division(field(form, 'divisionId').value)?.name || 'pilih dahulu'}. ` : ''}${record && record.headId !== head?.id ? `${pending.length} penilaian non-Final terdampak. Pergantian diblokir bila masih ada pekerjaan aktif.` : 'Kepala hanya memperoleh cakupan area ini.'}`,
        );
    }
    function edit(type, id = '') {
        const r = s.data[sets[type]].find((r) => r.id === id);
        form.reset();
        field(form, 'id').value = id;
        field(form, 'kind').value = type;
        $$('[data-entity-for]', form).forEach((group) => {
            const visible = group.dataset.entityFor.split(',').includes(type);
            group.hidden = !visible;
            $$('input,select,textarea', group).forEach(
                (e) => (e.disabled = !visible),
            );
        });
        field(form, 'password').required = type === 'account' && !r;
        const name = field(form, 'name');
        name.previousElementSibling.textContent =
            type === 'account' || type === 'staff'
                ? 'Nama lengkap *'
                : `Nama ${type === 'division' ? 'divisi' : type === 'unit' ? 'unit' : 'jabatan'} *`;
        optionList(
            field(form, 'divisionId'),
            s.data.divisions.filter((x) => x.active),
            'Pilih divisi induk',
        );
        optionList(
            field(form, 'unitId'),
            s.data.units.filter(
                (x) => x.active && s.division(x.divisionId)?.active,
            ),
            'Pilih unit',
        );
        optionList(
            field(form, 'positionId'),
            s.data.positions.filter((x) => x.active),
            'Pilih jabatan',
        );
        optionList(
            field(form, 'headId'),
            candidates(type, id),
            type === 'division'
                ? 'Pilih akun Kepala Divisi'
                : 'Pilih akun Kepala Unit',
        );
        if (r) {
            for (const [key, value] of Object.entries(r)) {
                const el = field(form, key);
                if (el && el.type !== 'checkbox' && key !== 'password')
                    el.value = value ?? '';
            }
            field(form, 'active').checked = r.active;
            if (type === 'staff')
                field(form, 'unitId').value = s.placement(r)?.unitId || '';
        }
        if (type === 'account' && !r) {
            const requested = new URLSearchParams(location.search).get('role');
            if (['ku', 'kd', 'hc'].includes(requested))
                field(form, 'role').value = requested;
        }
        if (type === 'staff' && r) {
            field(form, 'unitId').disabled = true;
            field(form, 'unitId')
                .closest('label')
                .querySelector('.label').textContent =
                'Unit saat ini (gunakan Pindahkan untuk perubahan)';
        }
        text(
            form,
            '[data-head-help]',
            type === 'division'
                ? 'Hanya akun KD aktif yang belum memimpin divisi lain.'
                : 'Hanya akun KU aktif yang belum memimpin unit lain.',
        );
        text(
            document,
            '#entity-dialog-title',
            `${r ? 'Ubah' : 'Tambah'} ${labels[type][0]}`,
        );
        $('[data-form-error]', form).hidden = true;
        previewHead();
        open('entity-dialog');
    }
    function transfer(id) {
        const p = s.data.staff.find((p) => p.id === id),
            f = $('#transfer-form');
        f.reset();
        field(f, 'id').value = id;
        field(f, 'from').value = s.cycleKey;
        optionList(
            field(f, 'unitId'),
            s.data.units.filter((u) => u.active),
            'Pilih unit tujuan',
        );
        text(
            f,
            '[data-transfer-origin]',
            `${p.name} · asal ${s.unit(s.placement(p)?.unitId)?.name || '-'}`,
        );
        previewTransfer();
        open('transfer-dialog');
    }
    function previewTransfer() {
        const f = $('#transfer-form');
        if (!f) return;
        const p = s.data.staff.find((p) => p.id === field(f, 'id').value);
        if (!p) return;
        const target = s.unit(field(f, 'unitId').value),
            pending = s
                .pending(null, null, field(f, 'from').value)
                .filter(([key]) => key.startsWith(p.id + '|'));
        text(
            f,
            '[data-transfer-impact]',
            `${target ? `Tujuan ${target.name}; penilai ${s.account(target.headId)?.name}; reviewer ${s.account(s.division(target.divisionId)?.headId)?.name}. ` : ''}${pending.length} penilaian non-Final pada rentang perubahan. Histori Final tetap pada cakupan semula.`,
        );
    }
    document.addEventListener('click', async (e) => {
        const n = e.target.closest('[data-entity-new]');
        if (n) edit(n.dataset.entityNew || kind);
        const x = e.target.closest('[data-entity-edit]');
        if (x) edit(kind, x.dataset.entityEdit);
        const more = e.target.closest('[data-entity-more]');
        if (more)
            actions(
                s.data[sets[kind]].find(
                    (x) => x.id === more.dataset.entityMore,
                ),
            );
        const tab = e.target.closest('[data-org-tab]');
        if (tab) {
            kind = tab.dataset.orgTab;
            $$('[data-org-tab]').forEach((b) =>
                b.classList.toggle('active', b === tab),
            );
            render();
        }
        const t = e.target.closest('[data-transfer]');
        if (t) transfer(t.dataset.transfer);
        const a = e.target.closest('[data-activity-id]');
        if (a) {
            const activity = s.data.activities.find(
                (x) => x.id === a.dataset.activityId,
            );
            const root = $('[data-activity-detail]');
            root.replaceChildren();
            const pairs = [
                ['Tindakan', activity.action],
                ['Pelaku', activity.who],
                ['Waktu WIB', dateTime(activity.at)],
                ['Keterangan', activity.detail],
                ['Sebelum', activity.before],
                ['Sesudah', activity.after],
            ];
            for (const [k, v] of pairs) {
                const d = node('section', null, 'border-b border-line py-3');
                d.append(
                    node('h3', k, 'text-xs font-semibold'),
                    node(
                        'p',
                        typeof v === 'object'
                            ? JSON.stringify(v, null, 2)
                            : v || '-',
                        'mt-2 text-xs whitespace-pre-wrap break-words',
                    ),
                );
                root.append(d);
            }
            paginate(root, 'activity-detail', { token: activity.id, size: 1 });
            open('activity-dialog');
        }
    });
    $('[data-org-search]')?.addEventListener('input', render);
    $('[data-org-active]')?.addEventListener('change', render);
    form?.addEventListener('change', previewHead);
    $('#transfer-form')?.addEventListener('change', previewTransfer);
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const v = Object.fromEntries(new FormData(form)),
            type = v.kind,
            list = s.data[sets[type]],
            old = list.find((r) => r.id === v.id),
            before = old ? structuredClone(old) : null;
        const active = field(form, 'active').checked,
            record = { id: v.id || uid(type), name: v.name.trim(), active };
        if (!record.name) return error(form, 'Nama wajib diisi.');
        if (type === 'account') {
            if (
                list.some(
                    (a) =>
                        a.id !== v.id &&
                        (a.nip === v.nip.trim() ||
                            a.email.toLowerCase() ===
                                v.email.trim().toLowerCase()),
                )
            )
                return error(form, 'NIP atau email sudah digunakan.');
            if (
                v.password &&
                (!/\d/.test(v.password) ||
                    !/[a-z]/i.test(v.password) ||
                    v.password.length < 12)
            )
                return error(
                    form,
                    'Sandi awal minimal 12 karakter, mengandung huruf dan angka.',
                );
            if (
                old &&
                (old.role !== v.role || !active) &&
                [...s.data.divisions, ...s.data.units].some(
                    (r) => r.active && r.headId === v.id,
                )
            )
                return error(
                    form,
                    'Ganti penanggung jawab area terlebih dahulu sebelum menonaktifkan atau mengubah role akun ini.',
                );
            if (old?.id === s.actor?.id && !active)
                return error(
                    form,
                    'Akun yang sedang digunakan tidak dapat dinonaktifkan.',
                );
            if (old?.id === s.actor?.id && old.role !== v.role)
                return error(
                    form,
                    'Role akun yang sedang digunakan tidak dapat diubah sendiri.',
                );
            Object.assign(record, {
                nip: v.nip.trim(),
                email: v.email.trim(),
                role: v.role,
            });
        }
        if (['position', 'division', 'unit'].includes(type)) {
            if (
                list.some(
                    (r) =>
                        r.id !== v.id &&
                        r.code.toLowerCase() === v.code.trim().toLowerCase(),
                )
            )
                return error(form, 'Kode sudah digunakan.');
            record.code = v.code.trim();
        }
        if (
            type === 'position' &&
            !active &&
            s.data.staff.some((p) => p.active && p.positionId === v.id)
        )
            return error(
                form,
                'Jabatan masih dipakai staf aktif. Ubah jabatan staf terlebih dahulu.',
            );
        if (type === 'division' || type === 'unit') {
            if (!s.data.positions.some((p) => p.active))
                return error(
                    form,
                    'Buat jabatan terlebih dahulu pada langkah persiapan.',
                );
            if (!candidates(type, v.id).some((a) => a.id === v.headId))
                return error(
                    form,
                    'Pilih akun kepala aktif dengan role yang sesuai dan belum ditugaskan pada area lain.',
                );
            if (type === 'unit' && !s.division(v.divisionId)?.active)
                return error(form, 'Pilih divisi induk yang aktif.');
            if (
                type === 'unit' &&
                old?.divisionId !== v.divisionId &&
                old &&
                s.data.staff.some((p) => s.placement(p)?.unitId === old.id)
            )
                return error(
                    form,
                    'Unit yang memiliki anggota tidak dapat dipindahkan divisinya langsung. Gunakan pemindahan staf yang eksplisit.',
                );
            if (old && old.headId !== v.headId) {
                if (!v.reason.trim())
                    return error(form, 'Alasan pergantian kepala wajib diisi.');
                if (
                    s.pending(
                        type === 'unit' ? old.id : null,
                        type === 'division' ? old.id : null,
                    ).length
                )
                    return error(
                        form,
                        'Selesaikan penilaian non-Final terdampak sebelum mengganti kepala.',
                    );
            }
            if (
                !active &&
                (type === 'division'
                    ? s.data.units.some(
                          (u) => u.active && u.divisionId === v.id,
                      )
                    : s.data.staff.some(
                          (p) => p.active && s.placement(p)?.unitId === v.id,
                      ))
            )
                return error(
                    form,
                    'Area masih memiliki unit atau staf aktif. Selesaikan penempatannya terlebih dahulu.',
                );
            Object.assign(record, { headId: v.headId });
            if (type === 'unit') record.divisionId = v.divisionId;
        }
        if (type === 'staff') {
            if (
                old &&
                old.positionId !== v.positionId &&
                s.pending().some(([key]) => key.startsWith(old.id + '|'))
            )
                return error(
                    form,
                    'Selesaikan penilaian non-Final sebelum mengubah jabatan staf.',
                );
            if (list.some((p) => p.id !== v.id && p.nip === v.nip.trim()))
                return error(form, 'NIP staf sudah digunakan.');
            if (
                !s.data.positions.some((p) => p.id === v.positionId && p.active)
            )
                return error(form, 'Pilih jabatan aktif.');
            const unitId = old ? s.placement(old)?.unitId : v.unitId;
            if (!s.unit(unitId)?.active)
                return error(form, 'Pilih unit aktif.');
            if (
                old &&
                !active &&
                s.pending().some(([key]) => key.startsWith(old.id + '|'))
            )
                return error(
                    form,
                    'Selesaikan penilaian non-Final staf ini sebelum dinonaktifkan.',
                );
            Object.assign(record, {
                nip: v.nip.trim(),
                positionId: v.positionId,
                placements: old?.placements || [
                    { unitId, from: s.cycleKey, until: null },
                ],
            });
        }
        if (
            !(await confirm(
                `${old ? 'Ubah' : 'Tambahkan'} ${record.name}${record.headId ? ` dengan penanggung jawab ${s.account(record.headId).name}` : ''}? Perubahan dicatat dalam riwayat aktivitas.`,
            ))
        )
            return;
        if (s.live)
            return s.api.perform(form, async () => {
                const payload = { name: record.name, is_active: active };
                if (type === 'account')
                    Object.assign(payload, {
                        email: record.email,
                        login_nip: record.nip,
                        role_key: {
                            ku: 'kepala_unit',
                            kd: 'kepala_divisi',
                            hc: 'super_hc',
                        }[record.role],
                        ...(v.password ? { password: v.password } : {}),
                    });
                if (['position', 'division', 'unit'].includes(type))
                    payload.code = record.code;
                if (['division', 'unit'].includes(type))
                    Object.assign(payload, {
                        head_user_id: +record.headId,
                        expected_assignment_id: old?.assignmentId || null,
                        confirmed: true,
                        reason: v.reason || 'Penetapan kepala',
                    });
                if (type === 'unit') payload.division_id = +record.divisionId;
                if (type === 'staff') {
                    delete payload.name;
                    Object.assign(payload, {
                        full_name: record.name,
                        nip: record.nip,
                        position_id: +record.positionId,
                        ...(!old
                            ? {
                                  unit_id: +v.unitId,
                                  effective_from: s.cycleKey + '-01',
                              }
                            : {}),
                    });
                }
                await s.api.request(
                    '/organization/' +
                        resources[type] +
                        (old ? '/' + (old.dbId || old.id) : ''),
                    old ? 'PATCH' : 'POST',
                    payload,
                );
                await s.refresh();
                close('entity-dialog');
                render();
                toast('Perubahan berhasil disimpan.');
            });
        if (old) list[list.indexOf(old)] = record;
        else list.push(record);
        if (type === 'unit' && (!old || old.headId !== record.headId)) {
            if (old) {
                const h = s.data.heads.find(
                    (h) => h.accountId === old.headId && !h.until,
                );
                if (h) h.until = previousMonth(s.cycleKey);
            }
            s.data.heads.push({
                id: `HEAD-${record.headId}`,
                accountId: record.headId,
                unitId: record.id,
                divisionId: record.divisionId,
                from: s.cycleKey,
                until: null,
            });
        }
        s.save(
            `${old ? 'Ubah' : 'Tambah'} ${type}`,
            v.reason || record.name,
            before,
            record,
        );
        form.reset();
        close('entity-dialog');
        render();
        toast(
            type === 'account'
                ? 'Akun dicatat lokal; kredensial login server belum dibuat.'
                : 'Perubahan tersimpan pada simulasi alur.',
        );
    });
    $('#transfer-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (!f.reportValidity()) return;
        const v = Object.fromEntries(new FormData(f)),
            p = s.data.staff.find((p) => p.id === v.id),
            origin = s.placement(p, v.from),
            target = s.unit(v.unitId);
        if (!target?.active || !origin)
            return error(f, 'Pilih unit tujuan dan bulan penempatan yang sah.');
        if (origin.unitId === v.unitId)
            return error(f, 'Unit tujuan masih sama dengan asal.');
        if (p.placements.some((x) => x !== origin && x.from >= v.from))
            return error(
                f,
                'Sudah ada penempatan terjadwal pada atau setelah bulan ini. Periksa riwayat penempatan.',
            );
        if (v.from < s.cycleKey)
            return error(
                f,
                'Penempatan tidak dapat ditulis mundur ke histori.',
            );
        if (
            s
                .pending(null, null, v.from)
                .some(([key]) => key.startsWith(p.id + '|'))
        )
            return error(
                f,
                'Ada penilaian non-Final terdampak. Selesaikan dahulu sebelum pemindahan.',
            );
        if (
            !(await confirm(
                `Pindahkan ${p.name} dari ${s.unit(origin.unitId).name} ke ${target.name} mulai ${v.from}? Penilai baru ${s.account(target.headId)?.name}. Histori Final tidak berubah.`,
            ))
        )
            return;
        if (s.live)
            return s.api.perform(f, async () => {
                await s.api.request(
                    '/employees/' + p.dbId + '/placement',
                    'POST',
                    {
                        unit_id: +v.unitId,
                        effective_from: v.from + '-01',
                        expected_placement_id: origin.id,
                        confirmed: true,
                        reason: v.reason,
                    },
                );
                await s.refresh();
                close('transfer-dialog');
                render();
                toast('Penempatan staf diperbarui.');
            });
        const before = structuredClone(p);
        origin.until = previousMonth(v.from);
        p.placements.push({ unitId: target.id, from: v.from, until: null });
        s.save('Pindahkan staf', v.reason, before, p);
        close('transfer-dialog');
        render();
        toast('Penempatan baru tercatat pada simulasi.');
    });
    function activities() {
        const root = $('[data-flow-activities]');
        if (!root) return;
        root.replaceChildren();
        const q = $('[data-activity-search]')?.value.toLowerCase() || '';
        for (const a of s.data.activities.filter((a) =>
            `${a.action} ${a.who} ${a.detail}`.toLowerCase().includes(q),
        )) {
            const b = node(
                'button',
                null,
                'block w-full p-5 text-left hover:bg-subtle',
            );
            b.type = 'button';
            b.dataset.activityId = a.id;
            b.append(
                node('strong', a.action, 'block font-semibold'),
                node(
                    'p',
                    `${a.who} · ${dateTime(a.at)} WIB`,
                    'mt-1 text-xs text-muted',
                ),
                node('p', a.detail, 'mt-2 text-sm'),
            );
            root.append(b);
        }
        if (!root.childElementCount)
            empty(root, 'Belum ada aktivitas pada simulasi alur ini.');
        paginate(root, 'activities', {
            token: q,
            size: innerHeight < 800 ? 3 : 4,
        });
    }
    $('[data-activity-search]')?.addEventListener('input', activities);
    document.addEventListener('flow-updated', () => {
        render();
        activities();
    });
    render();
    activities();
    if (c.state === 'employee' && kind) edit('staff');
    if (c.state === 'account' && kind) edit('account');
    if (c.state === 'head' && kind) location.assign(link('akun'));
    return { render };
}
