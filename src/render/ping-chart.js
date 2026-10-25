import {finite} from '../data/model.js';

/** Actual timestamp positions; missing buckets and long gaps split the line. */
export function lineGeometry(input,{start,end,width,height,step=60}) {
 step=finite(step)&&step>0?step:60;
 const points=(Array.isArray(input)?input:[]).filter(p=>p&&finite(p.ts)&&p.ts>=start&&p.ts<=end).sort((a,b)=>a.ts-b.ts);
 const values=points.map(p=>p.latency).filter(finite),peak=Math.max(1,...values)*1.15;
 const power=10**Math.floor(Math.log10(peak/4)),tick=[1,2,5,10].map(v=>v*power).find(v=>v>=peak/4)||power*10;
 const max=Math.max(tick,Math.ceil(peak/tick)*tick),left=46,right=Math.max(left+1,width-12),top=12,bottom=Math.max(top+1,height-28);
 const x=ts=>left+(ts-start)/Math.max(1,end-start)*(right-left),y=value=>bottom-value/max*(bottom-top);
 const paths=[],dots=[],loss=[];let current='',previous=null;
 const flush=()=>{if(current)paths.push(current);current='';previous=null;};
 for(const p of points){
  if(finite(p.loss)&&p.loss>0)loss.push({x:x(p.ts),value:p.loss,ts:p.ts});
  if(!finite(p.latency)){flush();continue;}
  if(previous!==null&&p.ts-previous>Math.max(1,step)*1.5)flush();
  const px=x(p.ts),py=y(p.latency);current+=`${current?'L':'M'}${px.toFixed(2)},${py.toFixed(2)} `;previous=p.ts;dots.push({x:px,y:py,value:p.latency,ts:p.ts,loss:finite(p.loss)?p.loss:0});
 }
 flush();return {paths,points:dots,loss,max,tick,left,right,top,bottom,width,height};
}

const NS='http://www.w3.org/2000/svg';
function element(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;}
const clockFormat=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hour12:false});
const dayFormat=new Intl.DateTimeFormat(undefined,{month:'2-digit',day:'2-digit'});
const dateTimeFormat=new Intl.DateTimeFormat(undefined,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const time=ts=>clockFormat.format(new Date(ts*1000));
const latency=v=>v>=1000?`${Number((v/1000).toPrecision(2))} s`:`${v<10?Number(v.toFixed(1)):Math.round(v)} ms`;

export function drawPingChart(host,task,{start,end,step=60,language='en'}={}) {
 const width=Math.max(180,host.clientWidth),height=host.classList.contains('big')?240:160;
 const g=lineGeometry(task.points,{start,end,width,height,step});
 const svg=element('svg',{viewBox:`0 0 ${width} ${height}`,width:'100%',height,role:'img','aria-label':`${task.name} · ${language==='zh'?'延迟折线图，时间桶中位数':'latency line, bucket medians'}`});
 svg.append(element('title',{},`${task.name} · ${language==='zh'?'延迟折线；缺失数据不连线；× 表示丢包':'Latency line; gaps are not connected; × marks packet loss'}`));
 for(let value=0;value<=g.max+g.tick/100;value+=g.tick){const y=g.bottom-value/g.max*(g.bottom-g.top);svg.append(element('line',{x1:g.left,y1:y,x2:g.right,y2:y,class:'ping-grid'}),element('text',{x:g.left-7,y:y+4,'text-anchor':'end',class:'ping-axis'},latency(value)));}
 const ticks=width<440?2:4;
 for(let i=0;i<=ticks;i++){const ts=start+(end-start)*i/ticks,x=g.left+(g.right-g.left)*i/ticks,label=end-start>86400?(width<440?dayFormat:dateTimeFormat).format(new Date(ts*1000)):time(ts);svg.append(element('text',{x,y:height-8,'text-anchor':i===ticks?'end':i===0?'start':'middle',class:'ping-axis'},label));}
 for(const d of g.paths)svg.append(element('path',{d,class:'ping-line',fill:'none','stroke-width':1.7,'vector-effect':'non-scaling-stroke'}));
 for(const p of g.points){const dot=element('circle',{cx:p.x,cy:p.y,r:1.8,class:'ping-dot'});dot.append(element('title',{},`${time(p.ts)} · ${p.value.toFixed(1)} ms${p.loss?` · ${language==='zh'?'丢包':'loss'} ${p.loss}%`:''}`));svg.append(dot);}
 for(const p of g.loss){const mark=element('path',{d:`M${p.x-3},${g.bottom-3}l6,6m-6,0l6,-6`,class:'ping-loss',fill:'none','stroke-width':1.3});mark.append(element('title',{},`${time(p.ts)} · ${language==='zh'?'丢包':'loss'} ${p.value}%`));svg.append(mark);}
 if(!g.points.length)svg.append(element('text',{x:(g.left+g.right)/2,y:(g.top+g.bottom)/2,'text-anchor':'middle',class:'ping-axis'},language==='zh'?'无有效延迟数据':'No latency samples'));
 host.replaceChildren(svg);
}
