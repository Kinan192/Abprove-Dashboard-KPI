import { get, pageState, number, shortMonth } from '../lib/api';
import { loadLookups } from '../lib/ui';

export function dashboardPage() {
    return {
        ...pageState(),
        stats: { statuses: {} },
        analytics: { trend: [] },
        rows: [],
        team: [],
        nextMembers: [],
        get ui() {
            return this.$store.ui;
        },
        get total() {
            return (
                Number(this.stats.members || 0) +
                Number(this.stats.unit_heads || 0)
            );
        },
        get finals() {
            return Number(this.stats.statuses?.final || 0);
        },
        get progress() {
            return this.total
                ? Math.min(100, Math.round((this.finals / this.total) * 100))
                : 0;
        },
        get cards() {
            const s = this.stats.statuses || {};
            return this.ui.role === 'kepala_unit'
                ? [
                      [
                          'Karyawan unit',
                          this.stats.members || 0,
                          'Anggota dalam naungan',
                      ],
                      [
                          'Sudah diajukan',
                          Number(s.submitted || 0) + Number(s.final || 0),
                          'Diajukan atau telah Final',
                      ],
                      ['Dikembalikan', s.returned || 0, 'Perlu perbaikan'],
                      [
                          'Belum diajukan',
                          Number(s.draft || 0) +
                              Number(s.returned || 0) +
                              Number(this.stats.not_started_members || 0),
                          'Draft, revisi, atau belum diisi',
                      ],
                  ]
                : [
                      [
                          'Belum diajukan',
                          Number(s.draft || 0) +
                              Number(s.returned || 0) +
                              Number(this.stats.not_started_members || 0) +
                              Number(this.stats.not_started_heads || 0),
                          'Masih perlu dikerjakan',
                      ],
                      ['Diajukan', s.submitted || 0, 'Menunggu Kepala Divisi'],
                      ['Dikembalikan', s.returned || 0, 'Dalam proses revisi'],
                      ['Final', s.final || 0, 'Keputusan Kepala Divisi'],
                  ];
        },
        async init() {
            await this.load();
        },
        async load() {
            await this.fetchPage(async () => {
                if (!this.ui.cycleId) return;
                const [stats, analytics, rows, team, nextMembers] =
                    await Promise.all([
                        get(this.ui.prefix + '/dashboard', {
                            cycle_id: this.ui.cycleId,
                        }),
                        get(this.ui.prefix + '/data/analytics', {
                            cycle_id: this.ui.cycleId,
                        }),
                        get(this.ui.prefix + '/assessments', {
                            cycle_id: this.ui.cycleId,
                            status:
                                this.ui.role === 'kepala_unit'
                                    ? 'returned'
                                    : 'submitted',
                        }),
                        get(this.ui.prefix + '/team'),
                        this.ui.role === 'kepala_unit'
                            ? get('/unit/members', {
                                  cycle_id: this.ui.cycleId,
                                  needs_input: 1,
                              })
                            : Promise.resolve({ data: [] }),
                    ]);
                this.stats = stats.data;
                this.analytics = analytics.data;
                this.rows = rows.data;
                this.team = team.data;
                this.nextMembers = nextMembers.data;
            });
        },
        get deadline() {
            return this.ui.role === 'kepala_unit'
                ? this.ui.cycle?.submission_due_at
                : this.ui.cycle?.approval_due_at;
        },
        get taskUrl() {
            return this.ui.link(
                this.ui.role === 'kepala_unit'
                    ? 'score'
                    : this.ui.role === 'kepala_divisi'
                      ? 'approvals'
                      : 'recap',
            );
        },
        countForUnit(id, status) {
            return (
                this.stats.breakdown
                    ?.filter((b) => b.unit_id === id && b.status === status)
                    .reduce((s, b) => s + Number(b.total), 0) || 0
            );
        },
    };
}

export function chartData(trend) {
    const points = trend.map((p, i) =>
        p.average === null
            ? null
            : [20 + (i * 760) / 11, 160 - Number(p.average) * 1.4],
    );
    const paths = [];
    let part = [];
    for (const point of points) {
        if (point) part.push(point.join(','));
        else if (part.length) {
            paths.push(part.join(' '));
            part = [];
        }
    }
    if (part.length) paths.push(part.join(' '));
    return paths;
}

export function drawTrend(svg, trend) {
    const layer = svg.querySelector('[data-series]');
    if (!layer) return;
    layer.replaceChildren();
    const make = (tag, attrs) => {
        const node = document.createElementNS(
            'http://www.w3.org/2000/svg',
            tag,
        );
        Object.entries(attrs).forEach(([k, v]) =>
            node.setAttribute(k, String(v)),
        );
        layer.append(node);
    };
    chartData(trend).forEach((points) =>
        make('polyline', {
            points,
            fill: 'none',
            stroke: '#076C63',
            'stroke-width': 2.2,
        }),
    );
    trend.forEach((point, index) => {
        if (point.average !== null && Number.isFinite(Number(point.average)))
            make('circle', {
                cx: 20 + (index * 760) / 11,
                cy: 160 - Number(point.average) * 1.4,
                r: 2.8,
                fill: '#076C63',
            });
    });
}

export function submissionsPage() {
    return {
        ...pageState(),
        rows: [],
        search: '',
        status: '',
        unitFilter: '',
        divisionFilter: '',
        kind: '',
        lookups: { units: [], divisions: [] },
        copying: false,
        get ui() {
            return this.$store.ui;
        },
        async init() {
            this.status = this.ui.page === 'recap' ? 'final' : '';
            this.unitFilter =
                new URLSearchParams(location.search).get('unit_id') || '';
            await this.load();
        },
        async load(page = 1) {
            await this.fetchPage(async () => {
                if (!this.ui.cycleId) {
                    this.rows = [];
                    return;
                }
                const [response, lookups] = await Promise.all([
                    get(this.ui.prefix + '/assessments', {
                        cycle_id: this.ui.cycleId,
                        status: this.status,
                        search: this.search,
                        unit_id: this.unitFilter,
                        division_id: this.divisionFilter,
                        kind: this.kind,
                        page,
                    }),
                    loadLookups(this.ui),
                ]);
                this.rows = response.data;
                this.pagination = response;
                this.lookups = lookups;
            });
        },
        get tabs() {
            return [
                ['', 'Semua'],
                ['returned', 'Dikembalikan'],
                ['submitted', 'Menunggu'],
                ['draft', 'Draft'],
                ['final', 'Final'],
            ];
        },
        get exportUrl() {
            return (
                this.ui.prefix +
                '/recap?' +
                new URLSearchParams({
                    cycle_id: this.ui.cycleId,
                    status: this.status || 'all',
                    format: 'tsv',
                    ...(this.search ? { search: this.search } : {}),
                    ...(this.kind ? { kind: this.kind } : {}),
                    ...(this.unitFilter ? { unit_id: this.unitFilter } : {}),
                    ...(this.divisionFilter
                        ? { division_id: this.divisionFilter }
                        : {}),
                })
            );
        },
        async copy() {
            this.copying = true;
            try {
                const response = await fetch(this.exportUrl, {
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) throw new Error('Rekap belum dapat diambil.');
                const value = await response.text();
                await navigator.clipboard.writeText(value);
                this.ui.toast(
                    'Rekap sesuai filter berhasil disalin untuk Excel.',
                );
            } catch (error) {
                this.ui.toast(
                    'Penyalinan belum berhasil. Gunakan Unduh TSV untuk membuka rekap.',
                    true,
                );
            } finally {
                this.copying = false;
            }
        },
    };
}

export function analyticsPage() {
    return {
        ...pageState(),
        data: { trend: [], categories: [], groups: [], matrix: [] },
        lookups: { units: [], positions: [] },
        unitFilter: '',
        positionFilter: '',
        get ui() {
            return this.$store.ui;
        },
        async init() {
            await this.load();
        },
        async load() {
            await this.fetchPage(async () => {
                if (!this.ui.cycleId) return;
                const [response, lookups] = await Promise.all([
                    get(this.ui.prefix + '/data/analytics', {
                        cycle_id: this.ui.cycleId,
                        unit_id: this.unitFilter,
                        position_id: this.positionFilter,
                    }),
                    loadLookups(this.ui),
                ]);
                this.data = response.data;
                this.lookups = lookups;
            });
        },
        get matrix() {
            const map = new Map();
            this.data.matrix.forEach((row) => {
                if (!map.has(row.employee_id))
                    map.set(row.employee_id, {
                        id: row.employee_id,
                        name: row.employee_name_snapshot,
                        unit: row.unit_name_snapshot,
                        values: {},
                    });
                map.get(row.employee_id).values[
                    row.assessment_month.slice(0, 10)
                ] = row;
            });
            return [...map.values()];
        },
    };
}

export function teamPage() {
    return {
        ...pageState(),
        rows: [],
        teams: [],
        search: '',
        unitFilter: '',
        get ui() {
            return this.$store.ui;
        },
        async init() {
            await this.load();
        },
        async load(page = 1) {
            await this.fetchPage(async () => {
                const [response, teams] = await Promise.all([
                    get(this.ui.prefix + '/members', {
                        cycle_id: this.ui.cycleId,
                        search: this.search,
                        unit_id: this.unitFilter,
                        page,
                    }),
                    get(this.ui.prefix + '/team'),
                ]);
                this.rows = response.data;
                this.pagination = response;
                this.teams = teams.data;
            });
        },
    };
}

export function notificationsPage() {
    return {
        ...pageState(),
        rows: [],
        stats: { statuses: {} },
        get ui() {
            return this.$store.ui;
        },
        async init() {
            await this.load();
        },
        async load() {
            await this.fetchPage(async () => {
                if (!this.ui.cycleId) return;
                const [r, s] = await Promise.all([
                    get(this.ui.prefix + '/assessments', {
                        cycle_id: this.ui.cycleId,
                        status:
                            this.ui.role === 'kepala_unit'
                                ? 'returned'
                                : 'submitted',
                    }),
                    get(this.ui.prefix + '/dashboard', {
                        cycle_id: this.ui.cycleId,
                    }),
                ]);
                this.rows = r.data;
                this.stats = s.data;
            });
        },
    };
}

export { number, shortMonth };
