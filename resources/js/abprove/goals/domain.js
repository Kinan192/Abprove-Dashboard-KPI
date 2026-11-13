export const TYPES = {
    individual: 'Individual · KPI Karyawan',
    team: 'Team · KPI Unit',
    organization: 'Organization · KPI Divisi',
    company: 'Company · KPI Rumah Sakit',
};
export const PILLARS = [
    'Technical Care',
    'Access',
    'Coordination and Continuity',
    'Interpersonal Care',
    'Efficient',
];
export const GOAL_STATUSES = {
    draft: 'Draft',
    active: 'Aktif',
    complete: 'Selesai',
    archived: 'Diarsipkan',
};
export const CYCLE_STATUSES = {
    draft: 'Draft',
    scheduled: 'Terjadwal',
    active: 'Aktif',
    approval: 'Proses persetujuan',
    closed: 'Ditutup',
    archived: 'Diarsipkan',
};
export const ASSESSMENT_STATUSES = [
    'Belum diisi',
    'Draft',
    'Diajukan',
    'Dikembalikan',
    'Disetujui',
    'Final',
];
export const clone = (value) => structuredClone(value);
export const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const monthLabel = (month) =>
    new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(`${month}-01T12:00:00+07:00`));
export const nextMonth = (month) => {
    const [year, value] = month.split('-').map(Number);
    return `${value === 12 ? year + 1 : year}-${String(value === 12 ? 1 : value + 1).padStart(2, '0')}`;
};
export function monthRange(month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return ['', ''];
    const [year, value] = month.split('-').map(Number);
    return [
        `${month}-01`,
        `${month}-${new Date(Date.UTC(year, value, 0)).getUTCDate()}`,
    ];
}
const present = (value) =>
    value !== '' && value != null && Number.isFinite(Number(value));
const weightNumber = (value) => Math.round(Number(value) * 10000);
export function measurementErrors(goal) {
    const e = {};
    if (!['increase', 'decrease'].includes(goal.direction))
        e.direction = 'Pilih Increase atau Decrease KPI.';
    if (!['percent', 'number', 'idr'].includes(goal.unit))
        e.unit = 'Pilih %, Angka, atau Rupiah.';
    if (!present(goal.target))
        e.target = 'Target harus berupa angka yang valid.';
    if (!goal.noBaseline && !present(goal.baseline))
        e.baseline = 'Isi baseline atau pilih Tanpa baseline.';
    if (
        present(goal.target) &&
        goal.unit === 'percent' &&
        (+goal.target < 0 || +goal.target > 100)
    )
        e.target = 'Target persentase harus antara 0 dan 100.';
    if (
        !goal.noBaseline &&
        present(goal.baseline) &&
        goal.unit === 'percent' &&
        (+goal.baseline < 0 || +goal.baseline > 100)
    )
        e.baseline = 'Baseline persentase harus antara 0 dan 100.';
    if (goal.unit === 'idr' && present(goal.target) && +goal.target < 0)
        e.target = 'Target Rupiah tidak boleh negatif.';
    if (
        goal.unit === 'idr' &&
        !goal.noBaseline &&
        present(goal.baseline) &&
        +goal.baseline < 0
    )
        e.baseline = 'Baseline Rupiah tidak boleh negatif.';
    if (!goal.noBaseline && present(goal.target) && present(goal.baseline)) {
        if (goal.direction === 'increase' && +goal.target <= +goal.baseline)
            e.target =
                'Target harus lebih besar dari baseline untuk Increase KPI.';
        if (goal.direction === 'decrease' && +goal.target >= +goal.baseline)
            e.target =
                'Target harus lebih kecil dari baseline untuk Decrease KPI.';
    }
    return e;
}
export function goalErrors(data, goal) {
    const e = measurementErrors(goal);
    if (!TYPES[goal.type]) e.type = 'Pilih jenis Goal.';
    if ((goal.name || '').trim().length < 5 || (goal.name || '').length > 150)
        e.name = 'Nama Goal wajib 5–150 karakter.';
    if (!(goal.pillar || '').trim() || goal.pillar.length > 64)
        e.pillar = 'Isi pilar, maksimal 64 karakter.';
    if (
        !data.cycles.some(
            (c) =>
                c.id === goal.cycleId &&
                !['closed', 'archived'].includes(c.status),
        )
    )
        e.cycleId = 'Pilih periode yang belum ditutup atau diarsipkan.';
    if (
        !present(goal.weight) ||
        +goal.weight <= 0 ||
        +goal.weight > 100 ||
        !/^\d{1,3}(?:\.\d{1,4})?$/.test(String(goal.weight))
    )
        e.weight = 'Bobot wajib lebih dari 0 sampai 100%, maksimal 4 desimal.';
    if (
        goal.type === 'individual' &&
        !data.templates.some((t) => t.id === goal.templateId && t.active)
    )
        e.templateId = 'Pilih template jabatan yang aktif.';
    if (goal.type === 'team' && !data.units.some((u) => u.id === goal.ownerId))
        e.ownerId = 'Pilih unit pemilik Goal.';
    if (
        goal.type === 'organization' &&
        !data.divisions.some((d) => d.id === goal.ownerId)
    )
        e.ownerId = 'Pilih divisi pemilik Goal.';
    if (goal.type === 'company' && goal.ownerId !== 'hospital')
        e.ownerId = 'Pemilik Company Goal adalah rumah sakit.';
    if (
        (goal.keyResults || []).some(
            (kr) =>
                !(kr.name || '').trim() ||
                Object.keys(measurementErrors(kr)).length,
        )
    )
        e.keyResults = 'Lengkapi nama dan pengukuran seluruh Key Result.';
    if (
        goal.krWeighted &&
        weightNumber(
            (goal.keyResults || []).reduce(
                (n, kr) => n + Number(kr.weight || 0),
                0,
            ),
        ) !== 1000000
    )
        e.keyResults = 'Total bobot Key Result harus 100%.';
    return e;
}
export function templateGoals(data, templateId, cycleId, candidate) {
    const rows = data.goals.filter(
        (g) =>
            g.templateId === templateId &&
            g.cycleId === cycleId &&
            g.status !== 'archived' &&
            g.id !== candidate?.id &&
            g.id !== candidate?.replacesId,
    );
    return candidate ? [...rows, candidate] : rows;
}
export const templateWeight = (rows) =>
    Math.round(rows.reduce((n, g) => n + weightNumber(g.weight || 0), 0)) /
    10000;
export function templateErrors(data, templateId, cycleId, candidate) {
    const rows = templateGoals(data, templateId, cycleId, candidate),
        errors = [];
    if (!rows.length) errors.push('Tambahkan minimal satu KPI pada template.');
    if (templateWeight(rows) !== 100)
        errors.push(
            `Bobot template ${templateWeight(rows)}%. Lengkapi menjadi 100% sebelum dipublikasikan.`,
        );
    rows.forEach((g) => {
        if (Object.keys(goalErrors(data, g)).length)
            errors.push(`Lengkapi Goal: ${g.name || 'Tanpa nama'}.`);
    });
    return errors;
}
export function cycleErrors(data, cycle, existingId) {
    const e = {};
    if (!(cycle.name || '').trim()) e.name = 'Nama periode wajib diisi.';
    if (!monthRange(cycle.month)[0])
        e.month = 'Pilih bulan dan tahun penilaian.';
    if (data.cycles.some((c) => c.month === cycle.month && c.id !== existingId))
        e.month = 'Periode untuk bulan dan tahun ini sudah tersedia.';
    const dates = ['opens', 'submission', 'approval', 'finalization', 'closes'];
    const labels = {
        opens: 'Mulai pengisian',
        submission: 'Batas pengajuan',
        approval: 'Batas persetujuan',
        finalization: 'Batas finalisasi',
        closes: 'Penutupan',
    };
    for (let i = 0; i < dates.length; i++) {
        const field = dates[i],
            value = cycle[field];
        if (!value || !Number.isFinite(Date.parse(`${value}+07:00`)))
            e[field] =
                `${labels[field]} wajib berupa tanggal dan jam yang valid.`;
        else if (i && value < cycle[dates[i - 1]])
            e[field] =
                `${labels[field]} harus setelah atau sama dengan jadwal sebelumnya.`;
    }
    if (!(
        +cycle.categories?.sb > +cycle.categories?.b &&
        +cycle.categories?.b > +cycle.categories?.c &&
        +cycle.categories?.c > 0 &&
        +cycle.categories?.sb <= 100
    ))
        e.categories = 'Batas harus 0 < Cukup < Baik < Sangat Baik ≤ 100.';
    const previous = data.cycles.find((c) => c.id === existingId);
    if (previous && data.assessments.some((a) => a.cycleId === previous.id)) {
        if (cycle.month !== previous.month)
            e.month =
                'Bulan periode yang sudah memiliki penilaian tidak dapat digeser.';
        if (
            JSON.stringify([...cycle.templateIds].sort()) !==
            JSON.stringify([...previous.templateIds].sort())
        )
            e.templateIds =
                'Template periode berjalan tetap memakai snapshot aktivasi. Gunakan periode berikutnya.';
    }
    if (
        previous &&
        data.assessments.some(
            (a) => a.cycleId === previous.id && a.status === 'Final',
        )
    )
        e.locked =
            'Periode sudah memiliki hasil Final. Gunakan periode berikutnya untuk perubahan.';
    return e;
}
export function category(total, categories = { sb: 90, b: 80, c: 70 }) {
    return total >= +categories.sb
        ? 'Sangat Baik'
        : total >= +categories.b
          ? 'Baik'
          : total >= +categories.c
            ? 'Cukup'
            : 'Kurang';
}
export function achievement(goal) {
    if (
        goal.noBaseline ||
        !present(goal.actual) ||
        Object.keys(measurementErrors(goal)).length
    )
        return null;
    return (
        Math.round(
            ((goal.direction === 'increase'
                ? +goal.actual - +goal.baseline
                : +goal.baseline - +goal.actual) /
                Math.abs(+goal.target - +goal.baseline)) *
                10000,
        ) / 100
    );
}
export function assessmentTotal(assessment) {
    const scores = assessment.scores || {};
    if (
        assessment.snapshot.some(
            (g) =>
                !/^\d+$/.test(String(scores[g.id] ?? '')) ||
                +scores[g.id] < 10 ||
                +scores[g.id] > 100,
        )
    )
        return null;
    return (
        Math.round(
            assessment.snapshot.reduce(
                (n, g) => n + (+scores[g.id] * +g.weight) / 100,
                0,
            ) * 1000000,
        ) / 1000000
    );
}
function fail(message) {
    throw new Error(message);
}
export function record(data, entity, id, action, detail = '') {
    data.audit.unshift({
        id: uid('audit'),
        entity,
        entityId: id,
        action,
        detail,
        at: new Date().toISOString(),
    });
}
export function saveGoal(data, input, publish = false) {
    const goal = clone(input),
        existing = data.goals.find((g) => g.id === goal.id);
    if (existing && existing.status !== 'draft')
        fail('Goal terbit tidak ditimpa. Buat versi berikutnya.');
    if (
        !data.cycles.some(
            (c) =>
                c.id === goal.cycleId &&
                !['closed', 'archived'].includes(c.status),
        )
    )
        fail('Pilih periode yang belum ditutup.');
    goal.id ||= uid('goal');
    goal.code ||= `KPI-${String(++data.sequence).padStart(4, '0')}`;
    goal.status = 'draft';
    goal.revision ||= 1;
    if (publish) {
        const e = goalErrors(data, goal);
        if (Object.keys(e).length) fail(Object.values(e)[0]);
        if (goal.templateId) {
            const messages = templateErrors(
                data,
                goal.templateId,
                goal.cycleId,
                goal,
            );
            if (messages.length) fail(messages[0]);
        }
    }
    if (existing) data.goals[data.goals.indexOf(existing)] = goal;
    else data.goals.push(goal);
    if (publish) {
        const rows = goal.templateId
            ? templateGoals(data, goal.templateId, goal.cycleId)
            : [goal];
        for (const row of rows) row.status = 'active';
    }
    record(
        data,
        'goal',
        goal.id,
        publish ? 'Goal dipublikasikan' : 'Draft Goal disimpan',
        goal.name,
    );
    return goal;
}
export function publishTemplate(data, templateId, cycleId) {
    const errors = templateErrors(data, templateId, cycleId);
    if (errors.length) fail(errors[0]);
    const rows = templateGoals(data, templateId, cycleId);
    rows.forEach((g) => {
        g.status = 'active';
    });
    record(
        data,
        'template',
        templateId,
        'Template dipublikasikan',
        `${rows.length} KPI, total bobot 100%`,
    );
}
export function duplicateGoal(goal) {
    return {
        ...clone(goal),
        id: '',
        code: '',
        name: `${goal.name} (salinan)`.slice(0, 150),
        status: 'draft',
        actual: null,
        sourceId: goal.id,
        revision: 1,
        replacesId: null,
        keyResults: clone(goal.keyResults || []).map((kr) => ({
            ...kr,
            id: uid('kr'),
            actual: null,
        })),
    };
}
export function removeGoal(data, id, archive = false) {
    const goal = data.goals.find((g) => g.id === id);
    if (!goal) fail('Goal tidak ditemukan.');
    const used =
        data.cycles.some((c) =>
            Object.values(c.bindings || {})
                .flat()
                .some((g) => g.id === id),
        ) || data.assessments.some((a) => a.snapshot.some((g) => g.id === id));
    if (!archive && (used || goal.status !== 'draft'))
        fail('Goal yang sudah terbit atau digunakan hanya dapat diarsipkan.');
    if (archive) goal.status = 'archived';
    else data.goals = data.goals.filter((g) => g.id !== id);
    record(
        data,
        'goal',
        id,
        archive ? 'Goal diarsipkan' : 'Draft Goal dihapus',
        goal.name,
    );
}
export function saveCycle(data, input) {
    const cycle = clone(input),
        existing = data.cycles.find((c) => c.id === cycle.id),
        errors = cycleErrors(data, cycle, cycle.id);
    if (Object.keys(errors).length) fail(Object.values(errors)[0]);
    cycle.id ||= cycle.month;
    cycle.status = cycle.status || 'draft';
    cycle.bindings = clone(existing?.bindings || {});
    if (existing) data.cycles[data.cycles.indexOf(existing)] = cycle;
    else data.cycles.push(cycle);
    record(
        data,
        'cycle',
        cycle.id,
        existing ? 'Jadwal periode diperbarui' : 'Periode dibuat',
        cycle.name,
    );
    return cycle;
}
export function activateCycle(data, cycleId) {
    const cycle = data.cycles.find((c) => c.id === cycleId);
    if (!cycle || !['draft', 'scheduled'].includes(cycle.status))
        fail('Hanya periode Draft atau Terjadwal yang dapat diaktifkan.');
    if (!cycle.templateIds?.length)
        fail('Pilih minimal satu template KPI yang berlaku.');
    const bindings = {};
    for (const id of cycle.templateIds) {
        const messages = templateErrors(data, id, cycleId);
        const goals = templateGoals(data, id, cycleId);
        if (messages.length) fail(messages[0]);
        if (goals.some((g) => g.status !== 'active'))
            fail(
                'Publikasikan seluruh KPI pada template sebelum mengaktifkan periode.',
            );
        bindings[id] = clone(goals);
    }
    cycle.bindings = bindings;
    cycle.status = 'active';
    for (const employee of data.staff.filter((p) =>
        cycle.templateIds.includes(p.templateId),
    )) {
        if (
            !data.assessments.some(
                (a) => a.cycleId === cycle.id && a.staffId === employee.id,
            )
        )
            data.assessments.push({
                id: uid('assessment'),
                cycleId: cycle.id,
                staffId: employee.id,
                unitId: employee.unitId,
                divisionId: employee.divisionId,
                templateId: employee.templateId,
                snapshot: clone(bindings[employee.templateId]),
                status: 'Belum diisi',
                scores: {},
                positive: '',
                negative: '',
                history: [],
            });
    }
    record(
        data,
        'cycle',
        cycle.id,
        'Periode diaktifkan',
        'Snapshot KPI dibuat; nilai aktual dan penilaian dimulai kosong.',
    );
}
export function repeatCycle(data, sourceId, month) {
    const source = data.cycles.find((c) => c.id === sourceId);
    if (!source) fail('Periode sumber tidak ditemukan.');
    if (!monthRange(month)[0] || month <= source.month)
        fail('Pilih bulan tujuan setelah periode sumber.');
    if (data.cycles.some((c) => c.month === month))
        fail('Periode tujuan sudah tersedia. Pilih bulan lain.');
    const [year, value] = month.split('-').map(Number),
        [sy, sm] = source.month.split('-').map(Number),
        offset = (year - sy) * 12 + value - sm;
    const move = (value) => {
        const date = new Date(`${value}Z`),
            day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + offset);
        const last = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate();
        date.setUTCDate(Math.min(day, last));
        return date.toISOString().slice(0, 16);
    };
    const next = {
        ...clone(source),
        id: month,
        month,
        name: `Penilaian ${monthLabel(month)}`,
        status: 'draft',
        bindings: {},
        sourceId,
    };
    for (const key of [
        'opens',
        'submission',
        'approval',
        'finalization',
        'closes',
    ])
        next[key] = move(source[key]);
    const goals = data.goals.filter(
        (g) => g.cycleId === sourceId && g.status !== 'archived',
    );
    const copies = goals.map((g) => ({
        ...duplicateGoal(g),
        id: uid('goal'),
        name: g.name,
        code: `KPI-${String(++data.sequence).padStart(4, '0')}`,
        cycleId: month,
    }));
    data.goals.push(...copies);
    data.cycles.push(next);
    record(
        data,
        'cycle',
        next.id,
        'Periode diduplikasi',
        `${copies.length} konfigurasi KPI disalin; tanpa aktual, skor, keputusan, atau temuan.`,
    );
    return next;
}
export function closeCycle(data, cycleId) {
    const cycle = data.cycles.find((c) => c.id === cycleId),
        rows = data.assessments.filter((a) => a.cycleId === cycleId);
    if (!cycle || !['active', 'approval'].includes(cycle.status))
        fail('Hanya periode aktif atau dalam persetujuan yang dapat ditutup.');
    if (rows.some((a) => a.status !== 'Final'))
        fail(
            'Masih ada penilaian belum Final. Selesaikan terlebih dahulu; pengecualian menunggu keputusan kebijakan.',
        );
    cycle.status = 'closed';
    record(
        data,
        'cycle',
        cycleId,
        'Periode ditutup',
        `${rows.length} hasil Final tetap terkunci.`,
    );
}
export function assessmentAction(data, id, action, payload = {}, context = {}) {
    const a = data.assessments.find((row) => row.id === id);
    if (!a) fail('Penilaian tidak ditemukan.');
    if (
        (context.role === 'ku' && a.unitId !== context.unitId) ||
        (context.role === 'kd' && a.divisionId !== context.divisionId)
    )
        fail('Penilaian berada di luar cakupan role.');
    if (a.status === 'Final')
        fail('Penilaian Final terkunci dan hanya dapat dibaca.');
    const requireRole = (role) => {
        if (context.role !== role)
            fail('Role ini tidak memiliki izin tindakan.');
    };
    const previous = a.status;
    if (['draft', 'submit'].includes(action)) {
        requireRole('ku');
        if (!['Belum diisi', 'Draft', 'Dikembalikan'].includes(a.status))
            fail('Penilaian tidak dapat diubah pada status ini.');
        const scores = clone(payload.scores || {});
        if (
            Object.values(scores).some(
                (v) =>
                    v !== '' &&
                    (!/^\d+$/.test(String(v)) || +v < 10 || +v > 100),
            )
        )
            fail('Nilai wajib bilangan bulat 10–100.');
        const proposed = { ...a, scores };
        if (action === 'submit' && assessmentTotal(proposed) == null)
            fail('Lengkapi seluruh nilai KPI sebelum mengajukan.');
        Object.assign(a, {
            scores,
            positive: payload.positive || '',
            negative: payload.negative || '',
            status: action === 'draft' ? 'Draft' : 'Diajukan',
        });
    } else if (action === 'withdraw') {
        requireRole('ku');
        if (a.status !== 'Diajukan')
            fail('Hanya penilaian Diajukan yang dapat ditarik.');
        a.status = 'Draft';
    } else if (action === 'approve') {
        requireRole('kd');
        if (a.status !== 'Diajukan')
            fail('Persetujuan hanya untuk penilaian Diajukan.');
        a.status = 'Disetujui';
    } else if (action === 'return') {
        if (!(
            (context.role === 'kd' && a.status === 'Diajukan') ||
            (context.role === 'hc' && a.status === 'Disetujui')
        ))
            fail(
                'Penilaian tidak dapat dikembalikan oleh role ini pada status ini.',
            );
        if (!(payload.reason || '').trim())
            fail('Alasan pengembalian wajib diisi.');
        a.status = 'Dikembalikan';
    } else if (action === 'finalize') {
        requireRole('hc');
        if (a.status !== 'Disetujui')
            fail('Finalisasi hanya untuk penilaian Disetujui.');
        a.status = 'Final';
        a.finalTotal = assessmentTotal(a);
        a.finalCategory = category(
            a.finalTotal,
            data.cycles.find((c) => c.id === a.cycleId).categories,
        );
        a.finalizedAt = new Date().toISOString();
    } else fail('Tindakan tidak dikenal.');
    a.history.unshift({
        from: previous,
        to: a.status,
        role: context.role,
        reason: payload.reason || '',
        at: new Date().toISOString(),
    });
    record(
        data,
        'assessment',
        id,
        `Penilaian ${a.status}`,
        payload.reason || '',
    );
    return a;
}
