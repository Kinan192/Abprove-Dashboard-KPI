import { test, expect } from '@playwright/test';
if (process.env.KPI_ISOLATED_TEST !== '1') throw new Error('Database uji terisolasi wajib.');
async function ready(page) {
    await page.waitForFunction(() => document.documentElement.dataset.frontendReady === 'true');
    if (await page.locator('[data-simple-kpi]').count()) await page.waitForFunction(() => document.querySelector('[data-simple-kpi]').dataset.ready === 'true');
}
async function login(browser, account) {
    const context = await browser.newContext({ baseURL: process.env.KPI_E2E_URL });
    const page = await context.newPage();
    await page.goto('/login');
    await page.locator('[name=identifier]').fill(account+'@kpi.test');
    await page.locator('[name=password]').fill(process.env.KPI_E2E_PASSWORD);
    await Promise.all([page.waitForURL('**/dashboard'), page.locator('[data-login-submit]').click()]);
    await ready(page);
    return { context, page };
}
async function go(page, path) { await page.goto(path); await ready(page); }
const confirm = page => page.locator('#confirm-dialog [data-action=confirm-submit]').click();
async function api(page,path) { return page.evaluate(async path => (await fetch(path,{headers:{Accept:'application/json'}})).json(),path); }

test('KPI dan periode HC terpakai KU, persetujuan KD, nilai Kepala Unit dan laporan HC', async ({browser}) => {
    test.setTimeout(120000);
    const hc = await login(browser,'hc.demo');
    const errors=[];
    hc.page.on('pageerror',error=>errors.push(error.message));
    const initial = await api(hc.page,'/hc/kpi-workspace');
    const nextMonth = new Date(initial.data.periods.map(p=>p.id).sort().at(-1)+'-01T12:00:00Z');
    nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
    const month = nextMonth.toISOString().slice(0,7);
    const unit = initial.data.units.find(u=>u.name==='IT Contoh');
    const staff = initial.data.people.find(p=>p.unitId===unit.id&&p.type==='staff');
    const head = initial.data.people.find(p=>p.unitId===unit.id&&p.type==='unit_head');
    await go(hc.page,'/hc/settings');
    await hc.page.locator('[data-skp-action=new-period]').click();
    const period = hc.page.locator('#skp-period-form');
    for (const [key,value] of Object.entries({month,name:'Periode integrasi Desember',opens:'2026-11-01T00:00',submission:'2027-12-20T23:59',approval:'2027-12-25T23:59',closes:'2027-12-31T23:59'})) await period.locator('[name='+key+']').fill(value);
    await period.locator('button[type=submit]').click(); await confirm(hc.page);
    await expect(hc.page.locator('.fx-period-list')).toContainText('Periode integrasi Desember');
    for (const [role,person,automatic] of [['staff',staff,true],['unit_head',head,false]]) {
        await go(hc.page,'/hc/kpi-templates?cycle='+month);
        await hc.page.locator('[data-skp-action=new]').click();
        const form=hc.page.locator('#skp-kpi-form');
        await form.locator('[name=name]').fill('Integrasi '+role);
        await form.locator('[name=periodId]').selectOption(month);
        await form.locator('[name=unitId]').selectOption(unit.id);
        await form.locator('[name=targetRole]').selectOption(role);
        await form.locator('[name=weight]').fill('100');
        if (automatic) {
            await form.locator('[name=target]').fill('80');
            await hc.page.locator('[data-fx-variable-label=A]').fill('Tiket selesai');
            await hc.page.locator('[data-fx-variable-label=B]').fill('Total tiket');
            await hc.page.locator('[data-fx-variable-source=B]').selectOption('fixed');
            await hc.page.locator('[data-fx-variable-fixed=B]').fill('100');
        } else {
            await form.locator('[name=method]').selectOption('manual');
            await form.locator('[name=formula]').fill('');
            while(await hc.page.locator('[data-skp-action=remove-variable]').count()) await hc.page.locator('[data-skp-action=remove-variable]').first().click();
        }
        await hc.page.locator('[data-fx-assignee="'+person.id+'"]').check();
        await hc.page.locator('[data-skp-action=save]').click();
        await expect(hc.page.locator('.fx-kpi-list')).toContainText('Integrasi '+role);
    }
    await go(hc.page,'/hc/settings');
    await hc.page.locator('[data-skp-action=period][data-id="'+month+'"]').click();
    await hc.page.locator('#skp-period-form [name=status]').selectOption('open');
    await hc.page.locator('#skp-period-form button[type=submit]').click();await confirm(hc.page);
    await expect(hc.page.locator('.fx-period-list')).toContainText('Aktif');
    const cycles=await api(hc.page,'/cycles');
    expect(cycles.data.some(c=>c.assessment_month===month+'-01'&&c.status==='open')).toBeTruthy();

    const ku=await login(browser,'ku.it');ku.page.on('pageerror',e=>errors.push(e.message));
    await go(ku.page,'/unit/score?cycle='+month+'&person=EMP-'+staff.id.replace('staff-',''));
    await expect(ku.page.locator('[data-score-mount]')).toContainText('Integrasi staff');
    await ku.page.locator('[data-measurement][data-variable=A]').fill('60');
    await expect(ku.page.locator('[data-measurement-result]')).toContainText('75');
    await ku.page.locator('[data-flow-action=send-assessment]').click();await confirm(ku.page);
    await expect(ku.page.locator('[data-score-mount] [data-status]')).toContainText('Diajukan');

    const kd=await login(browser,'kd.umum');kd.page.on('pageerror',e=>errors.push(e.message));
    await go(kd.page,'/division/approvals?cycle='+month);
    await kd.page.locator('[data-filter=search]').fill(staff.nip);
    await kd.page.locator('[data-review-person]').first().click();
    await expect(kd.page.locator('#review-dialog')).toContainText('Integrasi staff');
    await kd.page.locator('#review-dialog [data-flow-action=final]').click();await confirm(kd.page);
    await expect(kd.page.locator('#review-dialog')).toBeHidden();
    await go(kd.page,'/division/heads?cycle='+month+'&person=HEAD-'+head.id.replace('head-',''));
    await expect(kd.page.locator('[data-score-mount]')).toContainText('Integrasi unit_head');
    await kd.page.locator('[data-score-mount] [data-score]').fill('88');
    await kd.page.locator('[data-flow-action=send-assessment]').click();await confirm(kd.page);
    await expect(kd.page.locator('[data-score-mount] [data-status]')).toContainText('Final');
    await go(hc.page,'/hc/kpi-templates?screen=monitor&cycle='+month);
    await expect(hc.page.locator('[data-skp-monitor-results]')).toContainText('75');
    await expect(hc.page.locator('[data-skp-monitor-results]')).toContainText('88');
    await go(hc.page,'/hc/recap?cycle='+month);
    await hc.page.locator('[data-filter=search]').fill(staff.nip);
    await expect(hc.page.locator('[data-assessment-body]')).toContainText('Final');
    expect(errors).toEqual([]);
    await Promise.all([hc.context.close(),ku.context.close(),kd.context.close()]);
});
