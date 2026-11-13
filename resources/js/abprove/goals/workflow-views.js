import {
    ASSESSMENT_STATUSES,
    assessmentTotal,
    category,
    monthLabel,
} from './domain.js';
import {
    esc,
    btn,
    field,
    note,
    tag,
    empty,
    num,
    date,
    definition,
} from './markup.js';
import { heading, link, tr, table } from './views.js';

export function roleContext(role) {
    return role === 'ku'
        ? {
              role,
              unitId: 'igd',
              name: 'Kepala Unit IGD',
              scope: 'Instalasi Gawat Darurat',
          }
        : role === 'kd'
          ? {
                role,
                divisionId: 'medis',
                name: 'Kepala Divisi Pelayanan Medis',
                scope: 'Divisi Pelayanan Medis',
            }
          : { role: 'hc', name: 'Super HC', scope: 'Seluruh organisasi' };
}
export const permitted = (a, role) =>
    role.role === 'hc' ||
    (role.role === 'ku' && a.unitId === role.unitId) ||
    (role.role === 'kd' && a.divisionId === role.divisionId);
export function assessmentList(ctx) {
    const { data, role, cycleId, assessmentFilter } = ctx,
        heads = [
            'Karyawan / jabatan',
            'Unit',
            'Status',
            'Total nilai',
            'Tindakan',
        ];
    const rows = data.assessments.filter(
        (a) =>
            a.cycleId === cycleId &&
            permitted(a, role) &&
            (!assessmentFilter || a.status === assessmentFilter),
    );
    return `${heading(role.role === 'ku' ? 'Penilaian karyawan' : role.role === 'kd' ? 'Persetujuan penilaian' : 'Rekap & finalisasi', `${monthLabel(cycleId)} · ${role.scope}`)}${note('Skenario uji terpisah dari aplikasi operasional. Angka, pengajuan, dan keputusan pada layar ini hanya tersimpan di browser.')}<div class="gp-flow-strip"><span>Belum diisi / Draft</span><span>Diajukan · Kepala Unit</span><span>Disetujui · Kepala Divisi</span><span>Final · Super HC</span></div><div class="gp-filters"><select class="field" data-gp-assessment-filter aria-label="Filter status penilaian"><option value="">Semua status</option>${ASSESSMENT_STATUSES.map((s) => `<option ${assessmentFilter === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>${table(
        ctx,
        heads,
        rows,
        (a) => {
            const p = data.staff.find((p) => p.id === a.staffId);
            return tr(
                [
                    `${esc(p.name)}<small>${esc(data.positions.find((j) => j.id === p.positionId)?.name)}</small>`,
                    esc(data.units.find((u) => u.id === a.unitId)?.name),
                    tag(
                        a.status,
                        a.status === 'Final'
                            ? 'success'
                            : a.status === 'Dikembalikan'
                              ? 'warning'
                              : 'info',
                    ),
                    num(a.finalTotal ?? assessmentTotal(a), 2),
                    link(
                        ctx,
                        'assessment',
                        role.role === 'ku' ? 'Buka nilai' : 'Tinjau',
                        { id: a.id },
                    ),
                ],
                heads,
            );
        },
        'assessments',
        10,
    )}`;
}
export function assessmentView(ctx, id) {
    const { data, role } = ctx,
        a = data.assessments.find((a) => a.id === id);
    if (!a || !permitted(a, role))
        return `${heading('Akses tidak tersedia', 'Penilaian ini tidak berada dalam cakupan role Anda.')}${link(ctx, 'assessments', 'Kembali ke daftar')}`;
    const p = data.staff.find((p) => p.id === a.staffId),
        editable =
            role.role === 'ku' &&
            ['Belum diisi', 'Draft', 'Dikembalikan'].includes(a.status),
        scores =
            ctx.assessmentWorking?.id === id
                ? ctx.assessmentWorking.scores
                : a.scores;
    const total = assessmentTotal({ ...a, scores }),
        cycle = data.cycles.find((c) => c.id === a.cycleId),
        heads = ['No.', 'Pilar / KPI', 'Target', 'Bobot', 'Nilai', 'Hasil'];
    const actions = editable
        ? `${btn('assessment-draft', 'Simpan Draft', { id })}${btn('assessment-submit', 'Ajukan penilaian', { id, primary: true })}`
        : role.role === 'ku' && a.status === 'Diajukan'
          ? btn('assessment-withdraw', 'Tarik pengajuan', { id })
          : role.role === 'kd' && a.status === 'Diajukan'
            ? `${btn('assessment-return', 'Kembalikan', { id })}${btn('assessment-approve', 'Setujui', { id, primary: true })}`
            : role.role === 'hc' && a.status === 'Disetujui'
              ? `${btn('assessment-return', 'Kembalikan', { id })}${btn('assessment-finalize', 'Finalkan penilaian', { id, primary: true })}`
              : '';
    return `${link(ctx, 'assessments', '← Daftar penilaian', {}, 'gp-back')}${heading(p.name, `${p.nip} · ${data.units.find((u) => u.id === p.unitId)?.name} · ${monthLabel(a.cycleId)}`, tag(a.status, a.status === 'Final' ? 'success' : a.status === 'Dikembalikan' ? 'warning' : 'info'))}${a.status === 'Final' ? note('Hasil Final terkunci. Definisi KPI, bobot, kategori, dan nilai pada snapshot ini hanya dapat dibaca.', 'success') : role.role !== 'ku' ? note('Angka penilaian diisi Kepala Unit. Review dan keputusan tidak mengubah angka.') : ''}${a.status === 'Dikembalikan' ? note(a.history.find((h) => h.to === 'Dikembalikan')?.reason || 'Periksa catatan pengembalian.', 'warning') : ''}<div class="seg w-fit"><button type="button" data-gp-assessment-tab="scores" class="${ctx.assessmentTab !== 'history' ? 'active' : ''}">Lembar KPI</button><button type="button" data-gp-assessment-tab="history" class="${ctx.assessmentTab === 'history' ? 'active' : ''}">Jejak keputusan</button></div>${ctx.assessmentTab === 'history' ? `<section class="card gp-detail-card">${a.history.length ? `<ol class="gp-timeline">${a.history.map((h) => `<li><strong>${esc(h.to)}</strong><p>${esc({ ku: 'Kepala Unit', kd: 'Kepala Divisi', hc: 'Super HC' }[h.role])}${h.reason ? ` · ${esc(h.reason)}` : ''}</p><small>${esc(date(h.at))} WIB</small></li>`).join('')}</ol>` : empty('Belum ada pengajuan atau keputusan', 'Jejak akan tercatat setelah nilai disimpan atau diajukan.')}</section>` : `<form id="gp-assessment-form" novalidate>${table(ctx, heads, a.snapshot, (g, i) => tr([String((ctx.pages['assessment-kpis'] || 0) * 5 + i + 1), `<strong>${esc(g.name)}</strong><small>${esc(g.pillar)}</small>`, esc(g.targetText || g.target), `${num(g.weight, 4)}%`, editable ? `<label class="sr-only" for="score-${esc(g.id)}">Nilai ${esc(g.name)}</label><input class="field gp-score" id="score-${esc(g.id)}" type="number" min="10" max="100" step="1" name="score-${esc(g.id)}" data-gp-score="${esc(g.id)}" value="${esc(scores[g.id] ?? '')}" inputmode="numeric"><small class="gp-field-error" data-gp-score-error="${esc(g.id)}" hidden></small>` : num(scores[g.id], 0), `<span data-gp-contribution="${esc(g.id)}">${scores[g.id] !== '' && scores[g.id] != null ? num((+scores[g.id] * +g.weight) / 100, 2) : '—'}</span>`], heads), 'assessment-kpis', 5, 'gp-score-table')}<div class="gp-assessment-total"><span>Total nilai berbobot</span><strong data-gp-total>${num(a.finalTotal ?? total, 2)}</strong><span data-gp-category>${a.finalCategory || (total == null ? 'Belum lengkap' : category(total, cycle.categories))}</span></div><div class="card gp-form-card gp-form-grid">${field('positive', 'Temuan positif', ctx.assessmentWorking?.positive ?? a.positive, { textarea: true, attributes: { readonly: !editable } })}${field('negative', 'Temuan negatif', ctx.assessmentWorking?.negative ?? a.negative, { textarea: true, attributes: { readonly: !editable } })}</div><p class="gp-field-error" data-gp-assessment-error hidden></p>${note('Nilai wajib bilangan bulat 10–100. Total = jumlah (nilai × bobot / 100). Temuan tidak menambah atau mengurangi hasil.')}</form>`}<div class="gp-form-footer"><span>${editable ? 'Isi seluruh KPI sebelum mengajukan.' : 'Keputusan mengikuti role dan status penilaian.'}</span><div>${actions}</div></div>`;
}
