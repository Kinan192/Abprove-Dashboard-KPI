import {
    editableKpi,
    humanFormula,
    diagnose,
    recommendations,
    UNITS,
    expressionValue,
} from './formula-config.js';
import {
    calculate,
    definitions,
    totalWeight,
    monthLabel,
    TARGETS,
} from './model.js';
import {
    esc,
    field,
    check,
    note,
    tag,
    empty,
    num,
} from '../../abprove/goals/markup.js';
import { table, tr } from '../../abprove/goals/views.js';
import { monthlyWeightRows } from './weight-summary.js';
const action = (name, label, id = '', className = 'btn') =>
    `<button type="button" class="${className}" data-skp-action="${name}" data-id="${esc(id)}">${esc(label)}</button>`;
export const recipients = (data, k) =>
    data.people.filter((p) => p.unitId === k.unitId && p.type === k.targetRole);
export const assigned = (k, id) =>
    k.assignmentMode !== 'selected' || k.assigneeIds?.includes(id);
export function weightPreview(data, k) {
    const people = recipients(data, k);
    return people.map((person) => {
        const before = totalWeight(
            definitions(data, k.periodId, k.unitId, k.targetRole, person.id),
        );
        const after =
            totalWeight(
                definitions(
                    data,
                    k.periodId,
                    k.unitId,
                    k.targetRole,
                    person.id,
                ).filter((item) => item.id !== k.id),
            ) +
            (k.active && assigned(k, person.id) ? Number(k.weight || 0) : 0);
        return { person, before, after: Math.round(after * 10000) / 10000 };
    });
}
export function variablesMarkup(k, test = {}) {
    const variables = k.variables || [];
    return `${variables.length ? variables.map((v) => `<div class="fx-variable"><b>${esc(v.key)}</b><label class="sr-only" for="fx-var-${v.key}">Nama variabel ${v.key}</label><input id="fx-var-${v.key}" class="field" data-fx-variable-label="${v.key}" value="${esc(v.label)}" maxlength="150" placeholder="${v.key === 'A' ? 'Contoh: tiket selesai sesuai SLA' : v.key === 'B' ? 'Contoh: total tiket yang dinilai' : 'Nama data yang diminta'}"><label class="sr-only" for="fx-source-${v.key}">Sumber ${v.key}</label><select id="fx-source-${v.key}" class="field" data-fx-variable-source="${v.key}"><option value="manual" ${v.source !== 'fixed' ? 'selected' : ''}>Diisi penilai</option><option value="fixed" ${v.source === 'fixed' ? 'selected' : ''}>Angka tetap</option></select>${v.source === 'fixed' ? `<input class="field" type="number" step="any" data-fx-variable-fixed="${v.key}" aria-label="Angka tetap ${v.key}" value="${esc(v.value ?? '')}">` : ''}${action('remove-variable', 'Hapus', v.key, 'link')}</div>`).join('') : note('Tanpa variabel. Penilai mengisi nilai manual secara langsung.')}<div class="fx-add-variable">${action('add-variable', '+ Tambah variabel')}</div><p class="gp-field-error" data-gp-error="variables" hidden></p>`;
}
export function formulaReview(ctx) {
    const k = ctx.working,
        issues = diagnose(k),
        recs = recommendations(k);
    const errors = issues.filter((i) => i.kind === 'error').length;
    return `<div class="fx-review-heading"><h3>Kritik formula</h3>${tag(errors ? `${errors} perlu diperbaiki` : 'Struktur diperiksa', errors ? 'warning' : 'success')}</div>${issues.map((item) => `<div class="fx-issue ${item.kind}"><p>${esc(item.message)}</p>${item.fix ? action('formula-fix', 'Kalikan 100', item.fix, 'link') : ''}</div>`).join('')}<h3 class="gp-space">Rekomendasi formula</h3><div class="fx-recommendations">${recs.map((r) => `<div><strong>${esc(r.label)}</strong><code>${esc(r.formula)}</code>${action('formula-preset', k.formula === r.formula ? 'Dipakai' : 'Pakai', r.id, 'btn btn-small')}</div>`).join('') || '<p class="gp-help">Tambahkan variabel untuk melihat rekomendasi.</p>'}</div>`;
}
export function formulaTest(ctx) {
    const k = ctx.working,
        test = ctx.testValues || {};
    let content = '';
    const input = Object.fromEntries(
        Object.entries(test).map(([key, value]) => [`variable_${key}`, value]),
    );
    if (k.method === 'manual') {
        if (k.formula) {
            try {
                content = `Realisasi pendukung: <b>${num(expressionValue(k, input), 2)} ${esc(k.unit)}</b>. Nilai tetap diisi penilai.`;
            } catch (e) {
                content = esc(e.message);
            }
        } else
            content =
                'Nilai manual 10–100 diisi penilai; tidak dihitung dari formula.';
    } else {
        const result = calculate(k, input);
        content = `<div class="fx-test-stats"><div><span>Realisasi</span><strong>${result.measurement == null ? '—' : `${num(result.measurement, 2)} ${esc(k.unit)}`}</strong></div><div><span>Nilai KPI</span><strong>${num(result.score, 2)}</strong></div><div><span>Nilai berbobot</span><strong>${result.weighted == null ? '—' : `${num(result.weighted, 2)} poin`}</strong></div></div>${result.message ? `<p class="gp-help">${esc(result.message)}</p>` : ''}`;
    }
    return `<div class="fx-test"><h3>Uji dengan angka contoh</h3><p class="gp-help">Uji coba tidak disimpan sebagai nilai karyawan.</p><div class="fx-test-inputs">${(k.variables || []).map((v) => `<label>${esc(v.key)} · <span data-fx-test-label="${v.key}">${esc(v.label || 'Belum diberi nama')}</span><input class="field" type="number" step="any" data-fx-test="${v.key}" value="${esc(v.source === 'fixed' ? v.value : (test[v.key] ?? ''))}" ${v.source === 'fixed' ? 'readonly' : ''}></label>`).join('')}</div><div data-fx-test-output>${content}</div></div>`;
}
export function assignmentMarkup(ctx) {
    const k = ctx.working,
        people = recipients(ctx.data, k);
    return `<div class="fx-section-heading"><span>4</span><h2>Ditugaskan ke</h2></div><div class="fx-scope-fields gp-form-grid">${field('unitId', 'Unit / Ruangan', k.unitId, { required: true, options: ctx.data.units })}${field('targetRole', 'Jabatan penerima', k.targetRole, { required: true, options: Object.entries(TARGETS), placeholder: false })}</div><div class="fx-assignees">${people.map((p) => `<label><input type="checkbox" data-fx-assignee="${p.id}" ${assigned(k, p.id) ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('') || '<p class="gp-help">Pilih unit dan jabatan untuk menampilkan penerima.</p>'}</div><p class="gp-field-error" data-gp-error="assignees" hidden></p>${k.targetRole === 'division_head' ? note('Penilai Kepala Divisi belum ditentukan; lembar penilaian tidak dibuat.') : ''}`;
}
export function editor(ctx) {
    const k = ctx.working;
    const parentOptions = ctx.data.kpis
        .filter(
            (p) =>
                p.id !== k.id &&
                p.periodId === k.periodId &&
                p.targetRole === 'unit_head' &&
                (!k.unitId ||
                    p.id === k.parentId ||
                    ctx.data.units.find((u) => u.id === p.unitId)
                        ?.divisionId ===
                        ctx.data.units.find((u) => u.id === k.unitId)
                            ?.divisionId),
        )
        .map((p) => [p.id, p.name]);
    const information = `<section class="fx-form-section"><div class="fx-section-heading"><span>1</span><h2>Informasi KPI</h2></div><div class="fx-info-grid gp-form-grid">${field('name', 'Nama KPI', k.name, { required: true, wide: true, maxlength: 150 })}${field('pillar', 'Pilar', k.pillar, { required: true, list: 'skp-pillars', maxlength: 64 })}${field('parentId', 'Turunan dari KPI atasan', k.parentId, { options: parentOptions, placeholder: 'Bukan turunan' })}${field('periodId', 'Periode bulan', k.periodId, { required: true, options: ctx.data.periods.filter((p) => p.status !== 'closed').map((p) => [p.id, p.name]) })}</div></section>`;
    const target = `<section class="fx-form-section"><div class="fx-section-heading"><span>2</span><h2>Target & penilaian</h2></div><div class="fx-target-grid gp-form-grid">${field(
        'method',
        'Cara penilaian',
        k.method,
        {
            required: true,
            options: [
                ['formula', 'Otomatis dari formula'],
                ['manual', 'Nilai manual oleh penilai (10–100)'],
            ],
            placeholder: false,
        },
    )}${field('unit', 'Satuan', k.unit, { options: [...new Set([k.unit, ...UNITS])].filter(Boolean).map((u) => [u, u]), placeholder: false })}${field(
        'direction',
        'Polaritas',
        k.direction,
        {
            options: [
                ['higher', 'Semakin tinggi semakin baik'],
                ['lower', 'Semakin rendah semakin baik'],
            ],
            placeholder: false,
            help: 'Pakai "semakin tinggi" untuk persentase/capaian. Pakai "semakin rendah" hanya untuk waktu tunggu, downtime, atau biaya.',
        },
    )}${field('target', 'Target', k.target, { type: 'number', min: 0, step: 'any', required: k.method !== 'manual', help: k.method === 'manual' ? 'Opsional untuk KPI manual.' : '' })}${field('weight', 'Bobot (%)', k.weight, { type: 'number', min: '0.0001', max: 100, step: '0.0001', required: true })}</div><p class="gp-help fx-score-help">Nilai 10–100 per bulan. Skor = nilai × bobot; contoh: 80 × 10% = 8.</p><details class="fx-settings"><summary>Pengaturan konversi nilai</summary>${check('active', 'KPI aktif', k.active)}${k.method === 'manual' ? field('rubric', 'Panduan penilaian', k.rubric, { textarea: true, required: true }) : ''}${
        k.method !== 'manual'
            ? `<div class="skp-policy"><div class="gp-form-grid">${field(
                  'scoreRule',
                  'Aturan konversi',
                  k.policy.rule,
                  {
                      options: [
                          ['pending', 'Belum ditetapkan'],
                          [
                              'target-normalized',
                              'Realisasi / target × maksimum',
                          ],
                          [
                              'reverse-positive',
                              'Target / realisasi × maksimum (non-nol)',
                          ],
                      ],
                      placeholder: false,
                  },
              )}${field('zeroRule', 'Aturan target nol', k.policy.zeroRule, {
                  options: [
                      ['pending', 'Belum ditetapkan'],
                      ['zero-pass', 'Hasil nol lulus; selain itu gagal'],
                  ],
                  placeholder: false,
              })}${field('scoreMin', 'Nilai otomatis minimum', k.policy.min, { type: 'number', min: 0, max: 99 })}${field('scoreMax', 'Nilai otomatis maksimum', k.policy.max, { type: 'number', min: 1, max: 100 })}</div><p class="gp-field-error" data-gp-error="policy" hidden></p></div>`
            : ''
    }</details></section>`;
    const formula = `<section class="fx-form-section"><div class="fx-section-heading"><span>3</span><h2>Numerator, denominator & formula</h2></div>${k.method === 'manual' ? '<p class="gp-help">Variabel dan formula opsional; nilai tetap diisi penilai.</p>' : ''}<div class="fx-formula-grid"><div class="fx-builder"><h3>Variabel input</h3><p class="gp-help">Kode A, B, C otomatis. Keterangan menjadi label input saat penilaian.</p><div data-fx-variables>${variablesMarkup(k, ctx.testValues)}</div>${field('formula', 'Formula pengukuran', k.formula, { help: 'Gunakan kode variabel, operator dan fungsi di bawah.', maxlength: 1200 })}<div class="fx-tokens" data-fx-tokens>${formulaTokens(k)}</div><p class="gp-help" data-fx-human>${esc(humanFormula(k))}</p><div data-fx-test-panel>${formulaTest(ctx)}</div></div><aside class="fx-review" data-fx-review>${formulaReview(ctx)}</aside></div></section>`;
    return `<section class="card fx-kpi-editor"><div class="fx-card-heading"><h2>${k.id ? `Edit KPI: ${esc(k.name)}` : 'KPI Baru'}</h2>${k.id ? action('cancel', 'Batal edit') : ''}</div><form id="skp-kpi-form" novalidate autocomplete="off">${information}${target}${formula}<section class="fx-form-section"><div data-fx-assignment>${assignmentMarkup(ctx)}</div></section><div class="fx-form-actions">${action('save', k.id ? 'Simpan perubahan' : 'Tambah KPI', '', 'btn btn-primary')}${k.id ? action('cancel', 'Batal') : ''}<span class="gp-help" data-fx-saved role="status">${esc(ctx.savedMessage || '')}</span></div></form></section>`;
}
export function formulaTokens(k) {
    const tokens = [
        ...(k.variables || []).map((v) => [
            v.key,
            `${v.key} · ${v.label || 'Variabel'}`,
        ]),
        ['+', '+'],
        ['-', '−'],
        ['*', '×'],
        ['/', '÷'],
        ['(', '('],
        [')', ')'],
        [',', ','],
        ['* 100', '× 100'],
        ['IF(', 'IF'],
        ['MIN(', 'MIN'],
        ['MAX(', 'MAX'],
        ['ROUND(', 'ROUND'],
        ['ABS(', 'ABS'],
    ];
    return tokens
        .map(([token, label]) =>
            action('formula-token', label, token, 'fx-token'),
        )
        .join('');
}
export function monthlyWeights(ctx) {
    if (!ctx.data.kpis.some((k) => k.periodId === ctx.periodId)) return '';
    const rows = monthlyWeightRows(ctx.data, ctx.periodId, ctx.filter);
    const complete = rows.filter((row) => row.total === 100).length;
    const units = new Map(ctx.data.units.map((unit) => [unit.id, unit.name]));
    const headings = ['Karyawan', 'Unit / Ruangan', 'Total bobot', 'Status'];
    const detail = table(ctx, headings, rows, (row) => tr([esc(row.person.name), esc(units.get(row.person.unitId) || '—'), `${num(row.total, 4)}%`, tag(row.total === 100 ? 'Lengkap' : 'Perlu dilengkapi', row.total === 100 ? 'success' : 'warning')], headings), 'simple-weights');
    return `<section class="card fx-monthly-weights" aria-label="Total bobot per karyawan"><h2>Total bobot per karyawan</h2><p class="gp-help" data-weight-summary>${rows.length} penerima · ${complete} lengkap · ${rows.length - complete} perlu dilengkapi</p><section aria-label="Rincian total bobot">${detail}</section><p class="gp-help">${esc(monthLabel(ctx.periodId))} · Mengikuti filter unit dan penerima. Total seluruh KPI aktif per orang harus 100% sebelum penilaian dikirim atau diselesaikan.</p></section>`;
}
