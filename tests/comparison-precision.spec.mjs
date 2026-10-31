import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
const fixture=delta=>Buffer.from(`date,rain_mm\n2026-01-01,${(200+delta)/32}\n2026-01-02,0\n2026-01-03,0\n2026-01-04,0\n2026-01-05,0`);
for(const width of [1440,360])test(`small modeled differences remain honest at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('./');await page.getByText('Use your own rainfall',{exact:true}).click();
 for(const delta of [.04,.049,.051]){
  await page.locator('#rain-file').setInputFiles({name:'synthetic-precision.csv',mimeType:'text/csv',buffer:fixture(delta)});
  await expect(page.locator('#rain-file')).toHaveValue('');
  await expect(page.locator('#csv-status')).toHaveAttribute('data-error','false');
  await expect(page.locator('.day-bar')).toHaveCount(5);
  const small=delta<.05;
  await expect(page.locator('#comparison')).toHaveText(small?'Less than 0.1 L difference in modeled use.':'0.1 L more modeled use than baseline.');
  await expect(page.locator('#takeaway')).toContainText(small?'differ by less than 0.1 L':'supplies 0.1 L more');
  if(delta===.04){
   const cells=page.locator('#balance tr').filter({hasText:'Used from storage'}).locator('td');await expect(cells).toHaveText(['200 L','200 L']);
   const event=page.waitForEvent('download');await page.locator('#export').click();const download=await event;const csv=await readFile(await download.path(),'utf8');
   const rows=csv.split('\r\n').filter(l=>/^"(baseline|scenario)","\d+"/.test(l)).map(l=>l.slice(1,-1).split('\",\"'));
   const used=name=>rows.filter(r=>r[0]===name).reduce((a,r)=>a+Number(r[7]),0);expect(used('scenario')-used('baseline')).toBeCloseTo(.04,10);
   await page.screenshot({path:`test-results/delta-precision-${width}.png`,fullPage:true});
  }
  await page.locator('#baselineL').fill('400');await page.locator('#capacityL').fill('200');await page.getByRole('button',{name:'Update comparison'}).click();
  await expect(page.locator('#comparison')).toHaveText(small?'Less than 0.1 L difference in modeled use.':'0.1 L less modeled use than baseline.');
  await expect(page.locator('#takeaway')).toContainText(small?'differ by less than 0.1 L':'supplies 0.1 L less');
  await page.locator('#baselineL').fill('200');await page.locator('#capacityL').fill('400');await page.getByRole('button',{name:'Update comparison'}).click();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.locator('#capacityL').fill('200');await expect(page.locator('#comparison')).toHaveText('Same modeled use as baseline.');
 await page.getByRole('button',{name:'Reset demo'}).click();await expect(page.locator('.day-bar')).toHaveCount(30);await expect(page.locator('#comparison')).not.toContainText('Less than');
});
