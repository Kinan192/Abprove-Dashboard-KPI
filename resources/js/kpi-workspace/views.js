import {
    ROLES,
    STATUSES,
    PERIOD_STATUSES,
    MONTHS,
    totals,
    totalWeight,
    kpiErrors,
    monthLabel,
    monthName,
    YEAR_MIN,
    YEAR_MAX,
    openBlock,
    filterPeople,
    pillarSuggestions,
    patternHolders,
} from './model.js';
import {
    esc,
    note,
    tag,
    empty,
    num,
    percent,
    date,
    heading,
    button,
    table,
    field,
    sectionHeading,
    rowMenu,
    menuItem,
    menuLink,
} from './markup.js';
import { editor } from './formula-editor.js';
import { humanFormula } from './formula-config.js';
import { periodEditor } from './period-editor.js';
import { importView, importRowsTable } from './pattern-import.js';
import { filterMarkup } from '../abprove/table-tools';

const STEPS = [
    ['periods', '1', 'Periode', 'Jadwal & status'],
    ['patterns', '2', 'Pola KPI', 'KPI & bobot'],
    ['apply', '3', 'Terapkan pola', 'Pilih penerima'],
    ['matrix', '4', 'Cek bobot', 'Pastikan 100%'],
    ['monitor', '5', 'Monitoring', 'Pantau hasil'],
];
const STEP_OF = { 'period-edit': 'periods', pattern: 'patterns', holders: 'patterns', import: 'patterns', assessment: 'monitor' };
const nav = (ctx, screen, label, id = '', className = 'link') =>
    `<a href="${esc(ctx.url(screen, id))}" data-skp-nav="${screen}" data-id="${esc(id)}" class="${className}">${label}</a>`;
/** Link to a screen of another period (month); `label` is plain text. */
const cycleNav = (ctx, screen, label, cycle, className = 'link') =>
    `<a href="${esc(ctx.url(screen, '', cycle))}" data-skp-nav="${screen}" data-cycle="${esc(cycle)}" class="${className}">${esc(label)}</a>`;
const statusTag = (status) =>
    tag(
        STATUSES[status],
        status === 'final' ? 'success' : status === 'returned' ? 'warning' : status === 'submitted' ? 'info' : '',
    );
const personCell = (p) =>
    `<strong>${esc(p.name)}</strong><small>${esc(p.nip)}${p.type === 'unit_head' ? ' · Kepala Unit' : ''}</small>`;
const unitCell = (ctx, p) => {
    const unit = ctx.index.units.get(p.unitId);
    return `${esc(unit?.name || '—')}<small>${esc(unit?.divisionName || '')}</small>`;
};
const patternCell = (ctx, personId) => {
    const pattern = ctx.index.patterns.get(ctx.index.assigned.get(personId));
    if (pattern) return esc(pattern.name);
    return ctx.index.assessed.has(personId)
        ? '<span class="text-muted">Sudah dinilai · snapshot KPI tetap</span>'
        : '<span class="text-muted">Belum ada pola</span>';
};
const totalTag = (pattern) =>
    tag(pattern.complete ? '100% · siap' : `${num(pattern.total, 4)}% · draf`, pattern.complete ? 'success' : 'warning');
const closed = (ctx) => ctx.index.period?.status === 'closed';
/** Holder mix of a derived pattern, e.g. "3 staf · 1 Kepala Unit". */
const holderMix = (p) => `${p.count - p.heads} staf · ${p.heads} Kepala Unit`;

/**
 * Compact segmented stage navigation; small counters only where real data exists.
 * `loading` hides the counters while another period is being fetched (they would be stale).
 */
export function stepNav(ctx, screen, loading = false) {
    const active = STEP_OF[screen] || screen,
        { staff, unit_head: heads } = ctx.index.readiness,
        eligible = staff.eligible + heads.eligible,
        complete = staff.complete + heads.complete,
        period = ctx.index.period;
    const counters = loading
        ? {}
        : {
              periods: period
                  ? [PERIOD_STATUSES[period.status], period.status === 'open' ? 'success' : period.status === 'planned' ? 'info' : '', 'Status periode']
                  : ['Belum dibuat', 'warning', 'Status periode'],
              patterns: [String(ctx.index.patterns.size), '', 'Jumlah pola'],
              matrix: [`${complete}/${eligible}`, eligible > 0 && complete === eligible ? 'success' : 'warning', 'Staf dan Kepala Unit dengan pola 100%'],
          };
    return `<nav class="skp-steps" aria-label="Tahapan KPI & Periode"><ol>${STEPS.map(([key, number, label, hint]) => {
        const counter = counters[key];
        return `<li><a href="${esc(ctx.url(key))}" data-skp-nav="${key}" title="${esc(hint)}" class="${key === active ? 'active' : ''}" ${key === active ? 'aria-current="page"' : ''}><span class="skp-step-no" aria-hidden="true">${number}</span><span class="skp-step-label">${label}</span>${counter ? `<span class="skp-step-count ${counter[1]}"><span class="sr-only">${esc(counter[2])}: </span>${esc(counter[0])}</span>` : ''}</a></li>`;
    }).join('')}</ol></nav>`;
}
/**
 * Year control: previous/next buttons and a numeric input (YEAR_MIN–YEAR_MAX), so the choice never
 * grows into a long list. `key` tells index.js what the year drives ('picker' or 'list').
 */
const yearStepper = (id, key, year) =>
    `<div class="skp-year-stepper" role="group" aria-label="Tahun"><button type="button" id="${id}-prev" class="btn skp-year-step" data-skp-action="year-step" data-id="${key}:-1" aria-label="Tahun sebelumnya" ${+year <= YEAR_MIN ? 'disabled' : ''}>‹</button><label for="${id}" class="sr-only">Tahun</label><input id="${id}" class="field skp-year-input" type="number" inputmode="numeric" min="${YEAR_MIN}" max="${YEAR_MAX}" step="1" value="${esc(year)}" data-skp-year="${key}"><button type="button" id="${id}-next" class="btn skp-year-step" data-skp-action="year-step" data-id="${key}:1" aria-label="Tahun berikutnya" ${+year >= YEAR_MAX ? 'disabled' : ''}>›</button></div>`;
/** Period picker: year control plus the 12 months of that year with their status (future months included). */
export function periodPicker(ctx, month = ctx.index.month) {
    const year = month.slice(0, 4),
        byId = new Map(ctx.data.periods.map((p) => [p.id, p]));
    const months = MONTHS.map((mm) => {
        const id = `${year}-${mm}`,
            p = byId.get(id);
        return `<option value="${id}" ${id === month ? 'selected' : ''}>${esc(monthName(mm))} · ${p ? PERIOD_STATUSES[p.status] : 'belum dibuat'}</option>`;
    }).join('');
    return `<div class="fx-period-picker" role="group" aria-labelledby="fx-period-picker-label"><span id="fx-period-picker-label" class="fx-period-picker-label">Periode</span>${yearStepper('fx-period-year', 'picker', year)}<label for="fx-period-month" class="sr-only">Bulan</label><select id="fx-period-month" class="field fx-period-month" data-skp-period-choice>${months}</select></div>`;
}
/** Placeholder shown while another period is fetched: stale KPI and scores are never shown. */
export function loadingView(month) {
    return `<div class="gp-empty skp-loading" role="status"><strong>Memuat ${esc(monthLabel(month))}…</strong><p>KPI dan nilai periode ini sedang dimuat.</p></div>`;
}
function readinessBar(ctx) {
    const period = ctx.index.period;
    if (!period || period.status === 'closed') return '';
    const { staff, unit_head: heads } = ctx.index.readiness,
        missing = staff.eligible - staff.complete,
        ready = staff.eligible > 0 && !missing,
        ratio = staff.eligible ? Math.round((staff.complete / staff.eligible) * 100) : 0;
    return `<section class="skp-readiness ${ready ? 'ready' : ''}" aria-label="Kesiapan periode"><div class="skp-readiness-copy"><strong>Kesiapan ${esc(monthLabel(period.id))}</strong><span>${staff.complete} dari ${staff.eligible} staf memiliki pola KPI 100%${missing ? ` · <b>${missing} belum</b>` : ''} · Kepala Unit ${heads.complete}/${heads.eligible}</span></div><div class="skp-readiness-meter"><progress max="100" value="${ratio}" aria-label="Staf lengkap ${ratio}%">${ratio}%</progress><span aria-hidden="true">${ratio}%</span></div><div class="skp-readiness-actions">${period.status === 'open' ? tag('Periode aktif', 'success') : ready ? tag('Siap dibuka', 'success') : tag('Belum dapat dibuka', 'warning')}${missing ? button('show-missing', 'Lihat staf tanpa pola', '', 'btn btn-small') : ''}</div></section>`;
}
function noPeriod(ctx) {
    return empty(
        `Belum ada periode ${monthLabel(ctx.index.month)}`,
        'Buat periode untuk bulan ini atau pilih bulan lain.',
        button('period-new', `+ Buat periode ${monthLabel(ctx.index.month)}`, ctx.index.month, 'btn btn-primary'),
    );
}

/* 1 · Periode */
export function periods(ctx) {
    const year = ctx.periodYear,
        count = ctx.data.periods.filter((p) => p.id.startsWith(`${year}-`)).length;
    return `${heading('Periode penilaian', 'Jadwal dan status penilaian bulanan. Periode dapat dibuka setelah seluruh staf memakai pola KPI 100%.', button('period-new', '+ Buat periode', '', 'btn btn-primary'))}${ctx.message ? note(ctx.message, 'success') : ''}<section class="card skp-table-card fx-period-list"><div class="skp-card-head"><div><h2>Daftar periode ${esc(year)}</h2><p>${count} periode · terbaru di atas</p></div>${yearStepper('fx-period-list-year', 'list', year)}</div>${table('periods', ['Periode', 'Jadwal (WIB)', 'Kesiapan pola KPI', 'Status', '<span class="sr-only">Tindakan</span>'], 'skp-periods')}</section>`;
}
function readinessCell(p, block, reasonId) {
    if (p.status === 'closed') return '—';
    if (p.businessId && !p.managed)
        return `<div class="skp-period-readiness">${tag('KPI versi lama', 'info')}<small>Konversi menjadi pola di Pola KPI</small></div>`;
    const r = p.readiness?.staff;
    if (!r)
        return `<div class="skp-period-readiness">${tag('Belum disimpan', 'warning')}${block ? `<small id="${esc(reasonId)}">${esc(block)}</small>` : ''}</div>`;
    const missing = r.eligible - r.complete,
        ok = r.eligible > 0 && !missing,
        detail = missing > 0 ? `${missing} staf belum memiliki pola 100%.` : block;
    return `<div class="skp-period-readiness">${tag(`${r.complete}/${r.eligible} staf lengkap`, ok ? 'success' : 'warning')}${detail ? `<small id="${esc(reasonId)}">${esc(detail)}</small>` : ''}${missing > 0 ? button('show-missing', `Lihat ${missing} staf`, p.id, 'link') : ''}</div>`;
}
export function periodEdit(ctx) {
    const old = ctx.data.periods.find((p) => p.id === ctx.periodEditing),
        summary = old ? ctx.data.patternSummary?.[old.id] : null;
    const setup = old && {
        patterns: summary?.patterns || 0,
        complete: summary?.complete || 0,
        link: (screen, label) => cycleNav(ctx, screen, label, old.id, 'btn btn-small'),
    };
    return `${heading(old ? 'Detail periode' : 'Buat periode', old ? 'Jadwal, status dan kategori nilai periode.' : 'Periode baru disimpan sebagai Direncanakan.', button('nav', 'Kembali ke daftar', 'periods'))}${periodEditor(ctx.period, old, setup)}`;
}

/* 2 · Pola KPI */
export function patterns(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Pola KPI', '', '') + noPeriod(ctx);
    const readOnly = closed(ctx);
    return `${heading('Pola KPI', 'Total bobot tiap pola tepat 100%. Satu orang memakai satu pola per periode.', readOnly ? '' : `${button('nav', 'Impor pola', 'import')}${button('pattern-new', '+ Buat pola', '', 'btn btn-primary')}`)}${readinessBar(ctx)}${ctx.message ? note(ctx.message, 'success') : ''}${readOnly ? note('Periode ditutup. Pola dan penugasan hanya dapat dibaca.') : `${legacyPanel(ctx)}${copyPanel(ctx)}`}<section class="card skp-table-card fx-kpi-list"><div class="skp-card-head"><div><h2>Daftar pola ${esc(monthLabel(period.id))}</h2><p>${ctx.index.patterns.size} pola · hanya pola 100% yang dapat diterapkan</p></div></div>${table('patterns', ['Pola', 'KPI', 'Total bobot', 'Pemakai', '<span class="sr-only">Tindakan</span>'], 'skp-patterns')}</section>`;
}
/** Import screen; a closed period falls back to the read-only pattern list. */
export function patternImport(ctx) {
    if (!ctx.index.period || closed(ctx)) return patterns(ctx);
    return importView(ctx);
}
function legacyPanel(ctx) {
    const templates = ctx.data.legacyTemplates || [];
    if (!templates.length) return '';
    return `<section class="card skp-panel"><h2>KPI versi lama ditemukan</h2><p class="gp-help">KPI unit/divisi lama (nilai manual 10–100) dapat dikonversi menjadi pola.</p><ul class="skp-legacy">${templates.map((t) => `<li><strong>${esc(t.name)}</strong><span>${t.level === 'unit' ? 'Unit' : 'Divisi'} ${esc(t.areaName)} · ${t.items.length} KPI · ${num(totalWeight(t.items), 4)}% · ${t.personIds.length} orang</span></li>`).join('')}</ul>${button('legacy-convert', `Konversi ${templates.length} KPI lama menjadi pola`, '', 'btn btn-primary')}</section>`;
}
/** Copy sources are bounded to the nearest periods that have patterns. */
const COPY_SOURCES = 12;
function copyPanel(ctx) {
    const summary = ctx.data.patternSummary || {},
        month = ctx.index.month,
        distance = (id) => Math.abs((+id.slice(0, 4) - +month.slice(0, 4)) * 12 + (+id.slice(5) - +month.slice(5)));
    const sources = ctx.data.periods
        .filter((p) => p.id !== month && summary[p.id]?.patterns)
        .toSorted((a, b) => distance(a.id) - distance(b.id) || b.id.localeCompare(a.id))
        .slice(0, COPY_SOURCES)
        .toSorted((a, b) => b.id.localeCompare(a.id));
    if (!sources.length) return '';
    const preferred = sources.find((p) => p.id < month)?.id || sources[0].id;
    return `<section class="card skp-panel"><h2>Gunakan KPI dari periode lain</h2><div class="skp-copy"><label><span class="label">Periode sumber</span><select class="field" data-skp-copy-source>${sources.map((p) => `<option value="${p.id}" ${p.id === preferred ? 'selected' : ''}>${esc(p.name)} · ${summary[p.id].patterns} pola</option>`).join('')}</select></label>${button('copy-patterns', `Gunakan di ${monthLabel(month)}`, '', 'btn btn-primary')}</div><p class="gp-help">Disalin sebagai pola baru; periode sumber tidak berubah.</p></section>`;
}
export function patternEdit(ctx) {
    const p = ctx.pattern,
        saved = ctx.index.patterns.get(p.id),
        count = saved?.count || 0,
        readOnly = closed(ctx);
    const items = p.items
        .map((k, i) => {
            const invalid = Object.keys(kpiErrors(k)).length;
            return `<tr class="${ctx.kpiIndex === i ? 'editing' : ''}"><td data-label="No" class="num text-muted">${i + 1}</td><td data-label="KPI & formula"><strong>${esc(k.name)}</strong><small class="fx-formula-summary" title="${esc(humanFormula(k))}">${esc(humanFormula(k))}</small>${invalid ? tag('Perlu dilengkapi', 'warning') : ''}</td><td data-label="Pilar">${esc(k.pillar)}</td><td data-label="Target">${num(k.target, 4)} ${esc(k.unit)}<small>${k.direction === 'lower' ? 'Semakin rendah semakin baik' : 'Semakin tinggi semakin baik'}</small></td><td data-label="Bobot (%)"><input class="field skp-weight-input" type="number" min="0.0001" max="100" step="0.0001" inputmode="decimal" value="${esc(k.weight)}" data-skp-item-weight="${i}" aria-label="Bobot ${esc(k.name)}" ${readOnly ? 'disabled' : ''}></td><td data-label="Tindakan">${readOnly ? '' : `<div class="skp-row-actions">${button('kpi-edit', 'Ubah', i, 'link')}${button('kpi-remove', 'Hapus', i, 'link skp-link-danger')}</div>`}</td></tr>`;
        })
        .join('');
    const actions = `${button('nav', 'Kembali ke daftar pola', 'patterns')}${saved ? nav(ctx, 'holders', `Lihat ${count} pemakai`, saved.id, 'btn') : ''}`;
    return `${heading(p.id ? `Pola: ${saved?.name || p.name}` : 'Buat pola KPI', `${monthLabel(p.periodId)} · ${count ? holderMix(saved) : 'belum ada pemakai'}`, actions)}${count && !readOnly ? note(`Perubahan KPI berlaku untuk ${count} pemakai; yang sudah dinilai tetap memakai snapshot KPI-nya.`, 'warning') : ''}<section class="card skp-form-card skp-pattern-card"><form id="skp-pattern-form" novalidate autocomplete="off"><section class="fx-form-section">${sectionHeading(1, 'Identitas pola', 'Dapat dipakai staf dan Kepala Unit sekaligus.')}<div class="gp-form-grid">${field('patternName', 'Nama pola', p.name, { required: true, maxlength: 120, disabled: readOnly, help: 'Contoh: Bidan, Perawat Rawat Inap, Staf IT.' })}</div></section><section class="fx-form-section"><div class="skp-items-heading">${sectionHeading(2, 'Daftar KPI dalam pola', 'Atur bobot langsung di tabel; total wajib tepat 100%.')}${readOnly ? '' : button('kpi-new', '+ Tambah KPI', '', 'btn')}</div><div class="table-wrap"><table class="data-table gp-table skp-items"><thead><tr><th>No</th><th>KPI & formula</th><th>Pilar</th><th>Target</th><th>Bobot (%)</th><th>Tindakan</th></tr></thead><tbody>${items || `<tr><td colspan="6" class="empty">Belum ada KPI. Pilih + Tambah KPI.</td></tr>`}</tbody></table></div><p class="gp-field-error" data-gp-error="items" hidden></p><p class="gp-note error skp-form-error" data-form-error role="alert" hidden></p></section></form></section>${ctx.kpi ? editor(ctx.kpi, ctx.testValues, othersWeight(ctx), { editing: ctx.kpiIndex >= 0, pillars: pillarSuggestions(ctx.data, p.items, ctx.kpi.pillar) }) : ''}<div class="skp-savebar"><div data-skp-pattern-total>${patternTotal(p.items)}</div>${readOnly ? '' : `<div class="gp-actions">${button('nav', 'Batal', 'patterns')}<button type="submit" class="btn btn-primary" form="skp-pattern-form">Simpan pola</button></div>`}</div>`;
}
export function othersWeight(ctx) {
    if (ctx.importEdit) return ctx.importEdit.others;
    return totalWeight(ctx.pattern.items.filter((_, i) => i !== ctx.kpiIndex));
}
export function patternTotal(items) {
    const total = totalWeight(items);
    const state =
        total === 100
            ? tag('Tepat 100% · siap diterapkan', 'success')
            : tag(total > 100 ? `Lebih ${num(total - 100, 4)}%` : `Kurang ${num(100 - total, 4)}%`, 'warning');
    return `<span class="skp-total-label">Total bobot pola</span><strong>${num(total, 4)}%</strong>${state}<meter min="0" max="100" low="99.9999" high="100" optimum="100" value="${Math.min(total, 100)}" aria-label="Total bobot ${num(total, 4)}%"></meter>`;
}

/* 3 · Terapkan pola */
/** Recipients of the apply list: staff and Kepala Unit together, narrowed only by the filters. */
export const applyRows = (ctx) => filterPeople(ctx.index, ctx.filter);
export function apply(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Terapkan pola', '', '') + noPeriod(ctx);
    const head = heading('Terapkan pola', 'Pilih pola, centang staf dan/atau Kepala Unit, lalu terapkan.', '');
    if (closed(ctx)) return head + note('Periode ditutup. Penugasan pola hanya dapat dibaca di Cek bobot.');
    if (!ctx.index.patterns.size)
        return `${head}${empty('Belum ada pola KPI pada periode ini', 'Buat pola atau gunakan KPI dari periode lain.', nav(ctx, 'patterns', 'Ke Pola KPI', '', 'btn btn-primary'))}`;
    const options = [...ctx.index.patterns.values()]
        .toSorted((a, b) => a.name.localeCompare(b.name, 'id'))
        .map((p) => `<option value="${esc(p.id)}" ${p.id === ctx.applyPattern ? 'selected' : ''} ${p.complete ? '' : 'disabled'}>${esc(p.name)} · ${p.items.length} KPI · ${p.complete ? `${p.count} pemakai` : `bobot ${num(p.total, 4)}%, belum 100%`}</option>`)
        .join('');
    const chosen = ctx.index.patterns.get(ctx.applyPattern);
    return `${head}${readinessBar(ctx)}${ctx.message ? note(ctx.message, 'success') : ''}<section class="card skp-panel"><div class="skp-apply-pick"><label><span class="label">Pola yang akan diterapkan</span><select class="field" data-skp-apply-pattern><option value="">Pilih pola</option>${options}</select></label>${chosen ? `<div class="skp-chosen">${nav(ctx, 'holders', `Lihat ${chosen.count} pemakai`, chosen.id, 'btn btn-small')}${chosen.items.map((k) => `<span>${esc(k.name)} · ${num(k.weight, 4)}%</span>`).join('')}</div>` : '<p class="gp-help">Hanya pola 100% yang dapat dipilih.</p>'}</div></section><section class="card skp-table-card fx-kpi-list"><div class="table-tools">${filters(ctx, 'skp-apply-filter')}<input class="field gp-search" type="search" data-skp-search aria-label="Cari nama atau NIP" placeholder="Cari nama atau NIP" value="${esc(ctx.filter.search)}"></div><div data-skp-summary="apply">${applySummary(ctx)}</div>${table('apply', ['<input type="checkbox" data-skp-select-all aria-label="Pilih semua hasil filter">', 'Penerima', 'Unit', 'Jabatan', 'Pola saat ini'], 'skp-apply')}</section>`;
}
function applySummary(ctx) {
    const rows = applyRows(ctx),
        chosen = ctx.applyPattern,
        selected = rows.filter((p) => ctx.selection.has(p.id));
    const replacing = new Map();
    for (const p of selected) {
        const current = ctx.index.assigned.get(p.id);
        if (current && current !== chosen) {
            const name = ctx.index.patterns.get(current)?.name || 'pola lain';
            replacing.set(name, (replacing.get(name) || 0) + 1);
        }
    }
    const replaced = [...replacing.values()].reduce((n, v) => n + v, 0),
        holders = selected.filter((p) => ctx.index.assigned.has(p.id)).length;
    return `<div class="skp-selection"><p><b>${rows.length}</b> orang sesuai filter · <b>${selected.length}</b> dipilih${chosen && replaced ? ` · <b>${replaced}</b> akan diganti polanya` : ''}</p><div class="gp-actions">${button('select-filtered', `Pilih semua hasil filter (${rows.length})`, '', 'btn btn-small', !rows.length)}${button('release', `Lepas pola (${holders})`, '', 'btn btn-small btn-danger', !holders)}${button('apply', chosen ? `Terapkan ke ${selected.length} orang` : 'Pilih pola terlebih dahulu', '', 'btn btn-small btn-primary', !chosen || !selected.length)}</div></div>`;
}

/* Pemakai pola: current holders of one pattern in the selected period. */
const HOLDER_STATES = { open: 'Belum dinilai', assessed: 'Sudah dinilai', ineligible: 'Tidak aktif pada periode ini' };
const holderState = (h) => (h.status ? 'assessed' : h.eligible ? 'open' : 'ineligible');
/** Why a holder cannot be released or changed, or '' when it can. */
export const holderLock = (ctx, h) =>
    closed(ctx) ? 'Periode ditutup' : h.status ? 'Sudah dinilai · snapshot KPI tetap' : '';
export function holderRows(ctx) {
    const f = ctx.holders,
        q = f.search.trim().toLowerCase();
    return patternHolders(ctx.index, f.patternId).filter(
        (h) =>
            (!f.role || h.type === f.role) &&
            (!f.state || holderState(h) === f.state) &&
            (!q || h.name.toLowerCase().includes(q) || h.nip.toLowerCase().includes(q)),
    );
}
export function holders(ctx) {
    const pattern = ctx.index.patterns.get(ctx.holders.patternId),
        readOnly = closed(ctx),
        f = ctx.holders,
        option = (value, label, current) => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
    const add = readOnly
        ? ''
        : pattern.complete
          ? button('pattern-apply', '+ Tambah pemakai', pattern.id, 'btn btn-primary')
          : `<span class="skp-disabled-action">${button('pattern-apply', '+ Tambah pemakai', pattern.id, 'btn btn-primary', true)}<small>Lengkapi bobot 100% dahulu.</small></span>`;
    const actions = `${button('nav', 'Kembali ke daftar pola', 'patterns')}${button('pattern-edit', readOnly ? 'Lihat pola' : 'Ubah pola', pattern.id)}${add}`;
    const filter = filterMarkup(
        'skp-holder-filter',
        `<label>Jenis penerima<select class="field" data-skp-holder-filter="role">${option('', 'Semua', f.role)}${Object.entries(ROLES).map(([k, v]) => option(k, v, f.role)).join('')}</select></label><label>Status<select class="field" data-skp-holder-filter="state">${option('', 'Semua status', f.state)}${Object.entries(HOLDER_STATES).map(([k, v]) => option(k, v, f.state)).join('')}</select></label>`,
        'Filter pemakai',
    );
    return `${heading(`Pemakai pola: ${pattern.name}`, `${monthLabel(ctx.index.month)} · ${pattern.count} pemakai (${holderMix(pattern)})`, actions, 'Pola KPI · Pemakai')}${readOnly ? note('Periode ditutup. Daftar pemakai hanya dapat dibaca.') : ''}${ctx.message ? note(ctx.message, 'success') : ''}<section class="card skp-table-card fx-kpi-list"><div class="table-tools">${filter}<input class="field gp-search" type="search" data-skp-holder-search aria-label="Cari nama atau NIP pemakai" placeholder="Cari nama atau NIP" value="${esc(f.search)}"></div><div data-skp-summary="holders">${holderSummary(ctx)}</div>${table('holders', [`<input type="checkbox" data-skp-holder-select-all aria-label="Pilih semua pemakai yang dapat diubah" ${readOnly ? 'disabled' : ''}>`, 'Pemakai', 'Jenis', 'Unit / divisi', 'Penilaian'], 'skp-apply skp-holders')}</section>`;
}
function holderSummary(ctx) {
    const rows = holderRows(ctx),
        f = ctx.holders,
        selected = rows.filter((h) => f.selection.has(h.id)),
        movable = selected.filter((h) => h.eligible).length;
    if (closed(ctx)) return `<p class="skp-result-line"><b>${rows.length}</b> pemakai sesuai filter</p>`;
    const targets = [...ctx.index.patterns.values()]
        .filter((p) => p.id !== f.patternId && p.complete)
        .toSorted((a, b) => a.name.localeCompare(b.name, 'id'));
    const target = targets.some((p) => p.id === f.target) ? f.target : '';
    return `<div class="skp-selection"><p><b>${rows.length}</b> pemakai sesuai filter · <b>${selected.length}</b> dipilih${selected.length > movable ? ` · <b>${selected.length - movable}</b> tidak aktif, hanya dapat dilepas` : ''}</p><div class="gp-actions"><label class="sr-only" for="skp-holder-target">Ganti ke pola</label><select id="skp-holder-target" class="field skp-holder-target" data-skp-holder-target ${targets.length ? '' : 'disabled'}><option value="">${targets.length ? 'Ganti ke pola…' : 'Tidak ada pola 100% lain'}</option>${targets.map((p) => `<option value="${esc(p.id)}" ${p.id === target ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>${button('holder-move', `Ganti pola (${movable})`, '', 'btn btn-small', !movable || !target)}${button('holder-release', `Lepas pola (${selected.length})`, '', 'btn btn-small btn-danger', !selected.length)}</div></div>`;
}

/* 4 · Cek bobot */
const matrixRows = (ctx) => filterPeople(ctx.index, ctx.filter);
export function matrix(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Cek bobot', '', '') + noPeriod(ctx);
    const { staff, unit_head: heads } = ctx.index.readiness;
    const incomplete = staff.eligible - staff.complete + heads.eligible - heads.complete;
    const headsTone = !heads.eligible ? 'tone-neutral' : heads.complete === heads.eligible ? 'tone-teal' : 'tone-amber';
    const used = [...ctx.index.patterns.values()].filter((p) => p.count).length;
    return `${heading('Cek bobot per orang', 'Seluruh staf dan Kepala Unit eligible, termasuk yang belum memiliki pola (0%).', '')}<div class="gp-summary"><div class="tone-teal"><span>Staf lengkap 100%</span><strong>${staff.complete}/${staff.eligible}</strong></div><div class="${incomplete ? 'tone-amber' : 'tone-neutral'}"><span>Orang belum lengkap 100%</span><strong>${incomplete}</strong></div><div class="${headsTone}"><span>Kepala Unit lengkap</span><strong>${heads.complete}/${heads.eligible}</strong></div><div class="tone-neutral"><span>Pola dipakai</span><strong>${used}/${ctx.index.patterns.size}</strong></div></div><section class="card skp-table-card fx-kpi-list"><div class="table-tools">${filters(ctx, 'skp-matrix-filter')}<input class="field gp-search" type="search" data-skp-search aria-label="Cari nama atau NIP" placeholder="Cari nama atau NIP" value="${esc(ctx.filter.search)}"></div><div data-skp-summary="matrix">${matrixSummary(ctx)}</div>${table('matrix', ['Nama', 'Unit', 'Jabatan', 'Pola', 'Total bobot', 'Status'], 'skp-matrix')}</section>`;
}
function matrixSummary(ctx) {
    const rows = matrixRows(ctx);
    let complete = 0,
        missing = 0;
    for (const p of rows) {
        const pattern = ctx.index.patterns.get(ctx.index.assigned.get(p.id));
        if (pattern?.complete || (!pattern && ctx.index.assessed.has(p.id))) complete++;
        else if (!pattern) missing++;
    }
    const incomplete = rows.length - complete - missing;
    return `<p class="skp-result-line">Hasil filter: <b>${rows.length}</b> orang · <b>${complete}</b> lengkap · <b>${missing}</b> belum ada pola${incomplete ? ` · <b>${incomplete}</b> pola belum 100%` : ''}</p>`;
}

/* Filters shared by Terapkan & Cek bobot. */
export function unitOptions(ctx) {
    return `<option value="">Semua unit</option>${ctx.data.units
        .filter((u) => !ctx.filter.division || u.divisionId === ctx.filter.division)
        .map((u) => {
            const heads = ctx.index.unitHeads.get(u.id);
            return `<option value="${esc(u.id)}" ${u.id === ctx.filter.unit ? 'selected' : ''}>${esc(u.name)} · KU: ${esc(heads?.join(', ') || 'belum ada')}</option>`;
        })
        .join('')}`;
}
function filters(ctx, id) {
    const f = ctx.filter,
        select = (key, label, options) =>
            `<label>${label}<select class="field" data-skp-filter="${key}">${options}</select></label>`,
        option = (value, label, current) =>
            `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
    return filterMarkup(
        id,
        `${select('division', 'Divisi', `<option value="">Semua divisi</option>${[...ctx.index.divisions.values()].map((d) => option(d.id, `${d.name} · KD: ${d.head || 'belum ada'}`, f.division)).join('')}`)}${select('unit', 'Unit', unitOptions(ctx))}${select('position', 'Jabatan', `<option value="">Semua jabatan</option>${ctx.data.positions.map((p) => option(p.id, p.name, f.position)).join('')}`)}${select('role', 'Jenis penerima', `${option('', 'Semua', f.role)}${Object.entries(ROLES).map(([k, v]) => option(k, v, f.role)).join('')}`)}${select('status', 'Status pola', `${option('', 'Semua status', f.status)}${option('assigned', 'Sudah punya pola 100%', f.status)}${option('none', 'Belum lengkap 100%', f.status)}`)}`,
        'Filter orang',
    );
}

/* Monitoring */
const monitorRows = (ctx) => {
    const f = ctx.monitor,
        q = f.search.trim().toLowerCase();
    return ctx.data.assessments.filter((a) => {
        if ((f.unit && a.unitId !== f.unit) || (f.kind && a.subjectType !== f.kind) || (f.status && a.status !== f.status))
            return false;
        if (!q) return true;
        const p = ctx.index.people.get(a.personId);
        return `${p?.name} ${p?.nip}`.toLowerCase().includes(q);
    });
};
export function monitor(ctx) {
    const f = ctx.monitor;
    const filter = filterMarkup(
        'skp-monitor-filter',
        `<label>Unit<select class="field" data-skp-monitor-filter="unit"><option value="">Semua unit</option>${ctx.data.units.map((u) => `<option value="${esc(u.id)}" ${u.id === f.unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label><label>Jalur penilaian<select class="field" data-skp-monitor-filter="kind"><option value="">Staf & Kepala Unit</option>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${f.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>Status<select class="field" data-skp-monitor-filter="status"><option value="">Semua status</option>${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`,
        'Filter monitoring KPI',
    );
    return `${heading('Monitoring KPI', 'Progres dan hasil penilaian. Super HC hanya memantau.', '')}<div data-skp-summary="monitor">${monitorSummary(ctx)}</div><section class="card skp-table-card"><div class="table-tools">${filter}<input class="field gp-search" type="search" aria-label="Cari monitoring KPI" data-skp-monitor-search placeholder="Cari nama atau NIP" value="${esc(f.search)}"></div>${table('monitor', ['Nama / jalur', 'Unit', 'Status', 'Total hasil', 'Tindakan'], 'skp-monitor')}</section>`;
}
const STATUS_TONES = { not_started: 'tone-neutral', draft: 'tone-neutral', submitted: 'tone-blue', returned: 'tone-amber', final: 'tone-teal' };
function monitorSummary(ctx) {
    const counts = new Map();
    for (const a of monitorRows(ctx)) counts.set(a.status, (counts.get(a.status) || 0) + 1);
    return `<div class="gp-summary skp-status-summary">${Object.entries(STATUSES)
        .map(([id, label]) => `<div class="${STATUS_TONES[id]}"><span>${label}</span><strong>${counts.get(id) || 0}</strong></div>`)
        .join('')}</div>`;
}
export function assessment(ctx, id) {
    const a = ctx.data.assessments.find((a) => a.id === id);
    if (!a)
        return empty('Penilaian tidak ditemukan', 'Kembali ke Monitoring KPI.', nav(ctx, 'monitor', 'Kembali ke Monitoring', '', 'btn'));
    const p = ctx.index.people.get(a.personId),
        unit = ctx.index.units.get(a.unitId),
        result = totals(a);
    const rows = a.snapshot
        .map((k, i) => {
            const input = a.inputs[k.id] || {},
                r = result.results[i];
            const values =
                k.method === 'formula'
                    ? (k.variables || [])
                          .map((v) => `${esc(v.key)} · ${esc(v.label)}: <b>${esc(v.source === 'fixed' ? v.value : (input[`variable_${v.key}`] ?? input.variables?.[v.key] ?? '—'))}</b>`)
                          .join('<br>')
                    : `Nilai: <b>${esc(input.value ?? '—')}</b>`;
            const score = r.proposal === null ? num(r.score, 2) : `${num(r.score, 2)}<small>Koreksi KD · usulan KU ${num(r.proposal, 2)}</small>`;
            return `<tr><td data-label="KPI"><strong>${i + 1}. ${esc(k.name)}</strong><small>${esc(k.method === 'formula' ? humanFormula(k) : 'Nilai manual 10–100')}</small></td><td data-label="Bobot">${percent(k.weight)}</td><td data-label="Data">${values}</td><td data-label="Hasil">${r.measurement == null ? '—' : `${num(r.measurement, 2)} ${esc(k.unit || '')}`}</td><td data-label="Nilai KPI">${score}</td><td data-label="Berbobot">${num(r.weighted, 2)}</td></tr>`;
        })
        .join('');
    return `${heading(p?.name || 'Penilaian', `${monthLabel(a.periodId)} · ${unit?.name || '—'} · ${ROLES[a.subjectType]}${a.snapshot[0]?.patternName ? ` · Pola ${a.snapshot[0].patternName}` : ''}`, statusTag(a.status), 'Monitoring · Hasil penilaian')}${a.status === 'final' ? note(`Penilaian Selesai${a.completedBy ? ` oleh ${a.completedBy}${a.completedByCurrentName ? ' (nama akun saat ini; data lama tanpa snapshot)' : ''}` : ''}. Nilai dan snapshot hanya dapat dibaca.`, 'success') : note('Super HC hanya memantau. Pengisian, ACC dan finalisasi dilakukan Kepala Unit dan Kepala Divisi.')}<section class="card skp-table-card"><div class="table-wrap"><table class="data-table gp-table skp-result-table"><thead><tr><th>KPI</th><th>Bobot</th><th>Data penilai</th><th>Hasil pengukuran</th><th>Nilai KPI</th><th>Nilai berbobot</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">KPI belum ditetapkan.</td></tr>`}</tbody></table></div></section><div class="gp-assessment-total"><span>Total nilai berbobot</span><strong>${num(a.finalTotal ?? a.total ?? result.total, 2)}</strong><span>${a.finalTotal == null ? 'Hasil lengkap setelah seluruh KPI valid' : 'Hasil Selesai'}</span></div><div>${nav(ctx, 'monitor', '← Kembali ke Monitoring')}</div>`;
}

/** Visual companion of a total-weight label; 100% is the only optimum. */
const weightMeter = (total) =>
    `<meter class="skp-weight-meter" min="0" max="100" low="99.9999" high="100" optimum="100" value="${Math.min(total, 100)}" aria-hidden="true"></meter>`;

/* Rows rendered through `paginate` (records + renderRow). */
export const TABLES = {
    periods: {
        empty: (ctx) => `Belum ada periode pada ${ctx.periodYear}. Pilih + Buat periode untuk menambahkannya.`,
        records: (ctx) =>
            ctx.data.periods.filter((p) => p.id.startsWith(`${ctx.periodYear}-`)).toSorted((a, b) => b.id.localeCompare(a.id)),
        row: (ctx, p) => {
            const block = p.status === 'planned' ? openBlock(p) : '',
                summary = ctx.data.patternSummary || {},
                hasPatterns = !!summary[p.id]?.patterns,
                hasPrevious = Object.keys(summary).some((id) => id < p.id && summary[id].patterns),
                patternLabel = p.status === 'closed' ? 'Lihat pola KPI' : hasPatterns ? 'Kelola pola KPI' : hasPrevious ? 'Gunakan KPI sebelumnya' : 'Siapkan pola KPI',
                reasonId = `skp-open-block-${p.id}`;
            const actions = rowMenu(`skp-menu-period-${p.id}`, `Tindakan ${p.name}`, [
                menuItem('period', p.status === 'closed' ? 'Lihat detail' : 'Lihat / ubah periode', p.id),
                menuLink(ctx.url('patterns', '', p.id), patternLabel, 'patterns', { cycle: p.id }),
                p.status === 'planned' &&
                    menuItem('period-open', 'Buka periode', p.id, { disabled: !!block, describedBy: block ? reasonId : '' }),
            ]);
            return `<tr>
                <td data-label="Periode"><strong>${esc(p.name)}</strong><small>${esc(monthLabel(p.id))}</small></td>
                <td data-label="Jadwal (WIB)"><dl class="skp-period-schedule">
                    <div><dt>Mulai</dt><dd>${date(p.opens)}</dd></div>
                    <div><dt>Batas KU</dt><dd>${date(p.submission)}</dd></div>
                    <div><dt>ACC KD</dt><dd>${date(p.approval)}</dd></div>
                    <div><dt>Ditutup</dt><dd>${date(p.closes)}</dd></div>
                </dl></td>
                <td data-label="Kesiapan pola KPI">${readinessCell(p, block, reasonId)}</td>
                <td data-label="Status" class="skp-period-status">${tag(PERIOD_STATUSES[p.status], p.status === 'open' ? 'success' : p.status === 'planned' ? 'info' : '')}</td>
                <td data-label="Tindakan" class="skp-menu-cell">${actions}</td>
            </tr>`;
        },
    },
    patterns: {
        empty: 'Belum ada pola. Buat, impor, atau gunakan KPI dari periode lain.',
        records: (ctx) => [...ctx.index.patterns.values()].toSorted((a, b) => a.name.localeCompare(b.name, 'id')),
        row: (ctx, p) => {
            const readOnly = closed(ctx),
                names = p.items.map((k) => k.name).join(', ');
            // Holders are viewed and added from the Pemakai column (holders screen); the menu keeps pattern actions only.
            const actions = rowMenu(`skp-menu-pattern-${p.id}`, `Tindakan pola ${p.name}`, [
                menuItem('pattern-edit', readOnly ? 'Lihat pola' : 'Ubah pola', p.id),
                !readOnly && menuItem('pattern-duplicate', 'Duplikat', p.id),
                !readOnly && menuItem('pattern-delete', 'Hapus pola', p.id, { danger: true }),
            ]);
            return `<tr><td data-label="Pola"><strong class="skp-clip" title="${esc(p.name)}">${esc(p.name)}</strong></td><td data-label="KPI">${p.items.length} KPI<small class="skp-clip" title="${esc(names)}">${esc(names)}</small></td><td data-label="Total bobot"><span class="skp-total">${totalTag(p)}${weightMeter(p.total)}</span></td><td data-label="Pemakai">${nav(ctx, 'holders', `${p.count} pemakai<span class="sr-only"> pola ${esc(p.name)}</span>`, p.id, 'link skp-holders-link')}<small>${p.count ? holderMix(p) : 'Belum dipakai'}</small></td><td data-label="Tindakan" class="skp-menu-cell">${actions}</td></tr>`;
        },
    },
    apply: {
        empty: 'Tidak ada orang pada filter ini.',
        records: applyRows,
        row: (ctx, p) => {
            const current = ctx.index.assigned.get(p.id),
                same = current && current === ctx.applyPattern;
            return `<tr class="${ctx.selection.has(p.id) ? 'selected' : ''}"><td data-label="Pilih"><input type="checkbox" data-skp-select="${esc(p.id)}" ${ctx.selection.has(p.id) ? 'checked' : ''} aria-label="Pilih ${esc(p.name)}"></td><td data-label="Nama">${personCell(p)}</td><td data-label="Unit">${unitCell(ctx, p)}</td><td data-label="Jabatan">${esc(p.positionName)}</td><td data-label="Pola saat ini">${patternCell(ctx, p.id)}${same ? '<small>Sudah memakai pola ini</small>' : ''}</td></tr>`;
        },
    },
    holders: {
        empty: (ctx) =>
            ctx.index.patterns.get(ctx.holders.patternId)?.count ? 'Tidak ada pemakai pada filter ini.' : 'Belum ada pemakai pola ini.',
        records: holderRows,
        row: (ctx, h) => {
            const lock = holderLock(ctx, h),
                checked = !lock && ctx.holders.selection.has(h.id),
                reason = `skp-holder-lock-${h.id}`;
            const hint = lock && !closed(ctx) ? lock : h.eligible ? '' : 'Tidak memenuhi syarat; hanya dapat dilepas.';
            return `<tr class="${checked ? 'selected' : ''}"><td data-label="Pilih"><input type="checkbox" data-skp-holder-select="${esc(h.id)}" ${checked ? 'checked' : ''} ${lock ? 'disabled' : ''} aria-label="Pilih ${esc(h.name || h.id)}"${hint ? ` aria-describedby="${esc(reason)}"` : ''}></td><td data-label="Pemakai"><strong>${esc(h.name || 'Data orang tidak ditemukan')}</strong><small>${esc(h.nip || h.id)}</small>${h.eligible ? '' : tag('Tidak aktif', 'warning')}</td><td data-label="Jenis">${esc(ROLES[h.type])}</td><td data-label="Unit / divisi">${esc(h.unitName || '—')}<small>${esc(h.divisionName)}</small></td><td data-label="Penilaian">${h.status ? statusTag(h.status) : tag('Belum dinilai')}${hint ? `<small id="${esc(reason)}">${esc(hint)}</small>` : ''}</td></tr>`;
        },
    },
    matrix: {
        empty: 'Tidak ada orang pada filter ini.',
        records: matrixRows,
        row: (ctx, p) => {
            const pattern = ctx.index.patterns.get(ctx.index.assigned.get(p.id)),
                ok = pattern?.complete,
                // Assessed without a pattern (e.g. legacy KPI): the sealed snapshot remains in force.
                frozen = !pattern && ctx.index.assessed.has(p.id);
            return `<tr><td data-label="Nama">${personCell(p)}</td><td data-label="Unit">${unitCell(ctx, p)}</td><td data-label="Jabatan">${esc(p.positionName)}</td><td data-label="Pola">${pattern ? nav(ctx, 'pattern', esc(pattern.name), pattern.id) : frozen ? '<span class="text-muted">Snapshot penilaian</span>' : '<span class="text-muted">—</span>'}</td><td data-label="Total bobot"><span class="num">${frozen ? '—' : percent(pattern ? pattern.total : 0)}</span>${frozen ? '' : weightMeter(pattern ? pattern.total : 0)}</td><td data-label="Status">${ok ? tag('Lengkap', 'success') : frozen ? tag('Sudah dinilai', 'success') : tag(pattern ? 'Pola belum 100%' : 'Belum ada pola', 'warning')}</td></tr>`;
        },
    },
    monitor: {
        empty: 'Belum ada penilaian pada filter ini.',
        records: monitorRows,
        row: (ctx, a) =>
            `<tr><td data-label="Nama / jalur"><strong>${esc(ctx.index.people.get(a.personId)?.name || a.personId)}</strong><small>${a.subjectType === 'unit_head' ? 'Penilaian Kepala Unit' : 'Penilaian Staf'}</small></td><td data-label="Unit">${esc(ctx.index.units.get(a.unitId)?.name || '—')}</td><td data-label="Status">${statusTag(a.status)}</td><td data-label="Total hasil" class="num">${num(a.finalTotal ?? a.total ?? totals(a).total, 2)}</td><td data-label="Tindakan">${nav(ctx, 'assessment', 'Lihat hasil', a.id)}</td></tr>`,
    },
    importRows: importRowsTable,
};
export const SUMMARIES = {
    apply: applySummary,
    holders: holderSummary,
    matrix: matrixSummary,
    monitor: monitorSummary,
};
