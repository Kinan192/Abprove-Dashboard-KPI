import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    seed,
    emptyKpi,
    calculate,
    kpiErrors,
    saveKpi,
    removeKpi,
    context,
    assess,
    clone,
    totals,
    totalWeight,
    prepareRows,
    savePeriod,
} from '../../resources/js/design-review/kpi-periode/model.js';
const auto = (method = 'ratio', extra = {}) => ({
    ...emptyKpi(),
    method,
    weight: 15,
    target: 95,
    actualLabel: 'Realisasi',
    comparisonLabel: 'Pembanding',
    ...extra,
});
test('Contoh persentase IT 65/80, target95, bobot15', () => {
    const r = calculate(auto(), { actual: 65, comparison: 80 });
    assert.equal(r.measurement, 81.25);
    assert.equal(r.score.toFixed(2), '85.53');
    assert.equal(r.weighted.toFixed(2), '12.83');
});
test('Contoh kepala unit medis 3/4, target95, bobot20', () => {
    const r = calculate(
        auto('ratio', {
            weight: 20,
            denominatorSource: 'fixed',
            fixedDenominator: 4,
        }),
        { actual: 3, comparison: 999 },
    );
    assert.equal(r.measurement, 75);
    assert.equal(r.score.toFixed(2), '78.95');
    assert.equal(r.weighted.toFixed(2), '15.79');
});
test('Jumlah 8 dari10, bobot25 dan manual85 bobot10', () => {
    assert.equal(
        calculate(auto('amount', { target: 10, weight: 25 }), { actual: 8 })
            .weighted,
        20,
    );
    assert.equal(
        calculate(auto('manual', { weight: 10 }), { value: 85 }).weighted,
        8.5,
    );
});
for (const input of [
    {},
    { actual: 65 },
    { actual: 65, comparison: 0 },
    { actual: 65, comparison: -2 },
    { actual: -1, comparison: 80 },
    { actual: 'abc', comparison: 80 },
])
    test(`Tidak membuat hasil palsu untuk ${JSON.stringify(input)}`, () => {
        const r = calculate(auto(), input);
        assert.equal(r.score, null);
        assert.equal(r.measurement, null);
        assert.equal(r.weighted, null);
    });
for (const value of [9, 101, 85.5, '8e1', ''])
    test(`Manual menolak ${JSON.stringify(value)}`, () =>
        assert.equal(calculate(auto('manual'), { value }).score, null));
test('Arah menurun wajib kebijakan terpisah, non-nol, targetnol tidak dibagi', () => {
    const k = auto('amount', { direction: 'lower', target: 5 });
    assert.equal(calculate(k, { actual: 10 }).score, null);
    k.policy.rule = 'reverse-positive';
    assert.equal(calculate(k, { actual: 10 }).score, 50);
    assert.equal(calculate(k, { actual: 0 }).score, null);
    k.target = 0;
    assert.equal(calculate(k, { actual: 0 }).score, null);
    k.policy.zeroRule = 'zero-pass';
    assert.equal(calculate(k, { actual: 0 }).score, 100);
    assert.equal(calculate(k, { actual: 1 }).score, 0);
});
test('Skala otomatis dapat dikonfigurasi; cap dan bobot memakai presisi penuh', () => {
    const k = auto('amount', { target: 10 });
    k.policy.min = 10;
    k.policy.max = 90;
    assert.equal(calculate(k, { actual: 0 }).score, 10);
    assert.equal(calculate(k, { actual: 20 }).score, 90);
});
test('CRUD HC untuk tiga sasaran, belum ada penilai KD, snapshot selesai utuh', () => {
    const d = seed(),
        before = JSON.stringify(
            d.assessments.filter((a) => a.status === 'final'),
        );
    for (const targetRole of ['staff', 'unit_head', 'division_head']) {
        const k = saveKpi(
            d,
            {
                ...emptyKpi(),
                name: `KPI ${targetRole}`,
                unitId: 'it',
                targetRole,
                weight: 10,
            },
            context('hc'),
        );
        assert.equal(k.targetRole, targetRole);
        saveKpi(d, { ...k, name: 'Nama direvisi' }, context('hc'));
        removeKpi(d, k.id, context('hc'));
    }
    assert.equal(
        JSON.stringify(d.assessments.filter((a) => a.status === 'final')),
        before,
    );
    assert.equal(
        d.assessments.filter((a) => a.subjectType === 'division_head').length,
        0,
    );
    assert.throws(
        () =>
            saveKpi(
                d,
                { ...emptyKpi(), name: 'KPI baru', unitId: 'it', weight: 100 },
                context('ku'),
            ),
        /Super HC/,
    );
});
test('Validasi konfigurasi denominator tetap, bobot, target dan arah menurun', () => {
    const d = seed(),
        k = {
            ...auto(),
            name: 'KPI otomatis',
            unitId: 'it',
            denominatorSource: 'fixed',
            fixedDenominator: 0,
        };
    assert.ok(kpiErrors(d, k).fixedDenominator);
    k.fixedDenominator = 80;
    k.target = 101;
    assert.ok(kpiErrors(d, k).target);
    k.target = 95;
    k.weight = 0;
    assert.ok(kpiErrors(d, k).weight);
    k.weight = 15;
    k.direction = 'lower';
    assert.ok(kpiErrors(d, k).policy);
    k.active = false;
    assert.equal(kpiErrors(d, k).policy, undefined);
});
test('Jalur staf: draft, kirim, revisi wajib alasan, kirim ulang, ACC KD selesai', () => {
    const d = seed(),
        a = d.assessments.find(
            (a) =>
                a.periodId === '2026-11' &&
                a.status === 'returned' &&
                a.unitId === 'it',
        ),
        inputs = {};
    a.snapshot.forEach(
        (k) =>
            (inputs[k.id] =
                k.method === 'manual'
                    ? { value: 85 }
                    : k.method === 'ratio'
                      ? { actual: 65, comparison: 80 }
                      : { actual: 8 }),
    );
    assess(d, a.id, 'draft', { inputs }, context('ku'));
    assert.equal(a.status, 'draft');
    assess(d, a.id, 'send', { inputs }, context('ku'));
    assert.equal(a.status, 'submitted');
    assert.throws(() => assess(d, a.id, 'return', {}, context('kd')), /Alasan/);
    assess(d, a.id, 'return', { reason: 'Lengkapi bukti.' }, context('kd'));
    assert.equal(a.status, 'returned');
    assess(d, a.id, 'send', { inputs }, context('ku'));
    const before = clone(a.inputs);
    assess(d, a.id, 'approve', { inputs: {} }, context('kd'));
    assert.equal(a.status, 'final');
    assert.deepEqual(a.inputs, before);
    assert.equal(a.finalTotal.toFixed(2), '83.83');
    assert.throws(
        () => assess(d, a.id, 'draft', { inputs }, context('ku')),
        /terkunci/,
    );
});
test('KD menilai kepala unit langsung, draft lalu selesai tanpa self-assessment / HC', () => {
    const d = seed(),
        a = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.personId === 'head-med',
        ),
        inputs = {};
    a.snapshot.forEach(
        (k) =>
            (inputs[k.id] =
                k.method === 'manual' ? { value: 85 } : { actual: 3 }),
    );
    assess(d, a.id, 'draft', { inputs }, context('kd'));
    assert.equal(a.status, 'draft');
    assess(d, a.id, 'complete', { inputs }, context('kd'));
    assert.equal(a.status, 'final');
    assert.equal(a.finalTotal.toFixed(2), '83.79');
    assert.ok(a.history.every((h) => h.actor.includes('Kepala Divisi')));
});
test('HC tidak dapat menilai/ACC; KU bukan selfassessment; scope KD tidak meluas', () => {
    const d = seed(),
        a = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.status === 'submitted',
        ),
        head = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.subjectType === 'unit_head',
        ),
        foreign = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.unitId === 'rawat-inap',
        );
    for (const op of [
        'draft',
        'send',
        'complete',
        'approve',
        'return',
        'finalize',
    ])
        assert.throws(
            () => assess(d, a.id, op, {}, context('hc')),
            /hanya memantau/,
        );
    assert.throws(
        () => assess(d, head.id, 'draft', { inputs: {} }, context('ku')),
        /cakupan/,
    );
    assert.throws(
        () => assess(d, foreign.id, 'approve', {}, context('kd')),
        /cakupan/,
    );
});
test('Bobot100 dan input lengkap wajib sebelum selesai, draft boleh parsial', () => {
    const d = seed(),
        a = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.personId === 'head-it',
        );
    assess(d, a.id, 'draft', { inputs: {} }, context('kd'));
    assert.throws(
        () => assess(d, a.id, 'complete', { inputs: {} }, context('kd')),
        /Lengkapi/,
    );
    a.snapshot[0].weight = 85;
    assert.throws(
        () =>
            assess(
                d,
                a.id,
                'complete',
                { inputs: { [a.snapshot[0].id]: { value: 85 } } },
                context('kd'),
            ),
        /100%/,
    );
});
test('Pengaturan periode tetap tanpa approval tambahan; histori dan penutupan terjaga', () => {
    const d = seed(),
        p = clone(d.periods.find((p) => p.id === '2026-10'));
    assert.throws(() => savePeriod(d, p, p.id, context('hc')), /Selesai/);
    const november = clone(d.periods.find((p) => p.id === '2026-11'));
    november.status = 'closed';
    assert.throws(
        () => savePeriod(d, november, november.id, context('hc')),
        /Selesai|belum/,
    );
    const fresh = {
        ...clone(d.periods[2]),
        id: '2027-01',
        name: 'Januari 2027',
        status: 'planned',
    };
    savePeriod(d, fresh, null, context('hc'));
    assert.equal(d.periods.at(-1).status, 'planned');
    assert.equal(d.periods.at(-1).finalization, undefined);
});
