import { chromium } from '@playwright/test';
import fs from 'node:fs';
const password=JSON.parse(fs.readFileSync('storage/app/private/local-demo-accounts.json','utf8')).password;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 for(const [email,prefix] of [['ku.it@kpi.test','unit'],['kd.umum@kpi.test','division'],['hc.demo@kpi.test','hc']]) {
  const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
  page.on('pageerror',e=>console.log('JS',e.message));
  await page.goto('http://127.0.0.1:8000/login');await page.locator('[name=identifier]').fill(email);await page.locator('[name=password]').fill(password);
  await Promise.all([page.waitForURL('**/'+prefix+'/dashboard'),page.locator('[data-login-submit]').click()]);
  await page.waitForTimeout(1000);
  console.log(email,new URL(page.url()).pathname, await page.locator('html').getAttribute('data-frontend-ready'), await page.locator('main').innerText());
  console.log('cookies',(await context.cookies()).map(c=>c.name));
  fs.mkdirSync('docs/backend/v3/screenshots',{recursive:true});await page.screenshot({path:`docs/backend/v3/screenshots/${prefix}-desktop.png`});
  await context.close();
 }
}finally {await browser.close();}
