import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [1440,360])test(`safe reset preserves an imported comparison and invalid edits at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 await page.getByText('Use your own rainfall',{exact:true}).click();
 await page.locator('#rain-file').setInputFiles({name:'rain.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n2026-12-30,8\n2026-12-31,0')});
 await expect(page.locator('.day-bar')).toHaveCount(2);await page.locator('.day-bar').last().click();
 const result=await page.locator('#rain-label').textContent();await page.locator('#roofM2').fill('');
 for(const cancel of ['button','escape']){
  await page.locator('#reset').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#reset-cancel')).toBeFocused();await expect(page.locator('#reset')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#roofM2')).toHaveValue('');await expect(page.locator('#rain-label')).toHaveText(result);
  await expect(page.locator('#export')).toBeDisabled();await expect(page.locator('#day')).toHaveValue('2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(cancel==='button'){
   expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
   await page.screenshot({path:`test-results/reset-confirmation-${width}.png`,fullPage:true});
   await page.keyboard.press('Enter');
  }else await page.keyboard.press('Escape');
  await expect(page.locator('#reset-confirmation')).toBeHidden();await expect(page.locator('#reset')).toBeFocused();
  await expect(page.locator('#roofM2')).toHaveValue('');await expect(page.locator('#rain-label')).toHaveText(result);await expect(page.locator('#export')).toBeDisabled();
 }
 await page.locator('#reset').click();await page.keyboard.press('Tab');await expect(page.locator('#reset-confirm')).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.locator('#reset-confirmation')).toBeHidden();await expect(page.locator('#reset')).toBeFocused();await expect(page.locator('#reset')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#roofM2')).toHaveValue('40');await expect(page.locator('#pattern')).toHaveValue('mixed');await expect(page.locator('.day-bar')).toHaveCount(30);await expect(page.locator('#day')).toHaveValue('1');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#reset').click();await page.locator('#reset-cancel').click();await expect(page.locator('#export')).toBeEnabled();
});
