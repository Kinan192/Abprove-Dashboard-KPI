import { initPanels } from './abprove/pagination';
import markUrl from '../images/abprove-mark.svg';
import { $, initUI, toast } from './abprove/ui';
import { createFlowStore } from './abprove/flow-store';
import { initFlowRuntime } from './abprove/flow-runtime';
import { initOrganization } from './abprove/flow-org';
import { initKpi, initCycles } from './abprove/flow-kpi';
import { initFlowAssessments } from './abprove/flow-assessments';

import { initFlowReports } from './abprove/flow-reports';
import { initAudit } from './abprove/audit';

document.documentElement.dataset.brandAsset = markUrl;
const element = $('#kpi-config'),
    config = element ? JSON.parse(element.textContent) : null;
initUI(config);
initPanels();
initAudit();
if (config) {
    const store = createFlowStore(config);
    const link = initFlowRuntime(config, store);
    const assessments = initFlowAssessments(config, store, link);
    initOrganization(config, store, link);
    initKpi(config, store);
    initCycles(config, store);
    initFlowReports(config, store, assessments, link);
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
