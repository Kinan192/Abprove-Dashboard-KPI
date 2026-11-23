import { monthLabel, openBlock, currentMonth, YEAR_MIN, YEAR_MAX } from './model.js';
import { esc, field, note, tag, button, sectionHeading } from './markup.js';

const shift = (month, by) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + by);
    return date.toISOString().slice(0, 7);
};
export const defaultPeriodName = (month) => `Penilaian ${monthLabel(month)}`;
/** Schedule of a period: filled in during the following month (WIB). */
export const defaultSchedule = (month) => {
    const following = shift(month, 1);
    return {
        opens: `${following}-01T08:00`,
        submission: `${following}-05T23:59`,
        approval: `${following}-10T23:59`,
        closes: `${following}-15T23:59`,
    };
};
/**
 * Draft of a new period. `preferred` (YYYY-MM) is used when it is free; a year (YYYY) picks its
 * first free month (from the current month in the current year); otherwise the month after the latest period.
 */
export function newPeriod(data, preferred = '') {
    const taken = new Set(data.periods.map((p) => p.id)),
        allowed = (id) => !taken.has(id);
    let id = '';
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(preferred) && allowed(preferred)) id = preferred;
    else if (/^\d{4}$/.test(preferred)) {
        const now = currentMonth(),
            start = preferred === now.slice(0, 4) ? now : `${preferred}-01`;
        for (let m = start; m.startsWith(preferred) && !id; m = shift(m, 1)) if (allowed(m)) id = m;
    }
    if (!id) id = shift([...taken].sort().at(-1) || shift(currentMonth(), -1), 1);
    return {
        id,
        name: defaultPeriodName(id),
        status: 'planned',
        ...defaultSchedule(id),
        categories: { sb: 90, b: 80, c: 70 },
    };
}

const STEP_STATES = { done: 'Selesai', current: 'Langkah berikutnya', todo: 'Belum' };

/**
 * Activation checklist of a new or planned (workspace-managed) period: save as planned →
 * Pola KPI 100% → Terapkan ke staf → Cek bobot → Buka periode. `setup` (saved periods only)
 * holds the pattern counts of the month and `link(screen, label)` to that month's screens.
 */
function setupPanel(old, setup, block) {
    const r = old?.readiness?.staff,
        heads = old?.readiness?.unit_head,
        ready = !!old && !block,
        missing = r ? r.eligible - r.complete : 0,
        patterned = !!setup?.complete;
    const steps = [
        ['Simpan periode', old ? 'Tersimpan sebagai Direncanakan.' : 'Isi form di bawah, lalu pilih Tambah periode.', old ? 'done' : 'current', ''],
        [
            'Siapkan pola KPI 100%',
            !setup
                ? 'Setelah disimpan, gunakan KPI periode lain atau buat pola baru.'
                : setup.patterns
                  ? `${setup.complete} dari ${setup.patterns} pola sudah tepat 100%.`
                  : 'Belum ada pola. Gunakan KPI periode sebelumnya, lalu sesuaikan.',
            !old ? 'todo' : patterned ? 'done' : 'current',
            setup ? setup.link('patterns', setup.patterns ? 'Kelola pola KPI' : 'Siapkan pola KPI') : '',
        ],
        [
            'Terapkan pola ke seluruh staf',
            r
                ? `${r.complete} dari ${r.eligible} staf memakai pola 100%${missing ? ` · ${missing} belum` : ''}.${heads ? ` Kepala Unit ${heads.complete}/${heads.eligible} (tidak menghalangi pembukaan).` : ''}`
                : 'Tersedia setelah periode disimpan.',
            ready ? 'done' : old && patterned ? 'current' : 'todo',
            setup ? setup.link('apply', 'Terapkan pola') : '',
        ],
        [
            'Cek bobot per orang',
            'Pastikan tidak ada staf tanpa pola atau dengan pola di bawah 100%.',
            ready ? 'done' : 'todo',
            !setup ? '' : missing > 0 ? button('show-missing', `Lihat ${missing} staf tanpa pola`, old.id, 'btn btn-small') : setup.link('matrix', 'Cek bobot'),
        ],
        [
            'Buka periode',
            ready ? 'Pilih status Aktif lalu simpan, atau gunakan Buka periode di daftar.' : 'Tersedia setelah langkah 3 dan 4 selesai.',
            ready ? 'current' : 'todo',
            '',
        ],
    ];
    const reason = !old ? '' : block ? `Belum dapat dibuka: ${block}` : 'Seluruh staf sudah memakai pola KPI 100%.';
    return `<section class="fx-period-setup" aria-labelledby="fx-period-setup-title"><div class="fx-period-setup-head"><h3 id="fx-period-setup-title">Langkah sampai periode aktif</h3>${old ? tag(ready ? 'Siap dibuka' : 'Belum dapat dibuka', ready ? 'success' : 'warning') : tag('Periode baru', 'info')}</div>${reason ? `<p class="fx-period-setup-reason ${ready ? 'ready' : ''}" id="fx-period-open-reason">${esc(reason)}</p>` : ''}<ol class="fx-setup-steps">${steps
        .map(
            ([title, help, state, action], i) =>
                `<li class="${state}" ${state === 'current' ? 'aria-current="step"' : ''}><span class="fx-setup-no" aria-hidden="true">${state === 'done' ? '✓' : i + 1}</span><div><strong>${esc(title)}</strong><span class="sr-only"> · ${STEP_STATES[state]}</span><p>${esc(help)}</p>${action ? `<div class="fx-setup-action">${action}</div>` : ''}</div></li>`,
        )
        .join('')}</ol></section>`;
}

function statusField(p, old, closed, block) {
    if (!old)
        return field('status', 'Status periode', 'planned', {
            options: [['planned', 'Direncanakan']],
            placeholder: false,
            disabled: true,
            help: 'Periode baru selalu disimpan sebagai Direncanakan.',
        });
    const blocked = old.status === 'planned' && !!block;
    return field('status', 'Status periode', p.status, {
        options: [
            ['planned', 'Direncanakan'],
            ['open', blocked ? 'Aktif — belum dapat dibuka' : 'Aktif (dibuka untuk penilaian)', blocked],
            ['closed', 'Ditutup'],
        ],
        placeholder: false,
        disabled: closed,
        help: blocked
            ? `Belum dapat dibuka: ${block}`
            : old.status === 'planned'
              ? 'Siap dibuka. Pilih Aktif lalu simpan.'
              : 'Periode ditutup tidak dapat dibuka kembali.',
    });
}

export function periodEditor(p, old, setup = null) {
    const closed = old?.status === 'closed',
        schedule = closed || !!old?.hasAssessments,
        legacy = !!old?.businessId && !old?.managed,
        block = old && old.status !== 'open' && !closed ? openBlock(old) : '',
        checklist = !closed && old?.status !== 'open' && !legacy;
    return `<section class="card skp-form-card fx-period-editor"><div class="fx-card-heading"><div><h2>${old ? `Periode: ${esc(old.name)}` : 'Periode baru'}</h2><p>Informasi, jadwal dan kategori nilai.</p></div></div>${closed ? note('Periode ditutup hanya dapat dibaca.') : schedule ? note('Periode sudah dipakai penilaian. Jadwal dan kategori dikunci; hanya status yang dapat diubah.', 'warning') : ''}${checklist ? setupPanel(old, setup, block) : ''}<form id="skp-period-form" novalidate>
        <section class="fx-form-section">${sectionHeading(1, 'Informasi periode', 'Bulan yang dinilai, nama dan status.')}<div class="gp-form-grid">${field('month', 'Bulan yang dinilai', p.id, { type: 'month', required: true, disabled: !!old, min: `${YEAR_MIN}-01`, max: `${YEAR_MAX}-12`, help: old ? 'Bulan periode tidak dapat diubah.' : 'Boleh bulan berjalan, lampau atau mendatang.' })}${field('name', 'Nama periode', p.name, { required: true, disabled: closed, maxlength: 190 })}${statusField(p, old, closed, block)}</div></section>
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
