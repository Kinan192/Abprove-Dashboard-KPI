import { initPanels } from './abprove/pagination';
import { initTableTools } from './abprove/table-tools';
import markUrl from '../images/abprove-mark.svg';
import { $, initUI, toast } from './abprove/ui';
import { createFlowStore } from './abprove/flow-store';
import { initFlowRuntime } from './abprove/flow-runtime';
import { initFlowAssessments } from './abprove/flow-assessments';

import { initFlowReports } from './abprove/flow-reports';
import { createApi } from './abprove/api';

if (document.body.hasAttribute('data-app-shell'))
    window.addEventListener(
        'scroll',
        () => {
            if (window.scrollY !== 0) window.scrollTo(0, 0);
        },
        { passive: true },
    );

document.documentElement.dataset.brandAsset = markUrl;
const element = $('#kpi-config'),
    config = element ? JSON.parse(element.textContent) : null;
let activeStore;
if (config && !config.review) {
    window.addEventListener('pagehide', (event) => {
        if (event.persisted)
            document.documentElement.dataset.restoringSession = 'true';
    });
    window.addEventListener('pageshow', async (event) => {
        if (!event.persisted) return;
        document.documentElement.dataset.restoringSession = 'true';
        if (!activeStore) {
            location.reload();
            return;
        }
        try {
            const reportReady = $('[data-insights-root]')
                ? new Promise((resolve) =>
                      document.addEventListener('insights-ready', resolve, {
                          once: true,
                      }),
                  )
                : Promise.resolve();
            await activeStore.refresh({ force: true });
            await reportReady;
            if (document.documentElement.dataset.insightsReady === 'error')
                throw new Error('Laporan belum dapat dimuat.');
            delete document.documentElement.dataset.restoringSession;
        } catch {
            location.replace('/login');
        }
    });
}
initUI(config);
initPanels();
initTableTools();
if ($('#audit-screens'))
    import('./abprove/audit').then(({ initAudit }) => initAudit());
async function start() {
    if (config) {
        const features = Promise.all([
            $('[data-org-body],[data-flow-activities],#transfer-form')
                ? import('./abprove/flow-org')
                : null,
            $('[data-kpi-editor],#cycle-form,[data-kpi-import]')
                ? import('./abprove/flow-kpi')
                : null,
            $('[data-insights-root]') ? import('./abprove/insights') : null,
            $('[data-goal-prototype]')
                ? import('./design-review/kpi-periode/index.js')
                : null,
        ]);
        if (!config.review) {
            config.api = createApi(config);
            const root = document.querySelector('main');
            root?.setAttribute('aria-busy', 'true');
            try {
                const cycle = new URLSearchParams(location.search).get('cycle');
                const query = new URLSearchParams({
                    compact: '1',
                    page: config.page,
                });
                if (cycle) query.set('cycle', cycle);
                if (config.kpiWorkspace)
                    for (const key of ['accounts', 'positions', 'divisions', 'units', 'staff', 'heads', 'cycles', 'profiles', 'notifications'])
                        query.append('only[]', key);
                if (config.api.reportRequested())
                    query.set('include_insights', '1');
                const [result] = await Promise.all([
                    config.api.request('/data/workspace?' + query),
                    features,
                ]);
                config.workspace = config.kpiWorkspace
                    ? { kpis: [], assessments: {}, activities: [], ...result.data }
                    : result.data;
                config.selectedCycle = result.cycle;
                config.actor.key = result.actorId;
                config.initialInsights = result.insights;
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
        activeStore = store;
        const [organization, kpi, insights, goalPrototype] = await features;
        try {
            await goalPrototype?.prepareGoalShell(config, store);
        } catch (e) {
            const host = document.querySelector('[data-skp-content]');
            if (host) {
                host.replaceChildren();
                const message = document.createElement('p');
                message.className = 'notice notice-error';
                message.setAttribute('role', 'alert');
                message.textContent = e.message || 'KPI workspace gagal dimuat.';
                host.append(message);
            }
            return;
        }
        const link = initFlowRuntime(config, store);
        if (goalPrototype) {
            goalPrototype.initGoalPrototype(config, store);
            document.documentElement.dataset.frontendReady = 'true';
            return;
        }
        const assessments = initFlowAssessments(config, store, link);
        organization?.initOrganization(config, store, link);
        kpi?.initKpi(config, store);
        kpi?.initCycles(config, store);
        initFlowReports(config, store, assessments, link);
        insights?.initInsights(config, store, link);
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
                `/design-review/${account.role}/dashboard?account=${encodeURIComponent(account.key)}`,
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
start().catch((e) => {
    const prototype = $('[data-goal-prototype] [data-gp-content]');
    if (!prototype) return toast(e.message, true);
    prototype.setAttribute('aria-busy', 'false');
    const message = document.createElement('p');
    message.className = 'notice notice-error';
    message.setAttribute('role', 'alert');
    message.textContent =
        'Rancangan belum dapat dimuat. Periksa koneksi atau muat ulang halaman.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn';
    retry.textContent = 'Muat ulang';
    retry.onclick = () => location.reload();
    prototype.replaceChildren(message, retry);
});
