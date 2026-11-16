import { $, $$ } from '../abprove/ui';
import { node } from '../abprove/flow-dom';
import { paginate } from '../abprove/pagination';

/**
 * Server-paginated table: filters live in `root` as [data-filter] controls,
 * every change refetches one page from `endpoint` (Laravel paginator JSON).
 */
export function remoteTable({ api, root, endpoint, key, columns, renderRow, emptyText, onLoaded }) {
    const tbody = $('tbody', root);
    const state = { page: 1, perPage: 25 };
    let controller = null;
    let timer = null;

    function filters() {
        const params = new URLSearchParams({ page: state.page, per_page: state.perPage });
        for (const control of $$('[data-filter]', root))
            if (control.value) params.set(control.dataset.filter, control.value);
        return params;
    }

    function message(text) {
        const cell = node('td', text, 'empty text-sm');
        cell.colSpan = columns;
        const row = node('tr');
        row.append(cell);
        tbody.replaceChildren(row);
    }

    async function load() {
        controller?.abort();
        controller = new AbortController();
        tbody.setAttribute('aria-busy', 'true');
        try {
            const result = await api.request(`${endpoint}?${filters()}`, 'GET', null, { signal: controller.signal });
            if (!result.data.length) message(emptyText);
            paginate(tbody, key, {
                token: endpoint,
                records: result.data,
                renderRow,
                server: {
                    total: result.total,
                    page: result.current_page,
                    perPage: result.per_page,
                    onChange(page, perPage) {
                        state.page = page;
                        state.perPage = perPage;
                        load();
                    },
                },
            });
            onLoaded?.(result);
        } catch (error) {
            if (error.name !== 'AbortError') message(error.message);
        } finally {
            tbody.removeAttribute('aria-busy');
        }
    }

    root.addEventListener('input', (event) => {
        if (!event.target.matches('[data-filter]')) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.page = 1;
            load();
        }, event.target.type === 'search' ? 250 : 0);
    });

    return { load, reload: () => load() };
}
