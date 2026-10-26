import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLive } from '../src/data/live.js';
import { api } from '../src/data/http.js';
const tick=()=>new Promise(r=>setImmediate(r));
function setup(fetchNodes=async()=>({nodes:[]})){
 const sockets=[],received=[],errors=[],jobs=new Map();let seq=0;
 class Socket {constructor(){this.readyState=1;sockets.push(this);}close(){this.readyState=3;this.onclose?.();}sendFrame(data){this.onmessage?.({data});}}
 const timers={setTimeout(fn,ms){jobs.set(++seq,{fn,ms});return seq;},clearTimeout(id){jobs.delete(id);}};
 const live=createLive({fetchNodes,Socket,url:'ws://example/api/ws',receive:n=>received.push(n),error:(e)=>errors.push(e),timers});
 return {live,sockets,received,errors,jobs,fire(ms){const job=[...jobs].find(([,j])=>j.ms===ms);if(job){jobs.delete(job[0]);job[1].fn();}}};
}
test('late REST cannot replace a newer websocket snapshot',async()=>{
 let resolve;const s=setup(()=>new Promise(r=>resolve=r));s.live.resume();s.sockets[0].sendFrame(JSON.stringify({nodes:[{id:2,online:false}]}));await tick();resolve({nodes:[{id:1}]});await tick();assert.equal(s.received.at(-1)[0].id,'2');s.live.stop();
});
test('text and gzip frames decode serially; old connection frames cannot commit',async()=>{
 const s=setup();s.live.resume();await tick();
 const compressed=new Blob([await new Response(new Blob([JSON.stringify({nodes:[{id:2}]})]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()]);
 s.sockets[0].sendFrame(compressed);s.sockets[0].sendFrame(JSON.stringify({nodes:[{id:3}]}));await new Promise(r=>setTimeout(r,40));assert.deepEqual(s.received.slice(-2).map(n=>n[0].id),['2','3']);
 const old=s.sockets[0];s.live.resume();old.sendFrame(JSON.stringify({nodes:[{id:4}]}));await tick();assert.ok(!s.received.some(ns=>ns[0]?.id==='4'));s.live.stop();
});
test('closed connection polls and reconnects; accepted stream stops polling',async()=>{
 let reads=0;const s=setup(async()=>{reads++;return {nodes:[]};});s.live.resume();await tick();s.sockets[0].close();s.fire(5000);await tick();assert.ok(reads>=2);assert.equal(s.sockets.length,2);s.sockets[1].sendFrame('{"nodes":[]}');await tick();assert.ok(![...s.jobs.values()].some(j=>j.ms===5000));s.live.stop();assert.equal(s.jobs.size,0);
});

test('binary snapshots use ArrayBuffer transport and stopped queues release unread frames',async()=>{
 const s=setup();s.live.resume();await tick();assert.equal(s.sockets[0].binaryType,'arraybuffer');
 const compressed=await new Response(new Blob([JSON.stringify({nodes:[{id:9}]})]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 s.sockets[0].sendFrame(compressed);await new Promise(r=>setTimeout(r,40));assert.equal(s.received.at(-1)[0].id,'9');
 let reads=0;const frame={stream(){reads++;return new Blob([]).stream();},async arrayBuffer(){reads++;return compressed;}};
 s.sockets[0].sendFrame(frame);s.sockets[0].sendFrame(frame);s.live.pause();await tick();assert.equal(reads,0);
});
test('REST recovery preserves transport interruption until a valid stream frame',async()=>{
 const s=setup();s.live.resume();await tick();s.sockets[0].sendFrame('{"nodes":[]}');await tick();s.sockets[0].close();await tick();assert.ok(s.errors.at(-1));s.fire(5000);await tick();assert.ok(s.errors.at(-1));s.sockets[1].sendFrame('{"nodes":[]}');await tick();assert.equal(s.errors.at(-1),null);s.live.stop();
});
test('bad frames do not reset silence timer; 401 clears stale nodes and stops recovery',async()=>{
 const s=setup();s.live.resume();await tick();s.sockets[0].sendFrame('bad');await tick();s.fire(10000);await tick();assert.equal(s.sockets.length,2);s.live.stop();
 const denied=setup(async()=>{throw Object.assign(new Error('登录'),{status:401});});denied.live.resume();await tick();assert.deepEqual(denied.received.at(-1),[]);assert.equal(denied.jobs.size,0);assert.equal(denied.errors.at(-1).status,401);
});
test('HTTP distinguishes plain-text Hub errors, proxy HTML, malformed success and abort',async()=>{
 const previous=globalThis.fetch;
 try{
 globalThis.fetch=async()=>new Response('<html>proxy</html>',{status:502,headers:{'content-type':'text/html'}});await assert.rejects(api('/nodes'),e=>e.status===502&&!e.message.includes('<html>'));
 globalThis.fetch=async()=>new Response('需要登录',{status:401,headers:{'content-type':'text/plain'}});await assert.rejects(api('/nodes'),{status:401,message:'需要登录'});
 globalThis.fetch=async()=>new Response('<html>challenge</html>');await assert.rejects(api('/nodes'),/JSON|状态数据/);
 const ctrl=new AbortController();ctrl.abort();globalThis.fetch=async(_,o)=>{o.signal.throwIfAborted();};await assert.rejects(api('/nodes',{signal:ctrl.signal}));
 }finally{globalThis.fetch=previous;}
});
