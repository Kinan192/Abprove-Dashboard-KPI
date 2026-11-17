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
    {
        token = '',
        kind = 'list',
        size,
        anchor,
        selector,
        records,
        renderRow,
        server,
    } = {},
) {
    if (!container) return;
    let state = lists.get(key);
    if (!state) {
        state = { page: 0, key };
        lists.set(key, state);
    }
    if (server) state.page = server.page - 1;
    else if (state.token !== token) state.page = 0;
    Object.assign(state, {
        container,
        token,
        kind,
        size,
        selector,
        records,
        renderRow,
        server,
    });
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
    state.isTable =
        container.tagName === 'TBODY' && !container.closest('.score-table');
    footer.toggleAttribute('data-table-pagination', state.isTable);
    const sizeWrap = $('[data-page-size-wrap]', footer);
    if (sizeWrap) sizeWrap.hidden = !state.isTable;
    if (state.isTable) {
        state.userSize = server?.perPage || state.userSize || 10;
        $('[data-page-size]', footer).value = String(state.userSize);
    }
    apply(state);
}
function apply(state) {
    const { container, footer } = state;
    if (!container.isConnected || !footer.isConnected) return;
    let rows = state.selector
        ? $$(state.selector, container)
        : [...container.children];
    const empty =
        rows.length === 1 &&
        (rows[0].matches('.empty') || rows[0].querySelector('td[colspan]'));
    const count = state.server
        ? state.server.total
        : state.records
          ? state.records.length
          : empty
            ? 0
            : rows.length;
    const size =
            (state.server
                ? state.server.perPage
                : state.isTable
                  ? state.userSize
                  : typeof state.size === 'function'
                    ? state.size()
                    : state.size) || pageSize(state.kind),
        pages = Math.max(1, Math.ceil(count / size));
    state.page = Math.max(0, Math.min(state.page, pages - 1));
    state.perPage = size;
    state.pages = pages;
    if (state.server) {
        // Server mode: records are the current page only; an empty page keeps the caller's empty row.
        if (state.records.length) {
            rows = state.records.map(state.renderRow);
            container.replaceChildren(...rows);
        }
    } else if (state.records) {
        if (count) {
            const start = state.page * size;
            rows = state.records
                .slice(start, start + size)
                .map(state.renderRow);
            container.replaceChildren(...rows);
        }
    } else {
        rows.forEach((row, index) => {
            row.hidden =
                !empty &&
                (index < state.page * size || index >= (state.page + 1) * size);
        });
    }
    state.rows = rows;
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
        if (state.records) continue;
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
    if (state?.server) state.server.onChange(1, state.perPage);
    else if (state) {
        state.page = 0;
        apply(state);
    }
}
/** Removes a list's footer and forgets its cached state; no-op for keys never paginated. */
export function clearPagination(key) {
    const state = lists.get(key);
    if (!state) return;
    state.footer?.remove();
    lists.delete(key);
}
document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-prev],[data-page-next]');
    if (!button) return;
    const footer = button.closest('[data-pagination]'),
        state = lists.get(footer?.dataset.pagination);
    if (!state) return;
    const step = button.hasAttribute('data-page-prev') ? -1 : 1;
    if (state.server) return state.server.onChange(state.page + 1 + step, state.perPage);
    state.page += step;
    apply(state);
});
document.addEventListener('change', (event) => {
    if (!event.target.matches('[data-page-size]')) return;
    const state = lists.get(
            event.target.closest('[data-pagination]')?.dataset.pagination,
        ),
        size = +event.target.value;
    if (!state || ![10, 25, 50].includes(size)) return;
    if (state.server) return state.server.onChange(1, size);
    state.userSize = size;
    state.page = 0;
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
            if (!isMobile && !dialog.open) {
                const previous = document.activeElement;
                dialog.show();
                if (previous === document.body) document.activeElement?.blur();
                else previous?.focus({ preventScroll: true });
            }
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
        $$('[data-panel-tab]', group)
            .filter((button) => button.closest('[data-panel-group]') === group)
            .forEach((button) => {
                const active = button.dataset.panelTab === tab.dataset.panelTab;
                button.setAttribute('aria-selected', String(active));
                button.classList.toggle('active', active);
                button.tabIndex = active ? 0 : -1;
            });
        $$('[data-panel]', group)
            .filter((panel) => panel.closest('[data-panel-group]') === group)
            .forEach(
                (panel) =>
                    (panel.hidden =
                        panel.dataset.panel !== tab.dataset.panelTab),
            );
        $$('[data-panel-context]', group)
            .filter(
                (element) => element.closest('[data-panel-group]') === group,
            )
            .forEach(
                (element) =>
                    (element.hidden = !element.dataset.panelContext
                        .split(',')
                        .includes(tab.dataset.panelTab)),
            );
        if (group.matches('.compact-workspace'))
            group.closest('main')?.scrollTo({ top: 0, behavior: 'auto' });
        window.dispatchEvent(new Event('resize'));
    });
    document.addEventListener('keydown', (event) => {
        const current = event.target.closest('[data-panel-tab][role=tab]');
        if (
            !current ||
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        )
            return;
        const group = current.closest('[data-panel-group]');
        if (!group) return;
        const tabs = $$('[data-panel-tab][role=tab]', group).filter(
            (tab) =>
                tab.closest('[data-panel-group]') === group && !tab.disabled,
        );
        const index =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (tabs.indexOf(current) +
                        (event.key === 'ArrowRight' ? 1 : -1) +
                        tabs.length) %
                    tabs.length;
        event.preventDefault();
        tabs[index]?.click();
        tabs[index]?.focus();
    });
    $$('[data-panel-group]').forEach((group, index) => {
        const panels = $$('[data-panel]', group).filter(
            (panel) => panel.closest('[data-panel-group]') === group,
        );
        $$('[data-panel-tab][role=tab]', group)
            .filter((tab) => tab.closest('[data-panel-group]') === group)
            .forEach((tab) => {
                const panel = panels.find(
                    (panel) => panel.dataset.panel === tab.dataset.panelTab,
                );
                if (!panel) return;
                tab.id ||= `workspace-tab-${index}-${tab.dataset.panelTab}`;
                panel.id ||= `workspace-panel-${index}-${panel.dataset.panel}`;
                tab.setAttribute('aria-controls', panel.id);
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', tab.id);
            });
    });
    $$('[data-default-panel]').forEach((group) => {
        let hashPanel;
        try {
            hashPanel = document
                .getElementById(decodeURIComponent(location.hash.slice(1)))
                ?.closest('[data-panel]');
        } catch {}
        const requested =
            new URLSearchParams(location.search).get('panel') ||
            (hashPanel?.closest('[data-panel-group]') === group
                ? hashPanel.dataset.panel
                : null) ||
            group.dataset.defaultPanel;
        const first = $$('[data-panel-tab]', group)
            .filter((button) => button.closest('[data-panel-group]') === group)
            .find((button) => button.dataset.panelTab === requested);
        if (first) first.click();
    });
}
