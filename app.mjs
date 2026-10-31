import {simulate} from './model.mjs';
import {parseRainfallCSV, MAX_CSV_BYTES, TEMPLATE} from './rainfall.mjs';
const $=id=>document.getElementById(id);
const patterns={mixed:[0,0,8,2,0,0,0,12,0,1,0,0,0,0,18,3,0,0,0,0,0,6,0,0,0,4,0,0,0,0],dry:[12,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0],storms:[0,0,0,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,0,0],none:Array(30).fill(0)};
const defaults={roofM2:40,gardenM2:20,demandMm:3,efficiency:80,capacityL:400,baselineL:200};
const fmt=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
let current, imported;
let importVersion=0;
function read(){return {roofM2:$('roofM2').valueAsNumber,gardenM2:$('gardenM2').valueAsNumber,demandMm:$('demandMm').valueAsNumber,efficiency:$('efficiency').valueAsNumber/100,capacityL:$('capacityL').valueAsNumber,initialL:0};}
function update(resetDay=false){
 if(!$('controls').checkValidity()){ $('input-status').textContent='Enter valid values within the displayed limits. Results still show the last valid comparison.'; $('export').disabled=true; return; }
 try{
 const chartHadFocus=$('chart').contains(document.activeElement);
 const params=read(),custom=$('pattern').value==='custom',rain=custom?imported.rainfall:patterns[$('pattern').value];const scenario=simulate(params,rain);const baseParams={...params,capacityL:$('baselineL').valueAsNumber};const baseline=simulate(baseParams,rain);
 current={params,baseParams,scenario,baseline,rain,pattern:$('pattern').value,dates:custom?imported.dates:null};
 $('day').max=rain.length;$('day').value=resetDay?1:Math.min($('day').valueAsNumber,rain.length);
 $('data-tag').textContent=`${custom?'YOUR CSV · UNVERIFIED':'SYNTHETIC DATA'} · ${rain.length} DAYS`;
 $('rain-source').textContent=custom?'Your supplied daily rainfall, not independently verified. Results are hypothetical; all scenarios begin with an empty barrel.':'Invented daily rainfall, not local observations. All scenarios begin with an empty barrel.';
 $('period-label').textContent=custom?`Your CSV · ${current.dates[0]} to ${current.dates.at(-1)} · ${rain.length} days · unverified input`:`Synthetic example · ${rain.length} days`;
 $('balance-period').textContent=`${rain.length}-day balance`;$('first-day').textContent=rain.length>31?`${rain.length} DAYS`:'DAY 1';$('last-day').textContent=rain.length>31?'SCROLL TO EXPLORE ↔':`DAY ${rain.length}`;
 $('chart').style.setProperty('--days',rain.length);$('chart').style.setProperty('--chart-width',rain.length>31?`${rain.length*12}px`:'0px');
 $('capacity-label').textContent=`${fmt(params.capacityL)} L`;
 $('used-total').textContent=fmt(scenario.totals.used);
 const delta=scenario.totals.used-baseline.totals.used;
 $('comparison').textContent=delta===0?'Same modeled use as baseline.':`${fmt(Math.abs(delta))} L ${delta>0?'more':'less'} modeled use than baseline.`;
 $('baseline-title').textContent=`Baseline · ${fmt(baseParams.capacityL)} L`;
 $('scenario-title').textContent=`Scenario · ${fmt(params.capacityL)} L`;
 const rows=[['Collected from roof','inflow'],['Used from storage','used'],['Overflow','overflow'],['Unmet garden target','unmet'],['Remaining in storage','end']];
 $('balance').replaceChildren(...rows.map(([label,key])=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const result of [baseline,scenario]){const td=document.createElement('td');td.textContent=`${fmt(result.totals[key])} L`;tr.append(td);}return tr;}));
 $('takeaway').textContent=delta>0?`With the same ${custom?'user-provided rainfall':'synthetic rain'} and garden target, this scenario supplies ${fmt(delta)} L more from storage. That is potential substitution, not proven savings. More capacity alone cannot create rain.`:delta<0?`This smaller-storage outcome supplies ${fmt(-delta)} L less from storage under these assumptions. Inspect overflow and dry days before drawing conclusions.`:'These capacities supply the same modeled amount. Rainfall timing and demand can matter as much as barrel size.';
 $('chart').replaceChildren(...scenario.days.map(d=>{const b=document.createElement('button');b.type='button';b.className='day-bar';b.dataset.day=d.day;b.setAttribute('aria-label',`Day ${d.day}${current.dates?` (${current.dates[d.day-1]})`:""}: ${fmt(d.end)} litres stored, ${fmt(d.rainMm)} millimetres rain`);const fill=document.createElement('span');fill.className='bar-fill';fill.style.height=`${params.capacityL?100*d.end/params.capacityL:0}%`;b.append(fill);if(d.rainMm>0){const dot=document.createElement('span');dot.className='rain-dot';b.append(dot);}b.addEventListener('click',()=>{$('day').value=d.day;inspect();});return b;}));
 inspect();if(chartHadFocus)$('chart').children[$('day').valueAsNumber-1]?.focus({preventScroll:true});$('input-status').textContent='Comparison updated. All figures use the assumptions shown above.';$('export').disabled=false;
 }catch(error){$('input-status').textContent=`Check inputs: ${error.message}`;$('export').disabled=true;}
}
function inspect(){if(!current)return;const d=current.scenario.days[$('day').valueAsNumber-1];$('day-number').textContent=d.day;$('day-output').textContent=`${d.day} / ${current.rain.length}`;$('rain-label').textContent=`${current.dates?current.dates[d.day-1]+' · ':''}${fmt(d.rainMm)} mm rain`;$('water-fill').style.height=`${current.params.capacityL?100*d.end/current.params.capacityL:0}%`;$('storage-value').textContent=`${fmt(d.end)} L`;for(const [id,key] of [['day-inflow','inflow'],['day-used','used'],['day-overflow','overflow'],['day-unmet','unmet']])$(id).textContent=`${fmt(d[key])} L`;for(const b of $('chart').children){const selected=Number(b.dataset.day)===d.day;b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;}const selected=$('chart').children[d.day-1], scroller=$('chart').parentElement;if(selected){const bar=selected.getBoundingClientRect(),view=scroller.getBoundingClientRect();if(bar.right>view.right)scroller.scrollLeft+=bar.right-view.right+3;else if(bar.left<view.left)scroller.scrollLeft-=view.left-bar.left+3;}}
$('chart').addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||!event.target.matches('.day-bar')||!current)return;
 const day=Number(event.target.dataset.day),last=current.rain.length;
 const next={ArrowLeft:Math.max(1,day-1),ArrowRight:Math.min(last,day+1),Home:1,End:last}[event.key];
 if(next===undefined)return;
 event.preventDefault();$('day').value=next;inspect();$('chart').children[next-1].focus({preventScroll:true});
});
$('controls').addEventListener('submit',event=>{event.preventDefault();update();});
$('controls').addEventListener('input',event=>{if(event.target.id==='rain-file')return;if(event.target.id==='capacityL')update();else{$('input-status').textContent='Assumptions changed. Update comparison to apply them. Results show the previous settings.';$('export').disabled=true;}});
$('pattern').addEventListener('change',()=>{importVersion++;$('rain-file').value='';$('csv-status').dataset.error='false';$('csv-status').textContent='Choose a CSV to replace the input. Your values are not independently verified.';update();});$('day').addEventListener('input',inspect);
$('reset').addEventListener('click',()=>{importVersion++;imported=undefined;$('rain-file').value='';$('custom-option').hidden=true;$('custom-option').disabled=true;$('csv-status').textContent='The example is synthetic, not measured weather. Your values are not independently verified.';$('csv-status').dataset.error='false';for(const [key,value] of Object.entries(defaults))$(key).value=value;$('pattern').value='mixed';$('day').value=1;update();});
$('export').addEventListener('click',()=>{if(!current||$('export').disabled)return;const c=current;const rows=[[c.dates?'RainReserve comparison — user-provided rainfall, unverified; modeled results, not measured savings':'RainReserve comparison — synthetic rainfall, not observations'],['Model','capture then overflow then irrigation; direct rain offsets same-day target; empty start'],['Pattern',c.pattern],['Rainfall source',c.dates?'User-provided CSV; not independently verified':'Hand-authored synthetic example'],...(c.dates?[['Period start',c.dates[0]],['Period end',c.dates.at(-1)]]:[]),['roof_m2',c.params.roofM2],['garden_m2',c.params.gardenM2],['daily_target_mm',c.params.demandMm],['collection_efficiency',c.params.efficiency],['baseline_capacity_l',c.baseParams.capacityL],['scenario_capacity_l',c.params.capacityL],[],['scenario','day','rain_mm','start_l','collected_l','overflow_l','garden_target_l','used_l','unmet_l','end_l',...(c.dates?['date']:[])]];for(const [name,result] of [['baseline',c.baseline],['scenario',c.scenario]])for(const d of result.days)rows.push([name,d.day,d.rainMm,d.initial,d.inflow,d.overflow,d.demand,d.used,d.unmet,d.end,...(c.dates?[c.dates[d.day-1]]:[])]);const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=c.dates?'rainreserve-user-rainfall-comparison.csv':'rainreserve-synthetic-comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('template').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([TEMPLATE],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rainreserve-synthetic-example.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('rain-file').addEventListener('change',async()=>{
 const file=$('rain-file').files[0];if(!file)return;
 const version=++importVersion;$('csv-status').textContent='Reading locally…';$('csv-status').dataset.error='false';
 try{
  if(file.size>MAX_CSV_BYTES)throw new Error('Choose a UTF-8 CSV no larger than 64 KiB.');
  const parsed=parseRainfallCSV(await file.text());if(version!==importVersion)return;
  imported=parsed;$('custom-option').hidden=false;$('custom-option').disabled=false;$('pattern').value='custom';
  $('csv-status').textContent=`Loaded ${parsed.rainfall.length} daily values locally. Check the dates and source; inputs are unverified.`;update(true);
 }catch(error){if(version!==importVersion)return;$('csv-status').textContent=`Not imported: ${error.message} Your previous rainfall is unchanged.`;$('csv-status').dataset.error='true';}
 finally{if(version===importVersion)$('rain-file').value='';}
});
update();
