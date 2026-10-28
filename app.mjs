import {simulate} from './model.mjs';
const $=id=>document.getElementById(id);
const patterns={mixed:[0,0,8,2,0,0,0,12,0,1,0,0,0,0,18,3,0,0,0,0,0,6,0,0,0,4,0,0,0,0],dry:[12,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0],storms:[0,0,0,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,0,0],none:Array(30).fill(0)};
const defaults={roofM2:40,gardenM2:20,demandMm:3,efficiency:80,capacityL:400,baselineL:200};
const fmt=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
let current;
function read(){return {roofM2:$('roofM2').valueAsNumber,gardenM2:$('gardenM2').valueAsNumber,demandMm:$('demandMm').valueAsNumber,efficiency:$('efficiency').valueAsNumber/100,capacityL:$('capacityL').valueAsNumber,initialL:0};}
function update(){
 if(!$('controls').checkValidity()){ $('input-status').textContent='Enter valid values within the displayed limits. Results still show the last valid comparison.'; $('export').disabled=true; return; }
 try{
 const params=read(),rain=patterns[$('pattern').value];const scenario=simulate(params,rain);const baseParams={...params,capacityL:$('baselineL').valueAsNumber};const baseline=simulate(baseParams,rain);
 current={params,baseParams,scenario,baseline,rain,pattern:$('pattern').value};
 $('capacity-label').textContent=`${fmt(params.capacityL)} L`;
 $('used-total').textContent=fmt(scenario.totals.used);
 const delta=scenario.totals.used-baseline.totals.used;
 $('comparison').textContent=delta===0?'Same modeled use as baseline.':`${fmt(Math.abs(delta))} L ${delta>0?'more':'less'} modeled use than baseline.`;
 $('baseline-title').textContent=`Baseline · ${fmt(baseParams.capacityL)} L`;
 $('scenario-title').textContent=`Scenario · ${fmt(params.capacityL)} L`;
 const rows=[['Collected from roof','inflow'],['Used from storage','used'],['Overflow','overflow'],['Unmet garden target','unmet'],['Remaining in storage','end']];
 $('balance').replaceChildren(...rows.map(([label,key])=>{const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const result of [baseline,scenario]){const td=document.createElement('td');td.textContent=`${fmt(result.totals[key])} L`;tr.append(td);}return tr;}));
 $('takeaway').textContent=delta>0?`With the same synthetic rain and garden target, this scenario supplies ${fmt(delta)} L more from storage. That is potential substitution, not proven savings. More capacity alone cannot create rain.`:delta<0?`This smaller-storage outcome supplies ${fmt(-delta)} L less from storage under these assumptions. Inspect overflow and dry days before drawing conclusions.`:'These capacities supply the same modeled amount. Rainfall timing and demand can matter as much as barrel size.';
 $('chart').replaceChildren(...scenario.days.map(d=>{const b=document.createElement('button');b.type='button';b.className='day-bar';b.dataset.day=d.day;b.setAttribute('aria-label',`Day ${d.day}: ${fmt(d.end)} litres stored, ${fmt(d.rainMm)} millimetres rain`);const fill=document.createElement('span');fill.className='bar-fill';fill.style.height=`${params.capacityL?100*d.end/params.capacityL:0}%`;b.append(fill);if(d.rainMm>0){const dot=document.createElement('span');dot.className='rain-dot';b.append(dot);}b.addEventListener('click',()=>{$('day').value=d.day;inspect();});return b;}));
 inspect();$('input-status').textContent='Comparison updated. All figures use the assumptions shown above.';$('export').disabled=false;
 }catch(error){$('input-status').textContent=`Check inputs: ${error.message}`;$('export').disabled=true;}
}
function inspect(){if(!current)return;const d=current.scenario.days[$('day').valueAsNumber-1];$('day-number').textContent=d.day;$('day-output').textContent=`${d.day} / 30`;$('rain-label').textContent=`${fmt(d.rainMm)} mm rain`;$('water-fill').style.height=`${current.params.capacityL?100*d.end/current.params.capacityL:0}%`;$('storage-value').textContent=`${fmt(d.end)} L`;for(const [id,key] of [['day-inflow','inflow'],['day-used','used'],['day-overflow','overflow'],['day-unmet','unmet']])$(id).textContent=`${fmt(d[key])} L`;for(const b of $('chart').children)b.setAttribute('aria-pressed',String(Number(b.dataset.day)===d.day));}
$('controls').addEventListener('submit',event=>{event.preventDefault();update();});
$('controls').addEventListener('input',event=>{if(event.target.id==='capacityL')update();else{$('input-status').textContent='Assumptions changed. Update comparison to apply them. Results show the previous settings.';$('export').disabled=true;}});
$('pattern').addEventListener('change',update);$('day').addEventListener('input',inspect);
$('reset').addEventListener('click',()=>{for(const [key,value] of Object.entries(defaults))$(key).value=value;$('pattern').value='mixed';$('day').value=1;update();});
$('export').addEventListener('click',()=>{if(!current||$('export').disabled)return;const c=current;const rows=[['RainReserve comparison — synthetic rainfall, not observations'],['Model','capture then overflow then irrigation; direct rain offsets same-day target; empty start'],['Pattern',c.pattern],['roof_m2',c.params.roofM2],['garden_m2',c.params.gardenM2],['daily_target_mm',c.params.demandMm],['collection_efficiency',c.params.efficiency],['baseline_capacity_l',c.baseParams.capacityL],['scenario_capacity_l',c.params.capacityL],[],['scenario','day','rain_mm','start_l','collected_l','overflow_l','garden_target_l','used_l','unmet_l','end_l']];for(const [name,result] of [['baseline',c.baseline],['scenario',c.scenario]])for(const d of result.days)rows.push([name,d.day,d.rainMm,d.initial,d.inflow,d.overflow,d.demand,d.used,d.unmet,d.end]);const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='rainreserve-synthetic-comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
update();
