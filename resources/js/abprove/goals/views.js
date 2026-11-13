import {
    TYPES,
    GOAL_STATUSES,
    CYCLE_STATUSES,
    monthLabel,
    monthRange,
    templateGoals,
    templateWeight,
    templateErrors,
    goalErrors,
    achievement,
    assessmentTotal,
    category,
} from './domain.js';
import {
    esc,
    attrs,
    btn,
    field,
    check,
    note,
    tag,
    empty,
    num,
    moneyUnit,
    date,
    definition,
    steps,
} from './markup.js';

export const heading = (title, subtitle, actions = '') =>
    `<div class="gp-heading"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="gp-actions">${actions}</div></div>`;
export const link = (ctx, screen, label, params = {}, cls = 'link') =>
    `<a class="${cls}" href="${esc(ctx.url(screen, params))}" data-gp-nav="${esc(screen)}" ${attrs(Object.fromEntries(Object.entries(params).map(([k, v]) => [`data-${k}`, v])))}>${esc(label)}</a>`;
export const td = (value, label, cls = '') =>
    `<td class="${cls}" data-label="${esc(label)}">${value}</td>`;
export const tr = (cells, labels) =>
    `<tr>${cells.map((value, i) => td(value, labels[i])).join('')}</tr>`;
export function table(
    ctx,
    headings,
    rows,
    render,
    key,
    size = 10,
    className = '',
) {
    ctx.pageSizes ||= {};
    size = ctx.pageSizes[key] || 10;
    const page = Math.max(
        0,
        Math.min(ctx.pages[key] || 0, Math.ceil(rows.length / size) - 1),
    );
    ctx.pages[key] = page;
    return `<div class="table-wrap"><table class="data-table gp-table ${className}"><thead><tr>${headings.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
        rows.length
            ? rows
                  .slice(page * size, (page + 1) * size)
                  .map(render)
                  .join('')
            : `<tr><td colspan="${headings.length}" class="empty">Belum ada data pada filter ini.</td></tr>`
    }</tbody></table></div><nav class="gp-pagination" aria-label="Pagination ${esc(key)}"><span>${rows.length ? `${page * size + 1}–${Math.min((page + 1) * size, rows.length)} dari ${rows.length}` : '0 data'}</span><label class="table-page-size">Baris per halaman<select class="field" data-gp-page-size="${esc(key)}" aria-label="Baris per halaman">${[10, 25, 50].map((n) => `<option value="${n}" ${n === size ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div><button class="pagination-button" type="button" data-gp-page="${esc(key)}" data-delta="-1" ${page ? '' : 'disabled'} aria-label="Halaman sebelumnya">‹</button><span>${page + 1} / ${Math.max(1, Math.ceil(rows.length / size))}</span><button class="pagination-button" type="button" data-gp-page="${esc(key)}" data-delta="1" ${(page + 1) * size >= rows.length ? 'disabled' : ''} aria-label="Halaman berikutnya">›</button></div></nav>`;
}
export function owner(data, goal) {
    const template = data.templates.find((t) => t.id === goal.templateId);
    if (template)
        return `${data.positions.find((p) => p.id === template.positionId)?.name} · ${data.units.find((u) => u.id === template.unitId)?.name}`;
    return (
        (goal.type === 'team' ? data.units : data.divisions).find(
            (row) => row.id === goal.ownerId,
        )?.name ||
        (goal.type === 'company' ? 'RS Awal Bros Botania' : 'Belum ditetapkan')
    );
}
export const goalTag = (goal) =>
    tag(
        GOAL_STATUSES[goal.status],
        goal.status === 'active'
            ? 'success'
            : goal.status === 'draft'
              ? 'warning'
              : 'muted',
    );
export const cycleTag = (cycle) =>
    tag(
        CYCLE_STATUSES[cycle.status],
        ['active', 'approval'].includes(cycle.status)
            ? 'success'
            : cycle.status === 'scheduled'
              ? 'info'
              : 'muted',
    );
export function timeline(data, entity, id) {
    const rows = data.audit.filter(
        (a) => a.entity === entity && a.entityId === id,
    );
    return rows.length
        ? `<ol class="gp-timeline">${rows.map((a) => `<li><strong>${esc(a.action)}</strong><p>${esc(a.detail)}</p><small>${esc(date(a.at))} WIB</small></li>`).join('')}</ol>`
        : empty(
              'Belum ada perubahan',
              'Riwayat muncul setelah perubahan disimpan pada prototype.',
          );
}
export function measurement(goal, prefix = '') {
    return `<div class="gp-form-grid">${field(
        'direction',
        'Measurement type',
        goal.direction,
        {
            required: true,
            options: [
                ['increase', 'Increase KPI · semakin tinggi semakin baik'],
                ['decrease', 'Decrease KPI · semakin rendah semakin baik'],
            ],
            placeholder: false,
        },
    )}${field('unit', 'Unit pengukuran', goal.unit, {
        required: true,
        options: [
            ['percent', 'Persen (%)'],
            ['number', 'Angka'],
            ['idr', 'Rupiah (Rp)'],
        ],
        placeholder: false,
    })}${field('baseline', 'Baseline', goal.baseline, { type: 'number', step: 'any', disabled: goal.noBaseline, help: goal.noBaseline ? 'Tanpa baseline; progress otomatis belum diaktifkan.' : 'Nilai awal sebelum target dicapai.' })}${field('target', 'Target numerik', goal.target, { type: 'number', step: 'any', required: true })}</div>${check('noBaseline', 'Tanpa baseline', goal.noBaseline, 'Target tetap dicatat. Rumus progress tanpa baseline menunggu keputusan kebijakan.')}`;
}
export function goalList(ctx) {
    const { data, f } = ctx;
    const scopedGoals = data.goals.filter(
        (g) => !f.cycle || g.cycleId === f.cycle,
    );
    return `${heading('KPI / Goals', 'Susun target, tetapkan jabatan, lalu gunakan pada periode penilaian.', btn('new-goal', '+ Buat Goal', { primary: true }))}<div class="gp-summary">${[
        ['Goal aktif', scopedGoals.filter((g) => g.status === 'active').length],
        ['Draft Goal', scopedGoals.filter((g) => g.status === 'draft').length],
        [
            'Diarsipkan',
            scopedGoals.filter((g) => g.status === 'archived').length,
        ],
        ['Template jabatan', data.templates.length],
    ]
        .map(
            ([label, n]) =>
                `<div><span>${esc(label)}</span><strong>${n}</strong></div>`,
        )
        .join(
            '',
        )}</div><div class="gp-filters"><input class="field gp-search" data-gp-search="goals" aria-label="Cari Goal" placeholder="Cari nama atau kode Goal" value="${esc(f.search)}"><select class="field" data-gp-filter="cycle" aria-label="Filter periode"><option value="">Semua periode</option>${data.cycles.map((c) => `<option value="${c.id}" ${c.id === f.cycle ? 'selected' : ''}>${esc(monthLabel(c.month))}</option>`).join('')}</select><select class="field" data-gp-filter="type" aria-label="Filter jenis Goal"><option value="">Semua jenis Goal</option>${Object.entries(
        TYPES,
    )
        .map(
            ([id, name]) =>
                `<option value="${id}" ${f.type === id ? 'selected' : ''}>${esc(name.split(' · ')[0])}</option>`,
        )
        .join(
            '',
        )}</select>${btn('goal-filters', 'Filter lainnya')}${Object.values(f).some(Boolean) ? btn('reset-filters', 'Reset', { ghost: true }) : ''}</div><div class="seg w-fit gp-status-tabs" role="group" aria-label="Status Goal">${[
        ['', 'Semua'],
        ['active', 'Aktif'],
        ['draft', 'Draft'],
        ['archived', 'Diarsipkan'],
    ]
        .map(
            ([value, label]) =>
                `<button type="button" data-gp-status="${value}" class="${f.status === value ? 'active' : ''}" aria-pressed="${f.status === value}">${label}</button>`,
        )
        .join('')}</div><div data-gp-results>${goalRows(ctx)}</div>`;
}
export function goalRows(ctx) {
    const { data, f } = ctx,
        rows = data.goals
            .filter((g) => {
                const template = data.templates.find(
                        (t) => t.id === g.templateId,
                    ),
                    unit = g.type === 'team' ? g.ownerId : template?.unitId,
                    division =
                        g.type === 'organization'
                            ? g.ownerId
                            : data.units.find((u) => u.id === unit)?.divisionId;
                return (
                    (!f.cycle || g.cycleId === f.cycle) &&
                    (!f.type || g.type === f.type) &&
                    (!f.status || g.status === f.status) &&
                    (!f.pillar || g.pillar === f.pillar) &&
                    (!f.division || division === f.division) &&
                    (!f.unit || unit === f.unit) &&
                    (!f.position || template?.positionId === f.position) &&
                    (!f.owner ||
                        owner(data, g)
                            .toLowerCase()
                            .includes(f.owner.toLowerCase())) &&
                    (!f.search ||
                        `${g.name} ${g.code}`
                            .toLowerCase()
                            .includes(f.search.toLowerCase()))
                );
            })
            .toSorted((a, b) => b.code.localeCompare(a.code));
    const heads = [
        'Goal / pilar',
        'Jenis',
        'Pemilik / cakupan',
        'Periode',
        'Pengukuran',
        'Bobot',
        'Status',
        'Tindakan',
    ];
    if (!rows.length)
        return `${empty('Belum ada Goal pada filter ini', 'Buat Goal pertama atau sesuaikan filter periode dan cakupan.')}<div class="gp-empty-action">${btn('new-goal', '+ Buat Goal', { primary: true })}</div>`;
    return table(
        ctx,
        heads,
        rows,
        (g) =>
            tr(
                [
                    `${link(ctx, 'goal-detail', g.name || 'Goal belum diberi nama', { id: g.id }, 'gp-record-title')}<small>${esc(g.code)} · ${esc(g.pillar || 'Pilar belum diisi')}</small>`,
                    esc(TYPES[g.type]?.split(' · ')[0]),
                    esc(owner(data, g)),
                    esc(monthLabel(g.cycleId)),
                    `<span class="gp-nowrap">${g.direction === 'increase' ? '↑' : '↓'} ${g.noBaseline ? 'Tanpa baseline' : num(g.baseline)} → ${num(g.target)} ${moneyUnit(g.unit)}</span>`,
                    `${num(g.weight, 4)}%`,
                    goalTag(g),
                    `${link(ctx, 'goal-detail', 'Detail', { id: g.id })}<button type="button" class="link gp-row-action" data-gp-action="duplicate-goal" data-id="${g.id}">Duplikasi</button>`,
                ],
                heads,
            ),
        'goals',
        5,
        'gp-master-table',
    );
}
export function goalForm(ctx) {
    const { data, working: g, step } = ctx;
    const labels = [
        'Detail Goal',
        'Pengukuran',
        'Key Results',
        'Konfigurasi',
        'Tinjau',
    ];
    const cycle = data.cycles.find((c) => c.id === g.cycleId),
        template = data.templates.find((t) => t.id === g.templateId),
        rows = g.templateId
            ? templateGoals(data, g.templateId, g.cycleId, g)
            : [g],
        total = templateWeight(rows);
    let body = '';
    if (step === 0)
        body = `<div class="gp-section-heading"><h2>Identitas dan pemilik Goal</h2><div>${tag(TYPES[g.type], 'info')} ${btn('change-type', 'Ubah tipe', { ghost: true })}</div></div>${g.sourceId ? note(`Salinan konfigurasi. Aktual, nilai karyawan, dan keputusan tidak ikut disalin.`) : ''}<div class="gp-form-grid">${field('name', 'Nama Goal', g.name, { required: true, maxlength: 150, help: 'Gunakan nama KPI yang jelas, 5–150 karakter.' })}${field('pillar', 'Pilar / kategori', g.pillar, { required: true, list: 'gp-pillars', maxlength: 64, help: 'Pilih saran atau ketik pilar sesuai kebutuhan.' })}${g.type === 'individual' ? field('templateId', 'Template KPI jabatan', g.templateId, { required: true, options: data.templates.filter((t) => t.active).map((t) => [t.id, t.name]) }) : field('ownerId', 'Pemilik / cakupan', g.ownerId, { required: true, options: g.type === 'company' ? [['hospital', 'RS Awal Bros Botania']] : g.type === 'team' ? data.units : data.divisions })}${field('cycleId', 'Goal Cycle / periode', g.cycleId, { required: true, options: data.cycles.filter((c) => !['closed', 'archived'].includes(c.status)).map((c) => [c.id, c.name]) })}<div class="gp-field"><span class="label">Goal Period</span><p class="gp-readout" data-gp-goal-range>${cycle ? monthRange(cycle.month).map(date).join(' — ') : 'Pilih periode terlebih dahulu'}</p></div>${field('description', 'Deskripsi', g.description, { textarea: true, max: 2000 })}</div>${g.type === 'individual' ? note(`Cakupan: ${owner(data, g)}. Kode Goal dibuat otomatis saat disimpan.`) : note('Goal pemantauan. Target ini tidak otomatis menambah baris atau mengubah skor penilaian karyawan.')}<p class="gp-field-error" data-gp-error="ownerId" hidden></p>`;
    if (step === 1)
        body = `<h2>Target dan pengukuran</h2><p class="gp-section-copy">Simpan definisi KPI sesuai lembar rumah sakit. Progress aktual terpisah dari nilai penilaian 10–100.</p>${measurement(g)}<div class="gp-form-grid gp-space">${field('targetText', 'Target pada lembar KPI', g.targetText, { help: 'Contoh: 95%, <20%, atau Tidak ada.' })}${field('weight', 'Bobot KPI (%)', g.weight, { type: 'number', min: '0.0001', max: 100, step: '0.0001', required: true, help: 'Total seluruh KPI dalam satu template harus 100%.' })}</div><div class="gp-space">${btn('measurement-details', 'Atur numerator, denominator & formula')}<p class="gp-help">${esc(g.numerator || 'Numerator belum diisi')} / ${esc(g.denominator || 'Denominator belum diisi')}</p></div>${note('Sumber aktual: input manual. Nilai KPI tetap diisi penilai sebagai bilangan bulat 10–100; hasil = nilai × bobot / 100.')}`;
    if (step === 2)
        body = `<div class="gp-section-heading"><div><h2>Key Results</h2><p class="gp-section-copy">Opsional. Hasil ukur pendukung Goal, bukan baris skor tambahan.</p></div>${btn('add-kr', '+ Tambah Key Result')}</div>${(g.keyResults || []).length ? `<div class="gp-kr-list">${g.keyResults.map((kr, i) => `<div class="gp-kr"><div><strong>${esc(kr.name)}</strong><p>${kr.direction === 'increase' ? 'Increase' : 'Decrease'} · ${num(kr.baseline)} → ${num(kr.target)} ${moneyUnit(kr.unit)}${g.krWeighted ? ` · Bobot ${num(kr.weight)}%` : ''}</p></div><div>${btn('edit-kr', 'Edit', { id: String(i), ghost: true })}${btn('remove-kr', 'Hapus', { id: String(i), ghost: true })}</div></div>`).join('')}</div>` : empty('Belum ada Key Result', 'KPI sederhana dapat dilanjutkan tanpa Key Result.')}<p class="gp-field-error" data-gp-error="keyResults" hidden></p>${note('Pada rancangan ini, aktual Goal diperbarui manual. Agregasi progress dari Key Results menunggu keputusan kebijakan agar tidak dihitung dua kali.')}`;
    if (step === 3)
        body = `<h2>Konfigurasi Goal</h2><p class="gp-section-copy">Atur pengulangan dan bobot tanpa meninggalkan halaman.</p>${definition(
            [
                ['Goal Weight', `${num(g.weight, 4)}%`],
                [
                    'Repeat Goal',
                    g.repeat
                        ? 'Aktif · salin konfigurasi ke periode berikutnya'
                        : 'Tidak diulang',
                ],
                [
                    'Baseline',
                    g.noBaseline
                        ? 'Tanpa baseline · rumus progress belum diaktifkan'
                        : `${num(g.baseline)} ${moneyUnit(g.unit)}`,
                ],
                ['Mekanisme aktual', 'Update total achievement · input manual'],
                [
                    'Presisi tampilan',
                    g.precision
                        ? 'Tampilkan angka aktual'
                        : 'Bulatkan tampilan',
                ],
            ],
        )}<div class="gp-space">${btn('goal-config', 'Atur konfigurasi')}</div>${note('Repeat Goal menyiapkan salinan konfigurasi setelah HC memilih periode tujuan. Aktual, skor, temuan, dan keputusan tidak disalin; tidak ada pembuatan periode otomatis.')}`;
    if (step === 4) {
        const errors = [
            ...Object.values(goalErrors(data, g)),
            ...(g.templateId
                ? templateErrors(data, g.templateId, g.cycleId, g)
                : []),
        ];
        body = `<h2>Tinjau sebelum publikasi</h2>${errors.length ? note(errors[0], 'warning') : note('Goal dan bobot template valid. Siap ditinjau dan dipublikasikan.', 'success')}${definition(
            [
                ['Nama Goal', esc(g.name || 'Belum diisi')],
                ['Jenis / pilar', `${esc(TYPES[g.type])} / ${esc(g.pillar)}`],
                ['Pemilik / jabatan', esc(owner(data, g))],
                ['Periode', esc(cycle?.name || 'Belum dipilih')],
                [
                    'Rentang Goal',
                    cycle ? monthRange(cycle.month).map(date).join(' — ') : '—',
                ],
                [
                    'Pengukuran',
                    `${g.direction === 'increase' ? 'Increase' : 'Decrease'} · ${g.noBaseline ? 'Tanpa baseline' : num(g.baseline)} → ${num(g.target)} ${moneyUnit(g.unit)}`,
                ],
                ['Target teks', esc(g.targetText || '—')],
                ['Key Results', `${g.keyResults.length} hasil ukur pendukung`],
                ['Bobot KPI', `${num(g.weight, 4)}%`],
                [
                    'Total bobot template',
                    tag(
                        `${num(total, 4)}%`,
                        total === 100 ? 'success' : 'warning',
                    ),
                ],
            ],
        )}${note(g.type === 'individual' ? `KPI akan berlaku pada ${cycle?.name || 'periode yang dipilih'} untuk ${owner(data, g)}. Publikasi menetapkan seluruh Goal valid dalam template ini; snapshot penilaian yang sudah dibentuk tetap utuh.` : 'Goal ini dipublikasikan untuk pemantauan cakupan yang dipilih.')}<p class="gp-field-error" data-gp-error="review" hidden></p>`;
    }
    return `${heading(g.id ? 'Edit Draft Goal' : g.sourceId ? 'Buat salinan / versi berikutnya' : 'Buat KPI / Goal', g.id ? g.code : 'Definisi KPI terstruktur dengan format lembar rumah sakit.', btn('save-goal-draft', 'Simpan Draft'))}${steps(labels, step)}<form id="gp-goal-form" novalidate><section class="card gp-form-card">${body}</section><div class="gp-form-footer"><div>${btn('cancel-goal', 'Batal')}${step > 0 ? btn('goal-back', 'Kembali') : ''}</div><div><span class="gp-weight-summary">Bobot template <b data-gp-live-weight>${num(total, 4)}%</b></span>${step < 4 ? btn('goal-next', 'Lanjutkan', { primary: true }) : btn('publish-goal', g.templateId && rows.filter((r) => r.status === 'draft').length > 1 ? 'Publikasikan template' : 'Publikasikan Goal', { primary: true, disabled: Object.keys(goalErrors(data, g)).length > 0 || (g.templateId && templateErrors(data, g.templateId, g.cycleId, g).length > 0) })}</div></div></form>`;
}
export function goalDetail(ctx, id) {
    const { data } = ctx,
        g = data.goals.find((g) => g.id === id);
    if (!g)
        return empty(
            'Goal tidak ditemukan',
            'Kembali ke daftar untuk memilih Goal yang tersedia.',
        );
    const cycle = data.cycles.find((c) => c.id === g.cycleId),
        progress = achievement(g),
        locked =
            ['closed', 'archived'].includes(cycle?.status) ||
            g.status === 'archived';
    const tab = ctx.detailTab || 'details';
    let content = definition([
        ['Jenis Goal', esc(TYPES[g.type])],
        ['Pilar', esc(g.pillar)],
        ['Pemilik / cakupan', esc(owner(data, g))],
        ['Deskripsi', esc(g.description || 'Belum ada deskripsi.')],
        ['Periode', link(ctx, 'cycle-detail', cycle.name, { id: cycle.id })],
        [
            'Template jabatan',
            g.templateId
                ? link(
                      ctx,
                      'template-detail',
                      data.templates.find((t) => t.id === g.templateId)?.name,
                      { id: g.templateId },
                  )
                : 'Goal pemantauan, tidak menambah skor individual.',
        ],
        ['Numerator', esc(g.numerator || '—')],
        ['Denominator', esc(g.denominator || '—')],
        ['Formula pengukuran', esc(g.formula || '—')],
        ['Target pada lembar KPI', esc(g.targetText || '—')],
    ]);
    if (tab === 'measurement')
        content = `${definition([
            [
                'Arah pengukuran',
                g.direction === 'increase' ? 'Increase KPI' : 'Decrease KPI',
            ],
            [
                'Baseline',
                g.noBaseline
                    ? 'Tanpa baseline'
                    : `${num(g.baseline)} ${moneyUnit(g.unit)}`,
            ],
            ['Target', `${num(g.target)} ${moneyUnit(g.unit)}`],
            [
                'Aktual',
                g.actual == null
                    ? 'Belum diisi'
                    : `${num(g.actual, 2)} ${moneyUnit(g.unit)}`,
            ],
            [
                'Progress',
                progress == null
                    ? 'Belum tersedia'
                    : `${num(progress, 2)}%${progress > 100 ? ' · melebihi target' : ''}`,
            ],
            ['Bobot KPI', `${num(g.weight, 4)}%`],
            [
                'Repeat Goal',
                g.repeat
                    ? 'Diulang melalui duplikasi periode'
                    : 'Tidak diulang',
            ],
        ])}${progress != null ? `<div class="gp-achievement"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>` : ''}${!locked && g.status === 'active' ? btn('update-actual', 'Perbarui aktual', { id: g.id, disabled: g.noBaseline, title: g.noBaseline ? 'Rumus tanpa baseline menunggu keputusan kebijakan.' : '' }) : ''}${note('Aktual dan progress tidak mengubah nilai penilaian 10–100. Rumus progress pada prototype ini adalah ilustrasi usulan, bukan kebijakan scoring produksi.')}`;
    if (tab === 'key-results')
        content = g.keyResults.length
            ? g.keyResults
                  .map(
                      (kr) =>
                          `<div class="gp-kr"><div><strong>${esc(kr.name)}</strong><p>${esc(kr.description || 'Hasil ukur pendukung')} · ${num(kr.baseline)} → ${num(kr.target)} ${moneyUnit(kr.unit)}</p></div></div>`,
                  )
                  .join('')
            : empty(
                  'Goal ini tidak memakai Key Results',
                  'KPI tetap dapat digunakan tanpa Key Result.',
              );
    if (tab === 'history') content = timeline(data, 'goal', g.id);
    return `${link(ctx, 'goals', '← Daftar Goals', {}, 'gp-back')}${heading(g.name || 'Draft Goal', `${g.code} · ${owner(data, g)}`, `${goalTag(g)}${btn('edit-goal', g.status === 'draft' ? 'Edit Goal' : 'Buat versi berikutnya', { id: g.id, disabled: locked })}${btn('duplicate-goal', 'Duplikasi', { id: g.id })}${btn('archive-goal', 'Arsipkan', { id: g.id, disabled: g.status === 'archived' })}${g.status === 'draft' ? btn('delete-goal', 'Hapus Draft', { id: g.id }) : ''}`)}<div class="seg w-fit">${[
        ['details', 'Detail Goal'],
        ['measurement', 'Pengukuran'],
        ['key-results', 'Key Results'],
        ['history', 'Riwayat'],
    ]
        .map(
            ([key, label]) =>
                `<button type="button" data-gp-detail-tab="${key}" class="${tab === key ? 'active' : ''}">${label}</button>`,
        )
        .join(
            '',
        )}</div>${locked ? note('Histori periode dan snapshot Final terkunci. Gunakan duplikasi untuk periode berikutnya.') : ''}<section class="card gp-detail-card">${content}</section>`;
}
export function templateList(ctx) {
    const { data, cycleId } = ctx,
        heads = [
            'Template / jabatan',
            'Unit / divisi',
            'KPI',
            'Total bobot',
            'Kesiapan',
            'Tindakan',
        ];
    return `${heading('Template KPI Jabatan', 'Satu lembar per jabatan dan unit, dengan total bobot tepat 100%.', btn('new-template', '+ Tambah template', { primary: true }))}${note(`Periode penilaian: ${monthLabel(cycleId)}. Goal Individual ditetapkan melalui template ini.`)}${table(
        ctx,
        heads,
        data.templates,
        (t) => {
            const rows = templateGoals(data, t.id, cycleId),
                weight = templateWeight(rows),
                valid = !templateErrors(data, t.id, cycleId).length;
            return tr(
                [
                    `${link(ctx, 'template-detail', t.name, { id: t.id }, 'gp-record-title')}<small>${esc(data.positions.find((p) => p.id === t.positionId)?.name)}</small>`,
                    `${esc(data.units.find((u) => u.id === t.unitId)?.name)}<small>${esc(data.divisions.find((d) => d.id === t.divisionId)?.name)}</small>`,
                    rows.length,
                    `${num(weight, 4)}%`,
                    tag(
                        valid ? 'Valid' : 'Belum lengkap',
                        valid ? 'success' : 'warning',
                    ),
                    link(ctx, 'template-detail', 'Buka template', { id: t.id }),
                ],
                heads,
            );
        },
        'templates',
        10,
    )}`;
}
export function templateDetail(ctx, id) {
    const { data, cycleId } = ctx,
        t = data.templates.find((t) => t.id === id);
    if (!t) return empty('Template tidak ditemukan');
    const cycle = data.cycles.find((c) => c.id === cycleId),
        locked = ['closed', 'archived'].includes(cycle?.status);
    const rows = locked
            ? cycle.bindings?.[id] || []
            : templateGoals(data, id, cycleId),
        total = templateWeight(rows),
        errors = locked ? [] : templateErrors(data, id, cycleId),
        heads = [
            'No.',
            'Pilar',
            'KPI',
            'Numerator',
            'Denominator',
            'Formula pengukuran',
            'Target',
            'Bobot (%)',
            'Tindakan',
        ];
    return `${link(ctx, 'templates', '← Template KPI Jabatan', {}, 'gp-back')}${heading(t.name, `${data.positions.find((p) => p.id === t.positionId)?.name} · ${data.units.find((u) => u.id === t.unitId)?.name} · ${monthLabel(cycleId)}`, `${btn('export-template', 'Ekspor KPI', { id })}${btn('template-goal', '+ Tambah KPI', { id, primary: true })}`)}<div class="gp-template-note"><strong>Total bobot ${tag(`${num(total, 4)}%`, total === 100 ? 'success' : 'warning')}</strong><span>Format indikator mengikuti lembar KPI rumah sakit.</span>${btn('publish-template', 'Publikasikan template', { id, disabled: errors.length > 0 || rows.every((g) => g.status === 'active') })}</div>${errors.length ? note(errors[0], 'warning') : ''}${table(ctx, heads, rows, (g, i) => tr([String((ctx.pages['indicator-table'] || 0) * 5 + i + 1), esc(g.pillar), `${link(ctx, 'goal-detail', g.name, { id: g.id }, 'gp-record-title')}${g.status === 'draft' ? tag('Draft', 'warning') : ''}`, esc(g.numerator || '—'), esc(g.denominator || '—'), esc(g.formula || '—'), esc(g.targetText || `${num(g.target)} ${moneyUnit(g.unit)}`), num(g.weight, 4), btn('edit-goal', 'Edit', { id: g.id, ghost: true })], heads), 'indicator-table', 5, 'gp-indicator-table')}${note('Hasil KPI = nilai 10–100 × bobot / 100. Numerator, denominator, dan formula mendokumentasikan pengukuran; tidak otomatis mengubah nilai penilai.')}`;
}
