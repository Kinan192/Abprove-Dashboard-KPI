import {
    CYCLE_STATUSES,
    monthLabel,
    monthRange,
    templateGoals,
    templateWeight,
    templateErrors,
    assessmentTotal,
} from './domain.js';
import {
    esc,
    btn,
    field,
    check,
    note,
    tag,
    empty,
    num,
    date,
    definition,
    steps,
} from './markup.js';
import { heading, link, tr, table, cycleTag, timeline } from './views.js';

export function cycleList(ctx) {
    const { data, cf } = ctx,
        rows = data.cycles
            .filter(
                (c) =>
                    (!cf.year || c.month.startsWith(cf.year)) &&
                    (!cf.status || c.status === cf.status) &&
                    (!cf.search ||
                        c.name.toLowerCase().includes(cf.search.toLowerCase())),
            )
            .toSorted((a, b) => b.month.localeCompare(a.month));
    const heads = [
        'Periode penilaian',
        'Rentang Goal',
        'Jadwal pengisian',
        'Persetujuan / finalisasi',
        'Template',
        'Status',
        'Tindakan',
    ];
    return `${heading('Pengaturan Periode', 'Pisahkan bulan yang dinilai dari jadwal pengisian dan keputusan.', btn('new-cycle', '+ Buat Periode', { primary: true }))}<div class="gp-summary"><div><span>Periode aktif</span><strong>${data.cycles.filter((c) => ['active', 'approval'].includes(c.status)).length}</strong></div><div><span>Periode berikutnya</span><strong>${data.cycles.filter((c) => ['draft', 'scheduled'].includes(c.status)).length}</strong></div><div><span>Selesai</span><strong>${data.cycles.filter((c) => ['closed', 'archived'].includes(c.status)).length}</strong></div><div><span>Menunggu keputusan</span><strong>${data.assessments.filter((a) => ['Diajukan', 'Disetujui'].includes(a.status)).length}</strong></div></div><div class="gp-filters"><input type="search" class="field gp-search" data-gp-search="cycles" value="${esc(cf.search)}" placeholder="Cari periode" aria-label="Cari periode"><select class="field" data-gp-cycle-filter="year" aria-label="Filter tahun"><option value="">Semua tahun</option>${[...new Set(data.cycles.map((c) => c.month.slice(0, 4)))].map((y) => `<option ${cf.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select><select class="field" data-gp-cycle-filter="status" aria-label="Filter status periode"><option value="">Semua status</option>${Object.entries(
        CYCLE_STATUSES,
    )
        .map(
            ([id, label]) =>
                `<option value="${id}" ${cf.status === id ? 'selected' : ''}>${label}</option>`,
        )
        .join(
            '',
        )}</select></div><div data-gp-cycle-results>${cycleRows(ctx, rows, heads)}</div>`;
}
export function cycleRows(
    ctx,
    rows,
    heads = [
        'Periode penilaian',
        'Rentang Goal',
        'Jadwal pengisian',
        'Persetujuan / finalisasi',
        'Template',
        'Status',
        'Tindakan',
    ],
) {
    if (!rows) {
        const { cf } = ctx;
        rows = ctx.data.cycles
            .filter(
                (c) =>
                    (!cf.year || c.month.startsWith(cf.year)) &&
                    (!cf.status || c.status === cf.status) &&
                    (!cf.search ||
                        c.name.toLowerCase().includes(cf.search.toLowerCase())),
            )
            .toSorted((a, b) => b.month.localeCompare(a.month));
    }
    return table(
        ctx,
        heads,
        rows,
        (c) =>
            tr(
                [
                    `${link(ctx, 'cycle-detail', c.name, { id: c.id }, 'gp-record-title')}<small>${esc(monthLabel(c.month))}</small>`,
                    monthRange(c.month).map(date).join('<br>'),
                    `${date(c.opens)}<small>s.d. ${date(c.submission)} WIB</small>`,
                    `${date(c.approval)}<small>Final: ${date(c.finalization)} WIB</small>`,
                    c.templateIds.length,
                    cycleTag(c),
                    link(ctx, 'cycle-detail', 'Detail', { id: c.id }),
                ],
                heads,
            ),
        'cycles',
        10,
    );
}
export function cycleForm(ctx) {
    const { data, cycleWorking: c, step } = ctx,
        labels = [
            'Identitas',
            'Jadwal proses',
            'Template & kategori',
            'Tinjau',
        ];
    let body = '';
    if (step === 0)
        body = `<h2>Identitas periode bulanan</h2><div class="gp-form-grid gp-space">${field('month', 'Bulan yang dinilai', c.month, { type: 'month', required: true })}${field('name', 'Nama periode', c.name, { required: true, maxlength: 190 })}${field('description', 'Deskripsi', c.description, { textarea: true, wide: true })}<div class="gp-field"><span class="label">Rentang Goal / KPI</span><p class="gp-readout" data-gp-cycle-range>${monthRange(c.month).map(date).join(' — ')}</p></div><div class="gp-field"><span class="label">Frekuensi / zona waktu</span><p class="gp-readout">Bulanan · Asia/Jakarta (WIB)</p></div></div>${note('Bulan penilaian berbeda dari waktu pemrosesan. Contoh: Oktober dinilai pada pengisian November.')}`;
    if (step === 1)
        body = `<h2>Jadwal proses penilaian</h2><p class="gp-section-copy">Semua jam menggunakan WIB. Jadwal harus berurutan; pengisian boleh berlangsung pada bulan berikutnya.</p><div class="gp-form-grid">${[
            ['opens', 'Mulai pengisian'],
            ['submission', 'Batas pengajuan Kepala Unit'],
            ['approval', 'Batas persetujuan Kepala Divisi'],
            ['finalization', 'Batas finalisasi Super HC'],
            ['closes', 'Penutupan periode'],
        ]
            .map(([key, label]) =>
                field(key, `${label} (WIB)`, c[key], {
                    type: 'datetime-local',
                    required: true,
                }),
            )
            .join('')}</div>`;
    if (step === 2)
        body = `<h2>Template KPI yang berlaku</h2><p class="gp-section-copy">Pilih template yang akan digunakan. Goal dan bobot dapat dilengkapi setelah periode Draft dibuat.</p><div class="gp-template-picker">${data.templates
            .filter((t) => t.active)
            .map((t) => {
                const goals = templateGoals(data, t.id, c.id || c.month);
                return `<label class="gp-check"><input type="checkbox" name="templateIds" value="${t.id}" ${c.templateIds.includes(t.id) ? 'checked' : ''}><span><strong>${esc(t.name)}</strong><small>${goals.length} KPI · bobot ${num(templateWeight(goals), 4)}% · ${data.staff.filter((p) => p.templateId === t.id).length} anggota</small></span></label>`;
            })
            .join(
                '',
            )}</div><h3 class="gp-space">Kategori nilai</h3><div class="gp-form-grid gp-space">${field('sb', 'Batas Sangat Baik', c.categories.sb, { type: 'number', min: 1, max: 100 })}${field('b', 'Batas Baik', c.categories.b, { type: 'number', min: 1, max: 99 })}${field('c', 'Batas Cukup', c.categories.c, { type: 'number', min: 1, max: 98 })}</div><p class="gp-field-error" data-gp-error="categories" hidden></p>${note('Kurang berada di bawah batas Cukup. Nilai kategori disimpan per periode dan tidak mengubah histori Final.')}`;
    if (step === 3) {
        const staff = data.staff.filter((p) =>
            c.templateIds.includes(p.templateId),
        );
        body = `<h2>Tinjau periode dan dampaknya</h2>${definition([
            ['Nama', esc(c.name)],
            ['Bulan yang dinilai', esc(monthLabel(c.month))],
            ['Rentang Goal', monthRange(c.month).map(date).join(' — ')],
            ['Mulai pengisian', `${date(c.opens)} WIB`],
            ['Batas pengajuan', `${date(c.submission)} WIB`],
            ['Batas persetujuan', `${date(c.approval)} WIB`],
            ['Batas finalisasi', `${date(c.finalization)} WIB`],
            ['Penutupan', `${date(c.closes)} WIB`],
            [
                'Cakupan',
                `${new Set(staff.map((p) => p.divisionId)).size} divisi · ${new Set(staff.map((p) => p.unitId)).size} unit · ${staff.length} anggota`,
            ],
            ['Template dipilih', `${c.templateIds.length} template`],
        ])}${note('Simpan periode terlebih dahulu, lalu buat/publikasikan Goal pada template terpilih. Aktivasi tersedia setelah seluruh template siap dengan bobot 100%.')}`;
    }
    return `${heading(c.id ? 'Ubah periode' : 'Buat periode penilaian', 'Identitas bulan, jadwal proses, dan KPI berlaku saling terhubung.')}${steps(labels, step)}<form id="gp-cycle-form" novalidate><section class="card gp-form-card">${body}<p class="gp-field-error" data-gp-error="locked" hidden></p></section><div class="gp-form-footer"><div>${btn('cancel-cycle', 'Batal')}${step ? btn('cycle-back', 'Kembali') : ''}</div><div>${step < 3 ? btn('cycle-next', 'Lanjutkan', { primary: true }) : `${btn('save-cycle', 'Simpan Draft', { primary: true })}${btn('schedule-cycle', 'Jadwalkan')}`}</div></div></form>`;
}
export function cycleDetail(ctx, id) {
    const { data } = ctx,
        c = data.cycles.find((c) => c.id === id);
    if (!c) return empty('Periode tidak ditemukan');
    const rows = data.assessments.filter((a) => a.cycleId === id),
        finals = rows.filter((a) => a.status === 'Final').length,
        locked = finals > 0,
        tab = ctx.cycleTab || 'information';
    let body = '';
    if (tab === 'information')
        body = `${definition([
            ['Nama periode', esc(c.name)],
            ['Bulan penilaian', esc(monthLabel(c.month))],
            ['Rentang Goal', monthRange(c.month).map(date).join(' — ')],
            ['Deskripsi', esc(c.description || 'Penilaian kinerja bulanan')],
            ['Zona waktu', 'Asia/Jakarta (WIB)'],
            ['Penilaian', `${finals} Final / ${rows.length} lembar`],
            [
                'Kategori nilai',
                `≥${c.categories.sb} Sangat Baik · ≥${c.categories.b} Baik · ≥${c.categories.c} Cukup · di bawahnya Kurang`,
            ],
        ])}${locked ? note('Periode memiliki penilaian Final. Identitas bulan, kategori, KPI, dan snapshot historis tidak ditulis ulang.') : ''}${btn('edit-cycle', 'Ubah periode', { id, disabled: locked || ['closed', 'archived'].includes(c.status) })}${btn('impact-cycle', 'Lihat pengaruh', { id })}`;
    if (tab === 'schedule')
        body = `<ol class="gp-process-timeline">${[
            [
                'opens',
                'Mulai pengisian',
                'Kepala Unit mengisi dan mengajukan nilai.',
            ],
            [
                'submission',
                'Batas pengajuan',
                'Pengajuan lengkap diteruskan ke Kepala Divisi.',
            ],
            [
                'approval',
                'Batas persetujuan',
                'Kepala Divisi meninjau tanpa mengubah angka.',
            ],
            [
                'finalization',
                'Batas finalisasi',
                'Super HC memfinalkan hasil Disetujui.',
            ],
            [
                'closes',
                'Penutupan',
                'Penilaian tertunda harus diselesaikan dahulu.',
            ],
        ]
            .map(
                ([key, label, copy], i) =>
                    `<li><span>${i + 1}</span><div><strong>${label}</strong><p>${date(c[key])} WIB</p><small>${copy}</small></div></li>`,
            )
            .join('')}</ol>`;
    if (tab === 'templates') {
        const heads = [
            'Template / jabatan',
            'KPI',
            'Bobot',
            'Kesiapan',
            'Tindakan',
        ];
        body = `${table(
            { ...ctx, cycleId: id },
            heads,
            data.templates.filter((t) => c.templateIds.includes(t.id)),
            (t) => {
                const goals =
                    c.bindings?.[t.id] || templateGoals(data, t.id, id);
                const valid =
                    goals.length > 0 &&
                    templateWeight(goals) === 100 &&
                    goals.every((g) => g.status === 'active');
                return tr(
                    [
                        link(
                            ctx,
                            'template-detail',
                            t.name,
                            { id: t.id, cycle: id },
                            'gp-record-title',
                        ),
                        goals.length,
                        `${num(templateWeight(goals), 4)}%`,
                        tag(
                            valid ? 'Siap' : 'Belum siap',
                            valid ? 'success' : 'warning',
                        ),
                        link(ctx, 'template-detail', 'Lihat KPI', {
                            id: t.id,
                            cycle: id,
                        }),
                    ],
                    heads,
                );
            },
            'cycle-templates',
            5,
        )}${note('Periode aktif menggunakan snapshot template yang dibentuk saat aktivasi. Perubahan master sesudahnya tidak menulis ulang lembar yang sudah terbentuk.')}`;
    }
    if (tab === 'progress') {
        const heads = ['Karyawan / unit', 'Status', 'Total', 'Tindakan'];
        body = `<div class="gp-flow-strip"><span>Periode</span><span>Goal / template</span><span>Kepala Unit</span><span>Kepala Divisi</span><span>Super HC · Final</span></div>${
            rows.length
                ? table(
                      ctx,
                      heads,
                      rows,
                      (a) => {
                          const p = data.staff.find((p) => p.id === a.staffId);
                          return tr(
                              [
                                  `${esc(p.name)}<small>${esc(data.units.find((u) => u.id === a.unitId)?.name)}</small>`,
                                  tag(
                                      a.status,
                                      a.status === 'Final'
                                          ? 'success'
                                          : a.status === 'Dikembalikan'
                                            ? 'warning'
                                            : 'info',
                                  ),
                                  num(a.finalTotal ?? assessmentTotal(a), 2),
                                  link(ctx, 'assessment', 'Tinjau', {
                                      id: a.id,
                                      cycle: id,
                                  }),
                              ],
                              heads,
                          );
                      },
                      'cycle-assessments',
                      10,
                  )
                : empty(
                      'Belum ada lembar penilaian',
                      'Aktifkan periode setelah seluruh template KPI siap.',
                  )
        }<h3 class="gp-space">Riwayat siklus</h3>${timeline(data, 'cycle', id)}`;
    }
    return `${link(ctx, 'cycles', '← Daftar periode', {}, 'gp-back')}${heading(c.name, `${monthRange(c.month).map(date).join(' — ')} · bulan yang dinilai`, `${cycleTag(c)}${btn('repeat-cycle', 'Duplikasi periode', { id })}${['draft', 'scheduled'].includes(c.status) ? btn('activate-cycle', 'Aktifkan periode', { id, primary: true }) : ['active', 'approval'].includes(c.status) ? btn('close-cycle', 'Tutup periode', { id }) : c.status === 'closed' ? btn('archive-cycle', 'Arsipkan', { id }) : ''}${c.status === 'draft' ? btn('delete-cycle', 'Hapus Draft', { id }) : ''}`)}<div class="seg w-fit gp-status-tabs">${[
        ['information', 'Informasi periode'],
        ['schedule', 'Jadwal proses'],
        ['templates', 'KPI berlaku'],
        ['progress', 'Progres & audit'],
    ]
        .map(
            ([value, label]) =>
                `<button type="button" data-gp-cycle-tab="${value}" class="${tab === value ? 'active' : ''}">${label}</button>`,
        )
        .join('')}</div><section class="card gp-detail-card">${body}</section>`;
}
