import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntranceRegistry } from '../entrance-registry.js';
import { createAnimationController, settleMotionStates } from '../motion-core.js';
function fixture() {
 const calls={unobserve:[],cancel:[],reveal:[],reset:[]};
 const registry=createEntranceRegistry(Object.fromEntries(Object.keys(calls).map(name=>[name,element=>calls[name].push(element)])));
 return {registry,calls};
}
test('completed entrance identities deduplicate without staying in the active registry',()=>{
 const {registry,calls}=fixture(),element={};
 registry.add(element,{status:'pending'});
 assert.equal(registry.complete(element),true);
 assert.equal(registry.active.size,0);assert.equal(registry.has(element),true);
 assert.equal(registry.add(element,{status:'pending'}),false);
 assert.equal(registry.complete(element),false);assert.equal(calls.reveal.length,1);
 registry.dispose(element);registry.dispose(element);
 assert.equal(registry.has(element),false);assert.equal(calls.reset.length,1);
 assert.equal(registry.add(element,{status:'pending'}),true);
});
test('container cleanup releases pending, running and completed targets only within the container',()=>{
 const {registry,calls}=fixture(),pending={},running={},completed={},outside={};
 for(const [element,status] of [[pending,'pending'],[running,'running'],[completed,'pending'],[outside,'pending']]) registry.add(element,{status});
 registry.complete(completed);
 const root={querySelectorAll:()=>[pending,running,completed]};
 registry.disposeWithin(root);registry.disposeWithin(root);
 assert.equal(registry.active.size,1);assert.equal(registry.has(outside),true);
 assert.deepEqual(calls.cancel,[pending,running,completed]);
 assert.equal(registry.complete(pending),false);assert.equal(registry.complete(running),false);
 assert.deepEqual(calls.reveal,[completed]);
});
test('settling can delete every active entry while iterating without skipping targets',()=>{
 const {registry}=fixture();
 for(let i=0;i<30;i++) registry.add({},{status:i%2?'pending':'running'});
 settleMotionStates({entrances:registry.active,counters:new Map(),completeEntrance:e=>registry.complete(e),finishCounter(){},all:true});
 assert.equal(registry.active.size,0);
});
test('cancelled entrance completion cannot write to a disposed target',async()=>{
 let resolve;const effects=[];
 const element={animate:()=>({cancel(){effects.push('cancel');},finished:new Promise(done=>{resolve=done;})})};
 const animations=createAnimationController();const revealed=[];
 const registry=createEntranceRegistry({unobserve(){},cancel:e=>animations.cancel(e),reveal:e=>revealed.push(e),reset(){}});
 registry.add(element,{status:'running'});
 animations.run(element,element,[],{},()=>registry.complete(element));
 registry.dispose(element);resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(animations.size,0);assert.equal(registry.active.size,0);assert.equal(revealed.length,0);assert.deepEqual(effects,['cancel']);
});
test('100 list replacements keep active registrations bounded and release old identities',()=>{
 const {registry}=fixture();let previous=[];
 for(let i=0;i<100;i++){
  registry.disposeWithin({querySelectorAll:()=>previous});
  assert.ok(previous.every(e=>!registry.has(e)));
  previous=Array.from({length:3},()=>({}));
  previous.forEach((e,j)=>{registry.add(e,{status:j===1?'running':'pending'});if(j===2)registry.complete(e);});
  assert.equal(registry.active.size,2);
 }
 registry.disposeWithin({querySelectorAll:()=>previous});assert.equal(registry.active.size,0);
});
