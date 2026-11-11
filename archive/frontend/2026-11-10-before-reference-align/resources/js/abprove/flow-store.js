export const FLOW_KEY = 'abprove-flow-v2';
export const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
export const previousMonth = (key) => {
    const [y, m] = key.split('-').map(Number);
    return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
};
export const nextMonth = (key) => {
    const [y, m] = key.split('-').map(Number);
    return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
};
export const itemSignature = (r) =>
    JSON.stringify([
        r.id,
        r.pillar,
        r.name,
        r.numerator,
        r.denominator,
        r.weight,
        r.target,
        r.formula,
    ]);
export function createFlowStore(c) {
    const f = c.fixture || { year: new Date().getFullYear() },
        items = (key) =>
            f.templates[key].kpi.map((r, i) => ({
                id: `${key}-${i}`,
                pillar: r[0],
                name: r[1],
                numerator: r[2],
                denominator: r[3],
                formula: r[4],
                target: r[5],
                weight: +r[6],
            }));
    function seed() {
        const positions = [...new Set(f.employees.map((p) => p.jab))].map(
            (name, i) => ({
                id: `POS-${i}`,
                code: `J${i + 1}`,
                name,
                active: true,
            }),
        );
        const accounts = f.accounts.map((a) => ({
            id: a.key,
            name: a.nama,
            nip: a.nip,
            email: a.email,
            role: a.role,
            active: true,
        }));
        const divisions = f.divisions.map((d) => ({
            id: d.id,
            name: d.nama,
            code: d.id,
            headId: accounts.find(
                (a) =>
                    a.role === 'kd' &&
                    f.accounts.find((x) => x.key === a.id)?.div === d.id,
            )?.id,
            active: true,
        }));
        const units = f.units.map((u) => ({
            id: u.id,
            name: u.nama,
            code: u.id,
            divisionId: u.div,
            headId: accounts.find(
                (a) =>
                    a.role === 'ku' &&
                    f.accounts.find((x) => x.key === a.id)?.unit === u.id,
            )?.id,
            active: true,
        }));
        const staff = f.employees.map((p) => ({
            id: p.id,
            name: p.nama,
            nip: p.nip,
            positionId: positions.find((x) => x.name === p.jab).id,
            active: true,
            placements: [{ unitId: p.unit, from: '2026-01', until: null }],
        }));
        const heads = units.map((u) => ({
            id: `HEAD-${u.headId}`,
            accountId: u.headId,
            unitId: u.id,
            divisionId: u.divisionId,
            from: '2026-01',
            until: null,
        }));
        const kpis = [
            ...units.map((u) => ({
                id: `KPI-unit-${u.id}-v1`,
                level: 'unit',
                areaId: u.id,
                name: `KPI Staf - ${u.name}`,
                version: 1,
                from: '2026-01',
                until: null,
                items: items('GP'),
            })),
            ...divisions.map((d) => ({
                id: `KPI-division-${d.id}-v1`,
                level: 'division',
                areaId: d.id,
                name: `KPI Kepala Unit - ${d.name}`,
                version: 1,
                from: '2026-01',
                until: null,
                items: items('YJM'),
            })),
        ];
        const cycles = Array.from({ length: 12 }, (_, i) => ({
            id: `2026-${String(i + 1).padStart(2, '0')}`,
            status: i < 10 ? 'closed' : i === 10 ? 'open' : 'planned',
            opens: `2026-${String(i + 1).padStart(2, '0')}-01T00:00`,
            submission: `${i === 11 ? 2027 : 2026}-${String(i === 11 ? 1 : i + 2).padStart(2, '0')}-05T23:59`,
            approval: `${i === 11 ? 2027 : 2026}-${String(i === 11 ? 1 : i + 2).padStart(2, '0')}-10T23:59`,
            closes: `${i === 11 ? 2027 : 2026}-${String(i === 11 ? 1 : i + 2).padStart(2, '0')}-15T23:59`,
            categories: { sb: 90, b: 80, c: 70 },
        }));
        const assessments = {};
        for (const [key, a] of Object.entries(f.state.ev)) {
            const [id, month] = key.split('|'),
                p = staff.find((p) => p.id === id);
            if (!p || ['Draft', 'Belum'].includes(a.status)) continue;
            const raw = f.employees.find((e) => e.id === id),
                unit = units.find((u) => u.id === raw.unit),
                cycle = `2026-${String(+month + 1).padStart(2, '0')}`;
            assessments[`${id}|${cycle}`] = {
                status: a.status === 'Disetujui' ? 'Final' : a.status,
                values: { ...a.vals },
                positive: a.pos || '',
                negative: a.neg || '',
                reason: a.note || '',
                snapshot:
                    a.status === 'Final'
                        ? {
                              id: `legacy-${raw.tpl}`,
                              name: f.templates[raw.tpl].nama,
                              version: 1,
                              items: items(raw.tpl),
                          }
                        : structuredClone(
                              kpis.find(
                                  (k) =>
                                      k.level === 'unit' &&
                                      k.areaId === unit.id,
                              ),
                          ),
                scope: { unitId: unit.id, divisionId: unit.divisionId },
                history: [],
                category:
                    a.status === 'Final'
                        ? categorize(totalValues(a.vals, items(raw.tpl)), {
                              sb: 90,
                              b: 80,
                              c: 70,
                          })
                        : null,
            };
        }
        return {
            version: 2,
            accounts,
            positions,
            divisions,
            units,
            staff,
            heads,
            kpis,
            cycles,
            assessments,
            activities: [],
            profiles: {},
            read: [],
        };
    }
    let data = c.workspace;
    try {
        if (c.review) data = JSON.parse(localStorage.getItem(FLOW_KEY));
    } catch {}
    if (c.review && data?.version !== 2) data = seed();
    if (!data) throw new Error('Data server belum tersedia.');
    const cycleKey =
        c.selectedCycle ||
        new URLSearchParams(location.search).get('cycle') ||
        `${f.year}-${String(c.month + 1).padStart(2, '0')}`;
    const requested = c.review
        ? new URLSearchParams(location.search).get('account')
        : null;
    const actor =
        data.accounts.find(
            (a) => a.id === (requested || c.actor.key) && a.role === c.role,
        ) || data.accounts.find((a) => a.role === c.role);
    const account = (id) => data.accounts.find((a) => a.id === id),
        unit = (id) => data.units.find((u) => u.id === id),
        division = (id) => data.divisions.find((d) => d.id === id);
    const cycle = () => data.cycles.find((x) => x.id === cycleKey);
    const assessment = (id, key = cycleKey) =>
        data.assessments[`${id}|${key}`] || {
            status: 'Belum',
            values: {},
            positive: '',
            negative: '',
            reason: '',
            snapshot: null,
            history: [],
        };
    const placement = (p, key = cycleKey) =>
        p.placements
            .filter((x) => x.from <= key && (!x.until || x.until >= key))
            .at(-1);
    function allPeople(key = cycleKey) {
        const staff = data.staff
            .map((p) => {
                const a = assessment(p.id, key),
                    u = unit(a.scope?.unitId || placement(p, key)?.unitId);
                return u
                    ? {
                          ...p,
                          type: 'member',
                          unitId: u.id,
                          divisionId: a.scope?.divisionId || u.divisionId,
                          job:
                              data.positions.find((x) => x.id === p.positionId)
                                  ?.name || '-',
                          unitName: u.name,
                          divisionName:
                              division(a.scope?.divisionId || u.divisionId)
                                  ?.name || '-',
                          ...(a.identity || {}),
                      }
                    : null;
            })
            .filter(Boolean);
        const heads = data.heads
            .filter((h, _, records) => {
                const scope = assessment(h.id, key).scope;
                const matches = records.filter(
                    (r) =>
                        r.id === h.id &&
                        r.from <= key &&
                        (scope
                            ? r.unitId === scope.unitId
                            : !r.until || r.until >= key),
                );
                return (
                    h ===
                    matches.sort((a, b) => b.from.localeCompare(a.from))[0]
                );
            })
            .map((h) => {
                const a = account(h.accountId),
                    u = unit(h.unitId);
                return {
                    ...h,
                    name: a?.name || 'Akun tidak aktif',
                    nip: a?.nip || '-',
                    type: 'unit_head',
                    job: 'Kepala Unit',
                    unitName: u?.name || '-',
                    divisionName: division(h.divisionId)?.name || '-',
                    ...(assessment(h.id, key).identity || {}),
                    active: !h.until || h.until >= key,
                };
            });
        return [...staff, ...heads];
    }
    function allowed(p) {
        if (c.role === 'hc') return true;
        if (c.role === 'ku')
            return (
                p.type === 'member' &&
                data.units.some(
                    (u) => u.id === p.unitId && u.headId === actor?.id,
                )
            );
        return data.divisions.some(
            (d) => d.id === p.divisionId && d.headId === actor?.id,
        );
    }
    const people = (kind = 'all', key = cycleKey) =>
        allPeople(key).filter(
            (p) =>
                allowed(p) &&
                (kind === 'all' || p.type === kind) &&
                (p.active !== false ||
                    assessment(p.id, key).status !== 'Belum'),
        );
    const scopedUnits = () =>
        data.units.filter(
            (u) =>
                c.role === 'hc' ||
                (c.role === 'ku' && u.headId === actor?.id) ||
                (c.role === 'kd' &&
                    division(u.divisionId)?.headId === actor?.id),
        );
    const person = (id, key = cycleKey) =>
        people('all', key).find((p) => p.id === id);
    function template(p, key = cycleKey) {
        const a = assessment(p.id, key);
        if (a.snapshot) return a.snapshot;
        const level = p.type === 'member' ? 'unit' : 'division',
            areaId = p.type === 'member' ? p.unitId : p.divisionId;
        return (
            data.kpis
                .filter(
                    (k) =>
                        k.level === level &&
                        k.areaId === areaId &&
                        k.from <= key &&
                        (!k.until || k.until >= key),
                )
                .at(-1) || null
        );
    }
    const total = (id, key = cycleKey) => {
        if (!c.review && assessment(id, key).serverTotal != null)
            return +assessment(id, key).serverTotal;
        const p = person(id, key);
        return p
            ? totalValues(
                  assessment(id, key).values,
                  template(p, key)?.items || [],
              )
            : null;
    };
    const category = (id, key = cycleKey) =>
        assessment(id, key).category ||
        categorize(
            total(id, key),
            (c.review
                ? data.cycles.find((x) => x.id === key)?.categories
                : data.cycles.find((x) => x.id === key)?.ranges) || {
                sb: 90,
                b: 80,
                c: 70,
            },
        );
    function save(action, detail, before = null, after = null) {
        if (!c.review)
            throw new Error('Data aplikasi harus disimpan melalui API.');
        if (action)
            data.activities.unshift({
                id: uid('ACT'),
                at: new Date().toISOString(),
                who: actor?.name || c.actor.nama,
                action,
                detail,
                before,
                after,
            });
        try {
            localStorage.setItem(FLOW_KEY, JSON.stringify(data));
        } catch {
            window.dispatchEvent(new CustomEvent('storage-error'));
        }
        document.dispatchEvent(new Event('flow-updated'));
    }
    function canWrite(kind = 'member') {
        const x = cycle();
        if (!x) return 'Periode belum dibuat oleh Super HC.';
        if (x.status !== 'open')
            return x.status === 'closed'
                ? 'Periode sudah ditutup.'
                : 'Periode belum dibuka.';
        const now = Date.now(),
            start = Date.parse(x.opens + '+07:00'),
            end = Date.parse(
                (kind === 'member' && c.role === 'ku'
                    ? x.submission
                    : x.approval) + '+07:00',
            );
        if (now < start) return 'Jadwal pengisian belum dimulai.';
        if (now > end) return 'Batas waktu untuk peran ini sudah lewat.';
        return '';
    }
    const pending = (unitId, divisionId, from = cycleKey) =>
        Object.entries(data.assessments).filter(
            ([key, a]) =>
                key.split('|')[1] >= from &&
                a.status !== 'Final' &&
                (!unitId || a.scope?.unitId === unitId) &&
                (!divisionId || a.scope?.divisionId === divisionId),
        );
    async function refresh() {
        const result = await c.api.request(
            '/data/workspace?cycle=' + encodeURIComponent(cycleKey),
        );
        Object.assign(data, result.data);
        Object.assign(
            actor,
            data.accounts.find((a) => a.id === actor.id),
        );
        document.dispatchEvent(new Event('flow-updated'));
    }
    return {
        live: !c.review,
        api: c.api,
        refresh,
        data,
        actor,
        cycleKey,
        cycle,
        account,
        unit,
        division,
        assessment,
        placement,
        allPeople,
        people,
        person,
        template,
        total,
        category,
        allowed,
        scopedUnits,
        save,
        canWrite,
        pending,
        reset: () => {
            localStorage.removeItem(FLOW_KEY);
            location.reload();
        },
    };
}
export function totalValues(values, rows) {
    return rows.length &&
        rows.every(
            (_, i) =>
                /^\d+$/.test(String(values[i])) &&
                +values[i] >= 10 &&
                +values[i] <= 100,
        )
        ? rows.reduce((sum, r, i) => sum + (+values[i] * +r.weight) / 100, 0)
        : null;
}
export function categorize(value, cat) {
    if (Array.isArray(cat)) {
        const row = cat.find(
            (r) =>
                value != null &&
                value >= r.lower &&
                (r.upper == null || value < r.upper),
        );
        return row
            ? { label: row.label, key: row.code }
            : { label: 'Belum lengkap', key: 'empty' };
    }
    return value == null
        ? { label: 'Belum lengkap', key: 'empty' }
        : value >= +cat.sb
          ? { label: 'Sangat Baik', key: 'excellent' }
          : value >= +cat.b
            ? { label: 'Baik', key: 'good' }
            : value >= +cat.c
              ? { label: 'Cukup', key: 'fair' }
              : { label: 'Kurang', key: 'poor' };
}
