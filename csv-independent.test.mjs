import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {simulate} from './model.mjs';
import {parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE} from './rainfall.mjs';
const html=readFileSync(new URL('index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function ui(){const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'});const w=dom.window;Object.assign(w,{simulate,parseRainfallCSV,MAX_CSV_BYTES,TEMPLATE});let download;w.URL.createObjectURL=blob=>{download=blob;return 'blob:test'};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};vm.runInContext(script,dom.getInternalVMContext());const el=id=>w.document.getElementById(id);const fire=(id,type)=>el(id).dispatchEvent(new w.Event(type,{bubbles:true}));return {dom,w,el,fire,get download(){return download}};}
function start(t,text){let release;const file={size:text.length,text:()=>new Promise(r=>release=()=>r(text))};Object.defineProperty(t.el('rain-file'),'files',{configurable:true,value:[file]});t.fire('rain-file','change');return async()=>{release();await new Promise(r=>setImmediate(r))};}
const csv='date,rain_mm\n2026-10-01,8\n2026-10-02,0';
test('independent import uses matching dates/model, errors preserve applied source, reset clears',async()=>{const t=ui();try{await start(t,csv)();assert.equal(t.el('chart').children.length,2);assert.equal(t.el('used-total').textContent,'60');assert.match(t.el('rain-label').textContent,/2026-10-01/);assert.equal(t.el('day').max,'2');assert.match(t.el('data-tag').textContent,/UNVERIFIED/);await start(t,'date,rain_mm\n2026-10-01,unknown')();assert.equal(t.el('chart').children.length,2);assert.match(t.el('csv-status').textContent,/Not imported/);assert.equal(t.el('export').disabled,false);t.el('reset').click();assert.equal(t.el('chart').children.length,30);assert.equal(t.el('custom-option').disabled,true);assert.match(t.el('data-tag').textContent,/SYNTHETIC/);}finally{t.dom.window.close()}});
test('independent stale reads cannot undo reset, newer selection or synthetic selection',async()=>{const t=ui();try{const finish=start(t,csv);t.el('reset').click();await finish();assert.equal(t.el('pattern').value,'mixed');const old=start(t,csv);await start(t,'date,rain_mm\n2026-01-01,0')();await old();assert.equal(t.el('chart').children.length,1);const stale=start(t,csv);t.el('pattern').value='dry';t.fire('pattern','change');await stale();assert.equal(t.el('pattern').value,'dry');assert.equal(t.el('chart').children.length,30);}finally{t.dom.window.close()}});
test('independent invalid setup prevents new results and export until corrected',async()=>{const t=ui();try{const before=t.el('used-total').textContent;t.el('roofM2').value='-1';t.fire('roofM2','input');await start(t,csv)();assert.equal(t.el('used-total').textContent,before);assert.equal(t.el('export').disabled,true);t.el('roofM2').value='40';t.fire('controls','submit');assert.equal(t.el('chart').children.length,2);assert.equal(t.el('export').disabled,false);}finally{t.dom.window.close()}});
test('replacement blocked by invalid setup preserves the inspected day until results change',async()=>{
 const t=ui();try{
  await start(t,csv)();t.el('chart').children[1].click();
  const previous={period:t.el('period-label').textContent,rain:t.el('rain-label').textContent,storage:t.el('storage-value').textContent};
  t.el('roofM2').value='-1';t.fire('roofM2','input');
  await start(t,'date,rain_mm\n2026-11-01,20')();
  assert.equal(t.el('day').value,'2');assert.equal(t.el('day-output').textContent,'2 / 2');assert.equal(t.el('day-number').textContent,'2');
  assert.equal(t.el('chart').children[1].getAttribute('aria-pressed'),'true');assert.equal(t.el('period-label').textContent,previous.period);assert.equal(t.el('rain-label').textContent,previous.rain);assert.equal(t.el('storage-value').textContent,previous.storage);assert.equal(t.el('export').disabled,true);
  t.el('roofM2').value='40';t.fire('controls','submit');
  assert.equal(t.el('day').value,'1');assert.equal(t.el('day-output').textContent,'1 / 1');assert.equal(t.el('rain-label').textContent,'2026-11-01 · 20 mm rain');assert.equal(t.el('chart').children[0].getAttribute('aria-pressed'),'true');assert.equal(t.el('export').disabled,false);
  await start(t,csv)();t.el('chart').children[1].click();await start(t,csv)();
  assert.equal(t.el('day').value,'1');assert.equal(t.el('day-output').textContent,'1 / 2');assert.equal(t.el('chart').children[0].getAttribute('aria-pressed'),'true');
 }finally{t.dom.window.close();}
});
test('independent parser rejects tricks, preserves dates across DST and numeric bounds',()=>{assert.deepEqual(parseRainfallCSV('date,rain_mm\n2026-11-01,0\n2026-11-02,500').rainfall,[0,500]);for(const x of ['2026-04-31,0','2026-01-01,\u22121','2026-01-01,=SUM(1)','2026-01-01,1\r2026-01-02,2','2026-01-01,"0,1"'])assert.throws(()=>parseRainfallCSV('date,rain_mm\n'+x));assert.throws(()=>parseRainfallCSV('date,rain_mm\n2026-01-01,0\n2026-01-01,0'));});
