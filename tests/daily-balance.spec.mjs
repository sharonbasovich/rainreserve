import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const csv=Buffer.from('date,rain_mm\n2026-12-30,8\n2026-12-31,0\n2027-01-01,0.25');
async function balances(page,baseline,scenario){
 for(const [prefix,values] of [['baseline-day-',baseline],['day-',scenario]]){
  for(const [i,key] of ['initial','inflow','overflow','demand','used','unmet','end'].entries()){
   await expect(page.locator('#'+prefix+key)).toHaveText(`${values[i]} L`);
  }
 }
}
for(const width of [1440,360])test(`daily storage reconciles both capacities at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 await page.getByRole('button',{name:'Day 20:',exact:false}).click();
 // A dry day draws from different carried storage despite identical collection.
 await balances(page,[20,0,0,60,20,40,0],[220,0,0,60,60,0,160]);
 await expect(page.locator('.day-flows')).toContainText('Start storage + collected = overflow + used + end storage.');
 await expect(page.locator('.day-flows')).toContainText('rounded independently to 0.1 L');
 await page.locator('#roofM2').fill('');
 await page.locator('#pattern').selectOption('storms');
 await balances(page,[20,0,0,60,20,40,0],[220,0,0,60,60,0,160]);
 await expect(page.locator('#export')).toBeDisabled();
 await page.getByText('Use your own rainfall',{exact:true}).click();
 await page.locator('#rain-file').setInputFiles({name:'daily.csv',mimeType:'text/csv',buffer:csv});
 await expect(page.locator('#csv-status')).toContainText('Loaded 3');
 await balances(page,[20,0,0,60,20,40,0],[220,0,0,60,60,0,160]);
 await page.locator('#roofM2').fill('40');await page.getByRole('button',{name:'Update comparison'}).click();
 // Applying a pending import clamps the existing selection to the new period.
 await expect(page.locator('#day')).toHaveValue('3');
 await page.locator('#chart .day-bar').last().focus();await page.keyboard.press('Home');
 await balances(page,[0,256,56,0,0,0,200],[0,256,0,0,0,0,256]);
 await page.locator('#chart .day-bar').first().focus();await page.keyboard.press('End');
 await balances(page,[140,8,0,55,55,0,93],[196,8,0,55,55,0,149]);
 await expect(page.locator('#rain-label')).toContainText('2027-01-01');
 await page.locator('#rain-file').setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n2026-02-30,3')});
 await expect(page.locator('#csv-status')).toContainText('Not imported');
 await balances(page,[140,8,0,55,55,0,93],[196,8,0,55,55,0,149]);
 await page.locator('.day-flows').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:`test-results/daily-balance-${width}.png`});
 await page.locator('#capacityL').fill('0');
 await balances(page,[140,8,0,55,55,0,93],[0,8,8,55,0,55,0]);
 await page.locator('#reset').click();await page.locator('#reset-cancel').click();
 await balances(page,[140,8,0,55,55,0,93],[0,8,8,55,0,55,0]);
 await page.locator('#reset').click();await page.locator('#reset-confirm').click();
 await balances(page,[0,0,0,60,0,60,0],[0,0,0,60,0,60,0]);
});
