import { test, expect } from '@playwright/test';
import fs from 'node:fs';
if (process.env.KPI_ISOLATED_TEST !== '1')
    throw new Error(
        'Run tools/testing/run_backend_tests.py to protect the development database.',
    );
const password = process.env.KPI_E2E_PASSWORD;
test.afterEach(async ({ browser }) => {
    for (const context of browser.contexts()) await context.close();
});
const rolePrefix = { ku: 'unit', kd: 'division', hc: 'hc' };
const email = {
    ku: 'ku.it@kpi.test',
    kd: 'kd.umum@kpi.test',
    hc: 'hc.demo@kpi.test',
};
async function login(browser, role, identity = email[role]) {
    const context = await browser.newContext({
        baseURL: process.env.KPI_E2E_URL,
        viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(10000);
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    await page.goto('/login');
    await page.locator('[name=identifier]').fill(identity);
    await page.locator('[name=password]').fill(password);
    await Promise.all([
        page.waitForURL('**/' + rolePrefix[role] + '/dashboard'),
        page.locator('[data-login-submit]').click(),
    ]);
    await ready(page);
    return { context, page };
}
async function ready(page) {
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
        null,
        { timeout: 10000 },
    );
    if (await page.locator('[data-insights-root]').count())
        await page.waitForFunction(
            () => document.documentElement.dataset.insightsReady === 'true',
            null,
            { timeout: 10000 },
        );
}
async function go(page, url) {
    const response = await page.goto(url);
    expect(response.status(), url).toBe(200);
    await ready(page);
}
async function api(page, path, method = 'GET', data = null) {
    return page.evaluate(
        async ({ path, method, data }) => {
            const r = await fetch(path, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector(
                        'meta[name="csrf-token"]',
                    ).content,
                },
                body: data
                    ? JSON.stringify({
                          request_id: crypto.randomUUID(),
                          ...data,
                      })
                    : undefined,
            });
            return { status: r.status, body: await r.json() };
        },
        { path, method, data },
    );
}
async function workspace(page, role = 'hc') {
    const r = await api(page, '/' + rolePrefix[role] + '/data/workspace');
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return r.body.data;
}
const confirm = (page) =>
    page.locator('#confirm-dialog [data-action="confirm-submit"]').click();
const routes = {
    account: 'organization/users',
    position: 'organization/positions',
    division: 'organization',
    unit: 'organization',
    staff: 'organization/employees',
};
const sets = {
    account: 'accounts',
    position: 'positions',
    division: 'divisions',
    unit: 'units',
    staff: 'staff',
};
async function create(page, kind, values) {
    await go(page, '/hc/' + routes[kind]);
    if (kind === 'unit') await page.locator('[data-org-tab="unit"]').click();
    await page.locator(`[data-entity-new="${kind}"]:visible`).first().click();
    for (const [key, value] of Object.entries(values)) {
        if (key === 'code') continue;
        const el = page.locator('#entity-form [name="' + key + '"]');
        if ((await el.getAttribute('data-searchable')) !== null) {
            const label = await el.evaluate(
                (e, value) =>
                    [...e.options].find((o) => o.value === value).textContent,
                value,
            );
            await page
                .locator(`#entity-form [data-search-for="${key}"]`)
                .fill(label);
            await page
                .getByRole('option', { name: label, exact: true })
                .click();
        } else if (await el.evaluate((e) => e.tagName === 'SELECT'))
            await el.selectOption(value);
        else await el.fill(value);
    }
    await page.locator('[form="entity-form"]').click();
    await confirm(page);
    await expect(page.locator('#entity-dialog')).toBeHidden();
    const data = await workspace(page);
    return data[sets[kind]].find((x) => x.name === values.name);
}
async function find(page, kind, record) {
    await go(page, '/hc/' + routes[kind]);
    if (kind === 'unit') await page.locator('[data-org-tab="unit"]').click();
    await page.locator('[data-org-search]').fill(record.name);
}
test('all 16 seeded identities use genuine Better Auth, CSRF and logout revoke access', async ({
    browser,
}) => {
    const context = await browser.newContext({
        baseURL: process.env.KPI_E2E_URL,
        viewport: { width: 1440, height: 900 },
    });
    const request = context.request;
    const accounts = [
        'hc.demo',
        'hc.operasional',
        'hc.administrasi',
        'hc.monitoring',
        'kd.umum',
        'kd.medis',
        'kd.keperawatan',
        'kd.keuangan',
        'ku.it',
        'ku.sdm',
        'ku.ugd',
        'ku.logistik',
        'ku.rawatinap',
        'ku.rawatjalan',
        'ku.icu',
        'ku.tatausaha',
    ];
    expect(
        (
            await request.post('/login', {
                data: { identifier: email.hc, password },
            })
        ).status(),
    ).toBe(419);
    for (const account of accounts) {
        const initial = await (
            await request.get('/login', {
                headers: { Accept: 'application/json' },
            })
        ).json();
        const r = await request.post('/login', {
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': initial.csrf_token,
            },
            data: { identifier: account + '@kpi.test', password },
        });
        expect(r.status(), account).toBe(200);
        const body = await r.json();
        expect(body.data.user.password).toBeUndefined();
        expect(body.data.token).toBeUndefined();
        const cookies = await context.cookies();
        expect(cookies.find((c) => c.name === 'kpi_session')?.httpOnly).toBe(
            true,
        );
        expect(
            (
                await request.get('/me', {
                    headers: { Accept: 'application/json' },
                })
            ).status(),
        ).toBe(200);
        expect(
            (
                await request.post('/logout', {
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': body.data.csrf_token,
                    },
                    data: {},
                })
            ).status(),
        ).toBe(200);
        expect(
            (
                await request.get('/me', {
                    headers: { Accept: 'application/json' },
                })
            ).status(),
        ).toBe(401);
    }
    await context.close();
});
test('all role pages render live scoped data at desktop, tablet and phone sizes', async ({
    browser,
}) => {
    test.setTimeout(180000);
    fs.mkdirSync('docs/backend/v3/screenshots', { recursive: true });
    for (const role of ['ku', 'kd', 'hc']) {
        const { context, page } = await login(browser, role);
        const links = await page
            .locator('#kpi-config')
            .evaluate((e) => JSON.parse(e.textContent).links);
        for (const [width, height] of [
            [1440, 900],
            [1024, 768],
            [390, 844],
        ]) {
            await page.setViewportSize({ width, height });
            for (const [name, url] of Object.entries(links)) {
                await go(page, url);
                await expect(page.locator('main')).not.toContainText('@yield');
                expect(
                    await page
                        .locator('#kpi-config')
                        .evaluate((e) => JSON.parse(e.textContent).fixture),
                ).toBeUndefined();
                expect(
                    await page.evaluate(() =>
                        localStorage.getItem('abprove-flow-v2'),
                    ),
                ).toBeNull();
                expect(
                    await page.evaluate(
                        () => document.documentElement.scrollWidth - innerWidth,
                    ),
                    role + '/' + name,
                ).toBeLessThanOrEqual(1);
                expect(
                    await page
                        .locator('main')
                        .evaluate((e) => e.scrollWidth - e.clientWidth),
                    role + '/' + name,
                ).toBeLessThanOrEqual(1);
                if (name === 'beranda')
                    await page.screenshot({
                        path: `docs/backend/v3/screenshots/${role}-${width}.png`,
                    });
            }
        }
        expect(page.errors).toEqual([]);
        await context.close();
    }
});
test('HC account, position, division, unit and staff CRUD persist and delete in dependency order', async ({
    browser,
}) => {
    test.setTimeout(120000);
    const { context, page } = await login(browser, 'hc');
    const ku = await create(page, 'account', {
        name: 'Kepala Unit Integrasi',
        nip: 'LIVE-KU',
        email: 'live.ku@kpi.test',
        role: 'ku',
        password: 'IntegrationAccount12345',
    });
    const kd = await create(page, 'account', {
        name: 'Kepala Divisi Integrasi',
        nip: 'LIVE-KD',
        email: 'live.kd@kpi.test',
        role: 'kd',
        password: 'IntegrationAccount12345',
    });
    const job = await create(page, 'position', {
        name: 'Analis Integrasi',
        code: 'LIVE-JOB',
    });
    const division = await create(page, 'division', {
        name: 'Divisi Integrasi',
        code: 'LIVE-DIV',
        headId: kd.id,
    });
    const unit = await create(page, 'unit', {
        name: 'Unit Integrasi',
        code: 'LIVE-UNIT',
        divisionId: division.id,
        headId: ku.id,
    });
    const staff = await create(page, 'staff', {
        name: 'Staf Integrasi',
        nip: 'LIVE-STAF',
        positionId: job.id,
        unitId: unit.id,
    });
    for (const [kind, record] of [
        ['staff', staff],
        ['unit', unit],
        ['division', division],
        ['position', job],
        ['account', ku],
        ['account', kd],
    ]) {
        await find(page, kind, record);
        await page.locator(`[data-entity-edit="${record.id}"]`).click();
        record.name += ' Revisi';
        await page.locator('#entity-form [name=name]').fill(record.name);
        await page.locator('[form="entity-form"]').click();
        await confirm(page);
        await expect(page.locator('#entity-dialog')).toBeHidden();
        expect(
            (await workspace(page))[sets[kind]].find((x) => x.id === record.id)
                .name,
        ).toBe(record.name);
    }
    for (const [kind, record] of [
        ['staff', staff],
        ['unit', unit],
        ['division', division],
        ['position', job],
        ['account', ku],
        ['account', kd],
    ]) {
        await find(page, kind, record);
        await page.locator(`[data-entity-more="${record.id}"]`).click();
        await page
            .getByRole('button', { name: 'Hapus data', exact: true })
            .click();
        await confirm(page);
        await expect
            .poll(
                async () =>
                    !!(await workspace(page))[sets[kind]].find(
                        (x) => x.id === record.id,
                    ),
            )
            .toBe(false);
    }
    expect(page.errors).toEqual([]);
    await context.close();
});
test('KU sends complete scores, KD returns and finalizes, HC cannot decide, Final is immutable', async ({
    browser,
}) => {
    const ku = await login(browser, 'ku'),
        kd = await login(browser, 'kd'),
        hc = await login(browser, 'hc');
    let data = await workspace(ku.page, 'ku');
    const person = data.staff.find(
        (p) => !data.assessments[p.id + '|' + data.cycles.at(-1).id],
    );
    const month = data.cycles.at(-1).id;
    await go(ku.page, '/unit/score?person=' + person.id + '&cycle=' + month);
    const scores = ku.page.locator('[data-score-mount] [data-score]');
    for (const input of await scores.all()) {
        await input.fill('87');
        await input.press('Enter');
    }
    await ku.page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(ku.page);
    await expect(
        ku.page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
    data = await workspace(ku.page, 'ku');
    let a = data.assessments[person.id + '|' + month];
    expect(a.status).toBe('Diajukan');
    expect(+a.serverTotal).toBe(87);
    await go(kd.page, '/division/approvals?person=' + person.id);
    await expect(kd.page.locator('#review-dialog')).toBeVisible();
    await kd.page.locator('[data-flow-action="return"]').click();
    await kd.page
        .locator('#confirm-dialog textarea')
        .fill('Lengkapi bukti layanan.');
    await confirm(kd.page);
    await expect(kd.page.locator('#review-dialog')).toBeHidden();
    await go(ku.page, '/unit/score?person=' + person.id);
    for (const input of await ku.page
        .locator('[data-score-mount] [data-score]')
        .all()) {
        await input.fill('92');
        await input.press('Enter');
    }
    await ku.page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(ku.page);
    await expect(
        ku.page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
    await go(kd.page, '/division/approvals?person=' + person.id);
    await kd.page.locator('[data-flow-action="final"]').click();
    await confirm(kd.page);
    await expect(kd.page.locator('#review-dialog')).toBeHidden();
    data = await workspace(ku.page, 'ku');
    a = data.assessments[person.id + '|' + month];
    expect(a.status).toBe('Final');
    expect(+a.serverTotal).toBe(92);
    expect(
        (
            await api(
                ku.page,
                '/unit/assessments/' + a.id + '/resubmit',
                'POST',
                {
                    lock_version: a.lockVersion,
                    scores: a.snapshot.items.map((i) => ({
                        source_kpi_item_id: +i.id,
                        score: 50,
                    })),
                },
            )
        ).status,
    ).toBe(409);
    expect(
        (
            await api(
                hc.page,
                '/division/assessments/' + a.id + '/approve',
                'POST',
                { lock_version: a.lockVersion },
            )
        ).status,
    ).toBe(403);
    expect((await api(ku.page, '/hc/organization/users')).status).toBe(403);
    expect(
        (await api(ku.page, '/division/data/workspace?role=kepala_divisi'))
            .status,
    ).toBe(403);
    expect(ku.page.errors).toEqual([]);
    expect(kd.page.errors).toEqual([]);
    await ku.context.close();
    await kd.context.close();
    await hc.context.close();
});
test('KU withdrawal deletes submitted values, integer validation and division head scoring are real', async ({
    browser,
}) => {
    const ku = await login(browser, 'ku'),
        kd = await login(browser, 'kd');
    const data = await workspace(ku.page, 'ku'),
        month = data.cycles.at(-1).id;
    const [key, a] = Object.entries(data.assessments).find(
        ([, a]) => a.status === 'Diajukan',
    );
    const person = key.split('|')[0];
    await go(ku.page, '/unit/score?person=' + person);
    await ku.page.locator('[data-flow-action="cancel-submission"]').click();
    await confirm(ku.page);
    await expect(
        ku.page.locator('[data-flow-action="send-assessment"]'),
    ).toBeVisible();
    expect(
        (await workspace(ku.page, 'ku')).assessments[person + '|' + month],
    ).toBeUndefined();
    const payload = {
        cycle_id: data.cycles.at(-1).dbId,
        employee_id: data.staff.find((p) => p.id === person).dbId,
        scores: a.snapshot.items.map((i) => ({
            source_kpi_item_id: +i.id,
            score: 10.5,
        })),
    };
    expect(
        (await api(ku.page, '/unit/assessments', 'POST', payload)).status,
    ).toBe(422);
    const d = await workspace(kd.page, 'kd'),
        head = d.heads.find((h) => !d.assessments[h.id + '|' + month]);
    await go(kd.page, '/division/heads?person=' + head.id);
    for (const input of await kd.page
        .locator('[data-score-mount] [data-score]')
        .all()) {
        await input.fill('89');
        await input.press('Enter');
    }
    await kd.page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(kd.page);
    await expect(
        kd.page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
    expect(
        (await workspace(kd.page, 'kd')).assessments[head.id + '|' + month]
            .status,
    ).toBe('Final');
    await ku.context.close();
    await kd.context.close();
});
test('profile, notifications, exports and KPI CSV import use the server', async ({
    browser,
}) => {
    const { context, page } = await login(browser, 'hc');
    await go(page, '/hc/profile');
    await page
        .locator('[data-local-form=profile] [name=name]')
        .fill('Super HC Integrasi');
    await page.locator('[data-local-form=profile] button[type=submit]').click();
    await expect(page.locator('[data-profile-name]').first()).toHaveText(
        'Super HC Integrasi',
    );
    await go(page, '/hc/notifications');
    await page.locator('main [data-flow-action=read-notifications]').click();
    await expect(
        page.locator('[data-notification-count]').first(),
    ).toBeHidden();
    await go(page, '/hc/recap');
    await page.locator('[data-dialog-open=export-dialog]').click();
    const download = page.waitForEvent('download');
    await page.locator('[data-flow-action=download-export]').click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await go(page, '/hc/import');
    await page.locator('[data-kpi-import]').setInputFiles({
        name: 'integration.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            'pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nTechnical Care,Indikator impor,,,,100%,100\n',
        ),
    });
    await expect(page.locator('[data-kpi-import-preview]')).toContainText(
        '1 indikator valid',
    );
    expect(page.errors).toEqual([]);
    await context.close();
});

test('revision pagination, inline KPI weights, export, coverage links and activity use live data', async ({
    browser,
}) => {
    const { context, page } = await login(browser, 'hc');
    await go(page, '/hc/organization/employees');
    await page.locator('[data-org-search]').fill('Anggota IT Contoh');
    await expect(page.locator('[data-org-body]>tr:visible')).toHaveCount(10);
    await expect(
        page.locator('[data-pagination=organization] [data-page-summary]'),
    ).toHaveText('1-10 dari 12');
    await page
        .locator('[data-pagination=organization] [data-page-next]')
        .click();
    await expect(page.locator('[data-org-body]>tr:visible')).toHaveCount(2);
    await page.locator('[data-entity-more]:visible').first().click();
    await expect(
        page.getByRole('button', { name: 'Nonaktifkan', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('[data-entity-edit]:visible').first().click();
    await expect(page.locator('#entity-form [name=active]')).toBeVisible();
    await expect(page.locator('#entity-form [name=code]')).toBeHidden();
    await page.keyboard.press('Escape');

    await go(page, '/hc/kpi-templates');
    await expect(page.locator('[data-kpi-body]>tr:visible')).toHaveCount(5);
    const kpiPager = page.locator('[data-pagination=kpi-items]');
    await kpiPager.locator('[data-page-next]').click();
    await expect(page.locator('[data-kpi-body]>tr:visible')).toHaveCount(2);
    await kpiPager.locator('[data-page-prev]').click();
    const weight = page
        .locator('[data-kpi-body] [data-kpi-field=weight]')
        .first();
    await weight.fill('19');
    await weight.dispatchEvent('input');
    await page.locator('[data-flow-action=apply-kpi]').click();
    await expect(page.locator('[data-kpi-error]')).toContainText('100%');
    await weight.fill('20');
    await weight.dispatchEvent('input');
    const download = page.waitForEvent('download');
    await page.locator('[data-flow-action=export-kpi]').click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await go(page, '/hc/placement');
    await expect(page).toHaveURL(/\/hc\/kpi-templates/);
    await expect(
        page.getByRole('link', { name: 'Cakupan KPI', exact: true }),
    ).toHaveCount(0);

    await go(page, '/hc/analytics');
    for (const key of [
        'data-item-averages',
        'data-unit-status',
        'data-rank-preview',
        'data-findings-preview',
    ]) {
        await page
            .locator(
                `[data-panel-tab=${key === 'data-item-averages' ? 'kpi' : key === 'data-unit-status' ? 'units' : 'results'}]`,
            )
            .click();
        await expect(page.locator(`[${key}]`)).toBeVisible();
    }
    for (const panel of ['scores', 'findings']) {
        await page
            .locator(
                `[data-panel-tab=${panel === 'scores' ? 'scores' : 'results'}]`,
            )
            .click();
        const body = page.locator(
            panel === 'scores'
                ? '[data-staff-scores]'
                : '[data-staff-findings]',
        );
        const rows =
            panel === 'scores' ? 'tr:visible' : '.reference-feed-item:visible';
        await expect(body.locator(rows)).toHaveCount(10);
        const pager = page.locator(`[data-pagination=staff-${panel}]`);
        await pager.locator('[data-page-next]').click();
        await expect(body.locator(rows)).toHaveCount(10);
    }
    await go(page, '/hc/audit');
    await expect(page.locator('[data-flow-activities]>tr:visible')).toHaveCount(
        10,
    );
    await page.locator('[data-activity-id]').first().click();
    await expect(
        page.locator('#activity-dialog [data-activity-detail]'),
    ).toBeVisible();
    expect(page.errors).toEqual([]);
    await context.close();
});

test('KPI version apply/delete and period create/edit/delete/close persist through UI', async ({
    browser,
}) => {
    const { context, page } = await login(browser, 'hc');
    await go(page, '/hc/kpi-templates');

    await page.locator('.reference-kpi-history summary').click();
    await page.locator('[data-flow-action=rename-kpi]').click();
    await page
        .locator('#kpi-name-form [name=name]')
        .fill('KPI Versi Integrasi');
    await page.locator('[form=kpi-name-form]').click();
    await page
        .locator('[data-kpi-field=pillar]')
        .first()
        .fill('Keselamatan & mutu unit');
    await page.locator('[data-kpi-editor] [name=from]').fill('2026-12');
    await page.locator('[data-flow-action=apply-kpi]').click();
    await confirm(page);
    await expect
        .poll(async () =>
            (await workspace(page)).kpis.some(
                (k) => k.name === 'KPI Versi Integrasi',
            ),
        )
        .toBe(true);
    const version = (await workspace(page)).kpis.find(
        (k) => k.name === 'KPI Versi Integrasi',
    );
    expect(version.items[0].pillar).toBe('Keselamatan & mutu unit');
    await page.locator('[data-kpi-version]').selectOption(version.id);
    await page.locator('[data-flow-action=delete-kpi-version]').click();
    await confirm(page);
    await expect
        .poll(async () =>
            (await workspace(page)).kpis.some((k) => k.id === version.id),
        )
        .toBe(false);
    await go(page, '/hc/settings');
    await page.locator('[data-panel-tab=periods]').click();
    await page.locator('[data-flow-action=new-cycle]').click();
    const values = {
        month: '2026-12',
        opens: '2026-12-01T08:00',
        submission: '2026-12-10T17:00',
        approval: '2026-12-15T17:00',
        closes: '2026-12-20T17:00',
        sb: '90',
        b: '80',
        c: '70',
    };
    for (const [key, value] of Object.entries(values))
        await page.locator('#cycle-form [name=' + key + ']').fill(value);
    await page.locator('[form=cycle-form]').click();
    await confirm(page);
    await expect(page.locator('#cycle-dialog')).toBeHidden();
    expect(
        (await workspace(page)).cycles.find((x) => x.id === '2026-12').status,
    ).toBe('planned');
    await page.locator('[data-cycle-edit="2026-12"]').click();
    await page.locator('#cycle-form [name=closes]').fill('2026-12-21T17:00');
    await page.locator('[form=cycle-form]').click();
    await confirm(page);
    await expect(page.locator('#cycle-dialog')).toBeHidden();
    expect(
        (await workspace(page)).cycles.find((x) => x.id === '2026-12').closes,
    ).toBe('2026-12-21T17:00');
    await page.locator('[data-cycle-delete="2026-12"]').click();
    await confirm(page);
    await expect
        .poll(async () =>
            (await workspace(page)).cycles.some((x) => x.id === '2026-12'),
        )
        .toBe(false);
    await page.locator('[data-cycle-close="2026-11"]').click();
    await confirm(page);
    await expect
        .poll(
            async () =>
                (await workspace(page)).cycles.find((x) => x.id === '2026-11')
                    .status,
        )
        .toBe('closed');
    expect(page.errors).toEqual([]);
    await context.close();
});

test('password changes update Better Auth credentials and revoke other browser sessions', async ({
    browser,
}) => {
    const first = await login(browser, 'hc', 'hc.monitoring@kpi.test'),
        second = await login(browser, 'hc', 'hc.monitoring@kpi.test');
    await go(first.page, '/hc/profile');
    await first.page.locator('[data-panel-tab=security]').click();
    await first.page.locator('[name=current_password]').fill(password);
    await first.page
        .locator('[name=new_password]')
        .fill('ChangedCredential12345');
    await first.page
        .locator('[name=confirmation]')
        .fill('ChangedCredential12345');
    await first.page
        .locator('[data-local-form=password] button[type=submit]')
        .click();
    await first.page.waitForURL('**/login');
    expect(
        (
            await second.context.request.get('/me', {
                headers: { Accept: 'application/json' },
            })
        ).status(),
    ).toBe(401);
    await first.page
        .locator('[name=identifier]')
        .fill('hc.monitoring@kpi.test');
    await first.page.locator('[name=password]').fill('ChangedCredential12345');
    await Promise.all([
        first.page.waitForURL('**/hc/dashboard'),
        first.page.locator('[data-login-submit]').click(),
    ]);
    await ready(first.page);
    await first.context.close();
    await second.context.close();
});
