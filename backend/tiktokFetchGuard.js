const fs = require('node:fs');
const path = require('node:path');
const CACHE_FILE = path.join(__dirname, 'data', 'ttwid-cache.json');

let cachedTtwid='';
let cachedAt=0;
const DEFAULT_TTL_MS=30*60*1000;

function loadDiskCache(now = Date.now, ttlMs = DEFAULT_TTL_MS) {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (data?.ttwid && Number.isFinite(data?.at) && (now() - data.at) <= ttlMs) {
        cachedTtwid = data.ttwid;
        cachedAt = data.at;
      }
    }
  } catch (_) {}
}

function saveDiskCache(ttwid, at) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ ttwid, at }), 'utf8');
  } catch (_) {}
}

function parseTtwid(headers){
  try{
    const values=headers?.getSetCookie?.()||[];
    for(const value of values){const m=String(value).match(/(?:^|;\s*)ttwid=([^;]+)/);if(m?.[1])return m[1];}
    const raw=headers?.get?.('set-cookie')||'';
    return String(raw).match(/(?:^|[,;]\s*)ttwid=([^;]+)/)?.[1] || '';
  }catch(_){return '';}
}
function isTikTokRoot(input){
  try{const u=new URL(typeof input==='string'?input:input?.url||String(input));return u.protocol==='https:'&&u.hostname==='www.tiktok.com'&&(u.pathname==='/'||u.pathname==='');}catch(_){return false;}
}
function createGuardedFetch(baseFetch,now=()=>Date.now(),ttlMs=DEFAULT_TTL_MS,onFallback=()=>{}){
  return async function guardedFetch(input,init){
    const response=await baseFetch(input,init);
    if(!isTikTokRoot(input))return response;
    const fresh=parseTtwid(response.headers);
    if(fresh){
      cachedTtwid=fresh;
      cachedAt=now();
      saveDiskCache(cachedTtwid, cachedAt);
      return response;
    }
    if(!cachedTtwid || now()-cachedAt>ttlMs) {
      loadDiskCache(now, ttlMs);
    }
    if(!cachedTtwid || now()-cachedAt>ttlMs)return response;
    onFallback({ageMs:now()-cachedAt});
    const originalHeaders=response.headers;
    const headers=new Proxy(originalHeaders,{
      get(target,prop){
        if(prop==='getSetCookie')return ()=>['ttwid='+cachedTtwid+'; Path=/; Secure; HttpOnly'];
        if(prop==='get')return name=>String(name).toLowerCase()==='set-cookie'?'ttwid='+cachedTtwid+'; Path=/; Secure; HttpOnly':target.get(name);
        const value=target[prop];return typeof value==='function'?value.bind(target):value;
      }
    });
    return new Proxy(response,{get(target,prop){if(prop==='headers')return headers;const value=target[prop];return typeof value==='function'?value.bind(target):value;}});
  };
}
function installTtwidFetchGuard({ttlMs=DEFAULT_TTL_MS,onFallback=()=>{}}={}){
  loadDiskCache(() => Date.now(), ttlMs);
  if(globalThis.fetch?.__pipaTtwidGuard)return;
  const base=globalThis.fetch.bind(globalThis);
  const guarded=createGuardedFetch(base,()=>Date.now(),ttlMs,onFallback);
  Object.defineProperty(guarded,'__pipaTtwidGuard',{value:true});
  globalThis.fetch=guarded;
}
function invalidateTtwidCache(){
  cachedTtwid='';
  cachedAt=0;
  try { if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE); } catch (_) {}
}
function ttwidCacheState(){return {hasCached:Boolean(cachedTtwid),cachedAt};}
module.exports={parseTtwid,isTikTokRoot,createGuardedFetch,installTtwidFetchGuard,invalidateTtwidCache,ttwidCacheState,DEFAULT_TTL_MS};
