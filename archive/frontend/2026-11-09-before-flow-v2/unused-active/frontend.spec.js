import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const screens = JSON.parse(
    fs.readFileSync('resources/data/abprove-screens.json', 'utf8'),
);
const route = (s) =>
    `/design-review/${s.role}/${s.view}${s.state ? `?state=${s.state}` : ''}`;
const shot = (page, name) =>
    page.screenshot({
        path: `docs/frontend/abprove-blade/screenshots/${name}.png`,
    });
test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.__errors = errors;
});
test.afterEach(async ({ page }) => {
    expect(page.__errors).toEqual([]);
});
for (const screen of screens)
    test(`Blade ${screen.id}`, async ({ page }) => {
        const response = await page.goto(route(screen));
        expect(response.status()).toBe(200);
        await expect(page.locator('html')).toHaveAttribute(
            'data-frontend-ready',
            'true',
        );
        await expect(page.locator('body')).toHaveAttribute(
            'data-frontend-stack',
            'blade-tailwind',
        );
        if (screen.role !== 'login') {
            await expect(page.locator('#sidebar')).toBeVisible();
            expect(
                await page.locator('[x-data],[x-show],[x-model]').count(),
            ).toBe(0);
        }
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
        ).toBe(true);
        expect(
            (
                await page.request.get('/design-reference/' + screen.reference)
            ).status(),
        ).toBe(200);
        await shot(page, screen.id);
    });
test('all additional role pages render and links stay in their role', async ({
    page,
}) => {
    for (const [role, views] of Object.entries({
        ku: ['tim', 'notifikasi'],
        kd: ['nilai-kepala', 'tim', 'notifikasi'],
        hc: ['struktur', 'akun', 'jabatan', 'aktivitas', 'impor', 'notifikasi'],
    }))
        for (const view of views) {
            expect(
                (await page.goto(`/design-review/${role}/${view}`)).status(),
            ).toBe(200);
            await expect(page.locator('html')).toHaveAttribute(
                'data-frontend-ready',
                'true',
            );
            const links = await page
                .locator('#sidebar a')
                .evaluateAll((elements) =>
                    elements.map((e) => e.getAttribute('href')),
                );
            expect(
                links.every((link) => link.includes(`/design-review/${role}/`)),
            ).toBe(true);
        }
});
test('KU validates integer scores, draft persists, submits, withdraws', async ({
    page,
}) => {
    const writes = [];
    page.on('request', (r) => {
        if (r.method() !== 'GET') writes.push(r.url());
    });
    await page.goto('/design-review/ku/nilai?person=E03');
    const editor = page.locator('[data-editor="E03"]');
    await editor.locator('[data-score="0"]').fill('9');
    await editor.locator('[data-action="save-draft"]').click();
    await expect(editor.locator('[data-editor-error]')).toContainText('10–100');
    await editor.locator('[data-score="0"]').fill('90.5');
    await editor.locator('[data-action="save-draft"]').click();
    await expect(editor.locator('[data-score="0"]')).toHaveAttribute(
        'aria-invalid',
        'true',
    );
    for (const input of await editor.locator('[data-score]').all())
        await input.fill('90');
    await editor.locator('[data-finding="pos"]').fill('Contoh audit');
    await editor.locator('[data-action="save-draft"]').click();
    await expect(editor.locator('[data-status]')).toHaveText('Draft');
    await page.reload();
    await expect(editor.locator('[data-score="0"]')).toHaveValue('90');
    await expect(editor.locator('[data-score-total]')).toHaveText('90,00');
    await editor.locator('[data-action="submit-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await expect(editor.locator('[data-status]')).toHaveText('Diajukan');
    await expect(editor.locator('[data-score="0"]')).toBeHidden();
    await editor.locator('[data-action="withdraw-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await expect(editor.locator('[data-score="0"]')).toBeVisible();
    expect(writes).toEqual([]);
});
test('KD returns with reason, cannot change member numbers, then sets Final', async ({
    page,
}) => {
    await page.goto('/design-review/kd/persetujuan');
    const row = page.locator('[data-assessment-list] [data-person="E05"]');
    await row.locator('[data-review-person]').click();
    const drawer = page.locator('#review-dialog');
    await expect(drawer).toBeVisible();
    expect(await drawer.locator('[data-score]').count()).toBe(0);
    await drawer.locator('[data-action="return-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await expect(page.locator('[data-confirm-error]')).toBeVisible();
    await page.locator('[data-confirm-reason]').fill('Periksa temuan contoh');
    await page.locator('[data-action="confirm-submit"]').click();
    await page.goto('/design-review/ku/nilai?person=E05');
    const editor = page.locator('[data-editor="E05"]');
    await expect(editor.locator('[data-note-value]')).toHaveText(
        'Periksa temuan contoh',
    );
    await editor.locator('[data-action="submit-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await page.goto('/design-review/kd/persetujuan');
    await row.locator('[data-review-person]').click();
    await drawer.locator('[data-action="approve-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await page.goto('/design-review/ku/nilai?person=E05');
    await expect(editor.locator('[data-status]')).toHaveText('Final');
    await expect(editor.locator('[data-action="save-draft"]')).toBeHidden();
    await expect(editor.locator('[data-final-note]')).toBeVisible();
    await page.goto('/design-review/hc/rekap');
    expect(
        await page.locator('[data-action="finalize-selected"]').count(),
    ).toBe(0);
    await page.getByRole('tab', { name: /^Semua/ }).click();
    await expect(page.locator('[data-person="E05"] [data-status]')).toHaveText(
        'Final',
    );
});
test('KD fills and finalizes unit head scores', async ({ page }) => {
    await page.goto('/design-review/kd/nilai-kepala');
    const editor = page.locator('[data-editor]:visible');
    for (const input of await editor.locator('[data-score]').all())
        await input.fill('85');
    await editor.locator('[data-action="submit-assessment"]').click();
    await page.locator('[data-action="confirm-submit"]').click();
    await expect(editor.locator('[data-status]')).toHaveText('Final');
});
test('filters, empty state, period lock and comparison history', async ({
    page,
}) => {
    await page.goto('/design-review/hc/rekap');
    await page.getByRole('tab', { name: /^Semua/ }).click();
    await page.locator('[data-list-filter="search"]').fill('tidak-ada');
    await expect(page.locator('[data-list-empty]')).toBeVisible();
    await page.goto('/design-review/ku/nilai?month=0');
    await expect(
        page.locator('[data-editor]:visible [data-action="save-draft"]'),
    ).toBeHidden();
    await page.goto('/design-review/ku/riwayat');
    await page
        .locator('[data-history-person="E01"][data-history-month="0"]')
        .click();
    await expect(page.locator('#review-dialog')).toBeVisible();
    await expect(page.locator('[data-review-month]')).toHaveText(
        'Januari 2026',
    );
});
test('HC management, settings validation, profile, template and placement', async ({
    page,
}) => {
    const writes = [];
    page.on('request', (r) => {
        if (r.method() !== 'GET') writes.push(r.url());
    });
    await page.goto('/design-review/hc/karyawan');
    await page.locator('[data-action="new-employee"]').click();
    const form = page.locator('#employee-form');
    await form.locator('[name="name"]').fill('Karyawan audit lokal');
    await form.locator('[name="nip"]').fill('AUDIT001');
    await form.locator('[name="job"]').fill('Staf IT');
    await page
        .getByRole('button', { name: 'Simpan karyawan', exact: true })
        .click();
    await expect(page.locator('[data-employees-body]')).toContainText(
        'Karyawan audit lokal',
    );
    await page.reload();
    await expect(page.locator('[data-employees-body]')).toContainText(
        'Karyawan audit lokal',
    );
    await page.goto('/design-review/hc/pengaturan');
    await page.locator('[name="sb"]').fill('60');
    await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
    await expect(page.locator('[data-form-error]')).toContainText('berurutan');
    await page.goto('/design-review/hc/profil');
    await page.locator('[name="name"]').fill('Rina Audit');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('h2[data-profile-name]')).toHaveText(
        'Rina Audit',
    );
    await page.goto('/design-review/hc/kpi');
    const panel = page.locator('[data-template-panel="GP"]');
    await panel.locator('[data-kpi-field="6"]').first().fill('99');
    await page.locator('[data-action="save-template"]').click();
    await expect(page.locator('#toast-stack')).toContainText('total 100%');
    await page.goto('/design-review/hc/penempatan?state=placement');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('[data-form-error]')).toContainText(
        'Pilih minimal',
    );
    await page.locator('[name="employees"][value="E01"]').check();
    await page.locator('#placement-form [name="from"]').selectOption('11');
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expect(page.locator('[data-placement-history]')).toContainText(
        'Desember',
    );
    expect(writes).toEqual([]);
});
test('CSV preview validation and valid XLSX download', async ({ page }) => {
    await page.goto('/design-review/hc/kpi');
    await page.locator('[data-dialog-open="import-dialog"]').click();
    await page.locator('[data-import-file]').setInputFiles({
        name: 'audit.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            'Pilar,KPI,Numerator,Denominator,Formula,Target,Bobot\nTechnical Care,Audit,,,,100%,100\n',
        ),
    });
    await expect(page.locator('[data-import-preview]')).toContainText(
        '1 KPI valid',
    );
    await page.locator('[data-action="import-template"]').click();
    await page.goto('/design-review/hc/rekap?state=export');
    const download = page.waitForEvent('download');
    await page.locator('[data-action="download-export"]').click();
    const file = await download;
    const bytes = fs.readFileSync(await file.path());
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.includes(Buffer.from('xl/workbook.xml'))).toBe(true);
    await file.saveAs('docs/frontend/abprove-blade/KPI_audit.xlsx');
});
test('native dialogs, keyboard search, sidebar and persisted dark theme', async ({
    page,
}) => {
    await page.goto('/design-review/ku/beranda');
    await page.keyboard.press('Control+k');
    await expect(page.locator('#search-dialog')).toBeVisible();
    await page.locator('[data-global-search]').fill('tidak-ada');
    await expect(page.locator('[data-search-empty]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-dialog')).toBeHidden();
    await page.locator('[data-action="sidebar-toggle"]').first().click();
    await expect(page.locator('body')).toHaveClass(/nav-collapsed/);
    await page.locator('[data-dialog-open="account-dialog"]').click();
    await page.locator('[data-theme-choice="dark"]').click();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await shot(page, 'ku-dark');
});
for (const width of [390, 1024])
    for (const role of ['ku', 'kd', 'hc'])
        test(`${role} responsive ${width}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(`/design-review/${role}/beranda`);
            await expect(page.locator('html')).toHaveAttribute(
                'data-frontend-ready',
                'true',
            );
            expect(
                await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <= innerWidth + 1,
                ),
            ).toBe(true);
            if (width === 390) {
                await page
                    .getByRole('button', { name: 'Menu lainnya' })
                    .click();
                await expect(page.locator('#sidebar')).toBeVisible();
                await page.keyboard.press('Escape');
                await expect(page.locator('#sidebar')).toBeHidden();
            }
            await shot(page, `${role}-${width}`);
        });
test('mobile score cards and drawer stay in viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/design-review/ku/nilai');
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
    ).toBe(true);
    await shot(page, 'ku-score-mobile');
    await page.goto('/design-review/kd/persetujuan?state=review');
    const box = await page.locator('#review-dialog').boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    await shot(page, 'kd-review-mobile');
});
test('audit selector opens actual Blade screens and original images', async ({
    page,
}) => {
    await page.goto('/design-review');
    await page.locator('[data-audit-screen="hc-add-head"]').click();
    await expect(page.locator('#audit-frame')).toHaveAttribute(
        'src',
        '/design-review/hc/karyawan?state=head',
    );
    await expect(
        page.frameLocator('#audit-frame').locator('#head-dialog'),
    ).toBeVisible();
    await page.locator('[data-audit-mode="reference"]').click();
    await expect(page.locator('#audit-reference')).toBeVisible();
    await expect(page.locator('#audit-frame-wrap')).toBeHidden();
});
test('audit login is local and password recovery does not send email', async ({
    page,
}) => {
    await page.goto('/design-review/login/masuk');
    await page.locator('#identifier').fill('salah');
    await page.locator('#password').fill('salah');
    await page.locator('[data-login-submit]').click();
    await expect(page.locator('[data-login-error]')).toBeVisible();
    const accounts = JSON.parse(
            await page.locator('#review-accounts').textContent(),
        ),
        account = accounts.find((a) => a.role === 'ku');
    await page.locator('#identifier').fill(account.email);
    await page.locator('#password').fill('Agus#2026');
    await page.locator('[data-login-submit]').click();
    await expect(page).toHaveURL(/\/ku\/beranda/);
    await page.goto('/design-review/login/lupa');
    await page.locator('#forgot-identifier').fill('audit@example.test');
    await page.getByRole('button', { name: 'Kirim petunjuk' }).click();
    await expect(page.locator('[data-forgot-sent]')).toContainText(
        'tidak mengirim email',
    );
});

test('audit accounts keep their own unit or division across navigation', async ({
    page,
}) => {
    const fixture = JSON.parse(
        fs.readFileSync('resources/data/abprove-demo.json', 'utf8'),
    );
    for (const account of fixture.accounts) {
        await page.goto(
            `/design-review/${account.role}/beranda?account=${encodeURIComponent(account.key)}`,
        );
        await expect(page.locator('html')).toHaveAttribute(
            'data-frontend-ready',
            'true',
        );
        const config = JSON.parse(
            await page.locator('#kpi-config').textContent(),
        );
        expect(config.actor.nama).toBe(account.nama);
        const units = account.unit
            ? [account.unit]
            : fixture.units
                  .filter((u) => !account.div || u.div === account.div)
                  .map((u) => u.id);
        expect(config.people.every((p) => units.includes(p.unit))).toBe(true);
        expect(
            await page.locator('#sidebar a').first().getAttribute('href'),
        ).toContain(`account=${encodeURIComponent(account.key)}`);
    }
});
