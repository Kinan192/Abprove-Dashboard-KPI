import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    seedGoals,
    emptyGoal,
    emptyCycle,
} from '../../resources/js/abprove/goals/fixtures.js';
import {
    clone,
    measurementErrors,
    goalErrors,
    templateErrors,
    templateGoals,
    saveGoal,
    publishTemplate,
    duplicateGoal,
    removeGoal,
    monthRange,
    cycleErrors,
    saveCycle,
    activateCycle,
    repeatCycle,
    closeCycle,
    assessmentAction,
    assessmentTotal,
    achievement,
} from '../../resources/js/abprove/goals/domain.js';

function draft(data, weight = 100) {
    return {
        ...emptyGoal('2026-12'),
        name: 'Kepatuhan audit layanan',
        templateId: 'tpl-sdm',
        ownerId: 'admin',
        weight: String(weight),
    };
}
test('Fixtures memiliki enam status, hierarki valid, dan bobot template 100%', () => {
    const d = seedGoals();
    assert.deepEqual(
        new Set(d.assessments.map((a) => a.status)),
        new Set([
            'Belum diisi',
            'Draft',
            'Diajukan',
            'Dikembalikan',
            'Disetujui',
            'Final',
        ]),
    );
    for (const t of d.templates)
        assert.deepEqual(templateErrors(d, t.id, '2026-11'), []);
    for (const a of d.assessments) {
        const staff = d.staff.find((p) => p.id === a.staffId);
        assert.equal(staff.unitId, a.unitId);
        assert.equal(staff.divisionId, a.divisionId);
        assert.ok(a.snapshot.length);
    }
});
for (const [direction, baseline, target, valid] of [
    ['increase', 80, 95, true],
    ['increase', 95, 80, false],
    ['decrease', 95, 80, true],
    ['decrease', 80, 95, false],
    ['increase', 80, 80, false],
    ['decrease', 80, 80, false],
])
    test(`Pengukuran ${direction} ${baseline} → ${target}`, () => {
        assert.equal(
            Object.keys(
                measurementErrors({
                    ...emptyGoal(),
                    direction,
                    baseline,
                    target,
                }),
            ).length === 0,
            valid,
        );
    });
test('Target dan baseline wajib numerik, satuan persentase dibatasi', () => {
    for (const g of [
        { target: 'abc' },
        { baseline: '' },
        { target: 101 },
        { baseline: -1 },
        { unit: 'idr', target: -10 },
    ])
        assert.ok(
            Object.keys(measurementErrors({ ...emptyGoal(), ...g })).length,
        );
    assert.deepEqual(
        measurementErrors({ ...emptyGoal(), noBaseline: true, baseline: '' }),
        {},
    );
    assert.equal(
        achievement({ ...emptyGoal(), noBaseline: true, actual: 90 }),
        null,
    );
});
test('Draft Goal parsial boleh disimpan, publikasi ditolak', () => {
    const d = seedGoals(),
        g = saveGoal(d, { ...emptyGoal('2026-12'), name: '' });
    assert.equal(g.status, 'draft');
    assert.ok(g.code);
    assert.throws(() => saveGoal(d, { ...g }, true), /Nama Goal/);
});
test('Bobot 85% atau 110% tidak bisa dipublikasikan', () => {
    const d = seedGoals();
    assert.throws(() => saveGoal(d, draft(d, 85), true), /85%/);
    saveGoal(d, draft(d, 60));
    assert.throws(
        () =>
            saveGoal(d, { ...draft(d, 50), name: 'Indikator tambahan' }, true),
        /110%/,
    );
});
test('Publikasi template dengan beberapa Goal hanya jika seluruhnya valid dan 100%', () => {
    const d = seedGoals(),
        a = saveGoal(d, draft(d, 60)),
        b = saveGoal(d, { ...draft(d, 40), name: 'Akurasi dokumen layanan' });
    publishTemplate(d, 'tpl-sdm', '2026-12');
    assert.equal(a.status, 'active');
    assert.equal(b.status, 'active');
    assert.throws(
        () => saveGoal(d, { ...a, name: 'Ubah master langsung' }),
        /tidak ditimpa/,
    );
});
test('Duplikasi tidak menyalin aktual dan tidak boleh menambah bobot secara diam-diam', () => {
    const d = seedGoals(),
        source = templateGoals(d, 'tpl-sdm', '2026-11')[0];
    source.actual = 92;
    const copy = duplicateGoal(source);
    assert.equal(copy.actual, null);
    assert.equal(copy.id, '');
    assert.equal(copy.status, 'draft');
    assert.throws(() => saveGoal(d, copy, true), /160%/);
});
test('KR opsional dan bobot KR yang diaktifkan harus 100%', () => {
    const d = seedGoals(),
        g = draft(d);
    assert.deepEqual(goalErrors(d, g), {});
    g.keyResults = [
        { ...emptyGoal(), id: 'kr1', name: 'Audit selesai', weight: 50 },
    ];
    g.krWeighted = true;
    assert.match(goalErrors(d, g).keyResults, /100%/);
    g.keyResults[0].weight = 100;
    assert.deepEqual(goalErrors(d, g), {});
});
test('Oktober yang dinilai dapat diproses November; rentang satu bulan penuh', () => {
    assert.deepEqual(monthRange('2026-10'), ['2026-10-01', '2026-10-31']);
    assert.deepEqual(monthRange('2028-02'), ['2028-02-01', '2028-02-29']);
    const d = seedGoals(),
        c = emptyCycle('2027-01');
    assert.equal(c.opens.slice(0, 7), '2027-02');
    assert.deepEqual(cycleErrors(d, c), {});
});
test('Bulan unik dan jadwal berurutan divalidasi', () => {
    const d = seedGoals();
    assert.match(cycleErrors(d, emptyCycle('2026-11')).month, /sudah/);
    const c = emptyCycle('2027-01');
    c.approval = c.opens;
    assert.ok(cycleErrors(d, c).approval);
    c.approval = c.submission;
    c.finalization = c.approval;
    c.closes = c.finalization;
    assert.deepEqual(cycleErrors(d, c), {});
});
test('Periode Final tidak dapat diganti identitas maupun kategori', () => {
    const d = seedGoals(),
        c = clone(d.cycles.find((c) => c.id === '2026-10'));
    c.name = 'Diubah';
    assert.throws(() => saveCycle(d, c), /Final/);
});
test('Pengulangan menyalin definisi saja, tanpa skor, temuan, aktual, atau keputusan', () => {
    const d = seedGoals(),
        source = d.goals.find((g) => g.cycleId === '2026-11');
    source.actual = 99;
    const finals = JSON.stringify(
        d.assessments.filter((a) => a.status === 'Final'),
    );
    const next = repeatCycle(d, '2026-11', '2027-01');
    assert.equal(next.status, 'draft');
    assert.deepEqual(next.bindings, {});
    const copies = d.goals.filter((g) => g.cycleId === next.id);
    assert.equal(copies.length, 23);
    assert.ok(
        copies.every(
            (g) => g.actual === null && g.status === 'draft' && g.sourceId,
        ),
    );
    assert.equal(d.assessments.filter((a) => a.cycleId === next.id).length, 0);
    assert.equal(
        JSON.stringify(d.assessments.filter((a) => a.status === 'Final')),
        finals,
    );
    assert.throws(() => repeatCycle(d, '2026-11', '2026-12'), /sudah tersedia/);
});
test('Aktivasi memerlukan template terbit 100% dan membuat satu snapshot per karyawan', () => {
    const d = seedGoals(),
        c = repeatCycle(d, '2026-11', '2027-01');
    assert.throws(() => activateCycle(d, c.id), /Publikasikan/);
    c.templateIds.forEach((id) => publishTemplate(d, id, c.id));
    activateCycle(d, c.id);
    const rows = d.assessments.filter((a) => a.cycleId === c.id);
    assert.equal(rows.length, 6);
    assert.equal(new Set(rows.map((a) => a.staffId)).size, rows.length);
    assert.ok(
        rows.every(
            (a) =>
                a.status === 'Belum diisi' &&
                Object.keys(a.scores).length === 0 &&
                a.history.length === 0,
        ),
    );
    const before = JSON.stringify(rows[0].snapshot);
    d.goals.find((g) => g.id === rows[0].snapshot[0].id).target = '1';
    assert.equal(JSON.stringify(rows[0].snapshot), before);
    assert.throws(() => activateCycle(d, c.id), /Hanya periode/);
});
test('Alur KU Draft → Diajukan → KD Disetujui → HC Final, tanpa mengubah nilai', () => {
    const d = seedGoals(),
        a = d.assessments.find((a) => a.status === 'Belum diisi'),
        ku = { role: 'ku', unitId: a.unitId },
        kd = { role: 'kd', divisionId: a.divisionId };
    const scores = Object.fromEntries(a.snapshot.map((g) => [g.id, 85]));
    assessmentAction(d, a.id, 'draft', { scores }, ku);
    assert.equal(a.status, 'Draft');
    assessmentAction(d, a.id, 'submit', { scores }, ku);
    assert.equal(a.status, 'Diajukan');
    assert.throws(
        () => assessmentAction(d, a.id, 'finalize', {}, { role: 'hc' }),
        /Disetujui/,
    );
    assessmentAction(
        d,
        a.id,
        'approve',
        { scores: Object.fromEntries(a.snapshot.map((g) => [g.id, 100])) },
        kd,
    );
    assert.equal(a.status, 'Disetujui');
    assert.equal(assessmentTotal(a), 85);
    assessmentAction(d, a.id, 'finalize', {}, { role: 'hc' });
    assert.equal(a.status, 'Final');
    assert.equal(a.finalTotal, 85);
    assert.equal(a.finalCategory, 'Baik');
    assert.throws(
        () => assessmentAction(d, a.id, 'draft', { scores }, ku),
        /terkunci/,
    );
});
test('Kepala Unit hanya unit sendiri, KD hanya divisi sendiri, HC tidak boleh approve', () => {
    const d = seedGoals(),
        a = d.assessments.find((a) => a.status === 'Diajukan');
    assert.throws(
        () =>
            assessmentAction(
                d,
                a.id,
                'withdraw',
                {},
                { role: 'ku', unitId: 'rawat-inap' },
            ),
        /luar cakupan/,
    );
    assert.throws(
        () =>
            assessmentAction(
                d,
                a.id,
                'approve',
                {},
                { role: 'kd', divisionId: 'keperawatan' },
            ),
        /luar cakupan/,
    );
    assert.throws(
        () => assessmentAction(d, a.id, 'approve', {}, { role: 'hc' }),
        /Role/,
    );
});
test('Nilai harus integer 10–100, pengajuan harus lengkap, penarikan kembali menjadi Draft', () => {
    const d = seedGoals(),
        a = d.assessments.find((a) => a.status === 'Belum diisi'),
        ku = { role: 'ku', unitId: a.unitId };
    for (const value of [9, 101, 85.5, '8e1', 'abc'])
        assert.throws(
            () =>
                assessmentAction(
                    d,
                    a.id,
                    'draft',
                    { scores: { [a.snapshot[0].id]: value } },
                    ku,
                ),
            /bilangan bulat/,
        );
    assert.throws(
        () => assessmentAction(d, a.id, 'submit', { scores: {} }, ku),
        /Lengkapi/,
    );
    const scores = Object.fromEntries(a.snapshot.map((g) => [g.id, 80]));
    assessmentAction(d, a.id, 'submit', { scores }, ku);
    assessmentAction(d, a.id, 'withdraw', {}, ku);
    assert.equal(a.status, 'Draft');
    assert.deepEqual(a.scores, scores);
});
test('Pengembalian memerlukan alasan dan dapat diajukan ulang', () => {
    const d = seedGoals(),
        a = d.assessments.find((a) => a.status === 'Diajukan'),
        kd = { role: 'kd', divisionId: a.divisionId };
    assert.throws(() => assessmentAction(d, a.id, 'return', {}, kd), /Alasan/);
    assessmentAction(
        d,
        a.id,
        'return',
        { reason: 'Lengkapi bukti audit.' },
        kd,
    );
    assert.equal(a.status, 'Dikembalikan');
    assert.equal(a.history[0].reason, 'Lengkapi bukti audit.');
    assessmentAction(
        d,
        a.id,
        'submit',
        { scores: clone(a.scores) },
        { role: 'ku', unitId: a.unitId },
    );
    assert.equal(a.status, 'Diajukan');
});
test('Aktual / progress tidak otomatis menjadi nilai 10–100', () => {
    const g = { ...emptyGoal(), baseline: 80, target: 95, actual: 92 };
    assert.equal(achievement(g), 80);
    const d = seedGoals(),
        a = d.assessments.find((a) => a.status === 'Disetujui'),
        before = clone(a.scores);
    d.goals.find((g) => g.id === a.snapshot[0].id).actual = 92;
    assert.deepEqual(a.scores, before);
    assert.equal(achievement({ ...g, actual: 98 }), 120);
});
test('Hapus hanya Draft belum dipakai; arsip tidak menghilangkan snapshot', () => {
    const d = seedGoals(),
        g = d.goals.find((g) => g.cycleId === '2026-10'),
        before = JSON.stringify(d.assessments);
    assert.throws(() => removeGoal(d, g.id), /hanya dapat diarsipkan/);
    removeGoal(d, g.id, true);
    assert.equal(JSON.stringify(d.assessments), before);
    const draftGoal = saveGoal(d, draft(d));
    removeGoal(d, draftGoal.id);
    assert.ok(!d.goals.some((g) => g.id === draftGoal.id));
});
test('Penutupan tidak mengubah pengajuan menjadi Final dan diblokir saat tertunda', () => {
    const d = seedGoals(),
        before = JSON.stringify(d.assessments);
    assert.throws(() => closeCycle(d, '2026-11'), /belum Final/);
    assert.equal(JSON.stringify(d.assessments), before);
});
