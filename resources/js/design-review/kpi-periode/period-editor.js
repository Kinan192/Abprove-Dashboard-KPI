import { monthLabel } from './model.js';
import { esc, field, note } from '../../abprove/goals/markup.js';

export function newPeriod(data) {
    const latest = data.periods
        .map((p) => p.id)
        .sort()
        .at(-1);
    const next = new Date(`${latest || '2026-11'}-01T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const id = next.toISOString().slice(0, 7);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const following = next.toISOString().slice(0, 7);
    return {
        id,
        name: `Penilaian ${monthLabel(id)}`,
        status: 'planned',
        opens: `${following}-01T08:00`,
        submission: `${following}-05T23:59`,
        approval: `${following}-10T23:59`,
        closes: `${following}-15T23:59`,
        categories: { sb: 90, b: 80, c: 70 },
    };
}

export const periodLocked = (data, id) =>
    !!id &&
    (data.periods.find((period) => period.id === id)?.hasFinal ||
        data.assessments.some((a) => a.periodId === id && a.status === 'final'));

export function periodEditor(ctx) {
    const p = ctx.periodWorking,
        locked = periodLocked(ctx.data, ctx.periodEditing),
        disabled = { disabled: locked };
    return `<section class="card fx-period-editor"><div class="fx-card-heading"><h2>${ctx.periodEditing ? `Periode: ${esc(p.name)}` : 'Periode Baru'}</h2>${ctx.periodEditing ? '<button class="btn" type="button" data-skp-action="new-period">Buat periode baru</button>' : ''}</div>${locked ? note('Periode memiliki hasil Selesai. Pengaturan dan histori dikunci.') : ''}<form id="skp-period-form" novalidate>
        <section class="fx-form-section"><div class="fx-section-heading"><span>1</span><h2>Informasi periode</h2></div><div class="gp-form-grid">${field('month', 'Bulan yang dinilai', p.id, { type: 'month', required: true, disabled: locked })}${field('name', 'Nama periode', p.name, { required: true, disabled: locked })}${field(
            'status',
            'Status periode',
            p.status,
            {
                options: [
                    ['planned', 'Direncanakan'],
                    ['open', 'Aktif'],
                    ['closed', 'Ditutup'],
                ],
                placeholder: false,
                attributes: disabled,
            },
        )}</div></section>
        <section class="fx-form-section"><div class="fx-section-heading"><span>2</span><h2>Jadwal penilaian</h2></div><div class="gp-form-grid">${[
            ['opens', 'Mulai pengisian'],
            ['submission', 'Batas pengajuan Kepala Unit'],
            ['approval', 'Batas ACC Kepala Divisi'],
            ['closes', 'Tutup periode'],
        ]
            .map(([key, label]) =>
                field(key, `${label} (WIB)`, p[key], {
                    type: 'datetime-local',
                    required: true,
                    disabled: locked,
                }),
            )
            .join('')}</div></section>
        <section class="fx-form-section"><div class="fx-section-heading"><span>3</span><h2>Kategori nilai</h2></div><div class="fx-category-grid gp-form-grid">${[
            ['sb', 'Sangat Baik'],
            ['b', 'Baik'],
            ['c', 'Cukup'],
        ]
            .map(([key, label]) =>
                field(key, `Batas ${label}`, p.categories[key], {
                    type: 'number',
                    min: 1,
                    max: 100,
                    disabled: locked,
                }),
            )
            .join(
                '',
            )}</div><p class="gp-field-error" data-gp-error="categories" hidden></p></section>
        <div class="fx-form-actions"><button class="btn btn-primary" type="submit" form="skp-period-form" ${locked ? 'disabled' : ''}>${ctx.periodEditing ? 'Simpan perubahan' : 'Tambah periode'}</button><span class="gp-help" role="status">${esc(ctx.periodSaved || '')}</span></div>
    </form></section>`;
}
