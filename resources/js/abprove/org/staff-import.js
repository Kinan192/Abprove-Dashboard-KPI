import { $, node, field, error } from '../flow-dom';
import { open, close, toast } from '../ui';
import { MAX_BATCH, monthLabel } from './shared';

/** Mirrors EmployeeImport::COLUMNS (header of the first sheet / CSV). */
const COLUMNS = ['nip', 'nama_lengkap', 'kode_jabatan', 'kode_unit', 'bulan_efektif'];
const MAX_BYTES = 2 * 1024 * 1024;
const byName = (a, b) => a.name.localeCompare(b.name, 'id');

function save(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type })),
        anchor = node('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Mass staff import (staff without login accounts): download the template with active position/unit codes,
 * upload CSV/XLSX to POST /employees/import-preview for per-row errors, then POST /employees/import creates
 * every row in one transaction. The request_id is kept per preview so a retried submit is replayed, not duplicated.
 */
export function initStaffImport(s) {
    const dialog = $('#staff-import-dialog'),
        form = $('#staff-import-form'),
        input = field(form, 'file'),
        root = $('[data-import-preview]', form),
        submit = $('[data-import-submit]', dialog);
    let preview = null,
        requestId = null,
        controller = null;

    function reset() {
        preview = null;
        requestId = null;
        root.replaceChildren();
        submit.disabled = true;
        submit.textContent = 'Impor';
        $('[data-form-error]', form).hidden = true;
    }

    async function template(format) {
        if (format === 'csv') return save(`\uFEFF${COLUMNS.join(',')}\r\n`, 'Template-Impor-Staf.csv', 'text/csv;charset=utf-8');
        const { XL } = await import('../xlsx');
        const head = (labels) => labels.map((v) => ({ v, s: XL.ST.headL })),
            text = (v) => ({ v, s: XL.ST.text }),
            cell = (v) => ({ v, s: XL.ST.txt });
        const positions = s.data.positions.filter((p) => p.active).sort(byName),
            units = s.data.units.filter((u) => u.active && s.division(u.divisionId)?.active).sort(byName);
        const sheets = [
            {
                name: 'Staf',
                cols: [22, 34, 26, 26, 16],
                freeze: [0, 1],
                // Pre-formatted as text so NIP keeps leading zeros and the month is not turned into a date.
                rows: [head(COLUMNS), ...Array.from({ length: MAX_BATCH }, () => COLUMNS.map(() => text(null)))],
            },
            {
                name: 'Jabatan',
                cols: [34, 40],
                freeze: [0, 1],
                rows: [head(['kode_jabatan', 'nama_jabatan']), ...positions.map((p) => [text(p.code), cell(p.name)])],
            },
            {
                name: 'Unit',
                cols: [34, 36, 32],
                freeze: [0, 1],
                rows: [head(['kode_unit', 'nama_unit', 'divisi']), ...units.map((u) => [text(u.code), cell(u.name), cell(s.division(u.divisionId)?.name)])],
            },
        ];
        save(XL.build(sheets, { title: 'Template Impor Staf' }), 'Template-Impor-Staf.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    function render() {
        const { total, ready, blocked } = preview.summary;
        root.replaceChildren(node('p', `${total} baris · ${ready} siap · ${blocked} bermasalah`, 'notice'));
        if (blocked) {
            const box = node('p', 'Perbaiki baris bermasalah lalu unggah ulang. Tidak ada staf yang disimpan sebelum semua baris valid.', 'notice notice-error');
            box.setAttribute('role', 'alert');
            root.append(box);
        }
        const columns = ['Baris', 'NIP', 'Nama', 'Jabatan', 'Unit', 'Mulai', 'Status'],
            table = node('table', null, 'data-table'),
            thead = node('thead'),
            head = node('tr'),
            tbody = node('tbody');
        head.append(...columns.map((label) => node('th', label)));
        thead.append(head);
        const rows = [...preview.rows].sort((a, b) => (b.errors.length > 0) - (a.errors.length > 0) || a.line - b.line);
        for (const row of rows) {
            const tr = node('tr'),
                state = node('td');
            if (row.errors.length) {
                const issues = node('ul', null, 'org-issues');
                issues.append(...row.errors.map((message) => node('li', message)));
                state.append(issues);
                tr.dataset.blocked = '';
            } else {
                const ok = node('span', 'Siap', 'status');
                ok.dataset.status = 'Aktif';
                state.append(ok);
            }
            tr.append(
                node('td', String(row.line), 'num'),
                node('td', row.nip || '-'),
                node('td', row.full_name || '-'),
                node('td', row.position_name || row.position_code || '-'),
                node('td', row.unit_name ? `${row.unit_name} · ${row.division_name}` : row.unit_code || '-'),
                node('td', /^\d{4}-\d{2}$/.test(row.effective_month) ? monthLabel(row.effective_month) : row.effective_month || '-'),
                state,
            );
            columns.forEach((label, i) => (tr.cells[i].dataset.label = label));
            tbody.append(tr);
        }
        table.append(thead, tbody);
        const wrap = node('div', null, 'table-wrap org-preview-table');
        wrap.append(table);
        root.append(wrap);
        submit.disabled = !preview.valid;
        submit.textContent = preview.valid ? `Impor ${ready} staf` : 'Impor';
    }

    /** Row errors found again at commit (data changed after preview) replace the preview state. */
    function markErrors(errors) {
        const byLine = new Map(
            Object.entries(errors)
                .filter(([key]) => /^rows\.\d+$/.test(key))
                .map(([key, messages]) => [+key.slice(5), messages.map((m) => m.replace(/^Baris \d+: /, ''))]),
        );
        if (!preview || !byLine.size) return;
        preview.rows.forEach((row) => (row.errors = byLine.get(row.line) || row.errors));
        const blocked = preview.rows.filter((row) => row.errors.length).length;
        preview.summary = { total: preview.rows.length, ready: preview.rows.length - blocked, blocked };
        preview.valid = !blocked;
        render();
    }

    input.addEventListener('change', async () => {
        reset();
        const file = input.files[0];
        if (!file) return;
        if (!/\.(csv|xlsx)$/i.test(file.name)) return error(form, 'Gunakan file CSV atau XLSX.');
        if (file.size > MAX_BYTES) return error(form, 'Ukuran file maksimal 2 MB.');
        controller?.abort();
        controller = new AbortController();
        const data = new FormData();
        data.append('file', file);
        try {
            preview = (await s.api.request('/employees/import-preview', 'POST', data, { signal: controller.signal })).data;
            requestId = crypto.randomUUID();
            render();
        } catch (e) {
            if (e.name !== 'AbortError') error(form, e.message);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!preview?.valid) return;
        const rows = preview.rows.map(({ line, nip, full_name, position_code, unit_code, effective_month }) => ({
            line,
            nip,
            full_name,
            position_code,
            unit_code,
            effective_month,
        }));
        const done = await s.api.perform(form, async () => {
            let result;
            try {
                result = await s.api.request('/employees/import', 'POST', { request_id: requestId, rows, confirmed: true });
            } catch (e) {
                if (e.status === 422 && e.details?.errors) markErrors(e.details.errors);
                throw e;
            }
            close('staff-import-dialog');
            await s.refresh();
            toast(`${result.data.imported} staf diimpor.`);
        });
        // perform() re-enables form buttons; keep Impor disabled when the commit found new row errors.
        if (!done) submit.disabled = !preview?.valid;
    });

    dialog.addEventListener('click', (event) => {
        const button = event.target.closest('[data-import-template]');
        if (button) template(button.dataset.importTemplate).catch((e) => toast(e.message, true));
    });
    dialog.addEventListener('close', () => controller?.abort());

    return {
        open() {
            form.reset();
            reset();
            open('staff-import-dialog');
        },
    };
}
