import {box,bytes,uptime,ms,graph,meter,clip,txt,padR} from '../render/util.js';
import {mount} from '../render/dom.js';
import {drawPingChart} from '../render/ping-chart.js';
import {ranges,pingModel,series,expiry,trafficUsed,finite} from '../data/model.js';
import {history,clearHistory} from '../data/history.js';
import {getLang,t} from '../i18n/index.js';

const $=id=>document.getElementById(id),word=(en,zh)=>getLang()==='zh'?zh:en;
const val=v=>v==null?'—':String(v);
function money(n){if(n.price===null)return '—';if(n.price===0)return word('free','免费');try{return new Intl.NumberFormat('zh-CN',{style:'currency',currency:n.currency||'CNY',maximumFractionDigits:2}).format(n.price);}catch{return `${n.currency} ${n.price}`;}}
function cycle(v){const named={monthly:1,quarterly:3,semiannual:6,yearly:12,biennial:24,triennial:36};const months=named[v]??Number(/^(\d+)m$/.exec(v)?.[1]);return v==='once'?word('once','一次性'):months?`${months}${word('mo','个月')}`:v;}
function offline(n){if(n.online)return n.state==='waiting'?word('waiting for first report','等待首次上报'):word('metrics unavailable','指标不可用');const ago=Object.hasOwn(n,'last_seen_ago')?n.last_seen_ago:n.last_seen?Math.max(0,Date.now()/1000-n.last_seen):null;return `${t('offline')}${finite(ago)?' '+uptime(ago):' · '+word('never reported','从未上报')}`;}

export function createDetail(app){
 let id=null,tab='overview',rangeIndex=0,selected=0,zoom=null,width=90,epoch=0,controller=null,timer=null,pendingG=0;
 let slots={metrics:null,ping:null},loading=false,failure=null;
 const node=()=>app.nodes().find(n=>n.id===id),hours=()=>ranges(app.settings().history_days)[Math.min(rangeIndex,ranges(app.settings().history_days).length-1)];
 const rangeLabel=()=>hours()<24?`${hours()}h`:`${hours()/24}d`;
 function stop(){epoch++;controller?.abort();controller=null;clearInterval(timer);timer=null;}
 async function ensure(force=false){
   if(!id||document.hidden)return;
   const generation=++epoch;controller?.abort();const c=new AbortController();controller=c;loading=true;failure=null;render();
   const kinds=tab==='ping'?['ping']:['metrics','ping'];
   await Promise.all(kinds.map(async kind=>{
    try{const data=await history(id,hours(),kind,Math.max(60,(width-6)*2),c.signal,force);if(generation===epoch)slots[kind]=data;}
    catch(e){if(generation===epoch&&!c.signal.aborted){failure=e.message;if(e.status===401)dispatchEvent(new CustomEvent('monitor-denied',{detail:e}));}}
   }));
   if(generation===epoch){loading=false;controller=null;render();app.status();}
 }
 function configBox(I,n){
  const b=box(I),L=[b.top(t('sec.config'))],days=expiry(n),m=n.metrics;
  const exp=days===null?word('not set','未设置'):days===0?word('expires today','今天到期'):days<0?word(`expired ${-days}d`,`已过期 ${-days} 天`):word(`${days}d left`,`${days} 天后到期`);
  const usage=trafficUsed(n);
  const rows=[['os',n.os],['arch',n.arch],['virt',n.virt],['kernel',n.kernel],['cpu',`${n.cpu_name} ${n.cpu_cores?`×${n.cpu_cores}`:''}`],['memory',bytes(m?.mem_total??n.mem_total)],['swap',bytes(m?.swap_total??n.swap_total)],['disk',bytes(m?.disk_total??n.disk_total)],['region',n.country],['group',n.group],['price',`${money(n)} ${cycle(n.billing_cycle)}`],['expires',`${n.expires_at||''} ${exp}`],['traffic',n.traffic_limit===0?'∞':n.traffic_limit===null?'—':`${usage===null?'—':bytes(usage)} / ${bytes(n.traffic_limit)}`],['note',n.public_remark]];
  for(const [key,v]of rows)if(v)L.push(b.row([['d',' '+padR(clip(t(`k.${key}`),10),11)],['',clip(String(v),I-13)]]));
  L.push(b.bottom());return L.join('');
 }
 function resources(I,n){
  const b=box(I),L=[b.top(t('sec.res'),` ${rangeLabel()} `)],m=n.online?n.metrics:null,gw=I-2;
  const right=Math.max(9,Math.min(26,Math.floor(I*.32))),bar=Math.max(2,I-right-7);
  const resource=(name,ratio,text,points)=>{L.push(b.row([['d',` ${name.padEnd(4)} `],...meter(ratio??0,bar),['w',' '+clip(text,right)]]));if(points?.some(v=>v!==null)){const mx=Math.max(1,...points.filter(v=>v!==null));for(const g of graph(points,gw,2,name==='cpu'?100:mx))L.push(b.row([['',' '],['a',g]]));}};
  const data=slots.metrics,points=Array.isArray(data?.metrics)?data.metrics:[],end=Date.now()/1000,start=end-hours()*3600;
  const hist=key=>series(points,key,start,end,gw*2);
  resource('cpu',finite(m?.cpu)?m.cpu/100:null,finite(m?.cpu)?`${m.cpu.toFixed(1)}%`:'—',hist('cpu'));
  // Memory history is bytes: Monitor does not expose historical capacity.
  resource('mem',m&&m.mem_total>0?m.mem_used/m.mem_total:null,m?`${bytes(m.mem_used)}/${bytes(m.mem_total)}`:'—',hist('mem_used'));
  L.push(b.row([['d',` ${word('mem history: bytes','内存历史：字节')}`]]));
  resource('dsk',m&&m.disk_total>0?m.disk_used/m.disk_total:null,m?`${bytes(m.disk_used)}/${bytes(m.disk_total)}`:'—',null);
  for(const [key,arrow,cls,total]of [['net_tx','↑','u',n.total_tx],['net_rx','↓','n',n.total_rx]]){
   L.push(b.row([[cls,` ${arrow} `],['w',m?`${bytes(m[key])}/s`:'—'],['d',` ${t('total')} ${total===null?'—':bytes(total)}`]]));
   const a=hist(key);if(a.some(v=>v!==null))for(const g of graph(a,gw,2,Math.max(1024,...a.filter(v=>v!==null))))L.push(b.row([['',' '],[cls,g]]));
  }
  if(m){const load=Array.isArray(m.load)&&m.load.every(finite)?m.load.map(v=>v.toFixed(2)).join(' '):'—';L.push(b.row([['d',` load ${load}`]]));L.push(b.row([['d',` tcp ${val(m.tcp)}  udp ${val(m.udp)}  procs ${val(m.procs)}`]]));}
  L.push(b.row([['d',` -${rangeLabel()}${' '.repeat(Math.max(1,I-rangeLabel().length-10))}${t('now')}`]]));
  if(loading)L.push(b.row([['d',' '+t('loading')]]));else if(!points.length)L.push(b.row([['d',' '+t('noHist')]]));
  if(failure)L.push(b.row([['r',' '+clip(failure,I-2)]]));
  L.push(b.bottom());return L.join('');
 }
 const tasks=()=>pingModel(slots.ping||{});
 function taskBlock(I,task,big){
  const b=box(I),L=[b.top(` ${task.name} `)];
  const stats=[[word('last bucket','最近时间桶'),ms(task.last)],[word('min','最低'),ms(task.min)],[word('max','最高'),ms(task.max)],[word('loss','丢包'),task.loss===null?'—':`${task.loss.toFixed(1)}%`]];
  L.push(`<div class="ping-stats">${stats.map(([label,value])=>`<span><span class="d">${txt(label)} </span><span class="w">${txt(value)}</span></span>`).join('')}</div>`);
  L.push(`<div class="ping-chart${big?' big':''}" data-ping="${task.id}"></div>`);
  L.push(b.row([['d',` -${rangeLabel()} · ${word('bucket median · × loss','时间桶中位数 · × 丢包')}`]]));
  L.push(b.bottom());return `<div class="blk${task.id===(zoom??tasks()[selected]?.id)?' cur':''}" data-task="${task.id}" tabindex="0" role="button" aria-label="${task.id}">${L.join('')}</div>`;
 }
 function render(){
  if(!id)return;const n=node();if(!n)return;const I=width-2,rs=ranges(app.settings().history_days);
  let controls=`<div class="detail-controls"><button class="tab" data-tab="overview">${txt(t('tab.overview'))}</button><button class="tab" data-tab="ping">${txt(t('tab.ping'))}</button><span class="spacer"></span>`;
  controls+=rs.map((h,i)=>`<button class="tab${i===rangeIndex?' on':''}" data-range="${i}">${h<24?h+'h':h/24+'d'}</button>`).join('')+'</div>';
  const title=`<div class="dhead"><span class="${n.online?'g':'r'}">●</span> ${txt(n.state==='online'?t('up',{t:uptime(n.metrics.uptime)}):offline(n))}</div>`;
  const ts=tasks();selected=Math.max(0,Math.min(selected,ts.length-1));if(zoom!==null&&!ts.some(x=>x.id===zoom))zoom=null;
  const ping=ts.length?(zoom!==null?ts.filter(x=>x.id===zoom):ts).map(x=>taskBlock(I,x,zoom!==null)).join(''):`<div class="empty">${txt(loading?t('loading'):failure||t('noTasks'))}</div>`;
  mount($('detail-body'),title+controls+(tab==='ping'?ping:configBox(I,n)+resources(I,n)+`<div class="rule">${txt(t('sec.ping'))}</div>`+ping));
  const end=Date.now()/1000,start=end-hours()*3600;
  for(const host of $('detail-body').querySelectorAll('[data-ping]')){const task=ts.find(x=>x.id===Number(host.dataset.ping));if(task)drawPingChart(host,task,{start,end,step:slots.ping?.step||60,language:getLang()});}
 }
 function layout(){width=Math.max(20,Math.min(110,Math.floor((innerWidth-24)/app.cw())));$('detail').style.setProperty('--dw',width);render();}
 function show(next){if(id===next){render();return;}stop();id=next;tab='overview';zoom=null;selected=0;slots={metrics:null,ping:null};$('detail').hidden=false;layout();ensure();timer=setInterval(()=>ensure(),30000);scrollTo(0,0);}
 function hide(){stop();id=null;$('detail').hidden=true;}
 function setTab(next){if(next===tab)return;tab=next;zoom=null;ensure();app.status();}
 function setRange(i){rangeIndex=Math.max(0,Math.min(ranges(app.settings().history_days).length-1,i));zoom=null;slots={metrics:null,ping:null};ensure();app.status();}
 function key(e){const k=e.key;switch(k){
  case 'h':case '[':case 'ArrowLeft':setRange(rangeIndex-1);break;
  case 'l':case ']':case 'ArrowRight':setRange(rangeIndex+1);break;
  case 'o':setTab('overview');break;case 'p':setTab('ping');break;
  // Tab remains ordinary focus navigation; tab buttons support Enter/Space.
  case 'j':case 'ArrowDown':if(tab==='ping'){selected=Math.min(tasks().length-1,selected+1);render();document.querySelector('.blk.cur')?.scrollIntoView({block:'nearest'});}else scrollBy(0,120);break;
  case 'k':case 'ArrowUp':if(tab==='ping'){selected=Math.max(0,selected-1);render();}else scrollBy(0,-120);break;
  case 'Enter':if(tab==='ping'&&tasks()[selected]){zoom=tasks()[selected].id;render();}break;
  case 'u':case 'Escape':case 'Backspace':if(zoom!==null){zoom=null;render();}else app.back();break;
  case 'R':ensure(true);break;case 'r':app.replay();break;
  case 'g':if(Date.now()-pendingG<800){selected=0;render();scrollTo(0,0);}pendingG=Date.now();break;
  case 'G':selected=Math.max(0,tasks().length-1);render();scrollTo(0,document.body.scrollHeight);break;
  default:return false;
 }return true;}
 $('detail-body').addEventListener('click',e=>{const b=e.target.closest('[data-tab]'),r=e.target.closest('[data-range]'),task=e.target.closest('[data-task]');if(b)setTab(b.dataset.tab);else if(r)setRange(+r.dataset.range);else if(task){zoom=+task.dataset.task;render();app.status();}});
 $('detail-body').addEventListener('keydown',e=>{if(e.target.closest('[data-task]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();zoom=+e.target.closest('[data-task]').dataset.task;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();}else if(id){ensure();timer=setInterval(()=>ensure(),30000);}});
 return {show,hide,key,render,layout,current:()=>id,clear(){clearHistory();slots={metrics:null,ping:null};hide();},active:()=>id!==null,info:()=>({mode:tab==='ping'?(zoom!==null?'ZOOM':'PING'):'DETAIL',name:node()?.name||'',pos:rangeLabel()})};
}
