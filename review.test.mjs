import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {simulate} from './model.mjs';
import {parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE} from './rainfall.mjs';
// Independent review harness; jsdom is development-only.
const {JSDOM}=await import('jsdom');
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('app.mjs',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
function ui(){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.simulate=simulate;Object.assign(w,{parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE});let download;
 w.URL.createObjectURL=blob=>{download=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){};
 vm.runInContext(script,dom.getInternalVMContext());
 const el=id=>w.document.getElementById(id);
 const fire=(id,event)=>el(id).dispatchEvent(new w.Event(event,{bubbles:true,cancelable:true}));
 return {dom,w,el,fire,get download(){return download;}};
}
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
 t.el('reset').click();assert.equal(t.el('roofM2').value,'40');assert.equal(t.el('day').value,'1');assert.equal(t.el('export').disabled,false);
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
