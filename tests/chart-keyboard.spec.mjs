import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const file=rows=>({name:'synthetic-rain.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n'+rows.join('\n'))});
const rows=n=>Array.from({length:n},(_,i)=>`${new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10)},${i%7?0:12}`);
const bar=(page,n)=>page.locator('.day-bar').nth(n-1);
async function importRows(page,n){await page.getByText('Use your own rainfall',{exact:true}).click();await page.locator('#rain-file').setInputFiles(file(rows(n)));await expect(page.locator('.day-bar')).toHaveCount(n);}
async function selected(page,n,total){await expect(page.locator('#day-output')).toHaveText(`${n} / ${total}`);await expect(bar(page,n)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.day-bar[tabindex="0"]')).toHaveCount(1);await expect(bar(page,n)).toHaveAttribute('tabindex','0');}
test('chart is one Tab stop, follows slider/click selection, and preserves native buttons',async({page})=>{
 await page.goto('./');await selected(page,1,30);
 await page.locator('#day').focus();await page.keyboard.press('ArrowRight');await selected(page,2,30);await expect(page.locator('#day')).toBeFocused();
 await page.keyboard.press('Tab');await expect(bar(page,2)).toBeFocused();
 await page.keyboard.press('ArrowRight');await selected(page,3,30);await expect(bar(page,3)).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('.table-scroll')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(bar(page,3)).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.locator('#day')).toBeFocused();
 await bar(page,8).click();await selected(page,8,30);await page.keyboard.press('Space');await selected(page,8,30);await page.keyboard.press('Enter');await selected(page,8,30);
 await page.keyboard.press('Home');await selected(page,1,30);await page.keyboard.press('ArrowLeft');await selected(page,1,30);
 await page.keyboard.press('End');await selected(page,30,30);await page.keyboard.press('ArrowRight');await selected(page,30,30);
 await page.keyboard.press('Control+ArrowLeft');await selected(page,30,30);
 await page.screenshot({path:'test-results/chart-keyboard-desktop.png',fullPage:true});
});
test('year and one-day inputs remain one stop with accessible instructions and reduced motion',async({page})=>{
 await page.setViewportSize({width:360,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await importRows(page,366);
 await page.locator('#day').focus();await page.keyboard.press('Tab');await expect(bar(page,1)).toBeFocused();await page.keyboard.press('End');await selected(page,366,366);await expect(bar(page,366)).toBeFocused();
 expect(await page.locator('.chart-scroll').evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
 await page.keyboard.press('Tab');await expect(page.locator('.table-scroll')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(bar(page,366)).toBeFocused();
 await expect(page.locator('#chart')).toHaveAttribute('aria-describedby','chart-help');await expect(page.locator('#chart-help')).toBeVisible();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:'test-results/chart-keyboard-year-mobile.png',fullPage:true});
 await page.locator('#rain-file').setInputFiles(file(rows(1)));await selected(page,1,1);await bar(page,1).focus();for(const key of ['End','Home','ArrowLeft','ArrowRight']){await page.keyboard.press(key);await selected(page,1,1);await expect(bar(page,1)).toBeFocused();}
 await page.locator('#rain-file').setInputFiles(file([]));await expect(page.locator('#csv-status')).toContainText('Not imported');await selected(page,1,1);
});
test('async replacement restores chart-owned focus only; invalid setup retains applied day navigation',async({page})=>{
 await page.addInitScript(()=>{const original=File.prototype.text;File.prototype.text=function(){return original.call(this).then(text=>new Promise(resolve=>{window.finishRain=()=>resolve(text);}));};});
 await page.goto('./');await page.getByText('Use your own rainfall',{exact:true}).click();
 await page.locator('#rain-file').setInputFiles(file(rows(2)));await expect.poll(()=>page.evaluate(()=>typeof window.finishRain)).toBe('function');
 await bar(page,20).focus();await page.evaluate(()=>window.finishRain());await selected(page,1,2);await expect(bar(page,1)).toBeFocused();
 await page.evaluate(()=>window.finishRain=undefined);await page.locator('#rain-file').setInputFiles(file(rows(3)));await expect.poll(()=>page.evaluate(()=>typeof window.finishRain)).toBe('function');await page.locator('#roofM2').focus();await page.evaluate(()=>window.finishRain());await selected(page,1,3);await expect(page.locator('#roofM2')).toBeFocused();
 await page.locator('#roofM2').fill('-1');await bar(page,3).click();await page.evaluate(()=>window.finishRain=undefined);await page.locator('#rain-file').setInputFiles(file(rows(1)));await expect.poll(()=>page.evaluate(()=>typeof window.finishRain)).toBe('function');await bar(page,3).focus();await page.evaluate(()=>window.finishRain());await selected(page,3,3);await expect(bar(page,3)).toBeFocused();
 await page.keyboard.press('Home');await selected(page,1,3);await page.keyboard.press('End');await selected(page,3,3);await expect(page.locator('#export')).toBeDisabled();
 await page.locator('#roofM2').fill('40');await page.getByRole('button',{name:'Update comparison'}).click();await selected(page,1,1);await expect(page.getByRole('button',{name:'Update comparison'})).toBeFocused();
});
