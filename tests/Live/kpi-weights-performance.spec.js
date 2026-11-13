import { test, expect } from '@playwright/test';
import { monthlyWeightRows } from '../../resources/js/design-review/kpi-periode/weight-summary.js';
if (process.env.KPI_ISOLATED_TEST !== '1') throw new Error('Database uji terisolasi wajib.');

test('Ringkasan bobot memakai data ringan, pagination dan filter; Monitoring dimuat saat dibuka', async ({browser}) => {
    const context = await browser.newContext({ baseURL: process.env.KPI_E2E_URL, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const ready = async () => {
        await page.waitForFunction(() => document.documentElement.dataset.frontendReady === 'true');
        if (await page.locator('[data-simple-kpi]').count()) await page.waitForFunction(() => document.querySelector('[data-simple-kpi]').dataset.ready === 'true');
    };
    try {
        await page.goto('/login');
        await page.locator('[name=identifier]').fill('hc.demo@kpi.test');
        await page.locator('[name=password]').fill(process.env.KPI_E2E_PASSWORD);
        await Promise.all([page.waitForURL('**/hc/dashboard'), page.locator('[data-login-submit]').click()]);
        await ready();
        const requests = [];
        page.on('request', request => { if (request.url().includes('/hc/kpi-workspace')) requests.push(request.url()); });
        const bootstrapResponse = page.waitForResponse(response => response.url().includes('/hc/data/workspace?'));
        const masterResponse = page.waitForResponse(response => response.url().includes('/hc/kpi-workspace?'));
        await page.goto('/hc/kpi-templates'); await ready();
        const bootstrap = await (await bootstrapResponse).json();
        const data = (await (await masterResponse).json()).data;
        expect(bootstrap.data.assessments).toBeUndefined();
        expect(bootstrap.data.kpis).toBeUndefined();
        expect(bootstrap.data.staff.length).toBeGreaterThan(0);
        expect(data.assessmentsLoaded).toBe(false);
        expect(data.assessments).toEqual([]);
        const expected = monthlyWeightRows(data, data.selectedMonth);
        const weights = page.getByRole('region', { name: 'Total bobot per karyawan', exact: true });
        await expect(weights.locator('[data-weight-summary]')).toContainText(expected.length+' penerima');
        await expect(weights.locator('tbody tr')).toHaveCount(10);
        const first = await weights.locator('tbody tr').first().innerText();
        await weights.locator('[data-gp-page=simple-weights][data-delta="1"]').click();
        expect(await weights.locator('tbody tr').first().innerText()).not.toBe(first);
        for (const size of ['25','50']) {
            await weights.locator('[data-gp-page-size=simple-weights]').selectOption(size);
            await expect(weights.locator('tbody tr')).toHaveCount(Math.min(+size,expected.length));
        }
        const unit = data.units[0];
        await page.locator('[data-dialog-open=skp-master-filter]').click();
        await page.locator('[data-skp-filter=unit]').selectOption(unit.id);
        await page.locator('[data-skp-filter=role]').selectOption('staff');
        await page.locator('#skp-master-filter [data-dialog-close]').last().click();
        const filtered = monthlyWeightRows(data,data.selectedMonth,{unit:unit.id,role:'staff'});
        await expect(weights.locator('[data-weight-summary]')).toContainText(filtered.length+' penerima');
        await expect(weights.locator('tbody tr')).toHaveCount(Math.min(50,filtered.length));
        for (const text of await weights.locator('tbody tr').allTextContents()) expect(text).toContain(unit.name);
        await page.locator('[data-dialog-open=skp-master-filter]').click();
        await page.locator('#skp-master-filter [data-table-filter-reset]').click();
        await page.keyboard.press('Escape');
        await expect(weights.locator('[data-weight-summary]')).toContainText(expected.length+' penerima');
        expect(requests).toHaveLength(1);
        await page.keyboard.press('Control+k');
        const person = data.people.find(person=>person.type==='staff');
        await page.locator('[data-flow-search]').fill(person.nip);
        await expect(page.locator('[data-search-results]')).toContainText(person.name);
        await page.keyboard.press('Escape');
        const monitoringResponse = page.waitForResponse(response => response.url().includes('/hc/kpi-workspace?') && response.url().includes('include_assessments=1'));
        await page.locator('[data-skp-nav=monitor]').click();
        expect((await (await monitoringResponse).json()).data.assessmentsLoaded).toBe(true);
        await expect(page.locator('[data-skp-monitor-results]')).toBeVisible();
        await page.goto('/hc/settings'); await ready();
        const period = data.periods.find(period=>period.hasFinal);
        expect(period).toBeTruthy();
        await page.locator('[data-skp-action=period][data-id="'+period.id+'"]').click();
        await expect(page.locator('#skp-period-form button[type=submit]')).toBeDisabled();
        await page.setViewportSize({width:390,height:900});
        await page.goto('/hc/kpi-templates'); await ready();
        await expect(weights.locator('tbody tr')).toHaveCount(10);
        expect(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth+1)).toBe(true);
        expect(errors).toEqual([]);
    } finally { await context.close(); }
});
