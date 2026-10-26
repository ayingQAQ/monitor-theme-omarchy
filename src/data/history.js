import {api} from './http.js';

/** Session-only LRU. Budgets cover retained series points and estimated serialized bytes, not total JS heap. */
export function createHistoryCache({request=api,now=Date.now,timers=globalThis,ttl=25000,maxEntries=12,maxPoints=20000,maxBytes=4*1024*1024}={}){
 const cache=new Map();let pointCount=0,byteCount=0,expiryTimer=null,epoch=0,allowedIds=null;
 function remove(key){const entry=cache.get(key);if(!entry)return;pointCount-=entry.points;byteCount-=entry.bytes;cache.delete(key);}
 function expire(){const time=now();for(const [key,entry]of cache)if(entry.expires<=time)remove(key);}
 function armExpiry(){
  if(expiryTimer!==null)timers.clearTimeout(expiryTimer);expiryTimer=null;
  if(!cache.size)return;
  const delay=Math.max(0,Math.min(...[...cache.values()].map(entry=>entry.expires))-now());
  expiryTimer=timers.setTimeout(()=>{expiryTimer=null;expire();armExpiry();},delay);
  expiryTimer?.unref?.();
 }
 function clearHistory(){epoch++;cache.clear();pointCount=byteCount=0;armExpiry();}
 function retainHistory(ids){
  const next=new Set([...ids].map(String));
  if(allowedIds===null||[...allowedIds].some(id=>!next.has(id)))epoch++;
  allowedIds=next;
  for(const [key,entry]of cache)if(!next.has(entry.id))remove(key);
  armExpiry();
 }
 async function history(id,hours,kind,points,signal,force=false){
  signal?.throwIfAborted();
  id=String(id);points=Number.isFinite(points)?Math.max(60,Math.min(1440,Math.floor(points))):60;
  const key=JSON.stringify([id,hours,kind,points]);expire();
  const prior=cache.get(key);
  if(!force&&prior){cache.delete(key);cache.set(key,prior);armExpiry();return prior.value;}
  armExpiry();const generation=epoch;
  const value=await request(`/nodes/${encodeURIComponent(id)}/metrics?hours=${hours}&points=${points}&series=${kind}`,{signal});
  if(!value||typeof value!=='object'||!Array.isArray(value[kind]))throw new Error('Invalid history / 历史数据格式异常');
  signal?.throwIfAborted();
  if(generation!==epoch||allowedIds&&!allowedIds.has(id))return value;
  expire();remove(key);
  const count=(Array.isArray(value.metrics)?value.metrics.length:0)+(Array.isArray(value.ping)?value.ping.length:0);
  if(count<=maxPoints&&maxEntries>0){
   const bytes=JSON.stringify(value).length*2;
   if(bytes<=maxBytes){
    cache.set(key,{id,value,points:count,bytes,expires:now()+ttl});pointCount+=count;byteCount+=bytes;
    while(cache.size>maxEntries||pointCount>maxPoints||byteCount>maxBytes)remove(cache.keys().next().value);
   }
  }
  armExpiry();return value;
 }
 return {history,clearHistory,retainHistory};
}
export const {history,clearHistory,retainHistory}=createHistoryCache();
