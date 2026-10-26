/** Parse only escaped renderer output in an inert document, then import a restricted DOM. */
export function mount(element,html) {
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
  // Keep unchanged terminal rows mounted while live metrics replace changed rows.
  if(previous.length===next.length){
    next.forEach((node,i)=>{if(!previous[i].isEqualNode(node))previous[i].replaceWith(document.importNode(node,true));});
  }else element.replaceChildren(...next.map(n=>document.importNode(n,true)));
  element._markup=html;
  if(identity&&!element.contains(document.activeElement)){const [key,value]=identity;[...element.querySelectorAll(`[${key}]`)].find(el=>el.getAttribute(key)===value)?.focus({preventScroll:true});}
}
