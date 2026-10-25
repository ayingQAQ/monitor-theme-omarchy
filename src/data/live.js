import { normalizeNodes } from './model.js';
/** One owner for the snapshot stream, polling, cancellation and connection generations. */
export function createLive({receive,error,fetchNodes,Socket=WebSocket,url,timers=globalThis}) {
  let active=false,generation=0,revision=0,socket=null,watch=null,recovery=null,controller=null,healthy=false,interrupted=false;
  const clear=()=>{timers.clearTimeout(watch);timers.clearTimeout(recovery);watch=recovery=null;};
  function pause(){active=false;generation++;clear();controller?.abort();controller=null;if(socket){socket.onmessage=socket.onclose=socket.onerror=null;socket.close();socket=null;}healthy=false;}
  function accept(data,fromStream=false){const nodes=normalizeNodes(data?.nodes);revision++;receive(nodes);if(fromStream)interrupted=false;if(!interrupted)error(null);}
  async function fetchOnce(){
    if(!active||controller)return;
    const g=generation,r=revision,ctrl=new AbortController();controller=ctrl;
    try{const data=await fetchNodes(ctrl.signal);if(active&&g===generation&&r===revision)accept(data);}
    catch(e){if(active&&g===generation&&!ctrl.signal.aborted){if(e.status===401){pause();receive([]);}error(e);}}
    finally{if(controller===ctrl)controller=null;}
  }
  function cover(){
    if(!active||recovery!==null)return;
    recovery=timers.setTimeout(()=>{recovery=null;if(!active||healthy)return;fetchOnce();if(!socket||socket.readyState===3)connect();cover();},5000);
  }
  function connect(){
    if(!active)return;
    const g=generation;
    try{socket=new Socket(url);}catch(e){error(e);cover();return;}
    const opened=socket;
    const current=()=>active&&g===generation&&socket===opened;
    function watchdog(){timers.clearTimeout(watch);watch=timers.setTimeout(()=>{if(!current())return;interrupted=true;error(new Error('Live data interrupted / 实时数据中断，正在重连'));resume();},10000);}
    watchdog();let queue=Promise.resolve();
    opened.onmessage=event=>{queue=queue.then(async()=>{
      const raw=typeof event.data==='string'?event.data:await new Response(event.data.stream().pipeThrough(new DecompressionStream('gzip'))).text();
      if(!current()||opened.readyState!==1)return;
      accept(JSON.parse(raw),true);healthy=true;timers.clearTimeout(recovery);recovery=null;watchdog();
    }).catch(()=>{/* Bad frames never rearm the silence watchdog. */});};
    opened.onerror=()=>{if(current())opened.close();};
    opened.onclose=()=>{if(!current())return;healthy=false;interrupted=true;error(new Error('Live connection interrupted · polling / 实时连接中断，正在轮询'));timers.clearTimeout(watch);watch=null;fetchOnce();cover();};
  }
  function resume(){pause();active=true;fetchOnce();connect();cover();}
  return {resume,pause,stop:pause};
}
