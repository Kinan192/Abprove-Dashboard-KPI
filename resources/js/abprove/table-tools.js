import { $, $$ } from './ui';

/*
 * Direct table filters: every [data-table-filters] group shows its selects
 * inline. Changing a select applies at once; the group marks non-default
 * fields and shows "Reset filter" with the active count. Hidden fields (for
 * example report controls of another tab) still count, because reset clears
 * every field in the group.
 */
const initialValue = (el) =>
    el.dataset.filterDefault ?? el.options[0]?.value ?? '';
function clearFilter(el) {
    const value = initialValue(el);
    if (el.value === value) return;
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function update() {
    for (const root of $$('[data-table-filters]')) {
        let count = 0;
        for (const el of $$('select', root)) {
            const active = el.value !== initialValue(el);
            el.closest('label')?.toggleAttribute('data-filter-active', active);
            if (active) count++;
        }
        const badge = $('[data-table-filter-count]', root),
            reset = $('[data-table-filter-reset]', root);
        if (badge && badge.textContent !== String(count))
            badge.textContent = count;
        if (reset) {
            reset.hidden = !count;
            reset.setAttribute(
                'aria-label',
                `Reset filter (${count} aktif)`,
            );
        }
    }
}
export function initTableTools() {
    document.addEventListener('change', update);
    document.addEventListener('flow-filtered', update);
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-table-filter-reset]');
        if (!button) return;
        const root = button.closest('[data-table-filters]');
        $$('select', root).forEach(clearFilter);
        update();
        // The reset button hides itself; keep keyboard focus inside the group.
        $$('select', root)
            .find((el) => !el.disabled && el.offsetParent)
            ?.focus();
    });
    new MutationObserver((records) => {
        if (
            records.some(
                (record) =>
                    record.target.closest?.('[data-table-filters]') ||
                    [...record.addedNodes].some(
                        (el) =>
                            el.matches?.('[data-table-filters]') ||
                            el.querySelector?.('[data-table-filters]'),
                    ),
            )
        )
            update();
    }).observe(document.body, { childList: true, subtree: true });
    update();
}
/** JS twin of <x-abprove.table-filters>: `fields` are `<label>Text<select>…</select></label>` items. */
export function filterMarkup(id, fields, title = 'Filter data') {
    return `<div class="table-filter-control" id="${id}" role="group" aria-label="${title}" data-table-filters>${fields}<button type="button" class="btn btn-ghost table-filter-reset" data-table-filter-reset hidden><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>Reset filter<span class="table-filter-count" data-table-filter-count>0</span></button></div>`;
}
