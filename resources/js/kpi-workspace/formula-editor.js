import {
    humanFormula,
    diagnose,
    recommendations,
    UNITS,
} from './formula-config.js';
import { calculate } from './model.js';
import { esc, field, note, tag, num, button, sectionHeading } from './markup.js';
export function variablesMarkup(k) {
    const variables = k.variables || [];
    return `${variables.length ? variables.map((v) => `<div class="fx-variable"><b>${esc(v.key)}</b><label class="sr-only" for="fx-var-${v.key}">Nama variabel ${v.key}</label><input id="fx-var-${v.key}" class="field" data-fx-variable-label="${v.key}" value="${esc(v.label)}" maxlength="150" placeholder="${v.key === 'A' ? 'Contoh: WO selesai tepat waktu' : v.key === 'B' ? 'Contoh: total WO masuk' : 'Nama data yang diminta'}"><label class="sr-only" for="fx-source-${v.key}">Sumber ${v.key}</label><select id="fx-source-${v.key}" class="field" data-fx-variable-source="${v.key}"><option value="manual" ${v.source !== 'fixed' ? 'selected' : ''}>Diisi penilai</option><option value="fixed" ${v.source === 'fixed' ? 'selected' : ''}>Angka tetap</option></select>${v.source === 'fixed' ? `<input class="field" type="number" step="any" data-fx-variable-fixed="${v.key}" aria-label="Angka tetap ${v.key}" value="${esc(v.value ?? '')}">` : ''}${button('remove-variable', 'Hapus', v.key, 'link')}</div>`).join('') : note('Tambahkan minimal satu variabel yang diisi penilai.')}<div class="fx-add-variable">${button('add-variable', '+ Tambah variabel')}</div><p class="gp-field-error" data-gp-error="variables" hidden></p>`;
}
export function formulaReview(k) {
    const issues = diagnose(k),
        recs = recommendations(k);
    const errors = issues.filter((i) => i.kind === 'error').length;
    return `<div class="fx-review-heading"><h3>Kritik formula</h3>${tag(errors ? `${errors} perlu diperbaiki` : 'Struktur diperiksa', errors ? 'warning' : 'success')}</div>${issues.map((item) => `<div class="fx-issue ${item.kind}"><p>${esc(item.message)}</p>${item.fix ? button('formula-fix', 'Kalikan 100', item.fix, 'link') : ''}</div>`).join('')}<h3 class="gp-space">Rekomendasi formula</h3><div class="fx-recommendations">${recs.map((r) => `<div><strong>${esc(r.label)}</strong><code>${esc(r.formula)}</code>${button('formula-preset', k.formula === r.formula ? 'Dipakai' : 'Pakai', r.id, 'btn btn-small')}</div>`).join('') || '<p class="gp-help">Tambahkan variabel untuk melihat rekomendasi.</p>'}</div>`;
}
export function testResult(k, test) {
    const input = Object.fromEntries(
        Object.entries(test).map(([key, value]) => [`variable_${key}`, value]),
    );
    const result = calculate(k, input);
    return `<div class="fx-test-stats"><div><span>Realisasi</span><strong>${result.measurement == null ? '—' : `${num(result.measurement, 2)} ${esc(k.unit)}`}</strong></div><div><span>Nilai KPI</span><strong>${num(result.score, 2)}</strong></div><div><span>Nilai berbobot</span><strong>${result.weighted == null ? '—' : `${num(result.weighted, 2)} poin`}</strong></div></div>${result.message ? `<p class="gp-help">${esc(result.message)}</p>` : ''}`;
}
export function formulaTest(k, test) {
    return `<div class="fx-test"><h3>Uji dengan angka contoh</h3><p class="gp-help">Uji coba tidak disimpan sebagai nilai karyawan.</p><div class="fx-test-inputs">${(k.variables || []).map((v) => `<label>${esc(v.key)} · <span data-fx-test-label="${v.key}">${esc(v.label || 'Belum diberi nama')}</span><input class="field" type="number" step="any" data-fx-test="${v.key}" value="${esc(v.source === 'fixed' ? v.value : (test[v.key] ?? ''))}" ${v.source === 'fixed' ? 'readonly' : ''}></label>`).join('')}</div><div data-fx-test-output>${testResult(k, test)}</div></div>`;
}
export function formulaTokens(k) {
    const groups = [
        ['Variabel', (k.variables || []).map((v) => [v.key, `${v.key} · ${v.label || 'Variabel'}`])],
        [
            'Operator',
            [
                ['+', '+'],
                ['-', '−'],
                ['*', '×'],
                ['/', '÷'],
                ['(', '('],
                [')', ')'],
                [',', ','],
                ['* 100', '× 100'],
            ],
        ],
        [
            'Fungsi',
            [
                ['IF(', 'IF'],
                ['MIN(', 'MIN'],
                ['MAX(', 'MAX'],
                ['ROUND(', 'ROUND'],
                ['ABS(', 'ABS'],
            ],
        ],
    ];
    return groups
        .filter(([, tokens]) => tokens.length)
        .map(
            ([label, tokens]) =>
                `<div class="fx-token-group" role="group" aria-label="Sisipkan ${label.toLowerCase()}"><span aria-hidden="true">${label}</span>${tokens.map(([token, text]) => button('formula-token', text, token, 'fx-token')).join('')}</div>`,
        )
        .join('');
}
/** KPI editor of one pattern item. `others` is the weight of the remaining items in the pattern. */
export function editor(k, test, others, editing) {
    const information = `<section class="fx-form-section">${sectionHeading(1, 'Informasi KPI', 'Nama indikator dan pilar yang menaunginya.')}<div class="fx-info-grid gp-form-grid">${field('name', 'Nama KPI', k.name, { required: true, wide: true, maxlength: 150 })}${field('pillar', 'Pilar', k.pillar, { required: true, list: 'skp-pillars', maxlength: 64 })}</div></section>`;
    const target = `<section class="fx-form-section">${sectionHeading(2, 'Target, polaritas & bobot', 'Tentukan arah capaian yang baik dan porsi KPI ini dalam pola.')}<div class="fx-target-grid gp-form-grid">${field('unit', 'Satuan', k.unit, { options: [...new Set([k.unit, ...UNITS])].filter(Boolean).map((u) => [u, u]), placeholder: false })}${field(
        'direction',
        'Polaritas',
        k.direction,
        {
            options: [
                ['higher', 'Semakin tinggi semakin baik'],
                ['lower', 'Semakin rendah semakin baik'],
            ],
            placeholder: false,
            help: 'Pakai "semakin rendah" hanya untuk waktu tunggu, downtime, atau biaya.',
        },
    )}${field('target', 'Target', k.target, { type: 'number', min: 0, step: 'any', required: true })}${field('weight', 'Bobot (%)', k.weight, { type: 'number', min: '0.0001', max: 100, step: '0.0001', required: true })}</div><p class="gp-help fx-score-help" data-fx-weight-total>${weightLine(others, k.weight)}</p><details class="fx-settings"><summary>Pengaturan konversi nilai</summary><p class="gp-help">Skor = realisasi ÷ target × maksimum (polaritas semakin tinggi) atau target ÷ realisasi × maksimum (semakin rendah), dibatasi minimum–maksimum.</p><div class="gp-form-grid">${field('zeroRule', 'Aturan target nol', k.policy.zeroRule, {
        options: [
            ['pending', 'Tidak dipakai (target lebih dari nol)'],
            ['zero-pass', 'Hasil nol lulus; selain itu gagal'],
        ],
        placeholder: false,
    })}${field('scoreMin', 'Nilai otomatis minimum', k.policy.min, { type: 'number', min: 0, max: 99 })}${field('scoreMax', 'Nilai otomatis maksimum', k.policy.max, { type: 'number', min: 1, max: 100 })}</div><p class="gp-field-error" data-gp-error="policy" hidden></p></details></section>`;
    const formula = `<section class="fx-form-section">${sectionHeading(3, 'Variabel & formula', 'Susun data yang diisi penilai, lalu rangkai formulanya. Uji dengan angka contoh sebelum menyimpan.')}<div class="fx-formula-grid"><div class="fx-builder"><h3>Variabel input</h3><p class="gp-help">Kode A, B, C otomatis. Keterangan menjadi label input saat penilaian.</p><div data-fx-variables>${variablesMarkup(k)}</div>${field('formula', 'Formula pengukuran', k.formula, { required: true, help: 'Gunakan kode variabel, operator dan fungsi di bawah.', maxlength: 1200 })}<div class="fx-tokens" data-fx-tokens>${formulaTokens(k)}</div><div class="fx-human"><span>Dibaca sebagai</span><p data-fx-human>${esc(humanFormula(k))}</p></div><div data-fx-test-panel>${formulaTest(k, test)}</div></div><aside class="fx-review" data-fx-review aria-label="Pemeriksaan formula">${formulaReview(k)}</aside></div></section>`;
    return `<section class="card skp-form-card fx-kpi-editor" id="skp-kpi-editor"><div class="fx-card-heading"><div><h2>${editing ? `Ubah KPI: ${esc(k.name)}` : 'KPI baru dalam pola'}</h2><p>Lengkapi tiga bagian di bawah, lalu tambahkan ke pola.</p></div>${button('kpi-cancel', 'Tutup editor')}</div><form id="skp-kpi-form" novalidate autocomplete="off">${information}${target}${formula}<div class="fx-form-actions">${button('kpi-save', editing ? 'Perbarui KPI di pola' : 'Tambahkan ke pola', '', 'btn btn-primary')}${button('kpi-cancel', 'Batal')}<span class="gp-help">KPI tersimpan permanen setelah Anda memilih Simpan pola.</span></div></form></section>`;
}
export function weightLine(others, weight) {
    const value = Number(weight);
    const total =
        Math.round(others * 10000 + (Number.isFinite(value) ? Math.round(value * 10000) : 0)) /
        10000;
    return `Total bobot pola setelah KPI ini: <b>${num(total, 4)}%</b> dari 100%${total === 100 ? ' · tepat 100%' : total > 100 ? ` · lebih ${num(total - 100, 4)}%` : ` · kurang ${num(100 - total, 4)}%`}. Skor = nilai 10–100 × bobot; contoh 80 × 10% = 8.`;
}
