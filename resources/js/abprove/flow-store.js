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
/** Status of a person-month whose assessments are outside the loaded window; never "Belum diisi". */
export const NOT_LOADED = 'Belum dimuat';
/** Sections fetched for a month outside the page window, using the `kerja` profile (month and the one before). */
const MONTH_SECTIONS = ['accounts', 'positions', 'staff', 'heads', 'kpis', 'assessments', 'assessmentTemplates'];
export function workspaceQuery(profile, cycle, sections) {
    const query = new URLSearchParams({ page: profile });
    if (cycle) query.set('cycle', cycle);
    for (const section of sections) query.append('only[]', section);
    return query;
}
function monthsBetween(from, to) {
    const keys = [];
    for (let key = from; key <= to; key = nextMonth(key)) keys.push(key);
    return keys;
}
/** Month -> 'all' (every status loaded) or 'final' (Final results only), from the server window. */
function coverageOf(window) {
    return new Map(
        window
            ? monthsBetween(window.from, window.to).map((key) => [
                  key,
                  window.complete.includes(key) ? 'all' : 'final',
              ])
            : [],
    );
}
function resolveSnapshots(data) {
    if (!data.assessmentTemplates) return;
    for (const assessment of Object.values(data.assessments || {})) {
        assessment.snapshot = data.assessmentTemplates[assessment.snapshotKey];
        delete assessment.snapshotKey;
    }
    delete data.assessmentTemplates;
}
function unionBy(rows, extra, key, combine = (old) => old) {
    const merged = new Map(rows.map((row) => [key(row), row]));
    for (const row of extra) {
        const id = key(row);
        merged.set(id, merged.has(id) ? combine(merged.get(id), row) : row);
    }
    return [...merged.values()];
}
export function createFlowStore(c) {
    const data = c.workspace;
    if (!data) throw new Error('Data server belum tersedia.');
    resolveSnapshots(data);
    for (const name of ['positions', 'staff', 'heads', 'kpis']) data[name] ??= [];
    data.assessments ??= {};
    let coverage = coverageOf(c.workspaceWindow);
    const cycleKey =
        c.selectedCycle ||
        new URLSearchParams(location.search).get('cycle') ||
        `${new Date().getFullYear()}-${String(c.month + 1).padStart(2, '0')}`;
    const actor =
        data.accounts.find(
            (a) => a.id === c.actor.key && a.role === c.role,
        ) || data.accounts.find((a) => a.role === c.role);
    // Derived lookups are rebuilt when a source section is replaced, and cleared on every merge.
    const indexes = new Map();
    function cached(name, sources, build) {
        const inputs = sources.map((source) => data[source]);
        let entry = indexes.get(name);
        if (!entry || entry.inputs.some((input, i) => input !== inputs[i]))
            indexes.set(name, (entry = { inputs, value: build() }));
        return entry.value;
    }
    const byId = (name, id) =>
        cached(name, [name], () => new Map(data[name].map((row) => [row.id, row]))).get(id);
    const account = (id) => byId('accounts', id),
        unit = (id) => byId('units', id),
        division = (id) => byId('divisions', id),
        position = (id) => byId('positions', id),
        cycle = (key = cycleKey) => byId('cycles', key);
    const areas = () =>
        cached('areas', ['units', 'divisions'], () => {
            const divisions = new Set(
                data.divisions
                    .filter((d) => d.headId === actor?.id)
                    .map((d) => d.id),
            );
            return {
                divisions,
                units: new Set(
                    data.units
                        .filter((u) =>
                            c.role === 'hc'
                                ? true
                                : c.role === 'ku'
                                  ? u.headId === actor?.id
                                  : divisions.has(u.divisionId),
                        )
                        .map((u) => u.id),
                ),
            };
        });
    /** Sealed templates by assigned person and by unit/division area, in server order. */
    const kpiIndex = () =>
        cached('kpiIndex', ['kpis'], () => {
            const byPerson = new Map(),
                byArea = new Map();
            const add = (map, key, k) =>
                map.get(key)?.push(k) ?? map.set(key, [k]);
            for (const k of data.kpis)
                if (k.forPeople?.length)
                    k.forPeople.forEach((id) => add(byPerson, id, k));
                else add(byArea, `${k.level}|${k.areaId}`, k);
            return { byPerson, byArea };
        });
    const loaded = (key, finalOnly = false) =>
        coverage.get(key) === 'all' ||
        (finalOnly && coverage.get(key) === 'final');
    /**
     * Assessment of a person-month. In a closed period anything not Final reads "Tidak dinilai" (never filled
     * or left returned): read-only and excluded from averages, which only use Final results.
     */
    const assessment = (id, key = cycleKey) => {
        const found = data.assessments[`${id}|${key}`] || {
            status: loaded(key) ? 'Belum' : NOT_LOADED,
            values: {},
            positive: '',
            negative: '',
            reason: '',
            snapshot: null,
        };
        return found.status !== 'Final' &&
            found.status !== NOT_LOADED &&
            data.cycles?.find((x) => x.id === key)?.status === 'closed'
            ? { ...found, status: 'Tidak dinilai' }
            : found;
    };
    const placement = (p, key = cycleKey) =>
        p.placements
            .filter((x) => x.from <= key && (!x.until || x.until >= key))
            .at(-1);
    function allowed(p) {
        if (c.role === 'hc') return true;
        if (c.role === 'ku')
            return p.type === 'member' && areas().units.has(p.unitId);
        return areas().divisions.has(p.divisionId);
    }
    const peopleByMonth = new Map();
    function month(key) {
        if (peopleByMonth.has(key)) return peopleByMonth.get(key);
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
                          job: position(p.positionId)?.name || '-',
                          unitName: u.name,
                          divisionName:
                              division(a.scope?.divisionId || u.divisionId)
                                  ?.name || '-',
                          ...(a.identity || {}),
                      }
                    : null;
            })
            .filter(Boolean);
        const headRows = Map.groupBy(data.heads, (h) => h.id);
        const heads = data.heads
            .filter((h) => {
                const scope = assessment(h.id, key).scope;
                const matches = headRows
                    .get(h.id)
                    .filter(
                        (r) =>
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
        const all = [...staff, ...heads];
        const visible = all.filter(
            (p) =>
                allowed(p) &&
                (p.active !== false ||
                    !['Belum', NOT_LOADED].includes(
                        assessment(p.id, key).status,
                    )),
        );
        const entry = {
            all,
            visible,
            byId: new Map(visible.map((p) => [p.id, p])),
        };
        peopleByMonth.set(key, entry);
        return entry;
    }
    const allPeople = (key = cycleKey) => month(key).all;
    const people = (kind = 'all', key = cycleKey) =>
        month(key).visible.filter((p) => kind === 'all' || p.type === kind);
    const person = (id, key = cycleKey) => month(key).byId.get(id);
    const scopedUnits = () => data.units.filter((u) => areas().units.has(u.id));
    const current = (k, key) => k.from <= key && (!k.until || k.until >= key);
    function template(p, key = cycleKey) {
        const a = assessment(p.id, key);
        if (a.snapshot) return a.snapshot;
        const index = kpiIndex();
        const assigned = index.byPerson.get(p.id)?.findLast((k) => current(k, key));
        if (assigned) return assigned.items.length ? assigned : null;
        if (cycle(key)?.managed) return null;
        const area = p.type === 'member' ? `unit|${p.unitId}` : `division|${p.divisionId}`;
        return index.byArea.get(area)?.findLast((k) => current(k, key)) || null;
    }
    // "Tidak dinilai" has no total or category: it is excluded from averages and reports.
    const total = (id, key = cycleKey) => {
        const a = assessment(id, key);
        if (a.status === 'Tidak dinilai') return null;
        if (a.serverTotal != null) return +a.serverTotal;
        const p = person(id, key);
        return p ? totalValues(a.values, template(p, key)?.items || []) : null;
    };
    const category = (id, key = cycleKey) =>
        (assessment(id, key).status === 'Tidak dinilai'
            ? { label: 'Dikecualikan', key: 'none' }
            : null) ||
        assessment(id, key).category ||
        categorize(
            total(id, key),
            cycle(key)?.ranges || {
                sb: 90,
                b: 80,
                c: 70,
            },
        );
    /**
     * Empty string when the actor may write, else the reason. Deadlines are the server's effective ones
     * (`cycle.mine`: schedule plus approved extensions): Kepala Unit submission (`resubmit` until the later
     * resubmission date), Kepala Divisi approval per unit when `unitId` is known, else the division's latest.
     */
    function canWrite(kind = 'member', unitId = null, action = null) {
        const x = cycle();
        if (!x) return 'Periode belum dibuat oleh Super HC.';
        if (x.status !== 'open')
            return x.status === 'closed'
                ? 'Periode sudah ditutup.'
                : 'Periode belum dibuka.';
        const mine = x.mine || {},
            unitHead = kind === 'member' && c.role === 'ku',
            due = unitHead
                ? (action === 'resubmit' ? mine.resubmission : mine.submission) ||
                  x.submission
                : (unitId && mine.units?.[String(unitId).replace(/^\D+-/, '')]) ||
                  mine.approval ||
                  x.approval;
        const now = Date.now(),
            start = Date.parse(x.opens + '+07:00'),
            end = Date.parse(due + '+07:00');
        if (now < start) return 'Jadwal pengisian belum dimulai.';
        if (now > end)
            return `${unitHead ? 'Batas pengajuan' : 'Batas persetujuan'} sudah lewat. Ajukan perpanjangan kepada Super HC dari Dashboard.`;
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
    function invalidate() {
        indexes.clear();
        peopleByMonth.clear();
    }
    function checkActor(result) {
        if (result.actorId && String(result.actorId) !== String(actor.id))
            throw new Error('Akun aktif telah berubah. Silakan masuk kembali.');
    }
    /** Applies a page workspace (refresh or mutation update): sections are replaced within the page window. */
    function apply(update) {
        checkActor(update);
        const next = { ...update.data };
        resolveSnapshots(next);
        const window = update.window?.assessments ?? null;
        if (Array.isArray(update.assessmentIds)) {
            const ids = new Set(update.assessmentIds.map(String));
            for (const [key, row] of Object.entries(data.assessments))
                if (ids.has(String(row.id))) delete data.assessments[key];
            Object.assign(data.assessments, next.assessments);
            delete next.assessments;
        } else if (next.assessments) coverage = coverageOf(window);
        else if (['staff', 'heads', 'kpis'].some((name) => name in next)) {
            // A replaced roster covers the page window only, so months loaded on demand are dropped.
            const kept = coverageOf(window);
            coverage = new Map([...coverage].filter(([key]) => kept.has(key)));
            for (const key of Object.keys(data.assessments))
                if (!coverage.has(key.slice(key.indexOf('|') + 1)))
                    delete data.assessments[key];
        }
        Object.assign(data, next);
        c.initialInsights = update.insights;
    }
    /** Adds a month workspace loaded on demand without replacing what the page already holds. */
    function merge(result) {
        checkActor(result);
        const next = { ...result.data };
        resolveSnapshots(next);
        for (const [key, row] of Object.entries(next.assessments || {}))
            data.assessments[key] ??= row;
        for (const [key, scope] of coverageOf(result.window?.assessments))
            if (!loaded(key)) coverage.set(key, scope);
        const id = (row) => row.id;
        data.accounts = unionBy(data.accounts, next.accounts || [], id);
        data.positions = unionBy(data.positions, next.positions || [], id);
        data.staff = unionBy(data.staff, next.staff || [], id, (old, row) => ({
            ...old,
            placements: unionBy(old.placements, row.placements, id).sort(
                (a, b) => a.from.localeCompare(b.from),
            ),
        }));
        data.heads = unionBy(
            data.heads,
            next.heads || [],
            (h) => `${h.id}|${h.unitId}|${h.from}`,
        );
        data.kpis = unionBy(data.kpis, next.kpis || [], id, (old, row) => ({
            ...old,
            forPeople: [...new Set([...old.forPeople, ...row.forPeople])],
        }));
        invalidate();
    }
    const loading = new Map();
    /**
     * Loads months outside the page window before the UI reads them. Months without a period have
     * nothing to load; each request also covers the month before the requested one.
     */
    async function ensureMonths(keys, { finalOnly = false } = {}) {
        for (const key of [...new Set(keys)].sort().reverse()) {
            if (loaded(key, finalOnly)) continue;
            if (!cycle(key)) {
                coverage.set(key, 'all');
                peopleByMonth.delete(key);
                continue;
            }
            if (!loading.has(key))
                loading.set(
                    key,
                    c.api
                        .request(
                            '/data/workspace?' +
                                workspaceQuery('kerja', key, MONTH_SECTIONS),
                        )
                        .then(merge)
                        .finally(() => loading.delete(key)),
                );
            await loading.get(key);
        }
    }
    async function refresh({ force = false } = {}) {
        let updates = c.api.takeWorkspaceUpdates?.();
        if (force) updates = [];
        if (!updates?.length) {
            const query = workspaceQuery(c.workspaceProfile, cycleKey, c.sections);
            if (c.api.reportRequested?.()) query.set('include_insights', '1');
            try {
                updates = [await c.api.request('/data/workspace?' + query)];
            } catch (error) {
                if (updates === null)
                    throw new Error(
                        'Perubahan sudah disimpan, tetapi data terbaru gagal dimuat. Muat ulang halaman untuk melanjutkan.',
                        { cause: error },
                    );
                throw error;
            }
        }
        updates.forEach(apply);
        Object.assign(
            actor,
            data.accounts.find((a) => a.id === actor.id),
        );
        invalidate();
        document.dispatchEvent(new Event('flow-updated'));
    }
    return {
        api: c.api,
        refresh,
        ensureMonths,
        loaded,
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
        canWrite,
        pending,
    };
}
export function totalValues(values, rows) {
    return rows.length &&
        rows.every(
            (row, i) => row.config?.method === 'formula'
                ? values[i] !== '' && values[i] != null && Number.isFinite(+values[i]) && +values[i] >= 0 && +values[i] <= 100
                : /^\d+$/.test(String(values[i])) && +values[i] >= 10 && +values[i] <= 100,
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
