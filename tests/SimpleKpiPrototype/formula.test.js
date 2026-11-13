import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Formula } from '../../resources/js/design-review/kpi-periode/formula.js';
import {
    editableKpi,
    formulaErrors,
    humanFormula,
    diagnose,
    recommendations,
} from '../../resources/js/design-review/kpi-periode/formula-config.js';
import {
    seed,
    emptyKpi,
    calculate,
    kpiErrors,
    saveKpi,
    removeKpi,
    context,
    definitions,
    prepareRows,
    savePeriod,
    clone,
    assess,
} from '../../resources/js/design-review/kpi-periode/model.js';
const candidate = (periodId = '2026-11') => ({
    ...emptyKpi(periodId),
    name: 'Ketersediaan layanan IT',
    method: 'formula',
    unitId: 'it',
    unit: '%',
    target: 99.5,
    weight: 100,
    variables: [
        { key: 'A', label: 'Total menit', source: 'manual' },
        { key: 'B', label: 'Downtime', source: 'manual' },
    ],
    formula: '(A - B) / A * 100',
});
test('Aritmetika, kurung dan fungsi dari HTML tanpa eval', () => {
    assert.equal(
        Formula.evaluate('ROUND((A - B) / A * 100, 2)', { A: 43200, B: 60 }),
        99.86,
    );
    assert.equal(Formula.evaluate('MIN(100, MAX(10, ABS(A)))', { A: -85 }), 85);
    assert.equal(Formula.evaluate('2 ^ 3 + 1', {}), 9);
});
test('IF dievaluasi hanya pada cabang yang dipilih', () => {
    assert.equal(
        Formula.evaluate('IF(B > 0, A / B * 100, 0)', { A: 1, B: 0 }),
        0,
    );
    assert.throws(() => Formula.evaluate('A / B', { A: 1, B: 0 }), /nol/);
});
for (const formula of [
    'Math.random()',
    'alert(1)',
    'globalThis.process.exit()',
    'A.constructor',
    '1;2',
    'UNKNOWN(A)',
])
    test(`Menolak ekspresi non-formula ${formula}`, () =>
        assert.throws(() => Formula.compile(formula)));
test('Menolak variabel tidak terdaftar, formula panjang, hasil non-finite dan nesting berlebihan', () => {
    const k = candidate();
    k.formula = 'A + C';
    assert.match(formulaErrors(k).formula, /C/);
    assert.throws(() => Formula.compile('1'.repeat(1201)), /1200/);
    assert.throws(() => Formula.evaluate('10 ^ 10000', {}), /valid/);
    assert.throws(
        () => Formula.compile('('.repeat(41) + '1' + ')'.repeat(41)),
        /dalam/,
    );
});
test('Input kosong bukan nol dan variabel tetap tidak dapat ditimpa penilai', () => {
    const k = candidate();
    assert.equal(calculate(k, { variable_A: '', variable_B: 0 }).score, null);
    k.variables[1] = {
        key: 'B',
        label: 'Downtime tetap',
        source: 'fixed',
        value: 60,
    };
    const a = calculate(k, { variable_A: 43200, variable_B: 999 });
    assert.equal(a.score, 100);
    assert.equal(calculate(k, { variable_A: 0 }).score, null);
});
test('Kritik dan rekomendasi formula mengikuti variabel', () => {
    const k = candidate();
    k.formula = 'A / B';
    assert.ok(diagnose(k).some((i) => i.fix));
    assert.ok(recommendations(k).some((r) => r.id === 'uptime'));
    assert.match(humanFormula(k), /Total menit/);
});
test('Adapter KPI lama tidak menulis ulang snapshot atau konfigurasi asli', () => {
    const d = seed(),
        k = d.kpis.find((k) => k.method === 'ratio'),
        before = JSON.stringify(k),
        converted = editableKpi(k);
    assert.equal(converted.method, 'formula');
    assert.equal(converted.formula, 'A / B * 100');
    assert.equal(JSON.stringify(k), before);
    assert.equal(
        calculate(converted, { variable_A: 65, variable_B: 80 }).score.toFixed(
            2,
        ),
        '85.53',
    );
});
test('KPI hanya diberikan ke penerima terpilih di bulan yang dipilih', () => {
    const d = seed(),
        period = {
            ...clone(d.periods[2]),
            id: '2027-01',
            name: 'Penilaian Januari 2027',
            status: 'open',
        };
    savePeriod(d, period, null, context('hc'));
    const k = candidate(period.id);
    k.assignmentMode = 'selected';
    k.assigneeIds = ['staff-it-1'];
    saveKpi(d, k, context('hc'));
    assert.equal(
        definitions(d, period.id, 'it', 'staff', 'staff-it-1').length,
        1,
    );
    assert.equal(
        definitions(d, period.id, 'it', 'staff', 'staff-it-2').length,
        0,
    );
    assert.equal(
        d.assessments.filter((a) => a.periodId === period.id).length,
        1,
    );
    assert.equal(
        d.assessments.find((a) => a.periodId === period.id).personId,
        'staff-it-1',
    );
    assert.equal(
        d.assessments.filter((a) => a.periodId === '2026-11').length,
        7,
    );
});
test('Penerima asing, parent lintas periode dan hubungan melingkar ditolak', () => {
    const d = seed(),
        k = candidate();
    k.assignmentMode = 'selected';
    k.assigneeIds = ['head-med'];
    assert.ok(kpiErrors(d, k).assignees);
    k.assignmentMode = 'all';
    k.parentId = '2026-12-head-it-quality';
    assert.ok(kpiErrors(d, k).parentId);
    const a = d.kpis.find((k) => k.id === '2026-11-head-it-quality'),
        b = d.kpis.find((k) => k.id === '2026-11-head-med-coordination');
    a.parentId = b.id;
    assert.ok(kpiErrors(d, { ...b, parentId: a.id }).parentId);
});
test('Formula baru dievaluasi di penilaian, hasil selesai dan bulan lain tetap utuh', () => {
    const d = seed(),
        old = JSON.stringify(
            d.assessments.filter((a) => a.periodId === '2026-10'),
        );
    const parent = d.kpis.find((k) => k.id === '2026-11-head-it-quality'),
        k = { ...candidate(), id: parent.id, targetRole: 'unit_head' };
    saveKpi(d, k, context('hc'));
    const a = d.assessments.find(
        (a) => a.periodId === '2026-11' && a.personId === 'head-it',
    );
    assess(
        d,
        a.id,
        'complete',
        { inputs: { [k.id]: { variable_A: 43200, variable_B: 60 } } },
        context('kd'),
    );
    assert.equal(a.finalTotal, 100);
    const completed = JSON.stringify(a);
    saveKpi(d, { ...k, name: 'Nama baru', formula: 'A' }, context('hc'));
    removeKpi(d, k.id, context('hc'));
    assert.equal(JSON.stringify(a), completed);
    assert.equal(
        JSON.stringify(d.assessments.filter((a) => a.periodId === '2026-10')),
        old,
    );
});
test('KPI yang sudah digunakan tidak dipindahkan diam-diam ke bulan lain', () => {
    const d = seed(),
        k = d.kpis.find((k) => k.id === '2026-11-it-sla');
    assert.ok(kpiErrors(d, { ...k, periodId: '2026-12' }).periodId);
});
