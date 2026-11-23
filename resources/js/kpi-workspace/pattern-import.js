/*
 * Pattern import: template download (CSV/XLSX) and the "Impor pola" screen.
 * Columns mirror App\Services\KpiMaster\KpiPatternImport::COLUMNS (same order and labels).
 */
import { esc, heading, button, tag, note, num, table } from './markup.js';
import { monthLabel, emptyKpi, ruleFor, pillarSuggestions } from './model.js';
import { editor } from './formula-editor.js';

/** [header, short format hint, true when the column holds numbers]. */
export const COLUMNS = [
    ['Pola', 'Nama pola; baris dengan nama sama = satu pola', false],
    ['Pilar', 'Pilar KPI', false],
    ['KPI', 'Nama KPI', false],
    ['Satuan', '%, menit, kasus, …', false],
    ['Arah', 'naik / turun', false],
    ['Target', 'Angka ≥ 0', true],
    ['Bobot (%)', 'Total per pola 100', true],
    ['Variabel', 'A: Nama; B: Nama; C: Nama = 100 (tetap)', false],
    ['Formula', 'Tanpa "=", mis. A / B * 100', false],
    ['Skor min', 'Kosong = 10', true],
    ['Skor maks', 'Kosong = 100', true],
];
export const SAMPLE = [
    ['Perawat Rawat Inap', 'Technical Care', 'Kelengkapan dokumentasi asuhan', '%', 'naik', 95, 40, 'A: Dokumen lengkap; B: Total dokumen', 'A / B * 100', 10, 100],
    ['Perawat Rawat Inap', 'Efficient', 'Waktu tanggap panggilan pasien', 'menit', 'turun', 5, 30, 'A: Total menit tanggap; B: Jumlah panggilan', 'A / B', 10, 100],
    ['Perawat Rawat Inap', 'Interpersonal Care', 'Insiden keselamatan pasien', 'kasus', 'turun', 0, 30, 'A: Jumlah insiden', 'A', 10, 100],
    ['Kepala Unit Pelayanan', 'Coordination and Continuity', 'Penyerapan anggaran unit', '%', 'naik', 90, 50, 'A: Realisasi (Rp); B: Pagu (Rp); C: Pengali = 100', 'A / B * C', 10, 100],
    ['Kepala Unit Pelayanan', 'Access', 'Supervisi terlaksana', 'kegiatan', 'naik', 4, 50, 'A: Supervisi terlaksana', 'A', 10, 100],
];
const BLANK_ROWS = 200;

function save(blob, name) {
    const url = URL.createObjectURL(blob),
        a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const csvCell = (v) => (/[",;\r\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));

export async function downloadTemplate(format, month) {
    const name = `template-pola-kpi-${month}`;
    if (format === 'csv') {
        const lines = [COLUMNS.map(([h]) => h), ...SAMPLE].map((r) => r.map(csvCell).join(','));
        return save(new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
    }
    const { XL } = await import('../abprove/xlsx');
    // Text cells keep the "@" format so a typed formula such as "A / B" never becomes an Excel formula.
    const cell = (v, i) => ({ v, s: COLUMNS[i][2] ? XL.ST.txtC : XL.ST.text });
    const blank = COLUMNS.map((_, i) => cell('', i));
    const sheets = [
        {
            name: 'Pola KPI',
            cols: [26, 22, 36, 11, 9, 9, 10, 46, 22, 9, 10],
            freeze: [0, 1],
            rows: [
                COLUMNS.map(([h]) => ({ v: h, s: XL.ST.head })),
                ...SAMPLE.map((r) => r.map(cell)),
                ...Array.from({ length: BLANK_ROWS }, () => blank),
            ],
        },
        {
            name: 'Petunjuk',
            cols: [14, 46],
            rows: [
                [{ v: 'Kolom', s: XL.ST.head }, { v: 'Isi', s: XL.ST.head }],
                ...COLUMNS.map(([h, hint]) => [{ v: h, s: XL.ST.txt }, { v: hint, s: XL.ST.txt }]),
            ],
        },
    ];
    save(new Blob([XL.build(sheets, { title: 'Template pola KPI' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
}

const DIRECTIONS = { higher: 'Lebih tinggi lebih baik', lower: 'Lebih rendah lebih baik' };
const sameSheets = (a, b) => a.length === b.length && a.every((name, i) => name === b[i]);
/** Usable sheets the user ticked, in workbook order (exact original names, as the server expects). */
export const selectedSheets = (state) => state.sheets.filter((s) => s.supported && state.selected.has(s.name)).map((s) => s.name);
/** RSAB response without a sheet choice: only the sheet list, nothing to preview or import. */
const discovery = (p) => p?.format === 'rsab' && !p.selection.length;
/** Editable row fields (server `row.cells`), canonical template strings: [field, label]. */
export const EDIT_FIELDS = [
    ['name', 'Nama KPI'],
    ['pillar', 'Pilar'],
    ['unit', 'Satuan'],
    ['direction', 'Arah'],
    ['target', 'Target'],
    ['weight', 'Bobot (%)'],
    ['variables', 'Variabel'],
    ['formula', 'Formula'],
    ['min', 'Skor min'],
    ['max', 'Skor maks'],
    ['zeroRule', 'Aturan target nol'],
];
/** Identity of a source row: exact sheet (null for a template file) and original line. */
const editKey = (sheet, line) => JSON.stringify([sheet ?? null, Number(line)]);
/**
 * Row corrections sent with the next check: RSAB only for the chosen sheets (others stay stored and
 * return when the sheet is chosen again), ordered by workbook sheet then line so equal choices compare equal.
 */
export function currentEdits(state) {
    const names = state.format === 'rsab' ? selectedSheets(state) : null;
    const rank = (e) => (names ? names.indexOf(e.sheet) : 0);
    return [...state.edits.values()].filter((e) => !names || names.includes(e.sheet)).sort((a, b) => rank(a) - rank(b) || a.line - b.line);
}
/**
 * Controls of the import screen: `check` enables "Periksa pilihan" (RSAB), `commit` the import (only
 * a valid preview of exactly the current sheet choice and corrections), `stale` marks an older preview.
 */
export function importControls(state) {
    const p = state.preview,
        names = selectedSheets(state),
        edits = currentEdits(state),
        fresh = !!p && p.editsKey === JSON.stringify(edits) && (p.format !== 'rsab' || (p.selection.length > 0 && sameSheets(p.selection, names))),
        stale = !!p && !discovery(p) && !fresh;
    const kpis = state.sheets.filter((s) => names.includes(s.name)).reduce((n, s) => n + (s.count || 0), 0);
    return {
        check: names.length > 0 && !fresh,
        commit: !!(state.file && p?.valid && fresh),
        stale,
        status: names.length ? `${names.length} sheet · ${kpis} KPI dipilih${edits.length ? ` · ${edits.length} baris diperbaiki` : ''} · ${fresh ? 'sudah diperiksa' : stale ? 'pilihan berubah, periksa ulang' : 'belum diperiksa'}` : 'Belum ada sheet dipilih.',
    };
}
const fieldLabel = Object.fromEntries(EDIT_FIELDS);
/** "IT baris 11 (Target, Formula)" lines of the corrections in a preview, for the import confirmation. */
export function editSummary(edits, limit = 5) {
    const lines = edits.slice(0, limit).map((e) => `${e.sheet ? `${e.sheet} ` : ''}baris ${e.line} (${[...Object.keys(e.fields).map((k) => fieldLabel[k] || k), ...(e.replace_rule ? ['formula pengganti'] : [])].join(', ')})`);
    return `${lines.join('; ')}${edits.length > limit ? `; +${edits.length - limit} lainnya` : ''}`;
}
/** Adapt a normalized preview row to the shared KPI editor, without guessing missing values. */
export function importKpi(r) {
    const k = emptyKpi();
    return {
        ...k,
        name: r.name, pillar: r.pillar, unit: r.unit, direction: r.direction,
        target: r.target ?? '', weight: r.weight ?? '', formula: r.formula,
        variables: r.variables.length ? structuredClone(r.variables) : k.variables,
        policy: { ...r.policy, min: r.policy.min ?? '', max: r.policy.max ?? '', rule: ruleFor(r.direction) },
        importSource: { ...r.source, sheet: r.sheet || 'Template', line: r.line },
    };
}
/** Import transport only: the editor itself always uses the normal KPI model. */
export function importValues(k) {
    const values = Object.fromEntries(['name', 'pillar', 'unit', 'target', 'weight', 'formula'].map((key) => [key, String(k[key] ?? '').trim()]));
    return {
        ...values,
        direction: k.direction === 'higher' ? 'naik' : k.direction === 'lower' ? 'turun' : '',
        variables: k.variables.map((v) => ({
            key: v.key, label: v.label.trim(), source: v.source,
            ...(v.source === 'fixed' ? { value: v.value === '' || v.value == null ? null : Number(v.value) } : {}),
        })),
        min: String(k.policy.min), max: String(k.policy.max), zeroRule: k.policy.zeroRule,
    };
}
function importEditor(ctx) {
    const { row: r, key, others, replaceRule } = ctx.importEdit,
        errors = r.errors.length ? issues(r.errors, 'skp-import-errors') : '',
        extra = r.ruleUnsupported ? `<label class="skp-import-replace"><input type="checkbox" name="replace_rule" ${replaceRule ? 'checked' : ''}> Gunakan formula pengganti untuk ketentuan sumber</label>` : '';
    return editor(ctx.kpi, ctx.testValues, others, {
        editing: true,
        title: `${r.errors.length ? 'Perbaiki' : 'Ubah'} ${r.sheet ? `${r.sheet} · ` : ''}baris ${r.line}`,
        subtitle: '', saveLabel: 'Simpan & periksa', footnote: 'File sumber tidak berubah.',
        pillars: pillarSuggestions(ctx.data, ctx.importState.preview.rows, ctx.kpi.pillar),
        notices: errors, extra,
        extraActions: ctx.importState.edits.has(key) ? button('import-edit-reset', 'Kembalikan asli') : '',
    });
}
/** Upload limit of KpiPatternImportRequest (2 MB); checked here first so a wrong file fails without a round trip. */
const MAX_BYTES = 2 * 1024 * 1024;
const FORMAT_LABEL = { template: 'Template pola', rsab: 'Master KPI RSAB' };
const fileSize = (bytes) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${num(bytes / 1024 / 1024, 1)} MB`;
/** Reason a chosen file cannot be uploaded at all; empty when it may be sent to the server. */
export function fileProblem(file) {
    if (!/\.(csv|xlsx)$/i.test(file.name)) return 'Gunakan file CSV atau XLSX.';
    if (file.size > MAX_BYTES) return `Ukuran file ${fileSize(file.size)}; maksimal 2 MB.`;
    return '';
}
const UPLOAD_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0-4 4m4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';
const FILE_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
/** Where the user is in the import: file → read → (RSAB) sheets → check & import. */
function importSteps(state) {
    const p = state.preview,
        shown = !!p && !discovery(p),
        steps = [
            ['Siapkan file', !!state.file && !state.error],
            ['Unggah & baca', !!state.format],
            ...(state.format === 'rsab' ? [['Pilih sheet', shown && !importControls(state).stale]] : []),
            ['Periksa & impor', false],
        ],
        current = steps.findIndex(([, done]) => !done);
    return `<ol class="skp-import-steps" aria-label="Langkah impor">${steps
        .map(([label, done], i) => `<li class="${done ? 'done' : i === current ? 'current' : ''}" ${i === current ? 'aria-current="step"' : ''}><span aria-hidden="true">${done ? '✓' : i + 1}</span>${esc(label)}</li>`)
        .join('')}</ol>`;
}
function uploadPanel(state) {
    const f = state.file,
        input = (extra = '') => `<input type="file" accept=".csv,.xlsx" class="skp-import-input" data-skp-import-file ${extra}>`;
    const status = state.checking
        ? '<span class="skp-spinner" aria-hidden="true"></span>Membaca file…'
        : state.format
          ? esc(FORMAT_LABEL[state.format])
          : state.error
            ? 'Belum dapat dibaca'
            : '';
    const drop = f
        ? `<div class="skp-import-filecard${state.error && !state.format ? ' failed' : ''}">${FILE_ICON}<div class="skp-import-filemeta"><strong title="${esc(f.name)}">${esc(f.name)}</strong><small aria-live="polite">${fileSize(f.size)}${status ? ` · ${status}` : ''}</small></div><div class="gp-actions">${button('import-pick', 'Ganti file', '', 'btn btn-small', state.checking)}${button('import-clear', 'Hapus', '', 'btn btn-small btn-ghost', state.checking)}</div>${input('tabindex="-1" aria-hidden="true"')}</div>`
        : `<label class="skp-dropzone">${UPLOAD_ICON}<strong>Seret file ke sini atau <u>pilih file</u></strong><small>CSV/XLSX dari template pola, atau master KPI RSAB · maks. 2 MB</small>${input('aria-label="Pilih file pola KPI"')}</label>`;
    const guide = `<details class="skp-import-guide"><summary>Lihat isi kolom template</summary><dl>${COLUMNS.map(([h, hint]) => `<div><dt>${esc(h)}</dt><dd>${esc(hint)}</dd></div>`).join('')}</dl></details>`;
    return `<section class="card skp-panel skp-import-upload" data-skp-dropzone><div class="skp-import-drop">${drop}</div><aside class="skp-import-template"><h2>Belum punya file?</h2><p class="gp-help">Unduh template, isi satu baris per KPI (baris dengan nama Pola sama menjadi satu pola), lalu unggah kembali.</p><div class="gp-actions">${button('import-template', 'Template XLSX', 'xlsx', 'btn btn-small')}${button('import-template', 'Template CSV', 'csv', 'btn btn-small')}</div>${guide}</aside></section>`;
}
/** Import screen of the selected period; `ctx.importState`: { file, format, sheets, selected, edits, preview (+ selection, edits, editsKey, onlyErrors), error, checking }. */
export function importView(ctx) {
    if (ctx.importEdit) return importEditor(ctx);
    const month = ctx.index.month,
        state = ctx.importState,
        p = state.preview,
        rsab = state.format === 'rsab',
        shown = p && !discovery(p);
    return `${heading('Impor pola KPI', `Periode tujuan ${monthLabel(month)} · pola baru ditambahkan tanpa pemakai; nama pola yang sudah ada tidak ditimpa.`, button('nav', 'Kembali ke daftar pola', 'patterns'), 'Pola KPI · Impor')}${importSteps(state)}${uploadPanel(state)}${state.error ? note(state.error, 'error') : ''}${rsab ? sheetPanel(state, !shown) : ''}${shown ? preview(p, state) : ''}`;
}
/** Why "Impor" is (not) available for the current preview, shown next to the button. */
export function commitHint(state) {
    const p = state.preview;
    if (!p || discovery(p)) return '';
    if (importControls(state).stale) return 'Pilihan berubah. Pilih Periksa pilihan sebelum mengimpor.';
    if (p.errorCount) return `Perbaiki ${p.errorCount} kesalahan pada ${importCounts(p).incomplete} KPI untuk dapat mengimpor.`;
    if (!p.patterns.length) return 'Tidak ada KPI yang dapat diimpor.';
    const kpis = p.patterns.reduce((n, x) => n + x.count, 0),
        drafts = p.patterns.filter((x) => !x.complete).length;
    return `Siap: ${p.patterns.length} pola · ${kpis} KPI${drafts ? ` (${drafts} pola disimpan sebagai draf karena bobot belum 100%)` : ''}.`;
}
/** Sheet search of the RSAB checklist: case-insensitive part of the sheet name. */
export const sheetMatch = (s, query) => !query.trim() || `${s.name} ${s.label || ''}`.toLowerCase().includes(query.trim().toLowerCase());
/** Sheets "Pilih semua" acts on: the usable sheets matching the search. */
export const visibleUsable = (state) => state.sheets.filter((s) => s.supported && sheetMatch(s, state.sheetSearch));
export const selectAllLabel = (state) => (state.sheetSearch.trim() ? 'Pilih hasil cari' : 'Pilih semua');
function sheetPanel(state, focus) {
    const usable = state.sheets.filter((s) => s.supported).length,
        c = importControls(state),
        query = state.sheetSearch;
    const items = state.sheets
        .map((s, i) => {
            const id = `skp-import-sheet-${i}`,
                off = !s.supported;
            return `<label class="skp-import-sheet${off ? ' disabled' : ''}" title="${esc(s.name)}" ${sheetMatch(s, query) ? '' : 'hidden'}><input type="checkbox" data-skp-import-sheet="${esc(s.name)}" aria-describedby="${id}" ${state.selected.has(s.name) && !off ? 'checked' : ''} ${off ? 'disabled' : ''}><span><b>${esc(s.label || s.name)}</b><small id="${id}">${off ? esc(s.reason || 'Bukan tabel KPI') : `${s.count} KPI`}</small></span></label>`;
        })
        .join('');
    const none = !state.sheets.some((s) => sheetMatch(s, query));
    const list = state.sheets.length
        ? `<input type="search" class="field skp-import-sheet-search" data-skp-import-sheet-search value="${esc(query)}" placeholder="Cari sheet, mis. IT" aria-label="Cari sheet" autocomplete="off"><fieldset class="skp-import-sheet-list"><legend class="sr-only">Sheet yang diimpor</legend>${items}<p class="skp-import-sheet-none" data-skp-import-sheet-none ${none ? '' : 'hidden'}>Tidak ada sheet yang cocok.</p></fieldset>`
        : note('File tidak berisi sheet.', 'warning');
    return `<section class="card skp-panel skp-import-sheets"><div class="skp-import-actions"><div><h2 ${focus ? 'tabindex="-1" data-skp-import-focus' : ''}>Pilih sheet</h2><p class="gp-help">Satu sheet menjadi satu pola baru. ${usable} dari ${state.sheets.length} sheet dapat dipakai; centang lalu pilih Periksa pilihan.</p></div><div class="gp-actions">${button('import-sheets', selectAllLabel(state), 'all', 'btn btn-small', !visibleUsable(state).length)}${button('import-sheets', 'Kosongkan', 'none', 'btn btn-small', !usable)}${button('import-check', 'Periksa pilihan', '', 'btn btn-small btn-primary', !c.check)}</div></div>${list}<p class="skp-result-line" data-skp-import-selection aria-live="polite">${esc(c.status)}</p></section>`;
}
/** Counts cover every parsed KPI; the label makes a manually filtered table explicit. */
export function importCounts(p) {
    const incomplete = p.rows.filter((r) => r.errors.length).length;
    return {
        incomplete,
        text: p.onlyErrors
            ? `${incomplete} dari ${p.rows.length} KPI · filter bermasalah aktif`
            : `${p.rows.length} KPI · ${p.rows.length - incomplete} siap · ${incomplete} perlu dilengkapi`,
    };
}
/** Sum every uploaded KPI, never just the filtered rows or current page. */
function weightFooter(p) {
    if (!p.rows.length) return '';
    const total = p.rows.reduce((sum, r) => sum + (Number.isFinite(r.weight) ? Math.round(r.weight * 10000) : 0), 0) / 10000,
        invalid = p.rows.filter((r) => !Number.isFinite(r.weight) || r.errors.some((e) => /^Bobot\b/i.test(e.column))).length,
        groups = new Set(p.rows.map((r) => r.sheet ?? r.pattern.trim().toLowerCase())).size,
        difference = Math.round((total - 100) * 10000) / 10000;
    let status;
    if (invalid) status = tag(`${invalid} bobot perlu diperbaiki`, 'warning');
    else if (groups > 1) status = `Gabungan ${groups} pola; setiap pola wajib 100%.`;
    else status = tag(difference === 0 ? 'Sesuai 100%' : `${difference > 0 ? 'Lebih' : 'Kurang'} ${num(Math.abs(difference), 4)}%`, difference === 0 ? 'success' : 'warning');
    return `<tr><th colspan="4" scope="row">${invalid ? 'Total bobot terbaca' : 'Total bobot seluruh'} ${p.rows.length} KPI</th><td class="num"><strong>${num(total, 4)}%</strong></td><td colspan="2">${status}</td></tr>`;
}
function preview(p, state) {
    const rsab = p.format === 'rsab',
        c = importControls(state),
        kpis = p.patterns.reduce((n, x) => n + x.count, 0),
        drafts = p.patterns.filter((x) => !x.complete).length,
        { incomplete, text: counts } = importCounts(p);
    const tiles = `<div class="gp-summary skp-import-summary"><div class="tone-neutral"><span>KPI terbaca</span><strong>${p.rows.length}</strong></div><div class="tone-teal"><span>KPI valid</span><strong>${p.rows.length - incomplete}</strong></div><div class="${incomplete ? 'tone-amber' : 'tone-neutral'}"><span>Perlu diperbaiki</span><strong>${incomplete}</strong></div><div class="tone-blue"><span>Pola baru</span><strong>${p.patterns.length}</strong></div></div>`;
    const bar = `<div class="skp-import-bar"><p data-skp-import-reason aria-live="polite">${esc(commitHint(state))}</p><div class="gp-actions">${button('import-clear', 'Batal')}${button('import-commit', `Impor ${p.patterns.length} pola`, '', 'btn btn-primary', !c.commit)}</div></div>`;
    const fixed = p.edits.length ? ` ${p.edits.length} baris diperbaiki.` : '';
    const warned = warnedRows(p).length,
        directionInfo = warned ? `<p class="gp-help mx-5 mb-3">${warned} KPI memakai arah Naik bawaan. Gunakan Ubah bila diperlukan.</p>` : '';
    const summary = p.errorCount
        ? note(`${p.errorCount} kesalahan pada ${incomplete} KPI. Pilih Perbaiki pada baris bertanda merah; file sumber tidak berubah.${fixed}`, 'error')
        : note(`${p.patterns.length} pola${rsab ? ` dari ${p.selection.length} sheet` : ''} · ${kpis} KPI siap diimpor.${fixed}${drafts ? ` ${drafts} pola belum 100% dan disimpan sebagai draf.` : ''}`, drafts ? 'warning' : 'success');
    const patterns = p.patterns.length
        ? `<p class="gp-help mx-5 mb-2">Bobot per pola harus 100% agar bisa diterapkan.</p><ul class="skp-import-patterns" aria-label="Total bobot per pola">${p.patterns.map((x) => {
              const difference = Math.round((100 - x.total) * 10000) / 10000,
                  status = difference === 0 ? 'Sesuai' : `${difference > 0 ? 'Kurang' : 'Lebih'} ${num(Math.abs(difference), 4)}%`;
              return `<li><div><strong>${esc(x.name)}</strong><span>${x.count} KPI</span></div><div><span>Total bobot</span><strong>${num(x.total, 4)}%</strong>${tag(status, difference === 0 ? 'success' : 'warning')}</div></li>`;
          }).join('')}</ul>`
        : '';
    const stale = rsab ? `<p class="gp-note warning" role="note" data-skp-import-stale ${c.stale ? '' : 'hidden'}>Pilihan sheet berubah. Pilih Periksa pilihan sebelum mengimpor.</p>` : '';
    return `<section class="card skp-table-card fx-kpi-list skp-import-preview${c.stale ? ' stale' : ''}"><div class="skp-card-head"><div><h2 tabindex="-1" data-skp-import-focus>Hasil pemeriksaan</h2><p data-skp-import-count>${counts}</p></div><div class="gp-actions"><label class="skp-import-only"><input type="checkbox" data-skp-import-only ${p.onlyErrors ? 'checked' : ''} ${flagged(p) ? '' : 'disabled'}> Hanya yang bermasalah</label></div></div>${tiles}${stale}${summary}${directionInfo}${patterns}${table('importRows', [rsab ? 'Sheet · baris' : 'Baris', 'Pola', 'KPI', 'Target capaian', 'Bobot KPI', 'Formula', 'Cek'], `skp-import-table${rsab ? ' rsab' : ''}`, weightFooter(p))}${bar}</section>`;
}
/** Rows with server warnings (e.g. RSAB target without a stated direction, imported as Naik). */
const warnedRows = (p) => p.rows.filter((r) => r.warnings?.some((w) => w.column === 'Arah'));
/** Only blocking errors belong in the "Hanya bermasalah" filter. */
export const flagged = (p) => p.errorCount > 0;
const plain = (value) => String(value ?? '').replace(/\s+/g, '').toLowerCase();
const issues = (list, className) => `<ul class="${className}">${list.map((e) => `<li><b>${esc(e.column)}</b> ${esc(e.message)}</li>`).join('')}</ul>`;
/** Original source cells of a converted or rejected row, so HC sees what the import changed. */
function sourceLine(r) {
    const s = r.source;
    if (!s) return '';
    const changed = r.errors.length || r.warnings?.length || r.edited || s.rule || /^\s*IF\s*\(/i.test(r.formula || '') || (s.formula && plain(s.formula) !== plain(r.formula));
    const text = changed ? [s.target && `target ${s.target}`, s.formula, s.rule && `ketentuan ${s.rule}`].filter(Boolean).join(' · ') : '';
    return text ? `<small class="skp-import-source" title="${esc(text)}">Asal: ${esc(text)}</small>` : '';
}
export const importRowsTable = {
    empty: 'Tidak ada baris bermasalah.',
    records: (ctx) => {
        const p = ctx.importState.preview;
        return p ? (p.onlyErrors ? p.rows.filter((r) => r.errors.length) : p.rows) : [];
    },
    row: (ctx, r) => {
        const vars = (r.variables || []).map((v) => `${v.key}: ${v.label}${v.source === 'fixed' ? ` = ${v.value ?? '?'}` : ''}`).join('; ');
        const fix = button('import-edit', r.errors.length ? 'Perbaiki' : 'Ubah', editKey(r.sheet, r.line), 'link skp-import-fix');
        const check = `${r.edited ? tag('Diubah') : ''}${r.errors.length ? issues(r.errors, 'skp-import-errors') : tag('OK', 'success')}${fix}`;
        const line = r.sheet ? `<strong title="${esc(r.sheet)}">${esc(r.sheet)}</strong><small>baris ${r.line}</small>` : r.line;
        const weight = r.weight == null ? (r.source?.weight ? `—<small>Asal: ${esc(r.source.weight)}</small>` : '—') : `${num(r.weight, 4)}%`;
        return `<tr class="${r.errors.length ? 'invalid' : ''}"><td data-label="${r.sheet ? 'Sheet · baris' : 'Baris'}" class="${r.sheet ? 'skp-import-line' : 'num'}">${line}</td><td data-label="Pola">${esc(r.pattern || '—')}</td><td data-label="KPI"><strong>${esc(r.name || '—')}</strong><small>${esc(r.pillar)}</small></td><td data-label="Target capaian">${r.target == null ? '—' : `${num(r.target, 4)} ${esc(r.unit)}`}<small>${esc(DIRECTIONS[r.direction] || '')}</small></td><td data-label="Bobot KPI" class="num">${weight}</td><td data-label="Formula"><code>${esc(r.formula || '—')}</code><small title="${esc(vars)}">${esc(vars)}</small>${sourceLine(r)}</td><td data-label="Cek">${check}</td></tr>`;
    },
};
