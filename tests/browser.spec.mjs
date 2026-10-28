import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import {simulate} from '../model.mjs';
const mixed=[0,0,8,2,0,0,0,12,0,1,0,0,0,0,18,3,0,0,0,0,0,6,0,0,0,4,0,0,0,0];
const p={roofM2:40,gardenM2:20,demandMm:3,efficiency:.8,capacityL:400,initialL:0};
const format=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
test('default comparison, day inspection, keyboard capacity and no external requests',async({page,baseURL})=>{
 const errors=[],external=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith(baseURL))external.push(r.url());});page.on('requestfailed',r=>failed.push(r.url()));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
 await page.goto('./');await expect(page.locator('#used-total')).toHaveText(format(simulate(p,mixed).totals.used));await expect(page.locator('.day-bar')).toHaveCount(30);
 await page.getByRole('button',{name:'Day 3:',exact:false}).click();await expect(page.locator('#storage-value')).toHaveText('256 L');await expect(page.locator('#day-number')).toHaveText('3');
 await page.locator('#day').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#day-number')).toHaveText('4');
 await page.locator('#capacityL').focus();await page.keyboard.press('End');await expect(page.locator('#capacity-label')).toHaveText('2,000 L');await expect(page.locator('#export')).toBeEnabled();
 expect(errors).toEqual([]);expect(external).toEqual([]);expect(failed).toEqual([]);
 await page.screenshot({path:'test-results/desktop-workspace.png',fullPage:true});
});
test('pending and invalid inputs preserve prior results; reset and repeated comparison work',async({page})=>{
 await page.goto('./');const before=await page.locator('#used-total').textContent();
 await page.locator('#roofM2').fill('1001');await expect(page.locator('#export')).toBeDisabled();await page.getByRole('button',{name:'Update comparison'}).click();await expect(page.locator('#used-total')).toHaveText(before);
 await page.locator('#roofM2').fill('31');await page.getByRole('button',{name:'Update comparison'}).click();await expect(page.locator('#used-total')).toHaveText(format(simulate({...p,roofM2:31},mixed).totals.used));await expect(page.locator('#export')).toBeEnabled();
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'Reset demo'}).click();await expect(page.locator('#roofM2')).toHaveValue('40');await expect(page.locator('#used-total')).toHaveText(before);}
 await page.reload();await expect(page.locator('#day')).toHaveValue('1');
});
test('all scenarios and zero extremes are finite and synchronized',async({page})=>{
 await page.goto('./');for(const pattern of ['dry','storms','none','mixed']){await page.locator('#pattern').selectOption(pattern);await expect(page.locator('#export')).toBeEnabled();expect(await page.locator('#used-total').textContent()).not.toMatch(/NaN|Infinity/);}
 await page.locator('#pattern').selectOption('none');await expect(page.locator('#used-total')).toHaveText('0');await page.locator('#pattern').selectOption('mixed');
 await page.locator('#capacityL').focus();await page.keyboard.press('Home');await expect(page.locator('#used-total')).toHaveText('0');await expect(page.locator('#water-fill')).toHaveAttribute('style',/height: 0%;/);
 await page.locator('#baselineL').fill('0');await page.getByRole('button',{name:'Update comparison'}).click();await expect(page.locator('#comparison')).toHaveText('Same modeled use as baseline.');
 await page.locator('#gardenM2').fill('0');await page.getByRole('button',{name:'Update comparison'}).click();await expect(page.locator('#balance')).not.toContainText('NaN');
});
test('download exports applied input, 60 daily rows and conservation without rounded-value loss',async({page})=>{
 await page.goto('./');await page.locator('#roofM2').fill('31');await page.getByRole('button',{name:'Update comparison'}).click();
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download comparison CSV'}).click();const download=await event;expect(download.suggestedFilename()).toBe('rainreserve-synthetic-comparison.csv');const csv=await readFile(await download.path(),'utf8');
 expect(csv).toContain('"roof_m2","31"');expect(csv).toContain('synthetic rainfall');const rows=csv.split('\r\n').filter(l=>/^"(baseline|scenario)","\d+"/.test(l));expect(rows).toHaveLength(60);
 for(const row of rows){const a=row.slice(1,-1).split('\",\"');const [start,inflow,overflow,demand,used,unmet,end]=a.slice(3).map(Number);expect(Math.abs(start+inflow-overflow-used-end)).toBeLessThan(1e-8);expect(Math.abs(demand-used-unmet)).toBeLessThan(1e-8);}
});
for(const width of [360,390,768,1440])test(`layout and accessible controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('./');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Try a water-balance scenario'}).click();await expect(page.locator('#workspace-title')).toBeInViewport();
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations).toEqual([]);
 await page.locator('#workspace-title').click();
 await expect(page.locator('.skip')).not.toBeFocused();
 await expect(page.locator('.skip')).toHaveCSS('clip-path','inset(50%)');
 await page.screenshot({path:`test-results/layout-${width}.png`,fullPage:true});
});
test('keyboard skip link, disclosures and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to explorer'})).toBeFocused();await expect(page.locator('.skip')).toHaveCSS('clip-path','none');await page.keyboard.press('Enter');await expect(page.locator('#workspace-title')).toBeInViewport();
 await page.getByText('What this leaves out',{exact:true}).click();await expect(page.getByText('No soil moisture carried between days',{exact:false})).toBeVisible();
 expect(await page.locator('#water-fill').evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
});

test('original rain-flow illustration responds to focus/hover and reduced-motion fallback',async({page})=>{
 await page.goto('./');const story=page.locator('.flow-story');const drop=page.locator('.dot-one');
 await story.focus();await expect(drop).toHaveCSS('animation-name','trace-drop');
 await page.locator('#workspace-title').click();await story.hover();await expect(drop).toHaveCSS('animation-name','trace-drop');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(drop).toHaveCSS('animation-name','none');await expect(drop).toHaveCSS('opacity','1');
});

// This checks the deployed bytes as well as browser behavior at the configured prefix.
test('static assets and optional deployed source provenance',async({request})=>{
 for(const [file,type] of [['index.html','text/html'],['styles.css','text/css'],['app.mjs','javascript'],['model.mjs','javascript']]){
  const response=await request.get(`./${file}`);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain(type);
  expect(await response.body()).toEqual(await readFile(new URL(`../dist/${file}`,import.meta.url)));
 }
 if(process.env.EXPECTED_COMMIT){
  const response=await request.get('./deployment.json');expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({commit:process.env.EXPECTED_COMMIT});
 }
});
