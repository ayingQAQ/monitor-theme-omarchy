export function resolveConfig(fields,saved) {
  const values=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
  return Object.fromEntries(fields.filter(f=>f.type!=='title'&&f.key).map(f=>{
    const v=values[f.key];
    const valid=f.type==='boolean'?typeof v==='boolean':f.type==='number'?typeof v==='number'&&Number.isFinite(v)&&v>=(f.min??-Infinity)&&v<=(f.max??Infinity):f.type==='select'?f.options?.some(o=>o.value===v):typeof v==='string';
    return [f.key,valid?v:f.default];
  }));
}
const memory=new Map();
export const preference={get(key){if(memory.has(key))return memory.get(key);try{return localStorage.getItem(`monitor-omarchy:${key}`);}catch{return null;}},set(key,value){memory.set(key,value);try{value?localStorage.setItem(`monitor-omarchy:${key}`,value):localStorage.removeItem(`monitor-omarchy:${key}`);}catch{/* Session preferences remain available. */}}};
