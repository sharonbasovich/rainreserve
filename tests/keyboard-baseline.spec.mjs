import {test,expect} from '@playwright/test';
test('baseline: a full-year chart places every day in the keyboard tab sequence',async({page})=>{
 await page.goto('./');await page.getByText('Use your own rainfall',{exact:true}).click();
 const rows=Array.from({length:366},(_,i)=>`${new Date(Date.UTC(2024,0,1)+i*86400000).toISOString().slice(0,10)},${i%7?0:12}`);
 await page.locator('#rain-file').setInputFiles({name:'synthetic-year.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n'+rows.join('\n'))});
 await expect(page.locator('.day-bar')).toHaveCount(366);
 expect(await page.locator('.day-bar').evaluateAll(nodes=>nodes.filter(n=>n.tabIndex===0).length)).toBe(366);
 await page.locator('#day').focus();await page.keyboard.press('Tab');await expect(page.locator('.day-bar').nth(0)).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('.day-bar').nth(1)).toBeFocused();
 await page.locator('.day-bar').nth(365).focus();await page.keyboard.press('Shift+Tab');await expect(page.locator('.day-bar').nth(364)).toBeFocused();
});
