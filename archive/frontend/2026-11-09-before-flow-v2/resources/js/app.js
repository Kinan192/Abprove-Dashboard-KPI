import markUrl from '../images/abprove-mark.svg';
import { $, initUI, toast } from './abprove/ui';
import { createStore } from './abprove/store';
import { initAssessments } from './abprove/assessments';
import { initForms } from './abprove/forms';
import { initAnalytics } from './abprove/analytics';
import { initExports } from './abprove/exports';
import { initAudit } from './abprove/audit';

document.documentElement.dataset.brandAsset = markUrl;
const element = $('#kpi-config'),
    config = element ? JSON.parse(element.textContent) : null;
initUI(config);
initAudit();
if (config) {
    const store = createStore(config),
        assessments = initAssessments(config, store);
    initForms(config, store, assessments.sync);
    initAnalytics(config, store);
    initExports(config, store);
    document.documentElement.dataset.frontendReady = 'true';
} else {
    $('[data-local-form="forgot"]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        $('[data-forgot-form]').hidden = true;
        $('[data-forgot-sent]').hidden = false;
    });
    const form = $('[data-review-login]');
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const accounts = JSON.parse($('#review-accounts').textContent),
            identifier = form.elements.identifier.value.trim().toLowerCase(),
            password = form.elements.password.value;
        const account = accounts.find(
            (a) => a.email.toLowerCase() === identifier || a.nip === identifier,
        );
        const first = account?.nama
            .replace(/^(dr\.|apt\.|ns\.)\s*/i, '')
            .split(' ')[0];
        if (!account || password !== `${first}#2026`) {
            $('[data-login-error]').hidden = false;
            $('[data-login-error]').textContent =
                'Email/NIP atau kata sandi contoh tidak cocok.';
            return;
        }
        const button = $('[data-login-submit]');
        button.disabled = true;
        button.textContent = 'Membuka dashboard…';
        location.assign(
            `/design-review/${account.role}/beranda?account=${encodeURIComponent(account.key)}`,
        );
    });
    $('form[action$="/login"]:not([data-review-login])')?.addEventListener(
        'submit',
        () => {
            const button = $('[data-login-submit]');
            button.disabled = true;
            button.textContent = 'Memeriksa akun…';
        },
    );
    document.documentElement.dataset.frontendReady = 'true';
}
