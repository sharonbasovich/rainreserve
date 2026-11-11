// Harness protocol controls use a fake Page, not real browser acceptance.
import {test,expect} from '@playwright/test';
import {EventEmitter} from 'node:events';
import {reloadWithDecision} from './session-helpers.mjs';
class FakePage extends EventEmitter{
 constructor(mode='normal'){super();this.mode=mode;this.frame={};this.identity=undefined;this.readyState='complete';this.reloadQueued=false;}
 url(){return 'https://fixture.test/rainreserve/';}
 mainFrame(){return this.frame;}
 waitForEvent(event,options){
  expect(options.timeout).toBeGreaterThan(0);
  if(event==='dialog')return Promise.resolve(this.mode==='no-dialog'?{error:true}:this.dialog()).then(d=>{if(d.error)throw new Error('Missing required dialog');return d;});
  if(event==='framenavigated')return new Promise((resolve,reject)=>{
   this.navigation=()=>resolve(this.frame);this.navigationFailure=()=>reject(new Error('No accepted navigation'));
  });
  throw new Error('Unexpected event');
 }
 dialog(){return {type:()=>this.mode==='wrong-dialog'?'alert':'beforeunload',dismiss:async()=>{
  if(this.mode==='dismiss-failure')throw new Error('Dismiss failed');
  if(this.mode==='cancel-navigation'){this.identity=undefined;this.emit('framenavigated',this.frame);}
  if(this.mode==='cancel-document-loss')this.identity=undefined;
 },accept:async()=>{
  if(this.mode==='accept-failure'){this.navigationFailure();throw new Error('Accept failed');}
  if(this.mode==='missing-navigation'){this.navigationFailure();return;}
  if(this.mode!=='retained-document')this.identity=undefined;
  this.emit('framenavigated',this.frame);this.navigation();
 }};}
 async evaluate(fn,arg){
  if(arg!==undefined){this.identity=arg;return;}
  const code=String(fn);
  if(code.includes('window.location.reload')){this.reloadQueued=true;if(this.mode==='trigger-failure')throw new Error('Unrelated trigger timeout');return;}
  if(this.mode==='observation-failure')throw new Error('Unrelated evaluation timeout');
  return {identity:this.identity,url:this.url(),readyState:this.readyState};
 }
 async waitForLoadState(state,options){expect(state).toBe('load');expect(options.timeout).toBe(10000);if(this.mode==='load-failure')throw new Error('Unrelated load timeout');}
}
for(const decision of ['cancel','leave'])test(`HARNESS CONTROL: successful ${decision} records document and navigation evidence`,async()=>{
 const page=new FakePage(),observations=[];await reloadWithDecision(page,decision,observations);
 expect(page.reloadQueued).toBe(true);expect(page.listenerCount('framenavigated')).toBe(0);expect(observations).toHaveLength(1);
 expect(observations[0].mainFrameCommits).toBe(decision==='cancel'?0:1);
 expect(observations[0][decision==='cancel'?'documentRetained':'documentReplaced']).toBe(true);
});
for(const [mode,decision]of [['no-dialog','cancel'],['wrong-dialog','cancel'],['dismiss-failure','cancel'],['cancel-navigation','cancel'],['cancel-document-loss','cancel'],['trigger-failure','cancel'],['observation-failure','cancel'],['accept-failure','leave'],['missing-navigation','leave'],['retained-document','leave'],['load-failure','leave']])test(`HARNESS CONTROL: ${mode} cannot pass ${decision}`,async()=>{
 const page=new FakePage(mode),observations=[];
 await expect(reloadWithDecision(page,decision,observations)).rejects.toThrow();
 expect(observations).toEqual([]);expect(page.listenerCount('framenavigated')).toBe(0);
});
