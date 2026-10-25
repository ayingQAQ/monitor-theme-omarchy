import {WebSocketServer} from 'ws';
import {gzipSync} from 'node:zlib';
const GB=1024**3;
function metrics(i){return {uptime:3200000,cpu:28+i*13,load:[.3,.1,.2],mem_total:4*GB,mem_used:(1+i*.3)*GB,swap_total:0,swap_used:0,disk_total:80*GB,disk_used:20*GB,net_rx:(i+1)*600000,net_tx:(i+1)*90000,tcp:32,udp:8,procs:124};}
export function nodes(){return ['tokyo-1','hk-edge','home-nas','old-box','等待首次上报','frankfurt-lab · 中文长名称'].map((name,i)=>({id:i+1,name,sort:i,public:true,online:i!==3,metrics:i===3||i===4?null:metrics(i),group:i<2?'prod':i<4?'home':'',country:['JP','HK','CN','US','SG','DE'][i],os:['Debian 12','Ubuntu 24.04','Arch Linux','CentOS 7','Debian 12','Ubuntu'][i],kernel:'6.8.0',arch:'x86_64',virt:'kvm',cpu_name:'AMD EPYC 7B13',cpu_cores:2,mem_total:4*GB,swap_total:0,disk_total:80*GB,price:i?0:6.5,currency:'USD',billing_cycle:'monthly',expires_at:'2026-12-01',expires_in:i===3?-2:i===2?0:36,last_seen_ago:i===3?850:null,total_rx:100*GB,total_tx:35*GB,month_rx:20*GB,month_tx:5*GB,month_used:25*GB,day_rx:GB,day_tx:GB,traffic_limit:100*GB,traffic_mode:'sum',public_remark:'Demo server · 演示节点'}));}
export function historical(hours=6){const step=Math.max(60,Math.ceil(hours*3600/160/60)*60),end=Math.floor(Date.now()/1000/step)*step;return {step,probes:{1:'Tokyo / 东京',2:'Hong Kong / 香港'},loss:{2:3.5},metrics:Array.from({length:160},(_,i)=>({ts:end-(159-i)*step,minutes:step/60,cpu:28+18*Math.sin(i/12),mem_used:(1.5+.2*Math.sin(i/17))*GB,disk_used:20*GB,net_rx:500000+300000*Math.sin(i/9),net_tx:90000+70000*Math.cos(i/15)})),ping:[1,2].flatMap(id=>Array.from({length:160},(_,i)=>({task_id:id,ts:end-(159-i)*step,latency:id===2&&i%23===0?null:(id===1?30:65)+Math.sin(i/7)*8,band:[id===1?18:50,id===1?45:90],loss:id===2&&i%23===0?100:0}))) };}
export function demoHub(){return {name:'explicit-demo-hub',configureServer(server){
 const sockets=new WebSocketServer({noServer:true}),timers=new Set();
 server.httpServer.on('upgrade',(req,socket,head)=>{if(!req.url.startsWith('/api/ws'))return;sockets.handleUpgrade(req,socket,head,ws=>{const send=()=>{const json=JSON.stringify({nodes:nodes()});ws.send(req.url.includes('gzip')?gzipSync(json):json);};send();const timer=setInterval(send,2000);timers.add(timer);ws.on('close',()=>{clearInterval(timer);timers.delete(timer);});});});
 server.httpServer.on('close',()=>{for(const timer of timers)clearInterval(timer);sockets.close();});
 server.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/api/'))return next();const url=new URL(req.url,'http://localhost');let value;
 if(url.pathname==='/api/me')value={site_name:'OMARCHY DEMO',authed:false,public_page:true,history_days:31,demo:true};
 else if(url.pathname==='/api/nodes')value={nodes:nodes()};
 else if(/^\/api\/themes\/[^/]+\/config$/.test(url.pathname))value={language:'en',intro:'off'};
 else if(/^\/api\/nodes\/\d+\/metrics$/.test(url.pathname)){value=historical(Number(url.searchParams.get('hours'))||6);const kind=url.searchParams.get('series');if(kind==='metrics')value.ping=[];if(kind==='ping')value.metrics=[];}
 else{res.statusCode=404;return res.end('Not found');}res.setHeader('content-type','application/json');res.end(JSON.stringify(value));
 });
 }};}
