import {
    $,
    $$,
    node,
    text,
    optionList,
    clone,
    field,
    error,
    labelCycle,
    dateTime,
    empty,
} from './flow-dom';
import { open, close, confirm, toast } from './ui';
import { uid, previousMonth } from './flow-store';
import { paginate, reveal } from './pagination';
export function initKpi(c, s) {
    let level =
            c.role === 'kd' || c.state === 'division-kpi' ? 'division' : 'unit',
        areaId,
        selected,
        imported,
        dirty = false,
        editingRow;
    const editor = $('[data-kpi-editor]');
    function areas() {
        return level === 'unit'
            ? s.scopedUnits().filter((u) => u.active)
            : s.data.divisions.filter(
                  (d) =>
                      d.active && (c.role === 'hc' || d.headId === s.actor?.id),
              );
    }
    function row(item) {
        const el = clone('flow-kpi-item', $('[data-kpi-body]'));
        el.dataset.itemId = item.id;
        $$('[data-kpi-field]', el).forEach((e) => {
            e.value = item[e.dataset.kpiField] ?? '';
            e.disabled = c.role !== 'hc';
        });
        text(el, '[data-item-name]', item.name || 'Indikator belum lengkap');
        text(el, '[data-item-pillar]', item.pillar);
        text(el, '[data-item-target]', item.target || '-');
        text(el, '[data-item-weight]', `${item.weight || 0}%`);
        if (c.role !== 'hc')
            $$('[data-kpi-field]', el).forEach((e) => e.remove());
        return el;
    }
    function pageItems() {
        paginate($('[data-kpi-body]'), 'kpi-items', {
            token: areaId + level,
            kind: 'score',
        });
    }
    function editItem(el) {
        editingRow = el;
        const f = $('#indicator-form');
        f.reset();
        const item = el
            ? c.role === 'hc'
                ? Object.fromEntries(
                      $$('[data-kpi-field]', el).map((e) => [
                          e.dataset.kpiField,
                          e.value,
                      ]),
                  )
                : selected.items.find((i) => i.id === el.dataset.itemId)
            : { pillar: 'Technical Care', weight: 0 };
        for (const [key, value] of Object.entries(item)) {
            const input = field(f, key);
            if (input) input.value = value;
        }
        $$('input,select', f).forEach((e) => {
            e.disabled = c.role !== 'hc';
        });
        $('[data-form-error]', f).hidden = true;
        open('indicator-dialog');
    }
    $('#indicator-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (c.role !== 'hc' || !e.target.reportValidity()) return;
        const item = Object.fromEntries(new FormData(e.target));
        item.id = editingRow?.dataset.itemId || uid('KPI-ITEM');
        item.weight = +item.weight;
        if (
            !item.name.trim() ||
            !item.target.trim() ||
            !(item.weight > 0 && item.weight <= 100)
        )
            return error(
                e.target,
                'Lengkapi indikator, target dan bobot positif sampai 100%.',
            );
        const el = row(item);
        if (editingRow) editingRow.replaceWith(el);
        dirty = true;
        weights();
        pageItems();
        reveal(el);
        close('indicator-dialog');
        toast(
            'Indikator diperbarui di editor. Terapkan versi untuk menyimpan.',
        );
    });
    function values() {
        if (c.role !== 'hc') return selected?.items || [];
        return $$('[data-kpi-body] tr').map((r) =>
            Object.fromEntries([
                ['id', r.dataset.itemId],
                ...$$('[data-kpi-field]', r).map((e) => [
                    e.dataset.kpiField,
                    e.dataset.kpiField === 'weight' ? +e.value : e.value.trim(),
                ]),
            ]),
        );
    }
    function weights() {
        if (!editor) return;
        const sum = values().reduce((n, r) => n + r.weight, 0);
        text(document, '[data-kpi-weight]', Math.round(sum * 10000) / 10000);
        return sum;
    }
    function validate() {
        const items = values(),
            name = field(editor, 'name').value.trim(),
            from = field(editor, 'from').value;
        if (!areaId || !name || !/^\d{4}-\d{2}$/.test(from))
            return 'Pilih area, nama template dan bulan berlaku.';
        if (
            !items.length ||
            items.some(
                (r) =>
                    !r.name ||
                    !r.pillar ||
                    !r.target ||
                    !Number.isFinite(r.weight) ||
                    r.weight <= 0 ||
                    r.weight > 100,
            )
        )
            return 'Setiap indikator memerlukan pilar, nama, target dan bobot positif.';
        if (Math.abs(weights() - 100) > 0.0001)
            return 'Total bobot harus tepat 100%.';
        return '';
    }
    function render() {
        if (!editor) return;
        const options = areas();
        optionList($('[data-kpi-area]'), options, 'Pilih area KPI');
        if (!options.some((a) => a.id === areaId)) areaId = options[0]?.id;
        $('[data-kpi-area]').value = areaId || '';
        const versions = s.data.kpis
            .filter((k) => k.level === level && k.areaId === areaId)
            .sort((a, b) => b.version - a.version);
        selected =
            versions.find((k) => k.id === selected?.id) ||
            versions.find(
                (k) =>
                    k.from <= s.cycleKey && (!k.until || k.until >= s.cycleKey),
            ) ||
            versions[0];
        optionList(
            $('[data-kpi-version]'),
            versions.map((k) => ({
                id: k.id,
                name: `Versi ${k.version} · ${k.from}${k.until ? ' sampai ' + k.until : ''}`,
            })),
            'Belum ada versi',
        );
        $('[data-kpi-version]').value = selected?.id || '';
        const area = options.find((a) => a.id === areaId);
        text(
            document,
            '[data-kpi-purpose]',
            level === 'unit'
                ? `${area?.name || 'Unit belum dipilih'}: definisi KPI untuk seluruh staf di Unit. Penilai: Kepala Unit ${s.account(area?.headId)?.name || 'belum ditetapkan'}.`
                : `${area?.name || 'Divisi belum dipilih'}: definisi KPI untuk Kepala Unit di Divisi. Penilai: Kepala Divisi ${s.account(area?.headId)?.name || 'belum ditetapkan'}.`,
        );
        field(editor, 'name').value =
            selected?.name ||
            `KPI ${level === 'unit' ? 'Staf' : 'Kepala Unit'} - ${area?.name || ''}`;
        field(editor, 'from').value = selected?.from || s.cycleKey;
        $$('input', editor).forEach((e) => (e.readOnly = c.role !== 'hc'));
        $('[data-kpi-body]').replaceChildren();
        if (selected) selected.items.forEach(row);
        else if (c.role === 'hc')
            row({ id: uid('KPI-ITEM'), pillar: 'Technical Care', weight: 100 });
        if (!selected && c.role !== 'hc') {
            const tr = node('tr'),
                td = node(
                    'td',
                    'KPI untuk area ini belum disusun. Hubungi Super HC.',
                    'empty',
                );
            td.colSpan = 7;
            tr.append(td);
            $('[data-kpi-body]').append(tr);
        }
        text(
            document,
            '[data-kpi-version-label]',
            selected
                ? `Versi ${selected.version} · sudah diterapkan`
                : 'Versi baru',
        );
        weights();
        pageItems();
        const del = $('[data-flow-action="delete-kpi-version"]');
        if (del) del.hidden = !selected;
        dirty = false;
    }
    function preview() {
        const message = validate();
        if (message) {
            const el = $('[data-kpi-error]');
            el.hidden = false;
            el.textContent = message;
            return false;
        }
        const root = $('[data-kpi-preview]');
        root.replaceChildren();
        const targets = s
            .people(level === 'unit' ? 'member' : 'unit_head')
            .filter((p) =>
                level === 'unit'
                    ? p.unitId === areaId
                    : p.divisionId === areaId,
            );
        root.append(
            node(
                'p',
                `${field(editor, 'name').value} · berlaku ${labelCycle(field(editor, 'from').value)}`,
                'font-semibold',
            ),
            node(
                'p',
                `${targets.length} ${level === 'unit' ? 'staf' : 'Kepala Unit'} terdampak pada cakupan saat ini. Bobot ${weights()}%.`,
                'my-3 text-sm text-muted',
            ),
        );
        const items = node('div');
        root.append(items);
        values().forEach((r) =>
            items.append(
                node(
                    'p',
                    `${r.name} · target ${r.target} · ${r.weight}%`,
                    'border-b border-line py-3 text-sm',
                ),
            ),
        );
        paginate(items, 'kpi-preview', { token: areaId, size: 4 });
        return true;
    }
    document.addEventListener('click', async (e) => {
        const l = e.target.closest('[data-kpi-level]');
        if (l) {
            if (
                dirty &&
                !(await confirm(
                    'Ganti jenis KPI dan buang perubahan yang belum diterapkan?',
                ))
            )
                return;
            level = l.dataset.kpiLevel;
            areaId = null;
            selected = null;
            $$('[data-kpi-level]').forEach((b) =>
                b.classList.toggle('active', b === l),
            );
            render();
        }
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (!editor) return;
        const indicator = e.target.closest('[data-indicator-edit]');
        if (indicator) editItem(indicator.closest('tr'));
        if (action === 'add-kpi-item') {
            editItem(null);
        }
        if (
            action === 'remove-kpi-item' &&
            (await confirm(
                'Hapus indikator dari editor yang belum diterapkan?',
            ))
        ) {
            e.target.closest('tr').remove();
            dirty = true;
            weights();
            pageItems();
        }
        if (action === 'delete-kpi-version' && c.role === 'hc' && selected) {
            if (
                Object.values(s.data.assessments).some(
                    (a) => a.snapshot?.id === selected.id,
                )
            )
                return toast(
                    'Versi sudah digunakan pada penilaian dan tidak dapat dihapus.',
                    true,
                );
            if (
                !(await confirm(
                    `Hapus ${selected.name} versi ${selected.version}? Cakupan kembali mengikuti versi sebelumnya bila tersedia.`,
                ))
            )
                return;
            const removed = structuredClone(selected);
            s.data.kpis = s.data.kpis.filter((k) => k.id !== removed.id);
            const siblings = s.data.kpis
                .filter((k) => k.level === level && k.areaId === areaId)
                .sort((a, b) => a.from.localeCompare(b.from));
            siblings.forEach(
                (k, i) =>
                    (k.until = siblings[i + 1]
                        ? previousMonth(siblings[i + 1].from)
                        : null),
            );
            selected = null;
            dirty = false;
            s.save('Hapus versi KPI', removed.name, removed, null);
            render();
            toast('Versi yang belum digunakan telah dihapus.');
        }
        if (action === 'preview-kpi' && preview()) open('kpi-preview-dialog');
        if (action === 'apply-kpi' && c.role === 'hc') {
            if (!preview()) return;
            const from = field(editor, 'from').value;
            if (from < s.cycleKey) {
                text(
                    document,
                    '[data-kpi-error]',
                    'Versi tidak diterapkan mundur ke periode historis.',
                );
                $('[data-kpi-error]').hidden = false;
                return;
            }
            const used = Object.entries(s.data.assessments).some(
                ([key, a]) =>
                    key.split('|')[1] >= from &&
                    (level === 'unit'
                        ? a.scope.unitId === areaId
                        : a.scope.divisionId === areaId &&
                          key.startsWith('HEAD-')),
            );
            if (used) {
                text(
                    document,
                    '[data-kpi-error]',
                    'Rentang ini sudah memakai penilaian. Pilih bulan berikutnya yang belum dinilai.',
                );
                $('[data-kpi-error]').hidden = false;
                return;
            }
            if (
                !(await confirm(
                    `Terapkan KPI ${level === 'unit' ? 'Unit untuk staf' : 'Divisi untuk Kepala Unit'} pada ${areas().find((a) => a.id === areaId)?.name}, mulai ${labelCycle(from)}? Versi sebelumnya dan snapshot penilaian tetap dipertahankan.`,
                ))
            )
                return;
            const existing = s.data.kpis.filter(
                (k) => k.level === level && k.areaId === areaId,
            );
            if (existing.some((k) => k.from >= from)) {
                text(
                    document,
                    '[data-kpi-error]',
                    'Sudah ada versi mulai bulan ini atau sesudahnya. Pilih bulan setelah versi terakhir.',
                );
                $('[data-kpi-error]').hidden = false;
                return;
            }
            const prev = existing.sort((a, b) =>
                b.from.localeCompare(a.from),
            )[0];
            if (prev) prev.until = previousMonth(from);
            const k = {
                id: uid('KPI'),
                level,
                areaId,
                name: field(editor, 'name').value.trim(),
                version: Math.max(0, ...existing.map((k) => k.version)) + 1,
                from,
                until: null,
                items: values(),
            };
            s.data.kpis.push(k);
            s.save(
                'Terapkan versi KPI',
                `${k.name} · versi ${k.version} · ${from}`,
                null,
                k,
            );
            selected = k;
            dirty = false;
            render();
            toast('Versi KPI diterapkan pada simulasi.');
        }
        if (action === 'use-import' && imported) {
            $('[data-kpi-body]').replaceChildren();
            imported.forEach(row);
            pageItems();
            dirty = true;
            weights();
            close('import-dialog');
            toast('Indikator masuk editor. Periksa lalu Terapkan versi KPI.');
        }
    });
    $('[data-kpi-area]')?.addEventListener('change', async (e) => {
        if (
            dirty &&
            !(await confirm(
                'Ganti area dan buang perubahan yang belum diterapkan?',
            ))
        ) {
            e.target.value = areaId;
            return;
        }
        areaId = e.target.value;
        selected = null;
        render();
    });
    $('[data-kpi-version]')?.addEventListener('change', async (e) => {
        if (
            dirty &&
            !(await confirm('Buka versi lain dan buang perubahan editor?'))
        ) {
            e.target.value = selected?.id || '';
            return;
        }
        selected = s.data.kpis.find((k) => k.id === e.target.value);
        render();
    });
    editor?.addEventListener('input', () => {
        dirty = true;
        weights();
    });
    editor?.addEventListener('submit', (e) => e.preventDefault());
    $('[data-kpi-import]')?.addEventListener('change', async (e) => {
        const file = e.target.files[0],
            root = $('[data-kpi-import-preview]'),
            button = $('[data-flow-action="use-import"]');
        button.disabled = true;
        imported = null;
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            root.textContent = 'Ukuran maksimal 2 MB.';
            return;
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
            root.textContent =
                'Pembacaan Excel belum dihubungkan. Gunakan CSV untuk mencoba alur lokal.';
            return;
        }
        const rows = parseCSV(await file.text())
            .slice(1)
            .filter((r) => r.some(Boolean));
        if (
            !rows.length ||
            rows.some(
                (r) =>
                    r.length !== 7 ||
                    !r[1] ||
                    !r[5] ||
                    !Number.isFinite(+r[6]) ||
                    +r[6] <= 0,
            ) ||
            Math.abs(rows.reduce((n, r) => n + +r[6], 0) - 100) > 0.0001
        ) {
            root.textContent =
                'CSV tidak valid. Periksa tujuh kolom, nama, target dan bobot tepat 100%.';
            return;
        }
        imported = rows.map((r) => ({
            id: uid('ITEM'),
            pillar: r[0],
            name: r[1],
            numerator: r[2],
            denominator: r[3],
            formula: r[4],
            target: r[5],
            weight: +r[6],
        }));
        root.textContent = `${rows.length} indikator valid, bobot 100%. Belum disimpan hingga diterapkan.`;
        button.disabled = false;
    });
    window.addEventListener('beforeunload', (e) => {
        if (dirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    const coverage = $('[data-kpi-coverage]');
    if (coverage)
        for (const level of ['unit', 'division'])
            for (const area of level === 'unit'
                ? s.data.units
                : s.data.divisions) {
                const panel = node('section', null, 'card p-5'),
                    k = s.data.kpis
                        .filter(
                            (k) =>
                                k.level === level &&
                                k.areaId === area.id &&
                                k.from <= s.cycleKey &&
                                (!k.until || k.until >= s.cycleKey),
                        )
                        .at(-1);
                panel.append(
                    node('h2', area.name, 'section-title'),
                    node(
                        'p',
                        `${level === 'unit' ? 'Untuk staf · penilai KU' : 'Untuk Kepala Unit · penilai KD'} · ${k?.name || 'KPI belum disusun'}`,
                        'mt-3 text-sm text-muted',
                    ),
                );
                coverage.append(panel);
            }
    paginate(coverage, 'coverage', { size: innerWidth <= 600 ? 2 : 4 });
    render();
    if (c.page === 'impor') open('import-dialog');
}
function parseCSV(text) {
    const rows = [];
    let row = [],
        v = '',
        quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') {
                v += '"';
                i++;
            } else quoted = !quoted;
        } else if (ch === ',' && !quoted) {
            row.push(v.trim());
            v = '';
        } else if (ch === '\n' && !quoted) {
            row.push(v.trim());
            rows.push(row);
            row = [];
            v = '';
        } else if (ch !== '\r') v += ch;
    }
    if (quoted) return [];
    if (v || row.length) {
        row.push(v.trim());
        rows.push(row);
    }
    return rows;
}
export function initCycles(c, s) {
    const form = $('#cycle-form');
    if (!form) return;
    function render() {
        const body = $('[data-cycle-body]');
        body.replaceChildren();
        for (const x of [...s.data.cycles].sort((a, b) =>
            b.id.localeCompare(a.id),
        )) {
            const tr = node('tr');
            tr.append(
                node('td', labelCycle(x.id)),
                node(
                    'td',
                    {
                        open: 'Terbuka',
                        planned: 'Direncanakan',
                        closed: 'Ditutup',
                    }[x.status],
                ),
                node(
                    'td',
                    `${dateTime(x.opens)} / ${dateTime(x.submission)}`,
                    'text-xs',
                ),
                node(
                    'td',
                    `${dateTime(x.approval)} / ${dateTime(x.closes)}`,
                    'text-xs',
                ),
            );
            const td = node('td');
            const used = Object.keys(s.data.assessments).some((k) =>
                k.endsWith('|' + x.id),
            );
            if (x.status !== 'closed' && !used) {
                const edit = node(
                    'button',
                    x.status === 'planned' ? 'Ubah / buka' : 'Ubah',
                    'link v2-row-action',
                );
                edit.type = 'button';
                edit.dataset.cycleEdit = x.id;
                td.append(edit);
            }
            if (x.status === 'open') {
                const close = node(
                    'button',
                    'Tutup periode',
                    'link v2-row-action',
                );
                close.type = 'button';
                close.dataset.cycleClose = x.id;
                td.append(close);
            }
            if (!td.childElementCount)
                td.textContent = used
                    ? 'Jadwal terpakai, terkunci'
                    : 'Hanya baca';
            if (!used && x.status !== 'open') {
                if (!td.children.length) td.replaceChildren();
                const del = node('button', 'Hapus', 'link v2-row-action');
                del.type = 'button';
                del.dataset.cycleDelete = x.id;
                td.append(del);
            }
            tr.append(td);
            body.append(tr);
        }
        const root = $('[data-cycle-categories]');
        paginate(body, 'cycles');
        root.replaceChildren();
        const cats = s.cycle()?.categories;
        if (cats)
            for (const [label, value] of [
                ['Sangat Baik', `≥ ${cats.sb}`],
                ['Baik', `${cats.b} - < ${cats.sb}`],
                ['Cukup', `${cats.c} - < ${cats.b}`],
                ['Kurang', `< ${cats.c}`],
            ]) {
                const cell = node('div', null, 'rounded-lg bg-subtle p-4');
                cell.append(
                    node('strong', label, 'block text-sm'),
                    node('p', value, 'mt-2 text-sm'),
                );
                root.append(cell);
            }
    }
    function edit(id) {
        form.reset();
        const x = s.data.cycles.find((x) => x.id === id);
        field(form, 'id').value = id || '';
        field(form, 'month').readOnly = !!id;
        for (const [key, value] of Object.entries(
            x || {
                month: '2026-12',
                status: 'planned',
                opens: '2026-12-01T00:00',
                submission: '2027-01-05T23:59',
                approval: '2027-01-10T23:59',
                closes: '2027-01-15T23:59',
            },
        )) {
            if (field(form, key)) field(form, key).value = value;
        }
        field(form, 'month').value = x?.id || '2026-12';
        for (const [key, value] of Object.entries(
            x?.categories || { sb: 90, b: 80, c: 70 },
        ))
            field(form, key).value = value;
        $('[data-form-error]', form).hidden = true;
        open('cycle-dialog');
    }
    document.addEventListener('click', async (e) => {
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'new-cycle') edit();
        if (
            action === 'empty-preview' &&
            (await confirm(
                'Mulai persiapan kosong pada simulasi browser? Akun HC ini dipertahankan. Data contoh lainnya dihapus lokal; database tidak berubah.',
            ))
        ) {
            s.data.accounts = [s.actor];
            for (const name of [
                'positions',
                'divisions',
                'units',
                'staff',
                'heads',
                'kpis',
                'cycles',
                'activities',
            ])
                s.data[name] = [];
            s.data.assessments = {};
            s.save('Mulai persiapan kosong', 'Data simulasi dikosongkan');
            location.assign(c.links.akun);
        }

        if (
            action === 'reset-preview' &&
            (await confirm(
                'Hapus perubahan data contoh alur v2 pada browser ini? Database tidak berubah.',
            ))
        )
            s.reset();
        const a = e.target.closest('[data-cycle-edit]');
        if (a) edit(a.dataset.cycleEdit);
        const del = e.target.closest('[data-cycle-delete]');
        if (del) {
            const x = s.data.cycles.find(
                (x) => x.id === del.dataset.cycleDelete,
            );
            if (
                x.status === 'open' ||
                Object.keys(s.data.assessments).some((k) =>
                    k.endsWith('|' + x.id),
                )
            )
                return toast(
                    'Periode terbuka atau terpakai tidak dapat dihapus.',
                    true,
                );
            if (
                await confirm(
                    `Hapus periode ${labelCycle(x.id)} yang belum digunakan?`,
                )
            ) {
                s.data.cycles = s.data.cycles.filter((y) => y !== x);
                s.save('Hapus periode', x.id, x, null);
                render();
                toast('Periode yang belum digunakan telah dihapus.');
            }
        }
        const b = e.target.closest('[data-cycle-close]');
        if (b) {
            const x = s.data.cycles.find((x) => x.id === b.dataset.cycleClose),
                remaining = s
                    .allPeople(x.id)
                    .filter(
                        (p) => s.assessment(p.id, x.id).status !== 'Final',
                    ).length;
            if (
                await confirm(
                    `Tutup ${labelCycle(x.id)}? ${remaining} orang belum Final. Pengisian dan keputusan akan dihentikan; histori tetap dapat dibaca.`,
                )
            ) {
                const before = structuredClone(x);
                x.status = 'closed';
                s.save('Tutup periode', x.id, before, x);
                render();
                toast('Periode ditutup pada simulasi.');
            }
        }
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const v = Object.fromEntries(new FormData(form)),
            old = s.data.cycles.find((x) => x.id === v.id),
            dates = ['opens', 'submission', 'approval', 'closes'].map((k) =>
                Date.parse(v[k] + '+07:00'),
            );
        if (
            dates.some(Number.isNaN) ||
            !(
                dates[0] < dates[1] &&
                dates[1] <= dates[2] &&
                dates[2] <= dates[3]
            )
        )
            return error(
                form,
                'Urutan jadwal harus: mulai < batas KU ≤ batas KD ≤ tutup.',
            );
        if (!(+v.sb > +v.b && +v.b > +v.c && +v.c > 0 && +v.sb <= 100))
            return error(
                form,
                'Kategori harus berurutan: Sangat Baik > Baik > Cukup.',
            );
        if (!old && s.data.cycles.some((x) => x.id === v.month))
            return error(form, 'Periode bulan ini sudah ada.');
        if (
            old &&
            Object.keys(s.data.assessments).some((k) =>
                k.endsWith('|' + old.id),
            )
        )
            return error(
                form,
                'Jadwal/kategori sudah terpakai dan tidak diubah.',
            );
        if (v.status === 'open') {
            const missing = [
                ...s.data.units
                    .filter((u) => u.active)
                    .map((u) => ({ level: 'unit', area: u })),
                ...s.data.divisions
                    .filter((d) => d.active)
                    .map((d) => ({ level: 'division', area: d })),
            ].filter(
                ({ level, area }) =>
                    !s.account(area.headId)?.active ||
                    !s.data.kpis.some(
                        (k) =>
                            k.level === level &&
                            k.areaId === area.id &&
                            k.from <= v.month &&
                            (!k.until || k.until >= v.month),
                    ),
            );
            if (missing.length)
                return error(
                    form,
                    'Lengkapi akun kepala dan KPI untuk: ' +
                        missing.map((x) => x.area.name).join(', '),
                );
        }
        if (
            !(await confirm(
                `Simpan periode ${labelCycle(v.month)} dengan status ${v.status === 'open' ? 'Terbuka' : 'Direncanakan'}? Jadwal menggunakan WIB.`,
            ))
        )
            return;
        const record = {
            id: v.month,
            status: v.status,
            opens: v.opens,
            submission: v.submission,
            approval: v.approval,
            closes: v.closes,
            categories: { sb: +v.sb, b: +v.b, c: +v.c },
        };
        const before = old ? structuredClone(old) : null;
        if (old) s.data.cycles[s.data.cycles.indexOf(old)] = record;
        else s.data.cycles.push(record);
        s.save('Atur periode', record.id, before, record);
        close('cycle-dialog');
        render();
        toast('Periode dicatat pada simulasi.');
    });
    render();
}
