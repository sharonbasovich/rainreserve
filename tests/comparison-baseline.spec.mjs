import {test,expect} from '@playwright/test';
test('baseline demonstrates sub-precision difference described as zero more',async({page})=>{
 await page.goto('./');
 await page.getByText('Use your own rainfall',{exact:true}).click();
 await page.locator('#rain-file').setInputFiles({name:'synthetic-small-delta.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n2026-01-01,6.25125\n2026-01-02,0\n2026-01-03,0\n2026-01-04,0\n2026-01-05,0')});
 await expect(page.locator('.day-bar')).toHaveCount(5);
 await expect(page.locator('#comparison')).toHaveText('0 L more modeled use than baseline.');
 await expect(page.locator('#takeaway')).toContainText('supplies 0 L more');
 await page.screenshot({path:'test-results/delta-baseline-desktop.png',fullPage:true});
});
