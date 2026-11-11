import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {simulate,summarizeShortfalls} from './model.mjs';
import {parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE} from './rainfall.mjs';

const root=new URL(process.env.RAINRESERVE_SOURCE||'./',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const script=readFileSync(new URL('app.mjs',root),'utf8').replace(/^import .*;\r?$/gm,'');
function ui(){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window;
 Object.assign(w,{simulate,summarizeShortfalls,parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE});
 const listeners=new Set();let additions=0,removals=0,download;
 const add=w.addEventListener.bind(w),remove=w.removeEventListener.bind(w);
 w.addEventListener=(type,fn,...args)=>{if(type==='beforeunload'){listeners.add(fn);additions++;}return add(type,fn,...args);};
 w.removeEventListener=(type,fn,...args)=>{if(type==='beforeunload'){listeners.delete(fn);removals++;}return remove(type,fn,...args);};
 w.URL.createObjectURL=blob=>{download=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=()=>{};
 vm.runInContext(script,dom.getInternalVMContext());
 const el=id=>w.document.getElementById(id),fire=(id,type)=>el(id).dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));
 const set=(id,value)=>{el(id).value=value;fire(id,'input');};
 const warning=()=>{const event=new w.Event('beforeunload',{cancelable:true});w.dispatchEvent(event);return event.defaultPrevented;};
 const reset=()=>{el('reset').click();el('reset-confirm').click();};
 return {dom,w,el,fire,set,warning,reset,listeners,get additions(){return additions;},get removals(){return removals;},get download(){return download;}};
}
const csv='date,rain_mm\n2026-11-01,8.5\n2026-11-02,0';
function start(t,text=csv){
 let resolve,reject;
 Object.defineProperty(t.el('rain-file'),'files',{configurable:true,value:[{size:text.length,text:()=>new Promise((r,j)=>{resolve=r;reject=j;})}]});
 t.fire('rain-file','change');
 return {finish:async()=>{resolve(text);await new Promise(r=>setImmediate(r));},fail:async()=>{reject(new Error('Read failed'));await new Promise(r=>setImmediate(r));}};
}
async function csvText(t){const reader=new t.w.FileReader();return new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(t.download);});}

test('untouched example, chart inspection and unchanged numeric representations do not warn',()=>{
 const t=ui();try{
  assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);
  t.el('chart').children[19].click();t.set('day',10);t.el('shortfall-inspect').click();
  t.el('reset').click();t.el('reset-cancel').click();
  for(const [id,value] of Object.entries({roofM2:'40.0',gardenM2:'2e1',demandMm:'3.0',efficiency:'80.0',baselineL:'200.0'}))t.set(id,value);
  assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);assert.equal(t.additions,0);
 }finally{t.dom.window.close();}
});

test('every changed or invalid numeric draft warns and exact unapplied reversion removes the handler',()=>{
 const t=ui();try{
  for(const [id,original,changed] of [['roofM2',40,80],['gardenM2',20,30],['demandMm',3,4.5],['efficiency',80,90],['baselineL',200,500]]){
   for(const value of [changed,'',-1]){
    t.set(id,value);assert.equal(t.warning(),true,`${id}=${value}`);assert.equal(t.listeners.size,1);
    t.set(id,original);assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);
   }
  }
  assert.equal(t.additions,t.removals);
 }finally{t.dom.window.close();}
});

test('applied edits remain protected while original values are only a draft, then clear on apply',()=>{
 const t=ui();try{
  for(const [id,original,changed] of [['roofM2',40,80],['gardenM2',20,30],['demandMm',3,4.5],['efficiency',80,90],['baselineL',200,500]]){
   t.set(id,changed);t.fire('controls','submit');assert.equal(t.warning(),true);
   t.set(id,original);assert.equal(t.warning(),true);assert.equal(t.listeners.size,1);
   t.fire('controls','submit');assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);
  }
 }finally{t.dom.window.close();}
});

test('immediate controls and pending combinations protect both the draft and applied comparison',()=>{
 const t=ui();try{
  t.set('capacityL',800);assert.equal(t.warning(),true);t.set('capacityL',400);assert.equal(t.warning(),false);
  for(const pattern of ['none','dry','storms']){
   t.el('pattern').value=pattern;t.fire('pattern','change');assert.equal(t.warning(),true);
   t.el('pattern').value='mixed';t.fire('pattern','change');assert.equal(t.warning(),false);
  }
  t.set('roofM2',80);t.set('capacityL',800);t.el('pattern').value='dry';t.fire('pattern','change');
  assert.equal(t.el('scenario-title').textContent,'Scenario · 400 L');assert.equal(t.warning(),true);
  t.set('roofM2',40);t.set('capacityL',400);t.el('pattern').value='mixed';t.fire('pattern','change');
  assert.equal(t.warning(),false);assert.equal(t.el('export').disabled,true);
 }finally{t.dom.window.close();}
});

test('imports warn during reading and afterward, including retained input behind a synthetic pattern',async()=>{
 const t=ui();try{
  const read=start(t);assert.equal(t.warning(),true);await read.finish();assert.equal(t.warning(),true);
  t.el('pattern').value='mixed';t.fire('pattern','change');assert.equal(t.warning(),true);
  t.el('reset').click();t.el('reset-cancel').click();assert.equal(t.warning(),true);
  t.el('reset').click();t.el('controls').dispatchEvent(new t.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(t.el('reset-confirmation').hidden,true);assert.equal(t.warning(),true);
  t.reset();assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);assert.equal(t.el('custom-option').disabled,true);
 }finally{t.dom.window.close();}
});

test('failed initial reads release protection; failed replacements preserve retained input protection',async()=>{
 const t=ui();try{
  await start(t).fail();assert.equal(t.warning(),false);assert.equal(t.listeners.size,0);
  await start(t,'date,rain_mm\n2026-11-01,unknown').finish();assert.equal(t.warning(),false);
  await start(t).finish();const old=t.el('rain-label').textContent;
  await start(t).fail();assert.equal(t.warning(),true);assert.equal(t.el('rain-label').textContent,old);
  t.reset();t.set('roofM2','');await start(t).fail();assert.equal(t.warning(),true);
 }finally{t.dom.window.close();}
});

test('reset and pattern cancellation cannot be undone by stale success or failure',async()=>{
 const t=ui();try{
  for(const outcome of ['finish','fail']){
   const read=start(t);t.reset();assert.equal(t.warning(),false);await read[outcome]();assert.equal(t.warning(),false);
   const canceled=start(t);t.el('pattern').value='dry';t.fire('pattern','change');assert.equal(t.warning(),true);
   t.el('pattern').value='mixed';t.fire('pattern','change');assert.equal(t.warning(),false);
   await canceled[outcome]();assert.equal(t.warning(),false);
  }
 }finally{t.dom.window.close();}
});

test('an older completion cannot clear a newer active read or its retained import',async()=>{
 const t=ui();try{
  for(const outcome of ['finish','fail']){
   const old=start(t),newer=start(t,'date,rain_mm\n2026-11-03,0');
   await old[outcome]();assert.equal(t.warning(),true);assert.equal(t.listeners.size,1);
   await newer.finish();assert.equal(t.warning(),true);assert.match(t.el('rain-label').textContent,/2026-11-03/);
   t.reset();assert.equal(t.warning(),false);
  }
 }finally{t.dom.window.close();}
});

test('comparison and example downloads neither clear protection nor imply a restorable session',async()=>{
 const t=ui();try{
  t.set('roofM2',80);t.fire('controls','submit');t.el('export').click();
  assert.match(await csvText(t),/"roof_m2","80"/);assert.equal(t.warning(),true);
  t.el('template').click();assert.equal(t.warning(),true);
  t.reset();t.el('export').click();assert.equal(t.warning(),false);
  assert.match(t.el('session-help').textContent,/best effort/);assert.match(t.el('session-help').textContent,/not restorable sessions/);
 }finally{t.dom.window.close();}
});

test('repeated canceled leave requests preserve the exact current comparison and input state',async()=>{
 const t=ui();try{
  await start(t).finish();t.set('day',2);t.set('roofM2','');
  const snapshot=()=>[t.el('rain-label').textContent,t.el('day').value,t.el('roofM2').value,t.el('balance').textContent,t.el('export').disabled];
  const before=snapshot();const additions=t.additions;
  for(let i=0;i<5;i++){assert.equal(t.warning(),true);assert.deepEqual(snapshot(),before);}
  assert.equal(t.additions,additions);assert.equal(t.listeners.size,1);
 }finally{t.dom.window.close();}
});
