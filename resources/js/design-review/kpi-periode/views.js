import {
    METHODS,
    TARGETS,
    STATUSES,
    calculate,
    totalWeight,
    totals,
    permitted,
    monthLabel,
} from './model.js';
import {
    esc,
    field,
    check,
    note,
    tag,
    empty,
    num,
    date,
    definition,
} from '../../abprove/goals/markup.js';
import { table, tr, heading } from '../../abprove/goals/views.js';
import { editor, monthlyWeights } from './formula-editor.js';
import { editableKpi, humanFormula } from './formula-config.js';
import { periodEditor } from './period-editor.js';
import { filterMarkup } from '../../abprove/table-tools';
export const button = (
    name,
    label,
    id = '',
    primary = false,
    disabled = false,
) =>
    `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" data-skp-action="${name}" data-id="${esc(id)}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
export const nav = (ctx, screen, label, id = '') =>
    `<a href="${esc(ctx.url(screen, id))}" data-skp-nav="${screen}" data-id="${esc(id)}" class="link">${esc(label)}</a>`;
export function status(row) {
    return tag(
        STATUSES[row.status],
        row.status === 'final'
            ? 'success'
            : row.status === 'returned'
              ? 'warning'
              : 'info',
    );
}
export const targetText = (k) =>
    k.method === 'manual'
        ? '—'
        : `${num(k.target, 2)}${k.method === 'ratio' ? '%' : ` ${esc(k.unit)}`}`;
export function periodPicker(ctx) {
    return `<div class="fx-period-picker"><label for="fx-page-period">Periode bulan</label><select id="fx-page-period" class="field" data-skp-period-choice>${ctx.data.periods
        .toSorted((a, b) => b.id.localeCompare(a.id))
        .map(
            (p) =>
                `<option value="${p.id}" ${p.id === ctx.periodId ? 'selected' : ''}>${esc(p.name)} · ${{ open: 'Aktif', planned: 'Direncanakan', closed: 'Ditutup' }[p.status]}</option>`,
        )
        .join(
            '',
        )}</select><span>${esc(monthLabel(ctx.periodId))} · nilai setiap bulan terpisah</span></div>`;
}
export function master(ctx) {
    const filters = filterMarkup(
        'skp-master-filter',
        `<label>Unit<select class="field" data-skp-filter="unit"><option value="">Semua unit</option>${ctx.data.units.map((u) => `<option value="${esc(u.id)}" ${ctx.filter.unit === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label><label>Penerima KPI<select class="field" data-skp-filter="role"><option value="">Semua penerima</option>${Object.entries(
            TARGETS,
        )
            .map(
                ([key, label]) =>
                    `<option value="${key}" ${ctx.filter.role === key ? 'selected' : ''}>${esc(label)}</option>`,
            )
            .join('')}</select></label>`,
        'Filter KPI',
    );
    return `${heading('Master KPI / Goals', 'Kelola target, formula pengukuran dan penerima pada periode terpilih.', button('new', '+ Buat KPI / Goal', '', true))}${ctx.savedMessage ? note(ctx.savedMessage, 'success') : ''}<section class="card fx-kpi-list"><div class="fx-card-heading"><h2>Daftar KPI / Goals</h2></div><div class="table-tools">${filters}<input class="field gp-search" type="search" data-skp-search aria-label="Cari KPI atau Goal" placeholder="Cari nama KPI / Goal" value="${esc(ctx.filter.search)}"></div><div data-skp-master-results>${masterRows(ctx)}</div></section><div data-skp-weight-results>${monthlyWeights(ctx)}</div>`;
}
export function assigneeSummary(ctx, k) {
    const names = ctx.data.people
        .filter(
            (p) =>
                p.unitId === k.unitId &&
                p.type === k.targetRole &&
                (k.assignmentMode !== 'selected' ||
                    k.assigneeIds?.includes(p.id)),
        )
        .map((p) => p.name);
    if (!names.length)
        return '<span class="text-muted">Belum ditugaskan</span>';
    const extra = names.length - 1;
    return `<span class="skp-assignee-summary" title="${esc(names.join(', '))}" aria-label="Penerima: ${esc(names.join(', '))}"><span class="skp-assignee-name">${esc(names[0])}</span>${extra > 0 ? `<span class="skp-assignee-count">+${extra}</span>` : ''}</span>${!k.active ? '<small>Nonaktif</small>' : ''}`;
}
export function masterRows(
    ctx,
    rows,
    heads = [
        'Pilar',
        'KPI & formula',
        'Target',
        'Penilaian',
        'Bobot',
        'Ditugaskan ke',
        'Tindakan',
    ],
) {
    rows ||= ctx.data.kpis.filter(
        (k) =>
            k.periodId === ctx.periodId &&
            (!ctx.filter.unit || k.unitId === ctx.filter.unit) &&
            (!ctx.filter.role || k.targetRole === ctx.filter.role) &&
            (!ctx.filter.search ||
                k.name.toLowerCase().includes(ctx.filter.search.toLowerCase())),
    );
    return table(
        ctx,
        heads,
        rows,
        (k) =>
            tr(
                [
                    esc(k.pillar),
                    `<strong>${esc(k.name)}</strong>${k.formula || k.method !== 'manual' ? `<small class="fx-formula-summary" title="${esc(humanFormula(editableKpi(k)))}">${esc(humanFormula(editableKpi(k)))}</small>` : ''}${k.parentId ? `<small>Turunan dari: ${esc(ctx.data.kpis.find((parent) => parent.id === k.parentId)?.name || 'KPI sebelumnya')}</small>` : ''}`,
                    targetText(k),
                    tag(
                        k.method === 'manual' ? 'Dinilai atasan' : 'Otomatis',
                        k.method === 'manual' ? 'info' : 'success',
                    ),
                    `${num(k.weight, 4)}%`,
                    assigneeSummary(ctx, k),
                    `<div class="skp-row-actions"><button class="link" type="button" data-skp-action="edit" data-id="${k.id}">Edit</button><button class="link" type="button" data-skp-action="delete" data-id="${k.id}">Hapus</button></div>`,
                ],
                heads,
            ),
        'simple-master',
        5,
        'skp-master',
    );
}
export function methodFields(k) {
    if (k.method === 'manual')
        return `${field('rubric', 'Panduan / rubrik penilaian', k.rubric, { textarea: true, required: true })}<p class="gp-readout">Skala existing: Nilai Manual 10–100, bilangan bulat.</p>`;
    return `<div class="gp-form-grid">${field('actualLabel', 'Nama input realisasi', k.actualLabel, { required: true, help: k.method === 'ratio' ? 'Contoh: Tiket selesai sesuai SLA' : 'Contoh: Jumlah pelatihan selesai' })}${k.method === 'ratio' ? field('comparisonLabel', 'Nama input pembanding', k.comparisonLabel, { required: true, help: 'Contoh: Total tiket yang dinilai' }) : field('unit', 'Satuan', k.unit, { required: true, help: 'Contoh: kegiatan, dokter, tiket' })}${
        k.method === 'ratio'
            ? field(
                  'denominatorSource',
                  'Sumber pembanding',
                  k.denominatorSource,
                  {
                      options: [
                          ['manual', 'Diisi penilai'],
                          ['fixed', 'Tetap dari konfigurasi KPI/periode'],
                      ],
                      placeholder: false,
                  },
              )
            : ''
    }${k.method === 'ratio' && k.denominatorSource === 'fixed' ? field('fixedDenominator', 'Angka pembanding tetap', k.fixedDenominator, { type: 'number', min: '0.0001', step: 'any', required: true }) : ''}${field('target', k.method === 'ratio' ? 'Target (%)' : 'Target jumlah', k.target, { type: 'number', min: 0, step: 'any', required: true })}${field(
        'direction',
        'Arah capaian',
        k.direction,
        {
            options: [
                ['higher', 'Semakin tinggi semakin baik'],
                ['lower', 'Semakin rendah semakin baik'],
            ],
            placeholder: false,
        },
    )}</div><div><span class="label">Preview formula · hanya baca</span><p class="gp-readout">${k.method === 'ratio' ? 'Realisasi ÷ Pembanding × 100%' : 'Realisasi dibandingkan target jumlah'}</p></div><details class="skp-policy"><summary>Konfigurasi konversi & skala skor · simulasi usulan</summary><div class="gp-form-grid">${field(
        'scoreRule',
        'Aturan skor',
        k.policy.rule,
        {
            options:
                k.direction === 'lower'
                    ? [
                          ['pending', 'Belum ditetapkan'],
                          [
                              'reverse-positive',
                              'Usulan: target ÷ hasil × skor maksimum (non-nol)',
                          ],
                      ]
                    : [
                          ['pending', 'Belum ditetapkan'],
                          [
                              'target-normalized',
                              'Usulan: hasil ÷ target × skor maksimum',
                          ],
                      ],
            placeholder: false,
        },
    )}${field('zeroRule', 'Aturan khusus target nol', k.policy.zeroRule, {
        options: [
            ['pending', 'Belum ditetapkan'],
            ['zero-pass', 'Usulan: hasil 0 lulus, selain itu gagal'],
        ],
        placeholder: false,
    })}${field('scoreMin', 'Skor otomatis minimum', k.policy.min, { type: 'number', min: 0, max: 99, step: 'any' })}${field('scoreMax', 'Skor otomatis maksimum', k.policy.max, { type: 'number', min: 1, max: 100, step: 'any' })}</div>${note('Konversi otomatis hanya untuk simulasi. Ketentuan resmi rumah sakit belum diganti; target nol atau arah menurun memerlukan pilihan aturan tersendiri.')}</details><p class="gp-field-error" data-gp-error="policy" hidden></p>`;
}
export function edit(ctx) {
    return `${heading(ctx.working.id ? 'Edit KPI / Goal' : 'Buat KPI / Goal', 'Lengkapi seluruh bagian dalam satu form.', button('cancel', 'Kembali ke daftar'))}${editor(ctx)}`;
}
export function controls(k, input = {}, editable = true, preview = false) {
    const control = (key, label, value, readonly = false) => {
        const id = `skp-${preview ? 'preview-' : ''}${k.id || 'new'}-${key}`;
        return `<div class="gp-field"><label class="label" for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" class="field" type="number" ${k.method === 'formula' ? '' : `min="${k.method === 'manual' ? 10 : key === 'comparison' ? 0.0001 : 0}"`} ${k.method === 'manual' ? 'max="100" step="1"' : 'step="any"'} value="${esc(value ?? '')}" data-skp-input="${key}" data-kpi="${esc(k.id)}" ${readonly || !editable ? 'readonly' : ''} inputmode="decimal"></div>`;
    };
    if (k.method === 'formula')
        return `<div class="skp-inputs">${(k.variables || []).map((v) => control(`variable_${v.key}`, v.label, v.source === 'fixed' ? v.value : (input[`variable_${v.key}`] ?? input.variables?.[v.key]), v.source === 'fixed')).join('')}</div>`;
    return k.method === 'manual'
        ? `${note(k.rubric || 'Ikuti rubrik yang ditetapkan.')}<div class="skp-inputs">${control('value', 'Nilai (10–100)', input.value)}</div>`
        : `<div class="skp-inputs">${control('actual', k.actualLabel || 'Realisasi', input.actual)}${k.method === 'ratio' ? control('comparison', k.comparisonLabel || 'Pembanding', k.denominatorSource === 'fixed' ? k.fixedDenominator : input.comparison, k.denominatorSource === 'fixed') : ''}</div>`;
}
export function results(k, input = {}) {
    const r = calculate(k, input);
    return `${k.method !== 'manual' ? `<div class="skp-result"><span>Hasil Pengukuran</span><strong data-result="measurement">${r.measurement == null ? '—' : `${num(r.measurement, 2)} ${k.method === 'ratio' ? '%' : esc(k.unit)}`}</strong></div>` : ''}<div class="skp-result"><span>Nilai KPI${k.method === 'manual' ? '' : ' · otomatis'}</span><strong data-result="score">${num(r.score, 2)}</strong></div><div class="skp-result"><span>Nilai Berbobot</span><strong data-result="weighted">${r.weighted == null ? '—' : `${num(r.weighted, 2)} poin`}</strong></div>${r.message ? `<p class="skp-result-note" data-skp-calculation-message>${esc(r.message)}</p>` : ''}`;
}
export function card(k, input = {}, editable = true, preview = false) {
    return `<section class="skp-kpi-card" data-skp-card="${esc(k.id)}"><div class="skp-kpi-heading"><div><h2>${esc(k.name || 'Nama KPI')}</h2>${k.parentName ? `<p>Turunan dari KPI Kepala Unit: ${esc(k.parentName)}</p>` : ''}<p>${METHODS[k.method]} · Target ${targetText(k)} · Bobot ${num(k.weight, 4)}%</p></div></div><div class="skp-kpi-body"><div>${controls(k, input, editable, preview)}</div><div class="skp-results" aria-live="polite">${results(k, input)}</div></div>${k.method === 'manual' ? '' : `<details><summary>Cara menghitung</summary><p>${k.method === 'formula' ? `Hasil = ${esc(humanFormula(k))}.` : k.method === 'ratio' ? 'Hasil = realisasi ÷ pembanding × 100%.' : 'Hasil = jumlah realisasi.'} Skor mengikuti konfigurasi konversi; nilai berbobot = skor × bobot / 100. Perhitungan otomatis pada prototype adalah usulan, bukan rumus produksi yang disahkan.</p></details>`}<div class="gp-field gp-space"><label class="label" for="evidence-${preview ? 'preview-' : ''}${esc(k.id)}">Catatan / bukti (opsional)</label><textarea id="evidence-${preview ? 'preview-' : ''}${esc(k.id)}" class="field" rows="1" data-skp-input="evidence" data-kpi="${esc(k.id)}" ${!editable ? 'readonly' : ''}>${esc(input.evidence || '')}</textarea></div></section>`;
}
export function detail(ctx, id) {
    const k = ctx.data.kpis.find((k) => k.id === id);
    if (!k)
        return empty('KPI tidak ditemukan', 'Kembali ke daftar Master KPI.');
    return `${heading(k.name, `${ctx.data.units.find((u) => u.id === k.unitId)?.name} · ${TARGETS[k.targetRole]} · ${monthLabel(k.periodId)}`, `${button('edit', 'Edit', id)}${button('delete', 'Hapus', id)}`)}<section class="card gp-detail-card">${definition(
        [
            ['Metode', METHODS[k.method]],
            ['Pilar', esc(k.pillar)],
            ['Target', targetText(k)],
            ['Bobot', `${num(k.weight, 4)}%`],
            ['Status', k.active ? 'Aktif' : 'Nonaktif'],
            [
                'Penanggung jawab penilaian',
                k.targetRole === 'division_head'
                    ? 'Belum ditentukan'
                    : k.targetRole === 'unit_head'
                      ? 'Kepala Divisi langsung menilai'
                      : 'Kepala Unit menilai, Kepala Divisi ACC',
            ],
        ],
    )}<div class="gp-space">${button('preview', 'Preview Tampilan Penilai', id)}</div>${note('Perubahan Master KPI tidak menulis ulang snapshot penilaian yang telah disimpan.')}</section>`;
}
export function roster(ctx, kind) {
    const role = ctx.role,
        { data } = ctx;
    let rows = data.assessments.filter(
        (a) =>
            a.periodId === ctx.periodId &&
            permitted(a, role) &&
            (kind === 'heads'
                ? a.subjectType === 'unit_head'
                : a.subjectType === 'staff'),
    );
    rows = rows
        .filter((a) => !ctx.statusFilter || a.status === ctx.statusFilter)
        .toSorted(
            (a, b) =>
                [
                    'returned',
                    'not_started',
                    'draft',
                    'submitted',
                    'final',
                ].indexOf(a.status) -
                [
                    'returned',
                    'not_started',
                    'draft',
                    'submitted',
                    'final',
                ].indexOf(b.status),
        );
    const heads = [
        kind === 'heads' ? 'Kepala Unit / Ruangan' : 'Staf',
        'Unit',
        'Status',
        'Total',
        'Tindakan',
    ];
    return `${heading(kind === 'heads' ? 'Penilaian Kepala Unit' : role.role === 'ku' ? 'Penilaian Staf' : 'Persetujuan Penilaian Staf', kind === 'heads' ? 'Kepala Divisi menilai langsung dan menyelesaikan penilaian.' : 'Kepala Unit mengisi; Kepala Divisi ACC atau mengembalikan untuk revisi.')}<div class="skp-status-tabs">${[
        ['', 'Semua'],
        ...Object.entries(STATUSES),
    ]
        .filter(
            ([id]) =>
                kind !== 'heads' || !['submitted', 'returned'].includes(id),
        )
        .map(
            ([id, label]) =>
                `<button type="button" data-skp-status="${id}" class="${ctx.statusFilter === id ? 'active' : ''}">${label}</button>`,
        )
        .join('')}</div>${table(
        ctx,
        heads,
        rows,
        (a) => {
            const person = data.people.find((p) => p.id === a.personId);
            return tr(
                [
                    `${esc(person.name)}<small>${esc(person.nip)}</small>`,
                    esc(data.units.find((u) => u.id === a.unitId)?.name),
                    status(a),
                    num(a.finalTotal ?? totals(a).total, 2),
                    nav(
                        ctx,
                        'assessment',
                        a.status === 'final'
                            ? 'Lihat hasil'
                            : kind === 'heads' || role.role === 'ku'
                              ? 'Isi / lihat'
                              : 'Tinjau',
                        a.id,
                    ),
                ],
                heads,
            );
        },
        'simple-roster',
        10,
    )}${kind === 'heads' ? note('Kepala Unit tidak mengisi self-assessment. Penilaian langsung berakhir saat Kepala Divisi memilih Selesaikan Penilaian.') : ''}`;
}
export function assessment(ctx, id) {
    const a = ctx.data.assessments.find((a) => a.id === id);
    if (!a || !permitted(a, ctx.role))
        return empty(
            'Akses tidak tersedia',
            'Penilaian berada di luar cakupan akun ini.',
        );
    const direct = a.subjectType === 'unit_head',
        editable =
            (direct ? ctx.role.role === 'kd' : ctx.role.role === 'ku') &&
            ['not_started', 'draft', 'returned'].includes(a.status) &&
            ctx.data.periods.find((p) => p.id === a.periodId)?.status ===
                'open',
        p = ctx.data.people.find((p) => p.id === a.personId),
        w = ctx.assessmentWorking || a;
    const index = Math.max(0, Math.min(ctx.kpiIndex, a.snapshot.length - 1)),
        k = a.snapshot[index];
    let actions = '';
    if (editable)
        actions = `${button('draft', 'Simpan Draft', a.id)}${button(direct ? 'complete' : 'send', direct ? 'Selesaikan Penilaian' : 'Kirim Penilaian', a.id, true)}`;
    if (!direct && ctx.role.role === 'kd' && a.status === 'submitted')
        actions = `${button('return', 'Kembalikan untuk Revisi', a.id)}${button('approve', 'Setujui', a.id, true)}`;
    const list = ctx.data.assessments.filter(
        (b) =>
            b.periodId === a.periodId &&
            b.subjectType === a.subjectType &&
            permitted(b, ctx.role),
    );
    const total = totals(a, w.inputs).total;
    return `${heading(direct ? 'Penilaian Kepala Unit' : 'Penilaian Staf', `${monthLabel(a.periodId)} · ${ctx.data.units.find((u) => u.id === a.unitId)?.name}`, status(a))}<div class="skp-assessment-header"><label class="label" for="skp-person">${direct ? 'Kepala Unit' : 'Staf'}</label><select class="field" id="skp-person" data-skp-person>${list.map((b) => `<option value="${b.id}" ${b.id === id ? 'selected' : ''}>${esc(ctx.data.people.find((p) => p.id === b.personId)?.name)}</option>`).join('')}</select><span class="text-xs text-muted">${esc(p.nip)} · ${totalWeight(a.snapshot)}% bobot</span></div>${a.status === 'final' ? note(`Penilaian Selesai oleh ${a.completedBy}. Nilai dan snapshot hanya dapat dibaca.`, 'success') : a.status === 'returned' ? note(a.history.find((h) => h.to === 'returned')?.reason || 'Periksa catatan revisi.', 'warning') : ctx.role.role === 'hc' ? note('Super HC hanya melihat hasil. Tidak ada pengisian, ACC, atau finalisasi.') : ''}<div class="skp-status-tabs">${a.snapshot.map((g, i) => `<button type="button" data-skp-kpi-index="${i}" class="${i === index ? 'active' : ''}">KPI ${i + 1}${calculate(g, w.inputs[g.id]).score != null ? ' · terisi' : ''}</button>`).join('')}</div>${k ? card(k, w.inputs[k.id], editable) : empty('KPI belum ditetapkan', 'Hubungi Super HC untuk melengkapi Master KPI pada unit/jabatan dan periode ini.')}<div class="gp-assessment-total"><span>Total nilai berbobot</span><strong data-skp-total>${num(a.finalTotal ?? total, 2)}</strong><span>${a.finalTotal == null ? 'Hasil lengkap setelah seluruh KPI valid' : 'Hasil Selesai'}</span></div><p class="gp-field-error" data-skp-assessment-error hidden></p><div class="gp-form-footer"><div>${nav(ctx, ctx.role.role === 'hc' ? 'monitor' : direct ? 'heads' : 'staff', '← Kembali ke daftar')}</div><div>${actions}</div></div><details class="card gp-detail-card"><summary>Jejak penilaian & keputusan</summary>${a.history.length ? `<ol class="gp-timeline gp-space">${a.history.map((h) => `<li><strong>${STATUSES[h.to]}</strong><p>${esc(h.actor)}${h.reason ? ` · ${esc(h.reason)}` : ''}</p><small>${date(h.at)} WIB</small></li>`).join('')}</ol>` : empty('Belum ada pengajuan atau keputusan.')}</details>`;
}
export function monitor(ctx) {
    ctx.monitorFilter ||= { unit: '', kind: '', status: '', search: '' };
    const f = ctx.monitorFilter;
    const filters = filterMarkup(
        'skp-monitor-filter',
        `<label>Unit<select class="field" data-skp-monitor-filter="unit"><option value="">Semua unit</option>${ctx.data.units.map((u) => `<option value="${esc(u.id)}" ${u.id === f.unit ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label><label>Jalur penilaian<select class="field" data-skp-monitor-filter="kind"><option value="">Staf & Kepala Unit</option><option value="staff" ${f.kind === 'staff' ? 'selected' : ''}>Staf</option><option value="unit_head" ${f.kind === 'unit_head' ? 'selected' : ''}>Kepala Unit</option></select></label><label>Status<select class="field" data-skp-monitor-filter="status"><option value="">Semua status</option>${Object.entries(
            STATUSES,
        )
            .map(
                ([key, label]) =>
                    `<option value="${key}" ${f.status === key ? 'selected' : ''}>${esc(label)}</option>`,
            )
            .join('')}</select></label>`,
        'Filter monitoring KPI',
    );
    return `${heading('Monitoring KPI', 'Pantau progres dan hasil penilaian pada periode terpilih.')}<div class="table-tools">${filters}<input class="field" type="search" aria-label="Cari monitoring KPI" data-skp-monitor-search placeholder="Cari nama atau NIP" value="${esc(f.search)}"></div><div data-skp-monitor-results>${monitorRows(ctx)}</div>`;
}
export function monitorRows(ctx) {
    const f = ctx.monitorFilter || {};
    const rows = ctx.data.assessments.filter(
            (a) =>
                a.periodId === ctx.periodId &&
                (!f.unit || a.unitId === f.unit) &&
                (!f.kind || a.subjectType === f.kind) &&
                (!f.status || a.status === f.status) &&
                (!f.search ||
                    (() => {
                        const p = ctx.data.people.find(
                            (p) => p.id === a.personId,
                        );
                        return `${p?.name} ${p?.nip}`
                            .toLowerCase()
                            .includes(f.search.toLowerCase());
                    })()),
        ),
        heads = ['Nama / jalur', 'Unit', 'Status', 'Total hasil', 'Tindakan'];
    return `<div class="skp-chartless">${Object.entries(STATUSES)
        .map(
            ([id, label]) =>
                `<div><span>${label}</span><strong>${rows.filter((a) => a.status === id).length}</strong></div>`,
        )
        .join(
            '',
        )}</div>${table(ctx, heads, rows, (a) => tr([`${esc(ctx.data.people.find((p) => p.id === a.personId)?.name)}<small>${a.subjectType === 'unit_head' ? 'Penilaian Kepala Unit' : 'Penilaian Staf'}</small>`, esc(ctx.data.units.find((u) => u.id === a.unitId)?.name), status(a), num(a.finalTotal ?? totals(a).total, 2), nav(ctx, 'assessment', 'Lihat hasil', a.id)], heads), 'simple-monitor', 10)}`;
}
export function periods(ctx) {
    const heads = [
        'Periode penilaian',
        'Mulai pengisian',
        'Batas pengajuan',
        'Batas ACC Kepala Divisi',
        'Tutup',
        'Status',
        'Tindakan',
    ];
    return `${heading('Pengaturan Periode', 'Kelola siklus bulanan, jadwal dan kategori nilai.', button('new-period', '+ Buat periode', '', true))}${ctx.periodSaved ? note(ctx.periodSaved, 'success') : ''}<section class="card fx-period-list"><h2>Daftar periode</h2>${table(
        ctx,
        heads,
        ctx.data.periods.toSorted((a, b) => b.id.localeCompare(a.id)),
        (p) =>
            tr(
                [
                    esc(p.name),
                    date(p.opens),
                    date(p.submission),
                    date(p.approval),
                    date(p.closes),
                    tag(
                        {
                            open: 'Aktif',
                            planned: 'Direncanakan',
                            closed: 'Ditutup',
                        }[p.status],
                        p.status === 'open' ? 'success' : 'muted',
                    ),
                    button('period', 'Lihat / ubah', p.id),
                ],
                heads,
            ),
        'simple-periods',
        10,
    )}</section>`;
}
export function periodEdit(ctx) {
    return `${heading(ctx.periodEditing ? 'Detail / edit periode' : 'Buat periode', 'Atur seluruh informasi periode dalam satu form.', '<a class="btn" data-skp-nav="periods" href="' + esc(ctx.url('periods')) + '">Kembali ke daftar</a>')}${periodEditor(ctx)}`;
}
