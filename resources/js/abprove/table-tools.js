import { $, $$ } from './ui';
import { node } from './flow-dom';

const initialValue = (el) =>
    el.dataset.filterDefault ?? el.options[0]?.value ?? '';
function clearFilter(el) {
    el.value = initialValue(el);
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function update() {
    $$('[data-table-filters]').forEach((root) => {
        const fields = $$('select', root),
            active = fields
                .map((el, index) => ({ el, index }))
                .filter(({ el }) => el.value !== initialValue(el)),
            count = active.length;
        const badge = $('[data-table-filter-count]', root);
        if (badge) {
            if (badge.textContent !== String(count)) badge.textContent = count;
            badge.hidden = !count;
        }
        const summary = $('[data-table-filter-summary]', root),
            countLabel = $('[data-table-filter-summary-count]', root);
        const countText = count ? `${count} kriteria` : 'Pengaturan awal';
        if (countLabel && countLabel.textContent !== countText)
            countLabel.textContent = countText;
        const signature = JSON.stringify(
            active.map(({ el, index }) => [
                index,
                el.value,
                el.selectedOptions[0]?.textContent,
            ]),
        );
        if (summary && root.filterSummarySignature !== signature) {
            root.filterSummarySignature = signature;
            summary.replaceChildren();
            for (const { el, index } of active) {
                const label =
                    [...(el.closest('label')?.childNodes || [])]
                        .filter((n) => n.nodeType === 3)
                        .map((n) => n.textContent.trim())
                        .join('') ||
                    el.getAttribute('aria-label') ||
                    'Kriteria';
                const value = el.selectedOptions[0]?.textContent || el.value,
                    button = node('button', null, 'table-filter-chip');
                button.type = 'button';
                button.dataset.tableFilterRemove = index;
                button.setAttribute(
                    'aria-label',
                    `Hapus filter ${label}: ${value}`,
                );
                button.append(
                    node('span', `${label}: ${value}`),
                    node('span', '×', 'table-filter-chip-close'),
                );
                summary.append(button);
            }
            if (!count)
                summary.append(
                    node(
                        'p',
                        'Belum ada filter tambahan.',
                        'table-filter-empty',
                    ),
                );
        }
    });
}
export function initTableTools() {
    document.addEventListener('change', update);
    document.addEventListener('flow-filtered', update);
    document.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-table-filter-remove]');
        if (chip) {
            const field = $$('select', chip.closest('[data-table-filters]'))[
                +chip.dataset.tableFilterRemove
            ];
            if (field) clearFilter(field);
            update();
            return;
        }
        const button = event.target.closest('[data-table-filter-reset]');
        if (!button) return;
        $$('select', button.closest('[data-table-filters]')).forEach((el) => {
            clearFilter(el);
        });
        update();
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
export function filterMarkup(id, fields, title = 'Filter data') {
    return `<div class="table-filter-control" data-table-filters><button type="button" class="btn" data-dialog-open="${id}" aria-haspopup="dialog">Filter <span class="table-filter-count" data-table-filter-count hidden>0</span></button><dialog id="${id}" class="modal-dialog table-filter-dialog" aria-labelledby="${id}-title"><div class="table-filter-shell"><header class="table-filter-header"><span class="table-filter-symbol"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6"/></svg></span><div><h2 id="${id}-title">${title}</h2><p>Tentukan cakupan dan kriteria data yang ingin dilihat.</p></div><button class="icon-button" type="button" data-dialog-close aria-label="Tutup filter">×</button></header><div class="dialog-body table-filter-body"><div class="table-filter-fields">${fields}</div><section class="table-filter-summary" aria-label="Ringkasan filter"><div><strong>Filter aktif</strong><span data-table-filter-summary-count>Pengaturan awal</span></div><div class="table-filter-chips" data-table-filter-summary><p>Belum ada filter tambahan.</p></div></section></div><footer class="dialog-footer table-filter-footer"><button class="btn btn-ghost" type="button" data-table-filter-reset>Reset filter</button><button class="btn btn-primary" type="button" data-dialog-close>Tampilkan hasil</button></footer></div></dialog></div>`;
}
