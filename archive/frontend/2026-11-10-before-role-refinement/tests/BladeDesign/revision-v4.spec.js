import { test, expect } from '@playwright/test';

const pages = {
    ku: ['beranda', 'nilai', 'pengajuan', 'riwayat', 'kpi', 'tim', 'profil'],
    kd: [
        'beranda',
        'persetujuan',
        'nilai-kepala',
        'dashboard',
        'kpi',
        'tim',
        'profil',
    ],
    hc: [
        'beranda',
        'akun',
        'struktur',
        'jabatan',
        'karyawan',
        'kpi',
        'pengaturan',
        'penempatan',
        'rekap',
        'dashboard',
        'aktivitas',
        'profil',
    ],
};
async function go(page, role, view, query = '') {
    await page.goto(
        `/design-review/${role}/${view}${query ? '?' + query : ''}`,
    );
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
    if (await page.locator('[data-insights-root]').count())
        await page.waitForFunction(
            () => document.documentElement.dataset.insightsReady === 'true',
        );
}
test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-10T10:00:00Z'));
    page.errors = [];
    page.writes = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    page.on('request', (r) => {
        if (r.method() !== 'GET') page.writes.push(r.url());
    });
});
test.afterEach(async ({ page }) => {
    expect(page.errors).toEqual([]);
    expect(page.writes).toEqual([]);
});

for (const [role, views] of Object.entries(pages))
    for (const view of views) {
        test(`${role}/${view}: current Blade review remains usable`, async ({
            page,
        }) => {
            await go(page, role, view);
            await expect(page.locator('main')).toBeVisible();
            await expect(page.locator('main')).not.toContainText('@yield');
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth - innerWidth,
                ),
            ).toBeLessThanOrEqual(1);
        });
    }
test('HC grouped navigation, add unit and edit-only activation', async ({
    page,
}) => {
    await go(page, 'hc', 'struktur');
    for (const tab of ['division', 'unit', 'position', 'staff'])
        await expect(page.locator(`[data-org-tab=${tab}]`)).toBeVisible();
    await page.locator('[data-quick-unit]').click();
    await expect(page.locator('#entity-dialog')).toBeVisible();
    await expect(page.locator('#entity-form [name=code]')).toBeHidden();
    await expect(page.locator('#entity-form [name=headId]')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-org-tab=staff]').click();
    await page.locator('[data-entity-more]').first().click();
    await expect(
        page.getByRole('button', { name: 'Nonaktifkan', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('[data-entity-edit]').first().click();
    await expect(page.locator('#entity-form [name=active]')).toBeVisible();
    await page.keyboard.press('Escape');
});
test('KPI has five rows, inline weights, validation, export and grouped settings', async ({
    page,
}) => {
    await go(page, 'hc', 'kpi');
    expect(
        await page.locator('[data-kpi-body]>tr:visible').count(),
    ).toBeLessThanOrEqual(5);
    const weight = page
        .locator('[data-kpi-body] [data-kpi-field=weight]')
        .first();
    const original = await weight.inputValue();
    await weight.fill('1');
    await weight.dispatchEvent('input');
    await page.locator('[data-flow-action=apply-kpi]').click();
    await expect(page.locator('[data-kpi-error]')).toContainText('100%');
    await weight.fill(original);
    await weight.dispatchEvent('input');
    const download = page.waitForEvent('download');
    await page.locator('[data-flow-action=export-kpi]').click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await page
        .getByRole('link', { name: 'Periode & kategori', exact: true })
        .click();
    await page.locator('[data-flow-action=new-cycle]').click();
    for (const name of ['sb', 'b', 'c'])
        await expect(page.locator(`#cycle-form [name=${name}]`)).toBeEditable();
});
test('coverage cards navigate to the selected KPI area', async ({ page }) => {
    await go(page, 'hc', 'penempatan');
    const card = page.locator('a.coverage-link').first();
    await expect(card).toBeVisible();
    const href = await card.getAttribute('href');
    const url = new URL(href, 'http://127.0.0.1:8008');
    await card.click();
    await expect(page.locator('[data-kpi-area]')).toHaveValue(
        url.searchParams.get('area'),
    );
    await expect(page.locator('[data-kpi-level=unit]')).toHaveClass(/active/);
});
test('KU history has shared scores and findings, KD and HC retain analytics', async ({
    page,
}) => {
    for (const role of ['ku', 'kd', 'hc']) {
        await go(page, role, role === 'ku' ? 'riwayat' : 'dashboard');
        await page.locator('[data-panel-tab=summary]').click();
        await expect(page.locator('[data-reference-trend]')).toBeVisible();
        await page.locator('[data-panel-tab=scores]').click();
        await expect(page.locator('[data-staff-scores]')).toBeVisible();
        await page
            .locator(
                `[data-panel-tab=${role === 'ku' ? 'findings' : 'results'}]`,
            )
            .click();
        await expect(page.locator('[data-staff-findings]')).toBeVisible();
        if (role !== 'ku') {
            await page.locator('[data-panel-tab=kpi]').click();
            await expect(page.locator('[data-item-averages]')).toBeVisible();
        } else await page.locator('[data-panel-tab=scores]').click();
        await page.locator('[data-report-range]').selectOption('3');
        await expect(page.locator('[data-matrix-head] th')).toHaveCount(5);
    }
});
test('home widgets remain specific to each role', async ({ page }) => {
    await go(page, 'ku', 'beranda');
    await expect(page.locator('[data-reference-next]')).toBeVisible();
    await page.locator('[data-panel-tab=trend]').click();
    await expect(page.locator('[data-home-trend]')).toBeVisible();
    await go(page, 'kd', 'beranda');
    await expect(page.locator('[data-home-progress]')).toBeVisible();
    await page.locator('[data-panel-tab=approvals]').click();
    await expect(page.locator('[data-reference-waiting]')).toBeVisible();
    await go(page, 'hc', 'beranda');
    await expect(page.locator('[data-home-progress]')).toBeVisible();
    await expect(page.locator('[data-home-cycle-progress]')).toBeVisible();
    await page.locator('[data-panel-tab=updates]').click();
    for (const selector of ['data-home-findings', 'data-home-activities'])
        await expect(page.locator(`[${selector}]`)).toBeVisible();
});
for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
])
    test(`responsive controls and dialogs at ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        for (const [role, view] of [
            ['ku', 'riwayat'],
            ['kd', 'dashboard'],
            ['hc', 'kpi'],
            ['hc', 'struktur'],
        ]) {
            await go(page, role, view);
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth - innerWidth,
                ),
            ).toBeLessThanOrEqual(1);
            if (view === 'struktur') {
                await page.locator('[data-quick-unit]').click();
                await expect(page.locator('#entity-dialog')).toBeVisible();
                await page.keyboard.press('Escape');
            }
        }
    });

test('comparison uses matching viewport scale and keeps original JPG', async ({
    page,
}) => {
    await page.goto('/design-review?screen=hc-home&mode=both');
    await expect(page.locator('#audit-screen')).toHaveValue('hc-home');
    await expect(page.locator('#audit-reference-wrap')).toBeVisible();
    await expect(page.locator('#audit-frame-wrap')).toBeVisible();
    await expect
        .poll(() =>
            page
                .locator('#audit-reference')
                .evaluate((e) => e.complete && e.naturalWidth > 0),
        )
        .toBe(true);
    const sizes = await page.evaluate(() =>
        ['audit-frame-wrap', 'audit-reference-wrap'].map((id) => {
            const r = document.getElementById(id).getBoundingClientRect();
            return { width: r.width, height: r.height };
        }),
    );
    expect(Math.abs(sizes[0].width - sizes[1].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(sizes[0].height - sizes[1].height)).toBeLessThanOrEqual(1);
});
test('source composition keeps KU rail, HC cycle and dashboard matrix', async ({
    page,
}) => {
    await go(page, 'ku', 'beranda');
    const geometry = await page.evaluate(() => ({
        sidebar: document.querySelector('#sidebar').getBoundingClientRect()
            .width,
        navbar: document.querySelector('.topbar').getBoundingClientRect()
            .height,
        rail: document
            .querySelector('.reference-home-grid>aside')
            .getBoundingClientRect().left,
        next: document
            .querySelector('[data-reference-next]')
            .getBoundingClientRect().right,
    }));
    expect(geometry.sidebar).toBe(256);
    expect(geometry.navbar).toBe(80);
    expect(geometry.rail).toBeGreaterThan(geometry.next);
    await go(page, 'hc', 'beranda');
    const top = await page.locator('[data-home-cycle-progress]').boundingBox(),
        progress = await page.locator('[data-home-progress]').boundingBox();
    expect(top.y).toBeLessThan(progress.y);
    const barRatio = await page
        .locator('[data-home-progress] .reference-progress-table')
        .first()
        .evaluate(
            (table) =>
                table.querySelector('.reference-bar').getBoundingClientRect()
                    .width / table.getBoundingClientRect().width,
        );
    expect(barRatio).toBeGreaterThan(0.45);
    await go(page, 'kd', 'dashboard');
    await expect(page.locator('[data-reference-kpi-head] th')).toHaveCount(13);
    await go(page, 'hc', 'kpi');
    await expect(page.locator('.reference-kpi-table thead')).toContainText(
        'Numerator',
    );
    await expect(page.locator('.reference-kpi-table thead')).toContainText(
        'Denominator',
    );
    await expect(page.locator('.reference-kpi-table thead')).toContainText(
        'Formula pengukuran',
    );
});
test('score sheet shows both findings beside total, without extra tabs', async ({
    page,
}) => {
    await go(page, 'ku', 'nilai', 'person=E03');
    await expect(
        page.locator('[data-score-mount] [data-finding=positive]'),
    ).toBeVisible();
    await expect(
        page.locator('[data-score-mount] [data-finding=negative]'),
    ).toBeVisible();
    await expect(
        page.locator('[data-score-mount] [data-panel-tab]'),
    ).toHaveCount(0);
});

test('KPI history selection does not mark the editor as changed', async ({
    page,
}) => {
    await go(page, 'hc', 'kpi');
    await page.locator('.reference-kpi-history summary').click();
    const selector = page.locator('[data-kpi-version]'),
        value = await selector.inputValue();
    await selector.selectOption(value);
    await expect(page.locator('#confirm-dialog')).toBeHidden();
    await page
        .locator('[data-kpi-body] [data-kpi-field=weight]')
        .first()
        .fill('1');
    await selector.selectOption(value);
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page
        .locator('#confirm-dialog')
        .getByRole('button', { name: 'Batal', exact: true })
        .click();
});

test('profile sections fit desktop and preserve input while switching tabs by keyboard', async ({
    page,
}) => {
    for (const role of ['ku', 'kd', 'hc']) {
        await go(page, role, 'profil');
        const input = page.locator('[data-local-form=profile] [name=name]');
        await input.fill('Nama uji sementara');
        await page.locator('[data-panel-tab=profile]').focus();
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('[data-panel=security]')).toBeVisible();
        await expect(page.locator('[data-panel=profile]')).toBeHidden();
        expect(
            await page
                .locator('#main-content')
                .evaluate((e) => e.scrollHeight - e.clientHeight),
        ).toBeLessThanOrEqual(1);
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('[data-panel=preferences]')).toBeVisible();
        expect(
            await page
                .locator('#main-content')
                .evaluate((e) => e.scrollHeight - e.clientHeight),
        ).toBeLessThanOrEqual(1);
        await page.keyboard.press('Home');
        await expect(input).toHaveValue('Nama uji sementara');
        expect(
            await page
                .locator('#main-content')
                .evaluate((e) => e.scrollHeight - e.clientHeight),
        ).toBeLessThanOrEqual(1);
    }
});

test('assessment text colors distinguish all states consistently in tables, teams and rail', async ({
    page,
}) => {
    for (const theme of ['light', 'dark']) {
        await go(page, 'ku', 'pengajuan');
        await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
        );
        const colors = await page
            .locator('[data-assessment-body] [data-status]')
            .evaluateAll((es) =>
                Object.fromEntries(
                    es.map((e) => [
                        e.dataset.status,
                        getComputedStyle(e).color,
                    ]),
                ),
            );
        expect(Object.keys(colors).sort()).toEqual([
            'Belum',
            'Diajukan',
            'Dikembalikan',
            'Final',
        ]);
        expect(new Set(Object.values(colors)).size).toBe(4);
        await go(page, 'ku', 'tim');
        await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
        );
        const team = await page
            .locator('[data-team-structure] [data-status]')
            .evaluateAll((es) =>
                es.map((e) => ({
                    status: e.dataset.status,
                    color: getComputedStyle(e).color,
                })),
            );
        expect(team.length).toBeGreaterThan(0);
        for (const row of team) expect(row.color).toBe(colors[row.status]);
        await go(page, 'ku', 'nilai');
        await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
        );
        for (const row of await page
            .locator('[data-people-rail] [data-status]')
            .evaluateAll((es) =>
                es.map((e) => ({
                    status: e.dataset.status,
                    color: getComputedStyle(e).color,
                })),
            ))
            expect(row.color).toBe(colors[row.status]);
    }
});

test('settings and report show one selected section and keep deep links working', async ({
    page,
}) => {
    await go(page, 'hc', 'pengaturan');
    for (const panel of ['schedule', 'categories', 'periods', 'users']) {
        await page.locator(`[data-panel-tab=${panel}]`).click();
        await expect(page.locator(`[data-panel=${panel}]`)).toBeVisible();
        expect(
            await page
                .locator('.reference-settings > [data-panel]:visible')
                .count(),
        ).toBe(1);
    }
    await go(page, 'hc', 'dashboard', 'panel=results#temuan');
    await expect(page.locator('[data-panel=results]')).toBeVisible();
    await expect(page.locator('[data-panel=summary]')).toBeHidden();
    await page.locator('[data-panel-tab=scores]').click();
    await expect(page.locator('[data-report-range]')).toBeVisible();
    await page.locator('[data-report-range]').selectOption('3');
    await expect(page.locator('[data-matrix-head] th')).toHaveCount(5);
});
