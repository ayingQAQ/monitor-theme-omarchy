import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNodes, ranges, pingModel, groupsOf, summaryOf, expiry, trafficUsed } from '../src/data/model.js';
import { resolveConfig } from '../src/config/settings.js';
const metrics = {cpu:28,uptime:100,mem_total:100,mem_used:30,disk_total:200,disk_used:80,net_rx:100,net_tx:20,load:[0,0,0],tcp:2,udp:1};
test('Monitor numeric IDs and connection states stay distinct and private fields do not leak',()=>{
 const nodes=normalizeNodes([{id:1,name:'<img src=x>',online:true,metrics,ip:'secret',remark:'private'}, {id:2,online:true,metrics:null}, {id:3,online:false,metrics:null}, {id:4,online:true,metrics:{...metrics,cpu:'bad'}}]);
 assert.deepEqual(nodes.map(n=>n.state),['online','waiting','offline','invalid']); assert.equal(nodes[0].id,'1'); assert.equal(nodes[0].ip,undefined);assert.equal(nodes[0].remark,undefined);assert.equal(nodes[0].name,'<img src=x>');
 assert.deepEqual(normalizeNodes([null,{}]),[]);assert.throws(()=>normalizeNodes({nodes:[]}));
});
test('groups preserve server order and summaries count waiting separately from valid samples',()=>{
 const ns=normalizeNodes([{id:1,group:'all',online:true,metrics},{id:2,group:'',online:true,metrics:null},{id:3,group:'*',online:false,metrics:null}]);
 assert.deepEqual(groupsOf(ns),['all','*']);assert.deepEqual(summaryOf(ns),{online:2,total:3,rx:100,tx:20,cpu:28,samples:1});
});
test('a bad CPU sample leaves valid network and capacity measurements available',()=>{
 const [n]=normalizeNodes([{id:1,online:true,metrics:{...metrics,cpu:'bad'}}]);assert.equal(n.state,'invalid');assert.equal(n.metrics.cpu,null);assert.equal(n.metrics.net_rx,100);assert.equal(summaryOf([n]).rx,100);assert.equal(summaryOf([n]).cpu,null);
});
test('history ranges are bounded by retention and include non-round limit',()=>{assert.deepEqual(ranges(7),[1,6,24,168]);assert.equal(ranges(31).at(-1),744);assert.ok(!ranges(31).includes(720));assert.equal(ranges(undefined).at(-1),168);});
test('expiry null differs from missing; quota uses Hub result and known old modes only',()=>{
 assert.equal(expiry({expires_in:null,expires_at:'2000-01-01'}),null);assert.equal(expiry({expires_in:0}),0);
 assert.equal(trafficUsed({month_used:0,month_rx:10,month_tx:20}),0);assert.equal(trafficUsed({traffic_mode:'sum',month_rx:10,month_tx:20}),30);assert.equal(trafficUsed({traffic_mode:'up',month_rx:10,month_tx:20}),20);assert.equal(trafficUsed({traffic_mode:'down',month_rx:10,month_tx:20}),10);assert.equal(trafficUsed({traffic_mode:'unknown',month_rx:10,month_tx:20}),null);
});
test('ping uses aggregate bands and Hub window loss without inventing quantiles or averaging loss',()=>{
 const tasks=pingModel({probes:{2:'Tokyo'},loss:{2:25},ping:[{task_id:2,ts:1,latency:30,band:[20,40],loss:50},{task_id:2,ts:2,latency:null,loss:100}]});
 assert.equal(tasks[0].loss,25);assert.equal(tasks[0].last,null);assert.equal(tasks[0].min,20);assert.equal(tasks[0].max,40);assert.equal(tasks[0].p95,undefined);
 assert.equal(pingModel({ping:[{task_id:1,ts:1,latency:20}],probes:{},loss:{}})[0].min,null);
 assert.equal(pingModel({ping:[{task_id:1,ts:1,latency:20}],probes:{}})[0].loss,null);
});
test('saved config validates each declaration including false values and wrong response shapes',()=>{
 const fields=[{key:'a',type:'boolean',default:true},{key:'b',type:'select',default:'en',options:[{value:'en'}]},{type:'title',label:'title'}];
 assert.deepEqual(resolveConfig(fields,{a:false,b:'bad'}),{a:false,b:'en'});assert.deepEqual(resolveConfig(fields,[]),{a:true,b:'en'});
});
