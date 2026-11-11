import { $, $$ } from './ui';

const lists = new Map();
export function pageSize(kind = 'list') {
    const phone = innerWidth <= 600;
    if (kind === 'kpi') return 5;
    if (kind === 'score') return phone ? 1 : 5;
    if (kind === 'rail') return phone ? 1 : innerHeight < 800 ? 5 : 7;
    if (kind === 'small') return phone ? 3 : 5;
    return 10;
}
export function paginate(
    container,
    key,
    { token = '', kind = 'list', size, anchor, selector } = {},
) {
    if (!container) return;
    let state = lists.get(key);
    if (!state) {
        state = { page: 0, key };
        lists.set(key, state);
    }
    if (state.token !== token) state.page = 0;
    Object.assign(state, { container, token, kind, size, selector });
    let footer = document.querySelector(`[data-pagination="${key}"]`);
    if (!footer) {
        const template = $('#flow-pagination');
        if (!template) return;
        footer = template.content.firstElementChild.cloneNode(true);
        footer.dataset.pagination = key;
        const host = anchor || container.closest('.table-wrap') || container;
        host.after(footer);
    }
    state.footer = footer;
    apply(state);
}
function apply(state) {
    const { container, footer } = state;
    if (!container.isConnected || !footer.isConnected) return;
    const rows = state.selector
        ? $$(state.selector, container)
        : [...container.children];
    const empty =
        rows.length === 1 &&
        (rows[0].matches('.empty') || rows[0].querySelector('td[colspan]'));
    const count = empty ? 0 : rows.length;
    const size =
            (typeof state.size === 'function' ? state.size() : state.size) ||
            pageSize(state.kind),
        pages = Math.max(1, Math.ceil(count / size));
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    state.rows = rows;
    state.perPage = size;
    state.pages = pages;
    rows.forEach((row, index) => {
        row.hidden =
            !empty &&
            (index < state.page * size || index >= (state.page + 1) * size);
    });
    if (container.tagName === 'TBODY') {
        const headings = $$('thead th', container.closest('table')).map((el) =>
            el.textContent.trim(),
        );
        rows.forEach((row) =>
            [...row.children].forEach((cell, i) => {
                if (
                    cell.tagName === 'TD' &&
                    cell.colSpan <= 1 &&
                    !cell.dataset.label
                )
                    cell.dataset.label = headings[i] || '';
            }),
        );
    }
    $('[data-page-summary]', footer).textContent = count
        ? `${state.page * size + 1}-${Math.min((state.page + 1) * size, count)} dari ${count}`
        : '0 data';
    $('[data-page-label]', footer).textContent = `${state.page + 1} / ${pages}`;
    $('[data-page-prev]', footer).disabled = state.page === 0;
    $('[data-page-next]', footer).disabled = state.page >= pages - 1;
    footer.setAttribute('aria-label', `Pagination ${state.key}`);
    footer.dataset.page = state.page + 1;
    document.dispatchEvent(
        new CustomEvent('pagination-updated', { detail: { key: state.key } }),
    );
}
export function reveal(element) {
    for (const state of lists.values()) {
        const index = state.rows?.findIndex(
            (row) => row === element || row.contains(element),
        );
        if (index >= 0) {
            state.page = Math.floor(index / state.perPage);
            apply(state);
        }
    }
}
export function resetPage(key) {
    const state = lists.get(key);
    if (state) {
        state.page = 0;
        apply(state);
    }
}
document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-prev],[data-page-next]');
    if (!button) return;
    const footer = button.closest('[data-pagination]'),
        state = lists.get(footer?.dataset.pagination);
    if (!state) return;
    state.page += button.hasAttribute('data-page-prev') ? -1 : 1;
    apply(state);
});
let resize;
window.addEventListener('resize', () => {
    clearTimeout(resize);
    resize = setTimeout(() => lists.forEach(apply), 100);
});

export function initPanels() {
    let homeTab = 'overview',
        mobile = innerWidth <= 600;
    function responsive() {
        const isMobile = innerWidth <= 600;
        $$('[data-responsive-dialog]').forEach((dialog) => {
            if (isMobile && dialog.open && !mobile) dialog.close();
            if (!isMobile && !dialog.open) dialog.show();
        });
        mobile = isMobile;
        $$('[data-home-panel]').forEach(
            (panel) =>
                (panel.hidden = mobile && panel.dataset.homePanel !== homeTab),
        );
    }
    responsive();
    window.addEventListener('resize', responsive);
    document.addEventListener('click', (event) => {
        const home = event.target.closest('[data-home-tab]');
        if (home) {
            homeTab = home.dataset.homeTab;
            $$('[data-home-tab]').forEach((b) => {
                b.classList.toggle('active', b === home);
                b.setAttribute('aria-selected', String(b === home));
            });
            responsive();
        }
        const tab = event.target.closest('[data-panel-tab]');
        if (!tab) return;
        const group = tab.closest('[data-panel-group]');
        if (!group) return;
        $$('[data-panel-tab]', group).forEach((button) => {
            const active = button.dataset.panelTab === tab.dataset.panelTab;
            button.setAttribute('aria-selected', String(active));
            button.classList.toggle('active', active);
        });
        $$('[data-panel]', group).forEach(
            (panel) =>
                (panel.hidden = panel.dataset.panel !== tab.dataset.panelTab),
        );
        window.dispatchEvent(new Event('resize'));
    });
    $$('[data-default-panel]').forEach((group) => {
        const requested =
            new URLSearchParams(location.search).get('panel') ||
            group.dataset.defaultPanel;
        const first = $$('[data-panel-tab]', group).find(
            (button) => button.dataset.panelTab === requested,
        );
        if (first) first.click();
    });
}
