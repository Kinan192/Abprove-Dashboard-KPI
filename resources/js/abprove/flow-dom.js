import { $, $$, number } from './ui';
export { $, $$, number };
export const text = (root, selector, value) => {
    const el = $(selector, root);
    if (el) el.textContent = value ?? '-';
};
export const clear = (root) => root?.replaceChildren();
export function node(tag, content, cls = '') {
    const n = document.createElement(tag);
    if (content != null) n.textContent = content;
    n.className = cls;
    return n;
}
export function optionList(
    select,
    rows,
    placeholder = 'Pilih',
    valueKey = 'id',
    labelKey = 'name',
) {
    if (!select) return;
    const old = select.value;
    select.replaceChildren(
        new Option(placeholder, ''),
        ...rows.map((row) => new Option(row[labelKey], row[valueKey])),
    );
    if (rows.some((r) => String(r[valueKey]) === old)) select.value = old;
}
export function clone(id, container) {
    const t = document.getElementById(id);
    if (!t) return null;
    const n = t.content.firstElementChild.cloneNode(true);
    container?.append(n);
    return n;
}
export const labelCycle = (key) =>
    new Date(`${key}-01T12:00:00+07:00`).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
    });
export const initials = (name = '') =>
    String(name)
        .replace(/^(drg?\.|apt\.|ns\.|prof\.|drs\.|dra\.)\s*/i, '')
        .split(',')[0]
        .split(/[ ,]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
export function status(el, value, label = null) {
    if (!el) return;
    el.dataset.status = value;
    el.classList.add('status', 'assessment-status');
    el.textContent = label ?? (value === 'Belum' ? 'Belum diisi' : value);
}
export const dateTime = (value) =>
    new Date(value.endsWith('Z') ? value : value + '+07:00').toLocaleString(
        'id-ID',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
        },
    );
export function field(form, name) {
    return form.elements.namedItem(name);
}
export function error(form, message) {
    let el = $('[data-form-error]', form);
    if (!el) {
        el = node('p', null, 'notice notice-error');
        el.dataset.formError = '';
        form.append(el);
    }
    el.textContent = message;
    el.hidden = false;
    el.setAttribute('role', 'alert');
}
export function empty(container, message) {
    container.append(node('p', message, 'empty text-sm'));
}
