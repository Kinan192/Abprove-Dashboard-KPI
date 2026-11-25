import {
    $,
    $$,
    node,
    text,
    clone,
    optionList,
    number,
    status,
    labelCycle,
    dateTime,
    empty,
} from './flow-dom';
import { open, close, confirm, toast } from './ui';
import { paginate, reveal } from './pagination';
import { calculate } from '../kpi-workspace/model.js';
import {
    totalValues,
    categorize,
    previousMonth,
    itemSignature,
} from './flow-store';
import '../../css/assessment-history.css';

/** History event labels; codes come from assessment_events.action. */
const HISTORY_ACTIONS = {
    submitted: 'Mengajukan penilaian',
    head_finalized: 'Menetapkan nilai Kepala Unit (Final)',
    resubmitted: 'Mengajukan ulang setelah perbaikan',
    withdrawn: 'Membatalkan pengajuan',
    adjusted: 'Mengoreksi nilai sebelum Final',
    returned: 'Mengembalikan untuk perbaikan',
    approved: 'Menetapkan Final',
    auto_finalized: 'Difinalkan otomatis saat periode ditutup',
};
const HISTORY_STATUS = {
    submitted: 'Diajukan',
    returned: 'Dikembalikan',
    final: 'Final',
};
/** Actions whose item rows are the complete sheet, not only changed rows. */
const FULL_SHEET = ['submitted', 'head_finalized', 'withdrawn'];
/** Stored scores keep 6 decimals; smaller differences are rounding, not changes. */
const differs = (a, b) =>
    a == null || b == null ? a !== b : Math.abs(+a - +b) > 0.000001;
/** Request rows for every KPI of a sheet: formula inputs or manual scores. */
const scorePayload = (items, a) =>
    items.map((item, i) => ({
        source_kpi_item_id: +item.id,
        ...(item.config?.method === 'formula'
            ? { inputs: a.inputs?.[i] || {} }
            : { score: +a.values[i] }),
    }));
/**
 * Parses a division head score: blank keeps the unit head's proposal; formula KPI 0–100 with at most 2 decimals,
 * manual KPI an integer 10–100 like the unit head's scale.
 */
const parseReview = (raw, formula) => {
    const value = String(raw ?? '').trim().replace(',', '.');
    if (value === '') return { value: null };
    const valid = formula
        ? /^\d{1,3}(\.\d{1,2})?$/.test(value) && +value <= 100
        : /^\d{1,3}$/.test(value) && +value >= 10 && +value <= 100;
    return valid
        ? { value: +value }
        : { error: formula ? 'Nilai KD 0–100, maksimal 2 desimal.' : 'Nilai KD bilangan bulat 10–100.' };
};
/** Whether any KD score draft differs from the saved reviewed scores. */
const draftChanged = (w) =>
    w.draft.some((raw, i) => {
        const value = raw.trim().replace(',', '.');
        return value === ''
            ? w.saved[i] != null
            : w.saved[i] == null || !Number.isFinite(+value) || differs(+value, w.saved[i]);
    });
export function initFlowAssessments(c, s, link) {
    let selected,
        working,
        dirty = false,
        reviewed,
        // Division head working copy of the reviewed submission: unit head proposals, saved and drafted KD
        // scores and per-KPI notes.
        reviewWorking = null,
        // Decision mode of the open review ('approve' | 'correct' | 'return') and the return scope.
        reviewMode = 'approve',
        returnScope = 'items',
        reviewSequence = 0,
        peopleTab = 'all',
        statusTab =
            $('[data-flow-status-select]')?.value ||
            $('[data-flow-status][aria-selected="true"]')?.dataset.flowStatus ||
            'all';
    const requestedStatus = new URLSearchParams(location.search).get('status');
    if (
        ['all', 'Belum', 'Diajukan', 'Dikembalikan', 'Final', 'Tidak dinilai'].includes(
            requestedStatus,
        )
    ) {
        statusTab = requestedStatus;
        if ($('[data-flow-status-select]'))
            $('[data-flow-status-select]').value = requestedStatus;
        $$('[data-flow-status]').forEach((b) =>
            b.setAttribute(
                'aria-selected',
                String(b.dataset.flowStatus === statusTab),
            ),
        );
    }
    const selections = new Set(),
        kind = c.page === 'nilai-kepala' ? 'unit_head' : 'member',
        initials = (name) =>
            name
                .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
                .split(/[ ,]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((x) => x[0])
                .join('');
    const editable = (p) =>
        p &&
        ['Belum', 'Dikembalikan'].includes(s.assessment(p.id).status) &&
        !s.canWrite(
            p.type,
            p.unitId,
            s.assessment(p.id).status === 'Dikembalikan' ? 'resubmit' : null,
        ) &&
        s.unit(p.unitId)?.active &&
        s.division(p.divisionId)?.active;
    function updateUnitFilter() {
        const division = $('[data-filter="division"]');
        const unit = $('[data-filter="unit"]');
        if (c.role !== 'hc' || !division || !unit) return;
        const units = s
            .scopedUnits()
            .filter(
                (row) => !division.value || row.divisionId === division.value,
            );
        optionList(unit, units, 'Semua unit');
    }
    function filtered(key = s.cycleKey, finalOnly = false) {
        let rows = s.people('all', key),
            values = Object.fromEntries(
                $$('[data-filter]').map((e) => [e.dataset.filter, e.value]),
            );
        if (c.role === 'ku') rows = rows.filter((p) => p.type === 'member');
        return rows.filter(
            (p) =>
                (!values.division || p.divisionId === values.division) &&
                (!values.unit || p.unitId === values.unit) &&
                (!values.type || p.type === values.type) &&
                (!values.search ||
                    `${p.name} ${p.nip}`
                        .toLowerCase()
                        .includes(values.search.toLowerCase())) &&
                (!values.template ||
                    s.template(p, key)?.id === values.template) &&
                (finalOnly
                    ? s.assessment(p.id, key).status === 'Final'
                    : statusTab === 'all' ||
                      s.assessment(p.id, key).status === statusTab),
        );
    }
    /**
     * `review` renders a submission for the division head: the unit head's proposal and measurements stay
     * read-only, every KPI gets a "Nilai KD" field for a reviewed score and a note field.
     */
    function renderScore(root, p, a, readOnly = false, key = s.cycleKey, review = false) {
        root.replaceChildren();
        const k = a.snapshot || s.template(p, key);
        if (!k) {
            empty(
                root,
                'KPI untuk area dan bulan ini belum disusun. Hubungi Super HC untuk menetapkan KPI Unit atau KPI Divisi.',
            );
            return null;
        }
        const sheet = clone('flow-score-sheet', root);
        const locked = readOnly;
        const instructions = $('[data-score-instructions]', sheet);
        instructions.hidden = locked && !review;
        // A return with KPI notes reopens only those KPIs for the unit head; the others stay locked.
        const reopened =
            !locked && !review && a.status === 'Dikembalikan' && a.itemNotes
                ? Object.keys(a.itemNotes)
                : [];
        if (reopened.length)
            instructions.textContent = `Perbaiki ${reopened.length} KPI yang diberi catatan Kepala Divisi, lalu ajukan ulang. KPI lain terkunci.`;
        const concise = c.role === 'ku' && c.page === 'nilai';
        sheet.dataset.person = p.id;
        text(sheet, '[data-initials]', initials(p.name));
        text(
            sheet,
            '[data-kind]',
            p.type === 'member'
                ? 'Staf · dinilai Kepala Unit'
                : 'Kepala Unit · dinilai Kepala Divisi',
        );
        text(
            sheet,
            '[data-template-meta]',
            `${k.name} · versi ${k.version} · ${labelCycle(key)}`,
        );
        text(sheet, '[data-name]', p.name);
        text(
            sheet,
            '[data-person-meta]',
            concise
                ? `NIP ${p.nip} · ${labelCycle(key)}`
                : `${p.job} · NIP ${p.nip} · ${p.unitName} · ${p.divisionName}`,
        );
        status($('[data-status]', sheet), a.status);
        const reason = $('[data-return-reason]', sheet);
        reason.hidden = !a.reason;
        reason.textContent = `Catatan Kepala Divisi: ${a.reason || ''}`;
        const lock = $('[data-lock-reason]', sheet);
        // In the division head's review dialog the decision state is explained above the sheet instead.
        lock.hidden = !locked || (c.role === 'kd' && root.matches('[data-review-mount]'));
        lock.textContent =
            a.status === 'Final'
                ? 'Final. Nilai, bobot dan kategori tersimpan pada snapshot dan hanya dapat dibaca.'
                : a.status === 'Diajukan'
                  ? 'Pengajuan sedang menunggu Kepala Divisi. Angka terkunci.'
                  : s.canWrite(
                        p.type,
                        p.unitId,
                        a.status === 'Dikembalikan' ? 'resubmit' : null,
                    ) || 'Lembar hanya dapat dibaca.';
        const compare =
            readOnly && c.role === 'kd' && root.matches('[data-review-mount]');
        const previousKey = previousMonth(key),
            previousPerson = s.person(p.id, previousKey),
            candidate = previousPerson
                ? s.assessment(p.id, previousMonth(key))
                : null,
            previous = candidate?.status === 'Final' ? candidate : null;
        const previousHeader = $('[data-previous-column]', sheet);
        previousHeader.hidden = !compare;
        previousHeader.textContent = `Nilai ${labelCycle(previousKey)}`;
        sheet
            .querySelector('table')
            .classList.toggle('score-review-comparison', compare);
        let comparable = 0;
        k.items.forEach((item, i) => {
            const row = clone('flow-score-item', $('[data-score-rows]', sheet));
            row.dataset.index = i;
            text(row, '[data-score-number]', i + 1);
            text(row, '[data-kpi-name]', item.name);
            text(
                row,
                '[data-kpi-meta]',
                `${item.pillar} · target ${item.target}`,
            );
            text(row, '[data-weight]', `${item.weight}%`);
            const input = $('[data-score]', row),
                cell = input.closest('td'),
                proposal = a.proposals?.[i] ?? a.values[i];
            const held = reopened.length > 0 && !reopened.includes(String(item.id));
            if (held) row.dataset.held = '';
            $('[data-item-held]', row).hidden = !held;
            input.dataset.score = i;
            input.value = a.values[i] ?? '';
            input.disabled = locked || held;
            input.closest('label').hidden = locked;
            text(row, '[data-score-label]', `Nilai ${item.name}`);
            const output = $('[data-read-score]', row);
            output.hidden = !locked;
            output.textContent = review ? `Usulan KU: ${proposal ?? '-'}` : (a.values[i] ?? '-');
            if (item.config?.method === 'formula') {
                cell.replaceChildren();
                a.inputs ||= {};
                a.inputs[i] ||= {};
                for (const variable of item.config.variables) {
                    const label = node('label', null, 'block mb-2 text-xs');
                    label.append(node('span', variable.label));
                    const field = node('input', null, 'field');
                    field.type = 'number';
                    field.step = 'any';
                    field.dataset.measurement = i;
                    field.dataset.variable = variable.key;
                    field.setAttribute('aria-label', `${item.name}: ${variable.label}`);
                    field.readOnly = locked || held || variable.source === 'fixed';
                    if (variable.source === 'fixed') a.inputs[i][`variable_${variable.key}`] = variable.value;
                    field.value = a.inputs[i][`variable_${variable.key}`] ?? '';
                    label.append(field);
                    cell.append(label);
                }
                // Input guidance belongs to editable sheets; read-only sheets report the unit head's stored result.
                let message;
                if (locked)
                    message =
                        proposal == null || proposal === ''
                            ? 'Belum ada nilai.'
                            : `${review ? 'Usulan KU (otomatis)' : 'Nilai otomatis'}: ${number(proposal)}`;
                else {
                    const result = calculate(item.config, a.inputs[i]);
                    a.values[i] = result.score;
                    message =
                        result.message ||
                        `Nilai otomatis: ${number(a.values[i])}`;
                }
                const summary = node('p', message, 'text-xs text-muted');
                summary.dataset.measurementResult = i;
                cell.append(summary);
            }
            if (review) {
                const label = node('label', null, 'assessment-review-field'),
                    field = node('input', null, 'score-input num');
                field.type = 'text';
                field.inputMode = 'decimal';
                field.autocomplete = 'off';
                field.maxLength = 6;
                field.placeholder = 'Sesuai usulan';
                field.dataset.reviewScore = i;
                field.value = a.draft[i];
                field.setAttribute('aria-label', `Nilai KD untuk ${item.name}`);
                label.append(node('span', 'Nilai KD', 'assessment-review-label'), field);
                cell.append(label);
            }
            // Reviewed score beside the proposal; filled by updateTotal.
            const mark = node('span', null, 'assessment-score-change');
            mark.dataset.reviewMark = i;
            mark.hidden = true;
            cell.append(mark);
            const note = a.itemNotes?.[item.id];
            const noteView = $('[data-item-note]', row);
            noteView.hidden = !note;
            noteView.textContent = note ? `Catatan Kepala Divisi: ${note}` : '';
            const noteWrap = $('[data-item-note-wrap]', row);
            noteWrap.hidden = !review;
            if (review) {
                const field = $('[data-item-note-input]', noteWrap),
                    flag = $('[data-item-flag]', noteWrap);
                field.dataset.itemNoteInput = item.id;
                field.value = a.reviewNotes?.[item.id] || '';
                field.setAttribute('aria-label', `Catatan untuk KPI ${item.name}`);
                flag.dataset.itemFlag = item.id;
                flag.checked = !!a.flags?.has(String(item.id));
                flag.setAttribute('aria-label', `KPI ${item.name} perlu diperbaiki`);
            }
            const definition = (r) =>
                JSON.stringify([
                    r.pillar,
                    r.name,
                    r.numerator || '',
                    r.denominator || '',
                    r.formula || '',
                    r.target,
                    +r.weight,
                ]);
            const previousItems = previous?.snapshot?.items || [];
            const matches = previousItems
                .map((x, index) =>
                    definition(x) === definition(item) ? index : -1,
                )
                .filter((index) => index >= 0);
            const sameId = matches.find(
                (index) => previousItems[index].id === item.id,
            );
            const match = sameId ?? (matches.length === 1 ? matches[0] : -1);
            $('[data-previous-cell]', row).hidden = !compare;
            if (compare) {
                const value = match >= 0 ? previous.values[match] : null;
                text(row, '[data-previous]', value ?? '-');
                const delta = $('[data-previous-delta]', row);
                if (value != null) {
                    comparable++;
                    const diff =
                        a.values[i] == null ? null : +a.values[i] - +value;
                    delta.textContent =
                        diff == null
                            ? 'Belum ada nilai bulan ini'
                            : diff > 0
                              ? `Naik ${diff}`
                              : diff < 0
                                ? `Turun ${Math.abs(diff)}`
                                : 'Tetap';
                    delta.classList.add(
                        diff > 0
                            ? 'text-success'
                            : diff < 0
                              ? 'text-warning'
                              : 'text-muted',
                    );
                } else
                    delta.textContent = previous
                        ? 'Indikator tidak sebanding'
                        : 'Belum ada nilai Final';
            }
        });
        const comparison = $('[data-previous-summary]', sheet);
        const currentTotal = totalValues(a.values, k.items);
        comparison.hidden = !compare;
        comparison.textContent = !previous
            ? `Belum ada penilaian Final pada ${labelCycle(previousKey)}.`
            : comparable === k.items.length &&
                previous.snapshot.items.length === k.items.length
              ? `Total ${labelCycle(previousKey)}: ${number(s.total(p.id, previousKey))}. ${currentTotal == null ? 'Nilai bulan ini belum lengkap.' : `Perubahan total: ${number(currentTotal - s.total(p.id, previousKey))}.`}`
              : 'Definisi KPI berubah. Perbandingan hanya ditampilkan untuk indikator dengan definisi, target dan bobot yang sama; total tidak dibandingkan.';
        $$('[data-finding]', sheet).forEach((e) => {
            const key = e.dataset.finding;
            e.value = a[key] || '';
            e.hidden = readOnly;
            const output = $(`[data-read-finding="${key}"]`, sheet);
            output.hidden = !readOnly;
            output.textContent = a[key] || 'Tidak ada';
        });
        updateTotal(sheet, k, a, key);
        paginate(
            $('[data-score-rows]', sheet),
            root.matches('[data-review-mount]')
                ? 'review-score'
                : 'editor-score',
            { token: p.id + key, kind: 'score' },
        );
        return sheet;
    }
    function updateTotal(root, k, a, key = s.cycleKey) {
        if (!root) return;
        k.items.forEach((r, i) => {
            const row = $(`[data-index="${i}"]`, root);
            const value = a.values[i],
                valid = r.config?.method === 'formula'
                    ? value !== '' && value != null && Number.isFinite(+value) && +value >= 0 && +value <= 100
                    : /^\d+$/.test(String(value)) && +value >= 10 && +value <= 100;
            const input = $('[data-score]', row);
            input?.setAttribute(
                'aria-invalid',
                String(value !== '' && value != null && !valid),
            );
            text(
                row,
                '[data-result]',
                valid ? number((+value * r.weight) / 100) : '-',
            );
            const mark = $(`[data-review-mark="${i}"]`, row);
            if (mark) {
                const reviewed = a.reviewed?.[i],
                    proposal = a.proposals?.[i],
                    shown = reviewed != null && (a.revising || differs(reviewed, proposal));
                mark.hidden = !shown;
                mark.textContent = !shown
                    ? ''
                    : a.revising
                      ? `Nilai KD sebelumnya: ${number(reviewed)}`
                      : `Nilai KD ${number(reviewed)} · usulan KU ${number(proposal)}`;
                row.classList.toggle('assessment-row-adjusted', shown && !a.revising);
            }
        });
        const total = totalValues(a.values, k.items),
            category =
                a.status === 'Final' && a.category
                    ? a.category
                    : categorize(
                          total,
                          s.data.cycles.find((x) => x.id === key)
                              ?.categories || { sb: 90, b: 80, c: 70 },
                      );
        text(root, '[data-total]', number(total));
        text(root, '[data-category]', category.label);
        $('[data-category]', root).dataset.category = category.key;
        text(
            root,
            '[data-score-weight]',
            k.items.reduce((n, r) => n + r.weight, 0),
        );
        text(
            root,
            '[data-filled]',
            `${k.items.filter((_, i) => a.values[i] != null && a.values[i] !== '').length}/${k.items.length}`,
        );
    }
    function editor() {
        if (!$('[data-flow-editor]')) return;
        const priority = { Dikembalikan: 0, Diajukan: 1, Belum: 2, Final: 3 };
        const rows = s
                .people(kind)
                .sort((a, b) =>
                    c.role === 'ku'
                        ? priority[s.assessment(a.id).status] -
                              priority[s.assessment(b.id).status] ||
                          a.name.localeCompare(b.name, 'id')
                        : 0,
                ),
            q = $('[data-person-search]')?.value.toLowerCase() || '';
        if (!rows.some((p) => p.id === selected))
            selected =
                rows.find(
                    (p) =>
                        p.id ===
                        new URLSearchParams(location.search).get('person'),
                )?.id || rows[0]?.id;
        const rail = $('[data-people-rail]');
        rail.replaceChildren();
        for (const p of rows.filter(
            (p) =>
                `${p.name} ${p.nip}`.toLowerCase().includes(q) &&
                (peopleTab === 'all' || editable(p)),
        )) {
            const button = clone('flow-person-button', rail);
            button.dataset.personPick = p.id;
            button.classList.toggle('selected', p.id === selected);
            if (p.id === selected) button.setAttribute('aria-current', 'true');
            text(button, '[data-name]', p.name);
            text(button, '[data-initials]', initials(p.name));
            status($('[data-status]', button), s.assessment(p.id).status);
        }
        if (!rail.childElementCount)
            empty(rail, 'Tidak ada orang sesuai pencarian.');
        paginate(rail, 'people', { token: q + peopleTab, kind: 'rail' });
        const mobile = $('[data-mobile-person]');
        optionList(
            mobile,
            rows.map((p) => ({
                id: p.id,
                name: p.name + ' - ' + s.assessment(p.id).status,
            })),
            'Pilih orang',
        );
        if (mobile) mobile.value = selected || '';
        const mount = $('[data-score-mount]'),
            p = s.person(selected);
        if (!p) {
            mount.replaceChildren();
            empty(
                mount,
                'Belum ada staf/Kepala Unit dalam tanggung jawab Anda. Hubungi Super HC untuk menyiapkan akun dan penempatan.',
            );
            $('[data-score-actions]').hidden = true;
            return;
        }
        if (!working || working.personId !== selected) {
            working = {
                ...structuredClone(s.assessment(selected)),
                personId: selected,
            };
            // A returned sheet is revised from the unit head's own proposal; earlier KD scores show beside it.
            if (editable(p) && working.proposals) {
                working.values = [...working.proposals];
                working.revising = true;
            }
        }
        const sheet = renderScore(mount, p, working, !editable(p));
        // Unit heads read the full history of the current submission, including earlier returns and corrections.
        const historyTab = sheet && $('[data-history-tab]', sheet);
        if (historyTab && s.assessment(p.id).id) {
            historyTab.hidden = false;
            $('[data-review-decision-state]', sheet).hidden = true;
            historyTab.addEventListener(
                'toggle',
                () =>
                    historyTab.open &&
                    timeline(
                        $('[data-review-history]', sheet),
                        s.assessment(p.id),
                        p,
                        s.cycleKey,
                    ),
                { once: true },
            );
        }
        const actions = $('[data-score-actions]');
        actions.hidden = !sheet;
        const hasKpi = !!s.template(p);
        $('[data-flow-action="send-assessment"]').hidden =
            !editable(p) || !hasKpi;
        $('[data-flow-action="copy-previous"]').hidden =
            !editable(p) || !hasKpi;
        $('[data-flow-action="cancel-submission"]').hidden =
            c.role !== 'ku' ||
            s.assessment(p.id).status !== 'Diajukan' ||
            !!s.canWrite();
        text(
            document,
            '[data-unsent-state]',
            editable(p)
                ? dirty
                    ? 'Ada perubahan belum dikirim'
                    : 'Isi lengkap, lalu kirim'
                : 'Hanya baca',
        );
    }
    function list() {
        const body = $('[data-assessment-body]');
        if (!body) return;
        body.replaceChildren();
        const rows = filtered();
        const order = $('[data-score-order]')?.value;
        if (order === 'asc' || order === 'desc')
            rows.sort((a, b) => {
                const x = s.total(a.id),
                    y = s.total(b.id);
                if (x == null || y == null)
                    return x == null && y == null
                        ? a.name.localeCompare(b.name, 'id')
                        : x == null
                          ? 1
                          : -1;
                return (
                    (order === 'asc' ? x - y : y - x) ||
                    a.name.localeCompare(b.name, 'id')
                );
            });
        const validSelection = rows
            .filter(
                (p) =>
                    p.type === 'member' &&
                    s.assessment(p.id).status === 'Diajukan',
            )
            .map((p) => p.id);
        for (const id of selections)
            if (!validSelection.includes(id)) selections.delete(id);
        for (const p of rows) {
            const a = s.assessment(p.id),
                tr = node('tr');
            tr.dataset.assessmentPerson = p.id;
            if (c.role === 'kd') {
                const td = node('td'),
                    check = node('input');
                check.type = 'checkbox';
                check.dataset.pickAssessment = p.id;
                check.disabled = p.type !== 'member' || a.status !== 'Diajukan';
                check.checked = selections.has(p.id);
                check.setAttribute('aria-label', `Pilih pengajuan ${p.name}`);
                td.append(check);
                tr.append(td);
            }
            const name = node('td');
            name.append(
                node('strong', p.name, 'block font-semibold'),
                node(
                    'span',
                    `${p.type === 'member' ? 'Staf' : 'Kepala Unit'} · NIP ${p.nip}`,
                    'block mt-1 text-xs text-muted',
                ),
            );
            const identity = node('div', null, 'reference-person'),
                copy = node('div');
            copy.append(...name.childNodes);
            identity.append(node('span', initials(p.name), 'avatar'), copy);
            name.append(identity);
            const area = node('td');
            area.append(
                node('span', p.unitName, 'block'),
                node('span', p.divisionName, 'block mt-1 text-xs text-muted'),
            );
            const st = node('td'),
                badge = node('span', null, 'status');
            status(badge, a.status);
            st.append(badge);
            const cat = s.category(p.id);
            const ctd = node('td', cat.label, 'category text-xs');
            ctd.dataset.category = cat.key;
            const actions = node('td', null, 'numeric');
            if (
                c.role === 'ku' &&
                ['Belum', 'Dikembalikan'].includes(a.status)
            ) {
                const linkEl = node(
                    'a',
                    a.status === 'Belum' ? 'Isi nilai' : 'Perbaiki',
                    'link',
                );
                linkEl.href = link('nilai', { person: p.id });
                actions.append(linkEl);
            } else {
                const button = node('button', 'Tinjau', 'link');
                button.type = 'button';
                button.dataset.reviewPerson = p.id;
                actions.append(button);
            }
            tr.append(
                name,
                area,
                st,
                node('td', number(s.total(p.id)), 'numeric font-semibold'),
                ctd,
                actions,
            );
            body.append(tr);
        }
        if (!rows.length) {
            const tr = node('tr'),
                td = node('td', 'Tidak ada penilaian sesuai filter.', 'empty');
            td.colSpan = 7;
            tr.append(td);
            body.append(tr);
        }
        text(
            document,
            '[data-list-count]',
            `${rows.length} data sesuai filter · ${labelCycle(s.cycleKey)}`,
        );
        text(document, '[data-selected-count]', selections.size);
        const token =
            statusTab +
            (order || '') +
            JSON.stringify($$('[data-filter]').map((e) => e.value));
        paginate(body, 'assessments', {
            token,
            size: 10,
        });
        updateSelectAll();
        $$('[data-tab-count]').forEach(
            (e) =>
                (e.textContent = s
                    .people()
                    .filter(
                        (p) =>
                            e.dataset.tabCount === 'all' ||
                            s.assessment(p.id).status === e.dataset.tabCount,
                    ).length),
        );
    }
    /**
     * Why the division head cannot decide on this person-month, or '' when the review is open for decisions.
     * Shown in the dialog so unavailable actions are explained instead of hidden.
     */
    function reviewBlock(p, a, key) {
        if (p.type !== 'member')
            return 'Nilai Kepala Unit ditetapkan langsung oleh Kepala Divisi, tanpa persetujuan.';
        if (a.status === 'Final') return 'Sudah Final. Nilai terkunci dan hanya dapat dibaca.';
        if (a.status === 'Dikembalikan')
            return 'Sudah dikembalikan. Menunggu Kepala Unit memperbaiki dan mengajukan ulang.';
        if (a.status !== 'Diajukan') return 'Belum ada pengajuan dari Kepala Unit.';
        if (!a.snapshot) return 'Lembar pengajuan belum termuat. Muat ulang halaman.';
        if (key !== s.cycleKey)
            return `Pengajuan periode ${labelCycle(key)}. Buka periode tersebut untuk memutuskan.`;
        const closed = s.canWrite('member', p.unitId);
        if (!closed) return '';
        const x = s.cycle();
        return `${closed}${x?.status === 'open' && x.approval ? ` Batas persetujuan ${dateTime(x.approval)} WIB.` : ''} Nilai KD, pengembalian dan Final tidak tersedia.`;
    }
    /**
     * Opens one person-month. Months outside the page window are loaded first; earlier months are
     * reached only through Final results, so their Final rows are enough. `keep` carries unsent
     * per-KPI notes across a saved KD score.
     */
    async function review(id, key = s.cycleKey, keep = null) {
        const sequence = ++reviewSequence;
        try {
            await s.ensureMonths([key], { finalOnly: key !== s.cycleKey });
        } catch (error) {
            return toast(error.message, true);
        }
        // The previous month only feeds the comparison column; the review opens without it.
        if (c.role === 'kd')
            await s
                .ensureMonths([previousMonth(key)], { finalOnly: true })
                .catch(() => {});
        if (sequence !== reviewSequence) return;
        const p = s.person(id, key);
        if (!p)
            return toast(
                'Orang ini tidak ada dalam tanggung jawab Anda pada periode tersebut.',
                true,
            );
        reviewed = id;
        const assessment = s.assessment(id, key),
            block = c.role === 'kd' ? reviewBlock(p, assessment, key) : null,
            allowed = block === '';
        reviewWorking = null;
        if (allowed) {
            const saved = assessment.snapshot.items.map(
                (_, i) => assessment.reviewed?.[i] ?? null,
            );
            reviewWorking = {
                ...structuredClone(assessment),
                personId: id,
                proposals: [...(assessment.proposals || assessment.values)],
                saved,
                reviewed: [...saved],
                draft: saved.map((v) => (v == null ? '' : String(v))),
                reviewNotes: keep?.notes || {},
                flags: new Set(
                    Object.entries(keep?.notes || {})
                        .filter(([, note]) => note.trim())
                        .map(([id]) => String(id)),
                ),
            };
        }
        // Opens on "Koreksi nilai" when KD scores were saved before, else on "Setujui".
        reviewMode = reviewWorking?.saved.some((v) => v != null)
            ? 'correct'
            : 'approve';
        returnScope = 'items';
        const sheet = renderScore(
            $('[data-review-mount]'),
            p,
            reviewWorking || assessment,
            true,
            key,
            allowed,
        );
        text(
            document,
            '[data-review-period]',
            `${labelCycle(key)} · ${p.type === 'member' ? 'Penilaian Staf' : 'Penilaian Kepala Unit'}`,
        );
        const hist = $('[data-review-mount] [data-review-history]');
        if (hist) {
            const tab = $('[data-review-mount] [data-history-tab]');
            tab.hidden = false;
            tab.open = true;
            text(
                sheet,
                '[data-review-decision-state]',
                assessment.status === 'Diajukan'
                    ? 'Menunggu keputusan Kepala Divisi. Pengajuan sudah diterima.'
                    : assessment.status === 'Final'
                      ? 'Penilaian sudah ditetapkan Final.'
                      : assessment.status === 'Dikembalikan'
                        ? 'Pengajuan dikembalikan untuk diperbaiki.'
                        : 'Belum ada pengajuan aktif. Riwayat pengajuan yang dibatalkan tetap ditampilkan.',
            );
            timeline(hist, assessment, p, key);
        }
        const blocked = $('[data-review-blocked]');
        if (blocked) {
            blocked.hidden = !block;
            text(blocked, '[data-review-blocked-text]', block || '');
            const other = $('[data-review-open-cycle]', blocked);
            other.hidden =
                !block ||
                key === s.cycleKey ||
                p.type !== 'member' ||
                assessment.status !== 'Diajukan';
            if (!other.hidden) {
                other.href = link('persetujuan', { cycle: key, person: id, status: 'Diajukan' });
                other.textContent = `Buka ${labelCycle(key)}`;
            }
        }
        const reasonWrap = $('[data-review-reason-wrap]');
        if (reasonWrap) {
            reasonWrap.hidden = !allowed;
            $('[data-review-reason]', reasonWrap).value = '';
        }
        for (const action of ['return', 'final', 'save-review']) {
            const b = $(`[data-flow-action="${action}"]`);
            if (!b) continue;
            b.hidden = false;
            b.disabled = !allowed;
            b.title = block || '';
        }
        const modes = $('[data-review-modes]');
        if (modes) modes.hidden = !allowed;
        if (allowed) applyReviewMode();
        open('review-dialog');
    }
    /**
     * Division head decision modes of the open review: "Setujui" (read-only, Final), "Koreksi nilai" (Nilai KD
     * fields, save or Final with them) and "Kembalikan" (flag KPIs with a required note, or return the whole
     * sheet with a required reason). Field visibility follows data attributes on the dialog (CSS).
     */
    const MODE_HELP = {
        approve: 'Tetapkan Final dengan nilai usulan Kepala Unit. Lembar hanya dibaca.',
        correct: 'Isi Nilai KD pada KPI yang Anda koreksi; kosongkan untuk memakai usulan Kepala Unit. Usulan tetap tercatat di riwayat.',
        items: 'Centang KPI yang perlu diperbaiki dan tulis catatannya. Kepala Unit hanya dapat mengubah KPI yang dicentang.',
        all: 'Seluruh lembar dibuka kembali untuk Kepala Unit. Tulis alasan pengembalian.',
    };
    function applyReviewMode() {
        const dialog = $('#review-dialog');
        if (!dialog || c.role !== 'kd') return;
        dialog.dataset.reviewMode = reviewMode;
        dialog.dataset.reviewScope = returnScope;
        for (const b of $$('[data-review-mode]', dialog))
            b.classList.toggle('active', b.dataset.reviewMode === reviewMode);
        for (const b of $$('[data-review-scope]', dialog))
            b.classList.toggle('active', b.dataset.reviewScope === returnScope);
        $('[data-review-scope-wrap]', dialog).hidden = reviewMode !== 'return';
        text(
            dialog,
            '[data-review-mode-help]',
            MODE_HELP[reviewMode === 'return' ? returnScope : reviewMode],
        );
        const instructions = $('[data-review-mount] [data-score-instructions]');
        if (instructions) instructions.hidden = true;
        const label = $('[data-review-reason-label]', dialog);
        if (label)
            label.innerHTML =
                reviewMode === 'return' && returnScope === 'all'
                    ? 'Alasan pengembalian'
                    : `${reviewMode === 'return' ? 'Catatan umum' : 'Catatan untuk riwayat'} <span class="font-normal text-muted">(opsional)</span>`;
        const show = { approve: ['final'], correct: ['save-review', 'final'], return: ['return'] }[reviewMode];
        for (const action of ['return', 'final', 'save-review']) {
            const b = $(`[data-flow-action="${action}"]`, dialog);
            if (b) b.hidden = !show.includes(action);
        }
        text(
            dialog,
            '[data-flow-action="final"]',
            reviewMode === 'correct' ? 'Tetapkan Final dengan Nilai KD' : 'Tetapkan Final',
        );
        text(dialog, '[data-flow-action="return"]', 'Kembalikan ke Kepala Unit');
        $('[data-review-mount] [data-score-error]')?.setAttribute('hidden', '');
    }
    /** One timeline entry: frozen actor identity, transition, notes and per-KPI changes. */
    function historyEntry(h) {
        const details = h.details || {},
            items = details.items || [],
            full = FULL_SHEET.includes(h.action),
            changes = items.filter(
                (x) => full || differs(x.before, x.after),
            ),
            entry = node('li', null, 'assessment-history-entry'),
            head = node('div', null, 'assessment-history-head');
        entry.dataset.historyAction = h.action;
        head.append(
            node(
                'strong',
                h.action === 'approved' && changes.length
                    ? 'Menetapkan Final dengan koreksi nilai'
                    : HISTORY_ACTIONS[h.action] || 'Memperbarui penilaian',
            ),
        );
        if (details.bulk > 1)
            head.append(
                node(
                    'span',
                    `Persetujuan massal · ${details.bulk} penilaian`,
                    'assessment-history-tag',
                ),
            );
        if (h.previousSubmission)
            head.append(
                node('span', 'Pengajuan terdahulu', 'assessment-history-tag'),
            );
        entry.append(head);
        const actor = h.actor || {},
            area = [actor.position, actor.unit, actor.division]
                .filter(Boolean)
                .join(' · ');
        entry.append(
            node(
                'p',
                `${actor.name || 'Sistem'}${actor.nip ? ` (NIP ${actor.nip})` : ''}${area ? ` · ${area}` : ''}`,
                'assessment-history-actor',
            ),
        );
        const facts = [`${dateTime(h.at)} WIB`];
        if (h.statusBefore || h.statusAfter)
            facts.push(
                `${HISTORY_STATUS[h.statusBefore] || 'Belum diisi'} → ${HISTORY_STATUS[h.statusAfter] || 'Belum diisi'}`,
            );
        if (h.action === 'withdrawn' && h.totalBefore != null)
            facts.push(`Total dibatalkan ${number(h.totalBefore)}`);
        else if (h.totalAfter != null)
            facts.push(
                h.totalBefore != null && differs(h.totalBefore, h.totalAfter)
                    ? `Total ${number(h.totalBefore)} → ${number(h.totalAfter)}`
                    : `Total ${number(h.totalAfter)}`,
            );
        entry.append(node('p', facts.join(' · '), 'text-muted'));
        if (h.note)
            entry.append(
                node(
                    'p',
                    `${h.action === 'returned' ? 'Alasan pengembalian' : h.action === 'adjusted' ? 'Alasan koreksi' : 'Catatan'}: ${h.note}`,
                    'decision-note mt-2',
                ),
            );
        const notes = items.filter((x) => x.note);
        if (notes.length) {
            const list = node('ul', null, 'assessment-history-notes');
            for (const x of notes) {
                const li = node('li');
                li.append(node('strong', x.name), node('span', x.note));
                list.append(li);
            }
            entry.append(node('p', 'Catatan per KPI', 'assessment-history-subtitle'), list);
        }
        if (changes.length) {
            const box = node('details', null, 'assessment-history-items'),
                table = node('table', null, 'assessment-history-table'),
                headRow = node('tr');
            box.append(
                node(
                    'summary',
                    `${full ? 'Nilai per KPI' : 'Perubahan nilai KPI'} (${changes.length})`,
                    'link cursor-pointer',
                ),
            );
            const proposals = !full && changes.some((x) => x.proposal != null);
            for (const label of ['KPI', 'Bobot', full ? 'Nilai' : 'Sebelum', ...(full ? [] : ['Sesudah']), ...(proposals ? ['Usulan KU'] : [])])
                headRow.append(node('th', label));
            table.append(headRow);
            for (const x of changes) {
                const tr = node('tr');
                tr.append(
                    node('td', x.name),
                    node('td', `${number(x.weight)}%`, 'numeric'),
                );
                if (full)
                    tr.append(node('td', number(x.after ?? x.before), 'numeric'));
                else
                    tr.append(
                        node('td', x.before == null ? '-' : number(x.before), 'numeric'),
                        node('td', `${x.after == null ? '-' : number(x.after)}${x.reviewed ? ' (Nilai KD)' : ''}`, 'numeric'),
                    );
                if (proposals)
                    tr.append(node('td', x.proposal == null ? '-' : number(x.proposal), 'numeric'));
                table.append(tr);
            }
            box.append(table);
            entry.append(box);
        }
        for (const [key, label] of [
            ['positive', 'Temuan positif'],
            ['negative', 'Temuan negatif'],
        ]) {
            const finding = details.findings?.[key];
            if (finding)
                entry.append(
                    node(
                        'p',
                        `${label}: ${finding.after ?? (h.action === 'withdrawn' ? finding.before : 'dikosongkan')}`,
                        'text-muted mt-1',
                    ),
                );
        }
        if (h.legacy)
            entry.append(
                node(
                    'p',
                    'Dicatat sebelum riwayat rinci tersedia; nama pelaku sesuai data akun saat pembaruan sistem.',
                    'assessment-history-legacy',
                ),
            );
        return entry;
    }
    /**
     * History of the person-month from the server, newest first. Without a current submission (withdrawn) the
     * subject-period history is requested directly.
     */
    async function timeline(hist, assessment, p, key) {
        const cycleId = s.cycle(key)?.dbId;
        const path = assessment.id
            ? `/assessments/${assessment.id}/timeline`
            : cycleId && p.dbId
              ? `/assessment-history?${new URLSearchParams({
                    cycle_id: cycleId,
                    [p.type === 'member' ? 'employee_id' : 'subject_user_id']:
                        p.dbId,
                })}`
              : null;
        hist.replaceChildren(
            node(
                'li',
                path ? 'Memuat riwayat penilaian…' : 'Belum ada aktivitas penilaian.',
                'empty',
            ),
        );
        if (!path) return;
        let events;
        try {
            events = (await s.api.request(path)).data;
        } catch (error) {
            if (hist.isConnected)
                hist.replaceChildren(node('li', error.message, 'empty'));
            return;
        }
        if (!hist.isConnected) return;
        hist.replaceChildren(...events.map(historyEntry));
        if (!hist.childElementCount)
            hist.append(node('li', 'Belum ada aktivitas penilaian.', 'empty'));
        paginate(hist, 'review-history', { token: p.id + key, size: 5 });
    }
    /** Error shown in the open review, next to the decision buttons. */
    function reviewError(message) {
        const el = $('[data-review-mount] [data-score-error]');
        if (!el) return toast(message, true);
        el.textContent = message;
        el.hidden = false;
        el.scrollIntoView({ block: 'nearest' });
    }
    const reviewReason = () => $('[data-review-reason]')?.value.trim() || '';
    /**
     * KD score changes of the open review against the saved state, or null after showing an invalid score.
     * Notes and the general note are optional and sent when filled.
     */
    function reviewPlan() {
        const w = reviewWorking,
            reviews = [],
            invalid = [];
        w.snapshot.items.forEach((item, i) => {
            const parsed = parseReview(w.draft[i], item.config?.method === 'formula');
            if (parsed.error) return invalid.push(`${item.name}: ${parsed.error}`);
            // A KD score equal to the proposal is no correction.
            const value =
                parsed.value != null && differs(parsed.value, w.proposals[i]) ? parsed.value : null;
            if (value == null ? w.saved[i] == null : w.saved[i] != null && !differs(value, w.saved[i])) return;
            const note = (w.reviewNotes[item.id] || '').trim();
            reviews.push({ source_kpi_item_id: +item.id, score: value, note: note || null });
        });
        if (invalid.length) {
            reviewError(invalid.join(' '));
            return null;
        }
        return { reviews, reason: reviewReason() };
    }
    /** Saves the division head's scores; the submission stays waiting for a decision. */
    async function saveReview() {
        if (c.role !== 'kd' || !reviewWorking) return;
        const plan = reviewPlan();
        if (!plan) return;
        if (!plan.reviews.length) return reviewError('Belum ada Nilai KD yang diubah.');
        const id = reviewWorking.personId,
            notes = reviewWorking.reviewNotes;
        return s.api.perform($('[data-review-mount]'), async () => {
            const a = s.assessment(id);
            await s.api.request(`/assessments/${a.id}/adjust`, 'POST', {
                lock_version: a.lockVersion,
                reviews: plan.reviews,
                reason: plan.reason || null,
            });
            await s.refresh();
            sync();
            await review(id, s.cycleKey, { notes });
            toast('Nilai KD tersimpan. Usulan Kepala Unit tetap tercatat.');
        });
    }
    /** Discards unsaved KD scores or notes only after confirmation. */
    async function leaveReview() {
        const w = reviewWorking,
            pending =
                w &&
                (draftChanged(w) ||
                    Object.values(w.reviewNotes).some((x) => x.trim()) ||
                    !!reviewReason());
        return (
            !pending ||
            (await confirm('Buang Nilai KD dan catatan yang belum disimpan?'))
        );
    }
    async function decide(ids, returned = false) {
        if (c.role !== 'kd') return;
        const message = s.canWrite();
        if (message) return toast(message, true);
        const rows = ids.map((id) => s.person(id)).filter(Boolean);
        if (
            !rows.length ||
            rows.some(
                (p) =>
                    p.type !== 'member' ||
                    s.assessment(p.id).status !== 'Diajukan',
            )
        )
            return toast(
                'Pilih pengajuan staf yang masih menunggu keputusan.',
                true,
            );
        // KD scores and notes come from the open review of a single submission.
        const single =
            rows.length === 1 && reviewWorking?.personId === rows[0].id
                ? reviewWorking
                : null;
        let body = {},
            extra;
        if (returned) {
            if (!single)
                return toast('Buka pengajuan untuk mengembalikannya dengan catatan.', true);
            const reason = reviewReason();
            let notes = [];
            if (returnScope === 'items') {
                const items = single.snapshot.items.filter((item) =>
                    single.flags.has(String(item.id)),
                );
                if (!items.length)
                    return reviewError('Centang minimal satu KPI yang perlu diperbaiki, atau pilih "Seluruh penilaian".');
                const empty = items.filter((item) => !(single.reviewNotes[item.id] || '').trim());
                if (empty.length)
                    return reviewError(`Tulis catatan untuk KPI: ${empty.map((item) => item.name).join(', ')}.`);
                notes = items.map((item) => ({
                    source_kpi_item_id: +item.id,
                    note: single.reviewNotes[item.id].trim(),
                }));
            } else if (!reason) return reviewError('Tulis alasan pengembalian seluruh penilaian.');
            body = { reason: reason || null, item_notes: notes };
            extra = `${notes.length ? `Hanya ${notes.length} KPI yang dibuka untuk diperbaiki. ` : 'Seluruh lembar dibuka kembali. '}${draftChanged(single) ? 'Nilai KD yang belum disimpan tidak dipakai. ' : ''}Kepala Unit memperbaiki lalu mengajukan ulang.`;
        } else {
            // "Setujui" finalises with the proposals (plus KD scores saved earlier); drafts count only when correcting.
            const plan =
                single && reviewMode === 'correct'
                    ? reviewPlan()
                    : { reviews: [], reason: single ? reviewReason() : '' };
            if (single && reviewMode !== 'correct' && draftChanged(single))
                extra = 'Nilai KD yang belum disimpan tidak dipakai. ';
            if (!plan) return;
            if (!plan.reviews.length && rows.some((p) => s.total(p.id) == null))
                return toast('Ada pengajuan tidak lengkap. Periksa kembali.', true);
            if (plan.reviews.length) body.reviews = plan.reviews;
            if (plan.reason) body.reason = plan.reason;
            const total = single
                ? totalValues(
                      reviewMode === 'correct'
                          ? single.values
                          : single.saved.map((v, i) => v ?? single.proposals[i]),
                      single.snapshot.items,
                  )
                : null;
            extra = `${extra || ''}${plan.reviews.length ? `Nilai KD pada ${plan.reviews.length} KPI ikut disimpan. ` : ''}${total != null ? `Total ${number(total)}. ` : ''}Angka akan terkunci dan menjadi hasil resmi.`;
        }
        const answer = await confirm(
            `${returned ? 'Kembalikan' : 'Tetapkan Final'} ${rows.length} penilaian: ${rows.map((p) => p.name).join(', ')}? ${extra}`,
            { label: returned ? 'Kembalikan' : 'Tetapkan Final' },
        );
        if (!answer) return;
        return s.api.perform(null, async () => {
            if (!returned && rows.length > 1)
                await s.api.request('/approvals/bulk', 'POST', {
                    assessments: rows.map((p) => ({
                        id: s.assessment(p.id).id,
                        lock_version: s.assessment(p.id).lockVersion,
                    })),
                });
            else {
                const a = s.assessment(rows[0].id);
                await s.api.request(
                    `/assessments/${a.id}/${returned ? 'return' : 'approve'}`,
                    'POST',
                    { lock_version: a.lockVersion, ...body },
                );
            }
            selections.clear();
            reviewWorking = null;
            await s.refresh();
            close('review-dialog');
            sync();
            toast('Keputusan berhasil disimpan.');
        });
    }
    function sync() {
        updateUnitFilter();
        list();
        if (!dirty) {
            working = null;
            editor();
        }
        document.dispatchEvent(new Event('flow-assessments-rendered'));
    }
    document.addEventListener('input', (e) => {
        const reviewMount = e.target.closest('[data-review-mount]');
        if (reviewMount && reviewWorking) {
            if (e.target.matches('[data-item-flag]')) {
                const id = String(e.target.dataset.itemFlag);
                if (e.target.checked) reviewWorking.flags.add(id);
                else reviewWorking.flags.delete(id);
                $('[data-score-error]', reviewMount).hidden = true;
                if (e.target.checked)
                    e.target.closest('[data-item-note-wrap]').querySelector('[data-item-note-input]').focus();
            } else if (e.target.matches('[data-item-note-input]'))
                reviewWorking.reviewNotes[e.target.dataset.itemNoteInput] =
                    e.target.value;
            else if (e.target.matches('[data-review-score]')) {
                const i = +e.target.dataset.reviewScore,
                    parsed = parseReview(
                        e.target.value,
                        reviewWorking.snapshot.items[i].config?.method === 'formula',
                    );
                reviewWorking.draft[i] = e.target.value;
                reviewWorking.reviewed[i] = parsed.error ? null : parsed.value;
                reviewWorking.values[i] = parsed.error
                    ? e.target.value
                    : (parsed.value ?? reviewWorking.proposals[i]);
                e.target.setAttribute('aria-invalid', String(!!parsed.error));
                $('[data-score-error]', reviewMount).hidden = true;
                updateTotal(reviewMount, reviewWorking.snapshot, reviewWorking);
            }
            return;
        }
        if (e.target.matches('[data-measurement]')) {
            const p = s.person(selected);
            if (!editable(p) || !working) return;
            const index = +e.target.dataset.measurement;
            const config = s.template(p).items[index].config;
            working.inputs ||= {};
            working.inputs[index] ||= {};
            working.inputs[index][`variable_${e.target.dataset.variable}`] = e.target.value;
            const result = calculate(config, working.inputs[index]);
            working.values[index] = result.score;
            dirty = true;
            text(document, `[data-measurement-result="${index}"]`, result.message || `Nilai otomatis: ${number(result.score)}`);
            updateTotal($('[data-score-mount]'), s.template(p), working);
            text(document, '[data-unsent-state]', 'Ada perubahan belum dikirim');
        }
        if (e.target.matches('[data-score]')) {
            const p = s.person(selected);
            if (!editable(p) || !working) return;
            working.values[e.target.dataset.score] = e.target.value;
            dirty = true;
            updateTotal($('[data-score-mount]'), s.template(p), working);
            text(
                document,
                '[data-unsent-state]',
                'Ada perubahan belum dikirim',
            );
        }
        if (
            e.target.dataset.finding &&
            e.target.closest('[data-score-mount]')
        ) {
            working[e.target.dataset.finding] = e.target.value;
            dirty = true;
        }
        if (e.target.matches('[data-person-search]')) editor();
        if (e.target.matches('input[data-filter]')) {
            if (e.target.dataset.filter === 'division') updateUnitFilter();
            list();
            document.dispatchEvent(new Event('flow-filtered'));
        }
    });
    document.addEventListener('change', (e) => {
        if (e.target.matches('[data-flow-status-select]')) {
            statusTab = e.target.value;
            list();
            document.dispatchEvent(new Event('flow-filtered'));
        }
        if (e.target.matches('[data-score-order]')) list();
        if (e.target.matches('[data-mobile-person]')) select(e.target.value);
        if (e.target.matches('select[data-filter]')) {
            if (e.target.dataset.filter === 'division') updateUnitFilter();
            list();
            document.dispatchEvent(new Event('flow-filtered'));
        }
        if (e.target.dataset.pickAssessment) {
            if (e.target.checked)
                selections.add(e.target.dataset.pickAssessment);
            else selections.delete(e.target.dataset.pickAssessment);
            text(document, '[data-selected-count]', selections.size);
            updateSelectAll();
        }
        if (e.target.matches('[data-flow-select-all]')) {
            filtered()
                .filter((p) => !$(`[data-assessment-person="${p.id}"]`).hidden)
                .filter(
                    (p) =>
                        p.type === 'member' &&
                        s.assessment(p.id).status === 'Diajukan',
                )
                .forEach((p) =>
                    e.target.checked
                        ? selections.add(p.id)
                        : selections.delete(p.id),
                );
            list();
        }
    });
    function updateSelectAll() {
        const bulk = $('[data-flow-action="bulk-final"]');
        if (bulk) bulk.disabled = !selections.size;
        const all = $('[data-flow-select-all]');
        if (!all) return;
        const visible = $$(
            '[data-assessment-body] tr:not([hidden]) [data-pick-assessment]:not(:disabled)',
        );
        const count = visible.filter((e) =>
            selections.has(e.dataset.pickAssessment),
        ).length;
        all.checked = !!visible.length && count === visible.length;
        all.indeterminate = count > 0 && count < visible.length;
        all.disabled = !visible.length;
        all.setAttribute(
            'aria-label',
            'Pilih semua pengajuan pada halaman ini',
        );
    }
    document.addEventListener('pagination-updated', (e) => {
        if (e.detail.key === 'assessments') updateSelectAll();
    });
    async function select(id) {
        if (
            dirty &&
            !(await confirm(
                'Pindah dan buang pengisian yang belum dikirim? Isian tidak disimpan.',
            ))
        ) {
            const mobile = $('[data-mobile-person]');
            if (mobile) mobile.value = selected;
            return;
        }
        selected = id;
        working = null;
        dirty = false;
        editor();
    }
    document.addEventListener('click', async (e) => {
        const pick = e.target.closest('[data-person-pick]');
        if (pick) await select(pick.dataset.personPick);
        const tab = e.target.closest('[data-people-filter]');
        if (tab) {
            peopleTab = tab.dataset.peopleFilter;
            $$('[data-people-filter]').forEach((b) => {
                b.classList.toggle('active', b === tab);
                b.setAttribute('aria-pressed', String(b === tab));
            });
            editor();
        }
        const st = e.target.closest('[data-flow-status]');
        if (st) {
            statusTab = st.dataset.flowStatus;
            $$('[data-flow-status]').forEach((b) =>
                b.setAttribute('aria-selected', String(b === st)),
            );
            list();
            document.dispatchEvent(new Event('flow-filtered'));
        }
        const r = e.target.closest('[data-review-person]');
        if (r)
            review(r.dataset.reviewPerson, r.dataset.reviewCycle || s.cycleKey);
        const mode = e.target.closest('[data-review-mode]')?.dataset.reviewMode,
            scope = e.target.closest('[data-review-scope]')?.dataset.reviewScope;
        if ((mode || scope) && reviewWorking) {
            if (mode) reviewMode = mode;
            if (scope) returnScope = scope;
            applyReviewMode();
        }
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'final') await decide([reviewed]);
        if (action === 'return') await decide([reviewed], true);
        if (action === 'save-review') await saveReview();
        if (action === 'bulk-final') await decide([...selections]);
        if (action === 'next-review') {
            const ids = filtered()
                .filter(
                    (p) =>
                        p.type === 'member' &&
                        s.assessment(p.id).status === 'Diajukan',
                )
                .map((p) => p.id);
            const next = ids[ids.indexOf(reviewed) + 1] || ids[0];
            if (next) {
                if (await leaveReview()) review(next);
            } else {
                close('review-dialog');
                toast('Tidak ada pengajuan menunggu pada filter ini.');
            }
        }
        if (action === 'next-person') {
            const rows = s
                .people(kind)
                .filter((p) => editable(p) && p.id !== selected);
            if (rows.length) await select(rows[0].id);
            else toast('Tidak ada orang berikutnya yang perlu diisi.');
        }
        const p = s.person(selected);
        if (!p) return;
        if (action === 'copy-previous' && editable(p)) {
            try {
                await s.ensureMonths([previousMonth(s.cycleKey)]);
            } catch (error) {
                return toast(error.message, true);
            }
            const before = s.assessment(p.id, previousMonth(s.cycleKey)),
                target = s.template(p);
            if (!before.snapshot)
                return toast(
                    'Tidak ada lembar bulan lalu yang dapat dibandingkan.',
                    true,
                );
            let count = 0;
            target.items.forEach((item, i) => {
                const j = before.snapshot.items.findIndex(
                    (x) => itemSignature(x) === itemSignature(item),
                );
                if (j >= 0 && before.values[j] != null) {
                    working.values[i] = before.values[j];
                    if (item.config?.method === 'formula') {
                        working.inputs ||= {};
                        working.inputs[i] = structuredClone(before.inputs?.[j] || {});
                    }
                    count++;
                }
            });
            dirty = count > 0;
            editor();
            toast(
                count
                    ? `${count} KPI yang cocok disalin. Periksa lalu kirim.`
                    : 'Tidak ada KPI yang cocok pada kedua versi.',
                !count,
            );
        }
        if (action === 'send-assessment' && editable(p)) {
            const k = s.template(p),
                root = $('[data-score-mount]');
            if (!k) return;
            const total = totalValues(working.values, k.items);
            if (
                total == null ||
                Math.abs(k.items.reduce((n, r) => n + r.weight, 0) - 100) >
                    0.0001
            ) {
                const el = $('[data-score-error]', root);
                el.textContent =
                    'Lengkapi seluruh KPI dengan bilangan bulat 10-100 dan bobot tepat 100%.';
                el.hidden = false;
                const invalid = $$('[data-score]', root).find(
                    (e) =>
                        !/^\d+$/.test(e.value) ||
                        +e.value < 10 ||
                        +e.value > 100,
                );
                if (invalid) {
                    reveal(invalid);
                    invalid.focus();
                }
                return;
            }
            if (
                !(await confirm(
                    `${c.role === 'ku' ? 'Ajukan ke Kepala Divisi' : 'Tetapkan Final'} untuk ${p.name}, ${labelCycle(s.cycleKey)}, total ${number(total)}? ${c.role === 'ku' ? 'Angka dikunci selama menunggu keputusan.' : 'Hasil menjadi Final dan hanya baca.'}`,
                ))
            )
                return;
            return s.api.perform(root, async () => {
                const current = s.assessment(p.id);
                const payload = {
                    scores: scorePayload(k.items, working),
                    positive_finding: working.positive || '',
                    negative_finding: working.negative || '',
                };
                if (current.status === 'Dikembalikan') {
                    payload.lock_version = current.lockVersion;
                    await s.api.request(
                        '/assessments/' + current.id + '/resubmit',
                        'POST',
                        payload,
                    );
                } else {
                    payload.cycle_id = s.cycle().dbId;
                    payload[
                        p.type === 'member'
                            ? 'employee_id'
                            : 'subject_user_id'
                    ] = p.dbId;
                    await s.api.request('/assessments', 'POST', payload);
                }
                dirty = false;
                working = null;
                await s.refresh();
                sync();
                toast(
                    c.role === 'ku'
                        ? 'Penilaian diajukan ke Kepala Divisi.'
                        : 'Nilai Kepala Unit sudah Final.',
                );
            });
        }
        if (
            action === 'cancel-submission' &&
            c.role === 'ku' &&
            s.assessment(p.id).status === 'Diajukan' &&
            !s.canWrite()
        ) {
            if (
                !(await confirm(
                    `Batalkan pengajuan ${p.name}? Seluruh angka dan temuan pengajuan dihapus. Status menjadi Belum diisi dan harus diisi ulang.`,
                ))
            )
                return;
            return s.api.perform(null, async () => {
                const a = s.assessment(p.id);
                await s.api.request(
                    '/assessments/' + a.id + '/withdraw',
                    'POST',
                    { lock_version: a.lockVersion },
                );
                dirty = false;
                working = null;
                await s.refresh();
                sync();
                toast('Pengajuan dibatalkan. Silakan isi ulang.');
            });
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('[data-score], [data-review-score]')) {
            e.preventDefault();
            const list = $$(
                e.target.matches('[data-review-score]') ? '[data-review-score]' : '[data-score]:not(:disabled)',
                e.target.closest('[data-review-mount]') ||
                    $('[data-score-mount]'),
            );
            const next = list[list.indexOf(e.target) + 1];
            if (next) {
                reveal(next);
                next.focus();
            }
        }
    });
    if ($('[data-flow-editor]'))
        window.addEventListener('beforeunload', (e) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    const divisions = s.data.divisions.filter(
        (d) => c.role === 'hc' || d.headId === s.actor?.id,
    );
    const divisionOptions =
        c.role === 'hc' && c.page === 'dashboard'
            ? divisions.map((division) => {
                  const duplicate = divisions.some(
                      (other) =>
                          other.id !== division.id &&
                          other.name === division.name,
                  );
                  return {
                      ...division,
                      name:
                          duplicate && division.code
                              ? `${division.name} (${division.code})`
                              : division.name,
                  };
              })
            : divisions;
    optionList($('[data-filter="division"]'), divisionOptions, 'Semua divisi');
    optionList($('[data-filter="unit"]'), s.scopedUnits(), c.role === 'kd' ? 'Semua unit dalam divisi' : 'Semua unit');
    if (c.page === 'persetujuan' && $('[data-filter="type"]'))
        $('[data-filter="type"]').value = 'member';
    const qs = new URLSearchParams(location.search);
    if (qs.get('division') && $('[data-filter="division"]'))
        $('[data-filter="division"]').value = qs.get('division');
    updateUnitFilter();
    if (qs.get('unit') && $('[data-filter="unit"]'))
        $('[data-filter="unit"]').value = qs.get('unit');
    document.addEventListener('flow-updated', sync);
    sync();
    if (qs.get('person') && !$('[data-flow-editor]')) review(qs.get('person'));
    return { filtered, review, sync, getStatus: () => statusTab };
}
