import { $, node, field, error, optionList } from '../flow-dom';
import { open, close, toast } from '../ui';
import { syncSearchableSelects } from '../searchable-select';
import { createWizard } from './wizard';
import {
    MAX_BATCH,
    currentMonth,
    earliestPlacementMonth,
    placementNow,
    blockerNotice,
    pairs,
    period,
    monthLabel,
} from './shared';

/**
 * Individual and bulk staff transfers: pick staff by division/unit/position/search, choose the target
 * unit, month and reason, review the per-staff impact from POST /employees/transfer-preview, then
 * POST /employees/transfers moves everyone in one transaction.
 */
export function initStaffTransfer(s) {
    const dialog = $('#staff-transfer-dialog'),
        form = $('#staff-transfer-form'),
        list = $('[data-pick-list]', form),
        all = $('[data-pick-all]', form);
    let selected = new Set(),
        visible = [],
        preview = null,
        controller = null;
    const unitOf = (staff) => s.unit(placementNow(s, staff)?.unitId);
    const unitLabel = (u) => `${u.name} · ${s.division(u.divisionId)?.name || '-'}`;
    const byDbId = (id) => s.data.staff.find((r) => r.dbId === id);

    function unitOptions() {
        const division = field(form, 'pickDivision').value;
        optionList(
            field(form, 'pickUnit'),
            s.data.units.filter((u) => !division || u.divisionId === division).map((u) => ({ id: u.id, name: unitLabel(u) })),
            'Semua unit',
        );
    }
    function renderPicker() {
        const division = field(form, 'pickDivision').value,
            unit = field(form, 'pickUnit').value,
            position = field(form, 'pickPosition').value,
            q = field(form, 'pickSearch').value.trim().toLowerCase();
        visible = s.data.staff.filter((r) => {
            if (!r.active) return false;
            const u = unitOf(r);
            return (
                (!division || u?.divisionId === division) &&
                (!unit || u?.id === unit) &&
                (!position || r.positionId === position) &&
                (!q || `${r.name} ${r.nip}`.toLowerCase().includes(q))
            );
        });
        list.replaceChildren(
            ...visible.map((r) => {
                const row = node('label', null, 'org-pick-row'),
                    box = node('input', null, 'size-4 accent-primary'),
                    copy = node('span'),
                    u = unitOf(r);
                box.type = 'checkbox';
                box.value = r.id;
                box.dataset.pick = '';
                box.checked = selected.has(r.id);
                copy.append(
                    node('strong', r.name),
                    node('small', [r.nip, s.data.positions.find((p) => p.id === r.positionId)?.name, u ? unitLabel(u) : 'Tanpa penempatan'].filter(Boolean).join(' · ')),
                );
                row.append(box, copy);
                return row;
            }),
        );
        if (!visible.length) list.append(node('p', 'Tidak ada staf aktif sesuai filter.', 'empty text-sm'));
        count();
    }
    function count() {
        const chosen = visible.filter((r) => selected.has(r.id)).length;
        all.checked = visible.length > 0 && chosen === visible.length;
        all.indeterminate = chosen > 0 && chosen < visible.length;
        $('[data-pick-count]', form).textContent = `${selected.size} staf dipilih · ${visible.length} hasil`;
    }
    function tooMany(size) {
        if (size <= MAX_BATCH) return false;
        error(form, `Maksimal ${MAX_BATCH} staf per mutasi. Persempit filter atau bagi menjadi beberapa mutasi.`);
        return true;
    }

    function renderPreview() {
        const root = $('[data-transfer-preview]', form),
            target = preview.target,
            { total, ready, blocked, origins } = preview.summary;
        root.replaceChildren();
        if (target)
            root.append(
                pairs([
                    ['Unit tujuan', `${target.unit_name} · ${target.division_name}`],
                    ['Penilai (Kepala Unit)', target.head_name || 'Belum ada'],
                    ['Reviewer (Kepala Divisi)', target.division_head_name || 'Belum ada'],
                    ['Bulan efektif', monthLabel(preview.effective_from)],
                ]),
            );
        root.append(
            node(
                'p',
                `${total} staf · ${ready} siap · ${blocked} terblokir. Asal: ${Object.entries(origins).map(([name, n]) => `${name} (${n})`).join(', ')}.`,
                'notice',
            ),
        );
        const global = blockerNotice(preview.blockers, 'Unit tujuan belum dapat dipakai:');
        if (global) root.append(global);
        if (blocked) {
            const box = node('div', null, 'notice notice-error org-blockers'),
                body = node('div'),
                drop = node('button', `Keluarkan ${blocked} staf terblokir`, 'btn mt-2');
            drop.type = 'button';
            drop.onclick = () => {
                for (const staff of preview.staff)
                    if (staff.blockers.length) selected.delete(byDbId(staff.employee_id)?.id);
                renderPicker();
                if (!selected.size) {
                    wizard.show(1);
                    error(form, 'Semua staf terpilih terblokir. Pilih staf lain.');
                    return;
                }
                wizard.show(2);
                $('[data-wizard-next]', dialog).click();
            };
            box.setAttribute('role', 'alert');
            body.append(
                node('strong', `${blocked} staf terblokir.`, 'block'),
                node('span', 'Mutasi disimpan atomik: satu staf terblokir membatalkan seluruh mutasi. Perbaiki hambatannya atau keluarkan staf tersebut.'),
                drop,
            );
            box.append(body);
            root.append(box);
        }
        const table = node('table', null, 'data-table'),
            columns = ['Staf', 'Penempatan sekarang', 'Terjadwal', 'Non-Final', 'Status'],
            head = node('tr'),
            tbody = node('tbody');
        head.append(...columns.map((label) => node('th', label)));
        const thead = node('thead');
        thead.append(head);
        const rows = [...preview.staff].sort((a, b) => b.blockers.length - a.blockers.length);
        for (const staff of rows) {
            const tr = node('tr'),
                who = node('td'),
                state = node('td');
            who.append(node('strong', staff.name, 'block'), node('small', [staff.nip, staff.position_name].filter(Boolean).join(' · '), 'text-xs text-muted'));
            if (staff.blockers.length) {
                const issues = node('ul', null, 'org-issues');
                issues.append(...staff.blockers.map((b) => node('li', b.message)));
                state.append(issues);
            } else {
                const ok = node('span', 'Siap', 'status');
                ok.dataset.status = 'Aktif';
                state.append(ok);
            }
            tr.append(
                who,
                node('td', staff.current ? `${staff.current.unit_name} · ${staff.current.division_name} (${period(staff.current.from, staff.current.until)})` : 'Tanpa penempatan'),
                node('td', staff.scheduled.map((p) => `${p.unit_name} mulai ${monthLabel(p.from)}`).join('; ') || '-'),
                node('td', String(staff.pending_assessments), 'numeric'),
                state,
            );
            columns.forEach((label, i) => (tr.cells[i].dataset.label = label));
            if (staff.blockers.length) tr.dataset.blocked = '';
            tbody.append(tr);
        }
        table.append(thead, tbody);
        const wrap = node('div', null, 'table-wrap org-preview-table');
        wrap.append(table);
        root.append(wrap);
        if (global || blocked) wizard.block();
    }

    const wizard = createWizard(dialog, form, {
        1: {
            leave() {
                if (!selected.size) throw new Error('Pilih minimal satu staf aktif.');
                if (selected.size > MAX_BATCH) throw new Error(`Maksimal ${MAX_BATCH} staf per mutasi.`);
            },
        },
        2: {
            enter() {
                const earliest = earliestPlacementMonth(s),
                    from = field(form, 'from');
                const origins = new Set([...selected].map((id) => unitOf(s.data.staff.find((r) => r.id === id))?.name || 'Tanpa penempatan'));
                $('[data-transfer-selection]', form).textContent = `${selected.size} staf dipilih dari ${[...origins].join(', ')}.`;
                optionList(
                    field(form, 'unitId'),
                    s.data.units.filter((u) => u.active && s.division(u.divisionId)?.active).map((u) => ({ id: u.id, name: unitLabel(u) })),
                    'Pilih unit tujuan',
                );
                from.min = earliest;
                if (!from.value) from.value = currentMonth() < earliest ? earliest : currentMonth();
                $('[data-transfer-month-help]', form).textContent = `Paling awal ${monthLabel(earliest)} (bulan berjalan WIB atau periode terbuka tertua). Histori sebelum itu tidak ditulis ulang.`;
                syncSearchableSelects(form);
            },
            async leave() {
                const unit = field(form, 'unitId').value,
                    from = field(form, 'from').value,
                    earliest = field(form, 'from').min;
                if (!unit) throw new Error('Pilih unit tujuan.');
                if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(from)) throw new Error('Isi bulan efektif dengan format TTTT-BB.');
                if (from < earliest) throw new Error(`Bulan efektif paling awal ${monthLabel(earliest)}; histori tidak ditulis mundur.`);
                if (!field(form, 'reason').value.trim()) throw new Error('Alasan mutasi wajib diisi.');
                controller?.abort();
                controller = new AbortController();
                preview = (
                    await s.api.request(
                        '/employees/transfer-preview',
                        'POST',
                        {
                            employee_ids: [...selected].map((id) => s.data.staff.find((r) => r.id === id).dbId),
                            unit_id: +unit,
                            effective_from: `${from}-01`,
                        },
                        { signal: controller.signal },
                    )
                ).data;
                field(form, 'from').min = preview.min_effective_month;
            },
        },
        3: { enter: renderPreview },
        4: {
            enter() {
                const target = preview.target,
                    summary = $('[data-transfer-summary]', form),
                    body = node('div');
                body.append(
                    node('strong', `${preview.staff.length} staf ke Unit ${target.unit_name} (${target.division_name}) mulai ${monthLabel(preview.effective_from)}.`, 'block'),
                    node('span', `Penilai baru ${target.head_name || 'belum ada'}; reviewer ${target.division_head_name || 'belum ada'}. Penilaian Final dan histori sebelum bulan efektif tetap pada unit asal. Alasan: ${field(form, 'reason').value.trim()}`),
                );
                summary.replaceChildren(body);
            },
        },
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!field(form, 'confirmed').checked)
            return error(form, 'Centang konfirmasi setelah meninjau dampak mutasi.');
        const items = preview.staff.map((row) => ({
            employee_id: row.employee_id,
            expected_placement_id: row.current?.placement_id ?? null,
        }));
        await s.api.perform(form, async () => {
            const result = await s.api.request('/employees/transfers', 'POST', {
                items,
                unit_id: preview.target.unit_id,
                effective_from: `${field(form, 'from').value}-01`,
                confirmed: true,
                reason: field(form, 'reason').value.trim(),
            });
            close('staff-transfer-dialog');
            await s.refresh();
            toast(`${result.data.moved} staf dijadwalkan pindah ke Unit ${preview.target.unit_name} mulai ${monthLabel(preview.effective_from)}.`);
        });
    });

    form.addEventListener('change', (event) => {
        const el = event.target;
        if (el.name === 'pickDivision') {
            unitOptions();
            syncSearchableSelects(form);
        }
        if (['pickDivision', 'pickUnit', 'pickPosition'].includes(el.name)) renderPicker();
        if (el.matches('[data-pick]')) {
            if (el.checked && tooMany(selected.size + 1)) el.checked = false;
            else if (el.checked) selected.add(el.value);
            else selected.delete(el.value);
            count();
        }
        if (el === all) {
            if (all.checked) {
                const next = new Set([...selected, ...visible.map((r) => r.id)]);
                if (!tooMany(next.size)) selected = next;
            } else visible.forEach((r) => selected.delete(r.id));
            renderPicker();
        }
    });
    field(form, 'pickSearch').addEventListener('input', renderPicker);
    dialog.addEventListener('close', () => controller?.abort());

    return {
        /** Opens the wizard; `ids` preselects staff (one id = individual transfer). */
        open(ids = []) {
            form.reset();
            selected = new Set(ids);
            preview = null;
            optionList(field(form, 'pickDivision'), s.data.divisions, 'Semua divisi');
            optionList(field(form, 'pickPosition'), s.data.positions, 'Semua jabatan');
            unitOptions();
            const single = ids.length === 1 ? s.data.staff.find((r) => r.id === ids[0]) : null,
                unit = single && unitOf(single);
            if (unit) {
                field(form, 'pickDivision').value = unit.divisionId;
                unitOptions();
                field(form, 'pickUnit').value = unit.id;
            }
            $('#staff-transfer-dialog-title').textContent = single ? `Mutasi ${single.name}` : 'Mutasi staf massal';
            renderPicker();
            wizard.start();
            syncSearchableSelects(form);
            open('staff-transfer-dialog');
        },
    };
}
