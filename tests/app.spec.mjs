import {test,expect} from "@playwright/test";

test('selected-day comparison explains totals and preserves applied assumptions',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Day 20:',exact:false}).click();
 await expect(page.locator('#baseline-day-used')).toHaveText('20 L');await expect(page.locator('#day-used')).toHaveText('60 L');await expect(page.locator('#day-difference')).toContainText('40 L more');
 await page.locator('#baselineL').fill('1000');await expect(page.locator('#day-baseline-heading')).toHaveText('Baseline · 200 L');
 await page.getByRole('button',{name:'Update comparison'}).click();await expect(page.locator('#day-baseline-heading')).toHaveText('Baseline · 1,000 L');await expect(page.locator('#day-difference')).toContainText('same modeled');
 await page.locator('#capacityL').focus();await page.keyboard.press('Home');await expect(page.locator('#day-difference')).toContainText('60 L less');
 await page.locator('#pattern').selectOption('none');await expect(page.locator('#day-difference')).toContainText('same modeled');
 await page.getByRole('button',{name:'Reset demo'}).click();await page.locator('#reset-confirm').click();await expect(page.locator('#day')).toHaveValue('1');await expect(page.locator('#day-baseline-heading')).toHaveText('Baseline · 200 L');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Day 20:',exact:false}).click();await page.locator('.day-flows').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/daily-comparison-390.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
