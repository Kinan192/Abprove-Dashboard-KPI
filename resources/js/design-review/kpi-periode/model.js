import { formulaErrors, expressionValue } from './formula-config.js';
export const KEY = 'abprove.design-review.kpi-sederhana.v1';
export const METHODS = {
    manual: 'Nilai Manual (10–100)',
    ratio: 'Persentase Otomatis',
    amount: 'Jumlah Otomatis',
    formula: 'Otomatis dari formula',
};
export const TARGETS = {
    staff: 'Staf',
    unit_head: 'Kepala Unit / Ruangan',
    division_head: 'Kepala Divisi',
};
export const STATUSES = {
    not_started: 'Belum Dinilai',
    draft: 'Draft',
    submitted: 'Menunggu ACC',
    returned: 'Perlu Revisi',
    final: 'Selesai',
};
export const clone = (value) => structuredClone(value);
export const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const monthLabel = (value) =>
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')
        ? 'Periode belum dipilih'
        : new Intl.DateTimeFormat('id-ID', {
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(`${value}-01T12:00:00+07:00`));
export function context(role) {
    return role === 'ku'
        ? {
              role,
              unitId: 'it',
              divisionId: 'pelayanan',
              name: 'Kepala Unit IT',
              scope: 'Teknologi Informasi',
          }
        : role === 'kd'
          ? {
                role,
                divisionId: 'pelayanan',
                name: 'Kepala Divisi Pelayanan & Penunjang',
                scope: 'Pelayanan & Penunjang',
            }
          : { role: 'hc', name: 'Super HC', scope: 'Seluruh organisasi' };
}
export function permitted(row, ctx) {
    return (
        ctx.role === 'hc' ||
        (ctx.role === 'ku' &&
            row.subjectType === 'staff' &&
            row.unitId === ctx.unitId) ||
        (ctx.role === 'kd' && row.divisionId === ctx.divisionId)
    );
}
export function audit(
    data,
    entity,
    id,
    action,
    detail = '',
    actor = 'Super HC',
) {
    data.audit.unshift({
        id: uid('audit'),
        entity,
        entityId: id,
        action,
        detail,
        actor,
        at: new Date().toISOString(),
    });
}
const numeric = (value) =>
    value !== '' && value != null && Number.isFinite(Number(value));
export function calculate(kpi, input = {}) {
    const incomplete = (message, measurement = null) => ({
        measurement,
        score: null,
        weighted: null,
        message,
    });
    if (kpi.method === 'manual') {
        if (!numeric(input.value)) return incomplete('Isi Nilai 10–100.');
        if (
            !/^\d+$/.test(String(input.value)) ||
            +input.value < 10 ||
            +input.value > 100
        )
            return incomplete('Nilai manual harus bilangan bulat 10–100.');
        return {
            measurement: null,
            score: +input.value,
            weighted: (+input.value * +kpi.weight) / 100,
            message: '',
        };
    }
    if (kpi.method !== 'formula' && !numeric(input.actual))
        return incomplete('Isi angka realisasi.');
    if (kpi.method !== 'formula' && +input.actual < 0)
        return incomplete('Realisasi tidak boleh negatif.');
    let measurement;
    if (kpi.method === 'formula') {
        try {
            measurement = expressionValue(kpi, input);
        } catch (e) {
            return incomplete(e.message);
        }
    } else measurement = +input.actual;
    if (kpi.method === 'ratio') {
        const denominator =
            kpi.denominatorSource === 'fixed'
                ? kpi.fixedDenominator
                : input.comparison;
        if (!numeric(denominator))
            return incomplete('Lengkapi angka pembanding.');
        if (+denominator <= 0)
            return incomplete(
                'Pembanding harus lebih dari nol; hasil belum dapat dihitung.',
            );
        measurement = (+input.actual / +denominator) * 100;
    }
    if (!numeric(kpi.target) || +kpi.target < 0)
        return incomplete('Target belum valid.', measurement);
    const policy = kpi.policy || {},
        max = Number(policy.max ?? 100),
        min = Number(policy.min ?? 0);
    let score;
    if (+kpi.target === 0) {
        if (policy.zeroRule !== 'zero-pass')
            return incomplete(
                'Realisasi sudah dihitung. Target nol memerlukan aturan khusus yang ditetapkan pada Pengaturan konversi nilai.',
                measurement,
            );
        score = measurement === 0 ? max : min;
    } else if (kpi.direction === 'lower') {
        if (policy.rule !== 'reverse-positive')
            return incomplete(
                'Realisasi sudah dihitung, tetapi Nilai KPI belum bisa dihitung. Buka Pengaturan konversi nilai dan pilih aturan untuk polaritas semakin rendah semakin baik.',
                measurement,
            );
        if (measurement <= 0)
            return incomplete(
                'Hasil nol memerlukan aturan khusus; normalisasi terbalik tidak dapat digunakan.',
                measurement,
            );
        score = (+kpi.target / measurement) * max;
    } else {
        if (policy.rule !== 'target-normalized')
            return incomplete(
                'Realisasi sudah dihitung, tetapi Nilai KPI belum bisa dihitung. Buka Pengaturan konversi nilai dan pilih aturan Realisasi / target × maksimum.',
                measurement,
            );
        score = (measurement / +kpi.target) * max;
    }
    score = Math.max(min, Math.min(max, score));
    if (!Number.isFinite(score))
        return incomplete('Hasil belum dapat dihitung.');
    return {
        measurement,
        score,
        weighted: (score * +kpi.weight) / 100,
        message: '',
    };
}
export function kpiErrors(data, kpi) {
    const e = {};
    if (!(kpi.name || '').trim() || kpi.name.length > 150)
        e.name = 'Isi nama KPI, maksimal 150 karakter.';
    if (!(kpi.pillar || '').trim() || kpi.pillar.length > 64)
        e.pillar = 'Isi pilar KPI, maksimal 64 karakter.';
    if (!data.units.some((u) => u.id === kpi.unitId))
        e.unitId = 'Pilih unit atau ruangan sasaran.';
    if (!TARGETS[kpi.targetRole]) e.targetRole = 'Pilih jabatan sasaran.';
    if (
        !data.periods.some(
            (p) => p.id === kpi.periodId && p.status !== 'closed',
        )
    )
        e.periodId = 'Pilih periode yang belum ditutup.';
    const previous = data.kpis.find((k) => k.id === kpi.id);
    if (
        previous &&
        previous.periodId !== kpi.periodId &&
        (data.usedKpiIds?.includes(kpi.id) || data.assessments.some((a) => a.snapshot.some((k) => k.id === kpi.id)))
    )
        e.periodId =
            'KPI sudah digunakan pada bulan asal. Buat KPI baru untuk bulan berikutnya; jangan menggeser histori.';
    if (
        !numeric(kpi.weight) ||
        +kpi.weight <= 0 ||
        +kpi.weight > 100 ||
        !/^\d{1,3}(?:\.\d{1,4})?$/.test(String(kpi.weight))
    )
        e.weight = 'Bobot harus lebih dari 0 sampai 100%, maksimal 4 desimal.';
    if (!METHODS[kpi.method]) e.method = 'Pilih metode penilaian.';
    if (kpi.method === 'manual') {
        if (!(kpi.rubric || '').trim())
            e.rubric = 'Isi panduan penilaian singkat.';
    } else {
        if (kpi.method !== 'formula' && !(kpi.actualLabel || '').trim())
            e.actualLabel = 'Isi nama input realisasi yang dipahami penilai.';
        if (!numeric(kpi.target) || +kpi.target < 0)
            e.target = 'Target harus berupa angka nol atau lebih.';
        if (kpi.method === 'ratio' && +kpi.target > 100)
            e.target = 'Target persentase maksimal 100%.';
        if (!['higher', 'lower'].includes(kpi.direction))
            e.direction = 'Pilih arah capaian.';
        if (kpi.method === 'ratio') {
            if (!(kpi.comparisonLabel || '').trim())
                e.comparisonLabel = 'Isi nama input pembanding.';
            if (!['manual', 'fixed'].includes(kpi.denominatorSource))
                e.denominatorSource = 'Pilih sumber pembanding.';
            if (
                kpi.denominatorSource === 'fixed' &&
                (!numeric(kpi.fixedDenominator) || +kpi.fixedDenominator <= 0)
            )
                e.fixedDenominator =
                    'Angka pembanding tetap harus lebih dari nol.';
        }
        if (kpi.method === 'amount' && !(kpi.unit || '').trim())
            e.unit = 'Isi satuan realisasi.';
        if (kpi.method === 'formula') {
            Object.assign(e, formulaErrors(kpi));
            if (!(kpi.unit || '').trim()) e.unit = 'Pilih satuan pengukuran.';
        }
        const p = kpi.policy || {};
        if (
            !numeric(p.min) ||
            !numeric(p.max) ||
            +p.min < 0 ||
            +p.max <= +p.min ||
            +p.max > 100
        )
            e.policy =
                'Rentang skor otomatis harus 0 ≤ minimum < maksimum ≤ 100.';
        if (kpi.active && +kpi.target === 0 && p.zeroRule !== 'zero-pass')
            e.policy =
                'Tetapkan aturan khusus target nol atau simpan KPI sebagai nonaktif.';
        if (
            kpi.active &&
            +kpi.target > 0 &&
            p.rule !==
                (kpi.direction === 'lower'
                    ? 'reverse-positive'
                    : 'target-normalized')
        )
            e.policy =
                'Tetapkan aturan konversi sesuai arah capaian atau simpan KPI sebagai nonaktif.';
    }
    if (kpi.method === 'manual' && (kpi.formula || kpi.variables?.length))
        Object.assign(e, formulaErrors(kpi));
    if (kpi.parentId) {
        const parent = data.kpis.find((k) => k.id === kpi.parentId);
        const divisionId = data.units.find(
            (u) => u.id === kpi.unitId,
        )?.divisionId;
        if (
            !parent ||
            parent.id === kpi.id ||
            parent.periodId !== kpi.periodId ||
            parent.targetRole !== 'unit_head' ||
            (parent.divisionId !== divisionId &&
                data.units.find((u) => u.id === parent.unitId)?.divisionId !==
                    divisionId)
        )
            e.parentId =
                'Pilih KPI Kepala Unit dalam divisi dan periode bulan yang sama.';
        const visited = new Set([kpi.id]);
        let cursor = parent;
        while (cursor) {
            if (visited.has(cursor.id)) {
                e.parentId = 'Hubungan KPI turunan tidak boleh melingkar.';
                break;
            }
            visited.add(cursor.id);
            cursor = data.kpis.find((k) => k.id === cursor.parentId);
        }
    }
    if (kpi.assignmentMode && !['all', 'selected'].includes(kpi.assignmentMode))
        e.assignmentMode = 'Pilih cakupan penerima KPI.';
    if (
        kpi.assignmentMode === 'selected' &&
        (!Array.isArray(kpi.assigneeIds) ||
            kpi.assigneeIds.some(
                (id) =>
                    !data.people.some(
                        (p) =>
                            p.id === id &&
                            p.unitId === kpi.unitId &&
                            p.type === kpi.targetRole,
                    ),
            ))
    )
        e.assignees = 'Penerima harus sesuai unit dan jabatan sasaran.';
    return e;
}
export function definitions(data, periodId, unitId, targetRole, personId) {
    return data.kpis.filter(
        (k) =>
            k.active &&
            k.periodId === periodId &&
            k.unitId === unitId &&
            k.targetRole === targetRole &&
            (!personId ||
                k.assignmentMode !== 'selected' ||
                k.assigneeIds?.includes(personId)),
    );
}
export function totalWeight(rows) {
    return rows.reduce((n, k) => n + Math.round(+k.weight * 10000), 0) / 10000;
}
export function saveKpi(data, input, ctx) {
    if (ctx.role !== 'hc')
        throw new Error('Master KPI hanya dapat dikelola Super HC.');
    const kpi = clone(input),
        errors = kpiErrors(data, kpi);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    kpi.id ||= uid('kpi');
    kpi.divisionId = data.units.find((u) => u.id === kpi.unitId).divisionId;
    const old = data.kpis.find((k) => k.id === kpi.id);
    kpi.revision = (old?.revision || 0) + 1;
    if (old) data.kpis[data.kpis.indexOf(old)] = kpi;
    else data.kpis.push(kpi);
    audit(
        data,
        'kpi',
        kpi.id,
        old ? 'Master KPI diperbarui' : 'Master KPI dibuat',
        kpi.name,
    );
    data.periods
        .filter((p) => p.status === 'open')
        .forEach((p) => prepareRows(data, p.id));
    return kpi;
}
export function removeKpi(data, id, ctx) {
    if (ctx.role !== 'hc')
        throw new Error('Master KPI hanya dapat dikelola Super HC.');
    if (!data.kpis.some((k) => k.id === id))
        throw new Error('KPI tidak ditemukan.');
    data.kpis = data.kpis.filter((k) => k.id !== id);
    data.kpis
        .filter((k) => k.parentId === id)
        .forEach((k) => (k.parentId = ''));
    audit(
        data,
        'kpi',
        id,
        'Master KPI dihapus',
        'Snapshot penilaian yang telah dibentuk tetap dipertahankan.',
    );
    data.periods
        .filter((p) => p.status === 'open')
        .forEach((p) => prepareRows(data, p.id));
}
export function prepareRows(data, periodId) {
    const period = data.periods.find((p) => p.id === periodId);
    if (!period || period.status !== 'open') return;
    for (const person of data.people.filter(
        (p) => p.type !== 'division_head',
    )) {
        const rows = definitions(
            data,
            periodId,
            person.unitId,
            person.type,
            person.id,
        ).map((k) => ({
            ...clone(k),
            parentName: data.kpis.find((p) => p.id === k.parentId)?.name || '',
        }));
        const existing = data.assessments.find(
            (a) => a.periodId === periodId && a.personId === person.id,
        );
        if (existing) {
            if (existing.status === 'not_started')
                existing.snapshot = clone(rows);
            continue;
        }
        if (!rows.length) continue;
        data.assessments.push({
            id: uid('assessment'),
            periodId,
            personId: person.id,
            subjectType: person.type,
            unitId: person.unitId,
            divisionId: person.divisionId,
            status: 'not_started',
            snapshot: clone(rows),
            inputs: {},
            positive: '',
            negative: '',
            history: [],
            categorySnapshot: clone(period.categories),
        });
    }
}
export function totals(row, inputs = row.inputs) {
    const results = row.snapshot.map((k) => ({
        id: k.id,
        ...calculate(k, inputs[k.id]),
    }));
    return {
        results,
        total:
            results.length && results.every((r) => r.weighted != null)
                ? results.reduce((n, r) => n + r.weighted, 0)
                : null,
    };
}
export function assess(data, id, operation, payload, ctx) {
    const row = data.assessments.find((a) => a.id === id);
    if (!row || !permitted(row, ctx))
        throw new Error('Penilaian berada di luar cakupan akun.');
    if (ctx.role === 'hc')
        throw new Error(
            'Super HC hanya memantau hasil; tidak mengisi atau memutuskan penilaian.',
        );
    if (row.status === 'final')
        throw new Error('Penilaian Selesai terkunci dan hanya dapat dibaca.');
    const period = data.periods.find((p) => p.id === row.periodId);
    if (period.status !== 'open')
        throw new Error('Periode tidak aktif untuk pengisian atau keputusan.');
    const direct = row.subjectType === 'unit_head';
    const canWrite = direct ? ctx.role === 'kd' : ctx.role === 'ku';
    const previous = row.status;
    if (['draft', 'send', 'complete'].includes(operation)) {
        if (
            !canWrite ||
            !['not_started', 'draft', 'returned'].includes(row.status)
        )
            throw new Error('Role atau status tidak mengizinkan pengisian.');
        if (
            (operation === 'send' && direct) ||
            (operation === 'complete' && !direct)
        )
            throw new Error('Tindakan tidak sesuai jalur penilaian.');
        const inputs = clone(payload.inputs || {});
        for (const kpi of row.snapshot) {
            const value = inputs[kpi.id];
            if (
                kpi.method === 'manual' &&
                value?.value !== '' &&
                value?.value != null &&
                calculate(kpi, value).score == null
            )
                throw new Error('Nilai manual harus bilangan bulat 10–100.');
        }
        if (operation !== 'draft') {
            if (totalWeight(row.snapshot) !== 100)
                throw new Error(
                    'Total bobot KPI harus 100% sebelum penilaian dikirim atau diselesaikan.',
                );
            const result = totals(row, inputs);
            if (result.total == null)
                throw new Error(
                    'Lengkapi data pengukuran yang valid pada seluruh KPI.',
                );
        }
        row.inputs = inputs;
        row.positive = payload.positive || '';
        row.negative = payload.negative || '';
        row.status =
            operation === 'draft' ? 'draft' : direct ? 'final' : 'submitted';
    } else if (['approve', 'return'].includes(operation)) {
        if (ctx.role !== 'kd' || direct || row.status !== 'submitted')
            throw new Error(
                'Hanya Kepala Divisi dapat memutuskan penilaian staf yang menunggu ACC.',
            );
        if (operation === 'return' && !(payload.reason || '').trim())
            throw new Error('Alasan revisi wajib diisi.');
        row.status = operation === 'approve' ? 'final' : 'returned';
    } else throw new Error('Tindakan tidak diizinkan pada alur KPI.');
    if (row.status === 'final') {
        row.finalTotal = totals(row).total;
        row.completedAt = new Date().toISOString();
        row.completedBy = ctx.name;
    }
    row.history.unshift({
        from: previous,
        to: row.status,
        actor: ctx.name,
        reason: payload.reason || '',
        at: new Date().toISOString(),
    });
    audit(
        data,
        'assessment',
        id,
        STATUSES[row.status],
        payload.reason || '',
        ctx.name,
    );
    return row;
}
export function periodErrors(data, period) {
    const e = {};
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period.id || ''))
        e.month = 'Pilih bulan penilaian yang valid.';
    if (!(period.name || '').trim()) e.name = 'Nama periode wajib diisi.';
    const keys = ['opens', 'submission', 'approval', 'closes'];
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!period[k] || !Number.isFinite(Date.parse(`${period[k]}+07:00`)))
            e[k] = 'Isi tanggal dan jam WIB yang valid.';
        else if (i && period[k] < period[keys[i - 1]])
            e[k] = 'Jadwal harus setelah atau sama dengan tahap sebelumnya.';
    }
    const c = period.categories || {};
    if (!(+c.sb > +c.b && +c.b > +c.c && +c.c > 0 && +c.sb <= 100))
        e.categories = 'Batas harus 0 < Cukup < Baik < Sangat Baik ≤ 100.';
    return e;
}
export function savePeriod(data, period, originalId, ctx) {
    if (ctx.role !== 'hc')
        throw new Error('Pengaturan periode hanya untuk Super HC.');
    const e = periodErrors(data, period);
    if (Object.keys(e).length) throw new Error(Object.values(e)[0]);
    const old = data.periods.find((p) => p.id === originalId);
    if (data.periods.some((p) => p.id === period.id && p !== old))
        throw new Error('Periode bulan ini sudah tersedia.');
    if (old && (old.hasAssessments || data.assessments.some((a) => a.periodId === old.id))) {
        if (old.id !== period.id)
            throw new Error(
                'Bulan yang sudah memiliki penilaian tidak dapat digeser.',
            );
        if (
            old.hasFinal || data.assessments.some(
                (a) => a.periodId === old.id && a.status === 'final',
            )
        )
            throw new Error(
                'Periode memiliki hasil Selesai. Gunakan periode berikutnya untuk perubahan.',
            );
    }
    if (
        period.status === 'closed' &&
        (old?.hasPending || data.assessments.some(
            (a) => a.periodId === period.id && a.status !== 'final',
        ))
    )
        throw new Error(
            'Masih ada penilaian belum Selesai; periode belum dapat ditutup.',
        );
    if (old) data.periods[data.periods.indexOf(old)] = clone(period);
    else data.periods.push(clone(period));
    prepareRows(data, period.id);
    audit(
        data,
        'period',
        period.id,
        old ? 'Periode diperbarui' : 'Periode dibuat',
    );
    return period;
}
export function emptyKpi(periodId = '2026-11') {
    return {
        id: '',
        name: '',
        pillar: 'Technical Care',
        unitId: '',
        targetRole: 'staff',
        weight: '',
        periodId,
        method: 'manual',
        variables: [],
        formula: '',
        parentId: '',
        assignmentMode: 'all',
        assigneeIds: [],
        rubric: 'Nilai kualitas pelaksanaan tugas berdasarkan bukti dan rubrik yang ditetapkan.',
        actualLabel: '',
        comparisonLabel: '',
        denominatorSource: 'manual',
        fixedDenominator: '',
        target: '',
        unit: 'kegiatan',
        direction: 'higher',
        active: true,
        policy: {
            rule: 'target-normalized',
            zeroRule: 'pending',
            min: 0,
            max: 100,
        },
    };
}
export function seed() {
    const data = {
        version: 1,
        revision: 0,
        kpis: [],
        assessments: [],
        audit: [],
        units: [
            { id: 'it', name: 'Teknologi Informasi', divisionId: 'pelayanan' },
            { id: 'yanmed', name: 'Pelayanan Medis', divisionId: 'pelayanan' },
            {
                id: 'igd',
                name: 'Instalasi Gawat Darurat',
                divisionId: 'pelayanan',
            },
            { id: 'rawat-inap', name: 'Rawat Inap', divisionId: 'keperawatan' },
        ],
        people: [
            {
                id: 'staff-it-1',
                name: 'Aditya Pratama',
                nip: 'RSAB-IT-001',
                type: 'staff',
                unitId: 'it',
                divisionId: 'pelayanan',
            },
            {
                id: 'staff-it-2',
                name: 'Nadia Putri',
                nip: 'RSAB-IT-002',
                type: 'staff',
                unitId: 'it',
                divisionId: 'pelayanan',
            },
            {
                id: 'staff-it-3',
                name: 'Fajar Ramadhan',
                nip: 'RSAB-IT-003',
                type: 'staff',
                unitId: 'it',
                divisionId: 'pelayanan',
            },
            {
                id: 'staff-igd-1',
                name: 'Rani Kartika',
                nip: 'RSAB-IGD-001',
                type: 'staff',
                unitId: 'igd',
                divisionId: 'pelayanan',
            },
            {
                id: 'staff-inap-1',
                name: 'Diah Permata',
                nip: 'RSAB-RI-001',
                type: 'staff',
                unitId: 'rawat-inap',
                divisionId: 'keperawatan',
            },
            {
                id: 'head-it',
                name: 'Rizky Mahendra',
                nip: 'RSAB-KU-001',
                type: 'unit_head',
                unitId: 'it',
                divisionId: 'pelayanan',
            },
            {
                id: 'head-med',
                name: 'dr. Andini Prameswari',
                nip: 'RSAB-KU-002',
                type: 'unit_head',
                unitId: 'yanmed',
                divisionId: 'pelayanan',
            },
        ],
        periods: ['2026-10', '2026-11', '2026-12'].map((id, i) => ({
            id,
            name: `Penilaian ${monthLabel(id)}`,
            status: i === 0 ? 'closed' : i === 1 ? 'open' : 'planned',
            opens: `2026-${i === 2 ? '12' : String(11 + i).padStart(2, '0')}-01T08:00`,
            submission: `2026-${i === 2 ? '12' : String(11 + i).padStart(2, '0')}-05T23:59`,
            approval: `2026-${i === 2 ? '12' : String(11 + i).padStart(2, '0')}-10T23:59`,
            closes: `2026-${i === 2 ? '12' : String(11 + i).padStart(2, '0')}-15T23:59`,
            categories: { sb: 90, b: 80, c: 70 },
        })),
    };
    for (const period of data.periods) {
        const add = (suffix, values) =>
            data.kpis.push({
                ...emptyKpi(period.id),
                id: `${period.id}-${suffix}`,
                revision: 1,
                ...values,
            });
        add('it-sla', {
            name: 'Penyelesaian Tiket IT Sesuai SLA',
            unitId: 'it',
            method: 'ratio',
            actualLabel: 'Tiket selesai sesuai SLA',
            comparisonLabel: 'Total tiket yang dinilai',
            target: 95,
            weight: 15,
        });
        add('it-training', {
            name: 'Penyelesaian pelatihan teknis',
            unitId: 'it',
            method: 'amount',
            actualLabel: 'Jumlah pelatihan selesai',
            target: 10,
            weight: 25,
            unit: 'kegiatan',
            pillar: 'Access',
        });
        add('it-quality', {
            name: 'Kualitas layanan dan dokumentasi IT',
            unitId: 'it',
            weight: 60,
            pillar: 'Interpersonal Care',
        });
        add('head-med-doctors', {
            name: 'Penambahan Dokter Spesialis',
            unitId: 'yanmed',
            targetRole: 'unit_head',
            method: 'ratio',
            actualLabel: 'Dokter baru bergabung',
            comparisonLabel: 'Dokter direncanakan',
            denominatorSource: 'fixed',
            fixedDenominator: 4,
            target: 95,
            weight: 20,
        });
        add('head-med-coordination', {
            name: 'Kualitas Koordinasi Tim',
            unitId: 'yanmed',
            targetRole: 'unit_head',
            weight: 10,
            pillar: 'Coordination and Continuity',
        });
        add('head-med-services', {
            name: 'Pengelolaan mutu pelayanan medis',
            unitId: 'yanmed',
            targetRole: 'unit_head',
            weight: 70,
        });
        add('head-it-quality', {
            name: 'Kualitas Koordinasi Tim',
            unitId: 'it',
            targetRole: 'unit_head',
            weight: 100,
            pillar: 'Coordination and Continuity',
        });
        add('igd-quality', {
            name: 'Kelengkapan dokumentasi pelayanan IGD',
            unitId: 'igd',
            weight: 100,
        });
        add('inap-quality', {
            name: 'Kepatuhan asesmen keperawatan',
            unitId: 'rawat-inap',
            weight: 100,
        });
        add('head-division', {
            name: 'Pengelolaan kinerja divisi',
            unitId: 'yanmed',
            targetRole: 'division_head',
            weight: 100,
        });
    }
    prepareRows(data, '2026-11');
    const staff = data.assessments.filter(
        (a) => a.subjectType === 'staff' && a.unitId === 'it',
    );
    const payload = (a) => ({
        inputs: Object.fromEntries(
            a.snapshot.map((k) => [
                k.id,
                k.method === 'manual'
                    ? { value: 85 }
                    : k.method === 'ratio'
                      ? {
                            actual: k.denominatorSource === 'fixed' ? 3 : 65,
                            comparison: 80,
                        }
                      : { actual: 8 },
            ]),
        ),
        positive: 'Tindak lanjut layanan terdokumentasi dengan baik.',
        negative: '',
    });
    for (let i = 0; i < staff.length; i++) {
        const a = staff[i];
        assess(data, a.id, 'send', payload(a), context('ku'));
        if (i === 1)
            assess(
                data,
                a.id,
                'return',
                { reason: 'Lengkapi bukti penyelesaian tiket.' },
                context('kd'),
            );
        if (i === 2) assess(data, a.id, 'approve', {}, context('kd'));
    }
    const oct = data.periods[0];
    oct.status = 'open';
    prepareRows(data, oct.id);
    for (const a of data.assessments.filter((a) => a.periodId === oct.id)) {
        const writer =
            a.subjectType === 'staff'
                ? { role: 'ku', unitId: a.unitId, name: 'Kepala Unit' }
                : {
                      role: 'kd',
                      divisionId: a.divisionId,
                      name: 'Kepala Divisi',
                  };
        assess(
            data,
            a.id,
            a.subjectType === 'staff' ? 'send' : 'complete',
            payload(a),
            writer,
        );
        if (a.subjectType === 'staff')
            assess(
                data,
                a.id,
                'approve',
                {},
                { role: 'kd', divisionId: a.divisionId, name: 'Kepala Divisi' },
            );
    }
    oct.status = 'closed';
    return data;
}
