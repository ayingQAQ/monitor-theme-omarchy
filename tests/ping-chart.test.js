import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lineGeometry} from '../src/render/ping-chart.js';
test('ping lines break at missing buckets and long gaps rather than connecting outages',()=>{
 const g=lineGeometry([{ts:0,latency:20},{ts:60,latency:30},{ts:120,latency:null,loss:100},{ts:180,latency:25},{ts:600,latency:40}],{start:0,end:600,width:500,height:160,step:60});
 assert.equal(g.paths.length,3);assert.equal(g.points.length,4);assert.equal(g.loss.length,1);assert.ok(g.paths[0].includes('L'));assert.ok(!g.paths.some(p=>p.includes('NaN')));assert.ok(g.max>=40);
});
test('empty, zero and malformed latency samples have bounded finite geometry',()=>{
 const g=lineGeometry([{ts:0,latency:0},{ts:30,latency:Infinity},{ts:60,latency:'bad'}],{start:0,end:60,width:250,height:160,step:30});
 assert.equal(g.points.length,1);assert.equal(g.points[0].value,0);assert.ok(g.max>0);assert.equal(lineGeometry([],{start:0,end:60,width:250,height:160,step:60}).paths.length,0);
});
