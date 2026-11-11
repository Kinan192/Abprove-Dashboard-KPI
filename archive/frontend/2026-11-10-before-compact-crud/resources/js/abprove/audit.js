import { $, $$ } from './ui';
export function initAudit() {
    const data = $('#audit-screens');
    if (!data) return;
    const screens = JSON.parse(data.textContent);
    let index = 0;
    const url = (screen) =>
        `/design-review/${screen.role}/${screen.view}${screen.state ? `?state=${screen.state}` : ''}`;
    function render() {
        const screen = screens[index];
        $('#audit-frame').src = url(screen);
        $('#audit-reference').src = `/design-reference/${screen.reference}`;
        $('#audit-open').href = url(screen);
        $('#audit-name').textContent =
            `${index + 1}/${screens.length} · ${screen.title}`;
        $$('[data-audit-screen]').forEach((b) => {
            b.setAttribute(
                'aria-current',
                b.dataset.auditScreen === screen.id ? 'page' : 'false',
            );
            b.classList.toggle(
                'bg-success-soft',
                b.dataset.auditScreen === screen.id,
            );
        });
    }
    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-audit-screen]');
        if (button) {
            index = screens.findIndex(
                (s) => s.id === button.dataset.auditScreen,
            );
            render();
        }
        const step = event.target.closest('[data-audit-step]');
        if (step) {
            index =
                (index + +step.dataset.auditStep + screens.length) %
                screens.length;
            render();
        }
        const mode = event.target.closest('[data-audit-mode]');
        if (mode) {
            $$('[data-audit-mode]').forEach((b) =>
                b.classList.toggle('active', b === mode),
            );
            $('#audit-frame-wrap').hidden =
                mode.dataset.auditMode === 'reference';
            $('#audit-reference-wrap').hidden =
                mode.dataset.auditMode === 'implementation';
        }
    });
    $('#audit-width')?.addEventListener('change', (event) => {
        $('#audit-frame').style.width = `${event.target.value}px`;
        $('#audit-frame').style.height =
            event.target.value === '390' ? '844px' : '900px';
    });
    render();
}
