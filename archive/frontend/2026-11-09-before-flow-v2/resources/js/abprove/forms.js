import { $, $$, open, close, confirm, toast } from './ui';
export function initForms(c, s, refresh) {
    let templateKey =
            new URLSearchParams(location.search).get('template') || 'GP',
        headMode = 'existing',
        imported;
    const formError = (form, message) => {
        const e = $('[data-form-error]', form);
        if (e) {
            e.textContent = message;
            e.hidden = false;
        } else toast(message, true);
    };
    function selectTemplate(key) {
        templateKey = key;
        $$('[data-template-panel]').forEach(
            (e) => (e.hidden = e.dataset.templatePanel !== key),
        );
        $$('[data-template-tab]').forEach((b) =>
            b.setAttribute(
                'aria-selected',
                String(b.dataset.templateTab === key),
            ),
        );
    }
    function weights(panel) {
        const n = $$('[data-kpi-field="6"]', panel).reduce(
            (n, e) => n + +e.value,
            0,
        );
        $$('[data-master-weight]', panel).forEach(
            (e) => (e.textContent = `${Math.round(n * 10000) / 10000}%`),
        );
        const m = $('[data-master-message]', panel);
        if (m) {
            m.textContent =
                Math.abs(n - 100) < 0.0001
                    ? 'Bobot sudah 100%.'
                    : 'Total bobot harus 100% sebelum disimpan.';
            m.classList.toggle('text-link', Math.abs(n - 100) > 0.0001);
        }
        return n;
    }
    function editEmployee(id) {
        const form = $('#employee-form');
        form.reset();
        const p = s.person(id);
        if (p)
            for (const [key, value] of Object.entries({
                id: p.id,
                name: p.nama,
                nip: p.nip,
                job: p.jab,
                unit: p.unit,
                template: p.tpl,
                email: p.email || '',
                phone: p.phone || '',
            }))
                form.elements[key].value = value;
        $('#employee-dialog h2').textContent = p
            ? 'Ubah karyawan'
            : 'Tambah karyawan';
        open('employee-dialog');
    }
    function employees() {
        const body = $('[data-employees-body]');
        if (!body) return;
        const q = $('[data-management-search]').value.toLowerCase(),
            unit = $('[data-management-unit]').value,
            active =
                $('.active[data-management-status]')?.dataset
                    .managementStatus || 'active';
        let count = 0;
        s.state.employees.forEach((p) => {
            let row = $(`[data-employee-row="${p.id}"]`, body);
            if (!row) {
                row = $(
                    '#employee-row-template',
                ).content.firstElementChild.cloneNode(true);
                row.dataset.employeeRow = p.id;
                body.append(row);
            }
            row.dataset.unit = p.unit;
            const cells = $$('td', row),
                name = $('strong', cells[0]);
            let sub =
                $('[data-new-nip]', cells[0]) || $('span.text-xs', cells[0]);
            if (!sub) {
                sub = document.createElement('p');
                sub.className = 'text-xs text-muted';
                cells[0].append(sub);
            }
            name.textContent = p.nama;
            sub.textContent = `NIP ${p.nip}`;
            cells[1].textContent = p.jab;
            cells[2].textContent =
                s.state.units.find((u) => u.id === p.unit)?.nama || p.unit;
            cells[3].textContent = s.state.templates[p.tpl]?.nama || p.tpl;
            cells[4].textContent = p.active === false ? 'Nonaktif' : 'Aktif';
            $('[data-edit-employee]', row).dataset.editEmployee = p.id;
            row.hidden =
                (unit && p.unit !== unit) ||
                !`${p.nama} ${p.nip} ${p.jab}`.toLowerCase().includes(q) ||
                (active === 'active' && p.active === false) ||
                (active === 'inactive' && p.active !== false);
            if (!row.hidden) count++;
        });
        $('[data-management-empty]').hidden =
            count > 0 ||
            !$('[data-management-panel="employees"]') ||
            $('[data-management-panel="employees"]').hidden;
        $$('[data-head-row]').forEach((row) => {
            const u = s.state.units.find((u) => u.id === row.dataset.headRow);
            if (u && $('[data-head-name]', row))
                $('[data-head-name]', row).textContent = u.kepala;
        });
    }
    function collections() {
        const container = $('[data-collection-results]');
        if (!container) return;
        container.replaceChildren();
        Object.values(s.state.collections).forEach((record) => {
            const div = document.createElement('div');
            div.className = 'card p-4 flex items-center gap-4';
            const label = document.createElement('span');
            label.className = 'grow text-sm';
            label.textContent = `${record.name} · ${record.code || record.email || record.kind} · ${record.active ? 'Aktif' : 'Nonaktif'}`;
            const button = document.createElement('button');
            button.className = 'link';
            button.type = 'button';
            button.dataset.collectionNew = record.kind;
            button.dataset.recordId = record.id;
            button.textContent = 'Ubah';
            div.append(label, button);
            container.append(div);
        });
    }
    function placementFilter() {
        const q = $('[data-placement-search]')?.value.toLowerCase() || '',
            unit = $('[data-placement-unit]')?.value;
        $$('[data-placement-person]').forEach(
            (e) =>
                (e.hidden =
                    !e.textContent.toLowerCase().includes(q) ||
                    (!!unit && e.dataset.unit !== unit)),
        );
    }
    function placementPreview() {
        const key = $('[data-placement-template]')?.value;
        if (!key) return;
        const preview = $('[data-placement-preview]');
        preview.replaceChildren();
        for (const r of s.state.templates[key].kpi) {
            const div = document.createElement('div');
            div.className = 'border-b border-line p-3 text-sm';
            div.textContent = `${r[1]} · ${r[6]}%`;
            preview.append(div);
        }
    }
    function openPlacement(id) {
        $('#placement-form').reset();
        $$('[name="employees"]', $('#placement-form')).forEach(
            (e) => (e.checked = e.value === id),
        );
        $('[data-placement-count]').textContent = id ? '1' : '0';
        placementPreview();
        open('placement-dialog');
    }
    document.addEventListener('click', async (event) => {
        const tab = event.target.closest('[data-template-tab]');
        if (tab) selectTemplate(tab.dataset.templateTab);
        const mt = event.target.closest('[data-management-tab]');
        if (mt) {
            $$('[data-management-tab]').forEach((e) =>
                e.classList.toggle('active', e === mt),
            );
            $$('[data-management-panel]').forEach(
                (e) =>
                    (e.hidden =
                        e.dataset.managementPanel !== mt.dataset.managementTab),
            );
            employees();
        }
        const ms = event.target.closest('[data-management-status]');
        if (ms) {
            $$('[data-management-status]').forEach((e) =>
                e.classList.toggle('active', e === ms),
            );
            employees();
        }
        const edit = event.target.closest('[data-edit-employee]');
        if (edit) editEmployee(edit.dataset.editEmployee);
        const eh = event.target.closest('[data-edit-head]');
        if (eh) {
            const u = s.state.units.find((u) => u.id === eh.dataset.editHead);
            const form = $('#head-form');
            form.reset();
            form.elements.unit.value = u.id;
            form.elements.name.value = u.kepala;
            open('head-dialog');
        }
        const hm = event.target.closest('[data-head-mode]');
        if (hm) {
            headMode = hm.dataset.headMode;
            $$('[data-head-mode]').forEach((e) =>
                e.classList.toggle('active', e === hm),
            );
            $('[data-head-new]').hidden = headMode !== 'new';
            $('[data-head-existing]').hidden = headMode === 'new';
        }
        const cp = event.target.closest('[data-collection-new]');
        if (cp) {
            const kind = cp.dataset.collectionNew,
                id = cp.dataset.recordId || '',
                form = $('#collection-form');
            form.reset();
            const source =
                s.state.collections[`${kind}:${id}`] ||
                (kind === 'division'
                    ? c.fixture.divisions.find((d) => d.id === id)
                    : kind === 'user'
                      ? c.fixture.accounts.find((a) => a.key === id)
                      : null);
            form.elements.kind.value = kind;
            form.elements.id.value = id;
            form.elements.name.value =
                source?.name || source?.nama || (kind === 'position' ? id : '');
            form.elements.code.value =
                source?.code || source?.nip || source?.id || '';
            form.elements.email.value = source?.email || '';
            $('[data-collection-email]').hidden = kind !== 'user';
            open('collection-dialog');
        }
        const pm = event.target.closest('[data-placement-mode]');
        if (pm) {
            $$('[data-placement-mode]').forEach((e) =>
                e.classList.toggle('active', e === pm),
            );
            $('[data-manual-placement]').hidden =
                pm.dataset.placementMode !== 'manual';
        }
        const pp = event.target.closest('[data-placement-pick]');
        if (pp) openPlacement(pp.dataset.placementPick);
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'new-employee') editEmployee();
        if (action === 'new-head') {
            $('#head-form').reset();
            open('head-dialog');
        }
        if (action === 'open-placement') openPlacement();
        if (
            action === 'reset-demo' &&
            (await confirm(
                'Hapus perubahan contoh di browser dan kembalikan desain awal?',
            ))
        )
            s.reset();
        if (action === 'remind')
            toast('Pengingat disimulasikan. Tidak ada pesan yang dikirim.');
        if (action === 'add-kpi') {
            const panel = $(`[data-template-panel="${templateKey}"]`),
                body = $('tbody', panel),
                row = body.lastElementChild.cloneNode(true);
            $$('[data-kpi-field]', row).forEach(
                (e) =>
                    (e.value =
                        e.dataset.kpiField === '6'
                            ? 0
                            : e.tagName === 'SELECT'
                              ? 'Technical Care'
                              : ''),
            );
            $$('[id]', row).forEach((e) => e.removeAttribute('id'));
            $$('label', row).forEach((e) => e.remove());
            body.append(row);
            weights(panel);
        }
        if (action === 'remove-kpi') {
            const row = event.target.closest('tr'),
                panel = row.closest('[data-template-panel]');
            if ($$('tbody tr', panel).length <= 1)
                return toast('Template harus memiliki minimal satu KPI.', true);
            if (await confirm('Hapus baris KPI dari rancangan lokal?')) {
                row.remove();
                weights(panel);
            }
        }
        if (action === 'save-template') {
            const panel = $(`[data-template-panel="${templateKey}"]`),
                rows = $$('tbody tr', panel).map((row) =>
                    $$('[data-kpi-field]', row).map((e) =>
                        e.dataset.kpiField === '6' ? +e.value : e.value.trim(),
                    ),
                );
            if (
                Math.abs(weights(panel) - 100) > 0.0001 ||
                rows.some((r) => !r[1] || !Number.isFinite(r[6]) || r[6] <= 0)
            )
                return toast(
                    'Isi nama KPI dan bobot positif dengan total 100%.',
                    true,
                );
            const name = $('[data-template-name]', panel).value.trim();
            if (!name) return toast('Nama template wajib diisi.', true);
            s.state.templates[templateKey] = { nama: name, kpi: rows };
            s.save();
            toast('Master KPI disimpan lokal untuk audit.');
        }
        if (action === 'import-template' && imported) {
            s.state.templates.GP = {
                nama: 'Template impor (contoh lokal)',
                kpi: imported,
            };
            s.save();
            close('import-dialog');
            toast(
                'Template CSV disimpan di browser. Muat ulang Master KPI untuk melihatnya.',
            );
        }
    });
    document.addEventListener('input', (event) => {
        const panel = event.target.closest('[data-template-panel]');
        if (panel) weights(panel);
        if (
            event.target.matches(
                '[data-management-search],[data-management-unit]',
            )
        )
            employees();
        if (event.target.matches('[data-placement-search]')) placementFilter();
        if (event.target.matches('[data-placement-pick-search]'))
            $$('[data-placement-option]').forEach(
                (e) =>
                    (e.hidden = !e.textContent
                        .toLowerCase()
                        .includes(event.target.value.toLowerCase())),
            );
    });
    document.addEventListener('change', async (event) => {
        if (event.target.matches('[data-management-unit]')) employees();
        if (event.target.matches('[data-placement-unit]')) placementFilter();
        if (event.target.matches('[data-placement-template]'))
            placementPreview();
        if (event.target.matches('[name="employees"]'))
            $('[data-placement-count]').textContent = $$(
                '[name="employees"]:checked',
            ).length;
        if (event.target.matches('[data-avatar-file]')) {
            const file = event.target.files[0];
            if (!file) return;
            if (
                !['image/png', 'image/jpeg', 'image/webp'].includes(
                    file.type,
                ) ||
                file.size > 2 * 1024 * 1024
            )
                return toast(
                    'Gunakan gambar PNG/JPG/WebP maksimal 2 MB.',
                    true,
                );
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = 'Pratinjau foto profil';
            img.className = 'size-full rounded-full object-cover';
            img.onload = () => URL.revokeObjectURL(img.src);
            $('[data-profile-avatar]').replaceChildren(img);
            toast('Foto ditampilkan untuk sesi audit ini.');
        }
        if (event.target.matches('[data-profile-notification]')) {
            s.state.profiles[c.actor.key || c.role] ||= {};
            s.state.profiles[c.actor.key || c.role].notification =
                event.target.checked;
            s.save();
            toast('Pilihan notifikasi disimpan lokal.');
        }
        if (event.target.matches('[data-import-file]')) {
            const file = event.target.files[0];
            imported = null;
            const button = $('[data-action="import-template"]'),
                preview = $('[data-import-preview]');
            button.disabled = true;
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                preview.textContent = 'Ukuran file maksimal 2 MB.';
                return;
            }
            if (!file.name.toLowerCase().endsWith('.csv')) {
                preview.textContent = `${file.name}: pratinjau Excel belum dihubungkan. Gunakan CSV untuk menguji impor lokal.`;
                return;
            }
            const text = await file.text();
            const rows = parseCSV(text)
                .slice(1)
                .filter((r) => r.some(Boolean));
            const valid =
                rows.length &&
                rows.every(
                    (r) => r.length === 7 && r[1] && +r[6] > 0 && +r[6] <= 100,
                ) &&
                Math.abs(rows.reduce((n, r) => n + +r[6], 0) - 100) < 0.0001;
            preview.replaceChildren();
            const msg = document.createElement('p');
            msg.className = valid
                ? 'notice notice-success'
                : 'notice notice-error';
            msg.textContent = valid
                ? `${rows.length} KPI valid. Total bobot 100%. Siap untuk simulasi impor lokal.`
                : 'CSV tidak valid. Harus 7 kolom, nama KPI terisi dan total bobot 100%.';
            preview.append(msg);
            if (valid) {
                imported = rows.map((r) => r.map((v, i) => (i === 6 ? +v : v)));
                const list = document.createElement('ul');
                list.className = 'mt-4 space-y-2 text-sm';
                rows.forEach((r) => {
                    const li = document.createElement('li');
                    li.textContent = `${r[1]} · ${r[6]}%`;
                    list.append(li);
                });
                preview.append(list);
                button.disabled = false;
            }
        }
    });
    document.addEventListener('submit', async (event) => {
        const form = event.target.closest('[data-local-form]');
        if (!form) return;
        event.preventDefault();
        if (!form.reportValidity()) return;
        const values = Object.fromEntries(new FormData(form)),
            kind = form.dataset.localForm;
        $('[data-form-error]', form)?.setAttribute('hidden', '');
        if (kind === 'settings') {
            if (!(
                +values.sb > +values.b &&
                +values.b > +values.c &&
                +values.c > 0 &&
                +values.sb <= 100
            ))
                return formError(
                    form,
                    'Batas kategori harus berurutan: Sangat Baik > Baik > Cukup.',
                );
            s.state.set = { ...values };
        }
        if (kind === 'profile') {
            s.state.profiles[c.actor.key || c.role] = {
                ...s.state.profiles[c.actor.key || c.role],
                ...values,
            };
            $$('[data-profile-name]').forEach(
                (e) => (e.textContent = values.name),
            );
        }
        if (kind === 'password') {
            if (values.new_password !== values.confirmation)
                return formError(form, 'Konfirmasi kata sandi belum sama.');
            if (values.new_password.length < 12)
                return formError(form, 'Kata sandi minimal 12 karakter.');
            form.reset();
            toast('Validasi berhasil. Kata sandi tidak dikirim atau disimpan.');
            return;
        }
        if (kind === 'forgot') {
            $('[data-forgot-form]').hidden = true;
            $('[data-forgot-sent]').hidden = false;
            return;
        }
        if (kind === 'employee') {
            if (
                s.state.employees.some(
                    (p) => p.nip === values.nip.trim() && p.id !== values.id,
                )
            )
                return formError(form, 'NIP sudah digunakan pada data contoh.');
            const record = {
                id: values.id || `LOCAL-${Date.now()}`,
                nama: values.name.trim(),
                nip: values.nip.trim(),
                jab: values.job.trim(),
                unit: values.unit,
                tpl: values.template,
                email: values.email,
                phone: values.phone,
                active: true,
            };
            const index = s.state.employees.findIndex(
                (p) => p.id === record.id,
            );
            if (index >= 0) s.state.employees[index] = record;
            else s.state.employees.push(record);
            close('employee-dialog');
            employees();
        }
        if (kind === 'head') {
            if (headMode === 'new' && !values.unitName.trim())
                return formError(form, 'Nama unit baru wajib diisi.');
            let u = s.state.units.find((u) => u.id === values.unit);
            if (headMode === 'new') {
                u = {
                    id: `LOCAL-${Date.now()}`,
                    div: values.division,
                    nama: values.unitName.trim(),
                    kepala: values.name.trim(),
                };
                s.state.units.push(u);
                const row = document.createElement('tr');
                row.dataset.headRow = u.id;
                [
                    u.nama,
                    u.kepala,
                    '0',
                    c.fixture.divisions.find((d) => d.id === u.div)?.kepala ||
                        '-',
                ].forEach((text) => {
                    const td = document.createElement('td');
                    td.textContent = text;
                    row.append(td);
                });
                $('[data-management-panel="heads"] tbody').append(row);
            } else u.kepala = values.name.trim();
            form.reset();
            close('head-dialog');
            employees();
        }
        if (kind === 'collection') {
            const id = values.id || `LOCAL-${Date.now()}`;
            s.state.collections[`${values.kind}:${id}`] = {
                ...values,
                id,
                active: form.elements.active.checked,
            };
            collections();
            close('collection-dialog');
        }
        if (kind === 'placement') {
            const ids = new FormData(form).getAll('employees');
            if (!ids.length)
                return formError(form, 'Pilih minimal satu karyawan.');
            if (+values.until < +values.from)
                return formError(
                    form,
                    'Bulan akhir harus sama atau setelah bulan mulai.',
                );
            if (
                ids.some((id) => {
                    for (let m = +values.from; m <= +values.until; m++)
                        if (Object.keys(s.assessment(id, m).vals).length)
                            return true;
                    return false;
                })
            )
                return formError(
                    form,
                    'Bulan yang sudah dinilai terkunci. Pilih bulan berikutnya.',
                );
            const record = {
                ids,
                template: values.template,
                from: +values.from,
                until: +values.until,
            };
            s.state.placements.push(record);
            const text = `${ids.length} karyawan memakai ${s.state.templates[values.template].nama}, mulai ${c.fixture.months[+values.from]}.`;
            $('[data-placement-history]').textContent = text;
            close('placement-dialog');
        }
        s.save();
        refresh();
        toast(
            'Perubahan disimpan di browser untuk audit. Database tidak berubah.',
        );
    });
    if ($('[data-template-tab]')) selectTemplate(templateKey);
    $$('[data-template-panel]').forEach((panel) => {
        const key = panel.dataset.templatePanel,
            data = s.state.templates[key];
        if (c.role === 'hc' && data) {
            $('[data-template-name]', panel).value = data.nama;
            const body = $('tbody', panel),
                prototype = body.firstElementChild.cloneNode(true);
            body.replaceChildren();
            data.kpi.forEach((r, i) => {
                const row = prototype.cloneNode(true);
                $$('[data-kpi-field]', row).forEach((e) => {
                    e.value = r[+e.dataset.kpiField];
                    e.id = `local-kpi-${key}-${i}-${e.dataset.kpiField}`;
                    const label = e.previousElementSibling;
                    if (label?.tagName === 'LABEL') label.htmlFor = e.id;
                });
                body.append(row);
            });
            weights(panel);
        }
    });
    const profile = s.state.profiles[c.actor.key || c.role];
    if (profile) {
        const form = $('[data-local-form="profile"]');
        if (form)
            Object.entries(profile).forEach(([k, v]) => {
                if (form.elements[k]) form.elements[k].value = v;
            });
        if (profile.name)
            $$('[data-profile-name]').forEach(
                (e) => (e.textContent = profile.name),
            );
        if ($('[data-profile-notification]') && profile.notification != null)
            $('[data-profile-notification]').checked = profile.notification;
    }
    const settings = $('[data-local-form="settings"]');
    if (settings)
        Object.entries(s.state.set).forEach(([k, v]) => {
            if (settings.elements[k]) settings.elements[k].value = v;
        });
    const log = $('[data-activity-list]');
    if (log) {
        log.replaceChildren();
        s.state.act.forEach((a) => {
            const item = document.createElement('li');
            item.className = 'border-b border-line p-4 text-sm';
            item.textContent = `${a.who} ${a.txt} · ${a.t}`;
            log.append(item);
        });
    }
    employees();
    collections();
    if (c.state === 'employee') editEmployee();
    if (c.state === 'head') open('head-dialog');
    if (c.state === 'placement') openPlacement();
}
function parseCSV(text) {
    const rows = [];
    let row = [],
        value = '',
        quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (quoted && text[i + 1] === '"') {
                value += '"';
                i++;
            } else quoted = !quoted;
        } else if (char === ',' && !quoted) {
            row.push(value.trim());
            value = '';
        } else if (char === '\n' && !quoted) {
            row.push(value.trim());
            rows.push(row);
            row = [];
            value = '';
        } else if (char !== '\r') value += char;
    }
    if (quoted) return [];
    if (value || row.length) {
        row.push(value.trim());
        rows.push(row);
    }
    return rows;
}
