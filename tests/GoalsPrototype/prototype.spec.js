import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const KEY = 'abprove.goals-cycle.design-review.v1';
async function go(page, url = '/design-review/hc/kpi') {
    const response = await page.goto(url);
    expect(response.status()).toBe(200);
    await page.waitForFunction(
        () =>
            document.documentElement.dataset.frontendReady === 'true' &&
            document.querySelector('[data-goal-prototype]')?.dataset
                .prototypeReady === 'true',
    );
}
const act = (page, name) => page.locator(`[data-gp-action="${name}"]`);
const confirm = (page) =>
    page.locator('#confirm-dialog [data-action=confirm-submit]').click();
const state = (page) =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
async function create(
    page,
    {
        type = 'individual',
        cycle = '2026-12',
        weight = '100',
        name = 'Kepatuhan evaluasi pelayanan',
    } = {},
) {
    await act(page, 'new-goal').click();
    await page.locator(`[name=gp-type][value=${type}]`).check();
    await act(page, 'choose-type').click();
    await page.locator('#gp-goal-form [name=name]').fill(name);
    if (type === 'individual')
        await page.locator('[name=templateId]').selectOption('tpl-sdm');
    else
        await page
            .locator('[name=ownerId]')
            .selectOption(
                type === 'company'
                    ? 'hospital'
                    : type === 'team'
                      ? 'igd'
                      : 'medis',
            );
    await page.locator('[name=cycleId]').selectOption(cycle);
    await act(page, 'goal-next').click();
    await page.locator('#gp-goal-form [name=weight]').fill(weight);
    await act(page, 'measurement-details').click();
    await page
        .locator('#gp-drawer-form [name=numerator]')
        .fill('Jumlah pelayanan sesuai standar');
    await page
        .locator('#gp-drawer-form [name=denominator]')
        .fill('Total pelayanan dalam satu bulan');
    await page.locator('[data-gp-drawer-save]').click();
    await page.locator('#gp-goal-form [name=targetText]').fill('95%');
}
async function review(page) {
    await act(page, 'goal-next').click();
    await act(page, 'goal-next').click();
    await act(page, 'goal-next').click();
}
test.beforeEach(async ({ page }) => {
    page.errors = [];
    page.mutations = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    page.on('request', (r) => {
        if (!['GET', 'HEAD'].includes(r.method())) page.mutations.push(r.url());
    });
});
test.afterEach(async ({ page }) => {
    expect(page.errors).toEqual([]);
    expect(page.mutations).toEqual([]);
});

test('Daftar, filter, pagination 5, format foto, dan ekspor KPI', async ({
    page,
}) => {
    await go(page);
    await expect(page.locator('[data-gp-results] tbody tr')).toHaveCount(5);
    const first = await page.locator('[data-gp-results] tbody').innerText();
    await page.locator('[data-gp-page=goals][data-delta="1"]').click();
    expect(await page.locator('[data-gp-results] tbody').innerText()).not.toBe(
        first,
    );
    await page.locator('[data-gp-search=goals]').fill('rekam medis');
    await expect(page.locator('[data-gp-results] tbody tr')).toHaveCount(1);
    await page.locator('[data-gp-search=goals]').fill('tidak-ada-data');
    await expect(page.locator('[data-gp-results]')).toContainText(
        'Belum ada Goal',
    );
    await page.locator('[data-gp-search=goals]').fill('');
    await act(page, 'goal-filters').click();
    await page.locator('#gp-drawer-form [name=division]').selectOption('medis');
    expect(
        await page
            .locator('#gp-drawer-form [name=unit] option')
            .allTextContents(),
    ).toEqual(['Semua unit', 'Pelayanan Medis', 'Instalasi Gawat Darurat']);
    await page.locator('#gp-drawer-form [name=unit]').selectOption('igd');
    await page.locator('[data-gp-drawer-save]').click();
    await expect(page.locator('[data-gp-results]')).toContainText(
        'Dokter Umum',
    );
    await go(
        page,
        '/design-review/hc/kpi?screen=template-detail&id=tpl-yanmed',
    );
    expect(await page.locator('thead th').allTextContents()).toEqual([
        'No.',
        'Pilar',
        'KPI',
        'Numerator',
        'Denominator',
        'Formula pengukuran',
        'Target',
        'Bobot (%)',
        'Tindakan',
    ]);
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await expect(page.locator('.gp-template-note')).toContainText('100%');
    await page
        .locator('[data-gp-page=indicator-table][data-delta="1"]')
        .click();
    await expect(page.locator('tbody')).toContainText(
        'Kesesuaian Discharge Planning',
    );
    const download = page.waitForEvent('download');
    await act(page, 'export-template').click();
    expect((await download).suggestedFilename()).toContain('.csv');
});

test('Create, KR drawer, konfigurasi, publikasi, duplikasi dan hapus Draft', async ({
    page,
}) => {
    await go(page);
    await create(page);
    await page.locator('#gp-goal-form [name=target]').fill('75');
    await act(page, 'goal-next').click();
    await expect(page.locator('[data-gp-error=target]')).toContainText(
        'lebih besar',
    );
    await page.locator('#gp-goal-form [name=target]').fill('95');
    await act(page, 'goal-next').click();
    await act(page, 'add-kr').click();
    await page
        .locator('#gp-drawer-form [name=name]')
        .fill('Audit dokumen selesai');
    await page.locator('#gp-drawer-form [name=target]').fill('98');
    await page.locator('[data-gp-drawer-save]').click();
    await expect(page.locator('.gp-kr-list')).toContainText(
        'Audit dokumen selesai',
    );
    await act(page, 'edit-kr').click();
    await page
        .locator('#gp-drawer-form [name=name]')
        .fill('Audit layanan selesai');
    await page.locator('[data-gp-drawer-save]').click();
    await act(page, 'goal-next').click();
    await act(page, 'goal-config').click();
    await page.locator('#gp-drawer-form [name=repeat]').check();
    await page.locator('[data-gp-drawer-save]').click();
    await act(page, 'goal-next').click();
    await expect(act(page, 'publish-goal')).toBeEnabled();
    await act(page, 'publish-goal').click();
    await confirm(page);
    await expect(page.locator('[data-gp-content] h1')).toHaveText(
        'Kepatuhan evaluasi pelayanan',
    );
    await expect(page.locator('[data-month-label]')).toHaveText(
        'Desember 2026',
    );
    let data = await state(page),
        goal = data.goals.find(
            (g) => g.name === 'Kepatuhan evaluasi pelayanan',
        );
    expect(goal.status).toBe('active');
    expect(goal.keyResults[0].name).toBe('Audit layanan selesai');
    expect(goal.repeat).toBe(true);
    await page.reload();
    await page.waitForFunction(
        () => document.documentElement.dataset.frontendReady === 'true',
    );
    await act(page, 'duplicate-goal').click();
    await act(page, 'goal-next').click();
    await review(page);
    await expect(act(page, 'publish-goal')).toBeDisabled();
    await expect(page.locator('#gp-goal-form')).toContainText('200%');
    await act(page, 'save-goal-draft').click();
    await expect(page.locator('[data-gp-content] h1')).toContainText(
        '(salinan)',
    );
    await act(page, 'delete-goal').click();
    await confirm(page);
    data = await state(page);
    expect(
        data.goals.some(
            (g) => g.name === 'Kepatuhan evaluasi pelayanan (salinan)',
        ),
    ).toBe(false);
});

test('Empat tipe Goal berfungsi; simpan parsial, keyboard dan konfirmasi keluar', async ({
    page,
}) => {
    for (const type of ['individual', 'team', 'organization', 'company']) {
        await go(page);
        await create(page, { type, name: `Target ${type} pelayanan` });
        await act(page, 'save-goal-draft').click();
        const data = await state(page);
        expect(
            data.goals.find((g) => g.name === `Target ${type} pelayanan`).type,
        ).toBe(type);
    }
    await go(page);
    await act(page, 'new-goal').click();
    await expect(act(page, 'choose-type')).toBeDisabled();
    await page.locator('[name=gp-type][value=individual]').check();
    await act(page, 'choose-type').click();
    await page.locator('#gp-goal-form [name=name]').fill('Draft parsial');
    await act(page, 'save-goal-draft').click();
    await expect(page.locator('[data-gp-content] h1')).toHaveText(
        'Draft parsial',
    );
    await act(page, 'edit-goal').click();
    await page
        .locator('#gp-goal-form [name=name]')
        .fill('Perubahan belum disimpan');
    await page.locator('.gp-nav [data-gp-nav=cycles]').click();
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page.locator('#confirm-dialog [data-dialog-close]').last().click();
    await expect(page.locator('#gp-goal-form [name=name]')).toHaveValue(
        'Perubahan belum disimpan',
    );
    await act(page, 'cancel-goal').click();
    await confirm(page);
    await expect(page.locator('[data-gp-results]')).toBeVisible();
});

test('Periode: validasi bulan unik, jadwal WIB, kategori, detail dan activation guard', async ({
    page,
}) => {
    await go(page, '/design-review/hc/pengaturan');
    await act(page, 'new-cycle').click();
    await page.locator('[name=month]').fill('2026-11');
    await act(page, 'cycle-next').click();
    await expect(page.locator('[data-gp-error=month]')).toContainText('sudah');
    await page.locator('[name=month]').fill('2027-02');
    await act(page, 'cycle-next').click();
    await expect(page.locator('[name=opens]')).toHaveValue('2027-03-01T08:00');
    await page.locator('[name=submission]').fill('2027-02-28T23:59');
    await act(page, 'cycle-next').click();
    await expect(page.locator('[data-gp-error=submission]')).toContainText(
        'setelah',
    );
    await page.locator('[name=submission]').fill('2027-03-05T23:59');
    await act(page, 'cycle-next').click();
    await page.locator('[name=templateIds][value=tpl-sdm]').check();
    await page.locator('[name=b]').fill('95');
    await act(page, 'cycle-next').click();
    await expect(page.locator('[data-gp-error=categories]')).toContainText(
        'Batas',
    );
    await page.locator('[name=b]').fill('80');
    await act(page, 'cycle-next').click();
    await act(page, 'save-cycle').click();
    await confirm(page);
    await expect(page.locator('[data-gp-content] h1')).toHaveText(
        'Penilaian Februari 2027',
    );
    await act(page, 'activate-cycle').click();
    await expect(page.locator('[data-gp-global-error]')).toContainText('KPI');
    await page.locator('[data-gp-cycle-tab=schedule]').click();
    await expect(page.locator('.gp-process-timeline')).toContainText(
        'Batas finalisasi',
    );
});

test('Duplikasi periode tidak membawa hasil, publikasi template dan aktivasi snapshot', async ({
    page,
}) => {
    await go(
        page,
        '/design-review/hc/pengaturan?screen=cycle-detail&id=2026-11',
    );
    const initial = await state(page),
        finals = initial.assessments.filter((a) => a.status === 'Final');
    await act(page, 'repeat-cycle').click();
    await page.locator('#gp-drawer-form [name=month]').fill('2026-12');
    await page.locator('[data-gp-drawer-save]').click();
    await expect(page.locator('[data-gp-global-error]')).toContainText(
        'sudah tersedia',
    );
    await page.locator('#gp-drawer-form [name=month]').fill('2027-01');
    await page.locator('[data-gp-drawer-save]').click();
    let data = await state(page);
    expect(data.cycles.find((c) => c.id === '2027-01').status).toBe('draft');
    expect(
        data.goals
            .filter((g) => g.cycleId === '2027-01')
            .every((g) => g.actual === null && g.status === 'draft'),
    ).toBe(true);
    expect(
        data.assessments.filter((a) => a.cycleId === '2027-01'),
    ).toHaveLength(0);
    expect(data.assessments.filter((a) => a.status === 'Final')).toEqual(
        finals,
    );
    for (const id of ['tpl-yanmed', 'tpl-igd', 'tpl-inap']) {
        await go(
            page,
            `/design-review/hc/kpi?screen=template-detail&id=${id}&cycle=2027-01`,
        );
        await act(page, 'publish-template').click();
        await confirm(page);
    }
    await go(
        page,
        '/design-review/hc/pengaturan?screen=cycle-detail&id=2027-01&cycle=2027-01',
    );
    await act(page, 'activate-cycle').click();
    await confirm(page);
    data = await state(page);
    expect(
        data.assessments.filter((a) => a.cycleId === '2027-01'),
    ).toHaveLength(6);
    expect(
        data.assessments
            .filter((a) => a.cycleId === '2027-01')
            .every(
                (a) =>
                    a.status === 'Belum diisi' && !Object.keys(a.scores).length,
            ),
    ).toBe(true);
    await act(page, 'close-cycle').click();
    await expect(page.locator('[data-gp-global-error]')).toContainText(
        '6 penilaian belum Final',
    );
});

test('Siklus penuh KU → KD → HC, nilai integer, scope, keputusan dan Final terkunci', async ({
    page,
}) => {
    await go(page, '/design-review/ku/nilai?redesign=goals');
    let data = await state(page),
        a = data.assessments.find(
            (a) => a.cycleId === '2026-11' && a.status === 'Belum diisi',
        ),
        foreign = data.assessments.find(
            (a) => a.cycleId === '2026-11' && a.unitId === 'rawat-inap',
        );
    await go(
        page,
        `/design-review/ku/nilai?redesign=goals&screen=assessment&id=${foreign.id}`,
    );
    await expect(page.locator('[data-gp-content]')).toContainText(
        'tidak berada dalam cakupan',
    );
    await go(
        page,
        `/design-review/ku/nilai?redesign=goals&screen=assessment&id=${a.id}`,
    );
    await page.locator('[data-gp-score]').first().fill('85.5');
    await expect(page.locator('[data-gp-score-error]').first()).toContainText(
        'Bilangan bulat',
    );
    await act(page, 'assessment-submit').click();
    await expect(page.locator('[data-gp-assessment-error]')).toContainText(
        'Lengkapi',
    );
    for (const input of await page.locator('[data-gp-score]').all())
        await input.fill('85');
    await expect(page.locator('[data-gp-total]')).toHaveText('85');
    await act(page, 'assessment-draft').click();
    data = await state(page);
    expect(data.assessments.find((r) => r.id === a.id).status).toBe('Draft');
    await act(page, 'assessment-submit').click();
    await confirm(page);
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=goals&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-gp-score]')).toHaveCount(0);
    await expect(act(page, 'assessment-finalize')).toHaveCount(0);
    await act(page, 'assessment-return').click();
    await confirm(page);
    await expect(page.locator('[data-confirm-error]')).toContainText('Alasan');
    await page
        .locator('[data-confirm-reason]')
        .fill('Lengkapi bukti dokumentasi.');
    await confirm(page);
    await go(
        page,
        `/design-review/ku/nilai?redesign=goals&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-gp-content]')).toContainText(
        'Lengkapi bukti dokumentasi.',
    );
    await act(page, 'assessment-submit').click();
    await confirm(page);
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=goals&screen=assessment&id=${a.id}`,
    );
    await act(page, 'assessment-approve').click();
    await confirm(page);
    data = await state(page);
    expect(data.assessments.find((r) => r.id === a.id).status).toBe(
        'Disetujui',
    );
    await go(page, `/design-review/hc/kpi?screen=assessment&id=${a.id}`);
    await act(page, 'assessment-finalize').click();
    await confirm(page);
    data = await state(page);
    const final = data.assessments.find((r) => r.id === a.id);
    expect(final.status).toBe('Final');
    expect(final.finalTotal).toBe(85);
    expect(final.finalCategory).toBe('Baik');
    await expect(page.locator('[data-gp-content]')).toContainText(
        'Hasil Final terkunci',
    );
    await expect(page.locator('[data-gp-score]')).toHaveCount(0);
    await expect(act(page, 'assessment-finalize')).toHaveCount(0);
    await page.locator('[data-gp-assessment-tab=history]').click();
    await expect(page.locator('.gp-timeline')).toContainText('Kepala Divisi');
    await expect(page.locator('.gp-timeline')).toContainText('Super HC');
});

test('Aktual bukan nilai, progress di atas 100%, dan snapshot tetap utuh', async ({
    page,
}) => {
    await go(page);
    const initial = await state(page),
        goal = initial.goals.find(
            (g) =>
                g.cycleId === '2026-11' &&
                g.baseline === '80' &&
                g.target === '95',
        );
    const snapshot = initial.assessments.filter((a) => a.status === 'Final');
    await go(page, `/design-review/hc/kpi?screen=goal-detail&id=${goal.id}`);
    await page.locator('[data-gp-detail-tab=measurement]').click();
    await act(page, 'update-actual').click();
    await page.locator('#gp-drawer-form [name=actual]').fill('92');
    await page.locator('[data-gp-drawer-save]').click();
    await expect(page.locator('.gp-definitions')).toContainText('80%');
    await act(page, 'update-actual').click();
    await page.locator('#gp-drawer-form [name=actual]').fill('98');
    await page.locator('[data-gp-drawer-save]').click();
    await expect(page.locator('.gp-definitions')).toContainText('120%');
    const data = await state(page);
    expect(data.assessments.filter((a) => a.status === 'Final')).toEqual(
        snapshot,
    );
    await act(page, 'archive-goal').click();
    await confirm(page);
    expect(
        (await state(page)).assessments.filter((a) => a.status === 'Final'),
    ).toEqual(snapshot);
});

test('Drawer tidak membuang isian diam-diam dan error penyimpanan tidak menjadi sukses', async ({
    page,
}) => {
    await go(page);
    await create(page);
    await act(page, 'goal-next').click();
    await act(page, 'add-kr').click();
    await page.locator('#gp-drawer-form [name=name]').fill('Belum disimpan');
    await page.keyboard.press('Escape');
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page.locator('#confirm-dialog [data-dialog-close]').last().click();
    await expect(page.locator('#gp-drawer-form [name=name]')).toHaveValue(
        'Belum disimpan',
    );
    await act(page, 'cancel-drawer').click();
    await confirm(page);
    await page.evaluate((key) => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            if (k === key) throw new Error('Penyimpanan browser diblokir.');
            return original.call(this, k, v);
        };
    }, KEY);
    await act(page, 'save-goal-draft').click();
    await expect(page.locator('[data-gp-global-error]')).toContainText(
        'Penyimpanan browser diblokir',
    );
    await expect(page.locator('#gp-goal-form')).toBeVisible();
});

test('Responsif, tombol pagination, dan screenshot audit', async ({ page }) => {
    fs.mkdirSync('output/design-review/kpi-periode', { recursive: true });
    for (const width of [1440, 768, 390]) {
        await page.setViewportSize({
            width,
            height: width === 1440 ? 900 : 1024,
        });
        for (const [name, url] of [
            ['goals', '/design-review/hc/kpi'],
            [
                'template',
                '/design-review/hc/kpi?screen=template-detail&id=tpl-yanmed',
            ],
            ['cycles', '/design-review/hc/pengaturan'],
        ]) {
            await go(page, url);
            expect(
                await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                ),
            ).toBe(true);
            const button = page.locator('[data-gp-page]').last();
            expect((await button.boundingBox()).width).toBeGreaterThanOrEqual(
                44,
            );
            if (width === 1440 && name === 'goals')
                expect(
                    await page
                        .locator('main')
                        .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
                ).toBe(true);
            await page.screenshot({
                path: `output/design-review/kpi-periode/${name}-${width}.png`,
            });
        }
        await go(page);
        await act(page, 'new-goal').click();
        await page.locator('[name=gp-type][value=individual]').check();
        await act(page, 'choose-type').click();
        await expect(page.locator('#gp-goal-form')).toBeVisible();
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await page.screenshot({
            path: `output/design-review/kpi-periode/create-${width}.png`,
        });
        if (width === 1440) {
            const next = await act(page, 'goal-next').boundingBox();
            expect(next.y + next.height).toBeLessThanOrEqual(900);
            await page
                .locator('#gp-goal-form [name=name]')
                .fill('Kepatuhan pelayanan');
            await page.locator('[name=templateId]').selectOption('tpl-sdm');
            await act(page, 'goal-next').click();
            const measurementNext = await act(page, 'goal-next').boundingBox();
            expect(
                measurementNext.y + measurementNext.height,
            ).toBeLessThanOrEqual(900);
            await page.screenshot({
                path: 'output/design-review/kpi-periode/measurement-1440.png',
            });
            await act(page, 'cancel-goal').click();
            await confirm(page);
        }
    }
});

test('Konflik antar-tab dan data rusak tidak ditimpa diam-diam', async ({
    page,
}) => {
    await go(page);
    await create(page);
    await page.evaluate((key) => {
        const d = JSON.parse(localStorage.getItem(key));
        d.revision = (d.revision || 0) + 1;
        localStorage.setItem(key, JSON.stringify(d));
    }, KEY);
    await act(page, 'save-goal-draft').click();
    await expect(page.locator('[data-gp-global-error]')).toContainText(
        'berubah di tab lain',
    );
    await expect(page.locator('#gp-goal-form')).toBeVisible();
    await act(page, 'reset-prototype').click();
    await confirm(page);
    expect((await state(page)).goals).toHaveLength(46);
    await page.evaluate(
        (key) => localStorage.setItem(key, '{"version":1}'),
        KEY,
    );
    await page.reload();
    await expect(page.locator('[data-gp-content]')).toContainText(
        'tidak dapat dibaca',
    );
    await page
        .locator('[data-gp-content] [data-gp-action=reset-prototype]')
        .click();
    await confirm(page);
    await expect(page.locator('[data-gp-results] tbody tr')).toHaveCount(5);
});

test('Gagal memuat modul menampilkan error dan tombol muat ulang', async ({
    page,
}) => {
    await page.route('**/build/assets/goals-*.js', (route) => route.abort());
    await page.goto('/design-review/hc/kpi');
    await expect(page.locator('[data-gp-content] [role=alert]')).toContainText(
        'belum dapat dimuat',
    );
    await expect(page.locator('[data-gp-content] button')).toHaveText(
        'Muat ulang',
    );
});

test('Dari Buat Periode dan Goal baru sampai seluruh anggota Final dan periode ditutup', async ({
    page,
}) => {
    await go(page, '/design-review/hc/pengaturan');
    const priorFinals = (await state(page)).assessments.filter(
        (a) => a.status === 'Final',
    );
    await act(page, 'new-cycle').click();
    await page.locator('[name=month]').fill('2027-01');
    await act(page, 'cycle-next').click();
    await act(page, 'cycle-next').click();
    await page.locator('[name=templateIds][value=tpl-igd]').check();
    await act(page, 'cycle-next').click();
    await act(page, 'save-cycle').click();
    await confirm(page);
    await go(page, '/design-review/hc/kpi?cycle=2027-01');
    await act(page, 'new-goal').first().click();
    await page.locator('[name=gp-type][value=individual]').check();
    await act(page, 'choose-type').click();
    await page
        .locator('#gp-goal-form [name=name]')
        .fill('Kepatuhan triase terpadu');
    await page.locator('[name=templateId]').selectOption('tpl-igd');
    await act(page, 'goal-next').click();
    await page.locator('#gp-goal-form [name=weight]').fill('100');
    await review(page);
    await act(page, 'publish-goal').click();
    await confirm(page);
    await go(
        page,
        '/design-review/hc/pengaturan?screen=cycle-detail&id=2027-01&cycle=2027-01',
    );
    await act(page, 'activate-cycle').click();
    await confirm(page);
    const rows = (await state(page)).assessments.filter(
        (a) => a.cycleId === '2027-01',
    );
    expect(rows).toHaveLength(3);
    for (const a of rows) {
        await go(
            page,
            `/design-review/ku/nilai?redesign=goals&screen=assessment&cycle=2027-01&id=${a.id}`,
        );
        await page.locator('[data-gp-score]').fill('85');
        await act(page, 'assessment-submit').click();
        await confirm(page);
        await go(
            page,
            `/design-review/kd/persetujuan?redesign=goals&screen=assessment&cycle=2027-01&id=${a.id}`,
        );
        await act(page, 'assessment-approve').click();
        await confirm(page);
        await go(
            page,
            `/design-review/hc/kpi?screen=assessment&cycle=2027-01&id=${a.id}`,
        );
        await act(page, 'assessment-finalize').click();
        await confirm(page);
    }
    await go(
        page,
        '/design-review/hc/pengaturan?screen=cycle-detail&id=2027-01&cycle=2027-01',
    );
    await act(page, 'close-cycle').click();
    await confirm(page);
    const data = await state(page);
    expect(data.cycles.find((c) => c.id === '2027-01').status).toBe('closed');
    expect(
        data.assessments
            .filter((a) => a.cycleId === '2027-01')
            .every((a) => a.status === 'Final' && a.finalTotal === 85),
    ).toBe(true);
    expect(
        data.assessments.filter((a) => priorFinals.some((f) => f.id === a.id)),
    ).toEqual(priorFinals);
    await expect(act(page, 'edit-cycle')).toBeDisabled();
});
