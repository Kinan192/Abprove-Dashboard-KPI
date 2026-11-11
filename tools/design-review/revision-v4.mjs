import { chromium } from '@playwright/test';
import fs from 'node:fs';
const origin = 'http://127.0.0.1:8000',
    out = 'docs/frontend/role-refinement';
fs.mkdirSync(out + '/screenshots', { recursive: true });
const password = JSON.parse(
    fs.readFileSync('storage/app/private/local-demo-accounts.json', 'utf8'),
).password;
const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const report = { pages: [], panels: [], errors: [] };
try {
    for (const [role, email, prefix] of [
        ['ku', 'ku.it@kpi.test', 'unit'],
        ['kd', 'kd.umum@kpi.test', 'division'],
        ['hc', 'hc.demo@kpi.test', 'hc'],
    ]) {
        const context = await browser.newContext({ baseURL: origin });
        const page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on('pageerror', (e) =>
            report.errors.push({ role, message: e.message }),
        );
        await page.goto('/login');
        await page.locator('[name=identifier]').fill(email);
        await page.locator('[name=password]').fill(password);
        await Promise.all([
            page.waitForURL('**/' + prefix + '/dashboard'),
            page.locator('[data-login-submit]').click(),
        ]);
        await page.waitForFunction(
            () => document.documentElement.dataset.frontendReady === 'true',
        );
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
                const response = await page.goto(url);
                await page.waitForFunction(
                    () =>
                        document.documentElement.dataset.frontendReady ===
                        'true',
                );
                if (await page.locator('[data-insights-root]').count())
                    await page.waitForFunction(
                        () =>
                            document.documentElement.dataset.insightsReady ===
                            'true',
                    );
                const dimensions = await page.evaluate(() => ({
                    x: document.documentElement.scrollWidth - innerWidth,
                    mainX:
                        document.querySelector('main').scrollWidth -
                        document.querySelector('main').clientWidth,
                    mainY:
                        document.querySelector('main').scrollHeight -
                        document.querySelector('main').clientHeight,
                }));
                report.pages.push({
                    role,
                    page: name,
                    width,
                    height,
                    status: response.status(),
                    ...dimensions,
                });
                if (
                    [
                        'beranda',
                        'dashboard',
                        'kpi',
                        'struktur',
                        'riwayat',
                    ].includes(name)
                )
                    await page.screenshot({
                        path: `${out}/screenshots/${role}-${name}-${width}.png`,
                    });
                if (role === 'ku' && name === 'pengajuan' && width === 1440)
                    report.statusColors = await page
                        .locator('[data-assessment-body] [data-status]')
                        .evaluateAll((es) =>
                            Object.fromEntries(
                                es.map((e) => [
                                    e.dataset.status,
                                    getComputedStyle(e).color,
                                ]),
                            ),
                        );
                for (const tab of await page
                    .locator('.workspace-tabs [data-panel-tab]')
                    .all()) {
                    await tab.click();
                    await page.waitForTimeout(120);
                    const panel = await tab.getAttribute('data-panel-tab');
                    const measure = await page.evaluate(() => ({
                        x: document.documentElement.scrollWidth - innerWidth,
                        mainX:
                            document.querySelector('main').scrollWidth -
                            document.querySelector('main').clientWidth,
                        mainY:
                            document.querySelector('main').scrollHeight -
                            document.querySelector('main').clientHeight,
                    }));
                    report.panels.push({
                        role,
                        page: name,
                        panel,
                        width,
                        height,
                        ...measure,
                    });
                    if (width === 1440 || name === 'profil')
                        await page.screenshot({
                            path: `${out}/screenshots/${role}-${name}-${panel}-${width}.png`,
                        });
                }
            }
        }
        await context.close();
    }
} finally {
    await browser.close();
    fs.writeFileSync(
        out + '/visual-report.json',
        JSON.stringify(report, null, 2),
    );
}
console.log(
    JSON.stringify({
        pages: report.pages.length,
        panels: report.panels.length,
        errors: report.errors,
        overflow: [...report.pages, ...report.panels].filter(
            (p) => p.x > 1 || p.mainX > 1,
        ),
        desktopVertical: report.panels.filter(
            (p) => p.width === 1440 && p.mainY > 1,
        ),
    }),
);
if (
    report.errors.length ||
    report.pages.some((p) => p.status !== 200) ||
    [...report.pages, ...report.panels].some((p) => p.x > 1 || p.mainX > 1) ||
    report.panels.some(
        (p) => p.page === 'profil' && p.width === 1440 && p.mainY > 1,
    )
)
    process.exitCode = 1;
