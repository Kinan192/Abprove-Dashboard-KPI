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
    item.className = `toast pointer-events-auto ${error ? 'text-link' : ''}`;
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
export function initUI(config) {
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
            document.documentElement.dataset.theme = theme.dataset.themeChoice;
            localStorage.setItem('abprove-theme', theme.dataset.themeChoice);
            $$('[data-theme-choice]').forEach((b) =>
                b.classList.toggle('active', b === theme),
            );
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (['sidebar-toggle', 'sidebar-close'].includes(action)) {
            const mobile = matchMedia('(max-width:900px)').matches;
            const className = mobile ? 'nav-open' : 'nav-collapsed';
            if (action === 'sidebar-close')
                document.body.classList.remove(className);
            else document.body.classList.toggle(className);
            const expanded = document.body.classList.contains('nav-open');
            $('#sidebar-scrim').hidden = !expanded;
            $('#app-main').inert = expanded;
            $('[data-action="sidebar-toggle"]').setAttribute(
                'aria-expanded',
                String(expanded),
            );
            if (expanded) $('#sidebar a').focus();
        }
        if (action === 'logout') {
            if (config?.review) location.assign('/design-review/login/masuk');
            else $('#logout-form')?.requestSubmit();
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
            $('#sidebar-scrim').hidden = true;
            $('#app-main').inert = false;
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
            'Opslag browser penuh. Perubahan bertahan selama halaman ini terbuka.',
            true,
        ),
    );
    matchMedia('(max-width:900px)').addEventListener('change', () => {
        document.body.classList.remove('nav-open');
        if ($('#sidebar-scrim')) $('#sidebar-scrim').hidden = true;
        if ($('#app-main')) $('#app-main').inert = false;
    });
}
