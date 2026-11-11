import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

if (process.env.KPI_ISOLATED_TEST !== '1' || !process.env.KPI_E2E_STATE)
    throw new Error('Run: php tools/testing/run_frontend_tests.php');
const state = JSON.parse(fs.readFileSync(process.env.KPI_E2E_STATE, 'utf8'));
const evidence = path.resolve('docs/frontend/screenshots');
fs.mkdirSync(evidence, { recursive: true });
const password = process.env.KPI_E2E_PASSWORD;

async function login(page, role) {
    await page.goto('/login');
    await page
        .getByLabel('Email atau NIP', { exact: true })
        .fill(state.users[role].email);
    await page.getByLabel('Kata sandi', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page).toHaveURL(/\/(unit|division|hc)\/dashboard/);
    await ready(page);
}
async function ready(page) {
    await expect(page.locator('.workspace')).toBeVisible();
    await expect(page.locator('main > section > .loading')).toBeHidden();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main .notice-error:visible')).toHaveCount(0);
}
async function confirm(page, label) {
    const dialog = page.locator('dialog[data-confirm]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: label, exact: true }).click();
    await expect(dialog).not.toBeVisible();
}
async function noOverflow(page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true);
    expect(
        await page
            .locator('.workspace')
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
}

test.beforeEach(async ({ page }) => {
    page.__errors = [];
    page.on('pageerror', (error) => page.__errors.push(error.message));
    page.on('console', (message) => {
        if (
            message.type() === 'error' &&
            !message.text().startsWith('Failed to load resource')
        )
            page.__errors.push(message.text());
    });
});
test.afterEach(async ({ page }) => {
    expect(page.__errors).toEqual([]);
});

test('login: reference layout, password toggle and invalid credentials', async ({
    page,
}) => {
    await page.goto('/login');
    await expect(
        page.getByRole('heading', { name: 'Masuk ke akun Anda' }),
    ).toBeVisible();
    await page.screenshot({ path: path.join(evidence, 'login-desktop.png') });
    await page.getByLabel('Kata sandi', { exact: true }).fill('incorrect');
    await page.getByRole('button', { name: 'Tampilkan kata sandi' }).click();
    await expect(
        page.getByLabel('Kata sandi', { exact: true }),
    ).toHaveAttribute('type', 'text');
    await page
        .getByLabel('Email atau NIP', { exact: true })
        .fill('unknown@example.test');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
});

test('unit: every menu, global navigation, profile, help and keyboard dialogs', async ({
    page,
}) => {
    await login(page, 'ku1');
    await page.screenshot({
        path: path.join(evidence, 'unit-dashboard-desktop.png'),
    });
    const urls = await page
        .locator('.sidebar nav a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    for (const url of urls) {
        await page.locator(`.sidebar nav a[href="${url}"]`).first().click();
        await ready(page);
        await expect(page.locator('h1')).toBeVisible();
    }
    await page.keyboard.press('Control+k');
    await expect(
        page.getByRole('dialog').filter({ hasText: 'Buka halaman' }),
    ).toBeVisible();
    await page.getByLabel('Cari halaman').fill('Isi Nilai');
    await expect(page.locator('dialog[open] a')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Lihat profil akun' }).click();
    await expect(
        page.getByRole('heading', { name: 'Akun Anda' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Tutup profil' }).click();
    await page
        .locator('.sidebar-footer')
        .getByRole('button', { name: 'Keluar', exact: true })
        .click();
    await expect(page.locator('dialog[data-confirm]')).toBeVisible();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await noOverflow(page);
});

test('unit: invalid score, draft, Enter navigation and submission use real backend', async ({
    page,
}) => {
    await login(page, 'ku1');
    await page
        .getByRole('row')
        .filter({ hasText: 'Karyawan Uji 01' })
        .getByRole('link', { name: 'Mulai isi', exact: true })
        .click();
    await ready(page);
    await expect(page.locator('input[data-score]')).toHaveCount(6);
    const inputs = page.locator('input[data-score]');
    await inputs.nth(0).fill('101');
    await page
        .getByRole('button', { name: 'Simpan draft', exact: true })
        .click();
    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Nilai harus bilangan bulat' }),
    ).toBeVisible();
    await inputs.nth(0).fill('90');
    await inputs.nth(0).press('Enter');
    await expect(inputs.nth(1)).toBeFocused();
    for (const [i, score] of [90, 80, 100, 85, 75, 75].entries())
        await inputs.nth(i).fill(String(score));
    await page
        .getByLabel('Temuan positif (opsional)')
        .fill('Pekerjaan pengujian selesai sesuai jadwal.');
    const period = page.getByLabel('Periode penilaian', { exact: true });
    const original = await period.inputValue();
    const previous = await period
        .locator('option')
        .evaluateAll(
            (options, current) =>
                options.find((o) => o.value && o.value !== current).value,
            original,
        );
    await period.selectOption(previous);
    await expect(page.locator('dialog[data-confirm]')).toBeVisible();
    await page
        .locator('dialog[data-confirm]')
        .getByRole('button', { name: 'Batal', exact: true })
        .click();
    await expect(period).toHaveValue(original);
    await expect(inputs.nth(0)).toHaveValue('90');
    await page
        .getByRole('button', { name: 'Simpan draft', exact: true })
        .click();
    await expect(
        page
            .getByRole('status')
            .filter({ hasText: 'Draft berhasil disimpan.' }),
    ).toBeVisible();
    await expect(page.locator('.score-total')).toHaveText('82,75');
    await page.screenshot({ path: path.join(evidence, 'score-desktop.png') });
    await page
        .getByRole('button', { name: 'Ajukan penilaian', exact: true })
        .click();
    await confirm(page, 'Ajukan penilaian');
    await expect(page.locator('.person-heading .badge')).toHaveText('Diajukan');
    await page
        .getByRole('button', { name: 'Tarik kembali', exact: true })
        .click();
    await confirm(page, 'Tarik kembali');
    await expect(page.locator('.person-heading .badge')).toHaveText('Draft');
    await page
        .getByRole('button', { name: 'Ajukan penilaian', exact: true })
        .click();
    await confirm(page, 'Ajukan penilaian');
});

test('division: return requires reason; members remain readonly', async ({
    page,
}) => {
    await login(page, 'kd1');
    await page
        .locator('.sidebar')
        .getByRole('link', { name: 'Persetujuan', exact: true })
        .click();
    await ready(page);
    await page
        .getByRole('button')
        .filter({ has: page.getByText('Karyawan Uji 01', { exact: true }) })
        .click();
    await expect(page.locator('.person-heading .badge')).toHaveText('Diajukan');
    await expect(page.locator('input[data-score]')).toHaveCount(0);
    await page.screenshot({
        path: path.join(evidence, 'division-review-desktop.png'),
    });
    await page.getByRole('button', { name: 'Kembalikan', exact: true }).click();
    await page
        .locator('dialog[data-confirm]')
        .getByRole('button', { name: 'Kembalikan ke Kepala Unit' })
        .click();
    await expect(
        page.locator('dialog[data-confirm] [role=alert]'),
    ).toContainText('Alasan minimal');
    await page
        .getByLabel('Alasan pengembalian')
        .fill('Lengkapi catatan pendukung pekerjaan.');
    await confirm(page, 'Kembalikan ke Kepala Unit');
    await expect(page.locator('.person-heading .badge')).toHaveText(
        'Dikembalikan',
    );
});

test('unit revision and division ACC produce immutable Final without HC step', async ({
    browser,
}) => {
    const unitContext = await browser.newContext();
    const unit = await unitContext.newPage();
    await login(unit, 'ku1');
    await unit.goto('/unit/score');
    await ready(unit);
    await unit
        .getByRole('button')
        .filter({ has: unit.getByText('Karyawan Uji 01', { exact: true }) })
        .click();
    await expect(
        unit
            .locator('.notice-warning')
            .getByText('Lengkapi catatan pendukung pekerjaan.', {
                exact: true,
            }),
    ).toBeVisible();
    await unit
        .getByRole('button', { name: 'Ajukan penilaian', exact: true })
        .click();
    await confirm(unit, 'Ajukan penilaian');
    const divisionContext = await browser.newContext();
    const division = await divisionContext.newPage();
    await login(division, 'kd1');
    await division.goto('/division/approvals');
    await ready(division);
    await division
        .getByRole('button')
        .filter({ has: division.getByText('Karyawan Uji 01', { exact: true }) })
        .click();
    await division
        .getByRole('button', { name: 'ACC dan tetapkan Final', exact: true })
        .click();
    await confirm(division, 'ACC dan tetapkan Final');
    await expect(division.locator('.person-heading .badge')).toHaveText(
        'Final',
    );
    await unit.reload();
    await ready(unit);
    await unit
        .getByRole('button')
        .filter({ has: unit.getByText('Karyawan Uji 01', { exact: true }) })
        .click();
    await expect(unit.locator('input[data-score]')).toHaveCount(0);
    await expect(
        unit.getByRole('button', { name: 'Ajukan penilaian', exact: true }),
    ).toBeHidden();
    await unitContext.close();
    await divisionContext.close();
});

test('division scores its own unit head and all division menus work', async ({
    page,
}) => {
    await login(page, 'kd1');
    await page.goto('/division/heads');
    await ready(page);
    await page
        .getByRole('button')
        .filter({ has: page.getByText('Kepala Unit IT Uji', { exact: true }) })
        .click();
    await expect(page.locator('input[data-score]')).toHaveCount(6);
    for (const input of await page.locator('input[data-score]').all())
        await input.fill('90');
    await page
        .getByRole('button', { name: 'Tetapkan nilai Final', exact: true })
        .click();
    await confirm(page, 'Tetapkan nilai Final');
    await expect(page.locator('.person-heading .badge')).toHaveText('Final');
    for (const url of [
        '/division/analytics',
        '/division/team',
        '/division/members',
        '/division/help',
        '/division/notifications',
    ]) {
        await page.goto(url);
        await ready(page);
    }
    const outside = await page.request.get(
        '/division/data/assessments/999999/comparison',
        { headers: { Accept: 'application/json' } },
    );
    expect(outside.status()).toBe(404);
});

test('unit can copy comparable previous values and search within its scope', async ({
    page,
}) => {
    await login(page, 'ku1');
    await page.goto('/unit/score');
    await ready(page);
    await page
        .getByRole('button')
        .filter({ has: page.getByText('Karyawan Uji 02', { exact: true }) })
        .click();
    await page.getByRole('button', { name: 'Salin nilai bulan lalu' }).click();
    await confirm(page, 'Salin ke draft');
    await expect(page.locator('input[data-score]').first()).toHaveValue('84');
    await page
        .getByRole('button', { name: 'Simpan draft', exact: true })
        .click();
    await page.getByLabel('Cari karyawan', { exact: true }).fill('Medis');
    await expect(
        page.getByText('Tidak ada karyawan sesuai filter.'),
    ).toBeVisible();
});

test('HC: every menu, real recap filters, Excel download and no decision controls', async ({
    page,
}) => {
    await login(page, 'hc');
    await page.screenshot({
        path: path.join(evidence, 'hc-dashboard-desktop.png'),
    });
    for (const url of [
        '/hc/recap',
        '/hc/kpi-templates',
        '/hc/settings',
        '/hc/organization',
        '/hc/analytics',
        '/hc/audit',
        '/hc/help',
        '/hc/notifications',
        '/hc/organization/users',
        '/hc/organization/employees',
        '/hc/organization/positions',
    ]) {
        await page.goto(url);
        await ready(page);
    }
    await page.goto('/hc/recap');
    await ready(page);
    await expect(
        page.getByRole('button', { name: /Finalkan|ACC dan/ }),
    ).toHaveCount(0);
    await page.getByLabel('Cari nama / NIP').fill('Karyawan Uji 01');
    await page.waitForTimeout(500);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page
        .getByLabel('Divisi', { exact: true })
        .selectOption(String(state.ids.d2));
    await expect(
        page.getByRole('heading', { name: 'Tidak ada penilaian' }),
    ).toBeVisible();
    await page.getByLabel('Divisi', { exact: true }).selectOption('');
    await page.getByLabel('Cari nama / NIP').fill('');
    await page.waitForTimeout(500);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Unduh TSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('rekap-kpi.tsv');
});

test('HC: create/update division and unit, add employee and preview transfer', async ({
    page,
}) => {
    await login(page, 'hc');
    await page.goto('/hc/organization');
    await ready(page);
    await page
        .getByRole('button', { name: 'Tambah divisi', exact: true })
        .click();
    await page.getByLabel('Kode divisi').fill('E2E');
    await page.getByLabel('Nama divisi').fill('Divisi Pengujian UI');
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await expect(
        page.getByRole('heading', { name: 'Divisi Pengujian UI' }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Tambah unit', exact: true })
        .click();
    await page.getByLabel('Kode unit').fill('UNIT-UI');
    await page.getByLabel('Nama unit').fill('Unit Pengujian UI');
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await expect(
        page.getByRole('heading', { name: 'Unit Pengujian UI' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ubah data', exact: true }).click();
    await page.getByLabel('Status aktif', { exact: true }).uncheck();
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await page.getByRole('button', { name: 'Kembali ke divisi' }).click();
    await expect(
        page.getByText('Unit Pengujian UI (Nonaktif)', { exact: true }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Kelola unit', exact: true })
        .click();
    await page.getByRole('button', { name: 'Ubah data', exact: true }).click();
    await page.getByLabel('Status aktif', { exact: true }).check();
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await page.screenshot({
        path: path.join(evidence, 'organization-desktop.png'),
    });
    await page
        .getByRole('button', { name: 'Tambah anggota', exact: true })
        .click();
    await page
        .getByLabel('Karyawan', { exact: true })
        .selectOption(String(state.ids.member3));
    await page
        .getByLabel('Alasan perubahan')
        .fill('Penempatan karyawan untuk pengujian UI.');
    await page.getByRole('button', { name: 'Tinjau dan konfirmasi' }).click();
    await confirm(page, 'Simpan penempatan');
    await expect(
        page.locator('tbody').getByText('Karyawan Uji 03', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Atur kepala' }).click();
    await expect(page.getByLabel('Akun penanggung jawab')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup penugasan' }).click();
});

test('HC: user, employee and position dialogs submit real changes', async ({
    page,
}) => {
    await login(page, 'hc');
    await page.goto('/hc/organization/positions');
    await ready(page);
    await page.getByRole('button', { name: 'Tambah jabatan' }).click();
    await page.getByLabel('Kode jabatan').fill('JAB-UI');
    await page.getByLabel('Nama jabatan').fill('Jabatan Pengujian');
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await expect(
        page.locator('tbody').getByText('Jabatan Pengujian'),
    ).toBeVisible();
    await page.goto('/hc/organization/users');
    await ready(page);
    await page.getByRole('button', { name: 'Tambah pengguna' }).click();
    await page.getByLabel('Nama pengguna').fill('Akun Pengujian UI');
    await page.getByLabel('Email', { exact: true }).fill('new-ui@example.test');
    await page
        .getByLabel('Kata sandi', { exact: true })
        .fill('UserTesting12345');
    await page.getByLabel('Kepala Unit', { exact: true }).check();
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await expect(
        page.locator('tbody').getByText('Akun Pengujian UI'),
    ).toBeVisible();
    await page.goto('/hc/organization/employees');
    await ready(page);
    await page.getByRole('button', { name: 'Tambah karyawan' }).click();
    await page.getByLabel('NIP', { exact: true }).fill('NIP-E2E-UI');
    await page.getByLabel('Nama lengkap').fill('Karyawan Baru Pengujian');
    await page
        .getByLabel('Jabatan', { exact: true })
        .selectOption(String(state.positions.staff));
    await page
        .getByRole('button', { name: 'Simpan perubahan', exact: true })
        .click();
    await expect(
        page.locator('tbody').getByText('Karyawan Baru Pengujian'),
    ).toBeVisible();
});

test('HC: KPI weight validation, publish, import preview and cycle categories', async ({
    page,
}) => {
    await login(page, 'hc');
    await page.goto('/hc/kpi-templates');
    await ready(page);
    await page
        .getByRole('button', { name: 'Tambah template', exact: true })
        .click();
    await page.getByLabel('Nama template').fill('Template UI Test');
    await page
        .locator('dialog[open]')
        .getByLabel('Jabatan', { exact: true })
        .selectOption(String(state.positions.staff));
    await page.getByLabel('Tahun penilaian').fill('2027');
    await page.getByLabel('Berlaku mulai').fill('2027-01-01');
    await page.getByLabel('Berlaku sampai').fill('2027-12-31');
    await page.getByLabel('Nama KPI', { exact: true }).fill('KPI Pengujian');
    await page.getByLabel('Bobot (%)').fill('95');
    await expect(
        page.getByRole('button', { name: 'Simpan draft template' }),
    ).toBeDisabled();
    await page.getByLabel('Bobot (%)').fill('100');
    await page.getByRole('button', { name: 'Simpan draft template' }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.getByLabel('Tahun', { exact: true }).fill('2027');
    await page.getByLabel('Tahun', { exact: true }).press('Tab');
    await expect(
        page.locator('tbody').getByText('Template UI Test'),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Publikasikan', exact: true })
        .click();
    await confirm(page, 'Publikasikan template');
    await expect(page.locator('tbody .badge')).toHaveText('Published');
    await page.goto('/hc/import');
    await ready(page);
    await page.getByLabel('File template KPI').setInputFiles({
        name: 'test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(
            'pillar,name,numerator,denominator,measurement_formula,target_text,weight_percent\nTechnical Care,Contoh UI,,,,95%,100\n',
        ),
    });
    await expect(
        page.getByText('Seluruh baris valid.', { exact: false }),
    ).toBeVisible();
    await page
        .getByRole('button', { name: 'Lanjutkan sebagai draft template' })
        .click();
    await expect(page.getByLabel('Nama KPI', { exact: true })).toHaveValue(
        'Contoh UI',
    );
    await page.getByRole('button', { name: 'Tutup editor template' }).click();
    await page.goto('/hc/settings');
    await ready(page);
    await page
        .getByRole('button', { name: 'Tambah periode', exact: true })
        .click();
    await page.getByLabel('Bulan yang dinilai').fill('2027-06');
    for (const [id, value] of [
        ['opens_at', '2027-07-01T08:00'],
        ['submission_due_at', '2027-07-05T23:59'],
        ['approval_due_at', '2027-07-10T23:59'],
        ['closes_at', '2027-07-15T23:59'],
    ])
        await page.locator('#' + id).fill(value);
    await page.getByRole('button', { name: 'Isi usulan 70 / 80 / 90' }).click();
    await page
        .getByRole('button', { name: 'Simpan pengaturan', exact: true })
        .click();
    await expect(page.locator('tbody').getByText('Juni 2027')).toBeVisible();
});

for (const [name, width, height] of [
    ['tablet', 1024, 900],
    ['mobile', 390, 844],
]) {
    test(`responsive ${name}: shell, drawers, review and readonly score`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height });
        await login(page, 'ku1');
        await noOverflow(page);
        await page.screenshot({
            path: path.join(evidence, `unit-dashboard-${name}.png`),
        });
        if (width < 1024) {
            await page
                .getByRole('button', { name: 'Buka navigasi', exact: true })
                .click();
            await expect(page.locator('.sidebar')).toHaveClass(/open/);
            await page
                .locator('.sidebar')
                .getByRole('link', { name: 'Isi Nilai', exact: true })
                .click();
        } else
            await page
                .locator('.sidebar')
                .getByRole('link', { name: 'Isi Nilai', exact: true })
                .click();
        await ready(page);
        await page
            .getByRole('button')
            .filter({ has: page.getByText('Karyawan Uji 01', { exact: true }) })
            .click();
        await expect(page.locator('.person-heading')).toBeVisible();
        await page.locator('.person-heading').scrollIntoViewIfNeeded();
        await noOverflow(page);
        await page.screenshot({
            path: path.join(evidence, `score-${name}.png`),
        });
        await page.goto('/unit/help');
        await ready(page);
        await noOverflow(page);
        await page.setViewportSize({
            width: width === 390 ? 780 : 1440,
            height,
        });
        await noOverflow(page);
    });
}

test('server failure and empty data are actionable; logout revokes session', async ({
    page,
}) => {
    await login(page, 'ku1');
    await page.route('**/unit/data/analytics?*', (route) =>
        route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: '{"message":"Unavailable"}',
        }),
    );
    await page.goto('/unit/history');
    await expect(
        page.getByRole('heading', { name: 'Data belum dapat dimuat' }),
    ).toBeVisible();
    await page.unroute('**/unit/data/analytics?*');
    await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
    await ready(page);
    await page
        .locator('.sidebar-footer')
        .getByRole('button', { name: 'Keluar', exact: true })
        .click();
    await confirm(page, 'Keluar dari akun');
    await expect(page).toHaveURL(/\/login$/);
    const response = await page.request.get('/me', {
        headers: { Accept: 'application/json' },
    });
    expect(response.status()).toBe(401);
});
