export class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
export async function api(path,{signal}={}) {
  for(let attempt=0;;attempt++) {
    const timeout=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
    try {
      const res=await fetch(`/api${path}`,{credentials:'same-origin',signal:combined});
      if(!res.ok) {
        const message=res.headers.get('content-type')?.startsWith('text/plain')?(await res.text()).trim():'';
        throw new ApiError(res.status,message||`HTTP ${res.status} · Service unavailable / 服务暂时无法访问`);
      }
      try{return await res.json();}catch(e){if(e instanceof SyntaxError)throw new ApiError(res.status,'Invalid JSON / 收到的不是状态数据');throw e;}
    }catch(e){
      if(signal?.aborted)throw e;
      if(e instanceof ApiError)throw e;
      if((e?.name==='TimeoutError'||e?.name==='AbortError')&&attempt<2)continue;
      throw new ApiError(0,'Network unavailable / 网络连接失败');
    }
  }
}
