export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
];
export const number = (value) =>
    value == null
        ? '-'
        : Number(value).toLocaleString('id-ID', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          });
export function toast(message, error = false) {
    const item = document.createElement('div');
    item.className = `toast ${error ? 'toast-error' : ''}`;
    item.textContent = message;
    item.setAttribute('role', error ? 'alert' : 'status');
    $('#toast-stack')?.append(item);
    setTimeout(() => item.remove(), 6000);
}
export function open(id) {
    const dialog = document.getElementById(id);
    if (dialog && !dialog.open) dialog.showModal();
    return dialog;
}
export function close(id) {
    document.getElementById(id)?.close();
}
export function confirm(
    message,
    { reason = false, label = 'Konfirmasi' } = {},
) {
    const dialog = $('#confirm-dialog');
    if (!dialog) return Promise.resolve(false);
    $('[data-confirm-message]', dialog).textContent = message;
    $('[data-confirm-reason-wrap]', dialog).hidden = !reason;
    $('[data-confirm-reason]', dialog).value = '';
    $('[data-confirm-error]', dialog).hidden = true;
    const submit = $('[data-action="confirm-submit"]', dialog);
    submit.textContent = label;
    return new Promise((resolve) => {
        function click() {
            const text = $('[data-confirm-reason]', dialog).value.trim();
            if (reason && !text) {
                const error = $('[data-confirm-error]', dialog);
                error.textContent = 'Alasan pengembalian wajib diisi.';
                error.hidden = false;
                $('[data-confirm-reason]', dialog).focus();
                return;
            }
            submit.removeEventListener('click', click);
            dialog.close('confirmed');
            resolve(reason ? text : true);
        }
        submit.addEventListener('click', click);
        dialog.addEventListener(
            'close',
            () => {
                submit.removeEventListener('click', click);
                if (dialog.returnValue !== 'confirmed') resolve(false);
            },
            { once: true },
        );
        dialog.returnValue = '';
        open('confirm-dialog');
    });
}
export function initUI() {
    document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-dialog-open]');
        if (opener) {
            if (opener.dataset.exportPerson) {
                const select = $('[data-export-scope]');
                if (select) {
                    select.value = `person:${opener.dataset.exportPerson}`;
                    select.dispatchEvent(new Event('change'));
                }
            }
            const parent = opener.closest('dialog');
            if (parent && parent.id !== opener.dataset.dialogOpen)
                parent.close();
            open(opener.dataset.dialogOpen);
        }
        if (event.target.closest('[data-dialog-close]'))
            event.target.closest('dialog')?.close();
        const toggle = event.target.closest('[data-password-toggle]');
        if (toggle) {
            const field = document.getElementById(
                toggle.dataset.passwordToggle,
            );
            field.type = field.type === 'password' ? 'text' : 'password';
            toggle.setAttribute(
                'aria-label',
                field.type === 'password'
                    ? 'Tampilkan kata sandi'
                    : 'Sembunyikan kata sandi',
            );
        }
        if (event.target.closest('[data-password-toggle-all]'))
            $$('[data-local-form="password"] input').forEach(
                (input) =>
                    (input.type =
                        input.type === 'password' ? 'text' : 'password'),
            );
        const theme = event.target.closest('[data-theme-choice]');
        if (theme) {
            try {
                localStorage.setItem(THEME_KEY, theme.dataset.themeChoice);
            } catch {}
            applyTheme(theme.dataset.themeChoice);
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (['sidebar-toggle', 'sidebar-close'].includes(action)) {
            const className = matchMedia(MOBILE_NAV).matches
                ? 'nav-open'
                : 'nav-collapsed';
            if (action === 'sidebar-close')
                document.body.classList.remove(className);
            else document.body.classList.toggle(className);
            syncSidebar();
            if (document.body.classList.contains('nav-open'))
                $('#sidebar a').focus();
        }
        if (action === 'logout') {
            $('#logout-form')?.requestSubmit();
        }
        if (action === 'read-all') {
            $$('[data-notification-count]').forEach((e) => (e.hidden = true));
            toast('Notifikasi contoh ditandai sudah dibaca.');
        }
        const period = event.target.closest('[data-period]');
        if (period) {
            const url = new URL(location.href);
            url.searchParams.set('month', period.dataset.period);
            location.assign(url);
        }
    });
    $$('dialog').forEach((dialog) =>
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) {
                const r = dialog.getBoundingClientRect();
                if (
                    event.clientX < r.left ||
                    event.clientX > r.right ||
                    event.clientY < r.top ||
                    event.clientY > r.bottom
                )
                    dialog.close();
            }
        }),
    );
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const dialog =
                document.activeElement?.closest('dialog[open]') ||
                $$('dialog[open]').at(-1);
            if (dialog) {
                event.preventDefault();
                dialog.close();
                return;
            }
        }
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === 'k' &&
            $('#search-dialog')
        ) {
            event.preventDefault();
            open('search-dialog');
        }
        if (
            event.key === 'Escape' &&
            document.body.classList.contains('nav-open')
        ) {
            document.body.classList.remove('nav-open');
            syncSidebar();
            $$('[data-action="sidebar-toggle"]')
                .find((button) => button.getClientRects().length)
                ?.focus();
        }
        if (
            event.key === 'Tab' &&
            document.body.classList.contains('nav-open')
        ) {
            const links = $$('a,button', $('#sidebar'));
            if (event.shiftKey && document.activeElement === links[0]) {
                event.preventDefault();
                links.at(-1).focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === links.at(-1)
            ) {
                event.preventDefault();
                links[0].focus();
            }
        }
    });
    $('[data-global-search]')?.addEventListener('input', (event) => {
        const q = event.target.value.toLowerCase();
        const results = $$('[data-search-result]');
        results.forEach(
            (e) => (e.hidden = !e.textContent.toLowerCase().includes(q)),
        );
        $('[data-search-empty]').hidden = results.some((e) => !e.hidden);
    });
    window.addEventListener('storage-error', () =>
        toast(
            'Penyimpanan browser penuh. Perubahan hanya bertahan selama halaman ini terbuka.',
            true,
        ),
    );
    matchMedia(MOBILE_NAV).addEventListener('change', () => {
        document.body.classList.remove('nav-open');
        syncSidebar();
    });
    matchMedia(DARK_SCHEME).addEventListener('change', () => {
        if (document.documentElement.dataset.themeMode === 'system')
            applyTheme('system');
    });
    syncSidebar();
    applyTheme(document.documentElement.dataset.themeMode);
}
const MOBILE_NAV = '(max-width:900px)';
const THEME_KEY = 'abprove-theme';
const THEME_MODES = ['system', 'light', 'dark'];
const DARK_SCHEME = '(prefers-color-scheme: dark)';
/** Mirrors the drawer (mobile) or rail (desktop) state onto every toggle. */
function syncSidebar() {
    if (!$('#sidebar')) return;
    const mobile = matchMedia(MOBILE_NAV).matches,
        open = mobile && document.body.classList.contains('nav-open'),
        expanded = mobile
            ? open
            : !document.body.classList.contains('nav-collapsed');
    $('#sidebar-scrim').hidden = !open;
    $('#app-main').inert = open;
    $$('[data-action="sidebar-toggle"]').forEach((button) =>
        button.setAttribute('aria-expanded', String(expanded)),
    );
}
/**
 * Stores the chosen mode (system/light/dark) on data-theme-mode and resolves
 * data-theme to light/dark, which every stylesheet and chart observer reads.
 */
function applyTheme(mode) {
    const root = document.documentElement,
        preference = THEME_MODES.includes(mode) ? mode : 'light',
        resolved =
            preference === 'system'
                ? matchMedia(DARK_SCHEME).matches
                    ? 'dark'
                    : 'light'
                : preference;
    root.dataset.themeMode = preference;
    if (root.dataset.theme !== resolved) root.dataset.theme = resolved;
    $$('[data-theme-choice]').forEach((button) => {
        const selected = button.dataset.themeChoice === preference;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
}
