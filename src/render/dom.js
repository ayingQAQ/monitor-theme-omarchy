const templates=new WeakMap();
/** Parse only escaped renderer output in an inert document, then import a restricted DOM. */
export function mount(element,html,{preserveRendered=false}={}) {
  if(element._markup===html)return;
  const focused=element.contains(document.activeElement)?document.activeElement:null;
  const identity=focused&&['data-tab','data-range','data-task','aria-label'].map(key=>[key,focused.getAttribute(key)]).find(([,v])=>v!==null);
  const doc=new DOMParser().parseFromString(`<body>${html}</body>`,'text/html');
  const tags=new Set(['DIV','SPAN','B','BUTTON','SELECT','OPTION']);
  const attrs=new Set(['class','value','selected','type','data-tab','data-range','data-task','data-ping','aria-label','aria-pressed','role','tabindex']);
  for(const el of doc.body.querySelectorAll('*')) {
    if(!tags.has(el.tagName)){el.replaceWith(doc.createTextNode(el.textContent));continue;}
    for(const attr of [...el.attributes])if(!attrs.has(attr.name))el.removeAttribute(attr.name);
  }
  const previous=[...element.childNodes],next=[...doc.body.childNodes];
  const importNode=node=>{const live=document.importNode(node,true);if(preserveRendered)templates.set(live,live.cloneNode(true));return live;};
  // Keep unchanged terminal rows mounted while live metrics replace changed rows.
  // Detail templates intentionally omit the SVG added by the chart renderer.
  if(previous.length===next.length){
    next.forEach((node,i)=>{const source=preserveRendered?templates.get(previous[i])||previous[i]:previous[i];if(!source.isEqualNode(node))previous[i].replaceWith(importNode(node));});
  }else element.replaceChildren(...next.map(importNode));
  element._markup=html;
  if(identity&&!element.contains(document.activeElement)){const [key,value]=identity;[...element.querySelectorAll(`[${key}]`)].find(el=>el.getAttribute(key)===value)?.focus({preventScroll:true});}
}
