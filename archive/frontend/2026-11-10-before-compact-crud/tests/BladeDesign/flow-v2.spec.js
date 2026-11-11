import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const pages = {
    ku: [
        'beranda',
        'nilai',
        'pengajuan',
        'riwayat',
        'kpi',
        'tim',
        'panduan',
        'profil',
        'notifikasi',
    ],
    kd: [
        'beranda',
        'persetujuan',
        'dashboard',
        'kpi',
        'nilai-kepala',
        'tim',
        'panduan',
        'profil',
        'notifikasi',
    ],
    hc: [
        'beranda',
        'rekap',
        'dashboard',
        'karyawan',
        'struktur',
        'akun',
        'jabatan',
        'kpi',
        'penempatan',
        'pengaturan',
        'aktivitas',
        'impor',
        'panduan',
        'profil',
        'notifikasi',
    ],
};
const base = (role, page, query = '') =>
    `/design-review/${role}/${page}${query ? '?' + query : ''}`;
const confirm = async (page) =>
    page.locator('#confirm-dialog [data-action="confirm-submit"]').click();
const state = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('abprove-flow-v2')));
const shot = (page, name) =>
    page.screenshot({ path: `docs/frontend/flow-v2/screenshots/${name}.png` });
async function fillScores(page, value = '90') {
    for (const input of await page
        .locator('[data-score-mount] [data-score]')
        .all())
        await input.fill(value);
}
async function entity(page, kind, values) {
    const path = {
        account: 'akun',
        position: 'jabatan',
        division: 'struktur',
        unit: 'struktur',
        staff: 'karyawan',
    }[kind];
    await page.goto(base('hc', path));
    await page.locator(`[data-entity-new="${kind}"]`).click();
    const form = page.locator('#entity-form');
    for (const [key, value] of Object.entries(values)) {
        const el = form.locator(`[name="${key}"]`);
        if (await el.evaluate((e) => e.tagName === 'SELECT'))
            await el.selectOption(value);
        else await el.fill(value);
    }
    await page.locator('button[form="entity-form"]').click();
    await confirm(page);
    await expect(page.locator('#entity-dialog')).toBeHidden();
}
test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-09T10:00:00Z'));
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
    for (const view of views)
        test(`${role} / ${view}`, async ({ page }) => {
            const response = await page.goto(base(role, view));
            expect(response.status()).toBe(200);
            await expect(page.locator('html')).toHaveAttribute(
                'data-frontend-ready',
                'true',
            );
            expect(await page.locator('body').innerText()).not.toMatch(
                /\bdraft\b/i,
            );
            expect(
                await page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <= innerWidth + 1,
                ),
            ).toBe(true);
            if (view === 'kpi' && role !== 'hc') {
                expect(
                    await page
                        .locator('[data-kpi-body] input,[data-kpi-body] select')
                        .count(),
                ).toBe(0);
                await expect(page.locator('[data-kpi-weight]')).toHaveText(
                    '100',
                );
            }
            await shot(page, `${role}-${view}`);
        });
test('login and forgotten password render', async ({ page }) => {
    for (const view of ['masuk', 'lupa'])
        expect((await page.goto(base('login', view))).status()).toBe(200);
    await page.locator('#forgot-identifier').fill('audit@example.test');
    await page.getByRole('button', { name: 'Kirim petunjuk' }).click();
    await expect(page.locator('[data-forgot-sent]')).toBeVisible();
});
test('assessment has no persistent partial save, validates and cancels cleanly', async ({
    page,
}) => {
    await page.goto(base('ku', 'nilai', 'person=E03'));
    await expect(
        page.locator('[data-flow-action="send-assessment"]'),
    ).toBeVisible();
    await page.locator('[data-score="0"]').fill('9');
    await page.locator('[data-flow-action="send-assessment"]').click();
    await expect(page.locator('[data-score-error]')).toBeVisible();
    expect(
        await page.evaluate(() => localStorage.getItem('abprove-flow-v2')),
    ).toBeNull();
    page.once('dialog', (d) => d.accept());
    await page.reload();
    await expect(page.locator('[data-score="0"]')).toHaveValue('');
    await fillScores(page);
    await page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(page);
    await expect(page.locator('[data-score-mount] [data-status]')).toHaveText(
        'Diajukan',
    );
    await page.reload();
    await expect(page.locator('[data-score="0"]')).toBeHidden();
    await page.locator('[data-flow-action="cancel-submission"]').click();
    await confirm(page);
    await expect(page.locator('[data-score="0"]')).toHaveValue('');
    expect((await state(page)).assessments['E03|2026-11']).toBeUndefined();
});
test('KD returns with reason then approves staff directly Final', async ({
    page,
}) => {
    await page.goto(base('kd', 'persetujuan', 'person=E05'));
    const drawer = page.locator('#review-dialog');
    await expect(drawer).toBeVisible();
    expect(await drawer.locator('[data-score]:visible').count()).toBe(0);
    await drawer.locator('[data-flow-action="return"]').click();
    await confirm(page);
    await expect(page.locator('[data-confirm-error]')).toBeVisible();
    await page.locator('[data-confirm-reason]').fill('Periksa catatan layanan');
    await confirm(page);
    await page.goto(base('ku', 'nilai', 'person=E05'));
    await expect(page.locator('[data-return-reason]')).toContainText(
        'Periksa catatan layanan',
    );
    await page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(page);
    await page.goto(base('kd', 'persetujuan', 'person=E05'));
    await drawer.locator('[data-flow-action="final"]').click();
    await confirm(page);
    await page.goto(base('ku', 'nilai', 'person=E05'));
    await expect(page.locator('[data-score-mount] [data-status]')).toHaveText(
        'Final',
    );
    await expect(
        page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
});
test('head assessment uses division KPI and enters HC recap and Final analytics', async ({
    page,
}) => {
    await page.goto(base('kd', 'nilai-kepala'));
    await expect(page.locator('[data-template-meta]')).toContainText(
        'KPI Kepala Unit - Divisi Pelayanan Medis',
    );
    await fillScores(page, '95');
    await page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(page);
    await expect(page.locator('[data-score-mount] [data-status]')).toHaveText(
        'Final',
    );
    await page.goto(base('hc', 'rekap'));
    await page.locator('[data-filter="type"]').selectOption('unit_head');
    await expect(page.locator('[data-assessment-body]')).toContainText('Final');
    await page.goto(base('hc', 'dashboard'));
    await page.locator('[data-filter="type"]').selectOption('unit_head');
    await expect(page.locator('[data-analytic="final"]')).toHaveText('1');
    await expect(page.locator('[data-analytic="average"]')).toHaveText('95,00');
});
test('complete setup from empty: accounts -> jobs -> areas -> staff -> KPIs -> cycle -> both Final types', async ({
    page,
}) => {
    await page.goto(base('hc', 'pengaturan'));
    await page.locator('[data-flow-action="empty-preview"]').click();
    await confirm(page);
    await expect(page).toHaveURL(/\/akun/);
    await entity(page, 'account', {
        name: 'Kepala Divisi Audit',
        nip: 'KD-AUDIT',
        email: 'kd.audit@example.test',
        role: 'kd',
        password: 'AuditPass123456',
    });
    await entity(page, 'account', {
        name: 'Kepala Unit Audit',
        nip: 'KU-AUDIT',
        email: 'ku.audit@example.test',
        role: 'ku',
        password: 'AuditPass123456',
    });
    let data = await state(page);
    const kd = data.accounts.find((a) => a.role === 'kd'),
        ku = data.accounts.find((a) => a.role === 'ku');
    expect(JSON.stringify(data)).not.toContain('AuditPass123456');
    await entity(page, 'position', { name: 'Staf IT', code: 'IT-STAF' });
    data = await state(page);
    const position = data.positions[0];
    await entity(page, 'division', {
        name: 'Divisi Umum dan SDM',
        code: 'UMUM',
        headId: kd.id,
    });
    data = await state(page);
    const division = data.divisions[0];
    await entity(page, 'unit', {
        name: 'Unit IT',
        code: 'IT',
        divisionId: division.id,
        headId: ku.id,
    });
    data = await state(page);
    const unit = data.units[0];
    await page.goto(base('hc', 'karyawan'));
    await page.locator('[data-entity-new="staff"]').click();
    await expect(page.locator('#entity-form [name="password"]')).toBeHidden();
    await expect(page.locator('#entity-form [name="email"]')).toBeDisabled();
    await page.keyboard.press('Escape');
    await entity(page, 'staff', {
        name: 'Staf Audit',
        nip: 'STAF-AUDIT',
        positionId: position.id,
        unitId: unit.id,
    });
    data = await state(page);
    expect(data.accounts).toHaveLength(3);
    expect(data.staff).toHaveLength(1);
    await page.goto(base('hc', 'kpi'));
    await page.locator('[data-kpi-field="name"]').fill('Kepatuhan layanan IT');
    await page.locator('[data-kpi-field="target"]').fill('100%');
    await page.locator('[data-flow-action="apply-kpi"]').click();
    await confirm(page);
    await page.locator('[data-kpi-level="division"]').click();
    await page.locator('[data-kpi-field="name"]').fill('Kepemimpinan unit');
    await page.locator('[data-kpi-field="target"]').fill('100%');
    await page.locator('[data-flow-action="apply-kpi"]').click();
    await confirm(page);
    await page.goto(base('hc', 'pengaturan'));
    await page.locator('[data-flow-action="new-cycle"]').click();
    const form = page.locator('#cycle-form');
    for (const [name, value] of Object.entries({
        month: '2026-11',
        opens: '2026-11-01T00:00',
        submission: '2026-12-05T23:59',
        approval: '2026-12-10T23:59',
        closes: '2026-12-15T23:59',
    }))
        await form.locator(`[name="${name}"]`).fill(value);
    await form.locator('[name="status"]').selectOption('open');
    await page.locator('button[form="cycle-form"]').click();
    await confirm(page);
    await page.goto(base('ku', 'nilai', `account=${ku.id}`));
    await expect(page.locator('[data-kpi-name]')).toHaveText(
        'Kepatuhan layanan IT',
    );
    await fillScores(page);
    await page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(page);
    await page.goto(base('kd', 'persetujuan', `account=${kd.id}`));
    await page.locator('[data-review-person]').click();
    await page.locator('[data-flow-action="final"]').click();
    await confirm(page);
    await page.goto(base('kd', 'nilai-kepala', `account=${kd.id}`));
    await expect(page.locator('[data-kpi-name]')).toHaveText(
        'Kepemimpinan unit',
    );
    await fillScores(page, '95');
    await page.locator('[data-flow-action="send-assessment"]').click();
    await confirm(page);
    await page.goto(base('hc', 'rekap'));
    await expect(
        page.locator('[data-assessment-body] [data-status="Final"]'),
    ).toHaveCount(2);
    data = await state(page);
    expect(
        Object.values(data.assessments).every((a) => a.status === 'Final'),
    ).toBe(true);
    await shot(page, 'empty-to-final-recap');
});
test('unit creation requires existing eligible account and staff transfer guards pending work', async ({
    page,
}) => {
    await page.goto(base('hc', 'struktur'));
    await page.locator('[data-entity-new="unit"]').click();
    expect(
        await page.locator('#entity-form [name="headId"] option').count(),
    ).toBe(1);
    await expect(page.locator('[data-head-help]')).toContainText('KU aktif');
    await page.keyboard.press('Escape');
    await page.goto(base('hc', 'karyawan'));
    await page.locator('[data-transfer="E05"]').click();
    await page.locator('#transfer-form [name="unitId"]').selectOption('RI');
    await page.locator('#transfer-form [name="reason"]').fill('Pindah tugas');
    await page.locator('button[form="transfer-form"]').click();
    await expect(
        page.locator('#transfer-form [data-form-error]'),
    ).toContainText('non-Final');
});
test('KPI validates weights, creates future version and keeps Final snapshot', async ({
    page,
}) => {
    await page.goto(base('hc', 'kpi'));
    await page.locator('[data-kpi-field="weight"]').first().fill('99');
    await page.locator('[data-flow-action="apply-kpi"]').click();
    await expect(page.locator('[data-kpi-error]')).toContainText('100%');
    await page.locator('[data-kpi-field="weight"]').first().fill('15');
    await page.locator('[data-kpi-editor] [name="from"]').fill('2026-12');
    await page.locator('[data-flow-action="apply-kpi"]').click();
    await confirm(page);
    const data = await state(page);
    expect(
        data.kpis.filter((k) => k.level === 'unit' && k.areaId === 'UGD'),
    ).toHaveLength(2);
    expect(data.assessments['E02|2026-11'].status).toBe('Final');
    await page.goto(base('ku', 'kpi', 'cycle=2026-12'));
    await expect(page.locator('[data-kpi-version-label]')).toContainText(
        'Versi 2',
    );
});
test('filters and export respect assessment type, status and search', async ({
    page,
}) => {
    await page.goto(base('hc', 'rekap'));
    await page.locator('[data-filter="search"]').fill('dr. Budi Santoso');
    await page.locator('[data-dialog-open="export-dialog"]').first().click();
    await expect(page.locator('[data-export-summary]')).toContainText(
        '1 orang',
    );
    const event = page.waitForEvent('download');
    await page.locator('[data-flow-action="download-export"]').click();
    const file = await event;
    const bytes = fs.readFileSync(await file.path());
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.includes(Buffer.from('dr. Budi Santoso'))).toBe(true);
    expect(bytes.includes(Buffer.from('dr. Ratna Sari'))).toBe(false);
    await file.saveAs('docs/frontend/flow-v2/KPI_filtered.xlsx');
});
test('analytics counts only Final and search empty state', async ({ page }) => {
    await page.goto(base('hc', 'dashboard'));
    await expect(page.locator('[data-analytic="final"]')).toHaveText('5');
    await page.locator('[data-filter="type"]').selectOption('unit_head');
    await expect(page.locator('[data-analytic="final"]')).toHaveText('0');
    await page.goto(base('ku', 'pengajuan'));
    await page.locator('[data-filter="search"]').fill('tidak-ada');
    await expect(page.locator('[data-assessment-body]')).toContainText(
        'Tidak ada penilaian',
    );
});
test('cycle close locks input and activity is recorded', async ({ page }) => {
    await page.goto(base('hc', 'pengaturan'));
    await page.locator('[data-cycle-close="2026-11"]').click();
    await confirm(page);
    await page.goto(base('ku', 'nilai', 'person=E03'));
    await expect(
        page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
    await expect(page.locator('[data-lock-reason]')).toContainText('ditutup');
    await page.goto(base('hc', 'aktivitas'));
    await expect(page.locator('[data-flow-activities]')).toContainText(
        'Tutup periode',
    );
});
for (const width of [390, 1024])
    for (const role of ['ku', 'kd', 'hc'])
        test(`${role} responsive ${width}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(base(role, 'beranda'));
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
test('mobile editor and native search, account theme', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base('ku', 'nilai', 'person=E03'));
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
    ).toBe(true);
    await shot(page, 'mobile-score');
    await page.keyboard.press('Control+k');
    await page.locator('[data-flow-search]').fill('tidak-ada');
    await expect(page.locator('[data-search-results]')).toContainText(
        'Tidak ada',
    );
    await page.keyboard.press('Escape');
    await page.locator('[data-dialog-open="account-dialog"]').click();
    await page.locator('[data-theme-choice="dark"]').click();
    await page.keyboard.press('Escape');
    await shot(page, 'mobile-dark');
});

test('profile and navbar preserve each review account scope', async ({
    page,
}) => {
    const fixture = JSON.parse(
        fs.readFileSync('resources/data/abprove-demo.json', 'utf8'),
    );
    for (const account of fixture.accounts) {
        await page.goto(
            base(
                account.role,
                'profil',
                `account=${encodeURIComponent(account.key)}`,
            ),
        );
        await expect(
            page.locator('[data-local-form="profile"] [name="name"]'),
        ).toHaveValue(account.nama);
        if (account.unit)
            await expect(
                page.locator('[data-local-form="profile"] input[readonly]'),
            ).toHaveValue(
                fixture.units.find((u) => u.id === account.unit).nama,
            );
        if (account.div)
            await expect(
                page.locator('[data-local-form="profile"] input[readonly]'),
            ).toHaveValue(
                fixture.divisions.find((d) => d.id === account.div).nama,
            );
    }
});
