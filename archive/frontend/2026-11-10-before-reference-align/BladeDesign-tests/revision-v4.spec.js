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
        const defaultPanel = role === 'ku' ? 'scores' : 'summary';
        await expect(
            page.locator(`[data-panel=${defaultPanel}]`),
        ).toBeVisible();
        for (const panel of [
            'summary',
            'scores',
            'rank',
            'findings',
            'history',
        ]) {
            await page
                .locator(`.section-tabs>[data-panel-tab=${panel}]`)
                .click();
            await expect(page.locator(`[data-panel=${panel}]`)).toBeVisible();
        }
    }
});
test('home widgets remain specific to each role', async ({ page }) => {
    await go(page, 'ku', 'beranda');
    await expect(page.locator('[data-home-trend]')).toBeVisible();
    await expect(page.locator('[data-home-tasks]')).toBeVisible();
    await go(page, 'kd', 'beranda');
    await expect(page.locator('[data-home-progress]')).toBeVisible();
    await expect(page.locator('[data-home-tasks]')).toBeVisible();
    await go(page, 'hc', 'beranda');
    for (const selector of [
        'data-home-progress',
        'data-home-findings',
        'data-home-activities',
        'data-home-cycle-progress',
    ])
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
