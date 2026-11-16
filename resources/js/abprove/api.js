import { toast } from './ui';

export function createApi(c) {
    const prefix = { ku: '/unit', kd: '/division', hc: '/hc', adm: '/admin' }[c.role];
    let pending = 0,
        writing = false;
    let workspaceUpdates = [],
        refreshRequired = false;
    function reportRequested() {
        const query = new URLSearchParams(location.search);
        return (
            !!document.querySelector('[data-insights-root]') &&
            !query.has('unit') &&
            !query.has('division') &&
            ![...document.querySelectorAll('[data-filter]')].some(
                (field) => field.value,
            )
        );
    }
    function takeWorkspaceUpdates() {
        const updates = refreshRequired ? null : workspaceUpdates;
        workspaceUpdates = [];
        refreshRequired = false;
        return updates;
    }
    const status = document.createElement('div');
    status.className = 'notice fixed right-4 bottom-5 z-[70] bg-paper';
    status.setAttribute('role', 'status');
    status.hidden = true;
    document.body.append(status);
    async function request(path, method = 'GET', data = null, options = {}) {
        const form = data instanceof FormData;
        const headers = {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')
                .content,
        };
        if (method !== 'GET') {
            headers['X-KPI-Workspace'] = c.workspaceProfile;
            if (c.selectedCycle) headers['X-KPI-Cycle'] = c.selectedCycle;
            if (reportRequested()) headers['X-KPI-Insights'] = '1';
            if (form) {
                if (!data.has('request_id'))
                    data.append('request_id', crypto.randomUUID());
            } else data = { request_id: crypto.randomUUID(), ...data };
        }
        if (!form && data) headers['Content-Type'] = 'application/json';
        pending++;
        status.textContent =
            method === 'GET' ? 'Memuat data…' : 'Menyimpan perubahan…';
        status.hidden = false;
        document.documentElement.dataset.loading = 'true';
        document.body.setAttribute('aria-busy', 'true');
        try {
            const r = await fetch(
                path.startsWith('/hc/') ? path : prefix + path,
                {
                    method,
                    headers,
                    credentials: 'same-origin',
                    signal: options.signal,
                    body: data
                        ? form
                            ? data
                            : JSON.stringify(data)
                        : undefined,
                },
            );
            const result = await r.json().catch(() => ({
                message: 'Respons server tidak dapat dibaca.',
            }));
            if (!r.ok) {
                if (r.status === 401) {
                    location.assign('/login');
                    throw new Error('Sesi berakhir.');
                }
                const details = Object.values(result.errors || {})
                    .flat()
                    .join('\n');
                const error = new Error(
                    details ||
                        result.message ||
                        `Permintaan gagal (${r.status}).`,
                );
                error.status = r.status;
                error.details = result;
                throw error;
            }
            if (method !== 'GET') {
                if (result.workspace) workspaceUpdates.push(result.workspace);
                else if (
                    Object.hasOwn(result, 'replayed') ||
                    result.workspace_refresh_required
                )
                    refreshRequired = true;
            }
            return result;
        } catch (e) {
            if (e instanceof TypeError)
                throw new Error(
                    'Koneksi terputus. Status penyimpanan belum dapat dipastikan. Muat ulang untuk memeriksa data.',
                );
            throw e;
        } finally {
            if (!--pending) {
                status.hidden = true;
                delete document.documentElement.dataset.loading;
                document.body.removeAttribute('aria-busy');
            }
        }
    }
    async function perform(form, operation) {
        if (writing || form?.dataset.saving) return false;
        writing = true;
        const locked = [
            ...document.querySelectorAll('#app-main, dialog[open]'),
        ].filter((element) => !element.inert);
        locked.forEach((element) => {
            element.inert = true;
        });
        const buttons = [
            ...(form?.querySelectorAll('button[type="submit"]') || []),
            ...document.querySelectorAll(
                'button[form="' + (form?.id || '__none') + '"]',
            ),
        ];
        if (form) form.dataset.saving = 'true';
        buttons.forEach((b) => (b.disabled = true));
        try {
            await operation();
            return true;
        } catch (e) {
            let target = form?.querySelector(
                '[data-form-error],[data-score-error],[data-kpi-error]',
            );
            if (target) {
                target.textContent = e.message;
                target.hidden = false;
            } else toast(e.message, true);
            return false;
        } finally {
            writing = false;
            locked.forEach((element) => {
                element.inert = false;
            });
            if (form) delete form.dataset.saving;
            buttons.forEach((b) => (b.disabled = false));
        }
    }
    return { request, perform, prefix, reportRequested, takeWorkspaceUpdates };
}
