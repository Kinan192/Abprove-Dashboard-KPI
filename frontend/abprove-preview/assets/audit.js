const roleSelect = document.getElementById('audit-role'),
    screenSelect = document.getElementById('audit-screen'),
    sizeSelect = document.getElementById('audit-size');
const frame = document.getElementById('audit-preview'),
    comparison = document.querySelector('.comparison');
Object.entries(ABPROVE_ROLES).forEach(([key, title]) =>
    roleSelect.add(new Option(title, key)),
);
const requested = new URLSearchParams(location.search).get('screen');
let selected =
    ABPROVE_SCREENS.find((s) => s.id === requested) || ABPROVE_SCREENS[0];
roleSelect.value = selected.role;
function fillScreens() {
    screenSelect.replaceChildren();
    ABPROVE_SCREENS.filter((s) => s.role === roleSelect.value).forEach((s) =>
        screenSelect.add(new Option(s.title, s.id)),
    );
    if (selected.role === roleSelect.value) screenSelect.value = selected.id;
}
function resize() {
    const width = Number(sizeSelect.value),
        height = width === 390 ? 844 : 900;
    const stage = document.querySelector('.preview-stage'),
        canvas = document.querySelector('.frame-canvas');
    const available = stage.clientWidth - 24;
    const scale = Math.min(1, Math.max(0.1, available / width));
    frame.width = String(width);
    frame.height = String(height);
    frame.style.width = width + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = `scale(${scale})`;
    canvas.style.width = width * scale + 'px';
    canvas.style.height = height * scale + 'px';
    document.getElementById('audit-dimensions').textContent =
        width + ' × ' + height;
}
function show() {
    selected = ABPROVE_SCREENS.find((s) => s.id === screenSelect.value);
    const href = 'index.html?screen=' + selected.id;
    frame.src = href;
    document.getElementById('audit-open').href = href;
    const reference = 'reference/' + selected.reference;
    document.getElementById('audit-reference').src = reference;
    document.getElementById('audit-reference').alt =
        ABPROVE_ROLES[selected.role] + ' · ' + selected.title;
    document.getElementById('audit-image-open').href = reference;
    const index = ABPROVE_SCREENS.indexOf(selected);
    document.getElementById('audit-prev').disabled = index === 0;
    document.getElementById('audit-next').disabled =
        index === ABPROVE_SCREENS.length - 1;
    document.getElementById('audit-counter').textContent =
        `Layar ${index + 1} dari ${ABPROVE_SCREENS.length} · ${ABPROVE_ROLES[selected.role]} · ${selected.title}`;
    history.replaceState(null, '', '?screen=' + selected.id);
    resize();
}
function move(delta) {
    const next = ABPROVE_SCREENS[ABPROVE_SCREENS.indexOf(selected) + delta];
    if (!next) return;
    selected = next;
    roleSelect.value = next.role;
    fillScreens();
    screenSelect.value = next.id;
    show();
}
roleSelect.addEventListener('change', () => {
    fillScreens();
    show();
});
screenSelect.addEventListener('change', show);
sizeSelect.addEventListener('change', resize);
document.getElementById('audit-prev').onclick = () => move(-1);
document.getElementById('audit-next').onclick = () => move(1);
document.querySelectorAll('[data-mode]').forEach((button) => {
    if (button.tagName !== 'BUTTON') return;
    button.onclick = () => {
        document
            .querySelectorAll('.review-tabs button')
            .forEach((b) =>
                b.setAttribute('aria-selected', String(b === button)),
            );
        comparison.dataset.mode = button.dataset.mode;
        resize();
    };
});
new ResizeObserver(resize).observe(document.querySelector('.preview-stage'));
fillScreens();
show();
