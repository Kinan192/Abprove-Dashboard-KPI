import { initPanels } from './abprove/pagination';
import { initTableTools } from './abprove/table-tools';
import markUrl from '../images/abprove-mark.svg';
import { $, initUI, toast } from './abprove/ui';
import { createFlowStore, workspaceQuery } from './abprove/flow-store';
import { initFlowRuntime } from './abprove/flow-runtime';
import { initFlowAssessments } from './abprove/flow-assessments';

import { initFlowReports } from './abprove/flow-reports';
import { createApi } from './abprove/api';

document.documentElement.dataset.brandAsset = markUrl;
const element = $('#kpi-config'),
    config = element ? JSON.parse(element.textContent) : null;
let activeStore;
if (config) {
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
initUI();
initPanels();
initTableTools();
async function start() {
    if (config?.role === 'adm') {
        config.api = createApi(config);
        const { initAdmin } = await import('./admin/index.js');
        initAdmin(config);
        document.documentElement.dataset.frontendReady = 'true';
        return;
    }
    if (config) {
        const features = Promise.all([
            $('[data-org-body],[data-flow-activities]')
                ? import('./abprove/flow-org')
                : null,
            $('[data-kpi-editor],[data-kpi-import]')
                ? import('./abprove/flow-kpi')
                : null,
            $('[data-insights-root]') ? import('./abprove/insights') : null,
            $('[data-goal-prototype]')
                ? import('./kpi-workspace/index.js')
                : null,
            $('[data-role-dashboard]') ? import('./abprove/dashboard') : null,
        ]);
        {
            config.api = createApi(config);
            const root = document.querySelector('main');
            root?.setAttribute('aria-busy', 'true');
            try {
                // The page profile decides the sections and the month window the server loads.
                const query = workspaceQuery(
                    config.workspaceProfile,
                    new URLSearchParams(location.search).get('cycle'),
                    config.sections,
                );
                if (config.api.reportRequested())
                    query.set('include_insights', '1');
                const [result] = await Promise.all([
                    config.api.request('/data/workspace?' + query),
                    features,
                ]);
                config.workspace = result.data;
                config.workspaceWindow = result.window.assessments;
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
        const [organization, kpi, insights, kpiWorkspace, dashboard] =
            await features;
        try {
            await kpiWorkspace?.prepareKpiWorkspace(config, store);
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
        if (kpiWorkspace) {
            kpiWorkspace.initKpiWorkspace(config, store);
            document.documentElement.dataset.frontendReady = 'true';
            return;
        }
        dashboard?.initDashboard(config, store, link);
        const assessments = initFlowAssessments(config, store, link);
        organization?.initOrganization(config, store, link);
        kpi?.initKpi(config, store);
        initFlowReports(config, store, assessments, link);
        insights?.initInsights(config, store, link);
        document.documentElement.dataset.frontendReady = 'true';
    } else {
        $('form[action$="/login"]')?.addEventListener(
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
