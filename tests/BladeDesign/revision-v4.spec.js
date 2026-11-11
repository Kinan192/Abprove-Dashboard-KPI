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
test('removed coverage redirects to KPI and does not remain in navigation', async ({
    page,
}) => {
    await go(page, 'hc', 'penempatan');
    await expect(page).toHaveURL(/\/hc\/kpi/);
    await expect(
        page.getByRole('link', { name: 'Cakupan KPI', exact: true }),
    ).toHaveCount(0);
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
    for (const panel of ['schedule', 'categories', 'periods']) {
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

async function savedFixture(page) {
    await go(page, 'hc', 'profil');
    await page.locator('[data-panel-tab=preferences]').click();
    await page.locator('[data-profile-notification]').click();
    expect(
        await page.evaluate(() => localStorage.getItem('abprove-flow-v2')),
    ).toBeTruthy();
}

test('KU score metadata is concise and rail prioritizes returned, submitted, empty, Final', async ({
    page,
}) => {
    await go(page, 'ku', 'nilai');
    await expect(page.locator('[data-score-content] [data-kind]')).toHaveCount(
        0,
    );
    await expect(page.locator('[data-template-meta]')).toHaveCount(0);
    await expect(page.locator('[data-person-meta]')).toContainText('NIP');
    const statuses = await page
        .locator('[data-people-rail] [data-status]')
        .evaluateAll((es) => es.map((e) => e.dataset.status));
    const priority = { Dikembalikan: 0, Diajukan: 1, Belum: 2, Final: 3 };
    expect(statuses.map((s) => priority[s])).toEqual(
        statuses.map((s) => priority[s]).sort((a, b) => a - b),
    );
    await go(page, 'ku', 'tim');
    await expect(page.locator('[data-team-unit]')).toHaveCount(0);
});

test('KU score sorting covers all pages and keeps unfilled scores last', async ({
    page,
}) => {
    await savedFixture(page);
    await go(page, 'ku', 'pengajuan');
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        const c = JSON.parse(document.querySelector('#kpi-config').textContent);
        const actor =
            d.accounts.find((a) => a.role === 'ku' && a.id === c.actor.key) ||
            d.accounts.find((a) => a.role === 'ku');
        const unit = d.units.find((u) => u.headId === actor.id);
        const base = d.staff.find((p) =>
            p.placements.some((x) => x.unitId === unit.id),
        );
        const template = d.kpis.find(
            (k) => k.level === 'unit' && k.areaId === unit.id,
        );
        for (let i = 0; i < 13; i++) {
            const p = {
                ...structuredClone(base),
                id: 'SORT-' + i,
                name: 'Urutan ' + i,
                nip: 'SORT-' + i,
            };
            d.staff.push(p);
            if (i < 12)
                d.assessments[p.id + '|2026-11'] = {
                    status: 'Diajukan',
                    values: Object.fromEntries(
                        template.items.map((_, j) => [j, 10 + i * 5]),
                    ),
                    snapshot: template,
                    history: [],
                    positive: '',
                    negative: '',
                    reason: '',
                    scope: { unitId: unit.id, divisionId: unit.divisionId },
                };
        }
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    await go(page, 'ku', 'pengajuan');
    for (const order of ['asc', 'desc']) {
        await page.locator('[data-score-order]').selectOption(order);
        const values = [];
        do {
            values.push(
                ...(await page
                    .locator(
                        '[data-assessment-body]>tr:visible [data-label=Nilai]',
                    )
                    .allTextContents()),
            );
            const next = page.locator(
                '[data-pagination=assessments] [data-page-next]',
            );
            if (await next.isDisabled()) break;
            await next.click();
        } while (true);
        expect(values.length).toBeGreaterThan(10);
        const numbers = values
            .filter((x) => x.trim() !== '-')
            .map((x) => +x.replaceAll('.', '').replace(',', '.'));
        expect(numbers).toEqual(
            [...numbers].sort((a, b) => (order === 'asc' ? a - b : b - a)),
        );
        const firstEmpty = values.findIndex((x) => x.trim() === '-');
        expect(values.slice(firstEmpty).every((x) => x.trim() === '-')).toBe(
            true,
        );
    }
});

test('KU KPI selector is limited to the same division with no edit column or template clutter', async ({
    page,
}) => {
    await savedFixture(page);
    await go(page, 'ku', 'kpi');
    const allowed = await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        const own = d.units.find(
            (u) => u.id === document.querySelector('[data-kpi-area]').value,
        );
        return d.units
            .filter((u) => u.active && u.divisionId === own.divisionId)
            .map((u) => u.id)
            .sort();
    });
    expect(
        await page.locator('[data-kpi-area]').evaluate((e) =>
            [...e.options]
                .map((o) => o.value)
                .filter(Boolean)
                .sort(),
        ),
    ).toEqual(allowed);
    await expect(page.locator('.reference-kpi-table thead th')).toHaveCount(8);
    await expect(page.locator('[data-indicator-edit]')).toHaveCount(0);
    await expect(page.locator('main')).toContainText(
        'KPI diatur oleh SDM, Hubungi SDM untuk usulan perubahan.',
    );
    await expect(page.locator('[data-kpi-purpose]')).toHaveCount(0);
    await go(page, 'kd', 'kpi');
    await expect(page.locator('.reference-kpi-table thead th')).toHaveCount(8);
});

test('review timeline is readable and prior-month comparison matches definitions across version IDs', async ({
    page,
}) => {
    await savedFixture(page);
    await go(page, 'kd', 'persetujuan');
    const id = await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        const c = JSON.parse(document.querySelector('#kpi-config').textContent);
        const actor =
            d.accounts.find((a) => a.role === 'kd' && a.id === c.actor.key) ||
            d.accounts.find((a) => a.role === 'kd');
        const division = d.divisions.find((x) => x.headId === actor.id);
        const unit = d.units.find((x) => x.divisionId === division.id);
        const person = d.staff.find((p) =>
            p.placements.some((x) => x.unitId === unit.id),
        );
        const k = d.kpis.find(
            (x) => x.level === 'unit' && x.areaId === unit.id,
        );
        const a = {
            status: 'Diajukan',
            values: Object.fromEntries(k.items.map((_, i) => [i, 80])),
            snapshot: structuredClone(k),
            scope: { unitId: unit.id, divisionId: division.id },
            positive: '',
            negative: '',
            reason: '',
            history: [
                {
                    action: 'assessment.submitted',
                    who: 'Kepala Unit',
                    at: '2026-11-08T02:00:00Z',
                },
                {
                    action: 'assessment.return',
                    who: 'Kepala Divisi',
                    at: '2026-11-09T02:00:00Z',
                    reason: 'Lengkapi bukti layanan.',
                },
                {
                    action: 'assessment.resubmit',
                    who: 'Kepala Unit',
                    at: '2026-11-10T02:00:00Z',
                },
            ],
        };
        d.assessments[person.id + '|2026-11'] = a;
        const old = structuredClone(a);
        old.status = 'Final';
        old.history = [];
        old.snapshot.items.forEach((x, i) => {
            x.id = 'old-' + x.id;
            old.values[i] = i === 0 ? 85 : i === 2 ? 75 : 80;
        });
        old.snapshot.items[1].target = 'Definisi bulan lalu berbeda';
        d.assessments[person.id + '|2026-10'] = old;
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
        return person.id;
    });
    await go(page, 'kd', 'persetujuan', 'person=' + id);
    await expect(page.locator('[data-previous-column]')).toContainText(
        'Oktober 2026',
    );
    await expect(page.locator('[data-previous]').nth(0)).toHaveText('85');
    await expect(page.locator('[data-previous-delta]').nth(0)).toHaveText(
        'Turun 5',
    );
    await expect(page.locator('[data-previous-delta]').nth(1)).toHaveText(
        'Indikator tidak sebanding',
    );
    await expect(page.locator('[data-previous-delta]').nth(2)).toHaveText(
        'Naik 5',
    );
    await expect(page.locator('[data-previous-summary]')).toContainText(
        'total tidak dibandingkan',
    );
    await page.locator('[data-history-tab] summary').click();
    await expect(page.locator('[data-review-decision-state]')).toContainText(
        'Menunggu keputusan',
    );
    await expect(page.locator('[data-review-history]')).not.toContainText(
        'assessment.',
    );
    await expect(page.locator('[data-review-history]')).toContainText(
        'Alasan pengembalian: Lengkapi bukti layanan.',
    );
    await page.locator('[data-history-tab]').screenshot({
        path: 'docs/frontend/role-refinement/screenshots/jejak-pengajuan-ulang.png',
    });
    for (const [width, height] of [
        [1440, 900],
        [1024, 768],
        [390, 844],
    ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(180);
        expect(
            await page
                .locator('#review-dialog .table-wrap')
                .evaluate((e) => e.scrollWidth - e.clientWidth),
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
            path: `docs/frontend/role-refinement/screenshots/kd-review-history-${width}.png`,
        });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Escape');
    await go(page, 'hc', 'rekap', 'person=' + id);
    await page.locator('[data-history-tab] summary').click();
    await expect(page.locator('[data-review-history]')).not.toContainText(
        'assessment.',
    );
    await expect(page.locator('[data-previous-column]')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.evaluate((id) => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        delete d.assessments[id + '|2026-10'];
        d.assessments[id + '|2026-11'].history = [];
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    }, id);
    await go(page, 'kd', 'persetujuan', 'person=' + id);
    await expect(page.locator('[data-previous-summary]')).toContainText(
        'Belum ada penilaian Final',
    );
    await page.locator('[data-history-tab] summary').click();
    await expect(page.locator('[data-review-history]')).toContainText(
        'Belum ada aktivitas penilaian.',
    );
    await page.locator('[data-history-tab]').screenshot({
        path: 'docs/frontend/role-refinement/screenshots/jejak-kosong.png',
    });
    await page.screenshot({
        path: 'docs/frontend/role-refinement/screenshots/kd-review-history-empty.png',
    });
});

test('division and HC progress paginate at five units and KPI averages paginate at ten', async ({
    page,
}) => {
    await savedFixture(page);
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        for (const division of d.divisions) {
            const first = d.units.find((u) => u.divisionId === division.id);
            const base = d.staff.find((p) =>
                p.placements.some((x) => x.unitId === first.id),
            );
            const template = d.kpis.find(
                (k) => k.level === 'unit' && k.areaId === first.id,
            );
            for (let i = 0; i < 7; i++) {
                const id = `PAGER-${division.id}-${i}`;
                d.units.push({ ...first, id, name: 'Unit pagination ' + i });
                const p = {
                    ...structuredClone(base),
                    id: 'EMP-' + id,
                    name: 'Staf pagination ' + i,
                    placements: [{ unitId: id, from: '2026-01', until: null }],
                };
                d.staff.push(p);
                const k = {
                    ...structuredClone(template),
                    id: 'KPI-' + id,
                    areaId: id,
                };
                d.kpis.push(k);
                d.assessments[p.id + '|2026-11'] = {
                    status: 'Final',
                    values: Object.fromEntries(k.items.map((_, j) => [j, 80])),
                    snapshot: k,
                    history: [],
                    category: { key: 'good', label: 'Baik' },
                    scope: { unitId: id, divisionId: division.id },
                };
            }
        }
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    for (const role of ['kd', 'hc']) {
        await go(page, role, 'beranda');
        await expect(
            page.locator('[data-home-progress] tbody tr:visible'),
        ).toHaveCount(5);
        const pager = page
            .locator('[data-home-progress] [data-pagination]')
            .filter({ has: page.locator('[data-page-next]:enabled') })
            .first();
        const first = await page
            .locator('[data-home-progress] tbody tr:visible')
            .first()
            .innerText();
        await pager.locator('[data-page-next]').click();
        expect(
            await page
                .locator('[data-home-progress] tbody tr:visible')
                .first()
                .innerText(),
        ).not.toBe(first);
        await go(page, role, 'dashboard');
        await expect(page.locator('[data-filter=template]')).toHaveCount(0);
        await page.locator('[data-panel-tab=kpi]').click();
        const count = await page.locator('[data-item-averages]>tr').count();
        expect(count).toBeGreaterThan(10);
        await expect(
            page.locator('[data-item-averages]>tr:visible'),
        ).toHaveCount(10);
        await page
            .locator('[data-pagination=item-averages] [data-page-next]')
            .click();
        expect(
            await page.locator('[data-item-averages]>tr:visible').count(),
        ).toBeLessThanOrEqual(10);
    }
});

test('HC staff combobox searches more than ten options and commits only a chosen master ID', async ({
    page,
}) => {
    await savedFixture(page);
    await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('abprove-flow-v2'));
        for (let i = 0; i < 15; i++)
            d.positions.push({
                id: 'SEARCH-' + i,
                name: 'Jabatan pencarian ' + String(i).padStart(2, '0'),
                active: true,
            });
        localStorage.setItem('abprove-flow-v2', JSON.stringify(d));
    });
    await go(page, 'hc', 'karyawan');
    await page.locator('[data-entity-new=staff]').click();
    const input = page.locator('[data-search-for=positionId]');
    await input.fill('Jabatan pencarian');
    await expect(
        page.locator('.searchable-select-menu:not([hidden]) [role=option]'),
    ).toHaveCount(10);
    await expect(page.locator('.searchable-select-hint:visible')).toContainText(
        '10 dari 15',
    );
    await input.fill('Jabatan pencarian 14');
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.locator('#entity-form [name=positionId]')).toHaveValue(
        'SEARCH-14',
    );
    await expect(input).toHaveValue('Jabatan pencarian 14');
    await input.fill('Tidak ada jabatan ini');
    await expect(page.locator('#entity-form [name=positionId]')).toHaveValue(
        '',
    );
    await expect(page.locator('.searchable-select-hint:visible')).toContainText(
        'Tidak ada pilihan',
    );
    expect(await input.evaluate((e) => e.checkValidity())).toBe(false);
    await input.press('Escape');
    await expect(page.locator('#entity-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[data-org-active]').selectOption('inactive');
    await expect(page.locator('[data-org-body] .empty')).toHaveCSS(
        'text-align',
        'center',
    );
});

test('HC KPI name uses explicit edit action, pillar is flexible and period users/coverage are removed', async ({
    page,
}) => {
    await go(page, 'hc', 'kpi');
    await expect(page.locator('[data-kpi-heading]')).toBeVisible();
    await expect(page.locator('[data-kpi-editor] [name=name]')).toBeHidden();
    await page.locator('[data-flow-action=rename-kpi]').click();
    await page.locator('#kpi-name-form [name=name]').fill('KPI mutu area');
    await page.locator('[form=kpi-name-form]').click();
    await expect(page.locator('[data-kpi-editor] [name=name]')).toHaveValue(
        'KPI mutu area',
    );
    const pillar = page.locator('[data-kpi-field=pillar]').first();
    await pillar.fill('Keselamatan layanan lokal');
    await page.locator('[data-indicator-edit]').first().click();
    await expect(page.locator('#indicator-form [name=pillar]')).toHaveValue(
        'Keselamatan layanan lokal',
    );
    await page.keyboard.press('Escape');
    await page.locator('.reference-kpi-history summary').click();
    await expect(page.locator('[data-kpi-version]')).toBeVisible();
    await go(page, 'hc', 'pengaturan');
    await expect(page.locator('[data-panel-tab=users]')).toHaveCount(0);
    await expect(
        page.getByRole('link', { name: 'Cakupan KPI', exact: true }),
    ).toHaveCount(0);
});
