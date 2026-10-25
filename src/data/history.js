import {api} from './http.js';
const cache=new Map();
export function clearHistory(){cache.clear();}
export async function history(id,hours,kind,points,signal,force=false){
 const key=`${id}|${hours}|${kind}|${points}`,prior=cache.get(key);
 if(!force&&prior&&Date.now()-prior.time<25000)return prior.value;
 const value=await api(`/nodes/${encodeURIComponent(id)}/metrics?hours=${hours}&points=${Math.max(60,Math.min(1440,points))}&series=${kind}`,{signal});
 if(!value||typeof value!=='object'||!Array.isArray(value[kind]))throw new Error('Invalid history / 历史数据格式异常');
 signal?.throwIfAborted();cache.set(key,{time:Date.now(),value});while(cache.size>12)cache.delete(cache.keys().next().value);return value;
}
