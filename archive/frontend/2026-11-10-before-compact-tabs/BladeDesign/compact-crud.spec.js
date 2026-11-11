import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const root = '/design-review/';
const out = 'docs/frontend/compact-crud';
const route = {
    account: 'akun',
    position: 'jabatan',
    division: 'struktur',
    unit: 'struktur',
    staff: 'karyawan',
};
const set = {
    account: 'accounts',
    position: 'positions',
    division: 'divisions',
    unit: 'units',
    staff: 'staff',
};
const confirm = (page) =>
    page.locator('#confirm-dialog [data-action="confirm-submit"]').click();
const state = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('abprove-flow-v2')));
const go = (page, role, path, qs = '') =>
    page.goto(root + role + '/' + path + (qs ? '?' + qs : ''));
async function setup(page) {
    await go(page, 'hc', 'akun');
    await page.locator('[data-dialog-open="notification-dialog"]').click();
    await page.locator('[data-flow-action="read-notifications"]').click();
    await page.keyboard.press('Escape');
}
async function create(page, kind, values) {
    await go(page, 'hc', route[kind]);
    await page.locator('[data-entity-new="' + kind + '"]').click();
    for (const [key, value] of Object.entries(values)) {
        const input = page.locator('#entity-form [name="' + key + '"]');
        if (await input.evaluate((e) => e.tagName === 'SELECT'))
            await input.selectOption(value);
        else await input.fill(value);
    }
    await page.locator('[form="entity-form"]').click();
    await confirm(page);
    await expect(page.locator('#entity-dialog')).toBeHidden();
    return (await state(page))[set[kind]].find((x) => x.name === values.name);
}
async function find(page, kind, name) {
    await go(page, 'hc', route[kind]);
    if (kind === 'unit') await page.locator('[data-org-tab="unit"]').click();
    await page.locator('[data-org-search]').fill(name);
}
async function remove(page, kind, record) {
    await find(page, kind, record.name);
    await page.locator('[data-entity-more="' + record.id + '"]').click();
    await page.getByRole('button', { name: 'Hapus data', exact: true }).click();
    await confirm(page);
    expect((await state(page))[set[kind]].some((x) => x.id === record.id)).toBe(
        false,
    );
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
test('CRUD: account, position, division, unit and staff with safe dependency order', async ({
    page,
}) => {
    const ku = await create(page, 'account', {
        name: 'Kepala Unit Audit',
        nip: 'KU-CRUD',
        email: 'ku.crud@example.test',
        role: 'ku',
        password: 'AkunAudit2026!',
    });
    const kd = await create(page, 'account', {
        name: 'Kepala Divisi Audit',
        nip: 'KD-CRUD',
        email: 'kd.crud@example.test',
        role: 'kd',
        password: 'AkunAudit2026!',
    });
    const job = await create(page, 'position', {
        name: 'Analis Audit',
        code: 'JOB-CRUD',
    });
    const division = await create(page, 'division', {
        name: 'Divisi Audit',
        code: 'DIV-CRUD',
        headId: kd.id,
    });
    const unit = await create(page, 'unit', {
        name: 'Unit Audit',
        code: 'UNIT-CRUD',
        divisionId: division.id,
        headId: ku.id,
    });
    const staff = await create(page, 'staff', {
        name: 'Staf CRUD',
        nip: 'ST-CRUD',
        positionId: job.id,
        unitId: unit.id,
    });
    await find(page, 'staff', staff.name);
    await page.getByRole('button', { name: staff.name, exact: true }).click();
    await expect(page.locator('[data-record-detail]')).toContainText(
        'Analis Audit',
    );
    await page.locator('[data-detail-edit]').click();
    await page.locator('#entity-form [name="name"]').fill('Staf CRUD Revisi');
    await page.locator('[form="entity-form"]').click();
    await confirm(page);
    staff.name = 'Staf CRUD Revisi';
    expect((await state(page)).staff.find((x) => x.id === staff.id).name).toBe(
        staff.name,
    );
    for (const [kind, record] of [
        ['unit', unit],
        ['division', division],
        ['position', job],
        ['account', ku],
    ]) {
        await find(page, kind, record.name);
        await page.locator('[data-entity-more="' + record.id + '"]').click();
        await expect(
            page.getByRole('button', { name: 'Hapus data', exact: true }),
        ).toBeDisabled();
        await page.keyboard.press('Escape');
    }
    for (const [kind, record] of [
        ['unit', unit],
        ['division', division],
        ['position', job],
        ['account', ku],
        ['account', kd],
    ]) {
        await find(page, kind, record.name);
        await page.locator('[data-entity-edit="' + record.id + '"]').click();
        record.name += ' Revisi';
        await page.locator('#entity-form [name="name"]').fill(record.name);
        await page.locator('[form="entity-form"]').click();
        await confirm(page);
        expect(
            (await state(page))[set[kind]].find((x) => x.id === record.id).name,
        ).toBe(record.name);
    }
    for (const [kind, record] of [
        ['staff', staff],
        ['unit', unit],
        ['division', division],
        ['position', job],
        ['account', ku],
        ['account', kd],
    ])
        await remove(page, kind, record);
    const events = (await state(page)).activities;
    expect(events.filter((x) => x.action.startsWith('Hapus '))).toHaveLength(6);
    await go(page, 'hc', 'aktivitas');
    await page.locator('[data-activity-id]').first().click();
    await expect(page.locator('#activity-dialog')).toBeVisible();
    await page
        .locator('[data-pagination="activity-detail"] [data-page-next]')
        .click();
    await expect(
        page.locator('[data-pagination="activity-detail"]'),
    ).toHaveAttribute('data-page', '2');
});
test('CRUD: referenced records protect history; inactive job can be restored', async ({
    page,
}) => {
    await find(page, 'staff', 'Fajar');
    await page.locator('[data-entity-more="E05"]').click();
    await expect(
        page.getByRole('button', { name: 'Hapus data', exact: true }),
    ).toBeDisabled();
    await expect(page.locator('[data-actions-note]')).toContainText('riwayat');
    await page.keyboard.press('Escape');
    await page.locator('[data-entity-edit="E05"]').click();
    await page.locator('#entity-form [name="active"]').uncheck();
    await page.locator('[form="entity-form"]').click();
    await expect(page.locator('#entity-form [data-form-error]')).toContainText(
        'non-Final',
    );
    await page.keyboard.press('Escape');
    await setup(page);
    const self = (await state(page)).accounts.find((a) => a.role === 'hc');
    await find(page, 'account', self.name);
    await page.locator('[data-entity-edit="' + self.id + '"]').click();
    await page.locator('#entity-form [name="role"]').selectOption('ku');
    await page.locator('[form="entity-form"]').click();
    await expect(page.locator('#entity-form [data-form-error]')).toContainText(
        'tidak dapat diubah sendiri',
    );
    await page.keyboard.press('Escape');
    const job = await create(page, 'position', {
        name: 'Jabatan Status Audit',
        code: 'JOB-STATUS',
    });
    await find(page, 'position', job.name);
    await page.locator('[data-entity-more="' + job.id + '"]').click();
    await page
        .getByRole('button', { name: 'Nonaktifkan', exact: true })
        .click();
    await page.locator('[form="entity-form"]').click();
    await confirm(page);
    expect(
        (await state(page)).positions.find((x) => x.id === job.id).active,
    ).toBe(false);
    await page.locator('[data-entity-more="' + job.id + '"]').click();
    await page.getByRole('button', { name: 'Aktifkan', exact: true }).click();
    await page.locator('[form="entity-form"]').click();
    await confirm(page);
    expect(
        (await state(page)).positions.find((x) => x.id === job.id).active,
    ).toBe(true);
});
test('KPI: detail, edit, add, remove and protected/version deletion', async ({
    page,
}) => {
    await go(page, 'hc', 'kpi');
    const weight = await page.locator('[data-kpi-weight]').innerText();
    await page.locator('[data-flow-action="add-kpi-item"]').click();
    await page
        .locator('#indicator-form [name="name"]')
        .fill('Indikator tambahan');
    await page.locator('#indicator-form [name="target"]').fill('95%');
    await page.locator('#indicator-form [name="weight"]').fill('5');
    await page.locator('[form="indicator-form"]').click();
    await expect(page.locator('[data-kpi-weight]')).toHaveText(
        String(+weight + 5),
    );
    const row = page
        .locator('[data-kpi-body] tr')
        .filter({ hasText: 'Indikator tambahan' });
    await row.locator('[data-flow-action="remove-kpi-item"]').click();
    await confirm(page);
    await expect(page.locator('[data-kpi-weight]')).toHaveText(weight);
    await page.locator('[data-panel-tab="version"]').click();
    await page.locator('[data-kpi-editor] [name="from"]').fill('2026-12');
    await page.locator('[data-flow-action="apply-kpi"]').click();
    await confirm(page);
    await expect(page.locator('[data-kpi-version-label]')).toContainText(
        'Versi 2',
    );
    await page.locator('[data-panel-tab="version"]').click();
    await page.locator('[data-flow-action="delete-kpi-version"]').click();
    await confirm(page);
    await expect(page.locator('[data-kpi-version-label]')).toContainText(
        'Versi 1',
    );
    await page.locator('[data-panel-tab="version"]').click();
    await page.locator('[data-flow-action="delete-kpi-version"]').click();
    await expect(page.locator('#toast-stack')).toContainText('sudah digunakan');
    await go(page, 'ku', 'kpi');
    await page.locator('[data-kpi-body] [data-indicator-edit]').first().click();
    await expect(
        page.locator('#indicator-form [name="formula"]'),
    ).toBeDisabled();
    await expect(page.locator('#indicator-form [name="name"]')).not.toHaveValue(
        '',
    );
    expect(await page.locator('[form="indicator-form"]').count()).toBe(0);
});
test('CRUD: unused period edit and deletion; used period stays locked', async ({
    page,
}) => {
    await go(page, 'hc', 'pengaturan');
    await page.locator('[data-flow-action="new-cycle"]').click();
    const form = page.locator('#cycle-form');
    await form.locator('[name="month"]').fill('2027-02');
    for (const [key, value] of Object.entries({
        opens: '2027-02-01T00:00',
        submission: '2027-03-05T23:59',
        approval: '2027-03-10T23:59',
        closes: '2027-03-15T23:59',
    }))
        await form.locator('[name="' + key + '"]').fill(value);
    await page.locator('[form="cycle-form"]').click();
    await confirm(page);
    await page.locator('[data-cycle-edit="2027-02"]').click();
    await form.locator('[name="sb"]').fill('92');
    await page.locator('[form="cycle-form"]').click();
    await confirm(page);
    expect(
        (await state(page)).cycles.find((x) => x.id === '2027-02').categories
            .sb,
    ).toBe(92);
    await page.locator('[data-cycle-delete="2027-02"]').click();
    await confirm(page);
    expect((await state(page)).cycles.some((x) => x.id === '2027-02')).toBe(
        false,
    );
    expect(await page.locator('[data-cycle-delete="2026-11"]').count()).toBe(0);
    await page.locator('[data-panel-tab="categories"]').click();
    await expect(page.locator('[data-cycle-categories]')).toBeVisible();
});
test('pagination preserves 50 added staff, resets on search and exports all matching pages', async ({
    page,
}) => {
    await setup(page);
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2')),
            source = d.staff[0];
        for (let i = 0; i < 50; i++)
            d.staff.push({
                ...structuredClone(source),
                id: 'LONG-' + i,
                name:
                    'Staf tambahan audit pagination ' +
                    String(i).padStart(2, '0'),
                nip: 'PAGE-' + i,
            });
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    await go(page, 'hc', 'karyawan');
    await page
        .locator('[data-org-search]')
        .fill('Staf tambahan audit pagination');
    const pager = page.locator('[data-pagination="organization"]'),
        names = [];
    for (;;) {
        names.push(
            ...(await page
                .locator('[data-org-body] tr:visible .table-name')
                .allTextContents()),
        );
        if (await pager.locator('[data-page-next]').isDisabled()) break;
        await pager.locator('[data-page-next]').click();
    }
    expect(new Set(names).size).toBe(50);
    await page.locator('[data-org-search]').fill('pagination 49');
    await expect(pager).toHaveAttribute('data-page', '1');
    await expect(page.locator('[data-org-body] tr:visible')).toHaveCount(1);
    await go(page, 'hc', 'rekap');
    await page
        .locator('[data-filter="search"]')
        .fill('Staf tambahan audit pagination');
    await page.locator('[data-dialog-open="export-dialog"]').first().click();
    await expect(page.locator('[data-export-summary]')).toContainText(
        '50 orang',
    );
    const download = page.waitForEvent('download');
    await page.locator('[data-flow-action="download-export"]').click();
    const bytes = fs.readFileSync(await (await download).path());
    expect(bytes.includes(Buffer.from('pagination 49'))).toBe(true);
});
test('selection applies to visible page, persists across pages and clears on filter', async ({
    page,
}) => {
    await setup(page);
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2')),
            source = d.staff.find((x) => x.id === 'E05'),
            a = d.assessments['E05|2026-11'];
        for (let i = 0; i < 12; i++) {
            const id = 'PENDING-' + i;
            d.staff.push({
                ...structuredClone(source),
                id,
                name: 'Pengajuan Pagination ' + i,
                nip: 'PP-' + i,
            });
            d.assessments[id + '|2026-11'] = structuredClone(a);
        }
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    await go(page, 'kd', 'persetujuan');
    await page.locator('[data-filter="search"]').fill('Pengajuan Pagination');
    await page.locator('[data-flow-select-all]').check();
    await expect(page.locator('[data-selected-count]')).toHaveText('5');
    await page
        .locator('[data-pagination="assessments"] [data-page-next]')
        .click();
    await expect(page.locator('[data-flow-select-all]')).not.toBeChecked();
    await page.locator('[data-flow-select-all]').check();
    await expect(page.locator('[data-selected-count]')).toHaveText('10');
    await page.locator('[data-flow-action="bulk-final"]').click();
    await confirm(page);
    expect(
        Object.entries((await state(page)).assessments).filter(
            ([k, a]) => k.startsWith('PENDING-') && a.status === 'Final',
        ),
    ).toHaveLength(10);
    await page.locator('[data-filter="search"]').fill('tidak ada');
    await expect(
        page.locator('[data-flow-action="bulk-final"]'),
    ).toBeDisabled();
});
test('score paging and Enter retain input, findings tabs and dirty mobile selection guard', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, 'ku', 'nilai', 'person=E03');
    await page.locator('[data-score="0"]').fill('91');
    await page.locator('[data-score="0"]').press('Enter');
    await expect(page.locator('[data-score="1"]')).toBeFocused();
    await page.locator('[data-panel-tab="findings"]').click();
    await page.locator('[data-finding="positive"]').fill('Catatan layanan');
    await page.locator('[data-panel-tab="score"]').click();
    await page
        .locator('[data-pagination="editor-score"] [data-page-prev]')
        .click();
    await expect(page.locator('[data-score="0"]')).toHaveValue('91');
    await page.locator('[data-mobile-person]').selectOption('E04');
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page.locator('#confirm-dialog [data-dialog-close]').first().click();
    await expect(page.locator('[data-mobile-person]')).toHaveValue('E03');
    expect(
        await page.evaluate(() => localStorage.getItem('abprove-flow-v2')),
    ).toBeNull();
});
const views = {
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
for (const width of [1440, 1024, 390])
    test('all role screens fit dashboard at ' + width, async ({ page }) => {
        test.setTimeout(90000);
        await page.setViewportSize({
            width,
            height: width === 1440 ? 900 : width === 390 ? 844 : 768,
        });
        const results = [];
        for (const [role, paths] of Object.entries(views))
            for (const path of paths) {
                await go(page, role, path);
                await expect(page.locator('html')).toHaveAttribute(
                    'data-frontend-ready',
                    'true',
                );
                const metric = await page.evaluate(() => {
                    const m = document.querySelector('#main-content');
                    return {
                        x: m.scrollWidth - m.clientWidth,
                        y: m.scrollHeight - m.clientHeight,
                        innerX: [...m.querySelectorAll('.table-wrap')].some(
                            (e) => e.scrollWidth > e.clientWidth + 1,
                        ),
                    };
                });
                results.push({ role, path, ...metric });
                expect(metric, { message: role + '/' + path }).toEqual({
                    x: 0,
                    y: 0,
                    innerX: false,
                });
            }
        fs.writeFileSync(
            out + '/layout-' + width + '.json',
            JSON.stringify(results, null, 2),
        );
    });
test('all forms and analytics tabs fit desktop; mobile reflows without horizontal scrolling', async ({
    page,
}) => {
    test.setTimeout(60000);
    for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({
            width,
            height: width === 1440 ? 900 : width === 1024 ? 768 : 844,
        });
        for (const [kind, path] of Object.entries(route)) {
            await go(page, 'hc', path);
            await page.locator('[data-entity-new="' + kind + '"]').click();
            const metric = await page
                .locator('#entity-dialog .dialog-body')
                .evaluate((e) => ({
                    x: e.scrollWidth - e.clientWidth,
                    y: e.scrollHeight - e.clientHeight,
                }));
            expect(metric.x).toBe(0);
            if (width > 600) expect(metric.y).toBe(0);
            if (kind === 'account')
                await page.screenshot({
                    path: out + '/screenshots/account-' + width + '.png',
                });
        }
        await go(page, 'hc', 'dashboard');
        for (const tab of ['history', 'rank', 'summary']) {
            await page.locator('[data-panel-tab="' + tab + '"]').click();
            expect(
                await page
                    .locator('#main-content')
                    .evaluate((e) => e.scrollWidth - e.clientWidth),
            ).toBe(0);
            if (width > 600)
                expect(
                    await page
                        .locator('#main-content')
                        .evaluate((e) => e.scrollHeight - e.clientHeight),
                ).toBe(0);
        }
        await go(page, 'ku', 'nilai', 'person=E03');
        await page.screenshot({
            path: out + '/screenshots/score-' + width + '.png',
        });
        if (width === 390)
            expect(
                await page
                    .locator('#main-content')
                    .evaluate((e) => e.scrollHeight - e.clientHeight),
            ).toBe(0);
    }
});
test('audit canvas fits, switches screens and compares references', async ({
    page,
}) => {
    await page.goto('/design-review');
    await page.locator('#audit-screen').selectOption('hc-kpi');
    await expect(page.locator('#audit-frame')).toHaveAttribute(
        'src',
        /hc\/kpi/,
    );
    await page.locator('[data-audit-mode="both"]').click();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
        ),
    ).toBe(0);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollHeight - innerHeight,
        ),
    ).toBe(0);
    await page.locator('#audit-width').selectOption('390');
    await page.locator('[data-audit-mode="implementation"]').click();
    await expect(page.locator('#audit-reference-wrap')).toBeHidden();
});

test('mobile home sections and filter dialog preserve scope and fit', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const role of ['ku', 'kd', 'hc']) {
        await go(page, role, 'beranda');
        for (const tab of await page.locator('[data-home-tab]').all()) {
            await tab.click();
            expect(
                await page
                    .locator('#main-content')
                    .evaluate((e) => e.scrollHeight - e.clientHeight),
            ).toBe(0);
        }
    }
    await go(page, 'hc', 'rekap');
    await page.locator('[data-dialog-open="filter-dialog"]').click();
    await page.locator('[data-filter="search"]').fill('Ratna');
    await page
        .getByRole('button', { name: 'Tampilkan hasil', exact: true })
        .click();
    await expect(page.locator('[data-assessment-body] tr:visible')).toHaveCount(
        1,
    );
    await expect(
        page.locator('[data-assessment-body] tr:visible'),
    ).toContainText('Ratna');
    await page.screenshot({
        path: out + '/screenshots/mobile-filtered-recap.png',
    });
    await page.locator('[data-dialog-open="account-dialog"]').click();
    await page
        .getByRole('button', { name: 'Cari halaman atau nama', exact: true })
        .click();
    await expect(page.locator('#search-dialog')).toBeVisible();
    await expect(page.locator('#account-dialog')).toBeHidden();
});

test('review without KPI shows configuration empty state instead of breaking', async ({
    page,
}) => {
    await setup(page);
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        d.kpis = [];
        delete d.assessments['E03|2026-11'];
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    await go(page, 'hc', 'rekap', 'person=E03');
    await expect(page.locator('#review-dialog')).toBeVisible();
    await expect(page.locator('[data-review-mount]')).toContainText(
        'belum disusun',
    );
    await page.locator('#review-dialog [data-dialog-close]').first().click();
    await go(page, 'ku', 'nilai', 'person=E03');
    await expect(page.locator('[data-score-mount]')).toContainText(
        'belum disusun',
    );
    await expect(
        page.locator('[data-flow-action="send-assessment"]'),
    ).toBeHidden();
});
