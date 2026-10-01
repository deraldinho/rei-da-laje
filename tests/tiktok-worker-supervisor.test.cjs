const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {superviseTikTok}=require('../backend/tiktokWorkerSupervisor');

class FakeClient extends EventEmitter {
 constructor(run){super();this.run=run;this.disconnected=false;}
 async connect(){return this.run(this);}
 async disconnect(){this.disconnected=true;}
}

test('supervisor renova ciclo interno sem derrubar a sessão após reconnect do upstream',async()=>{
 const sent=[];let cycle=0,stop=false;
 const runs=[
  async client=>{client.emit('connected',{roomId:'r1'});client.emit('reconnecting',{attempt:1,maxRetries:2,delayMs:2});},
  async client=>{client.emit('connected',{roomId:'r1'});client.emit('chat',{comment:'voltou'});stop=true;}
 ];
 const ok=await superviseTikTok({
  username:'teste',
  createClient:async()=>new FakeClient(runs[cycle++]),
  send:(event,payload)=>sent.push({event,payload}),
  isStopping:()=>stop,
  setCurrentClient:()=>{},
  sleep:async()=>{}
 });
 assert.equal(ok,true);
 assert.equal(sent.filter(e=>e.event==='connected').length,1);
 assert.equal(sent.filter(e=>e.event==='transport_restored').length,1);
 assert.equal(sent.filter(e=>e.event==='chat').length,1);
 assert.equal(sent.filter(e=>e.event==='disconnected').length,0);
 assert.equal(sent.filter(e=>e.event==='error').length,0);
});

test('live offline antes da primeira sala entra em espera lenta sem derrubar o worker',async()=>{
 const sent=[],sleeps=[];let stop=false;
 const ok=await superviseTikTok({
  username:'offline',
  createClient:async()=>new FakeClient(async()=>{throw Object.assign(new Error('not currently live'),{code:'OFFLINE'});}),
  send:(event,payload)=>sent.push({event,payload}),
  isStopping:()=>stop,
  sleep:async delay=>{sleeps.push(delay);stop=true;},
  random:()=>0.5
 });
 assert.equal(ok,true);
 assert.equal(sent.some(e=>e.event==='waiting_for_live'),true);
 assert.equal(sent.some(e=>e.event==='error'),false);
 assert.equal(sleeps[0],120000);
});

test('após uma sala válida supervisor tenta recuperar várias vezes antes de entregar fallback externo',async()=>{
 const sent=[];let call=0;
 const ok=await superviseTikTok({
  username:'teste',
  createClient:async()=>{
    call++;
    if(call===1)return new FakeClient(async client=>{client.emit('connected',{roomId:'r'});});
    return new FakeClient(async()=>{throw Object.assign(new Error('socket'),{code:'SOCKET'});});
  },
  send:(event,payload)=>sent.push({event,payload}),
  sleep:async()=>{},
  maxRecoveryFailures:3
 });
 assert.equal(ok,false);
 assert.equal(sent.filter(e=>e.event==='connected').length,1);
 assert.equal(sent.at(-1).event,'disconnected');
 assert.equal(sent.at(-1).payload.code,'SUPERVISOR_EXHAUSTED');
 assert.equal(call,3);
});

test('vinte ciclos saudáveis de WebSocket não derrubam a Live no supervisor',async()=>{
 const sent=[];let cycle=0,stop=false;
 const ok=await superviseTikTok({
  username:'long_live',
  createClient:async()=>new FakeClient(async client=>{
    cycle++;
    client.emit('connected',{roomId:'same-room'});
    client.emit('roomUserSeq',{total:cycle});
    if(cycle%5===0)client.emit('chat',{comment:'atividade '+cycle});
    if(cycle>=20)stop=true;
  }),
  send:(event,payload)=>sent.push({event,payload}),
  isStopping:()=>stop,
  setCurrentClient:()=>{},
  sleep:async()=>{}
 });
 assert.equal(ok,true);
 assert.equal(cycle,20);
 assert.equal(sent.filter(e=>e.event==='connected').length,1);
 assert.equal(sent.filter(e=>e.event==='transport_restored').length,19);
 assert.equal(sent.filter(e=>e.event==='disconnected').length,0);
 assert.equal(sent.filter(e=>e.event==='error').length,0);
});

test('configuração de transporte tolera silêncio sem esconder falhas de rede',()=>{
 const cfg=require('../backend/tiktokTransportConfig');
 assert.equal(cfg.STALE_TIMEOUT_MS,600000);
 assert.ok(cfg.INTERNAL_MAX_RETRIES>=4);
 assert.ok(cfg.SUPERVISOR_MAX_RECOVERY_FAILURES>=20);
 assert.ok(cfg.HTTP_TIMEOUT_MS<=15000);
});

test('erros de transporte do Node/Undici são recuperáveis sem mascarar erro de programação',()=>{
 const {isRecoverableTransportError}=require('../backend/tiktokProcessRecovery');
 assert.equal(isRecoverableTransportError(Object.assign(new Error('other side closed'),{code:'UND_ERR_SOCKET'})),true);
 assert.equal(isRecoverableTransportError(Object.assign(new Error('reset'),{code:'ECONNRESET'})),true);
 assert.equal(isRecoverableTransportError(Object.assign(new Error('timeout'),{cause:{code:'ETIMEDOUT'}})),true);
 assert.equal(isRecoverableTransportError(new Error('socket hang up')),true);
 assert.equal(isRecoverableTransportError(new TypeError('bug de programação')),false);
});

test('cache de ttwid reutiliza último cookie válido quando TikTok retorna 200 sem cookie',async()=>{
 const {createGuardedFetch,invalidateTtwidCache,ttwidCacheState}=require('../backend/tiktokFetchGuard');
 invalidateTtwidCache();
 let now=1000,calls=0,fallbacks=0;
 const mkResponse=cookie=>({
   status:200,
   headers:{
     getSetCookie:()=>cookie?['ttwid='+cookie+'; Path=/; Secure']:[],
     get:name=>String(name).toLowerCase()==='set-cookie'&&cookie?'ttwid='+cookie+'; Path=/; Secure':null
   },
   text:async()=>'',json:async()=>({})
 });
 const base=async()=>mkResponse(++calls===1?'abc123':'');
 const fetch=createGuardedFetch(base,()=>now,30*60*1000,()=>fallbacks++);
 let r=await fetch('https://www.tiktok.com/',{});
 assert.equal(r.headers.getSetCookie()[0].includes('abc123'),true);
 assert.equal(ttwidCacheState().hasCached,true);
 now+=5000;
 r=await fetch('https://www.tiktok.com/',{});
 assert.equal(r.headers.getSetCookie()[0].includes('abc123'),true);
 assert.equal(fallbacks,1);
 invalidateTtwidCache();
 r=await fetch('https://www.tiktok.com/',{});
 assert.equal(r.headers.getSetCookie().length,0);
 assert.equal(ttwidCacheState().hasCached,false);
});

test('guard de ttwid não altera outras URLs e expira cache antigo',async()=>{
 const {createGuardedFetch,invalidateTtwidCache}=require('../backend/tiktokFetchGuard');
 invalidateTtwidCache();
 let now=0;
 const responses=[
  {status:200,headers:{getSetCookie:()=>['ttwid=old; Path=/'],get:()=>null}},
  {status:204,headers:{getSetCookie:()=>[],get:()=>null}},
  {status:200,headers:{getSetCookie:()=>[],get:()=>null}}
 ];
 const fetch=createGuardedFetch(async()=>responses.shift(),()=>now,1000);
 await fetch('https://www.tiktok.com/');
 now=2000;
 const expired=await fetch('https://www.tiktok.com/');
 assert.equal(expired.headers.getSetCookie().length,0);
 const other=await fetch('https://www.tiktok.com/api-live/user/room?x=1');
 assert.equal(other.status,200);
});
