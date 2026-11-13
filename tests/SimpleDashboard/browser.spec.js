import { test, expect } from '@playwright/test';

const pages = {
    ku: [
        'dashboard',
        'nilai',
        'pengajuan',
        'riwayat',
        'kpi',
        'tim',
        'profil',
        'panduan',
        'notifikasi',
    ],
    kd: [
        'persetujuan',
        'dashboard',
        'kpi',
        'nilai-kepala',
        'tim',
        'profil',
        'panduan',
        'notifikasi',
    ],
    hc: [
        'rekap',
        'dashboard',
        'struktur',
        'karyawan',
        'jabatan',
        'akun',
        'kpi',
        'pengaturan',
        'aktivitas',
        'impor',
        'profil',
        'panduan',
        'notifikasi',
    ],
};
async function go(page, role, view) {
    const response = await page.goto(`/design-review/${role}/${view}`);
    expect(response.status()).toBe(200);
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
    if (await page.locator('[data-insights-root]').count())
        await page.waitForFunction(
            () => document.documentElement.dataset.insightsReady === 'true',
        );
    if (await page.locator('[data-simple-kpi]').count())
        await page.waitForFunction(
            () =>
                document.querySelector('[data-simple-kpi]').dataset.ready ===
                'true',
        );
}
test.beforeEach(async ({ page }) => {
    page.errors = [];
    page.on('pageerror', (error) => page.errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(page.errors).toEqual([]));

for (const [role, views] of Object.entries(pages)) {
    for (const view of views) {
        test(`${role}/${view}: layout desktop, tablet dan ponsel`, async ({
            page,
        }) => {
            for (const width of [1440, 768, 390]) {
                await page.setViewportSize({ width, height: 900 });
                await go(page, role, view);
                expect(
                    await page.evaluate(
                        () => document.documentElement.scrollWidth - innerWidth,
                    ),
                ).toBeLessThanOrEqual(1);
                const top = await page.locator('.topbar').boundingBox();
                expect(top.height).toBe(64);
                expect(top.x).toBeGreaterThanOrEqual(0);
                expect(top.x + top.width).toBeLessThanOrEqual(width + 1);
                if (width === 1440) {
                    expect(
                        (await page.locator('#sidebar').boundingBox()).width,
                    ).toBe(232);
                    expect(
                        (await page.locator('#main-content').boundingBox()).x,
                    ).toBe(232);
                }
                await expect(page.locator('main')).not.toContainText('@yield');
            }
        });
    }
    test(`${role}: ringkasan, grafik nyata, laporan dan menu seluler`, async ({
        page,
    }) => {
        await go(page, role, 'dashboard');
        await expect(page.locator('[data-dashboard-metrics] > a')).toHaveCount(
            4,
        );
        await expect(
            page.locator('[data-dashboard-metrics]'),
        ).not.toContainText('undefined');
        const trend = page.locator('[data-dashboard-trend]');
        await expect(trend.locator('canvas')).toBeVisible();
        await expect(trend).toHaveAttribute('data-chart-library', 'chart.js');
        expect(await trend.evaluate((el) => el.chartInstance.config.type)).toBe(
            'line',
        );
        expect(
            await trend.evaluate((el) => el.chartInstance.data.labels.length),
        ).toBe(11);
        const point = await trend.evaluate((el) => {
            const p = el.chartInstance.getDatasetMeta(0).data[0];
            return { x: p.x, y: p.y };
        });
        const bounds = await trend.locator('canvas').boundingBox();
        await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
        await expect(
            page.locator('[data-dashboard-trend-detail]'),
        ).toContainText('Januari 2026');
        expect(
            await trend.evaluate((el) => el.chartInstance.tooltip.opacity),
        ).toBe(1);
        await page.locator('[data-dashboard-data=trend]').click();
        await expect(page.locator('#dashboard-data-dialog')).toBeVisible();
        await expect(
            page.locator('[data-dashboard-data-table] tbody tr'),
        ).toHaveCount(11);
        await page.keyboard.press('Escape');
        await page.locator('[data-dashboard-report]').click();
        await page.waitForFunction(
            () => document.documentElement.dataset.insightsReady === 'true',
        );
        await page.locator('[data-panel-tab=scores]').click();
        await expect(page.locator('[data-panel=scores]')).toBeVisible();
        if (role !== 'ku') {
            await expect(page.locator('[data-panel=summary]')).toBeHidden();
            await page
                .getByRole('link', { name: 'Kembali ke Dashboard' })
                .click();
            await expect(page.locator('[data-role-dashboard]')).toBeVisible();
        }
        await page.locator('[data-dialog-open=notification-dialog]').click();
        await expect(page.locator('#notification-dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#notification-dialog')).toBeHidden();
        const firstLink = page
            .locator('#sidebar nav[aria-label="Menu utama"] a')
            .nth(1);
        const href = await firstLink.getAttribute('href');
        await firstLink.click();
        await expect(page).toHaveURL(href);
        await page.setViewportSize({ width: 390, height: 900 });
        await go(page, role, 'dashboard');
        await page.locator('[aria-label="Menu lainnya"]').click();
        await expect(page.locator('body')).toHaveClass(/nav-open/);
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).not.toHaveClass(/nav-open/);
    });
    test(`${role}: Dashboard pertama, hijau, grafik sesuai peran tanpa pengulangan`, async ({
        page,
    }) => {
        await go(page, role, 'dashboard');
        const navigation = page.locator(
            '#sidebar nav[aria-label="Menu utama"] a',
        );
        await expect(navigation.first()).toContainText('Dashboard');
        await expect(navigation.first()).toHaveAttribute(
            'aria-current',
            'page',
        );
        await expect(page.locator('#sidebar')).not.toContainText('Beranda');
        expect(
            await page
                .locator('#sidebar')
                .evaluate((el) => getComputedStyle(el).backgroundColor),
        ).toBe('rgb(6, 78, 59)');
        await expect(page.locator('[data-dashboard-chart]')).toHaveCount(
            role === 'hc' ? 4 : 3,
        );
        await expect(page.locator('[data-role-dashboard]')).toHaveAttribute(
            'data-dashboard-layout',
            'overview-v2',
        );
        const mainChart = await page
            .locator('.dashboard-trend-panel')
            .boundingBox();
        const comparisonPanel = await page
            .locator('.dashboard-comparison-panel')
            .boundingBox();
        expect(comparisonPanel.y).toBeGreaterThan(
            mainChart.y + mainChart.height,
        );
        await expect(page.locator('.dashboard-agenda')).toBeVisible();
        const categories = page.locator('[data-dashboard-categories]');
        expect(
            await categories.evaluate((el) => el.chartInstance.config.type),
        ).toBe('doughnut');
        const total = await categories.evaluate((el) =>
            el.chartInstance.data.datasets[0].data.reduce((a, b) => a + b, 0),
        );
        const finalCount = await page
            .locator('[data-role-dashboard]')
            .evaluate((el) => el.dashboardState.d.metrics.final);
        expect(total).toBe(finalCount);
        const point = await categories.evaluate((el) =>
            el.chartInstance.getDatasetMeta(0).data[0].getCenterPoint(),
        );
        const categoryBox = await categories.locator('canvas').boundingBox();
        await page.mouse.click(
            categoryBox.x + point.x,
            categoryBox.y + point.y,
        );
        await expect(page.locator('#dashboard-data-dialog')).toBeVisible();
        expect(
            await page.locator('[data-dashboard-data-table] tbody tr').count(),
        ).toBeGreaterThan(0);
        await page.keyboard.press('Escape');
        await page
            .locator('[data-dialog-open=dashboard-agenda-dialog]')
            .click();
        await expect(page.locator('#dashboard-agenda-dialog')).toBeVisible();
        await expect(page.locator('[data-dashboard-deadlines] li')).toHaveCount(
            4,
        );
        await page.keyboard.press('Escape');
        await expect(
            page.locator('[data-dashboard-comparison]'),
        ).toHaveAttribute(
            'data-chart-kind',
            { ku: 'kpi', kd: 'unit', hc: 'completion' }[role],
        );
        await expect(
            page.locator(
                '.reference-ring,.reference-category-visual,[data-home-cycle-progress]',
            ),
        ).toHaveCount(0);
        await expect(
            page.locator('[data-panel-tab],[data-filter]'),
        ).toHaveCount(0);
        const labels = await page
            .locator('[data-dashboard-metrics] .figure-label')
            .allTextContents();
        expect(new Set(labels).size).toBe(4);
        const bars = page.locator('[data-dashboard-comparison]');
        await expect(bars).toHaveAttribute('data-chart-library', 'chart.js');
        const count = await bars.evaluate(
            (el) => el.chartInstance.data.labels.length,
        );
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(role === 'hc' ? 11 : 5);
        for (const value of await bars.evaluate((el) =>
            el.chartInstance.data.datasets.flatMap((dataset) => dataset.data),
        )) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
        }
        await expect(bars.locator('canvas')).toBeVisible();
        if (role === 'ku') {
            const first = await bars.evaluate(
                (el) => el.chartInstance.data.labels[0],
            );
            await page.locator('[data-dashboard-next]').click();
            expect(
                await bars.evaluate((el) => el.chartInstance.data.labels[0]),
            ).not.toBe(first);
            await expect(
                page.locator('[data-dashboard-page-label]'),
            ).toContainText('2 /');
            await page.locator('[data-dashboard-prev]').click();
            expect(
                await bars.evaluate((el) => el.chartInstance.data.labels[0]),
            ).toBe(first);
        } else if (role === 'hc') {
            await expect(
                page.locator('[data-role-dashboard]'),
            ).not.toContainText('Progres per divisi');
            await expect(page.locator('[data-dashboard-findings]')).toHaveCount(
                0,
            );
            const coverage = await bars.evaluate(
                (el) => el.chartInstance.data.datasets[0].data,
            );
            const expected = await page
                .locator('[data-role-dashboard]')
                .evaluate((el) =>
                    el.dashboardState.history.map((row) =>
                        row.total ? (row.count / row.total) * 100 : null,
                    ),
                );
            expect(coverage).toEqual(expected);
            await page.locator('[data-dashboard-data=low-kpi]').click();
            await expect(page.locator('#dashboard-data-dialog')).toBeVisible();
            await expect(
                page.locator('[data-dashboard-data-table] thead'),
            ).toContainText('Cakupan');
            await page.keyboard.press('Escape');
            const point = await bars.evaluate((el) => {
                const p = el.chartInstance.getDatasetMeta(0).data[0];
                return { x: p.x, y: (p.y + p.base) / 2 };
            });
            const bounds = await bars.locator('canvas').boundingBox();
            await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
            await expect(page).toHaveURL(/\/hc\/dashboard\?cycle=2026-01/);
            await go(page, role, 'dashboard');
        } else {
            await expect(page.locator('[data-dashboard-legend]')).toContainText(
                'Diajukan',
            );
            const point = await bars.evaluate((el) => {
                const p = el.chartInstance.getDatasetMeta(0).data[0];
                return { x: (p.x + p.base) / 2, y: p.y };
            });
            const bounds = await bars.locator('canvas').boundingBox();
            await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
            await expect(page).toHaveURL(
                role === 'hc'
                    ? /\/rekap\?.*division=/
                    : /\/persetujuan\?.*unit=/,
            );
            await go(page, role, 'dashboard');
        }
        const main = await page.locator('main').evaluate((el) => ({
            height: el.clientHeight,
            scroll: el.scrollHeight,
        }));
        expect(main.scroll - main.height).toBeLessThanOrEqual(1);
        const response = await page.goto(
            `/design-review/${role}/beranda?cycle=2026-11`,
        );
        expect(response.status()).toBe(200);
        await expect(page).toHaveURL(
            new RegExp(`/design-review/${role}/dashboard\\?cycle=2026-11$`),
        );
    });
    test(`${role}: data kosong tidak diganti angka atau grafik fiktif`, async ({
        page,
    }) => {
        await go(page, role, 'dashboard');
        await go(page, role, 'dashboard?cycle=2027-01');
        await page.waitForFunction(
            () => document.documentElement.dataset.insightsReady === 'true',
        );
        await expect(page.locator('[data-dashboard-trend]')).toHaveAttribute(
            'data-empty',
            'true',
        );
        await expect(page.locator('[data-dashboard-trend]')).toContainText(
            'Belum ada hasil Final',
        );
        expect(
            await page
                .locator('[data-dashboard-trend]')
                .evaluate((el) =>
                    el.chartInstance.data.datasets[0].data.every(
                        (value) => value == null,
                    ),
                ),
        ).toBe(true);
        await expect(page.locator('[data-dashboard-average]')).toHaveText('-');
        if (role === 'ku')
            await expect(
                page.locator('[data-dashboard-comparison]'),
            ).toHaveAttribute('data-empty', 'true');
    });
}

test('HC: daftar dan form KPI/Goals serta periode berada pada layar terpisah', async ({
    page,
}) => {
    await go(page, 'hc', 'kpi');
    await expect(page.locator('#skp-kpi-form')).toHaveCount(0);
    await expect(page.locator('.fx-kpi-list')).toBeVisible();
    await page.locator('[data-skp-action=new]').click();
    await expect(page.locator('#skp-kpi-form')).toBeVisible();
    await expect(page.locator('.fx-kpi-list')).toHaveCount(0);
    await expect(page.locator('#skp-kpi-form > section')).toHaveCount(4);
    await page.locator('[data-skp-action=cancel]').first().click();
    await expect(page.locator('.fx-kpi-list')).toBeVisible();
    await page.locator('[data-skp-nav=periods]').click();
    await expect(page.locator('#skp-period-form')).toHaveCount(0);
    await page.locator('[data-skp-action=new-period]').click();
    await expect(page.locator('#skp-period-form')).toBeVisible();
    await expect(page.locator('.fx-period-list')).toHaveCount(0);
});

test('Chart.js dimuat hanya saat Dashboard dibuka', async ({ page }) => {
    const requests = [];
    page.on('request', (request) => {
        if (/dashboard[^/]*\.js|chart[._-]?js/i.test(request.url()))
            requests.push(request.url());
    });
    await go(page, 'hc', 'profil');
    expect(requests).toEqual([]);
    await go(page, 'hc', 'dashboard');
    expect(requests.length).toBeGreaterThan(0);
    await expect(page.locator('[data-chart-library="chart.js"]')).toHaveCount(
        4,
    );
});

test('Kegagalan memuat grafik memberi feedback dan dapat dicoba ulang', async ({
    page,
}) => {
    const match =
        /\/(?:resources\/js\/abprove\/dashboard|(?:build\/)?assets\/dashboard-[^/?]+)\.js(?:\?.*)?$/;
    await page.route(match, (route) => route.abort());
    await page.goto('/design-review/hc/dashboard');
    await page.waitForFunction(
        () => document.documentElement.dataset.insightsReady === 'error',
    );
    await expect(page.locator('[data-insights-error]')).toContainText(
        'belum dapat dimuat',
    );
    await expect(page.locator('[data-dashboard-reload]')).toBeVisible();
    await expect(page.locator('[data-dashboard-data]').first()).toBeDisabled();
    await page.unroute(match);
    await page.locator('[data-dashboard-reload]').click();
    await page.waitForFunction(
        () => document.documentElement.dataset.insightsReady === 'true',
    );
    await expect(page.locator('[data-chart-library="chart.js"]')).toHaveCount(
        4,
    );
});

test('Tema gelap tetap terbaca dan badge notifikasi menampung angka panjang', async ({
    page,
}) => {
    await go(page, 'hc', 'dashboard');
    await page.evaluate(
        () => (document.documentElement.dataset.theme = 'dark'),
    );
    expect(
        await page
            .locator('#sidebar')
            .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe('rgb(255, 255, 255)');
    const badge = page.locator('[data-notification-count]');
    await badge.evaluate((el) => {
        el.hidden = false;
        el.textContent = '12345';
    });
    expect(await badge.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
        true,
    );
    await page.locator('.topbar [data-action=sidebar-toggle]').click();
    await expect(page.locator('body')).toHaveClass(/nav-collapsed/);
    expect((await page.locator('#sidebar').boundingBox()).width).toBe(76);
});

test('Warna komponen utama memenuhi kontras teks pada tema terang dan gelap', async ({
    page,
}) => {
    await go(page, 'hc', 'dashboard');
    for (const theme of ['light', 'dark']) {
        await page.evaluate(
            (value) => (document.documentElement.dataset.theme = value),
            theme,
        );
        const results = await page.evaluate(() => {
            const rgb = (value) => {
                if (value.startsWith('color(srgb'))
                    return value
                        .match(/[\d.]+/g)
                        .slice(0, 3)
                        .map((v) => +v * 255);
                return value
                    .match(/[\d.]+/g)
                    .slice(0, 3)
                    .map(Number);
            };
            const lum = (v) =>
                rgb(v)
                    .map((n) => {
                        n /= 255;
                        return n <= 0.04045
                            ? n / 12.92
                            : ((n + 0.055) / 1.055) ** 2.4;
                    })
                    .reduce(
                        (sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i],
                        0,
                    );
            const selectors = [
                '#sidebar .nav-link.active',
                '.dashboard-heading .btn-primary',
                '.top-title',
                '.dashboard-metrics .figure-label',
                '.dashboard-metrics .figure-value',
            ];
            return selectors.flatMap((selector) =>
                [...document.querySelectorAll(selector)].map((el) => {
                    const style = getComputedStyle(el);
                    let parent = el,
                        background;
                    while (parent) {
                        background = getComputedStyle(parent).backgroundColor;
                        if (
                            background !== 'rgba(0, 0, 0, 0)' &&
                            background !== 'transparent'
                        )
                            break;
                        parent = parent.parentElement;
                    }
                    const a = lum(style.color),
                        b = lum(background);
                    return {
                        selector,
                        ratio:
                            (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
                    };
                }),
            );
        });
        for (const result of results)
            expect(
                result.ratio,
                theme + ': ' + result.selector,
            ).toBeGreaterThanOrEqual(4.5);
    }
});

test('Kontrol navbar tidak saling menimpa dan tombol utama ponsel mudah disentuh', async ({
    page,
}) => {
    for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await go(page, 'hc', 'dashboard');
        const controls = await page
            .locator('.topbar > button')
            .evaluateAll((els) =>
                els
                    .map((el) => {
                        const r = el.getBoundingClientRect();
                        return {
                            x: r.x,
                            right: r.right,
                            width: r.width,
                            height: r.height,
                        };
                    })
                    .filter((r) => r.width > 0 && r.height > 0),
            );
        for (const r of controls) {
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.right).toBeLessThanOrEqual(width + 1);
            if (width <= 600) expect(r.height).toBeGreaterThanOrEqual(44);
        }
        for (let i = 1; i < controls.length; i++)
            expect(controls[i].x).toBeGreaterThanOrEqual(controls[i - 1].right);
        if (width <= 600)
            expect(
                (
                    await page
                        .locator('.dashboard-heading .btn-primary')
                        .boundingBox()
                ).height,
            ).toBeGreaterThanOrEqual(44);
    }
});
