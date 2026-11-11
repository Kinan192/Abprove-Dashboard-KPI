import { $, close, toast } from './ui';
import { XL } from './xlsx';
export function initExports(c, s) {
    const select = $('[data-export-scope]');
    const name = () =>
        `KPI_${c.fixture.year}_${(select?.value || 'all').replace(/[^a-z0-9-]/gi, '_')}.xlsx`;
    select?.addEventListener(
        'change',
        () => ($('[data-export-filename]').textContent = name()),
    );
    function download(sheets, filename) {
        const bytes = XL.build(sheets);
        const url = URL.createObjectURL(
            new Blob([bytes], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('File Excel berisi data contoh diunduh.');
    }
    document.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'download-export') {
            const [kind, id] = (select?.value || 'all').split(':');
            const people = c.people.filter(
                (p) =>
                    kind === 'all' ||
                    (kind === 'unit' && p.unit === id) ||
                    (kind === 'person' && p.id === id),
            );
            const summary = {
                name: 'Rekap contoh',
                cols: [30, 26, 20, ...Array(12).fill(12)],
                rows: [
                    ['DATA CONTOH LOKAL - ABprove'],
                    ['Nama', 'Unit', 'Status', ...c.fixture.months],
                    ...people.map((p) => [
                        p.name,
                        p.unitName,
                        s.assessment(p.id).status,
                        ...Array.from({ length: 12 }, (_, m) =>
                            s.total(p.id, m),
                        ),
                    ]),
                ],
            };
            const sheets = [
                summary,
                ...people.map((p) => ({
                    name: p.name,
                    cols: [24, 45, 25, 25, 32, 16, 12, ...Array(12).fill(12)],
                    rows: [
                        [p.name, p.unitName, 'Data contoh'],
                        [
                            'Pilar',
                            'KPI',
                            'Numerator',
                            'Denominator',
                            'Formula',
                            'Target',
                            'Bobot',
                            ...c.fixture.months,
                        ],
                        ...s
                            .template(p.id)
                            .kpi.map((r, i) => [
                                ...r,
                                ...Array.from({ length: 12 }, (_, m) =>
                                    s.assessment(p.id, m).vals[i] == null
                                        ? null
                                        : +s.assessment(p.id, m).vals[i],
                                ),
                            ]),
                    ],
                })),
            ];
            download(sheets, name());
            close('export-dialog');
        }
        if (action === 'export-template') {
            const key =
                document.querySelector(
                    '[data-template-tab][aria-selected="true"]',
                )?.dataset.templateTab || 'GP';
            download(
                [
                    {
                        name: 'Master KPI',
                        cols: [24, 45, 25, 25, 32, 16, 12],
                        rows: [
                            [
                                'Pilar',
                                'KPI',
                                'Numerator',
                                'Denominator',
                                'Formula Pengukuran',
                                'Target',
                                'Bobot KPI',
                            ],
                            ...s.state.templates[key].kpi,
                        ],
                    },
                ],
                `Template_KPI_${key}.xlsx`,
            );
        }
    });
}
