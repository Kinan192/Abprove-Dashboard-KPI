import { formulaErrors, expressionValue } from './formula-config.js';
export const ROLES = {
    staff: 'Staf',
    unit_head: 'Kepala Unit',
};
export const STATUSES = {
    not_started: 'Belum Dinilai',
    draft: 'Draft',
    submitted: 'Menunggu ACC',
    returned: 'Perlu Revisi',
    final: 'Selesai',
};
export const PERIOD_STATUSES = {
    planned: 'Direncanakan',
    open: 'Aktif',
    closed: 'Ditutup',
};
const MAX_ITEMS = 200;
export const clone = (value) => structuredClone(value);
export const uid = (prefix) =>
    `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
export const monthLabel = (value) =>
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')
        ? 'Periode belum dipilih'
        : new Intl.DateTimeFormat('id-ID', {
              month: 'long',
              year: 'numeric',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(`${value}-01T12:00:00+07:00`));
/** Calendar range of the year controls (prev/next + numeric input); no planning cap. */
export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;
export const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
/** Current month (YYYY-MM) in WIB. */
export function currentMonth() {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Jakarta' })
            .formatToParts(new Date())
            .map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}`;
}
/** Year typed or stepped into a year control, or null when outside YEAR_MIN–YEAR_MAX. */
export const validYear = (value) => {
    const year = Number(value);
    return Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX ? String(year) : null;
};
export const monthName = (mm) =>
    new Intl.DateTimeFormat('id-ID', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, +mm - 1, 15)));
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
/**
 * Per-KPI results and total. A division head correction (`row.reviewed[id]`) is the score in force; the
 * unit head's calculated proposal stays available as `proposal`.
 */
export function totals(row, inputs = row.inputs) {
    const results = row.snapshot.map((k) => {
        const r = calculate(k, inputs[k.id]),
            reviewed = row.reviewed?.[k.id];
        return reviewed == null
            ? { id: k.id, ...r, proposal: null }
            : { id: k.id, ...r, proposal: r.score, score: +reviewed, weighted: (+reviewed * +k.weight) / 100, message: '' };
    });
    return {
        results,
        total:
            results.length && results.every((r) => r.weighted != null)
                ? results.reduce((n, r) => n + r.weighted, 0)
                : null,
    };
}
/** Exact sum of weights with 4 decimals (same precision as the server BCMath check). */
export function totalWeight(items) {
    return (
        items.reduce(
            (n, k) => n + (numeric(k.weight) ? Math.round(+k.weight * 10000) : 0),
            0,
        ) / 10000
    );
}
export const isComplete = (items) =>
    items.length > 0 && totalWeight(items) === 100;
export const ruleFor = (direction) =>
    direction === 'lower' ? 'reverse-positive' : 'target-normalized';
export function emptyKpi() {
    return {
        id: '',
        name: '',
        pillar: '',
        method: 'formula',
        weight: '',
        variables: [
            { key: 'A', label: '', source: 'manual' },
            { key: 'B', label: '', source: 'manual' },
        ],
        formula: 'A / B * 100',
        target: '',
        unit: '%',
        direction: 'higher',
        policy: {
            rule: 'target-normalized',
            zeroRule: 'pending',
            min: 10,
            max: 100,
        },
    };
}
export function emptyPattern(periodId) {
    return { id: '', name: '', periodId, items: [] };
}
/** Recipient type of a person key: `head-…` are Kepala Unit, `staff-…` are staff (server members()). */
export const personType = (personId) => (personId.startsWith('head-') ? 'unit_head' : 'staff');
/** "3 staf, 1 Kepala Unit" of the given person keys. */
export function recipientMix(personIds) {
    const count = { staff: 0, unit_head: 0 };
    for (const id of personIds) count[personType(id)]++;
    return [count.staff && `${count.staff} staf`, count.unit_head && `${count.unit_head} Kepala Unit`].filter(Boolean).join(', ') || '0 orang';
}
export function kpiErrors(kpi) {
    const e = {};
    if (!(kpi.name || '').trim() || kpi.name.length > 150)
        e.name = 'Isi nama KPI, maksimal 150 karakter.';
    if (!(kpi.pillar || '').trim() || kpi.pillar.length > 64)
        e.pillar = 'Isi pilar KPI, maksimal 64 karakter.';
    if (
        !numeric(kpi.weight) ||
        +kpi.weight <= 0 ||
        +kpi.weight > 100 ||
        !/^\d{1,3}(?:\.\d{1,4})?$/.test(String(kpi.weight))
    )
        e.weight = 'Bobot harus lebih dari 0 sampai 100%, maksimal 4 desimal.';
    if (!numeric(kpi.target) || +kpi.target < 0)
        e.target = 'Target harus berupa angka nol atau lebih.';
    if (!['higher', 'lower'].includes(kpi.direction))
        e.direction = 'Pilih polaritas.';
    Object.assign(e, formulaErrors(kpi));
    if (!(kpi.unit || '').trim() || kpi.unit.length > 32)
        e.unit = 'Pilih satuan pengukuran.';
    const p = kpi.policy || {};
    if (
        !numeric(p.min) ||
        !numeric(p.max) ||
        +p.min < 0 ||
        +p.max <= +p.min ||
        +p.max > 100
    )
        e.policy = 'Rentang skor otomatis harus 0 ≤ minimum < maksimum ≤ 100.';
    else if (numeric(kpi.target) && +kpi.target === 0 && p.zeroRule !== 'zero-pass')
        e.policy =
            'Target nol: pilih aturan "Hasil nol lulus" pada Pengaturan konversi nilai.';
    return e;
}
/** KPI item in the stored shape accepted by the server; import provenance (`importSource`) is kept as-is. */
export function cleanKpi(kpi) {
    return {
        id: kpi.id || uid('kpi'),
        name: kpi.name.trim(),
        pillar: kpi.pillar.trim(),
        method: 'formula',
        weight: Number(kpi.weight),
        variables: kpi.variables.map((v) => ({
            key: v.key,
            label: v.label.trim(),
            source: v.source === 'fixed' ? 'fixed' : 'manual',
            ...(v.source === 'fixed' ? { value: Number(v.value) } : {}),
        })),
        formula: kpi.formula.trim(),
        target: Number(kpi.target),
        unit: kpi.unit.trim(),
        direction: kpi.direction,
        policy: {
            rule: ruleFor(kpi.direction),
            zeroRule: kpi.policy.zeroRule === 'zero-pass' ? 'zero-pass' : 'pending',
            min: Number(kpi.policy.min),
            max: Number(kpi.policy.max),
        },
        ...(kpi.importSource && typeof kpi.importSource === 'object' ? { importSource: kpi.importSource } : {}),
    };
}
/** Built-in pillar hints; always suggested alongside the pillars already used. */
export const PILLAR_PRESETS = [
    'Technical Care',
    'Access',
    'Coordination and Continuity',
    'Interpersonal Care',
    'Efficient',
];
/**
 * Pillar suggestions: built-in hints, pillars used by any period (`data.pillars`, from the server),
 * patterns and legacy templates of this period, the unsaved draft items and the value being edited —
 * trimmed, non-empty, de-duplicated case-insensitively (first spelling wins), sorted.
 */
export function pillarSuggestions(data, draftItems = [], current = '') {
    const seen = new Map();
    const add = (value) => {
        const pillar = String(value ?? '').trim(),
            key = pillar.toLocaleLowerCase('id');
        if (pillar && !seen.has(key)) seen.set(key, pillar);
    };
    PILLAR_PRESETS.forEach(add);
    for (const item of draftItems) add(item.pillar);
    add(current);
    (data.pillars || []).forEach(add);
    for (const pattern of data.patterns || []) for (const item of pattern.items || []) add(item.pillar);
    for (const template of data.legacyTemplates || []) for (const item of template.items || []) add(item.pillar);
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'id'));
}
/**
 * Lookup tables of the selected month: patterns with totals and usage,
 * person → pattern, organisation names and readiness.
 */
export function derive(data) {
    const month = data.selectedMonth;
    const patterns = new Map();
    for (const p of data.patterns)
        if (p.periodId === month)
            patterns.set(p.id, {
                ...p,
                total: totalWeight(p.items),
                complete: isComplete(p.items),
                count: 0,
                /** Holders that are Kepala Unit; the rest are staff. */
                heads: 0,
            });
    const assigned = new Map();
    for (const a of data.patternAssignments)
        if (a.periodId === month) {
            assigned.set(a.personId, a.patternId);
            const pattern = patterns.get(a.patternId);
            if (pattern) {
                pattern.count++;
                if (personType(a.personId) === 'unit_head') pattern.heads++;
            }
        }
    const units = new Map(data.units.map((u) => [u.id, u]));
    const divisions = new Map();
    for (const u of data.units)
        if (!divisions.has(u.divisionId))
            divisions.set(u.divisionId, {
                id: u.divisionId,
                name: u.divisionName,
                head: u.divisionHeadName,
            });
    const unitHeads = new Map();
    /** Assessment status of the people of this month that already have an assessment: their sealed KPI snapshot is final. */
    const assessed = new Map(Object.entries(data.assessmentStatus || {}));
    const readiness = {
        staff: { eligible: 0, complete: 0 },
        unit_head: { eligible: 0, complete: 0 },
    };
    for (const person of data.people) {
        if (person.type === 'unit_head')
            unitHeads.set(person.unitId, [
                ...(unitHeads.get(person.unitId) || []),
                person.name,
            ]);
        readiness[person.type].eligible++;
        if (assessed.has(person.id) || patterns.get(assigned.get(person.id))?.complete)
            readiness[person.type].complete++;
    }
    return {
        month,
        period: data.periods.find((p) => p.id === month) || null,
        patterns,
        assigned,
        units,
        divisions,
        unitHeads,
        people: new Map(data.people.map((p) => [p.id, p])),
        /** Pattern holders of this month that are not eligible in it (inactive, moved out or no longer Kepala Unit). */
        ineligible: new Map((data.ineligibleHolders || []).map((p) => [p.id, p])),
        readiness,
        assessed,
    };
}
/**
 * Current holders of pattern `id` in the selected month, eligible or not: one row per assignment, so the
 * row count always equals the pattern's `count`.
 */
export function patternHolders(index, id) {
    const rows = [];
    for (const [personId, patternId] of index.assigned) {
        if (patternId !== id) continue;
        const person = index.people.get(personId),
            other = index.ineligible.get(personId),
            unit = person && index.units.get(person.unitId);
        rows.push({
            id: personId,
            name: person?.name || other?.name || '',
            nip: person?.nip || other?.nip || '',
            type: person?.type || other?.type || personType(personId),
            unitName: unit?.name || other?.unitName || '',
            divisionName: unit?.divisionName || other?.divisionName || '',
            eligible: !!person,
            status: index.assessed.get(personId) || '',
        });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'id') || a.id.localeCompare(b.id));
}
export function filterPeople(index, f, role = f.role) {
    const q = f.search.trim().toLowerCase();
    const rows = [];
    for (const p of index.people.values()) {
        if (role && p.type !== role) continue;
        if (f.division && p.divisionId !== f.division) continue;
        if (f.unit && p.unitId !== f.unit) continue;
        if (f.position && p.positionId !== f.position) continue;
        const has = index.assessed.has(p.id) || index.patterns.get(index.assigned.get(p.id))?.complete;
        if ((f.status === 'none' && has) || (f.status === 'assigned' && !has))
            continue;
        if (
            q &&
            !p.name.toLowerCase().includes(q) &&
            !p.nip.toLowerCase().includes(q)
        )
            continue;
        rows.push(p);
    }
    return rows;
}
export function patternErrors(data, pattern, assignedCount) {
    const e = {};
    const name = pattern.name.trim();
    if (!name || name.length > 120)
        e.patternName = 'Nama pola wajib diisi, maksimal 120 karakter.';
    else if (
        data.patterns.some(
            (p) =>
                p.id !== pattern.id &&
                p.periodId === pattern.periodId &&
                p.name.toLowerCase() === name.toLowerCase(),
        )
    )
        e.patternName = 'Nama pola sudah dipakai pada periode ini.';
    if (!pattern.items.length || pattern.items.length > MAX_ITEMS)
        e.items = `Isi 1 sampai ${MAX_ITEMS} KPI.`;
    else if (pattern.items.some((k) => Object.keys(kpiErrors(k)).length))
        e.items = 'Masih ada KPI yang belum valid. Buka KPI bertanda dan lengkapi.';
    else if (assignedCount && !isComplete(pattern.items))
        e.items = `Pola sudah diterapkan ke ${assignedCount} orang sehingga total bobot wajib tepat 100% (saat ini ${totalWeight(pattern.items)}%).`;
    return e;
}
export function savePattern(data, pattern, assignedCount) {
    const errors = patternErrors(data, pattern, assignedCount);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const saved = {
        ...(pattern.legacyTemplateId
            ? { legacyTemplateId: pattern.legacyTemplateId }
            : {}),
        id: pattern.id || uid('pola'),
        name: pattern.name.trim(),
        periodId: pattern.periodId,
        items: pattern.items.map(cleanKpi),
    };
    const index = data.patterns.findIndex((p) => p.id === saved.id);
    if (index >= 0) data.patterns[index] = saved;
    else data.patterns.push(saved);
    return saved;
}
export function removePattern(data, id) {
    data.patterns = data.patterns.filter((p) => p.id !== id);
    data.patternAssignments = data.patternAssignments.filter(
        (a) => a.patternId !== id,
    );
}
/** Sets (patternId) or releases (null) the pattern of the given people in a period. */
export function applyPattern(data, periodId, patternId, personIds) {
    const people = new Set(personIds);
    data.patternAssignments = data.patternAssignments.filter(
        (a) => a.periodId !== periodId || !people.has(a.personId),
    );
    if (patternId)
        for (const personId of people)
            data.patternAssignments.push({ periodId, personId, patternId });
}
function uniqueName(data, periodId, base) {
    const taken = new Set(
        data.patterns
            .filter((p) => p.periodId === periodId)
            .map((p) => p.name.toLowerCase()),
    );
    let name = base.slice(0, 120);
    for (let i = 2; taken.has(name.toLowerCase()); i++) {
        const suffix = ` (${i})`;
        name = base.slice(0, 120 - suffix.length) + suffix;
    }
    return name;
}
export function duplicatePattern(data, pattern) {
    return {
        id: '',
        name: uniqueName(data, pattern.periodId, `${pattern.name} (salinan)`),
        periodId: pattern.periodId,
        items: pattern.items.map((k) => ({ ...clone(k), id: uid('kpi') })),
    };
}
/**
 * Copies the patterns of another period (`source`: its patterns and assignments, fetched separately)
 * into the target period, together with the assignments of people still eligible there.
 * People who already have a pattern in the target keep it.
 */
export function copyPatterns(data, source, to, people) {
    const names = new Set(
        data.patterns
            .filter((p) => p.periodId === to)
            .map((p) => p.name.toLowerCase()),
    );
    const copies = new Map(),
        skipped = [];
    for (const p of source.patterns) {
        if (names.has(p.name.toLowerCase())) {
            skipped.push(p.name);
            continue;
        }
        const copy = {
            id: uid('pola'),
            name: p.name,
            periodId: to,
            items: p.items.map((k) => ({ ...clone(k), id: uid('kpi') })),
        };
        names.add(p.name.toLowerCase());
        copies.set(p.id, copy);
        data.patterns.push(copy);
    }
    const taken = new Set(
        data.patternAssignments
            .filter((a) => a.periodId === to)
            .map((a) => a.personId),
    );
    let assigned = 0,
        kept = 0,
        ineligible = 0;
    for (const a of source.patternAssignments) {
        const copy = copies.get(a.patternId);
        if (!copy) continue;
        if (!people.has(a.personId) || !isComplete(copy.items))
            ineligible++;
        else if (taken.has(a.personId)) kept++;
        else {
            taken.add(a.personId);
            data.patternAssignments.push({
                periodId: to,
                personId: a.personId,
                patternId: copy.id,
            });
            assigned++;
        }
    }
    return { patterns: copies.size, skipped, assigned, kept, ineligible };
}
/** Legacy unit/division KPI templates (manual 10–100 scores) become patterns with an equivalent formula. */
export function convertLegacy(data, templates, periodId, index) {
    let assigned = 0;
    for (const t of templates) {
        const pattern = {
            id: uid('pola'),
            name: uniqueName(data, periodId, t.name || `KPI ${t.areaName}`),
            periodId,
            legacyTemplateId: t.id,
            items: t.items.map((item) => ({
                id: uid('kpi'),
                name: String(item.name).slice(0, 150),
                pillar: String(item.pillar || 'Technical Care').slice(0, 64),
                method: 'formula',
                weight: Number(item.weight),
                variables: [
                    { key: 'A', label: 'Nilai capaian (10–100)', source: 'manual' },
                ],
                formula: 'A',
                target: 100,
                unit: 'poin',
                direction: 'higher',
                policy: {
                    rule: 'target-normalized',
                    zeroRule: 'pending',
                    min: 10,
                    max: 100,
                },
            })),
        };
        data.patterns.push(pattern);
        if (!isComplete(pattern.items)) continue;
        for (const personId of t.personIds)
            if (!index.assigned.has(personId)) {
                data.patternAssignments.push({
                    periodId,
                    personId,
                    patternId: pattern.id,
                });
                assigned++;
            }
    }
    return assigned;
}
/** Reason the period cannot be opened yet, or '' when ready. */
export function openBlock(period) {
    if (period.businessId && !period.managed) return '';
    const r = period.readiness?.staff;
    if (!r) return 'Simpan periode terlebih dahulu, lalu terapkan pola KPI ke seluruh staf.';
    if (!r.eligible) return 'Belum ada staf aktif pada bulan ini.';
    if (r.complete < r.eligible)
        return `${r.eligible - r.complete} dari ${r.eligible} staf belum memiliki pola KPI 100%.`;
    return '';
}
const SCHEDULE = ['opens', 'submission', 'approval', 'closes'];
const scheduleKey = (p) =>
    JSON.stringify([
        ...SCHEDULE.map((k) => p[k]),
        +p.categories.sb,
        +p.categories.b,
        +p.categories.c,
    ]);
export function periodErrors(data, period, old) {
    const e = {};
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period.id || ''))
        e.month = 'Pilih bulan penilaian yang valid.';
    else if (!old && data.periods.some((p) => p.id === period.id))
        e.month = 'Periode bulan ini sudah tersedia.';
    else if (!old && !validYear(period.id.slice(0, 4)))
        e.month = `Pilih bulan antara ${YEAR_MIN} dan ${YEAR_MAX}.`;
    if (!(period.name || '').trim() || period.name.length > 190)
        e.name = 'Nama periode wajib diisi, maksimal 190 karakter.';
    for (let i = 0; i < SCHEDULE.length; i++) {
        const k = SCHEDULE[i];
        if (!period[k] || !Number.isFinite(Date.parse(`${period[k]}:00+07:00`)))
            e[k] = 'Isi tanggal dan jam WIB yang valid.';
        else if (i === 1 && period[k] <= period.opens)
            e[k] = 'Batas pengajuan harus setelah mulai pengisian.';
        else if (i > 1 && period[k] < period[SCHEDULE[i - 1]])
            e[k] = 'Jadwal harus setelah atau sama dengan tahap sebelumnya.';
    }
    const c = period.categories;
    if (!(+c.sb > +c.b && +c.b > +c.c && +c.c > 0 && +c.sb <= 100))
        e.categories = 'Batas harus 0 < Cukup < Baik < Sangat Baik ≤ 100.';
    if (old?.status === 'closed') e.status = 'Periode ditutup hanya dapat dibaca.';
    else if (old?.hasAssessments && scheduleKey(old) !== scheduleKey(period))
        e.categories =
            'Jadwal dan kategori periode yang sudah dipakai penilaian tidak dapat diubah. Hanya status yang dapat diubah.';
    if (!e.status && period.status !== old?.status) {
        if (period.status === 'open') {
            const block = old ? openBlock(old) : openBlock(period);
            if (block) e.status = block;
        } else if (period.status === 'closed' && old?.hasPending)
            e.status =
                'Masih ada penilaian yang belum Final. Selesaikan keputusan Kepala Divisi sebelum menutup periode.';
        else if (period.status === 'planned' && old?.hasAssessments)
            e.status =
                'Periode yang sudah dipakai penilaian tidak dapat dikembalikan ke Direncanakan.';
    }
    return e;
}
export function savePeriod(data, period, old) {
    const errors = periodErrors(data, period, old);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const saved = {
        id: period.id,
        name: period.name.trim(),
        status: period.status,
        ...Object.fromEntries(SCHEDULE.map((k) => [k, period[k]])),
        categories: {
            sb: +period.categories.sb,
            b: +period.categories.b,
            c: +period.categories.c,
        },
    };
    const index = data.periods.findIndex((p) => p.id === saved.id);
    if (index >= 0) data.periods[index] = { ...data.periods[index], ...saved };
    else data.periods.push(saved);
    return saved;
}
/**
 * PUT body `data`: the stored document of the selected period (server-derived fields are dropped).
 * The server replaces only this period's patterns and assignments; other periods stay as stored.
 */
export function documentPayload(data) {
    const month = data.selectedMonth;
    return {
        version: 2,
        month,
        periods: data.periods.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            ...Object.fromEntries(SCHEDULE.map((k) => [k, p[k]])),
            categories: {
                sb: +p.categories.sb,
                b: +p.categories.b,
                c: +p.categories.c,
            },
        })),
        patterns: data.patterns.filter((p) => p.periodId === month).map((p) => ({
            id: p.id,
            name: p.name,
            periodId: p.periodId,
            ...(p.legacyTemplateId ? { legacyTemplateId: p.legacyTemplateId } : {}),
            items: p.items,
        })),
        patternAssignments: data.patternAssignments.filter((a) => a.periodId === month).map((a) => ({
            periodId: a.periodId,
            personId: a.personId,
            patternId: a.patternId,
        })),
    };
}
