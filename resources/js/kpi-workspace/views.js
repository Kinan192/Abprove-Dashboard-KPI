import {
    ROLES,
    STATUSES,
    PERIOD_STATUSES,
    calculate,
    totals,
    totalWeight,
    kpiErrors,
    monthLabel,
    openBlock,
    filterPeople,
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
} from './markup.js';
import { editor } from './formula-editor.js';
import { humanFormula } from './formula-config.js';
import { periodEditor } from './period-editor.js';
import { filterMarkup } from '../abprove/table-tools';

const STEPS = [
    ['periods', '1', 'Periode', 'Jadwal & status'],
    ['patterns', '2', 'Pola KPI', 'KPI & bobot'],
    ['apply', '3', 'Terapkan ke staf', 'Pilih penerima'],
    ['matrix', '4', 'Cek bobot', 'Pastikan 100%'],
    ['monitor', '5', 'Monitoring', 'Pantau hasil'],
];
const STEP_OF = { 'period-edit': 'periods', pattern: 'patterns', assessment: 'monitor' };
/** Heading eyebrow: "Langkah n dari 5", optionally with the period month. */
const step = (key, month = '') =>
    `Langkah ${STEPS.find(([k]) => k === key)[1]} dari ${STEPS.length}${month ? ` · ${monthLabel(month)}` : ''}`;
const nav = (ctx, screen, label, id = '', className = 'link') =>
    `<a href="${esc(ctx.url(screen, id))}" data-skp-nav="${screen}" data-id="${esc(id)}" class="${className}">${label}</a>`;
const statusTag = (status) =>
    tag(
        STATUSES[status],
        status === 'final' ? 'success' : status === 'returned' ? 'warning' : 'info',
    );
const personCell = (p) =>
    `<strong>${esc(p.name)}</strong><small>${esc(p.nip)}${p.type === 'unit_head' ? ' · Kepala Unit' : ''}</small>`;
const unitCell = (ctx, p) => {
    const unit = ctx.index.units.get(p.unitId);
    return `${esc(unit?.name || '—')}<small>${esc(unit?.divisionName || '')}</small>`;
};
const patternCell = (ctx, personId) => {
    const pattern = ctx.index.patterns.get(ctx.index.assigned.get(personId));
    return pattern ? esc(pattern.name) : '<span class="text-muted">Belum ada pola</span>';
};
const totalTag = (pattern) =>
    tag(
        pattern.complete ? '100% · siap diterapkan' : `${num(pattern.total, 4)}% · belum 100%`,
        pattern.complete ? 'success' : 'warning',
    );
const closed = (ctx) => ctx.index.period?.status === 'closed';

export function stepNav(ctx, screen) {
    const active = STEP_OF[screen] || screen,
        r = ctx.index.readiness.staff,
        period = ctx.index.period;
    const badges = {
        periods: period ? PERIOD_STATUSES[period.status] : 'Belum dibuat',
        patterns: `${ctx.index.patterns.size} pola`,
        matrix: `${r.complete}/${r.eligible} staf`,
    };
    return `<nav class="skp-steps" aria-label="Tahapan KPI & Periode"><ol>${STEPS.map(([key, number, label, hint]) => `<li><a href="${esc(ctx.url(key))}" data-skp-nav="${key}" class="${key === active ? 'active' : ''}" ${key === active ? 'aria-current="page"' : ''}><span class="skp-step-no" aria-hidden="true">${number}</span><span class="skp-step-copy"><b>${label}</b><small>${esc(badges[key] || hint)}</small></span></a></li>`).join('')}</ol></nav>`;
}
export function periodPicker(ctx) {
    return `<div class="fx-period-picker"><label for="fx-page-period">Periode</label><select id="fx-page-period" class="field" data-skp-period-choice>${ctx.index.period ? '' : `<option value="" selected>${esc(monthLabel(ctx.index.month))} · belum dibuat</option>`}${ctx.data.periods
        .toSorted((a, b) => b.id.localeCompare(a.id))
        .map(
            (p) =>
                `<option value="${p.id}" ${p.id === ctx.index.month ? 'selected' : ''}>${esc(p.name)} · ${PERIOD_STATUSES[p.status]}</option>`,
        )
        .join('')}</select></div>`;
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
        'Buat periode bulan ini terlebih dahulu atau pilih periode lain.',
        button('period-new', '+ Buat periode', '', 'btn btn-primary'),
    );
}

/* 1 · Periode */
export function periods(ctx) {
    return `${heading('Periode penilaian', 'Atur jadwal bulanan. Periode dibuka setelah seluruh staf eligible memiliki pola KPI 100%.', button('period-new', '+ Buat periode', '', 'btn btn-primary'), step('periods'))}${ctx.message ? note(ctx.message, 'success') : ''}<section class="card skp-table-card fx-period-list"><div class="skp-card-head"><div><h2>Daftar periode</h2><p>${ctx.data.periods.length} periode · terbaru di atas</p></div></div>${table('periods', ['Periode', 'Jadwal (WIB)', 'Kesiapan pola KPI', 'Status', 'Tindakan'], 'skp-periods')}</section>`;
}
function readinessCell(p) {
    if (p.status === 'closed') return '—';
    if (p.businessId && !p.managed)
        return `${tag('KPI versi lama', 'info')}<small>Konversi menjadi pola di langkah 2</small>`;
    const r = p.readiness?.staff;
    if (!r) return tag('Belum disimpan', 'warning');
    const ok = r.eligible > 0 && r.complete === r.eligible;
    return `${tag(`${r.complete}/${r.eligible} staf lengkap`, ok ? 'success' : 'warning')}${ok ? '' : `<small>${r.eligible - r.complete} staf belum punya pola 100%</small>`}`;
}
export function periodEdit(ctx) {
    const old = ctx.data.periods.find((p) => p.id === ctx.periodEditing);
    return `${heading(old ? 'Detail periode' : 'Buat periode', 'Atur jadwal, status dan kategori nilai dalam satu form.', button('nav', 'Kembali ke daftar', 'periods'), step('periods'))}${periodEditor(ctx.period, old)}`;
}

/* 2 · Pola KPI */
export function patterns(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Pola KPI', '', '', step('patterns')) + noPeriod(ctx);
    const readOnly = closed(ctx);
    return `${heading('Pola KPI', 'Satu pola berisi daftar KPI dan bobot (wajib tepat 100%). Satu orang memakai satu pola per periode.', readOnly ? '' : button('pattern-new', '+ Buat pola', '', 'btn btn-primary'), step('patterns', period.id))}${readinessBar(ctx)}${ctx.message ? note(ctx.message, 'success') : ''}${readOnly ? note('Periode ditutup. Pola dan penugasan hanya dapat dibaca.') : `${legacyPanel(ctx)}${copyPanel(ctx)}`}<section class="card skp-table-card fx-kpi-list"><div class="skp-card-head"><div><h2>Daftar pola ${esc(monthLabel(period.id))}</h2><p>${ctx.index.patterns.size} pola · hanya pola dengan total bobot 100% yang dapat diterapkan</p></div></div>${table('patterns', ['Pola & jalur', 'KPI', 'Total bobot', 'Diterapkan ke', 'Tindakan'], 'skp-patterns')}</section>`;
}
function legacyPanel(ctx) {
    const templates = ctx.data.legacyTemplates || [];
    if (!templates.length) return '';
    return `<section class="card skp-panel"><h2>KPI versi lama ditemukan</h2><p class="gp-help">Periode ini masih memakai KPI unit/divisi lama dengan nilai manual 10–100. Konversi menjadi pola agar dapat dikelola di sini; setiap KPI menjadi formula “Nilai capaian (10–100)” dengan target 100, dan pola langsung diterapkan ke orang di area tersebut bila total bobotnya 100%.</p><ul class="skp-legacy">${templates.map((t) => `<li><strong>${esc(t.name)}</strong><span>${esc(ROLES[t.targetRole])} · ${esc(t.areaName)} · ${t.items.length} KPI · ${num(totalWeight(t.items), 4)}% · ${t.personIds.length} orang</span></li>`).join('')}</ul>${button('legacy-convert', `Konversi ${templates.length} KPI lama menjadi pola`, '', 'btn btn-primary')}</section>`;
}
function copyPanel(ctx) {
    const counts = new Map();
    for (const p of ctx.data.patterns)
        if (p.periodId !== ctx.index.month)
            counts.set(p.periodId, (counts.get(p.periodId) || 0) + 1);
    const sources = ctx.data.periods
        .filter((p) => counts.has(p.id))
        .toSorted((a, b) => b.id.localeCompare(a.id));
    if (!sources.length) return '';
    const preferred =
        sources.find((p) => p.id < ctx.index.month)?.id || sources[0].id;
    return `<details class="card skp-panel" ${ctx.index.patterns.size ? '' : 'open'}><summary>Salin pola dari periode lain</summary><div class="skp-copy"><label><span class="label">Periode sumber</span><select class="field" data-skp-copy-source>${sources.map((p) => `<option value="${p.id}" ${p.id === preferred ? 'selected' : ''}>${esc(p.name)} · ${counts.get(p.id)} pola</option>`).join('')}</select></label>${button('copy-patterns', `Salin ke ${monthLabel(ctx.index.month)}`, '', 'btn btn-primary')}</div><p class="gp-help">Pola dan penugasannya disalin untuk orang yang masih eligible bulan ini. Pola dengan nama yang sudah ada dilewati; orang yang sudah memiliki pola tidak diubah.</p></details>`;
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
    return `${heading(p.id ? `Pola: ${saved?.name || p.name}` : 'Buat pola KPI', `${monthLabel(p.periodId)} · ${count ? `diterapkan ke ${count} orang` : 'belum diterapkan'}`, button('nav', 'Kembali ke daftar pola', 'patterns'), step('patterns'))}${count && !readOnly ? note(`Pola ini dipakai ${count} orang. Perubahan berlaku untuk mereka semua, kecuali yang sudah dinilai (snapshot tetap).`, 'warning') : ''}<section class="card skp-form-card skp-pattern-card"><form id="skp-pattern-form" novalidate autocomplete="off"><section class="fx-form-section">${sectionHeading(1, 'Identitas pola', 'Nama pola dan jalur penilaian penerimanya.')}<div class="gp-form-grid">${field('patternName', 'Nama pola', p.name, { required: true, maxlength: 120, disabled: readOnly, help: 'Contoh: Bidan, Perawat Rawat Inap, Staf IT.' })}${field('targetRole', 'Jalur penerima', p.targetRole, { options: Object.entries(ROLES).map(([k, v]) => [k, k === 'staff' ? 'Staf (dinilai Kepala Unit, ACC Kepala Divisi)' : 'Kepala Unit (dinilai Kepala Divisi)']), placeholder: false, disabled: readOnly || count > 0, help: count ? 'Lepas penugasan pola terlebih dahulu untuk mengganti jalur.' : '' })}</div></section><section class="fx-form-section"><div class="skp-items-heading">${sectionHeading(2, 'Daftar KPI dalam pola', 'Atur bobot langsung di tabel; total wajib tepat 100%.')}${readOnly ? '' : button('kpi-new', '+ Tambah KPI', '', 'btn')}</div><div class="table-wrap"><table class="data-table gp-table skp-items"><thead><tr><th>No</th><th>KPI & formula</th><th>Pilar</th><th>Target</th><th>Bobot (%)</th><th>Tindakan</th></tr></thead><tbody>${items || `<tr><td colspan="6" class="empty">Belum ada KPI. Pilih + Tambah KPI.</td></tr>`}</tbody></table></div><p class="gp-field-error" data-gp-error="items" hidden></p><p class="gp-note error skp-form-error" data-form-error role="alert" hidden></p></section></form></section>${ctx.kpi ? editor(ctx.kpi, ctx.testValues, othersWeight(ctx), ctx.kpiIndex >= 0) : ''}<div class="skp-savebar"><div data-skp-pattern-total>${patternTotal(p.items)}</div>${readOnly ? '' : `<div class="gp-actions">${button('nav', 'Batal', 'patterns')}<button type="submit" class="btn btn-primary" form="skp-pattern-form">Simpan pola</button></div>`}</div>`;
}
export function othersWeight(ctx) {
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

/* 3 · Terapkan ke staf */
export const applyRole = (ctx) =>
    ctx.index.patterns.get(ctx.applyPattern)?.targetRole || 'staff';
export function applyRows(ctx) {
    const role = applyRole(ctx);
    return filterPeople(ctx.index, role === 'staff' ? ctx.filter : { ...ctx.filter, position: '' }, role);
}
export function apply(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Terapkan pola', '', '', step('apply')) + noPeriod(ctx);
    const head = heading('Terapkan pola ke staf', 'Pilih pola, saring staf (Divisi → Unit → Jabatan), centang, lalu terapkan.', '', step('apply', period.id));
    if (closed(ctx)) return head + note('Periode ditutup. Penugasan pola hanya dapat dibaca di Cek bobot.');
    if (!ctx.index.patterns.size)
        return `${head}${empty('Belum ada pola KPI pada periode ini', 'Buat pola atau salin dari periode sebelumnya terlebih dahulu.', nav(ctx, 'patterns', 'Ke langkah 2 · Pola KPI', '', 'btn btn-primary'))}`;
    const groups = Object.entries(ROLES)
        .map(([role, label]) => {
            const list = [...ctx.index.patterns.values()]
                .filter((p) => p.targetRole === role)
                .toSorted((a, b) => a.name.localeCompare(b.name, 'id'));
            return list.length
                ? `<optgroup label="${esc(label)}">${list.map((p) => `<option value="${esc(p.id)}" ${p.id === ctx.applyPattern ? 'selected' : ''} ${p.complete ? '' : 'disabled'}>${esc(p.name)} · ${p.items.length} KPI · ${p.complete ? `${p.count} orang` : `bobot ${num(p.total, 4)}%, belum 100%`}</option>`).join('')}</optgroup>`
                : '';
        })
        .join('');
    const chosen = ctx.index.patterns.get(ctx.applyPattern);
    return `${head}${readinessBar(ctx)}${ctx.message ? note(ctx.message, 'success') : ''}<section class="card skp-panel"><div class="skp-apply-pick"><label><span class="label">Pola yang akan diterapkan</span><select class="field" data-skp-apply-pattern><option value="">Pilih pola</option>${groups}</select></label>${chosen ? `<div class="skp-chosen">${tag(ROLES[chosen.targetRole], 'info')}${chosen.items.map((k) => `<span>${esc(k.name)} · ${num(k.weight, 4)}%</span>`).join('')}</div>` : '<p class="gp-help">Pola yang belum 100% tidak dapat dipilih. Daftar di bawah menampilkan staf; pola Kepala Unit menampilkan Kepala Unit.</p>'}</div></section><section class="card skp-table-card fx-kpi-list"><div class="table-tools">${filters(ctx, 'skp-apply-filter', applyRole(ctx) === 'staff', false)}<input class="field gp-search" type="search" data-skp-search aria-label="Cari nama atau NIP" placeholder="Cari nama atau NIP" value="${esc(ctx.filter.search)}"></div><div data-skp-summary="apply">${applySummary(ctx)}</div>${table('apply', ['<input type="checkbox" data-skp-select-all aria-label="Pilih semua hasil filter">', applyRole(ctx) === 'staff' ? 'Staf' : 'Kepala Unit', 'Unit', 'Jabatan', 'Pola saat ini'], 'skp-apply')}</section>`;
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
    return `<div class="skp-selection"><p><b>${rows.length}</b> orang sesuai filter · <b>${selected.length}</b> dipilih${chosen && replaced ? ` · <b>${replaced}</b> akan diganti polanya` : ''}</p><div class="gp-actions">${button('select-filtered', `Pilih semua hasil filter (${rows.length})`, '', 'btn btn-small', !rows.length)}${button('release', `Lepas pola (${holders})`, '', 'btn btn-small', !holders)}${button('apply', chosen ? `Terapkan ke ${selected.length} orang` : 'Pilih pola terlebih dahulu', '', 'btn btn-primary', !chosen || !selected.length)}</div></div>`;
}

/* 4 · Cek bobot */
const matrixRows = (ctx) => filterPeople(ctx.index, ctx.filter);
export function matrix(ctx) {
    const period = ctx.index.period;
    if (!period) return heading('Cek bobot', '', '', step('matrix')) + noPeriod(ctx);
    const { staff, unit_head: heads } = ctx.index.readiness;
    const used = [...ctx.index.patterns.values()].filter((p) => p.count).length;
    return `${heading('Cek bobot per orang', 'Seluruh staf dan Kepala Unit eligible, termasuk yang belum memiliki pola (0%).', '', step('matrix', period.id))}<div class="gp-summary"><div><span>Staf lengkap 100%</span><strong>${staff.complete}/${staff.eligible}</strong></div><div><span>Staf belum punya pola</span><strong>${staff.eligible - staff.complete}</strong></div><div><span>Kepala Unit lengkap</span><strong>${heads.complete}/${heads.eligible}</strong></div><div><span>Pola dipakai</span><strong>${used}/${ctx.index.patterns.size}</strong></div></div><section class="card skp-table-card fx-kpi-list"><div class="table-tools">${filters(ctx, 'skp-matrix-filter', true, true)}<input class="field gp-search" type="search" data-skp-search aria-label="Cari nama atau NIP" placeholder="Cari nama atau NIP" value="${esc(ctx.filter.search)}"></div><div data-skp-summary="matrix">${matrixSummary(ctx)}</div>${table('matrix', ['Nama', 'Unit', 'Jabatan', 'Pola', 'Total bobot', 'Status'], 'skp-matrix')}</section>`;
}
function matrixSummary(ctx) {
    const rows = matrixRows(ctx),
        complete = rows.filter(
            (p) => ctx.index.patterns.get(ctx.index.assigned.get(p.id))?.complete,
        ).length;
    return `<p class="skp-result-line">Hasil filter: <b>${rows.length}</b> orang · <b>${complete}</b> lengkap · <b>${rows.length - complete}</b> belum ada pola</p>`;
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
function filters(ctx, id, position, role) {
    const f = ctx.filter,
        select = (key, label, options) =>
            `<label>${label}<select class="field" data-skp-filter="${key}">${options}</select></label>`,
        option = (value, label, current) =>
            `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`;
    return filterMarkup(
        id,
        `${select('division', 'Divisi', `<option value="">Semua divisi</option>${[...ctx.index.divisions.values()].map((d) => option(d.id, `${d.name} · KD: ${d.head || 'belum ada'}`, f.division)).join('')}`)}${select('unit', 'Unit', unitOptions(ctx))}${position ? select('position', 'Jabatan', `<option value="">Semua jabatan</option>${ctx.data.positions.map((p) => option(p.id, p.name, f.position)).join('')}`) : ''}${role ? select('role', 'Jalur', `<option value="">Staf & Kepala Unit</option>${Object.entries(ROLES).map(([k, v]) => option(k, v, f.role)).join('')}`) : ''}${select('status', 'Status pola', `${option('', 'Semua status', f.status)}${option('assigned', 'Sudah punya pola 100%', f.status)}${option('none', 'Belum punya pola', f.status)}`)}`,
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
    return `${heading('Monitoring KPI', 'Progres dan hasil penilaian. Super HC hanya memantau.', '', step('monitor', ctx.index.month))}<div data-skp-summary="monitor">${monitorSummary(ctx)}</div><section class="card skp-table-card"><div class="table-tools">${filter}<input class="field gp-search" type="search" aria-label="Cari monitoring KPI" data-skp-monitor-search placeholder="Cari nama atau NIP" value="${esc(f.search)}"></div>${table('monitor', ['Nama / jalur', 'Unit', 'Status', 'Total hasil', 'Tindakan'], 'skp-monitor')}</section>`;
}
function monitorSummary(ctx) {
    const rows = monitorRows(ctx);
    return `<div class="skp-chartless">${Object.entries(STATUSES)
        .map(
            ([id, label]) =>
                `<div><span>${label}</span><strong>${rows.filter((a) => a.status === id).length}</strong></div>`,
        )
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
                r = calculate(k, input);
            const values =
                k.method === 'formula'
                    ? (k.variables || [])
                          .map((v) => `${esc(v.key)} · ${esc(v.label)}: <b>${esc(v.source === 'fixed' ? v.value : (input[`variable_${v.key}`] ?? input.variables?.[v.key] ?? '—'))}</b>`)
                          .join('<br>')
                    : `Nilai: <b>${esc(input.value ?? '—')}</b>`;
            return `<tr><td data-label="KPI"><strong>${i + 1}. ${esc(k.name)}</strong><small>${esc(k.method === 'formula' ? humanFormula(k) : 'Nilai manual 10–100')}</small></td><td data-label="Bobot">${percent(k.weight)}</td><td data-label="Data">${values}</td><td data-label="Hasil">${r.measurement == null ? '—' : `${num(r.measurement, 2)} ${esc(k.unit || '')}`}</td><td data-label="Nilai KPI">${num(r.score, 2)}</td><td data-label="Berbobot">${num(r.weighted, 2)}</td></tr>`;
        })
        .join('');
    return `${heading(p?.name || 'Penilaian', `${monthLabel(a.periodId)} · ${unit?.name || '—'} · ${ROLES[a.subjectType]}${a.snapshot[0]?.patternName ? ` · Pola ${a.snapshot[0].patternName}` : ''}`, statusTag(a.status), 'Monitoring · Hasil penilaian')}${a.status === 'final' ? note(`Penilaian Selesai${a.completedBy ? ` oleh ${a.completedBy}` : ''}. Nilai dan snapshot hanya dapat dibaca.`, 'success') : note('Super HC hanya melihat hasil. Tidak ada pengisian, ACC, atau finalisasi.')}<section class="card skp-table-card"><div class="table-wrap"><table class="data-table gp-table skp-result-table"><thead><tr><th>KPI</th><th>Bobot</th><th>Data penilai</th><th>Hasil pengukuran</th><th>Nilai KPI</th><th>Nilai berbobot</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="empty">KPI belum ditetapkan.</td></tr>`}</tbody></table></div></section><div class="gp-assessment-total"><span>Total nilai berbobot</span><strong>${num(a.finalTotal ?? result.total, 2)}</strong><span>${a.finalTotal == null ? 'Hasil lengkap setelah seluruh KPI valid' : 'Hasil Selesai'}</span></div><div>${nav(ctx, 'monitor', '← Kembali ke Monitoring')}</div>`;
}

/** Visual companion of a total-weight label; 100% is the only optimum. */
const weightMeter = (total) =>
    `<meter class="skp-weight-meter" min="0" max="100" low="99.9999" high="100" optimum="100" value="${Math.min(total, 100)}" aria-hidden="true"></meter>`;

/* Rows rendered through `paginate` (records + renderRow). */
export const TABLES = {
    periods: {
        empty: 'Belum ada periode.',
        records: (ctx) => ctx.data.periods.toSorted((a, b) => b.id.localeCompare(a.id)),
        row: (ctx, p) =>
            `<tr><td data-label="Periode"><strong>${esc(p.name)}</strong><small>${esc(monthLabel(p.id))}</small></td><td data-label="Jadwal (WIB)">${date(p.opens)} – ${date(p.closes)}<small>Batas KU ${date(p.submission)} · ACC KD ${date(p.approval)}</small></td><td data-label="Kesiapan pola KPI">${readinessCell(p)}</td><td data-label="Status">${tag(PERIOD_STATUSES[p.status], p.status === 'open' ? 'success' : p.status === 'planned' ? 'info' : '')}</td><td data-label="Tindakan"><div class="skp-row-actions">${button('period', p.status === 'closed' ? 'Lihat' : 'Lihat / ubah', p.id, 'link')}${p.status === 'closed' ? '' : `<a class="link" data-skp-nav="patterns" href="${esc(ctx.url('patterns', '', p.id))}" data-cycle="${esc(p.id)}">Atur pola</a>`}${p.status === 'planned' ? button('period-open', 'Buka periode', p.id, 'link', !!openBlock(p)) : ''}</div></td></tr>`,
    },
    patterns: {
        empty: 'Belum ada pola. Buat pola baru atau salin dari periode lain.',
        records: (ctx) =>
            [...ctx.index.patterns.values()].toSorted(
                (a, b) => a.targetRole.localeCompare(b.targetRole) || a.name.localeCompare(b.name, 'id'),
            ),
        row: (ctx, p) => {
            const readOnly = closed(ctx),
                names = p.items.map((k) => k.name);
            return `<tr><td data-label="Pola & jalur"><strong>${esc(p.name)}</strong><small>${esc(ROLES[p.targetRole])}</small></td><td data-label="KPI">${p.items.length} KPI<small title="${esc(names.join(', '))}">${esc(names.slice(0, 3).join(', '))}${names.length > 3 ? ', …' : ''}</small></td><td data-label="Total bobot">${totalTag(p)}${weightMeter(p.total)}</td><td data-label="Diterapkan ke">${p.count ? `${p.count} orang` : '<span class="text-muted">Belum diterapkan</span>'}</td><td data-label="Tindakan"><div class="skp-row-actions">${button('pattern-edit', readOnly ? 'Lihat' : 'Ubah', p.id, 'link')}${readOnly ? '' : `${p.complete ? button('pattern-apply', 'Terapkan', p.id, 'link') : ''}${button('pattern-duplicate', 'Duplikat', p.id, 'link')}${button('pattern-delete', 'Hapus', p.id, 'link skp-link-danger')}`}</div></td></tr>`;
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
    matrix: {
        empty: 'Tidak ada orang pada filter ini.',
        records: matrixRows,
        row: (ctx, p) => {
            const pattern = ctx.index.patterns.get(ctx.index.assigned.get(p.id)),
                ok = pattern?.complete;
            return `<tr><td data-label="Nama">${personCell(p)}</td><td data-label="Unit">${unitCell(ctx, p)}</td><td data-label="Jabatan">${esc(p.positionName)}</td><td data-label="Pola">${pattern ? nav(ctx, 'pattern', esc(pattern.name), pattern.id) : '<span class="text-muted">—</span>'}</td><td data-label="Total bobot"><span class="num">${percent(pattern ? pattern.total : 0)}</span>${weightMeter(pattern ? pattern.total : 0)}</td><td data-label="Status">${ok ? tag('Lengkap', 'success') : tag(pattern ? 'Pola belum 100%' : 'Belum ada pola', 'warning')}</td></tr>`;
        },
    },
    monitor: {
        empty: 'Belum ada penilaian pada filter ini.',
        records: monitorRows,
        row: (ctx, a) =>
            `<tr><td data-label="Nama / jalur"><strong>${esc(ctx.index.people.get(a.personId)?.name || a.personId)}</strong><small>${a.subjectType === 'unit_head' ? 'Penilaian Kepala Unit' : 'Penilaian Staf'}</small></td><td data-label="Unit">${esc(ctx.index.units.get(a.unitId)?.name || '—')}</td><td data-label="Status">${statusTag(a.status)}</td><td data-label="Total hasil" class="num">${num(a.finalTotal ?? totals(a).total, 2)}</td><td data-label="Tindakan">${nav(ctx, 'assessment', 'Lihat hasil', a.id)}</td></tr>`,
    },
};
export const SUMMARIES = {
    apply: applySummary,
    matrix: matrixSummary,
    monitor: monitorSummary,
};
