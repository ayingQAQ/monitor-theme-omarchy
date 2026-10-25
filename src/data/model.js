/** Public Monitor view model. Never copy arbitrary server keys to the UI. */
export const finite = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const string = (v) => typeof v === 'string' ? v : '';
export function normalizeNodes(input) {
  if (!Array.isArray(input)) throw new Error('Invalid node list / 节点数据格式异常');
  return input.filter(n => n && (Number.isSafeInteger(n.id) && n.id > 0 || typeof n.id === 'string' && /^\d+$/.test(n.id))).map(n => {
    const m = n.metrics;
    const valid = m && ['cpu','uptime','mem_total','mem_used','disk_total','disk_used','net_rx','net_tx'].every(k=>finite(m[k]));
    const sanitized=m&&typeof m==='object'?Object.fromEntries(['cpu','uptime','mem_total','mem_used','disk_total','disk_used','swap_total','swap_used','net_rx','net_tx','tcp','udp','procs'].map(k=>[k,finite(m[k])?m[k]:null])):null;
    if(sanitized)sanitized.load=Array.isArray(m.load)&&m.load.length===3&&m.load.every(finite)?[...m.load]:null;
    const out = {id:String(n.id),online:n.online===true,metrics:sanitized,state:n.online!==true?'offline':m===null?'waiting':valid?'online':'invalid'};
    for (const key of ['name','group','country','os','kernel','arch','virt','cpu_name','agent_version','currency','billing_cycle','public_remark','traffic_mode','month_start']) out[key]=string(n[key]);
    for (const key of ['cpu_cores','mem_total','disk_total','swap_total','price','traffic_limit','total_rx','total_tx','month_rx','month_tx','day_rx','day_tx','last_seen']) out[key]=finite(n[key])?n[key]:null;
    for(const key of ['month_used','expires_in','last_seen_ago','expires_at']) if(Object.hasOwn(n,key)) out[key]=n[key];
    out.name ||= `node-${out.id}`;
    return out;
  });
}
export const groupsOf = nodes => [...new Set(nodes.map(n=>n.group).filter(Boolean))];
export function summaryOf(nodes) {
  const live=nodes.filter(n=>n.online&&n.metrics);
  const sum=key=>{const values=live.map(n=>n.metrics[key]).filter(finite);return values.length?values.reduce((s,v)=>s+v,0):null;};
  const count=live.filter(n=>finite(n.metrics.cpu)).length;
  return {online:nodes.filter(n=>n.online).length,total:nodes.length,rx:sum('net_rx'),tx:sum('net_tx'),cpu:count?sum('cpu')/count:null,samples:count};
}
export function ranges(days) {
  const total=(finite(days)&&days>=1?Math.min(365,days):7)*24;
  return [...[1,6,24,168,720,2160].filter(h=>h*1.25<=total),total];
}
export function expiry(n) {
  if(Object.hasOwn(n,'expires_in')) return n.expires_in===null?null:typeof n.expires_in==='number'&&Number.isFinite(n.expires_in)?n.expires_in:null;
  const time=typeof n.expires_at==='string'?new Date(`${n.expires_at}T00:00:00`).getTime():NaN;
  return Number.isFinite(time)?Math.ceil((time-Date.now())/86400000):null;
}
export function trafficUsed(n) {
  if(finite(n.month_used))return n.month_used;
  if(!finite(n.month_rx)||!finite(n.month_tx))return null;
  return ({sum:()=>n.month_rx+n.month_tx,max:()=>Math.max(n.month_rx,n.month_tx),up:()=>n.month_tx,down:()=>n.month_rx})[n.traffic_mode]?.()??null;
}
export function pingModel(data) {
  const by=new Map();
  for(const p of Array.isArray(data.ping)?data.ping:[]) {
    if(!p||!finite(p.ts)||!Number.isSafeInteger(p.task_id))continue;
    if(!by.has(p.task_id))by.set(p.task_id,[]);
    by.get(p.task_id).push({...p,latency:finite(p.latency)?p.latency:null});
  }
  return [...by].map(([id,points])=>{
    points.sort((a,b)=>a.ts-b.ts);
    const good=points.filter(p=>p.latency!==null),bands=good.map(p=>p.band);
    const complete=good.length&&bands.every(b=>Array.isArray(b)&&b.length===2&&b.every(finite));
    return {id,name:string(data.probes?.[id])||`probe ${id}`,points,last:points.at(-1).latency,min:complete?Math.min(...bands.map(b=>b[0])):null,max:complete?Math.max(...bands.map(b=>b[1])):null,loss:data.loss&&typeof data.loss==='object'?(finite(data.loss[id])?data.loss[id]:0):null};
  });
}
/** Rebin aggregate data without interpolating across missing intervals. */
export function series(points,key,start,end,count) {
  const sums=Array(count).fill(0),weights=Array(count).fill(0);
  for(const p of points) {
    if(!p||!finite(p.ts)||p.ts<start||p.ts>end||!finite(p[key]))continue;
    const i=Math.min(count-1,Math.floor((p.ts-start)/(end-start)*count));
    const weight=finite(p.minutes)&&p.minutes>0?p.minutes:1;
    sums[i]+=p[key]*weight;weights[i]+=weight;
  }
  return sums.map((s,i)=>weights[i]?s/weights[i]:null);
}
