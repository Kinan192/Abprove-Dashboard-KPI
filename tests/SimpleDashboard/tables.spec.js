import { test, expect } from '@playwright/test';
import { createFlowStore } from '../../resources/js/abprove/flow-store.js';
async function go(page, url) {
    await page.goto(url);
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
}
test('Satu tombol Filter menyimpan status dan membatasi unit sesuai divisi', async ({
    page,
}) => {
    await go(page, '/design-review/hc/rekap');
    await expect(page.locator('#filter-dialog')).not.toBeVisible();
    await expect(page.locator('[data-dialog-open=filter-dialog]')).toHaveCount(
        1,
    );
    await expect(page.locator('[data-flow-status]')).toHaveCount(0);
    await page.locator('[data-dialog-open=filter-dialog]').click();
    expect(
        await page
            .locator('#filter-dialog .table-filter-fields')
            .evaluate(
                (el) =>
                    getComputedStyle(el).gridTemplateColumns.split(' ').length,
            ),
    ).toBe(2);
    const division = page.locator('[data-filter=division]');
    const value = await division.locator('option').nth(1).getAttribute('value');
    await division.selectOption(value);
    const config = await page.locator('#kpi-config').textContent();
    const units = JSON.parse(config)
        .fixture.units.filter((u) => u.div === value)
        .map((u) => u.id);
    expect(
        await page
            .locator('[data-filter=unit] option')
            .evaluateAll((els) => els.map((el) => el.value).filter(Boolean)),
    ).toEqual(units);
    await page.locator('[data-flow-status-select]').selectOption('Final');
    await expect(
        page.locator('#filter-dialog [data-table-filter-remove]'),
    ).toHaveCount(2);
    await page
        .getByRole('button', {
            name: 'Hapus filter Status penilaian: Final',
            exact: true,
        })
        .click();
    await expect(page.locator('[data-flow-status-select]')).toHaveValue('all');
    await expect(
        page.locator('#filter-dialog [data-table-filter-remove]'),
    ).toHaveCount(1);
    await page.locator('[data-flow-status-select]').selectOption('Final');
    await page.locator('#filter-dialog [data-dialog-close]').last().click();
    expect(
        await page.locator('[data-assessment-body] tr:visible').count(),
    ).toBeGreaterThan(0);
    for (const text of await page
        .locator('[data-assessment-body] tr:visible .assessment-status')
        .allTextContents())
        expect(text).toBe('Final');
    await expect(page.locator('[data-table-filter-count]')).toHaveText('2');
    await page.locator('[data-dialog-open=filter-dialog]').click();
    await page.locator('[data-table-filter-reset]').click();
    await expect(page.locator('[data-flow-status-select]')).toHaveValue('all');
    await expect(division).toHaveValue('');
    await expect(page.locator('[data-table-filter-count]')).toBeHidden();
});
test('Tabel staf menampilkan 10, 25, 50 baris dan mereset halaman ketika ukurannya berubah', async ({
    page,
}) => {
    await go(page, '/design-review/hc/struktur');
    const config = JSON.parse(await page.locator('#kpi-config').textContent());
    globalThis.location = { search: '' };
    globalThis.localStorage = { getItem: () => null };
    const data = createFlowStore(config).data;
    const original = data.staff[0];
    for (let i = 1; i <= 60; i++)
        data.staff.push({
            ...structuredClone(original),
            id: `ROW-${i}`,
            name: `Uji baris ${String(i).padStart(2, '0')}`,
            nip: `ROW${i}`,
        });
    await page.evaluate(
        (data) => localStorage.setItem('abprove-flow-v2', JSON.stringify(data)),
        data,
    );
    await page.reload();
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
    await page.locator('[data-org-tab=staff]').click();
    const pager = page.locator('[data-pagination=organization]'),
        size = pager.locator('[data-page-size]'),
        rows = page.locator('[data-org-body] tr:visible');
    await expect(size).toHaveValue('10');
    await expect(rows).toHaveCount(10);
    await pager.locator('[data-page-next]').click();
    await expect(pager).toHaveAttribute('data-page', '2');
    await size.selectOption('25');
    await expect(rows).toHaveCount(25);
    await expect(pager).toHaveAttribute('data-page', '1');
    await size.selectOption('50');
    await expect(rows).toHaveCount(50);
    await page.locator('[data-org-search]').fill('Uji baris 01');
    await expect(rows).toHaveCount(1);
    await expect(size).toHaveValue('50');
});
test('Monitoring KPI memiliki filter unit/jalur/status serta pilihan jumlah baris', async ({
    page,
}) => {
    await go(page, '/design-review/hc/kpi?screen=monitor');
    await page.waitForFunction(
        () =>
            document.querySelector('[data-simple-kpi]')?.dataset.ready ===
            'true',
    );
    await expect(
        page.locator('[data-gp-page-size=simple-monitor]'),
    ).toHaveValue('10');
    await page.locator('[data-dialog-open=skp-monitor-filter]').click();
    await page
        .locator('[data-skp-monitor-filter=kind]')
        .selectOption('unit_head');
    await page
        .locator('#skp-monitor-filter [data-dialog-close]')
        .last()
        .click();
    for (const row of await page
        .locator('[data-skp-monitor-results] tbody tr')
        .allTextContents())
        expect(row).toContain('Penilaian Kepala Unit');
    await page.locator('[data-gp-page-size=simple-monitor]').selectOption('25');
    await expect(
        page.locator('[data-gp-page-size=simple-monitor]'),
    ).toHaveValue('25');
});

test('Panel filter rapi di desktop dan ponsel dengan chip yang tetap dapat dihapus', async ({
    page,
}) => {
    for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await go(page, '/design-review/hc/rekap');
        await page.locator('[data-dialog-open=filter-dialog]').click();
        await page.locator('[data-flow-status-select]').selectOption('Final');
        const dialog = page.locator('#filter-dialog'),
            bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.height).toBeLessThanOrEqual(900 - 16);
        expect(
            await dialog
                .locator('.table-filter-fields')
                .evaluate(
                    (el) =>
                        getComputedStyle(el).gridTemplateColumns.split(' ')
                            .length,
                ),
        ).toBe(width <= 600 ? 1 : 2);
        await expect(
            dialog.locator('[data-table-filter-summary]'),
        ).toContainText('Status penilaian: Final');
        await dialog.locator('[data-table-filter-remove]').click();
        await expect(page.locator('[data-flow-status-select]')).toHaveValue(
            'all',
        );
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
    }
});
