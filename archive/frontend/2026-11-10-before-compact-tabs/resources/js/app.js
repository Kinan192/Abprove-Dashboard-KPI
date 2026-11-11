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
import { createApi } from './abprove/api';
import { initInsights } from './abprove/insights';

document.documentElement.dataset.brandAsset = markUrl;
const element = $('#kpi-config'),
    config = element ? JSON.parse(element.textContent) : null;
initUI(config);
initPanels();
initAudit();
async function start() {
    if (config) {
        if (!config.review) {
            config.api = createApi(config);
            const root = document.querySelector('main');
            root?.setAttribute('aria-busy', 'true');
            try {
                const cycle = new URLSearchParams(location.search).get('cycle');
                const result = await config.api.request(
                    '/data/workspace' +
                        (cycle ? '?cycle=' + encodeURIComponent(cycle) : ''),
                );
                config.workspace = result.data;
                config.selectedCycle = result.cycle;
                config.actor.key = result.actorId;
            } catch (e) {
                if (root) {
                    root.replaceChildren();
                    const panel = document.createElement('section');
                    panel.className = 'card m-6 p-6';
                    const message = document.createElement('p');
                    message.textContent = e.message;
                    message.setAttribute('role', 'alert');
                    const retry = document.createElement('button');
                    retry.className = 'btn mt-4';
                    retry.textContent = 'Coba kembali';
                    retry.onclick = () => location.reload();
                    panel.append(message, retry);
                    root.append(panel);
                }
                return;
            } finally {
                root?.removeAttribute('aria-busy');
            }
        }
        const store = createFlowStore(config);
        const link = initFlowRuntime(config, store);
        const assessments = initFlowAssessments(config, store, link);
        initOrganization(config, store, link);
        initKpi(config, store);
        initCycles(config, store);
        initFlowReports(config, store, assessments, link);
        initInsights(config, store, link);
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
                identifier = form.elements.identifier.value
                    .trim()
                    .toLowerCase(),
                password = form.elements.password.value;
            const account = accounts.find(
                (a) =>
                    a.email.toLowerCase() === identifier ||
                    a.nip === identifier,
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
}
start().catch((e) => toast(e.message, true));
