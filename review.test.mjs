import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {simulate,summarizeShortfalls} from './model.mjs';
import {parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE} from './rainfall.mjs';
// Independent review harness; jsdom is development-only.
const {JSDOM}=await import('jsdom');
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('app.mjs',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
function ui({trackFormatters=false}={}){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.simulate=simulate;w.summarizeShortfalls=summarizeShortfalls;Object.assign(w,{parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE});let download;
 let formatterConstructions=0;
 if(trackFormatters)w.Intl.NumberFormat=new Proxy(w.Intl.NumberFormat,{construct(target,args,newTarget){formatterConstructions++;return Reflect.construct(target,args,newTarget);}});
 w.URL.createObjectURL=blob=>{download=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){};
 vm.runInContext(script,dom.getInternalVMContext());
 const el=id=>w.document.getElementById(id);
 const fire=(id,event)=>el(id).dispatchEvent(new w.Event(event,{bubbles:true,cancelable:true}));
 return {dom,w,el,fire,get download(){return download;},get formatterConstructions(){return formatterConstructions;}};
}
test('one formatter serves 366-day charts and repeated capacity changes without changing labels',async()=>{
 const t=ui({trackFormatters:true});try{
 assert.equal(t.formatterConstructions,1,'initial rendering constructs one reusable formatter');
 const rain=Array.from({length:366},(_,i)=>i%7===0?8.5:0);
 const dates=rain.map((_,i)=>new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10));
 const csv=['date,rain_mm',...rain.map((value,i)=>`${dates[i]},${value}`)].join('\n');
 Object.defineProperty(t.el('rain-file'),'files',{configurable:true,value:[{size:new TextEncoder().encode(csv).length,text:async()=>csv}]});
 t.fire('rain-file','change');
 await new Promise(resolve=>t.w.setTimeout(resolve,0));
 assert.match(t.el('csv-status').textContent,/Loaded 366 daily values/);
 const reference=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
 for(const capacityL of [0,200,400,800,2000,400]){
  t.el('capacityL').value=String(capacityL);t.fire('capacityL','input');
  const expected=simulate({roofM2:40,gardenM2:20,demandMm:3,efficiency:0.8,initialL:0,capacityL},rain);
  assert.equal(t.el('chart').children.length,366);
  for(const [i,day]of expected.days.entries())assert.equal(t.el('chart').children[i].getAttribute('aria-label'),`Day ${day.day} (${dates[i]}): ${reference(day.end)} litres stored, ${reference(day.rainMm)} millimetres rain`);
  assert.equal(t.el('used-total').textContent,reference(expected.totals.used));
  assert.equal(t.el('capacity-label').textContent,`${reference(capacityL)} L`);
 }
 assert.equal(t.formatterConstructions,1,'imports and slider updates reuse the original formatter');
 }finally{t.dom.window.close();}
});
test('update comparison uses a decorative font-independent arrow without changing submission',()=>{
 const t=ui();try{
 const button=t.el('controls').querySelector('button[type="submit"]');
 assert.equal(button.textContent.trim(),'Update comparison');
 const icon=button.querySelector('svg');assert.ok(icon);
 assert.equal(icon.namespaceURI,'http://www.w3.org/2000/svg');
 assert.equal(icon.getAttribute('aria-hidden'),'true');assert.equal(icon.getAttribute('focusable'),'false');
 assert.equal(icon.getAttribute('stroke'),'currentColor');assert.equal(icon.getAttribute('fill'),'none');
 assert.equal(icon.getAttribute('viewBox'),'0 0 16 16');assert.equal(icon.getAttribute('width'),'13');assert.equal(icon.getAttribute('height'),'13');
 assert.equal(icon.querySelector('path').getAttribute('d'),'M4 12 12 4M4 4h8v8');
 assert.equal(icon.querySelector('text, image, use, title, [tabindex]'),null);
 t.el('roofM2').value='80';t.fire('roofM2','input');assert.equal(t.el('export').disabled,true);
 button.focus();icon.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(t.w.document.activeElement,button);assert.equal(t.el('export').disabled,false);
 assert.match(t.el('input-status').textContent,/Comparison updated/);
 }finally{t.dom.window.close();}
});
test('independent exhaustive integer conservation across 4096 rain sequences and capacities',()=>{
 const p={roofM2:2,gardenM2:1,demandMm:2,efficiency:1,initialL:0,capacityL:0};
 for(let pattern=0;pattern<4096;pattern++){
  let encoded=pattern;const rain=Array.from({length:6},()=>{const d=encoded%4;encoded=Math.floor(encoded/4);return d;});
  let previousUse=0;
  for(let capacity=0;capacity<8;capacity++){
   const r=simulate({...p,capacityL:capacity},rain);
   assert.equal(r.totals.inflow,r.totals.used+r.totals.overflow+r.totals.end);
   assert.equal(r.totals.demand,r.totals.used+r.totals.unmet);
   assert.ok(r.totals.used>=previousUse);previousUse=r.totals.used;
   r.days.forEach(d=>{assert.equal(d.initial+d.inflow,d.overflow+d.used+d.end);assert.ok(d.end<=capacity);});
  }
 }
});
test('UI initializes, inspects day 3, invalid edits keep results and block export, reset restores',()=>{
 const t=ui();try{
 assert.equal(t.el('chart').children.length,30);const initial=t.el('used-total').textContent;
 t.el('chart').children[2].click();assert.equal(t.el('day').value,'3');assert.equal(t.el('storage-value').textContent,'256 L');
 t.el('roofM2').value='-1';t.fire('roofM2','input');assert.equal(t.el('export').disabled,true);
 t.fire('controls','submit');assert.equal(t.el('used-total').textContent,initial);assert.match(t.el('input-status').textContent,/valid values/);
 t.el('reset').click();t.el('reset-confirm').click();assert.equal(t.el('roofM2').value,'40');assert.equal(t.el('day').value,'1');assert.equal(t.el('export').disabled,false);
 }finally{t.dom.window.close();}
});
test('zero rain / zero capacity remain finite and same-capacity comparison matches',()=>{
 const t=ui();try{
 t.el('pattern').value='none';t.fire('pattern','change');assert.equal(t.el('used-total').textContent,'0');
 t.el('pattern').value='mixed';t.fire('pattern','change');t.el('capacityL').value='0';t.fire('capacityL','input');
 assert.equal(t.el('used-total').textContent,'0');assert.equal(t.el('water-fill').style.height,'0%');
 t.el('capacityL').value='200';t.fire('capacityL','input');assert.equal(t.el('comparison').textContent,'Same modeled use as baseline.');
 }finally{t.dom.window.close();}
});
test('CSV exports 60 daily rows with applied assumptions and raw conservation',async()=>{
 const t=ui();try{
 t.el('roofM2').value='31';t.fire('roofM2','input');assert.equal(t.el('export').disabled,true);t.fire('controls','submit');t.el('export').click();
 const reader=new t.w.FileReader();const csv=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(t.download);});
 assert.match(csv,/"roof_m2","31"/);const lines=csv.split('\r\n');const daily=lines.filter(l=>/^"(baseline|scenario)","\d+"/.test(l));assert.equal(daily.length,60);
 for(const line of daily){const v=line.slice(1,-1).split('\",\"');const [start,collected,overflow,target,used,unmet,end]=v.slice(3).map(Number);assert.ok(Math.abs(start+collected-overflow-used-end)<1e-8);assert.ok(Math.abs(target-used-unmet)<1e-8);}
 }finally{t.dom.window.close();}
});

test('comparison distinguishes signed sub-precision deltas, rounded boundaries and exact zero',()=>{
 const t=ui();try{
 // Stub only the totals consumed by presentation; real-model/browser fixtures cover integration.
 for(const delta of [0,-0,0.000001,-0.000001,0.04,-0.04,0.049,-0.049,0.05,-0.05,0.051,-0.051,1,-1]){
  t.w.simulate=(params,rain)=>{const r=simulate(params,rain);r.totals.used=params.capacityL===400?delta:0;return r;};
  t.fire('controls','submit');
  const rounded=new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(Math.abs(delta));
  if(delta===0){assert.equal(t.el('comparison').textContent,'Same modeled use as baseline.');assert.match(t.el('takeaway').textContent,/same modeled amount/);}
  else if(rounded==='0'){assert.equal(t.el('comparison').textContent,'Less than 0.1 L difference in modeled use.');assert.match(t.el('takeaway').textContent,/differ by less than 0.1 L/);assert.doesNotMatch(t.el('takeaway').textContent,/supplies 0 L|same modeled amount/);}
  else{assert.equal(t.el('comparison').textContent,`${rounded} L ${delta>0?'more':'less'} modeled use than baseline.`);assert.ok(t.el('takeaway').textContent.includes(`${rounded} L ${delta>0?'more':'less'}`));}
 }
 }finally{t.dom.window.close();}
});

test('immediate controls do not silently commit pending assumptions',()=>{
 const t=ui();try{
 const original=t.el('balance').textContent;
 t.el('roofM2').value='80';t.fire('roofM2','input');
 t.el('capacityL').value='800';t.fire('capacityL','input');
 assert.equal(t.el('capacity-label').textContent,'800 L (pending)');assert.equal(t.el('scenario-title').textContent,'Scenario · 400 L');assert.equal(t.el('balance').textContent,original);assert.equal(t.el('export').disabled,true);
 assert.match(t.el('input-status').textContent,/Update comparison to apply/);
 t.el('pattern').value='none';t.fire('pattern','input');t.fire('pattern','change');
 assert.equal(t.el('capacity-label').textContent,'800 L (pending)');assert.equal(t.el('scenario-title').textContent,'Scenario · 400 L');assert.equal(t.el('balance').textContent,original);assert.equal(t.el('export').disabled,true);
 t.fire('controls','submit');assert.equal(t.el('used-total').textContent,'0');assert.equal(t.el('export').disabled,false);
 t.el('pattern').value='mixed';t.fire('pattern','input');t.fire('pattern','change');
 assert.match(t.el('balance').textContent,/3,456/);assert.equal(t.el('export').disabled,false);
 t.el('gardenM2').value='';t.fire('gardenM2','input');t.el('capacityL').value='1000';t.fire('capacityL','input');
 assert.equal(t.el('export').disabled,true);t.el('reset').click();t.el('reset-confirm').click();assert.equal(t.el('export').disabled,false);
 t.el('capacityL').value='800';t.fire('capacityL','input');assert.equal(t.el('capacity-label').textContent,'800 L');
 }finally{t.dom.window.close();}
});

test('daily comparison uses the same applied day and capacities, preserving pending edits',()=>{
 const {el,fire}=ui(); el('day').value=20;fire('day','input');
 assert.equal(el('baseline-day-used').textContent,'20 L');assert.equal(el('day-used').textContent,'60 L');
 assert.match(el('day-difference').textContent,/40 L more/);
 el('baselineL').value=1000;fire('baselineL','input');
 assert.equal(el('day-baseline-heading').textContent,'Baseline · 200 L');
 assert.equal(el('baseline-day-used').textContent,'20 L');
 fire('controls','submit');assert.equal(el('day-baseline-heading').textContent,'Baseline · 1,000 L');
 assert.equal(el('baseline-day-used').textContent,'60 L');assert.match(el('day-difference').textContent,/same modeled/);
 el('capacityL').value=0;fire('capacityL','input');assert.match(el('day-difference').textContent,/60 L less/);
 el('pattern').value='none';fire('pattern','change');assert.match(el('day-difference').textContent,/same modeled/);
 fire('reset','click');fire('reset-confirm','click');assert.equal(el('day').value,'1');assert.equal(el('day-baseline-heading').textContent,'Baseline · 200 L');
});
