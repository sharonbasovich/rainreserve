import {expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {simulate,summarizeShortfalls} from '../model.mjs';

export async function reloadWithDecision(page,decision,observations){
 const dialogs=page.waitForEvent('dialog',{timeout:5000});
 // Start navigation before awaiting the event. Keep rejection handled even if
 // the required dialog is missing; a silent navigation is never a passing case.
 const navigation=page.reload({timeout:10000}).then(()=>({completed:true}),error=>({error:error.message}));
 const dialog=await dialogs;
 expect(dialog.type()).toBe('beforeunload');
 if(decision==='cancel')await dialog.dismiss();else await dialog.accept();
 const outcome=await navigation;
 if(outcome.error)expect(decision==='cancel'&&/ERR_ABORTED|NS_BINDING_ABORTED/.test(outcome.error)).toBe(true);
 else expect(outcome.completed).toBe(true);
 observations.push({decision,type:dialog.type(),...outcome});
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
