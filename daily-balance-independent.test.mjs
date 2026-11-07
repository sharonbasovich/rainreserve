import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {simulate,summarizeShortfalls} from './model.mjs';
import {parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE} from './rainfall.mjs';

const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('app.mjs',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'');
const keys=['initial','inflow','overflow','demand','used','unmet','end'];
const format=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n)+' L';
function ui(){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window;
 Object.assign(w,{simulate,summarizeShortfalls,parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE});
 vm.runInContext(script,dom.getInternalVMContext());
 const el=id=>w.document.getElementById(id),fire=(id,type)=>el(id).dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
 return {dom,el,fire};
}
// Separate recurrence: partition roof water by capacity, then divide the garden
// target between supplied water and deficit. Do not read app state/model output.
function oracle(rain,{roof,garden,target,efficiency,capacity}){
 let stock=0;
 return rain.map(mm=>{
  const initial=stock,inflow=mm*roof*efficiency/100;
  const captured=initial+inflow,overflow=captured>capacity?captured-capacity:0;
  stock=captured-overflow;
  const demand=mm<target?(target-mm)*garden:0;
  const unmet=demand>stock?demand-stock:0;
  const used=unmet>0?stock:demand;
  stock=unmet>0?0:stock-demand;
  return {initial,inflow,overflow,demand,used,unmet,end:stock};
 });
}
function csv(rain){return 'date,rain_mm\n'+rain.map((mm,i)=>`${new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10)},${mm}`).join('\n');}
function start(t,text){
 let finish;
 Object.defineProperty(t.el('rain-file'),'files',{configurable:true,value:[{size:text.length,text:()=>new Promise(resolve=>finish=()=>resolve(text))}]});
 t.fire('rain-file','change');
 return async()=>{finish();await new Promise(resolve=>setImmediate(resolve));};
}
function set(t,values){for(const [id,value] of Object.entries(values)){t.el(id).value=value;t.fire(id,'input');}}
function select(t,index){t.el('chart').children[index].click();}
function verify(t,baseline,scenario,index){
 for(const key of keys){
  assert.equal(t.el('baseline-day-'+key).textContent,format(baseline[index][key]),`baseline day ${index+1} ${key}`);
  assert.equal(t.el('day-'+key).textContent,format(scenario[index][key]),`scenario day ${index+1} ${key}`);
 }
 assert.equal(t.el('storage-value').textContent,t.el('day-end').textContent);
}
function snapshot(t){return keys.flatMap(key=>[t.el('baseline-day-'+key).textContent,t.el('day-'+key).textContent]);}

test('complete displayed balances match an independent recurrence across boundaries and decimal rain',async()=>{
 const t=ui();try{
  let seed=0x51f15e;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const fixtures=[
   {rain:[8,0,0,0,3,500,0],roof:40,garden:20,target:3,efficiency:80,baseline:200,scenario:400},
   {rain:[0,.049,1.4,20,0,500],roof:0,garden:1000,target:20,efficiency:100,baseline:10000,scenario:0},
   {rain:[500,0,2.5,0],roof:1000,garden:0,target:20,efficiency:100,baseline:0,scenario:2000},
   {rain:[500,0,.1],roof:1000,garden:1000,target:0,efficiency:0,baseline:10000,scenario:2000},
  ];
  for(let i=0;i<8;i++)fixtures.push({rain:Array.from({length:32},()=>random()<.55?0:Math.floor(random()*2500)/100),roof:1+Math.floor(random()*99),garden:1+Math.floor(random()*49),target:Math.floor(random()*100)/10,efficiency:Math.floor(random()*101),baseline:50*Math.floor(random()*21),scenario:50*Math.floor(random()*21)});
  for(const f of fixtures){
   set(t,{roofM2:f.roof,gardenM2:f.garden,demandMm:f.target,efficiency:f.efficiency,baselineL:f.baseline,capacityL:f.scenario});
   await start(t,csv(f.rain))();t.fire('controls','submit');
   const baseline=oracle(f.rain,{...f,capacity:f.baseline}),scenario=oracle(f.rain,{...f,capacity:f.scenario});
   for(let i=0;i<f.rain.length;i++){select(t,i);verify(t,baseline,scenario,i);}
  }
  assert.match(t.el('data-tag').textContent,/UNVERIFIED/);
  assert.match(t.el('day-end').closest('.day-flows').textContent,/rounded independently to 0\.1 L/);
 }finally{t.dom.window.close();}
});

test('all added rows preserve the applied comparison through interrupted, invalid and repeated imports',async()=>{
 const t=ui();try{
  const f={rain:[8,0,0],roof:40,garden:20,target:3,efficiency:80};
  await start(t,csv(f.rain))();select(t,2);
  const baseline=oracle(f.rain,{...f,capacity:200}),scenario=oracle(f.rain,{...f,capacity:400});
  verify(t,baseline,scenario,2);const applied=snapshot(t);
  set(t,{roofM2:'',capacityL:0});
  const interrupted=start(t,csv([500]));
  assert.deepEqual(snapshot(t),applied);
  await interrupted();t.fire('controls','submit');
  assert.deepEqual(snapshot(t),applied);assert.equal(t.el('day').value,'3');assert.equal(t.el('export').disabled,true);
  await start(t,'date,rain_mm\n2026-01-01,unknown')();
  assert.deepEqual(snapshot(t),applied);assert.match(t.el('csv-status').textContent,/Not imported/);
  set(t,{roofM2:40});t.fire('controls','submit');
  verify(t,oracle([500],{...f,capacity:200}),oracle([500],{...f,capacity:0}),0);
  for(let i=0;i<2;i++){
   await start(t,csv(f.rain))();select(t,2);
   verify(t,baseline,oracle(f.rain,{...f,capacity:0}),2);
  }
  const stale=start(t,csv([500]));t.el('reset').click();t.el('reset-confirm').click();const reset=snapshot(t);await stale();
  assert.deepEqual(snapshot(t),reset);assert.equal(t.el('day').value,'1');assert.equal(t.el('day-initial').textContent,'0 L');assert.equal(t.el('baseline-day-end').textContent,'0 L');
 }finally{t.dom.window.close();}
});
