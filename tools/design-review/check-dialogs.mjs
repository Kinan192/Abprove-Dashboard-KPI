import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    }),
    page = await browser.newPage();
await page.clock.setFixedTime(new Date('2026-11-09T10:00:00Z'));
const checks = [
    ['review', 'kd', 'persetujuan?person=E05', null],
    ['cycle', 'hc', 'pengaturan', '[data-flow-action="new-cycle"]'],
    ['indicator', 'hc', 'kpi', '[data-kpi-body] [data-indicator-edit]'],
    ['search', 'hc', 'rekap', 'keyboard'],
    [
        'notifications',
        'hc',
        'rekap',
        '[data-dialog-open="notification-dialog"]',
    ],
];
const results = [];
try {
    for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({
            width,
            height: width === 1440 ? 900 : width === 1024 ? 768 : 844,
        });
        for (const [name, role, path, click] of checks) {
            await page.goto(
                'http://127.0.0.1:8008/design-review/' + role + '/' + path,
            );
            if (click === 'keyboard') await page.keyboard.press('Control+k');
            else if (click) await page.locator(click).first().click();
            const metric = await page
                .locator('dialog:modal .dialog-body')
                .evaluate((e) => ({
                    x: e.scrollWidth - e.clientWidth,
                    y: e.scrollHeight - e.clientHeight,
                }));
            results.push({ width, name, ...metric });
            if (name === 'review')
                await page.screenshot({
                    path:
                        'docs/frontend/compact-crud/screenshots/review-' +
                        width +
                        '.png',
                });
        }
    }
    fs.writeFileSync(
        'docs/frontend/compact-crud/dialog-layout.json',
        JSON.stringify(results, null, 2),
    );
    console.log(
        JSON.stringify({
            checks: results.length,
            horizontalOverflow: results.filter((r) => r.x),
            verticalOverflow: results.filter((r) => r.y),
        }),
    );
    if (results.some((r) => r.x || r.y)) process.exitCode = 1;
} finally {
    await browser.close();
}
