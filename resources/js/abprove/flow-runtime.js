import { $, $$, node, text, labelCycle, dateTime } from './flow-dom';
import { paginate } from './pagination';
import { initProfile } from './profile';
const CYCLE_STATUS = { open: 'Terbuka', closed: 'Ditutup', planned: 'Direncanakan' };
export function initFlowRuntime(c, s) {
    // Period selected for the whole shell. Pages reload on a period change; the KPI workspace
    // switches in place and announces the new period with `flow-period-selected`.
    let selectedKey = s.cycleKey,
        menuYear = String(selectedKey || '').slice(0, 4);
    const link = (page, extra = {}) => {
        const base = c.links[page];
        if (!base) return '#';
        const url = new URL(base, location.origin);
        url.searchParams.delete('month');
        url.searchParams.set('cycle', selectedKey);
        for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
        return url.href;
    };
    const relink = (anchors) =>
        anchors.forEach((a) => {
            if (a.closest('[data-cycle-options]')) return;
            const match = Object.entries(c.links).find(
                ([, href]) => new URL(href).pathname === new URL(a.href).pathname,
            );
            if (match) a.href = link(match[0]);
        });
    relink($$('a[href]'));
    function renderPeriodLabels() {
        $$('[data-month-label]').forEach(
            (e) => (e.textContent = labelCycle(selectedKey)),
        );
        text(document, '[data-month-short]', labelCycle(selectedKey).slice(0, 3));
    }
    /** Years that have periods, plus the selected one; the menu shows one year at a time. */
    const menuYears = () =>
        [
            ...new Set([
                ...s.data.cycles.map((cycle) => cycle.id.slice(0, 4)),
                String(selectedKey || '').slice(0, 4),
            ]),
        ]
            .filter(Boolean)
            .sort();
    /** Top bar period menu: year navigation (bounded by existing periods) and that year's periods. */
    function renderPeriodMenu() {
        const options = $('[data-cycle-options]');
        if (!options) return;
        const years = menuYears();
        if (!years.includes(menuYear)) menuYear = years.at(-1) || '';
        const index = years.indexOf(menuYear);
        const step = (delta, label, symbol) => {
            const button = node('button', symbol, 'btn btn-small min-w-9 justify-center');
            button.type = 'button';
            button.dataset.periodYear = String(delta);
            button.setAttribute('aria-label', label);
            button.disabled = !years[index + delta];
            return button;
        };
        const title = node('strong', menuYear, 'text-sm tabular-nums');
        title.id = 'period-menu-year';
        title.setAttribute('aria-live', 'polite');
        const head = node('div', null, 'flex items-center justify-between gap-2 px-2 pb-2');
        head.append(step(-1, 'Tahun sebelumnya', '‹'), title, step(1, 'Tahun berikutnya', '›'));
        const list = node('div', null, 'grid gap-0.5');
        list.setAttribute('role', 'group');
        list.setAttribute('aria-labelledby', 'period-menu-year');
        for (const cycle of s.data.cycles
            .filter((cycle) => cycle.id.startsWith(`${menuYear}-`))
            .sort((a, b) => b.id.localeCompare(a.id))) {
            const a = node(
                'a',
                `${labelCycle(cycle.id)} · ${CYCLE_STATUS[cycle.status]}`,
                `menu-item text-xs${cycle.id === selectedKey ? ' font-semibold' : ''}`,
            );
            const url = new URL(location.href);
            url.searchParams.set('cycle', cycle.id);
            url.searchParams.delete('month');
            a.href = url.href;
            a.dataset.cycleOption = cycle.id;
            if (cycle.id === selectedKey) a.setAttribute('aria-current', 'true');
            list.append(a);
        }
        if (!list.childElementCount)
            list.append(node('p', menuYear ? `Belum ada periode pada ${menuYear}.` : 'Periode belum dibuat oleh Super HC.', 'px-3 py-2 text-xs text-muted'));
        options.replaceChildren(head, list);
    }
    $('[data-cycle-options]')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-period-year]');
        if (!button) return;
        const delta = +button.dataset.periodYear,
            years = menuYears();
        menuYear = years[years.indexOf(menuYear) + delta] || menuYear;
        renderPeriodMenu();
        const same = $(`[data-cycle-options] [data-period-year="${delta}"]`);
        (same && !same.disabled ? same : $(`[data-cycle-options] [data-period-year="${-delta}"]`))?.focus();
    });
    // Reopening the menu starts again at the selected period's year.
    $('#period-dialog')?.addEventListener('close', () => {
        menuYear = String(selectedKey || '').slice(0, 4);
        renderPeriodMenu();
    });
    document.addEventListener('flow-period-selected', (event) => {
        const key = event.detail?.key;
        if (key && key !== selectedKey) {
            selectedKey = key;
            menuYear = key.slice(0, 4);
            renderPeriodLabels();
            // Shell navigation follows the period; links inside the page content keep their own targets.
            relink($$('a[href]').filter((a) => !a.closest('#main-content')));
        }
        renderPeriodMenu();
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
        renderPeriodLabels();
        renderPeriodMenu();
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
