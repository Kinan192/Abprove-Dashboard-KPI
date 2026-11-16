import { monthLabel, openBlock } from './model.js';
import { esc, field, note, button, sectionHeading } from './markup.js';

export function newPeriod(data) {
    const latest = data.periods
        .map((p) => p.id)
        .sort()
        .at(-1);
    const next = new Date(`${latest || new Date().toISOString().slice(0, 7)}-01T12:00:00Z`);
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

export function periodEditor(p, old) {
    const closed = old?.status === 'closed',
        schedule = closed || !!old?.hasAssessments,
        block = old && old.status !== 'open' && !closed ? openBlock(old) : '';
    return `<section class="card skp-form-card fx-period-editor"><div class="fx-card-heading"><div><h2>${old ? `Periode: ${esc(old.name)}` : 'Periode baru'}</h2><p>Informasi, jadwal dan kategori nilai periode.</p></div></div>${closed ? note('Periode ditutup hanya dapat dibaca.') : schedule ? note('Periode sudah dipakai penilaian. Jadwal dan kategori dikunci; hanya status yang dapat diubah.', 'warning') : ''}${block ? note(`Belum dapat dibuka: ${block}`, 'warning') : ''}<form id="skp-period-form" novalidate>
        <section class="fx-form-section">${sectionHeading(1, 'Informasi periode', 'Bulan yang dinilai, nama dan status periode.')}<div class="gp-form-grid">${field('month', 'Bulan yang dinilai', p.id, { type: 'month', required: true, disabled: !!old, help: old ? 'Bulan periode tidak dapat digeser. Buat periode baru untuk bulan lain.' : '' })}${field('name', 'Nama periode', p.name, { required: true, disabled: closed, maxlength: 190 })}${field(
            'status',
            'Status periode',
            p.status,
            {
                options: [
                    ['planned', 'Direncanakan'],
                    ['open', 'Aktif (dibuka untuk penilaian)'],
                    ['closed', 'Ditutup'],
                ],
                placeholder: false,
                disabled: closed,
                help: 'Periode hanya dapat dibuka bila seluruh staf eligible memiliki pola KPI 100%.',
            },
        )}</div></section>
        <section class="fx-form-section">${sectionHeading(2, 'Jadwal penilaian', 'Semua waktu dalam WIB.')}<div class="gp-form-grid">${[
            ['opens', 'Mulai pengisian'],
            ['submission', 'Batas pengajuan Kepala Unit'],
            ['approval', 'Batas ACC Kepala Divisi'],
            ['closes', 'Tutup periode'],
        ]
            .map(([key, label]) =>
                field(key, `${label} (WIB)`, p[key], {
                    type: 'datetime-local',
                    required: true,
                    disabled: schedule,
                }),
            )
            .join('')}</div></section>
        <section class="fx-form-section">${sectionHeading(3, 'Kategori nilai', 'Ambang nilai untuk setiap kategori.')}<div class="fx-category-grid gp-form-grid">${[
            ['sb', 'Sangat Baik'],
            ['b', 'Baik'],
            ['c', 'Cukup'],
        ]
            .map(([key, label]) =>
                field(key, `Batas ${label}`, p.categories[key], {
                    type: 'number',
                    min: 1,
                    max: 100,
                    step: 'any',
                    disabled: schedule,
                }),
            )
            .join('')}</div><p class="gp-field-error" data-gp-error="categories" hidden></p></section>
        <p class="gp-note error" data-form-error role="alert" hidden></p>
        <div class="fx-form-actions"><button class="btn btn-primary" type="submit" ${closed ? 'disabled' : ''}>${old ? 'Simpan perubahan' : 'Tambah periode'}</button>${button('nav', 'Batal', 'periods')}</div>
    </form></section>`;
}
