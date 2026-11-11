import { node } from './flow-dom';

const instances = new WeakMap();
let sequence = 0;
function create(select) {
    const label = select.closest('label');
    const wrapper = node('div', null, 'searchable-select');
    const input = node('input', null, 'field');
    const menu = node('div', null, 'searchable-select-menu card');
    const list = node('div');
    const hint = node('p', null, 'searchable-select-hint text-xs text-muted');
    const id = `searchable-select-${++sequence}`;
    const required = select.required;
    const supportsPopover = typeof menu.showPopover === 'function';
    if (supportsPopover) menu.setAttribute('popover', 'manual');
    let active = -1,
        options = [];
    input.type = 'text';
    input.autocomplete = 'off';
    input.id = id;
    input.dataset.searchFor = select.name;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id + '-options');
    input.setAttribute(
        'aria-label',
        label.querySelector('.label').textContent.trim(),
    );
    list.id = id + '-options';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', input.getAttribute('aria-label'));
    hint.setAttribute('role', 'status');
    menu.append(list, hint);
    menu.hidden = true;
    select.before(wrapper);
    wrapper.append(input, menu, select);
    label.htmlFor = id;
    select.required = false;
    select.dataset.searchableNative = '';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    function close() {
        if (supportsPopover && menu.matches(':popover-open'))
            menu.hidePopover();
        menu.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        active = -1;
    }
    function sync() {
        input.setAttribute(
            'aria-label',
            label.querySelector('.label').textContent.trim(),
        );
        input.disabled = select.disabled;
        input.required = required && !select.disabled;
        input.placeholder = select.options[0]?.textContent || 'Cari dan pilih';
        input.value = select.value
            ? select.selectedOptions[0]?.textContent || ''
            : '';
        input.setCustomValidity('');
        close();
    }
    function choose(option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
        input.focus();
    }
    function highlight(index) {
        active = index;
        [...list.children].forEach((el, i) => {
            el.classList.toggle('active', i === active);
            el.setAttribute('aria-selected', String(i === active));
        });
        if (list.children[active]) {
            input.setAttribute(
                'aria-activedescendant',
                list.children[active].id,
            );
            list.children[active].scrollIntoView({ block: 'nearest' });
        }
    }
    function show(search = '') {
        if (select.disabled) return;
        const matches = [...select.options].filter(
            (o) =>
                o.value &&
                !o.disabled &&
                o.textContent
                    .toLocaleLowerCase('id')
                    .includes(search.trim().toLocaleLowerCase('id')),
        );
        options = matches.slice(0, 10);
        list.replaceChildren();
        options.forEach((option, index) => {
            const item = node(
                'div',
                option.textContent,
                'searchable-select-option',
            );
            item.id = `${id}-option-${index}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', 'false');
            item.addEventListener('pointerdown', (event) =>
                event.preventDefault(),
            );
            item.addEventListener('click', (event) => {
                event.preventDefault();
                choose(option);
            });
            list.append(item);
        });
        hint.textContent = !matches.length
            ? 'Tidak ada pilihan yang sesuai.'
            : matches.length > 10
              ? `10 dari ${matches.length} pilihan. Ketik lebih spesifik untuk mempersempit hasil.`
              : `${matches.length} pilihan. Pilih hasil atau gunakan tombol panah dan Enter.`;
        menu.hidden = false;
        if (supportsPopover) {
            const bounds = input.getBoundingClientRect();
            const below = innerHeight - bounds.bottom - 12;
            const above = bounds.top - 12;
            const upwards = below < 240 && above > below;
            const height = Math.max(80, Math.min(300, upwards ? above : below));
            Object.assign(menu.style, {
                left: bounds.left + 'px',
                width: bounds.width + 'px',
                maxHeight: height + 'px',
                top: 'auto',
                bottom: 'auto',
            });
            if (upwards)
                menu.style.bottom = innerHeight - bounds.top + 4 + 'px';
            else menu.style.top = bounds.bottom + 4 + 'px';
            if (!menu.matches(':popover-open')) menu.showPopover();
        }
        input.setAttribute('aria-expanded', 'true');
        highlight(-1);
    }
    input.addEventListener('focus', () => {
        show();
        input.select();
    });
    input.addEventListener('click', () => {
        if (menu.hidden) show();
    });
    input.addEventListener('input', () => {
        select.value = '';
        input.setCustomValidity(
            input.value ? 'Pilih salah satu hasil pencarian.' : '',
        );
        select.dispatchEvent(new Event('change', { bubbles: true }));
        show(input.value);
    });
    input.addEventListener('keydown', (event) => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            if (menu.hidden) show(input.value);
            if (options.length)
                highlight(
                    active === -1
                        ? event.key === 'ArrowDown'
                            ? 0
                            : options.length - 1
                        : (active +
                              (event.key === 'ArrowDown' ? 1 : -1) +
                              options.length) %
                              options.length,
                );
        } else if (event.key === 'Enter' && !menu.hidden) {
            event.preventDefault();
            if (options[active]) choose(options[active]);
        } else if (event.key === 'Escape' && !menu.hidden) {
            event.preventDefault();
            event.stopPropagation();
            close();
        } else if (event.key === 'Tab') close();
    });
    input.addEventListener('blur', close);
    select.addEventListener('change', (event) => {
        if (event.isTrusted || select.value) sync();
    });
    select.form?.addEventListener('reset', () => queueMicrotask(sync));
    document.addEventListener('pointerdown', (event) => {
        if (!wrapper.contains(event.target)) close();
    });
    document.addEventListener(
        'scroll',
        (event) => {
            if (!menu.contains(event.target)) close();
        },
        true,
    );
    window.addEventListener('resize', close);
    return { sync };
}
export function syncSearchableSelects(root = document) {
    root.querySelectorAll('select[data-searchable]').forEach((select) => {
        if (!instances.has(select)) instances.set(select, create(select));
        instances.get(select).sync();
    });
}
