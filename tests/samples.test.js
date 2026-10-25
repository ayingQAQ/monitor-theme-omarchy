import {test} from 'node:test';import assert from 'node:assert/strict';
import {sampleHistory} from '../src/data/samples.js';
test('CPU and network samples have independent buffers and resume clears stale continuity',()=>{
 const history={};const nodes=[{id:'1',online:true,metrics:{cpu:20,net_tx:4,net_rx:8}}];
 sampleHistory(history,nodes,true);assert.deepEqual(history['1'],{cpu:[20],up:[4],down:[8]});sampleHistory(history,nodes,false);assert.equal(history['1'].cpu.length,2);
 sampleHistory(history,nodes,true);assert.equal(history['1'].cpu.length,1);sampleHistory(history,[],false);assert.deepEqual(history,{});
});
