/** Bounded session-only samples, independent per metric; never used for billing. */
export function sampleHistory(history,nodes,gap=false){
 const ids=new Set(nodes.map(n=>String(n.id)));
 for(const id of Object.keys(history))if(!ids.has(id))delete history[id];
 for(const n of nodes){
  const h=history[n.id]=gap||!history[n.id]?{cpu:[],up:[],down:[]}:history[n.id];
  for(const [key,value]of [['cpu',n.metrics?.cpu],['up',n.metrics?.net_tx],['down',n.metrics?.net_rx]]){h[key].push(n.online?value??null:null);if(h[key].length>120)h[key].shift();}
 }
}
