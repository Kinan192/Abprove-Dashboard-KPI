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
    empty,
} from './flow-dom';
import { open, close, confirm, toast } from './ui';
import { uid } from './flow-store';
import { paginate, reveal } from './pagination';
export function initKpi(c, s) {
    let level = c.role === 'kd' ? 'division' : 'unit',
        areaId,
        selected,
        imported,
        dirty = false,
        editingRow;
    const editor = $('[data-kpi-editor]');
    $('#kpi-name-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (c.role !== 'hc' || !event.target.reportValidity()) return;
        field(editor, 'name').value = field(event.target, 'name').value.trim();
        dirty = true;
        close('kpi-name-dialog');
        toast(
            'Nama diperbarui di editor. Klik Simpan perubahan untuk menyimpan.',
        );
    });
    const params = new URLSearchParams(location.search);
    if (c.role === 'hc' && ['unit', 'division'].includes(params.get('level')))
        level = params.get('level');
    if (params.get('area')) areaId = params.get('area');
    function areas() {
        if (c.role === 'ku') {
            const divisions = new Set(s.scopedUnits().map((u) => u.divisionId));
            return (s.data.kpiUnits || s.data.units).filter(
                (u) => u.active && divisions.has(u.divisionId),
            );
        }
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
        for (const key of [
            'name',
            'pillar',
            'numerator',
            'denominator',
            'formula',
            'target',
        ])
            text(el, `[data-item-${key}]`, item[key] || '-');
        text(el, '[data-item-number]', $('[data-kpi-body]').children.length);
        if (c.role !== 'hc')
            $$('[data-kpi-field]', el).forEach((e) => e.remove());
        return el;
    }
    function pageItems() {
        $$('[data-kpi-body] > tr').forEach((row, index) =>
            text(row, '[data-item-number]', index + 1),
        );
        paginate($('[data-kpi-body]'), 'kpi-items', {
            token: areaId + level,
            kind: 'kpi',
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
            : { pillar: '', weight: 0 };
        for (const [key, value] of Object.entries(item)) {
            const input = field(f, key);
            if (input) input.value = value;
        }
        $$('input,select', f).forEach((e) => {
            e.disabled = c.role !== 'hc';
        });
        const method = $('[data-kpi-method]', f);
        if (method) method.value = item.formula ? 'formula' : 'manual';
        syncMethod(method?.value === 'formula');
        fillRecipients();
        $('[data-form-error]', f).hidden = true;
        open('indicator-dialog');
    }
    function syncMethod(showFormula) {
        const box = $('[data-kpi-formula-fields]');
        if (!box) return;
        box.hidden = !showFormula;
        box.querySelectorAll('input,textarea,select').forEach((el) => {
            el.disabled = !showFormula || c.role !== 'hc';
        });
        const help = $('[data-kpi-method-help]');
        if (help)
            help.textContent = showFormula
                ? 'Formula disimpan sebagai definisi pengukuran. Penilai tetap memasukkan nilai 10–100 pada backend.'
                : 'Penilai memasukkan satu nilai 10–100. Formula tidak dipakai.';
    }
    function fillRecipients() {
        const box = $('[data-kpi-recipients]');
        if (!box) return;
        const area = areas().find((a) => a.id === areaId);
        if (!area || !areaId) {
            box.textContent = 'Pilih area KPI untuk melihat penerima.';
            return;
        }
        if (level === 'unit') {
            const people = (s.data.staff || []).filter((st) =>
                (st.placements || []).some(
                    (p) =>
                        p.unitId === areaId &&
                        p.from <= s.cycleKey &&
                        (!p.until || p.until >= s.cycleKey),
                ),
            );
            const names = people
                .slice(0, 3)
                .map((p) => p.name)
                .join(', ');
            box.textContent = `${people.length} staf ${area.name}${names ? ': ' + names + (people.length > 3 ? ', …' : '') : ''}`;
        } else {
            const head = (s.data.heads || []).find(
                (h) =>
                    h.divisionId === areaId &&
                    h.from <= s.cycleKey &&
                    (!h.until || h.until >= s.cycleKey),
            );
            const account = head ? s.account(head.accountId) : null;
            box.textContent = account
                ? `Kepala Unit di ${area.name}: ${account.name}`
                : `Belum ada Kepala Unit aktif untuk ${area.name}.`;
        }
    }
    $('[data-kpi-method]')?.addEventListener('change', (e) =>
        syncMethod(e.target.value === 'formula'),
    );
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
        $$('[data-kpi-weight]').forEach(
            (el) => (el.textContent = Math.round(sum * 10000) / 10000),
        );
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
                    [...r.pillar].length > 64 ||
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
        const errorBox = $('[data-kpi-error]');
        if (errorBox) {
            errorBox.hidden = true;
            errorBox.textContent = '';
        }
        $$('[data-kpi-level]').forEach((button) => {
            button.classList.toggle('active', button.dataset.kpiLevel === level);
            button.setAttribute(
                'aria-pressed',
                String(button.dataset.kpiLevel === level),
            );
        });
        const options = areas();
        optionList($('[data-kpi-area]'), options, 'Pilih area KPI');
        if (!options.some((a) => a.id === areaId))
            areaId =
                (c.role === 'ku'
                    ? options.find((a) => a.id === s.scopedUnits()[0]?.id)
                    : null
                )?.id || options[0]?.id;
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
                name: `Perubahan ${k.version} · ${k.from}${k.until ? ' sampai ' + k.until : ''}`,
            })),
            'Belum ada versi',
        );
        $('[data-kpi-version]').value = selected?.id || '';
        const area = options.find((a) => a.id === areaId);
        text(
            document,
            '[data-kpi-heading]',
            `KPI ${level === 'unit' ? 'Unit' : 'Divisi'}: ${area?.name || 'pilih area'}`,
        );
        const pillars = [
            ...new Set(versions.flatMap((v) => v.items.map((i) => i.pillar))),
        ];
        $('#kpi-pillars')?.replaceChildren(
            ...pillars.map((p) => new Option(p, p)),
        );
        field(editor, 'name').value =
            selected?.name ||
            `KPI ${level === 'unit' ? 'Staf' : 'Kepala Unit'} - ${area?.name || ''}`;
        field(editor, 'from').value = selected?.from || s.cycleKey;
        $$('input', editor).forEach((e) => (e.readOnly = c.role !== 'hc'));
        $('[data-kpi-body]').replaceChildren();
        if (selected) selected.items.forEach(row);
        else if (c.role === 'hc')
            row({ id: uid('KPI-ITEM'), pillar: '', weight: 100 });
        if (!selected && c.role !== 'hc') {
            const tr = node('tr'),
                td = node(
                    'td',
                    'KPI untuk area ini belum disusun. Hubungi Super HC.',
                    'empty',
                );
            td.colSpan = c.role === 'hc' ? 9 : 8;
            tr.append(td);
            $('[data-kpi-body]').append(tr);
        }
        text(
            document,
            '[data-kpi-version-label]',
            selected
                ? `Versi ${selected.version} · sudah disimpan`
                : 'Indikator baru',
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
            render();
        }
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'rename-kpi' && c.role === 'hc') {
            field($('#kpi-name-form'), 'name').value = field(
                editor,
                'name',
            ).value;
            open('kpi-name-dialog');
        }
        if (action === 'export-kpi' && selected) {
            const id = selected.id;
            const download = async () => {
                const { XL } = await import('./xlsx');
                await s.refresh();
                const k = s.data.kpis.find((k) => k.id === id);
                if (!k)
                    throw new Error(
                        'KPI tidak lagi tersedia. Muat ulang halaman.',
                    );
                const area =
                    k.level === 'unit'
                        ? s.unit(k.areaId)
                        : s.division(k.areaId);
                const sheets = [
                    {
                        name: 'Indikator KPI',
                        cols: [22, 50, 26, 26, 30, 22, 12],
                        rows: [
                            [k.name, area?.name || '', k.from],
                            [
                                'Pilar',
                                'Indikator',
                                'Numerator',
                                'Denominator',
                                'Formula',
                                'Target',
                                'Bobot (%)',
                            ],
                            ...k.items.map((i) => [
                                i.pillar,
                                i.name,
                                i.numerator,
                                i.denominator,
                                i.formula,
                                i.target,
                                +i.weight,
                            ]),
                        ],
                    },
                ];
                const url = URL.createObjectURL(
                    new Blob([XL.build(sheets)], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    }),
                );
                const a = node('a');
                a.href = url;
                a.download = `KPI_${k.level}_${area?.name || k.areaId}_${k.from}.xlsx`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1500);
                toast('Indikator dan bobot KPI telah diekspor.');
            };
            return s.api.perform(null, download);
        }
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
            return s.api.perform(null, async () => {
                await s.api.request(
                    '/kpi-templates/' + removed.id,
                    'DELETE',
                    {},
                );
                selected = null;
                dirty = false;
                await s.refresh();
                render();
                toast('Versi KPI telah dihapus.');
            });
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
            return s.api.perform(editor, async () => {
                await s.api.request('/kpi-templates', 'POST', {
                    scope_level: level,
                    [level === 'unit' ? 'unit_id' : 'division_id']: +areaId,
                    name: field(editor, 'name').value.trim(),
                    effective_from: from + '-01',
                    items: values().map((i) => ({
                        pillar: i.pillar,
                        name: i.name,
                        numerator: i.numerator || null,
                        denominator: i.denominator || null,
                        measurement_formula: i.formula || null,
                        target_text: i.target,
                        weight_percent: String(i.weight),
                    })),
                });
                dirty = false;
                selected = null;
                await s.refresh();
                render();
                toast('Versi KPI berhasil diterapkan.');
            });
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
    editor?.addEventListener('input', (event) => {
        if (!event.target.matches('[data-kpi-field],[name=name],[name=from]'))
            return;
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
        return s.api.perform(null, async () => {
            const fd = new FormData();
            fd.append('file', file);
            const result = await s.api.request(
                '/kpi-templates/import-preview',
                'POST',
                fd,
            );
            if (!result.data.valid) {
                root.textContent = Object.values(result.data.errors)
                    .flat()
                    .join('\n');
                return;
            }
            imported = result.data.items.map((i) => ({
                id: uid('ITEM'),
                pillar: i.pillar,
                name: i.name,
                numerator: i.numerator || '',
                denominator: i.denominator || '',
                formula: i.measurement_formula || '',
                target: i.target_text,
                weight: +i.weight_percent,
            }));
            root.textContent = `${imported.length} indikator valid, bobot 100%. Terapkan untuk menyimpan.`;
            button.disabled = false;
        });
    });
    if (editor && c.role === 'hc')
        window.addEventListener('beforeunload', (e) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    render();
    if (c.page === 'impor') open('import-dialog');
}
