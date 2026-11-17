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
import { activityLabel } from './activity-labels';
import { calculate } from '../kpi-workspace/model.js';
import {
    totalValues,
    categorize,
    previousMonth,
    itemSignature,
} from './flow-store';
export function initFlowAssessments(c, s, link) {
    let selected,
        working,
        dirty = false,
        reviewed,
        reviewSequence = 0,
        peopleTab = 'all',
        statusTab =
            $('[data-flow-status-select]')?.value ||
            $('[data-flow-status][aria-selected="true"]')?.dataset.flowStatus ||
            'all';
    const requestedStatus = new URLSearchParams(location.search).get('status');
    if (
        ['all', 'Belum', 'Diajukan', 'Dikembalikan', 'Final'].includes(
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
        !s.canWrite(p.type) &&
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
    function renderScore(root, p, a, readOnly = false, key = s.cycleKey) {
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
        $('[data-score-instructions]', sheet).hidden = readOnly;
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
        lock.hidden = !readOnly;
        lock.textContent =
            a.status === 'Final'
                ? 'Final. Nilai, bobot dan kategori tersimpan pada snapshot dan hanya dapat dibaca.'
                : a.status === 'Diajukan'
                  ? 'Pengajuan sedang menunggu Kepala Divisi. Angka terkunci.'
                  : s.canWrite(p.type) || 'Lembar hanya dapat dibaca.';
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
            const input = $('[data-score]', row);
            input.dataset.score = i;
            input.value = a.values[i] ?? '';
            input.disabled = readOnly;
            input.closest('label').hidden = readOnly;
            text(row, '[data-score-label]', `Nilai ${item.name}`);
            const output = $('[data-read-score]', row);
            output.hidden = !readOnly;
            output.textContent = a.values[i] ?? '-';
            if (item.config?.method === 'formula') {
                const cell = input.closest('td');
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
                    field.readOnly = readOnly || variable.source === 'fixed';
                    if (variable.source === 'fixed') a.inputs[i][`variable_${variable.key}`] = variable.value;
                    field.value = a.inputs[i][`variable_${variable.key}`] ?? '';
                    label.append(field);
                    cell.append(label);
                }
                // Input guidance belongs to editable sheets; read-only sheets report the stored value.
                let message;
                if (readOnly)
                    message =
                        a.values[i] == null || a.values[i] === ''
                            ? 'Belum ada nilai.'
                            : `Nilai otomatis: ${number(a.values[i])}`;
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
        if (!working || working.personId !== selected)
            working = {
                ...structuredClone(s.assessment(selected)),
                personId: selected,
            };
        const sheet = renderScore(mount, p, working, !editable(p));
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
     * Opens one person-month. Months outside the page window are loaded first; earlier months are
     * reached only through Final results, so their Final rows are enough.
     */
    async function review(id, key = s.cycleKey) {
        const sequence = ++reviewSequence;
        try {
            await s.ensureMonths([key], { finalOnly: key !== s.cycleKey });
            if (c.role === 'kd')
                await s.ensureMonths([previousMonth(key)], { finalOnly: true });
        } catch (error) {
            return toast(error.message, true);
        }
        if (sequence !== reviewSequence) return;
        const p = s.person(id, key);
        if (!p) return;
        reviewed = id;
        const assessment = s.assessment(id, key);
        const sheet = renderScore(
            $('[data-review-mount]'),
            p,
            assessment,
            true,
            key,
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
            text(
                sheet,
                '[data-review-decision-state]',
                assessment.status === 'Diajukan'
                    ? 'Menunggu keputusan Kepala Divisi. Pengajuan sudah diterima.'
                    : assessment.status === 'Final'
                      ? 'Penilaian sudah ditetapkan Final.'
                      : assessment.status === 'Dikembalikan'
                        ? 'Pengajuan dikembalikan untuk diperbaiki.'
                        : 'Belum ada pengajuan atau keputusan.',
            );
            hist.replaceChildren(
                node('li', 'Buka untuk memuat jejak keputusan.', 'empty'),
            );
            // The sheet is rebuilt per review, so the first opening of this tab loads its timeline.
            tab.addEventListener(
                'toggle',
                () => timeline(hist, assessment, id + key),
                { once: true },
            );
        }
        const allowed =
            !!sheet &&
            c.role === 'kd' &&
            p.type === 'member' &&
            key === s.cycleKey &&
            assessment.status === 'Diajukan' &&
            !s.canWrite();
        for (const action of ['return', 'final']) {
            const b = $(`[data-flow-action="${action}"]`);
            if (b) b.hidden = !allowed;
        }
        open('review-dialog');
    }
    /** Decision timeline of the reviewed assessment, read from the server on demand. */
    async function timeline(hist, assessment, token) {
        hist.replaceChildren(
            node(
                'li',
                assessment.id
                    ? 'Memuat jejak keputusan…'
                    : 'Belum ada aktivitas penilaian.',
                'empty',
            ),
        );
        if (!assessment.id) return;
        let events;
        try {
            events = (
                await s.api.request(`/assessments/${assessment.id}/timeline`)
            ).data;
        } catch (error) {
            if (hist.isConnected)
                hist.replaceChildren(node('li', error.message, 'empty'));
            return;
        }
        if (!hist.isConnected) return;
        hist.replaceChildren();
        for (const h of events.toSorted(
            (a, b) => Date.parse(a.at) - Date.parse(b.at),
        )) {
            const entry = node('li'),
                title = node(
                    'strong',
                    {
                        Diajukan: 'Mengajukan penilaian',
                        Dikembalikan: 'Mengembalikan penilaian',
                        Final: 'Menetapkan Final',
                    }[h.action] || activityLabel(h.action),
                );
            entry.append(
                title,
                node(
                    'p',
                    `${h.who || 'Sistem'} · ${dateTime(h.at)} WIB`,
                    'text-muted mt-1',
                ),
            );
            if (h.reason)
                entry.append(
                    node(
                        'p',
                        `${/return|Dikembalikan/.test(h.action) ? 'Alasan pengembalian' : 'Catatan peristiwa'}: ${h.reason}`,
                        'decision-note mt-2',
                    ),
                );
            hist.append(entry);
        }
        if (!hist.childElementCount)
            hist.append(node('li', 'Belum ada aktivitas penilaian.', 'empty'));
        paginate(hist, 'review-history', { token, size: 3 });
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
        if (!returned && rows.some((p) => s.total(p.id) == null))
            return toast('Ada pengajuan tidak lengkap. Periksa kembali.', true);
        const answer = await confirm(
            `${returned ? 'Kembalikan' : 'Tetapkan Final'} ${rows.length} penilaian: ${rows.map((p) => p.name).join(', ')}? ${returned ? 'KU harus memperbaiki dan mengajukan ulang.' : 'Angka akan terkunci dan menjadi hasil resmi.'}`,
            {
                reason: returned,
                label: returned ? 'Kembalikan' : 'Tetapkan Final',
            },
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
            else
                for (const p of rows) {
                    const a = s.assessment(p.id);
                    await s.api.request(
                        '/assessments/' +
                            a.id +
                            '/' +
                            (returned ? 'return' : 'approve'),
                        'POST',
                        {
                            lock_version: a.lockVersion,
                            ...(returned ? { reason: answer } : {}),
                        },
                    );
                }
            selections.clear();
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
        const action =
            e.target.closest('[data-flow-action]')?.dataset.flowAction;
        if (action === 'final') await decide([reviewed]);
        if (action === 'return') await decide([reviewed], true);
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
            if (next) review(next);
            else {
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
                    scores: k.items.map((item, i) => ({
                        source_kpi_item_id: +item.id,
                        ...(item.config?.method === 'formula'
                            ? { inputs: working.inputs?.[i] || {} }
                            : { score: +working.values[i] }),
                    })),
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
        if (e.key === 'Enter' && e.target.matches('[data-score]')) {
            e.preventDefault();
            const list = $$(
                '[data-score]:not(:disabled)',
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
