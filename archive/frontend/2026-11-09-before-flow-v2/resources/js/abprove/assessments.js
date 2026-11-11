import { $, $$, number, toast, open, close, confirm } from './ui';
export function initAssessments(c, s) {
    let selected = $('[data-editor]:not([hidden])')?.dataset.editor,
        dirty = false,
        reviewId,
        reviewMonth = c.month;
    let statusFilter =
        $('[data-status-filter][aria-selected="true"]')?.dataset.statusFilter ||
        'all';
    const editable = (id) =>
        c.month === c.fixture.activeMonth &&
        ['Belum', 'Draft', 'Dikembalikan'].includes(s.assessment(id).status);
    const drafts = new Map();
    const draft = (id) => {
        if (!drafts.has(id)) drafts.set(id, structuredClone(s.assessment(id)));
        return drafts.get(id);
    };
    const valueTotal = (id, a) => {
        const rows = s.template(id).kpi;
        return rows.every(
            (_, i) =>
                /^\d+$/.test(String(a.vals[i])) &&
                +a.vals[i] >= 10 &&
                +a.vals[i] <= 100,
        )
            ? rows.reduce((n, row, i) => n + (+a.vals[i] * +row[6]) / 100, 0)
            : null;
    };
    function renderSheet(root, id, a, readonly = false, month = c.month) {
        if (!root) return;
        const rows = s.template(id).kpi;
        $$('[data-kpi-index]', root).forEach((row, i) => {
            const v = a.vals[i],
                valid = /^\d+$/.test(String(v)) && +v >= 10 && +v <= 100;
            const input = $('[data-score]', row);
            if (input) {
                input.value = v ?? '';
                input.hidden = readonly;
                input.disabled = readonly;
                input.setAttribute(
                    'aria-invalid',
                    String(v != null && v !== '' && !valid),
                );
            }
            const text = $('[data-readonly-score]', row);
            text.textContent = v ?? '-';
            text.hidden = !readonly;
            $('[data-score-result]', row).textContent = valid
                ? number((+v * +rows[i][6]) / 100)
                : '-';
            const delta = $('[data-score-delta]', row),
                previous = s.assessment(id, month - 1).vals[i];
            if (delta)
                delta.textContent =
                    valid && previous != null
                        ? `${+v - +previous > 0 ? '+' : ''}${+v - +previous}`
                        : '-';
        });
        const total = valueTotal(id, a),
            category = s.category(total);
        $('[data-score-total]', root).textContent = number(total);
        $('[data-score-category]', root).textContent = category[0];
        $('[data-score-category]', root).dataset.category = category[1];
        $('[data-filled]', root).textContent = rows.filter(
            (_, i) => a.vals[i] != null && a.vals[i] !== '',
        ).length;
        $$('[data-status]', root).forEach((e) => {
            e.dataset.status = a.status;
            e.textContent = a.status === 'Belum' ? 'Belum diisi' : a.status;
        });
        $('[data-return-note]', root).hidden = !a.note;
        $('[data-note-value]', root).textContent = a.note || '';
        $('[data-final-note]', root).hidden = a.status !== 'Final';
        $$('[data-finding]', root).forEach((e) => {
            e.value = a[e.dataset.finding] || '';
            e.readOnly = readonly;
        });
        $$('[data-finding-read]', root).forEach(
            (e) => (e.textContent = a[e.dataset.findingRead] || 'Tidak ada'),
        );
    }
    function renderEditor(id) {
        const root = $(`[data-editor="${id}"]`);
        if (!root) return;
        const locked = !editable(id);
        renderSheet(root, id, draft(id), locked);
        ['copy-previous', 'save-draft', 'submit-assessment'].forEach(
            (action) => ($(`[data-action="${action}"]`, root).hidden = locked),
        );
        $('[data-action="withdraw-assessment"]', root).hidden =
            s.assessment(id).status !== 'Diajukan' ||
            c.role !== 'ku' ||
            c.month !== c.fixture.activeMonth;
        $('[data-save-state]', root).textContent = locked
            ? 'Hanya baca'
            : dirty
              ? 'Perubahan belum disimpan'
              : 'Draft lokal';
    }
    function filterList() {
        const filters = Object.fromEntries(
            $$('[data-list-filter]').map((e) => [
                e.dataset.listFilter,
                e.value.toLowerCase(),
            ]),
        );
        let visible = 0;
        $$('[data-assessment-list] tbody [data-person]').forEach((row) => {
            const id = row.dataset.person,
                a = s.assessment(id),
                total = s.total(id),
                category = s.category(total);
            const matches =
                statusFilter === 'all' ||
                (statusFilter === 'pending'
                    ? ['Belum', 'Draft'].includes(a.status)
                    : a.status === statusFilter);
            row.hidden =
                !matches ||
                (filters.unit &&
                    row.dataset.unit !== filters.unit.toUpperCase()) ||
                (filters.division &&
                    row.dataset.division !== filters.division.toUpperCase()) ||
                (filters.search &&
                    !row.dataset.search?.includes(filters.search));
            if (!row.hidden) visible++;
            $('[data-status]', row).dataset.status = a.status;
            $('[data-status]', row).textContent =
                a.status === 'Belum' ? 'Belum diisi' : a.status;
            $('[data-row-total]', row).textContent = number(total);
            $('[data-row-category]', row).textContent = category[0];
            $('[data-row-category]', row).dataset.category = category[1];
            const checkbox = $('[data-select-assessment]', row);
            if (checkbox) {
                checkbox.disabled = a.status !== 'Diajukan' || row.hidden;
                if (checkbox.disabled) checkbox.checked = false;
            }
        });
        $$('[data-list-empty]').forEach((e) => (e.hidden = visible > 0));
        const checked = $$('[data-select-assessment]:checked');
        $$('[data-selected-count]').forEach(
            (e) => (e.textContent = checked.length),
        );
    }
    function sync() {
        const counts = { total: c.people.length };
        c.people.forEach((p) => {
            const status = s.assessment(p.id).status;
            counts[status] = (counts[status] || 0) + 1;
        });
        Object.assign(counts, {
            pending:
                (counts.Belum || 0) +
                (counts.Draft || 0) +
                (counts.Dikembalikan || 0),
            unsubmitted: (counts.Belum || 0) + (counts.Draft || 0),
            submitted:
                (counts.Diajukan || 0) +
                (counts.Disetujui || 0) +
                (counts.Final || 0),
            filled: c.people.length - (counts.Belum || 0) - (counts.Draft || 0),
        });
        $$('[data-count]').forEach((e) => {
            if (e.dataset.count !== 'average')
                e.textContent = counts[e.dataset.count] || 0;
        });
        $$('[data-status-count]').forEach(
            (e) =>
                (e.textContent =
                    e.dataset.statusCount === 'all'
                        ? counts.total
                        : e.dataset.statusCount === 'pending'
                          ? counts.unsubmitted
                          : counts[e.dataset.statusCount] || 0),
        );
        $$('[data-nav-count]').forEach((e) => {
            const n =
                e.dataset.navCount === 'nilai'
                    ? counts.pending
                    : e.dataset.navCount === 'persetujuan'
                      ? counts.Diajukan
                      : e.dataset.navCount === 'pengajuan'
                        ? counts.Dikembalikan
                        : counts.Final;
            e.textContent = n || '';
            e.hidden = !n;
        });
        $$('[data-select-person]').forEach((e) => {
            const a = s.assessment(e.dataset.selectPerson);
            $('[data-person-status]', e).textContent =
                a.status === 'Belum' ? 'Belum diisi' : a.status;
        });
        $$('[data-progress-bar]').forEach(
            (e) =>
                (e.style.width = `${(counts.submitted / Math.max(1, counts.total)) * 100}%`),
        );
        $$('[data-home-return]').forEach(
            (e) =>
                (e.hidden =
                    s.assessment(e.dataset.homeReturn).status !==
                    'Dikembalikan'),
        );
        $$('[data-no-returns]').forEach(
            (e) => (e.hidden = !!counts.Dikembalikan),
        );
        filterList();
        document.dispatchEvent(new Event('assessment-updated'));
    }
    function error(root, message) {
        const el = $('[data-editor-error]', root);
        el.textContent = message;
        el.hidden = false;
    }
    async function decision(ids, status, needsReason = false) {
        if (c.role !== 'kd')
            return toast(
                'Super HC memantau rekap. Keputusan Final ada pada Kepala Divisi.',
                true,
            );
        if (c.month !== c.fixture.activeMonth)
            return toast('Periode ini hanya dapat dibaca.', true);
        ids = ids.filter((id) => s.assessment(id).status === 'Diajukan');
        if (!ids.length)
            return toast('Pilih pengajuan yang menunggu Kepala Divisi.', true);
        const answer = await confirm(
            `${needsReason ? 'Kembalikan' : 'Tetapkan Final'} ${ids.length} penilaian dalam simulasi lokal?${needsReason ? '' : ' Nilai akan terkunci.'}`,
            {
                reason: needsReason,
                label: needsReason ? 'Kembalikan' : 'Tetapkan Final',
            },
        );
        if (!answer) return;
        ids.forEach((id) => s.log(id, status, needsReason ? answer : ''));
        sync();
        close('review-dialog');
        toast(
            `${ids.length} penilaian ${status.toLowerCase()} di browser. Backend tidak berubah.`,
        );
    }
    function review(id, month = c.month) {
        const template = document.getElementById(`review-template-${id}`);
        if (!template) return;
        reviewId = id;
        reviewMonth = month;
        const container = $('[data-review-content]');
        container.replaceChildren(template.content.cloneNode(true));
        renderSheet(container, id, s.assessment(id, month), true, month);
        $('[data-review-month]').textContent =
            `${c.fixture.months[month]} ${c.fixture.year}`;
        const timeline = $('[data-timeline-list]');
        timeline.replaceChildren();
        for (const entry of s.assessment(id, month).log || []) {
            const li = document.createElement('li');
            li.textContent =
                typeof entry === 'string'
                    ? entry
                    : `${entry.status || entry.s || ''} · ${entry.who || ''} ${entry.note || ''}`;
            timeline.append(li);
        }
        if (!timeline.childElementCount) {
            const li = document.createElement('li');
            li.textContent = 'Belum ada perubahan pada simulasi ini.';
            timeline.append(li);
        }
        ['return-assessment', 'approve-assessment'].forEach((action) => {
            const btn = $(`[data-action="${action}"]`);
            if (btn)
                btn.hidden =
                    c.role !== 'kd' ||
                    s.assessment(id, month).status !== 'Diajukan' ||
                    month !== c.fixture.activeMonth;
        });
        open('review-dialog');
    }
    document.addEventListener('input', (event) => {
        const root = event.target.closest('[data-editor]');
        if (root && editable(root.dataset.editor)) {
            const a = draft(root.dataset.editor);
            if (event.target.matches('[data-score]'))
                a.vals[event.target.dataset.score] = event.target.value;
            if (event.target.dataset.finding)
                a[event.target.dataset.finding] = event.target.value;
            dirty = true;
            const active = document.activeElement,
                start = active.selectionStart;
            renderEditor(root.dataset.editor);
            if (active.matches('input[type="text"]'))
                active.setSelectionRange(start, start);
        }
        if (event.target.matches('[data-list-filter]')) filterList();
        if (event.target.matches('[data-person-search]')) filterPeople();
    });
    let peopleTab = 'all';
    function filterPeople() {
        const q = $('[data-person-search]')?.value.toLowerCase() || '';
        const buttons = $$('[data-select-person]');
        buttons.forEach((b) => {
            const p = s.person(b.dataset.selectPerson);
            b.hidden =
                !`${p?.nama || p?.name} ${p?.nip}`.toLowerCase().includes(q) ||
                (peopleTab === 'needed' && !editable(b.dataset.selectPerson));
        });
        if ($('[data-people-empty]'))
            $('[data-people-empty]').hidden = buttons.some((b) => !b.hidden);
    }
    document.addEventListener('change', (event) => {
        if (event.target.matches('[data-list-filter]')) filterList();
        if (event.target.matches('[data-select-all]')) {
            $$('[data-select-assessment]:not(:disabled)').forEach(
                (e) => (e.checked = event.target.checked),
            );
            filterList();
        }
        if (event.target.matches('[data-select-assessment]')) filterList();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('[data-score]')) {
            event.preventDefault();
            const inputs = $$(
                '[data-score]',
                event.target.closest('[data-editor]'),
            );
            inputs[inputs.indexOf(event.target) + 1]?.focus();
        }
    });
    document.addEventListener('click', async (event) => {
        const personButton = event.target.closest('[data-select-person]');
        if (personButton) {
            if (
                dirty &&
                !(await confirm(
                    'Pindah karyawan? Perubahan yang belum disimpan akan dibuang.',
                ))
            )
                return;
            if (dirty) drafts.delete(selected);
            dirty = false;
            selected = personButton.dataset.selectPerson;
            $$('[data-editor]').forEach(
                (e) => (e.hidden = e.dataset.editor !== selected),
            );
            $$('[data-select-person]').forEach((b) =>
                b.classList.toggle('selected', b === personButton),
            );
            renderEditor(selected);
        }
        const peopleButton = event.target.closest('[data-people-tab]');
        if (peopleButton) {
            peopleTab = peopleButton.dataset.peopleTab;
            $$('[data-people-tab]').forEach((b) =>
                b.classList.toggle('active', b === peopleButton),
            );
            filterPeople();
        }
        const tab = event.target.closest('[data-status-filter]');
        if (tab) {
            statusFilter = tab.dataset.statusFilter;
            $$('[data-status-filter]').forEach((b) =>
                b.setAttribute('aria-selected', String(b === tab)),
            );
            filterList();
        }
        const reviewer = event.target.closest('[data-review-person]');
        if (reviewer) review(reviewer.dataset.reviewPerson);
        const history = event.target.closest('[data-history-person]');
        if (history)
            review(
                history.dataset.historyPerson,
                +history.dataset.historyMonth,
            );
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'approve-selected')
            decision(
                $$('[data-select-assessment]:checked').map(
                    (e) => e.dataset.selectAssessment,
                ),
                'Final',
            );
        if (action === 'approve-assessment') decision([reviewId], 'Final');
        if (action === 'return-assessment')
            decision([reviewId], 'Dikembalikan', true);
        if (action === 'copy-recap') {
            try {
                await navigator.clipboard.writeText(
                    c.people
                        .map(
                            (p) =>
                                `${p.name}\t${number(s.total(p.id))}\t${s.assessment(p.id).status}`,
                        )
                        .join('\n'),
                );
                toast('Rekap contoh disalin.');
            } catch {
                toast('Browser menolak clipboard. Gunakan Export Excel.', true);
            }
        }
        if (
            ![
                'copy-previous',
                'save-draft',
                'submit-assessment',
                'withdraw-assessment',
            ].includes(action)
        )
            return;
        const root = event.target.closest('[data-editor]'),
            id = root?.dataset.editor;
        if (!id) return;
        if (action === 'withdraw-assessment') {
            if (
                s.assessment(id).status === 'Diajukan' &&
                (await confirm('Tarik kembali pengajuan contoh ini?'))
            ) {
                s.log(id, 'Draft');
                drafts.delete(id);
                dirty = false;
                renderEditor(id);
                sync();
                toast('Pengajuan ditarik secara lokal.');
            }
            return;
        }
        if (!editable(id)) return;
        const a = draft(id);
        if (action === 'copy-previous') {
            if (
                !c.month ||
                !Object.keys(s.assessment(id, c.month - 1).vals).length
            )
                return toast('Belum ada nilai bulan sebelumnya.', true);
            a.vals = structuredClone(s.assessment(id, c.month - 1).vals);
            dirty = true;
            renderEditor(id);
            toast('Nilai bulan sebelumnya disalin. Simpan setelah diperiksa.');
            return;
        }
        const invalid = Object.values(a.vals).some(
            (v) =>
                v !== '' &&
                v != null &&
                (!/^\d+$/.test(String(v)) || +v < 10 || +v > 100),
        );
        if (invalid)
            return error(
                root,
                'Nilai harus bilangan bulat 10–100. Periksa kolom yang ditandai.',
            );
        if (
            Math.abs(s.template(id).kpi.reduce((n, r) => n + +r[6], 0) - 100) >
            0.0001
        )
            return error(root, 'Total bobot template harus 100%.');
        if (action === 'submit-assessment' && valueTotal(id, a) == null)
            return error(root, 'Lengkapi seluruh nilai sebelum mengajukan.');
        if (
            action === 'submit-assessment' &&
            !(await confirm(
                c.role === 'kd'
                    ? 'Tetapkan penilaian kepala unit sebagai Final? Nilai akan terkunci secara lokal.'
                    : 'Ajukan penilaian contoh ini ke Kepala Divisi?',
            ))
        )
            return;
        a.status =
            action === 'save-draft'
                ? 'Draft'
                : c.role === 'kd'
                  ? 'Final'
                  : 'Diajukan';
        s.put(id, a);
        s.log(id, a.status);
        drafts.delete(id);
        dirty = false;
        renderEditor(id);
        sync();
        $('[data-editor-error]', root).hidden = true;
        toast('Penilaian disimpan di browser. Backend tidak berubah.');
    });
    window.addEventListener('beforeunload', (event) => {
        if (dirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    $$('[data-editor]').forEach((e) => renderEditor(e.dataset.editor));
    sync();
    const state = c.state,
        id = new URLSearchParams(location.search).get('person');
    if (id && !selected && document.getElementById(`review-template-${id}`))
        review(id);
    else if (state === 'review')
        review(
            c.people.find((p) => s.assessment(p.id).status === 'Diajukan')
                ?.id || c.people[0]?.id,
        );
    if (state === 'export') open('export-dialog');
    return { sync };
}
