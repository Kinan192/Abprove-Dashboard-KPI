import { test, expect } from '@playwright/test';
const KEY = 'abprove.design-review.kpi-sederhana.v1';
async function go(page, url = '/design-review/hc/kpi') {
    expect((await page.goto(url)).status()).toBe(200);
    await page.waitForFunction(
        () =>
            document.documentElement.dataset.frontendReady === 'true' &&
            document.querySelector('[data-simple-kpi]')?.dataset.ready ===
                'true',
    );
}
const act = (page, name) => page.locator(`[data-skp-action="${name}"]`).first();
const confirm = (page) =>
    page.locator('#confirm-dialog [data-action=confirm-submit]').click();
const state = (page) =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const input = (page, name) => page.locator(`#skp-kpi-form [name="${name}"]`);
test.beforeEach(async ({ page }) => {
    page.errors = [];
    page.writes = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    page.on('request', (r) => {
        if (!['GET', 'HEAD'].includes(r.method())) page.writes.push(r.url());
    });
});
test.afterEach(async ({ page }) => {
    expect(page.errors).toEqual([]);
    expect(page.writes).toEqual([]);
});

test('Alur HTML: informasi, formula, uji angka, penerima dan CRUD bulanan', async ({
    page,
}) => {
    await go(page);
    await expect(page.locator('[data-skp-period-choice]')).toHaveValue(
        '2026-11',
    );
    await expect(
        page.locator('[data-skp-master-results] tbody tr'),
    ).toHaveCount(10);
    const before = (await state(page)).assessments.filter(
        (a) => a.status === 'final',
    );
    await expect(page.locator('#skp-kpi-form')).toHaveCount(0);
    await act(page, 'new').click();
    await expect(page.locator('#skp-kpi-form h2')).toHaveText([
        'Informasi KPI',
        'Target & penilaian',
        'Numerator, denominator & formula',
        'Ditugaskan ke',
    ]);
    await expect(page.locator('[data-fx-tab]')).toHaveCount(0);
    await input(page, 'name').fill('Tiket sesuai standar uji');
    await input(page, 'unitId').selectOption('it');
    await input(page, 'weight').fill('15');
    await input(page, 'method').selectOption('formula');
    await input(page, 'target').fill('95');
    await page
        .locator('[data-fx-variable-label=A]')
        .fill('Tiket selesai sesuai SLA');
    await page
        .locator('[data-fx-variable-label=B]')
        .fill('Total tiket yang dinilai');
    await page.locator('[data-fx-test=A]').fill('65');
    await page.locator('[data-fx-test=B]').fill('80');
    await expect(page.locator('[data-fx-test-output]')).toContainText('85,53');
    await expect(page.locator('[data-fx-test-output]')).toContainText(
        '12,83 poin',
    );
    await expect(page.locator('[data-fx-human]')).toContainText(
        '[Tiket selesai sesuai SLA]',
    );
    await page.locator('[data-fx-assignee=staff-it-1]').check();
    await page.locator('[data-fx-assignee=staff-it-2]').check();
    await page.locator('[data-fx-assignee=staff-it-3]').check();
    await act(page, 'save').click();
    await expect(page.locator('.gp-note.success')).toContainText(
        'Tiket sesuai standar uji',
    );
    await expect(page.locator('.fx-monthly-weights')).toContainText('115%');
    let d = await state(page),
        k = d.kpis.find((k) => k.name === 'Tiket sesuai standar uji');
    expect(k.method).toBe('formula');
    expect(k.testValues).toBeUndefined();
    expect(k.actual).toBeUndefined();
    await act(page, 'edit').click();
    await input(page, 'target').fill('10');
    await input(page, 'unit').selectOption('kegiatan');
    await act(page, 'remove-variable').click();
    await input(page, 'formula').fill('B');
    await page.locator('[data-fx-test=B]').fill('8');
    await expect(page.locator('[data-fx-test-output]')).toContainText('80');
    await act(page, 'save').click();
    await act(page, 'delete').click();
    await confirm(page);
    d = await state(page);
    expect(d.kpis.some((row) => row.id === k.id)).toBe(false);
    expect(d.assessments.filter((a) => a.status === 'final')).toEqual(before);
});
test('Formula tetap, kesalahan pembagi nol, IF dan variabel tambahan', async ({
    page,
}) => {
    await go(page);
    await act(page, 'new').click();
    await input(page, 'name').fill('Penambahan dokter uji');
    await input(page, 'unitId').selectOption('yanmed');
    await input(page, 'targetRole').selectOption('unit_head');
    await input(page, 'weight').fill('20');
    await input(page, 'method').selectOption('formula');
    await input(page, 'target').fill('95');
    await page
        .locator('[data-fx-variable-label=A]')
        .fill('Dokter baru bergabung');
    await page
        .locator('[data-fx-variable-label=B]')
        .fill('Dokter direncanakan');
    await page.locator('[data-fx-variable-source=B]').selectOption('fixed');
    await page.locator('[data-fx-variable-fixed=B]').fill('4');
    await page.locator('[data-fx-test=A]').fill('3');
    await expect(page.locator('[data-fx-test-output]')).toContainText('78,95');
    await expect(page.locator('[data-fx-test=B]')).toHaveValue('4');
    await expect(page.locator('[data-fx-test=B]')).toHaveAttribute(
        'readonly',
        '',
    );
    await page.locator('[data-fx-variable-source=B]').selectOption('manual');
    await page.locator('[data-fx-test=B]').fill('0');
    await expect(page.locator('[data-fx-test-output]')).toContainText(
        'Pembagian dengan nol',
    );
    await input(page, 'formula').fill('A / B');
    await act(page, 'formula-fix').click();
    await expect(input(page, 'formula')).toHaveValue('(A / B) * 100');
    await input(page, 'formula').fill('');
    await page.locator('[data-skp-action=formula-token][data-id=A]').click();
    await page.locator('[data-skp-action=formula-token][data-id="+"]').click();
    await page.locator('[data-skp-action=formula-token][data-id=B]').click();
    await expect(input(page, 'formula')).toHaveValue('A + B ');
    await input(page, 'formula').fill('IF(B > 0, A / B * 100, 0)');
    await expect(page.locator('[data-fx-test-output]')).not.toContainText(
        'Pembagian dengan nol',
    );
    await act(page, 'add-variable').click();
    await page.locator('[data-fx-variable-label=C]').fill('Cadangan dokter');
    await input(page, 'formula').fill('A + C');
    await page.locator('[data-fx-test=C]').fill('2');
    await expect(page.locator('[data-fx-test-output]')).toContainText('5 %');
    await input(page, 'formula').fill('A + Z');
    await act(page, 'save').click();
    await expect(page.locator('[data-gp-error=formula]')).toContainText(
        'belum didefinisikan',
    );
});
test('Jalur staf: aktual otomatis, manual, draft, kirim, revisi dan ACC berakhir di KD', async ({
    page,
}) => {
    await go(page, '/design-review/ku/nilai?redesign=kpi-sederhana');
    let d = await state(page),
        a = d.assessments.find(
            (a) =>
                a.periodId === '2026-11' &&
                a.unitId === 'it' &&
                a.status === 'returned',
        );
    await go(
        page,
        `/design-review/ku/nilai?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await page.locator('[data-skp-input=actual]').fill('65');
    await page.locator('[data-skp-input=comparison]').fill('80');
    await expect(page.locator('[data-result=score]')).toHaveText('85,53');
    await expect(page.locator('[data-skp-input=value]')).toHaveCount(0);
    await page
        .locator('[data-skp-input=evidence]')
        .fill('Rekap tiket bulan ini');
    await page.locator('[data-skp-kpi-index="1"]').click();
    await page.locator('[data-skp-input=actual]').fill('8');
    await expect(page.locator('[data-result=weighted]')).toHaveText('20 poin');
    await page.locator('[data-skp-kpi-index="2"]').click();
    await page.locator('[data-skp-input=value]').fill('85');
    await expect(page.locator('[data-skp-input=actual]')).toHaveCount(0);
    await expect(page.locator('[data-skp-total]')).toHaveText('83,83');
    await act(page, 'draft').click();
    expect(
        (await state(page)).assessments.find((r) => r.id === a.id).status,
    ).toBe('draft');
    await act(page, 'send').click();
    await confirm(page);
    await expect(page.locator('[data-skp-input=value]')).toHaveAttribute(
        'readonly',
        '',
    );
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-skp-input=actual]')).toHaveAttribute(
        'readonly',
        '',
    );
    await expect(act(page, 'complete')).toHaveCount(0);
    await act(page, 'return').click();
    await confirm(page);
    await expect(page.locator('[data-confirm-error]')).toContainText('Alasan');
    await page.locator('[data-confirm-reason]').fill('Periksa bukti tiket.');
    await confirm(page);
    await go(
        page,
        `/design-review/ku/nilai?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-skp-content]')).toContainText(
        'Periksa bukti tiket.',
    );
    await act(page, 'send').click();
    await confirm(page);
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await act(page, 'approve').click();
    await confirm(page);
    d = await state(page);
    expect(d.assessments.find((r) => r.id === a.id).status).toBe('final');
    await expect(page.locator('[data-skp-content]')).toContainText(
        'Penilaian Selesai oleh Kepala Divisi',
    );
});
test('KD langsung menilai Kepala Unit, tanpa selfassessment dan tanpa finalisasi HC', async ({
    page,
}) => {
    await go(page, '/design-review/kd/nilai-kepala?redesign=kpi-sederhana');
    await expect(page.locator('.skp-nav')).toContainText(
        'Penilaian Kepala Unit',
    );
    await expect(page.locator('.skp-nav')).toContainText('Persetujuan Staf');
    const d = await state(page),
        a = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.personId === 'head-med',
        );
    await go(
        page,
        `/design-review/kd/nilai-kepala?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await expect(act(page, 'send')).toHaveCount(0);
    await page.locator('[data-skp-input=actual]').fill('3');
    await expect(page.locator('[data-result=score]')).toHaveText('78,95');
    for (const i of [1, 2]) {
        await page.locator(`[data-skp-kpi-index="${i}"]`).click();
        await page.locator('[data-skp-input=value]').fill('85');
    }
    await act(page, 'draft').click();
    await act(page, 'complete').click();
    await confirm(page);
    const finished = (await state(page)).assessments.find((r) => r.id === a.id);
    expect(finished.status).toBe('final');
    expect(finished.finalTotal.toFixed(2)).toBe('83.79');
    await go(
        page,
        `/design-review/ku/nilai?redesign=kpi-sederhana&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-skp-content]')).toContainText(
        'di luar cakupan',
    );
    await go(page, `/design-review/hc/kpi?screen=assessment&id=${a.id}`);
    for (const action of [
        'draft',
        'send',
        'complete',
        'approve',
        'return',
        'finalize',
    ])
        await expect(act(page, action)).toHaveCount(0);
    await expect(page.locator('[data-skp-input=actual]')).toHaveAttribute(
        'readonly',
        '',
    );
});
test('Periode existing, snapshot historis, dan master Kepala Divisi belum punya alur penilai', async ({
    page,
}) => {
    await go(page, '/design-review/hc/pengaturan');
    await expect(page.locator('[data-skp-content]')).not.toContainText(
        'Batas finalisasi',
    );
    await page.locator('[data-skp-action=period][data-id="2026-10"]').click();
    await expect(page.locator('[form=skp-period-form]')).toBeDisabled();
    await act(page, 'new-period').click();
    await page.locator('#skp-period-form [name=month]').fill('2027-01');
    await page.locator('[form=skp-period-form]').click();
    await confirm(page);
    expect((await state(page)).periods.some((p) => p.id === '2027-01')).toBe(
        true,
    );
    await expect(page.locator('[data-cycle-options]')).toContainText(
        'Penilaian Januari 2027',
    );
    await go(page);
    await act(page, 'new').click();
    await input(page, 'name').fill('KPI Kepala Divisi uji');
    await input(page, 'unitId').selectOption('yanmed');
    await input(page, 'targetRole').selectOption('division_head');
    await input(page, 'weight').fill('100');
    await input(page, 'method').selectOption('manual');
    await input(page, 'formula').fill('');
    await act(page, 'remove-variable').click();
    await act(page, 'remove-variable').click();
    await expect(page.locator('[data-fx-assignment]')).toContainText(
        'belum ditentukan',
    );
    await act(page, 'save').click();
    expect(
        (await state(page)).assessments.some(
            (a) => a.subjectType === 'division_head',
        ),
    ).toBe(false);
});
test('Cakupan role, monitoring hanya baca, pagination dan responsivitas tanpa gambar', async ({
    page,
}) => {
    await go(page, '/design-review/hc/kpi?screen=monitor');
    const d = await state(page),
        foreign = d.assessments.find(
            (a) => a.periodId === '2026-11' && a.unitId === 'rawat-inap',
        );
    await expect(page.locator('[data-skp-content]')).toContainText(
        'Monitoring KPI',
    );
    for (const a of ['approve', 'complete', 'finalize', 'send'])
        await expect(act(page, a)).toHaveCount(0);
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=kpi-sederhana&screen=assessment&id=${foreign.id}`,
    );
    await expect(page.locator('[data-skp-content]')).toContainText(
        'di luar cakupan',
    );
    for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await go(page);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        const pager = page.locator('[data-gp-page]').last();
        expect((await pager.boundingBox()).width).toBeGreaterThanOrEqual(44);
        await act(page, 'new').click();
        await expect(page.locator('#skp-kpi-form')).toBeVisible();
        await input(page, 'unitId').selectOption('it');
        await input(page, 'method').selectOption('formula');
        await page.locator('[data-fx-variable-source=B]').selectOption('fixed');
        await page.locator('[data-fx-variable-fixed=B]').fill('80');
        expect(
            await page.evaluate(() => {
                const el = document.querySelector('.fx-formula-grid');
                return el.scrollWidth <= el.clientWidth;
            }),
        ).toBe(true);
        await expect(page.locator('[data-fx-assignment]')).toBeVisible();
        await expect(page.locator('#skp-kpi-form > section')).toHaveCount(4);
        await expect(page.locator('[data-fx-tab]')).toHaveCount(0);
        expect(
            await page
                .locator('#main-content')
                .evaluate((el) => el.scrollHeight > el.clientHeight),
        ).toBe(true);
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
    }
});

test('Formula HC, penerima individual dan bulan terpisah sampai ACC Kepala Divisi', async ({
    page,
}) => {
    await go(page, '/design-review/hc/pengaturan');
    const old = (await state(page)).assessments.filter(
        (a) => a.periodId === '2026-10',
    );
    await act(page, 'new-period').click();
    await page.locator('#skp-period-form [name=status]').selectOption('open');
    await page.locator('[form=skp-period-form]').click();
    await confirm(page);
    await go(page);
    await page.locator('[data-skp-period-choice]').selectOption('2027-01');
    await expect(page.locator('[data-month-label]')).toHaveText('Januari 2027');
    await act(page, 'new').click();
    await input(page, 'name').fill('Ketersediaan layanan IT bulanan');
    await input(page, 'unitId').selectOption('it');
    await input(page, 'weight').fill('100');
    await input(page, 'method').selectOption('formula');
    await input(page, 'target').fill('99.5');
    await page
        .locator('[data-fx-variable-label=A]')
        .fill('Total menit dalam bulan');
    await page.locator('[data-fx-variable-label=B]').fill('Menit downtime');
    await page
        .locator('[data-skp-action=formula-preset][data-id=uptime]')
        .click();
    await expect(input(page, 'formula')).toHaveValue('(A - B) / A * 100');
    await page.locator('[data-fx-test=A]').fill('43200');
    await page.locator('[data-fx-test=B]').fill('60');
    await expect(page.locator('[data-fx-test-output]')).toContainText('99,86');
    await page.locator('[data-fx-assignee=staff-it-1]').check();
    await page.locator('[data-fx-assignee=staff-it-2]').uncheck();
    await page.locator('[data-fx-assignee=staff-it-3]').uncheck();
    await expect(page.locator('[data-fx-assignee=staff-it-1]')).toBeChecked();
    await expect(
        page.locator('[data-fx-assignee=staff-it-2]'),
    ).not.toBeChecked();
    await act(page, 'save').click();
    let d = await state(page),
        k = d.kpis.find((k) => k.name === 'Ketersediaan layanan IT bulanan');
    expect(k.periodId).toBe('2027-01');
    expect(k.assigneeIds).toEqual(['staff-it-1']);
    const rows = d.assessments.filter((a) => a.periodId === '2027-01');
    expect(rows).toHaveLength(1);
    const a = rows[0];
    await go(
        page,
        `/design-review/ku/nilai?redesign=kpi-sederhana&cycle=2027-01&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-skp-input=variable_A]')).toHaveValue('');
    await page.locator('[data-skp-input=variable_A]').fill('43200');
    await page.locator('[data-skp-input=variable_B]').fill('60');
    await expect(page.locator('[data-skp-total]')).toHaveText('100');
    await act(page, 'send').click();
    await confirm(page);
    await go(
        page,
        `/design-review/kd/persetujuan?redesign=kpi-sederhana&cycle=2027-01&screen=assessment&id=${a.id}`,
    );
    await expect(page.locator('[data-skp-input=variable_A]')).toHaveAttribute(
        'readonly',
        '',
    );
    await act(page, 'approve').click();
    await confirm(page);
    d = await state(page);
    expect(d.assessments.find((row) => row.id === a.id).status).toBe('final');
    const final = JSON.stringify(d.assessments.find((row) => row.id === a.id));
    await go(page);
    await page.locator('[data-skp-period-choice]').selectOption('2027-01');
    await page.locator(`[data-skp-action=edit][data-id="${k.id}"]`).click();
    await input(page, 'name').fill('KPI direvisi setelah selesai');
    await act(page, 'save').click();
    expect(
        JSON.stringify(
            (await state(page)).assessments.find((row) => row.id === a.id),
        ),
    ).toBe(final);
    expect(
        (await state(page)).assessments.filter((a) => a.periodId === '2026-10'),
    ).toEqual(old);
    await go(page);
    await expect(page.locator('[data-skp-master-results]')).not.toContainText(
        'KPI direvisi setelah selesai',
    );
});

test('Daftar terpisah, form scroll utuh dan konfirmasi navigasi mempertahankan isian', async ({
    page,
}) => {
    await go(page);
    await expect(page.locator('#skp-kpi-form')).toHaveCount(0);
    await page.locator('[data-gp-page-size=simple-master]').selectOption('25');
    await act(page, 'new').click();
    await expect(page.locator('.fx-kpi-list')).toHaveCount(0);
    await input(page, 'name').fill('Isian belum disimpan');
    await input(page, 'weight').fill('20');
    await input(page, 'unitId').selectOption('it');
    await page.locator('[data-fx-assignee=staff-it-1]').check();
    await page.locator('[data-fx-test=A]').fill('65');
    await input(page, 'name').focus();
    await expect(input(page, 'name')).toHaveValue('Isian belum disimpan');
    await expect(page.locator('[data-fx-test=A]')).toHaveValue('65');
    await expect(page.locator('[data-fx-assignee=staff-it-1]')).toBeChecked();
    await page.locator('[data-skp-nav=periods]').click();
    await page.locator('#confirm-dialog [data-dialog-close]').last().click();
    await expect(input(page, 'name')).toHaveValue('Isian belum disimpan');
    await page.locator('[data-skp-nav=periods]').click();
    await confirm(page);
    await expect(page.locator('#skp-period-form')).toHaveCount(0);
    await act(page, 'new-period').click();
    await expect(page.locator('#skp-period-form > section')).toHaveCount(3);
    await expect(page.locator('dialog #skp-period-form')).toHaveCount(0);
    await page
        .locator('#skp-period-form [name=name]')
        .fill('Siklus bulanan uji');
    await page.locator('#skp-period-form [name=sb]').fill('50');
    await page.locator('[form=skp-period-form]').click();
    await expect(page.locator('[data-gp-error=categories]')).toContainText(
        'Batas harus',
    );
    await page.locator('[data-skp-nav=master]').click();
    await page.locator('#confirm-dialog [data-dialog-close]').last().click();
    await expect(page.locator('#skp-period-form [name=name]')).toHaveValue(
        'Siklus bulanan uji',
    );
    await page.locator('#skp-period-form [name=sb]').fill('90');
    await page.locator('[form=skp-period-form]').focus();
    await page.keyboard.press('Enter');
    await confirm(page);
    expect(
        (await state(page)).periods.find((p) => p.id === '2027-01').name,
    ).toBe('Siklus bulanan uji');
    for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page
            .locator('[data-skp-action=period][data-id="2027-01"]')
            .click();
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await expect(page.locator('#skp-period-form > section')).toHaveCount(3);
        await page.locator('[data-skp-nav=periods]').first().click();
    }
});
