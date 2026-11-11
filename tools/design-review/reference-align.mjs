import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out='docs/frontend/reference-alignment';fs.mkdirSync(out+'/screenshots',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1440,height:900}}),report={pages:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 for(const[role,view]of [['ku','beranda'],['kd','beranda'],['hc','beranda'],['kd','dashboard'],['ku','riwayat'],['hc','kpi'],['hc','karyawan']]){
  await page.goto(`http://127.0.0.1:8008/design-review/${role}/${view}`);
  await page.waitForFunction(()=>document.documentElement.dataset.frontendReady==='true');
  if(await page.locator('[data-insights-root]').count())await page.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.insightsReady));
  await page.evaluate(()=>document.fonts.ready);
  report.pages.push({role,view,...await page.evaluate(()=>({x:document.documentElement.scrollWidth-innerWidth,mainX:document.querySelector('main').scrollWidth-document.querySelector('main').clientWidth,insights:document.documentElement.dataset.insightsReady,error:document.querySelector('[data-insights-error]')?.textContent,sidebar:document.querySelector('#sidebar').getBoundingClientRect().width,navbar:document.querySelector('.topbar').getBoundingClientRect().height}))});
  await page.screenshot({path:`${out}/screenshots/${role}-${view}-1440.png`});
 }
 for(const id of ['ku-home','hc-home','kd-dashboard']){
  await page.goto(`http://127.0.0.1:8008/design-review?screen=${id}&mode=both`);
  await page.waitForFunction(()=>document.getElementById('audit-reference')?.complete&&document.getElementById('audit-reference')?.naturalWidth>0);
  await page.frameLocator('#audit-frame').locator('[data-insights-root]').waitFor();
  await page.waitForFunction(()=>document.querySelector('#audit-frame').contentDocument.documentElement.dataset.insightsReady==='true');
  await page.screenshot({path:`${out}/screenshots/compare-${id}.png`});
 }
}finally{await browser.close();fs.writeFileSync(out+'/initial-visual.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));if(report.errors.length||report.pages.some(p=>p.x>1||p.mainX>1||p.insights==='error'))process.exitCode=1;
