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
        $('#audit-name').textContent = `${index + 1} / ${screens.length}`;
        $('#audit-screen').value = screen.id;
        fit();
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
            fit();
        }
    });
    $('#audit-width')?.addEventListener('change', (event) => {
        fit();
    });
    $('#audit-screen').addEventListener('change', (e) => {
        index = screens.findIndex((s) => s.id === e.target.value);
        render();
    });
    function fit() {
        const stage = $('.audit-stage'),
            both =
                !$('#audit-frame-wrap').hidden &&
                !$('#audit-reference-wrap').hidden;
        const width = +$('#audit-width').value,
            height = width === 390 ? 844 : width === 1024 ? 768 : 900;
        const frame = $('#audit-frame'),
            wrap = $('#audit-frame-wrap'),
            img = $('#audit-reference'),
            reference = $('#audit-reference-wrap');
        const availableWidth =
                (stage.clientWidth - (both ? 16 : 0)) / (both ? 2 : 1),
            availableHeight = stage.clientHeight;
        const scale = Math.min(
            1,
            availableWidth / width,
            availableHeight / height,
        );
        frame.style.width = width + 'px';
        frame.style.height = height + 'px';
        frame.style.transform = `scale(${scale})`;
        wrap.style.width = width * scale + 'px';
        wrap.style.height = height * scale + 'px';
        const ratio =
            img.naturalWidth && img.naturalHeight
                ? img.naturalWidth / img.naturalHeight
                : 1.6;
        const imageWidth = Math.min(availableWidth, availableHeight * ratio);
        reference.style.width = imageWidth + 'px';
        reference.style.height = imageWidth / ratio + 'px';
    }
    $('#audit-reference').addEventListener('load', fit);
    window.addEventListener('resize', fit);
    render();
}
