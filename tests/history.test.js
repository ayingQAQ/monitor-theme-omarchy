import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as historyModule from '../src/data/history.js';

function setup(options={}){
 let time=0,reads=0,serial=0;const jobs=new Map();
 const timers={setTimeout(fn,delay){jobs.set(++serial,{fn,at:time+delay});return serial;},clearTimeout(id){jobs.delete(id);}};
 const store=historyModule.createHistoryCache({request:async()=>{reads++;return {metrics:[{cpu:reads}]};},now:()=>time,timers,...options});
 return {...store,jobs,reads:()=>reads,async get(id='1',points=60,force=false){return store.history(id,6,'metrics',points,undefined,force);},advance(ms){time+=ms;for(const [id,job]of [...jobs])if(job.at<=time){jobs.delete(id);job.fn();}}};
}

test('history cache expires while idle and normalizes the requested point count',async()=>{
 const s=setup();await s.get('1',20);await s.get('1',60);assert.equal(s.reads(),1);
 s.advance(25000);assert.equal(s.jobs.size,0);await s.get();assert.equal(s.reads(),2);s.clearHistory();assert.equal(s.jobs.size,0);
});
test('history cache evicts the least recently used entry within count and data budgets',async()=>{
 const s=setup({maxEntries:2});await s.get('1');await s.get('2');await s.get('1');await s.get('3');await s.get('1');assert.equal(s.reads(),3);await s.get('2');assert.equal(s.reads(),4);s.clearHistory();
 const points=setup({maxPoints:1});await points.get('1');await points.get('2');await points.get('1');assert.equal(points.reads(),3);points.clearHistory();
 const large=setup({maxBytes:8});const response=await large.get();assert.equal(response.metrics[0].cpu,1);await large.get();assert.equal(large.reads(),2);assert.equal(large.jobs.size,0);
});
test('clearing history prevents an in-flight request from repopulating the cache',async()=>{
 let release,reads=0;const s=setup({request:()=>{reads++;return reads===1?new Promise(r=>release=r):Promise.resolve({metrics:[]});}});
 const pending=s.get();s.clearHistory();release({metrics:[]});await pending;await s.get();assert.equal(reads,2);s.clearHistory();
});
test('removed nodes invalidate cached and in-flight histories; aborted calls never use cache',async()=>{
 const s=setup();await s.get('1');await s.get('2');s.retainHistory(['2']);await s.get('1');await s.get('1');assert.equal(s.reads(),4);await s.get('2');assert.equal(s.reads(),4);
 const abort=new AbortController();abort.abort();await assert.rejects(s.history('2',6,'metrics',60,abort.signal));s.clearHistory();
 let release,reads=0;const pendingStore=setup({request:()=>{reads++;return reads===1?new Promise(r=>release=r):Promise.resolve({metrics:[]});}});
 const pending=pendingStore.get('1');pendingStore.retainHistory([]);release({metrics:[]});await pending;pendingStore.retainHistory(['1']);await pendingStore.get('1');assert.equal(reads,2);pendingStore.clearHistory();
});
