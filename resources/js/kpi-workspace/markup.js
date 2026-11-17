export const esc = (value) =>
    String(value ?? '').replace(
        /[&<>"']/g,
        (c) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[c],
    );
export const attrs = (values) =>
    Object.entries(values)
        .filter(([, v]) => v !== false && v != null)
        .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
        .join(' ');
/**
 * Select rows: `[value, label, disabled?]` or `{ id, name, disabled? }`; a
 * `{ group, options }` row renders a native `<optgroup>` of such rows.
 */
function optionsMarkup(rows, value) {
    return rows
        .map((row) => {
            if (row.group != null)
                return `<optgroup label="${esc(row.group)}">${optionsMarkup(row.options, value)}</optgroup>`;
            const [v, t, disabled] = Array.isArray(row) ? row : [row.id, row.name, row.disabled];
            return `<option ${attrs({ value: v, selected: String(v) === String(value), disabled: !!disabled })}>${esc(t)}</option>`;
        })
        .join('');
}
export function field(name, label, value = '', options = {}) {
    const id = `gp-field-${name}`,
        common = {
            id,
            name,
            class: 'field',
            required: options.required,
            disabled: options.disabled,
            'aria-describedby': `${options.help ? `${id}-help ` : ''}${id}-error`,
        };
    const control = options.options
        ? `<select ${attrs(common)}>${options.placeholder === false ? '' : `<option value="">${esc(options.placeholder || 'Pilih')}</option>`}${optionsMarkup(options.options, value)}</select>`
        : `<input ${attrs({ ...common, type: options.type || 'text', value, min: options.min, max: options.max, step: options.step, maxlength: options.maxlength, list: options.list, placeholder: options.placeholder, readonly: options.readonly, autocomplete: 'off' })}>`;
    return `<div class="gp-field ${options.wide ? 'gp-wide' : ''}"><label class="label" for="${id}">${esc(label)}${options.required ? '<span class="gp-required"> *</span>' : ''}</label>${control}${options.help ? `<small id="${id}-help" class="gp-help">${esc(options.help)}</small>` : ''}<p id="${id}-error" class="gp-field-error" data-gp-error="${esc(name)}" hidden></p></div>`;
}
export const note = (text, kind = '') =>
    `<p class="gp-note ${kind}" role="${kind === 'error' ? 'alert' : 'note'}">${esc(text)}</p>`;
export const tag = (label, kind = '') =>
    `<span class="gp-tag ${kind}">${esc(label)}</span>`;
export const empty = (title, help = '', action = '') =>
    `<div class="gp-empty"><strong>${esc(title)}</strong><p>${esc(help)}</p>${action ? `<div class="gp-empty-action">${action}</div>` : ''}</div>`;
export const num = (value, digits = 1) =>
    value == null
        ? '—'
        : Number(value).toLocaleString('id-ID', {
              maximumFractionDigits: digits,
          });
export const percent = (value) => `${num(value, 4)}%`;
export const date = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(`${value}${/[Z+]/.test(value) ? '' : '+07:00'}`))
        : '—';
/** Page heading; `eyebrow` names the current step of the KPI & Periode flow. */
export const heading = (title, subtitle, actions = '', eyebrow = '') =>
    `<header class="gp-heading"><div class="gp-heading-copy">${eyebrow ? `<span class="gp-eyebrow">${esc(eyebrow)}</span>` : ''}<h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${actions ? `<div class="gp-actions">${actions}</div>` : ''}</header>`;
/** Numbered form-section heading shared by the pattern, KPI and period forms. */
export const sectionHeading = (number, title, help = '') =>
    `<div class="fx-section-heading"><span aria-hidden="true">${number}</span><div><h2>${esc(title)}</h2>${help ? `<p>${esc(help)}</p>` : ''}</div></div>`;
export const button = (name, label, id = '', className = 'btn', disabled = false) =>
    `<button type="button" class="${className}" data-skp-action="${name}" data-id="${esc(id)}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
/** Table shell; rows are rendered by `paginate` into the tbody keyed by `data-skp-rows`. */
export const table = (key, headings, className = '') =>
    `<div class="table-wrap"><table class="data-table gp-table ${className}"><thead><tr>${headings.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody data-skp-rows="${esc(key)}"></tbody></table></div>`;
export function row(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}
export function errorFields(form, errors) {
    form.querySelectorAll('[data-gp-error]').forEach((el) => {
        const text = errors[el.dataset.gpError];
        el.textContent = text || '';
        el.hidden = !text;
    });
    form.querySelectorAll('input,select,textarea').forEach((el) => {
        if (errors[el.name]) el.setAttribute('aria-invalid', 'true');
        else el.removeAttribute('aria-invalid');
    });
    const first = Object.keys(errors).find((key) => form.elements[key]);
    if (first) form.elements[first].focus();
    else form.querySelector('[data-gp-error]:not([hidden])')?.scrollIntoView({ block: 'center' });
    return !Object.keys(errors).length;
}
