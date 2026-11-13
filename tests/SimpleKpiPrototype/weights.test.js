import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyWeightRows } from '../../resources/js/design-review/kpi-periode/weight-summary.js';
import { definitions, totalWeight, seed, clone, context, savePeriod, kpiErrors } from '../../resources/js/design-review/kpi-periode/model.js';
import { periodLocked } from '../../resources/js/design-review/kpi-periode/period-editor.js';

test('Total bobot memisahkan bulan, unit, jabatan, penerima terpilih dan KPI nonaktif', () => {
    const people = [
        { id: 'a', unitId: 'u1', type: 'staff' },
        { id: 'b', unitId: 'u1', type: 'staff' },
        { id: 'h', unitId: 'u1', type: 'unit_head' },
        { id: 'c', unitId: 'u2', type: 'staff' },
    ];
    const base = { periodId: '2026-11', unitId: 'u1', targetRole: 'staff', active: true, assignmentMode: 'all' };
    const data = { people, kpis: [
        { ...base, weight: 40 },
        { ...base, weight: 25, assignmentMode: 'selected', assigneeIds: ['a'] },
        { ...base, weight: 35, assignmentMode: 'selected', assigneeIds: ['a', 'a'] },
        { ...base, weight: 100, active: false },
        { ...base, weight: 100, periodId: '2026-12' },
        { ...base, weight: 100, targetRole: 'unit_head' },
        { ...base, weight: 33.3333, unitId: 'u2' },
        { ...base, weight: 66.6667, unitId: 'u2' },
    ] };
    assert.deepEqual(monthlyWeightRows(data, '2026-11').map(r => [r.person.id, r.total]), [['a', 100], ['b', 40], ['h', 100], ['c', 100]]);
    for (const filter of [{}, { unit: 'u1' }, { role: 'unit_head' }, { unit: 'u2', role: 'staff' }]) {
        const expected = people.filter(p => (!filter.unit || p.unitId === filter.unit) && (!filter.role || p.type === filter.role))
            .map(person => ({ person, total: totalWeight(definitions(data, '2026-11', person.unitId, person.type, person.id)) })).filter(r => r.total > 0);
        assert.deepEqual(monthlyWeightRows(data, '2026-11', filter), expected);
    }
});

test('Ringkasan tidak memindai seluruh daftar KPI untuk setiap karyawan', () => {
    let visits = 0;
    const data = {
        people: Array.from({length: 1000}, (_, i) => ({ id: String(i), unitId: 'u', type: 'staff' })),
        kpis: Array.from({length: 1000}, () => ({ get periodId() { visits++; return '2026-11'; }, unitId: 'u', targetRole: 'staff', weight: 0.1, active: true, assignmentMode: 'all' })),
    };
    const rows = monthlyWeightRows(data, '2026-11');
    assert.equal(rows.length, 1000);
    assert.ok(rows.every(row => row.total === 100));
    assert.equal(visits, 1000);
});

test('Mode ringan tetap mengunci periode Final dan KPI yang telah dipakai', () => {
    const data = seed();
    data.assessments = [];
    const period = data.periods[0];
    period.hasAssessments = true;
    period.hasFinal = true;
    assert.equal(periodLocked(data, period.id), true);
    assert.throws(() => savePeriod(data, clone(period), period.id, context('hc')), /Selesai/);
    const kpi = data.kpis.find(k => k.periodId === period.id);
    data.usedKpiIds = [kpi.id];
    const other = data.periods.find(p => p.id !== period.id && p.status !== 'closed');
    assert.ok(kpiErrors(data, { ...kpi, periodId: other.id }).periodId?.includes('bulan asal'));
});
