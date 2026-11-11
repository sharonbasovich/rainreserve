import {expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {simulate,summarizeShortfalls} from '../model.mjs';

export async function reloadWithDecision(page,decision,observations){
 expect(['cancel','leave']).toContain(decision);
 const token=randomUUID();
 await page.evaluate(value=>{document.__rainreserveReloadIdentity=value;},token);
 const originalURL=page.url();let mainFrameCommits=0;
 const committed=frame=>{if(frame===page.mainFrame())mainFrameCommits++;};
 page.on('framenavigated',committed);
 try{
  const waiting=page.waitForEvent('dialog',{timeout:5000}).then(value=>({value}),error=>({error}));
  // Queue the real browser reload without a page.reload() load promise: a
  // correctly canceled navigation must never produce a new document load.
  await page.evaluate(()=>{setTimeout(()=>window.location.reload(),0);});
  const observed=await waiting;if(observed.error)throw observed.error;
  const dialog=observed.value;expect(dialog.type()).toBe('beforeunload');
  expect(mainFrameCommits).toBe(0);
  if(decision==='cancel'){
   await dialog.dismiss();
   // Complete a later task in the retained document after the dismissal.
   const retained=await page.evaluate(()=>new Promise(resolve=>setTimeout(()=>resolve({identity:document.__rainreserveReloadIdentity,url:location.href}),0)));
   expect(retained.identity).toBe(token);expect(retained.url).toBe(originalURL);
   expect(mainFrameCommits).toBe(0);
   observations.push({decision,type:dialog.type(),dismissed:true,documentRetained:true,mainFrameCommits,url:retained.url});
  }else{
   const navigation=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame(),timeout:10000}).then(value=>({value}),error=>({error}));
   await dialog.accept();
   const navigated=await navigation;if(navigated.error)throw navigated.error;
   await page.waitForLoadState('load',{timeout:10000});
   const loaded=await page.evaluate(()=>({identity:document.__rainreserveReloadIdentity,url:location.href,readyState:document.readyState}));
   expect(loaded.identity).toBeUndefined();expect(loaded.url).toBe(originalURL);
   expect(loaded.readyState).toBe('complete');expect(mainFrameCommits).toBe(1);
   observations.push({decision,type:dialog.type(),accepted:true,documentReplaced:true,loaded:true,mainFrameCommits,url:loaded.url});
  }
 }finally{page.off('framenavigated',committed);}
}
export function reference(rain,dates,capacityL=400,roofM2=40){
 const params={roofM2,gardenM2:20,demandMm:3,efficiency:0.8,capacityL,initialL:0};
 const baseline=simulate({...params,capacityL:200},rain),scenario=simulate(params,rain);
 const results=[baseline,scenario];
 const rows=[['RainReserve comparison — user-provided rainfall, unverified; modeled results, not measured savings'],['Model','capture then overflow then irrigation; direct rain offsets same-day target; empty start'],['Pattern','custom'],['Rainfall source','User-provided CSV; not independently verified'],['Period start',dates[0]],['Period end',dates.at(-1)],['roof_m2',roofM2],['garden_m2',20],['daily_target_mm',3],['collection_efficiency',0.8],['baseline_capacity_l',200],['scenario_capacity_l',capacityL],['shortfall_day_threshold_l',0.1]];
 for(const [i,name]of ['baseline','scenario'].entries()){
  const s=summarizeShortfalls(results[i].days);
  rows.push([name+'_shortfall_days',s.count],[name+'_longest_shortfall_run_days',s.longest?.length??0],[name+'_longest_shortfall_run_start_day',s.longest?.start??''],[name+'_longest_shortfall_run_end_day',s.longest?.end??'']);
 }
 rows.push([],['scenario','day','rain_mm','start_l','collected_l','overflow_l','garden_target_l','used_l','unmet_l','end_l','date']);
 for(const [i,name]of ['baseline','scenario'].entries())for(const d of results[i].days)rows.push([name,d.day,d.rainMm,d.initial,d.inflow,d.overflow,d.demand,d.used,d.unmet,d.end,dates[d.day-1]]);
 return {baseline,scenario,csv:Buffer.from(rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n'))};
}
export async function saveComparison(page,testInfo,name,expected){
 const waiting=page.waitForEvent('download',{timeout:5000});await page.locator('#export').click();const download=await waiting;
 expect(download.suggestedFilename()).toBe('rainreserve-user-rainfall-comparison.csv');
 const path=testInfo.outputPath(name+'.csv');await download.saveAs(path);const bytes=await readFile(path);
 expect(bytes.equals(expected)).toBe(true);
 await testInfo.attach(name,{path,contentType:'text/csv'});
 return {name,filename:download.suggestedFilename(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
