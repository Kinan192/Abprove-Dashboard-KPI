import { $, $$, node, field, error, optionList } from '../flow-dom';
import { open, close, toast } from '../ui';
import { syncSearchableSelects } from '../searchable-select';
import { createWizard } from './wizard';
import { AREAS, freeHeads, headHint, setLabel, blockerNotice, pairs, when } from './shared';

const OPERATIONS = {
    replace: { title: 'Ganti kepala', user: 'Akun kepala pengganti', done: 'Kepala area telah diganti.' },
    move: { title: 'Pindahkan kepala ke area lain', user: 'Akun pengganti untuk area asal', done: 'Kepala telah dipindahkan dan area asal mendapat pengganti.' },
    swap: { title: 'Tukar kepala dua area', user: '', done: 'Kepala kedua area telah ditukar.' },
    release: { title: 'Lepas kepala dengan pengganti', user: 'Akun pengganti kepala yang dilepas', done: 'Kepala dilepas dan pengganti telah ditetapkan.' },
};
const PAIR = ['move', 'swap'];

/**
 * Head changes for units and divisions. Every step after "Tujuan" is driven by
 * GET /heads/preview; the confirmation sends the assignment ids returned by that preview.
 */
export function initHeadWizard(s) {
    const dialog = $('#head-dialog'),
        form = $('#head-change-form');
    let area = null,
        record = null,
        preview = null,
        controller = null;
    const operation = () => field(form, 'operation').value;
    const others = () =>
        s.data[area].filter((x) => x.active && x.id !== record.id);
    const areaName = (x) =>
        area === 'units'
            ? `${x.name} · ${s.division(x.divisionId)?.name || '-'}`
            : x.name;

    function targets(op) {
        return others()
            .filter((x) => op !== 'swap' || x.headId)
            .map((x) => ({
                id: x.id,
                name: `${areaName(x)} — ${s.account(x.headId)?.name || 'tanpa kepala'}`,
            }));
    }

    const wizard = createWizard(dialog, form, {
        1: {
            leave() {
                const op = operation();
                if (PAIR.includes(op) && !targets(op).length) {
                    const { label } = AREAS[area];
                    throw new Error(op === 'swap'
                        ? `Belum ada ${label} aktif lain yang memiliki kepala untuk ditukar.`
                        : `Belum ada ${label} aktif lain sebagai tujuan.`);
                }
            },
        },
        2: {
            enter() {
                const op = operation(),
                    { role } = AREAS[area],
                    candidates = freeHeads(s, role);
                $$('[data-head-for]', form).forEach((group) => {
                    const visible = group.dataset.headFor.split(',').includes(op);
                    group.hidden = !visible;
                    $$('select', group).forEach((el) => (el.disabled = !visible));
                });
                optionList(field(form, 'targetAreaId'), targets(op), `Pilih ${AREAS[area].label.toLowerCase()} tujuan`);
                optionList(field(form, 'userId'), candidates, `Pilih akun ${AREAS[area].roleLabel}`);
                if (OPERATIONS[op].user) setLabel(field(form, 'userId'), OPERATIONS[op].user);
                $('[data-head-eligible-help]', form).textContent = headHint(role, candidates.length);
                syncSearchableSelects(form);
            },
            async leave() {
                const op = operation(),
                    { label, role, roleLabel } = AREAS[area],
                    target = field(form, 'targetAreaId').value,
                    user = field(form, 'userId').value;
                if (PAIR.includes(op) && !target) throw new Error(`Pilih ${label.toLowerCase()} tujuan.`);
                if (op !== 'swap' && !user)
                    throw new Error(freeHeads(s, role).length ? `Pilih akun ${roleLabel} pengganti.` : headHint(role, 0));
                const query = new URLSearchParams({ operation: op, area, area_id: record.id });
                if (PAIR.includes(op)) query.set('target_area_id', target);
                if (op !== 'swap') query.set('user_id', user);
                controller?.abort();
                controller = new AbortController();
                preview = (await s.api.request('/heads/preview?' + query, 'GET', null, { signal: controller.signal })).data;
            },
        },
        3: {
            enter() {
                const root = $('[data-head-preview]', form);
                root.replaceChildren();
                const cards = node('div', null, 'org-impact-areas');
                for (const x of preview.areas) {
                    const card = node('section', null, 'org-area-card');
                    card.dataset.changed = String(x.changed);
                    card.append(
                        node('h3', `${AREAS[x.area].label} ${x.name}`),
                        pairs([
                            ...(x.division_name ? [['Divisi', x.division_name]] : []),
                            ['Kepala saat ini', x.current ? `${x.current.name} (sejak ${when(x.current.since)})` : 'Belum ada'],
                            ['Kepala sesudah', x.next?.name || 'Belum ada'],
                            ['Perubahan', x.changed ? 'Berubah' : 'Tetap'],
                            ['Penilaian non-Final', `${x.pending_assessments} penilaian`],
                        ]),
                    );
                    cards.append(card);
                }
                root.append(cards);
                if (preview.released.length)
                    root.append(node('p', `Tidak lagi memimpin area: ${preview.released.map((r) => r.name).join(', ')}. Akun tetap ada; Admin yang menonaktifkan akun bila perlu.`, 'notice notice-warning'));
                const blockers = blockerNotice(preview.blockers, 'Perubahan belum dapat disimpan:');
                if (blockers) {
                    root.append(blockers);
                    wizard.block();
                } else root.append(node('p', 'Tidak ada hambatan. Perubahan disimpan atomik dalam satu transaksi.', 'notice notice-success'));
            },
        },
        4: {
            enter() {
                const summary = $('[data-head-summary]', form);
                summary.replaceChildren();
                const list = node('ul');
                list.append(...preview.areas.filter((x) => x.changed).map((x) =>
                    node('li', `${AREAS[x.area].label} ${x.name}: ${x.current?.name || 'tanpa kepala'} → ${x.next.name}`)));
                const body = node('div');
                body.append(node('strong', OPERATIONS[preview.operation].title, 'block'), list);
                summary.append(body);
            },
        },
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const reason = field(form, 'reason').value.trim();
        if (!reason) return error(form, 'Alasan perubahan wajib diisi.');
        if (!field(form, 'confirmed').checked)
            return error(form, 'Centang konfirmasi setelah meninjau dampak perubahan.');
        const op = preview.operation,
            [source, target] = preview.areas,
            payload = {
                operation: op,
                area,
                area_id: source.id,
                expected_assignment_id: source.current?.assignment_id ?? null,
                confirmed: true,
                reason,
            };
        if (PAIR.includes(op))
            Object.assign(payload, {
                target_area_id: target.id,
                target_expected_assignment_id: target.current?.assignment_id ?? null,
            });
        if (op !== 'swap') payload.user_id = source.next.user_id;
        await s.api.perform(form, async () => {
            await s.api.request('/heads/reassign', 'POST', payload);
            await s.refresh();
            close('head-dialog');
            toast(OPERATIONS[op].done);
        });
    });
    dialog.addEventListener('close', () => controller?.abort());

    return {
        /** Opens the wizard for a unit or division (`resource` is "units" or "divisions"). */
        open(resource, id) {
            area = resource;
            record = s.data[resource].find((x) => x.id === id);
            preview = null;
            form.reset();
            const head = s.account(record.headId),
                { label, roleLabel } = AREAS[resource];
            $('#head-dialog-title').textContent = `Ubah kepala ${label} ${record.name}`;
            $('[data-head-source]', form).textContent = head
                ? `${label} ${record.name} saat ini dipimpin ${head.name}. ${label} aktif tidak boleh tanpa ${roleLabel}.`
                : `${label} ${record.name} belum memiliki ${roleLabel}. Tetapkan kepala melalui Ganti kepala.`;
            $('[data-head-move-help]', form).textContent = `Kepala pindah ke ${label.toLowerCase()} lain dengan peran sama. ${label} asal wajib mendapat pengganti; kepala di ${label.toLowerCase()} tujuan (bila ada) dilepas.`;
            $$('input[name="operation"]', form).forEach((radio) => {
                radio.disabled = !head && radio.value !== 'replace';
            });
            wizard.start();
            syncSearchableSelects(form);
            open('head-dialog');
        },
    };
}
