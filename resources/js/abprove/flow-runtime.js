import { $, $$, node, text, labelCycle, dateTime } from './flow-dom';
import { paginate } from './pagination';
import { initProfile } from './profile';
export function initFlowRuntime(c, s) {
    const link = (page, extra = {}) => {
        const base = c.links[page];
        if (!base) return '#';
        const url = new URL(base, location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('cycle', s.cycleKey);
        for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
        return url.href;
    };
    $$('a[href]').forEach((a) => {
        const match = Object.entries(c.links).find(
            ([, href]) => new URL(href).pathname === new URL(a.href).pathname,
        );
        if (match) a.href = link(match[0]);
    });
    function render() {
        if (!s.actor) return;
        const profile = s.data.profiles[s.actor.id];
        const name = profile?.name || c.actor.nama;
        $$('[data-profile-name],[data-actor-name]').forEach(
            (e) => (e.textContent = name),
        );
        const areas =
            c.role === 'hc'
                ? 'Seluruh organisasi'
                : c.role === 'ku'
                  ? s
                        .scopedUnits()
                        .map((u) => u.name)
                        .join(', ')
                  : s.data.divisions
                        .filter((d) => d.headId === s.actor.id)
                        .map((d) => d.name)
                        .join(', ');
        text(
            document,
            '.top-scope',
            areas || 'Akun belum ditugaskan pada area',
        );
        const letters = name
            .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
            .split(/[ ,]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0])
            .join('');
        const avatar = $('header [data-dialog-open="account-dialog"] .avatar');
        if (avatar) avatar.textContent = letters;
        const profileAvatar = $('[data-profile-avatar]');
        if (profileAvatar && !profileAvatar.querySelector('img'))
            profileAvatar.textContent = letters;
        const scopeField = $('[data-local-form="profile"] input[readonly]');
        if (scopeField) scopeField.value = areas || 'Belum ditugaskan';
        const scopeCopy = $('[data-profile-name] + p');
        if (scopeCopy) scopeCopy.textContent = areas || 'Belum ditugaskan';
        $$('[data-month-label]').forEach(
            (e) => (e.textContent = labelCycle(s.cycleKey)),
        );
        text(
            document,
            '[data-month-short]',
            labelCycle(s.cycleKey).slice(0, 3),
        );
        const options = $('[data-cycle-options]');
        options.replaceChildren();
        for (const cycle of [...s.data.cycles].sort((a, b) =>
            b.id.localeCompare(a.id),
        )) {
            const a = node(
                'a',
                `${labelCycle(cycle.id)} · ${{ open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' }[cycle.status]}`,
                'menu-item text-xs',
            );
            const url = new URL(location.href);
            url.searchParams.set('cycle', cycle.id);
            url.searchParams.delete('month');
            a.href = url.href;
            options.append(a);
        }
        paginate(options, 'period-menu', { size: 6 });
        const x = s.cycle();
        text(
            document,
            '[data-cycle-notice]',
            x
                ? `${labelCycle(x.id)} · ${{ open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' }[x.status]}. ${s.canWrite() || 'Pengisian sesuai jadwal WIB.'}`
                : 'Periode belum dibuat oleh Super HC.',
        );
        const deadlines = $('[data-deadlines]');
        if (deadlines) {
            deadlines.replaceChildren();
            if (x)
                for (const [label, value] of [
                    ['Mulai', x.opens],
                    ['Batas KU', x.submission],
                    ['Batas KD', x.approval],
                    ['Tutup', x.closes],
                ]) {
                    const item = node('div');
                    item.append(
                        node('dt', label, 'text-muted text-xs'),
                        node('dd', dateTime(value) + ' WIB', 'mt-1'),
                    );
                    deadlines.append(item);
                }
        }
        const results = $('[data-search-results]'),
            q = $('[data-flow-search]')?.value.toLowerCase() || '';
        if (results) {
            results.replaceChildren();
            for (const [page, href] of Object.entries(c.links)) {
                if (!page.toLowerCase().includes(q)) continue;
                const a = node(
                    'a',
                    page.replace(/-/g, ' '),
                    'menu-item capitalize',
                );
                a.href = link(page);
                results.append(a);
            }
            for (const p of s.people()) {
                if (!`${p.name} ${p.nip}`.toLowerCase().includes(q)) continue;
                const a = node('a', `${p.name} · ${p.unitName}`, 'menu-item');
                a.href = link(
                    c.role === 'ku'
                        ? 'nilai'
                        : c.role === 'kd' && p.type === 'unit_head'
                          ? 'nilai-kepala'
                          : c.role === 'kd'
                            ? 'persetujuan'
                            : 'rekap',
                    { person: p.id },
                );
                results.append(a);
            }
            if (!results.childElementCount)
                results.append(
                    node('p', 'Tidak ada hasil pencarian.', 'empty'),
                );
            paginate(results, 'search', { token: q, size: 5 });
        }
    }
    $('[data-flow-search]')?.addEventListener('input', render);
    document.addEventListener('flow-updated', render);
    initProfile({
        api: s.api,
        profile: s.data.profiles[s.actor.id] || {
            name: s.actor.name,
            email: s.actor.email,
        },
        actorEmail: s.actor.email,
        refresh: () => s.refresh(),
    });
    render();
    return link;
}
