import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { contrastReport } from '../../tools/design-review/contrast.mjs';
const source = fs.readFileSync(
    'frontend/abprove-preview/assets/catalog.js',
    'utf8',
);
const screens = vm.runInNewContext(source + ';ABPROVE_SCREENS;');
const evidence = path.resolve('docs/frontend/abprove-review/screenshots');
fs.mkdirSync(evidence, { recursive: true });
async function ready(page) {
    await page.waitForFunction(
        () => document.body.dataset.reviewReady === 'true',
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
}
async function noOverflow(page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
    ).toBe(true);
}
test.beforeEach(async ({ page }) => {
    page.__errors = [];
    page.__network = [];
    page.on('pageerror', (e) => page.__errors.push(e.message));
    page.on('console', (m) => {
        if (m.type() === 'error') page.__errors.push(m.text());
    });
    page.on('request', (r) => {
        if (
            !r.url().startsWith('http://127.0.0.1:4174/') &&
            !r.url().startsWith('data:') &&
            !r.url().startsWith('blob:')
        )
            page.__network.push(r.url());
    });
});
test.afterEach(async ({ page }) => {
    expect(page.__errors).toEqual([]);
    expect(page.__network).toEqual([]);
});
for (const screen of screens) {
    test(`reference ${screen.id}: ${screen.title}`, async ({ page }) => {
        await page.goto('/index.html?screen=' + screen.id);
        await ready(page);
        await noOverflow(page);
        if (screen.role !== 'login') {
            await expect(page.locator('.top h1')).toBeVisible();
            await expect(page.locator('.side')).toBeVisible();
        } else await expect(page.locator('.lg-card')).toBeVisible();
        if (screen.state && screen.state !== 'heads')
            await expect(page.locator('#drawer.on,#modal.on')).toBeVisible();
        const ref = await page.request.get('/reference/' + screen.reference);
        expect(ref.ok()).toBe(true);
        await page.screenshot({
            path: path.join(evidence, screen.id + '.png'),
            fullPage: screen.view !== 'panduan',
        });
        const contrast = await page.evaluate(contrastReport);
        fs.mkdirSync('docs/frontend/abprove-review/contrast', {
            recursive: true,
        });
        fs.writeFileSync(
            'docs/frontend/abprove-review/contrast/' + screen.id + '.json',
            JSON.stringify(contrast, null, 2),
        );
        expect(contrast.issues).toEqual([]);
    });
}
test('audit index: role, screen, comparison tabs and viewport controls', async ({
    page,
}) => {
    await page.goto('/audit.html');
    await expect(page.locator('#audit-role option')).toHaveCount(4);
    await page.locator('#audit-role').selectOption('hc');
    await page.locator('#audit-screen').selectOption('hc-add-employee');
    await expect(
        page
            .frameLocator('#audit-preview')
            .getByText('Tambah karyawan', { exact: true })
            .first(),
    ).toBeVisible();
    await page.locator('#audit-size').selectOption('390');
    await expect(page.locator('#audit-dimensions')).toHaveText('390 × 844');
    await page.getByRole('tab', { name: 'Gambar acuan', exact: true }).click();
    await expect(page.locator('.preview-pane')).toBeHidden();
    await page.getByRole('tab', { name: 'Preview', exact: true }).click();
    await expect(page.locator('.reference-pane')).toBeHidden();
    await page.getByRole('tab', { name: 'Berdampingan' }).click();
    await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
    await expect(page.locator('#audit-screen')).toHaveValue('hc-heads');
    await page.getByRole('button', { name: 'Sebelumnya', exact: true }).click();
    await expect(page.locator('#audit-screen')).toHaveValue('hc-add-employee');
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow(page);
});
test('local login, invalid feedback, forgot password and logout', async ({
    page,
}) => {
    await page.goto('/index.html');
    await ready(page);
    await page.locator('#em').fill('unknown@rs.co.id');
    await page.locator('#pw').fill('Wrong123');
    await page.locator('#lbtn').click();
    await expect(page.locator('.lg-alert')).toBeVisible();
    await page.locator('#lgLupa').click();
    await expect(page.locator('#fem')).toBeVisible();
    await page.locator('#lgBack').click();
    await page.locator('#em').fill('agus.prasetyo@rs.co.id');
    await page.locator('#pw').fill('Agus#2026');
    await page.locator('#lbtn').click();
    await expect(page.locator('.top h1')).toHaveText('Beranda');
    await page.locator('[data-act="acct"]').click();
    await expect(page.locator('#menu [data-act="asRole"]')).toHaveCount(0);
    await page.locator('#menu [data-act="logout"]').click();
    await page.locator('[data-act="doLogout"]').click();
    await expect(page.locator('#lf')).toBeVisible();
});
test('unit: navigation, edit draft, local submission and confirmation', async ({
    page,
}) => {
    await page.goto('/index.html?screen=ku-score');
    await ready(page);
    await page.locator('.score-in').first().fill('90');
    await page.locator('[data-act="draft"]').click();
    await expect(page.locator('.toast')).toContainText('Preview lokal');
    await page.locator('[data-act="submit"]').click();
    if (await page.locator('#modal.on').count())
        await page.locator('#modal.on .btn.pri').click();
    await expect
        .poll(() => page.evaluate(() => S.ev['E01|10'].status))
        .toBe('Diajukan');
    for (const view of [
        'pengajuan',
        'riwayat',
        'kpi',
        'panduan',
        'profil',
        'beranda',
    ]) {
        await page.locator(`.side [data-go="${view}"]`).click();
        await expect(page.locator('.top h1')).toBeVisible();
    }
    await page.locator('[data-act="acct"]').click();
    await page.locator('#menu [data-act="theme"][data-v="gelap"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() =>
        document.getAnimations().every((a) => a.playState !== 'running'),
    );
    await page.screenshot({ path: path.join(evidence, 'ku-dark.png') });
    const darkContrast = await page.evaluate(contrastReport);
    fs.writeFileSync(
        'docs/frontend/abprove-review/contrast/ku-dark.json',
        JSON.stringify(darkContrast, null, 2),
    );
    expect(darkContrast.issues).toEqual([]);
});
test('division review opens, remains readonly, and supports local decision', async ({
    page,
}) => {
    await page.goto('/index.html?screen=kd-review');
    await ready(page);
    await expect(page.locator('#drawer .score-in')).toHaveCount(0);
    await page.locator('#drawer [data-act="approve"]').click();
    if (await page.locator('#modal.on').count())
        await page.locator('#modal.on .btn.pri').click();
    await expect(page.locator('.toast')).toContainText('Preview lokal');
});
test('HC panels, export download, local forms and settings', async ({
    page,
}) => {
    await page.goto('/index.html?screen=hc-export');
    await ready(page);
    const download = page.waitForEvent('download');
    await page.locator('[data-act="doExport"]').click();
    expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
    await page.locator('.side [data-go="karyawan"]').click();
    await page.locator('[data-act="empNew"]').click();
    await expect(page.locator('#ef_nama')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#drawer')).not.toHaveClass(/on/);
    await page.locator('[data-act="kuNew"]').click();
    await expect(page.locator('#kf_nama')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.side [data-go="penempatan"]').click();
    await page.locator('[data-act="pzOpen"]').first().click();
    await expect(page.locator('#pzFind')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.side [data-go="pengaturan"]').click();
    await page.locator('[data-act="saveSet"]').click();
    await expect(page.locator('.toast').last()).toContainText('Preview lokal');
});
for (const role of ['ku', 'kd', 'hc'])
    for (const width of [390, 1024]) {
        test(`responsive ${role} ${width}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 844 });
            await page.goto('/index.html?screen=' + role + '-home');
            await ready(page);
            await noOverflow(page);
            if (width === 390) {
                await page.locator('.bnav [data-act="burger"]').click();
                await expect(page.locator('.side')).toBeVisible();
                await page.keyboard.press('Escape');
            }
            await page.screenshot({
                path: path.join(evidence, role + '-' + width + '.png'),
                fullPage: true,
            });
        });
    }
