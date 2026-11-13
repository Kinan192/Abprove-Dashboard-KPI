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
export const btn = (action, label, options = {}) =>
    `<button ${attrs({ type: 'button', class: `btn ${options.primary ? 'btn-primary' : options.ghost ? 'btn-ghost' : ''}`, 'data-gp-action': action, 'data-id': options.id, disabled: options.disabled, title: options.title })}>${esc(label)}</button>`;
export function field(name, label, value = '', options = {}) {
    const id = `gp-field-${name}`,
        common = {
            id,
            name,
            class: 'field',
            required: options.required,
            'aria-describedby': `${id}-error`,
            ...options.attributes,
        };
    const control = options.options
        ? `<select ${attrs(common)}>${options.placeholder === false ? '' : `<option value="">${esc(options.placeholder || 'Pilih')}</option>`}${options.options
              .map((row) => {
                  const [v, t] = Array.isArray(row) ? row : [row.id, row.name];
                  return `<option ${attrs({ value: v, selected: String(v) === String(value), disabled: row.disabled })}>${esc(t)}</option>`;
              })
              .join('')}</select>`
        : options.textarea
          ? `<textarea ${attrs({ ...common, rows: options.rows || 3, maxlength: options.max })}>${esc(value)}</textarea>`
          : `<input ${attrs({ ...common, type: options.type || 'text', value, min: options.min, max: options.max, step: options.step, maxlength: options.maxlength, list: options.list, readonly: options.readonly, disabled: options.disabled, autocomplete: 'off' })}>`;
    return `<div class="gp-field ${options.wide ? 'gp-wide' : ''}"><label class="label" for="${id}">${esc(label)}${options.required ? '<span class="gp-required"> *</span>' : ''}</label>${control}${options.help ? `<small class="gp-help">${esc(options.help)}</small>` : ''}<p id="${id}-error" class="gp-field-error" data-gp-error="${esc(name)}" hidden></p></div>`;
}
export const check = (name, label, checked = false, help = '') =>
    `<label class="gp-check"><input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''}><span><strong>${esc(label)}</strong>${help ? `<small>${esc(help)}</small>` : ''}</span></label>`;
export const note = (text, kind = '') =>
    `<p class="gp-note ${kind}" role="${kind === 'error' ? 'alert' : 'note'}">${esc(text)}</p>`;
export const tag = (label, kind = '') =>
    `<span class="gp-tag ${kind}">${esc(label)}</span>`;
export const empty = (title, help = '') =>
    `<div class="gp-empty"><strong>${esc(title)}</strong><p>${esc(help)}</p></div>`;
export const num = (value, digits = 1) =>
    value == null
        ? '—'
        : Number(value).toLocaleString('id-ID', {
              maximumFractionDigits: digits,
          });
export const moneyUnit = (unit) =>
    ({ percent: '%', number: 'Angka', idr: 'Rp' })[unit] || '';
export const date = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              ...(value.includes('T')
                  ? { hour: '2-digit', minute: '2-digit' }
                  : {}),
              timeZone: 'Asia/Jakarta',
          }).format(
              new Date(
                  value.includes('T')
                      ? `${value}${/[Z+]/.test(value) ? '' : '+07:00'}`
                      : `${value}T12:00:00+07:00`,
              ),
          )
        : '—';
export const definition = (rows) =>
    `<dl class="gp-definitions">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
export function steps(labels, current) {
    return `<ol class="gp-steps" aria-label="Tahapan form">${labels.map((label, i) => `<li ${current === i ? 'aria-current="step"' : ''} class="${i < current ? 'done' : ''}"><span>${i + 1}</span>${esc(label)}</li>`).join('')}</ol>`;
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
    return !Object.keys(errors).length;
}
