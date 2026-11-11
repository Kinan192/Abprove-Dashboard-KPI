// Snapshot links belong to the audit surface, never to the product role menu.
const reviewScreen = ABPROVE_SCREENS.find(
    (s) => s.id === new URLSearchParams(location.search).get('screen'),
);
if (reviewScreen) {
    closeAll();
    UI.role = reviewScreen.role === 'login' ? null : reviewScreen.role;
    UI.view = reviewScreen.view;
    UI.navOpen = true;
    UI.month = AKTIF;
    UI.sel = reviewScreen.id === 'ku-score' ? 'E01' : null;
    UI.f = {};
    UI.tab = ['heads', 'head'].includes(reviewScreen.state)
        ? { kv: 'kepala' }
        : {};
    UI.theme =
        new URLSearchParams(location.search).get('theme') === 'dark'
            ? 'gelap'
            : 'terang';
    if (UI.role === 'ku')
        Object.assign(ACC.ku, { unit: 'UGD', nama: unitOf('UGD').kepala });
    if (UI.role === 'kd')
        Object.assign(ACC.kd, { div: 'YM', nama: divOf('YM').kepala });
    if (!UI.role) LG.v = reviewScreen.view;
    applyTheme();
    render();
    requestAnimationFrame(() => {
        if (reviewScreen.state === 'review') {
            const pending = scope().find(
                (e) => ev(e.id, AKTIF).status === 'Diajukan',
            );
            if (pending) openReview(pending.id, AKTIF, 'kd');
        }
        if (reviewScreen.state === 'export') openExport();
        if (reviewScreen.state === 'employee') empForm();
        if (reviewScreen.state === 'head') kuForm();
        if (reviewScreen.state === 'placement') openPz([]);
        document.body.dataset.reviewReady = 'true';
    });
} else document.body.dataset.reviewReady = 'true';

const skip = document.createElement('a');
skip.href = '#content';
skip.className = 'review-skip';
skip.textContent = 'Langsung ke konten';
document.body.prepend(skip);
let currentLayer = null,
    previousFocus = null,
    enhancementQueued = false;
const focusables = (el) =>
    [
        ...el.querySelectorAll(
            'a[href],button,input,select,textarea,[tabindex="0"]',
        ),
    ].filter(
        (e) =>
            !e.disabled &&
            e.getClientRects().length &&
            getComputedStyle(e).visibility !== 'hidden',
    );
const actionNames = {
    close: 'Tutup panel',
    burger: 'Buka atau ringkas navigasi',
    acct: 'Buka menu akun',
    notifPop: 'Buka notifikasi',
    period: 'Pilih periode',
    help: 'Buka panduan',
    step: 'Pindah karyawan',
    delKpi: 'Hapus KPI',
    pzRm: 'Hapus karyawan dari pilihan',
    pzAdd: 'Tambah KPI',
    pzDel: 'Hapus baris KPI',
    tourX: 'Tutup panduan',
};
function enhanceReview() {
    enhancementQueued = false;
    document.querySelectorAll('.shot-in').forEach((el) => {
        el.inert = true;
    });
    document.querySelectorAll('[data-act]').forEach((el) => {
        if (
            !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(
                el.tagName,
            ) &&
            !el.hasAttribute('tabindex')
        ) {
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
        }
        if (
            el.tagName === 'BUTTON' &&
            !el.textContent.trim() &&
            !el.hasAttribute('aria-label')
        ) {
            el.setAttribute(
                'aria-label',
                el.getAttribute('title') ||
                    actionNames[el.dataset.act] ||
                    'Buka pilihan',
            );
        }
    });
    const content = document.getElementById('content');
    if (content) {
        content.setAttribute('role', 'main');
        content.tabIndex = -1;
    }
    const layer =
        document.querySelector('#modal.on') ||
        document.querySelector('#drawer.on') ||
        document.querySelector('#menu.on') ||
        document.querySelector('.app.mob-open .side');
    const root = document.getElementById('root');
    root.inert = Boolean(layer && !root.contains(layer));
    document.querySelectorAll('#drawer,#modal,#menu').forEach((el) => {
        el.inert = Boolean(layer && el !== layer);
    });
    if (layer && layer !== currentLayer) {
        previousFocus = document.activeElement;
        layer.setAttribute('role', 'dialog');
        layer.setAttribute('aria-modal', 'true');
        layer.setAttribute(
            'aria-label',
            layer.querySelector('h2')?.textContent ||
                (layer.id === 'menu'
                    ? 'Menu akun dan navigasi'
                    : 'Navigasi utama'),
        );
        (focusables(layer)[0] || layer).focus({ preventScroll: true });
    }
    if (!layer && currentLayer && previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    currentLayer = layer;
}
new MutationObserver(() => {
    if (!enhancementQueued) {
        enhancementQueued = true;
        queueMicrotask(enhanceReview);
    }
}).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && currentLayer) {
        const items = focusables(currentLayer),
            first = items[0],
            last = items.at(-1);
        if (!items.length) {
            e.preventDefault();
            return;
        }
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
    if (
        ['Enter', ' '].includes(e.key) &&
        e.target.matches(
            '[data-act]:not(button):not(a):not(input):not(select):not(textarea)',
        )
    ) {
        e.preventDefault();
        e.target.click();
    }
});
enhanceReview();
