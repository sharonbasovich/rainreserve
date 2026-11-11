import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import {reloadWithDecision,reference,saveComparison} from './session-helpers.mjs';
for(const width of [1440,360])test(`session exit protection preserves canceled edits and resets on leave at ${width}px`,async({page},testInfo)=>{
 const decisions=[],exports=[];
 const cancelReload=page=>reloadWithDecision(page,'cancel',decisions);
 const acceptReload=page=>reloadWithDecision(page,'leave',decisions);
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 const dialogs=[];page.on('dialog',dialog=>dialogs.push(dialog.type()));
 await page.getByRole('button',{name:'Day 20:',exact:false}).click();await page.reload();
 expect(dialogs).toEqual([]);await expect(page.locator('#day')).toHaveValue('1');
 await page.locator('#roofM2').click();await page.locator('#roofM2').fill('80');
 for(let i=0;i<2;i++){
  await cancelReload(page);await expect(page.locator('#roofM2')).toHaveValue('80');await expect(page.locator('#export')).toBeDisabled();
 }
 await page.getByRole('button',{name:'Update comparison'}).click();await cancelReload(page);
 await expect(page.locator('#roofM2')).toHaveValue('80');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#roofM2').fill('40');await cancelReload(page);
 await page.getByRole('button',{name:'Update comparison'}).click();
 const previousCount=dialogs.length;await page.reload();expect(dialogs).toHaveLength(previousCount);
 await page.getByText('Use your own rainfall',{exact:true}).click();
 await page.locator('#rain-file').setInputFiles({name:'rain.csv',mimeType:'text/csv',buffer:Buffer.from('date,rain_mm\n2026-11-01,8.5\n2026-11-02,0')});
 await expect(page.locator('#csv-status')).toContainText('Loaded 2 daily values');
 exports.push(await saveComparison(page,testInfo,'two-day',reference([8.5,0],['2026-11-01','2026-11-02']).csv));
 await cancelReload(page);await expect(page.locator('.day-bar')).toHaveCount(2);
 await page.locator('#pattern').selectOption('mixed');await cancelReload(page);
 await page.locator('#reset').click();await page.locator('#reset-cancel').click();await cancelReload(page);
 await page.locator('#session-help').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
 await page.screenshot({path:`test-results/session-exit-note-${width}.png`});
 await acceptReload(page);await expect(page.locator('#custom-option')).toHaveJSProperty('disabled',true);
 await expect(page.locator('#roofM2')).toHaveValue('40');await expect(page.locator('.day-bar')).toHaveCount(30);
 await page.locator('#capacityL').focus();await page.keyboard.press('End');
 await page.locator('#reset').click();await page.locator('#reset-confirm').click();
 const countAfterReset=dialogs.length;await page.reload();expect(dialogs).toHaveLength(countAfterReset);
 expect(dialogs).toHaveLength(8);expect(decisions).toHaveLength(8);
 expect(decisions.filter(x=>x.decision==='leave')).toHaveLength(1);
 expect(decisions.filter(x=>x.decision==='cancel')).toHaveLength(7);
 await testInfo.attach('session-decisions',{body:Buffer.from(JSON.stringify({width,decisions,exports},null,2)),contentType:'application/json'});
});

for(const width of [1440,360])test(`366-day formatting and exported comparison survive repeated sliders and canceled leave at ${width}px`,async({page},testInfo)=>{
 const decisions=[],states=[],exports=[];
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 await page.getByText('Use your own rainfall',{exact:true}).click();
 const rain=Array.from({length:366},(_,i)=>i%7===0?8.5:0);
 const dates=rain.map((_,i)=>new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10));
 await page.locator('#rain-file').setInputFiles({name:'leap-year.csv',mimeType:'text/csv',buffer:Buffer.from(['date,rain_mm',...rain.map((n,i)=>`${dates[i]},${n}`)].join('\n'))});
 await expect(page.locator('#csv-status')).toContainText('Loaded 366 daily values');
 const format=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
 for(const capacity of [0,200,400,800,2000,400]){
  await page.locator('#capacityL').focus();await page.keyboard.press('Home');
  for(let n=0;n<capacity;n+=50)await page.keyboard.press('ArrowRight');
  const expected=reference(rain,dates,capacity);
  await expect(page.locator('#capacityL')).toHaveValue(String(capacity));
  await expect(page.locator('#capacity-label')).toHaveText(`${format(capacity)} L`);
  await expect(page.locator('#used-total')).toHaveText(format(expected.scenario.totals.used));
  const labels=await page.locator('.day-bar').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
  expect(labels).toEqual(expected.scenario.days.map(d=>`Day ${d.day} (${dates[d.day-1]}): ${format(d.end)} litres stored, ${format(d.rainMm)} millimetres rain`));
  states.push({capacity,used:expected.scenario.totals.used,labels});
 }
 await page.locator('.day-bar').first().focus();await page.keyboard.press('End');
 await expect(page.locator('#day')).toHaveValue('366');await expect(page.locator('.day-bar').last()).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('.table-scroll')).toBeFocused();
 exports.push(await saveComparison(page,testInfo,'leap-year-before',reference(rain,dates).csv));
 await reloadWithDecision(page,'cancel',decisions);
 await expect(page.locator('#day')).toHaveValue('366');await expect(page.locator('.day-bar')).toHaveCount(366);
 exports.push(await saveComparison(page,testInfo,'leap-year-after-cancel',reference(rain,dates).csv));
 expect(exports[0].sha256).toBe(exports[1].sha256);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#session-help').scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('leap-year-session.png'),fullPage:true});
 await reloadWithDecision(page,'leave',decisions);
 await expect(page.locator('.day-bar')).toHaveCount(30);await expect(page.locator('#custom-option')).toHaveJSProperty('disabled',true);
 await testInfo.attach('leap-year-observations',{body:Buffer.from(JSON.stringify({width,rain,dates,states,decisions,exports},null,2)),contentType:'application/json'});
});
