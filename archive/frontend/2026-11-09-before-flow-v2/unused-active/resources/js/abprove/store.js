export const KEY = 'abprove-blade-audit-v1';
export function createStore(config) {
    const seed = () => ({
        ...structuredClone(config.fixture.state),
        employees: structuredClone(config.fixture.employees),
        templates: structuredClone(config.fixture.templates),
        units: structuredClone(config.fixture.units),
        collections: {},
        profiles: {},
        placements: [],
    });
    let state;
    try {
        state = JSON.parse(localStorage.getItem(KEY)) || seed();
    } catch {
        state = seed();
    }
    const save = () => {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch {
            window.dispatchEvent(new CustomEvent('storage-error'));
        }
    };
    const assessment = (id, month = config.month) =>
        state.ev[`${id}|${month}`] || {
            vals: {},
            status: 'Belum',
            pos: '',
            neg: '',
            note: '',
            log: [],
        };
    const person = (id) =>
        state.employees.find((p) => p.id === id) ||
        config.people.find((p) => p.id === id);
    const template = (id) => config.fixture.templates[person(id)?.tpl || 'YJM'];
    const total = (id, month = config.month) => {
        const rows = template(id)?.kpi || [],
            vals = assessment(id, month).vals;
        return rows.length &&
            rows.every(
                (_, i) =>
                    Number.isInteger(Number(vals[i])) &&
                    vals[i] !== '' &&
                    vals[i] != null &&
                    Number(vals[i]) >= 10 &&
                    Number(vals[i]) <= 100,
            )
            ? rows.reduce(
                  (sum, r, i) => sum + (Number(vals[i]) * Number(r[6])) / 100,
                  0,
              )
            : null;
    };
    const category = (value) =>
        value == null
            ? ['-', 'none']
            : value >= +state.set.sb
              ? ['Sangat Baik', 'excellent']
              : value >= +state.set.b
                ? ['Baik', 'good']
                : value >= +state.set.c
                  ? ['Cukup', 'fair']
                  : ['Kurang', 'poor'];
    const put = (id, next) => {
        state.ev[`${id}|${config.month}`] = structuredClone(next);
        save();
    };
    const log = (id, status, note = '') => {
        const a = structuredClone(assessment(id));
        a.status = status;
        a.note = note;
        a.log ||= [];
        a.log.push({
            status,
            who: config.actor.nama,
            at: new Date().toISOString(),
            note,
        });
        state.act.unshift({
            t: 'Baru saja',
            who: config.actor.nama,
            txt: `${status}: ${person(id)?.nama || person(id)?.name || id}`,
        });
        put(id, a);
    };
    return {
        state,
        save,
        assessment,
        person,
        template,
        total,
        category,
        put,
        log,
        reset: () => {
            localStorage.removeItem(KEY);
            location.reload();
        },
    };
}
