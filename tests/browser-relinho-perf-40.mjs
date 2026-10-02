import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidenceDir=path.join(root,'tests','evidence');
await mkdir(evidenceDir,{recursive:true});
const evidenceFile=path.join(evidenceDir,'relinho-abrasion-benchmark.json');
const port=3128,debugPort=9358;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['backend/server.js'],{cwd:root,env:{...process.env,PORT:String(port),
  PIPA_DISABLE_TIKTOK_AUTOCONNECT:'1',PIPA_ARENA_STATE_FILE:path.join(process.env.TEMP,`pipa-relinho40-${Date.now()}.json`)},stdio:'ignore'});
let browser,ws,seq=0,stage='init';
const pending=new Map(),errors=[];
async function waitFor(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return r;}catch{}await pause(150);}throw new Error(`Timeout ${url}`);}
async function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout ${method} at ${stage}`));},30000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function spawnKite(i){const r=await fetch(`http://127.0.0.1:${port}/api/simulate/comment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:`relperf_${i}`,nickname:`Rel ${i+1}`,comment:'entrar'})});assert.ok(r.ok);}

try{
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling',
    '--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',`--remote-debugging-port=${debugPort}`,
    '--user-data-dir='+path.join(process.env.TEMP,`pipa-relinho-browser-${Date.now()}`),'about:blank'],{stdio:'ignore'});
  const tabs=await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const item=pending.get(m.id);if(item){pending.delete(m.id);m.error?item.reject(new Error(JSON.stringify(m.error))):item.resolve(m.result);}}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:2560,deviceScaleFactor:1,mobile:false});
  stage='navigate'; await send('Page.navigate',{url:`http://127.0.0.1:${port}`});
  stage='boot-wait';
  let booted=false;for(let i=0;i<120;i++){try{if(await evaluate('!!window.__PIPA_GAME__?.socket.connected')){booted=true;break;}}catch{}await pause(150);}assert.equal(booted,true,'GameApp/socket não inicializou');
  stage='spawn-http';
  await Promise.all(Array.from({length:40},(_,i)=>spawnKite(i)));
  stage='wait-kite-count';
  for(let i=0;i<100;i++){if(await evaluate('window.__PIPA_GAME__.kites.size')===40)break;await pause(100);}
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'),40,'40 pipas não entraram');
  stage='configure-durable';
  await evaluate(`(() => { const g=window.__PIPA_GAME__; for(const k of g.kites.values()){
    k.spawnProtection=0; k.isAscending=false;
    if(k.rope?.material) k.rope.material={...k.rope.material,cutResistance:1e9,maxTension:1e9};
  } return true; })()`);
  stage='prewarm-manual';
  await evaluate(`(() => { const g=window.__PIPA_GAME__; g.app.ticker.stop(); for(let i=0;i<12;i++) g.gameLoop(1); return true; })()`);
  stage='prepare-measure';
  await evaluate(`(() => { const g=window.__PIPA_GAME__; g.runtimeProfiler.windowSize=600; g.runtimeProfiler.reset(); return true; })()`);
  const frameSamples=[]; let maxTracked=0,maxSolved=0,maxCold=0,maxActive=0;
  let finalManager=null,finalProfiler=null,finalCount=0,drawCalls=0;
  for(let batch=0;batch<12;batch++){
    stage='manual-batch-'+batch;
    const data=await evaluate(`(() => { const g=window.__PIPA_GAME__,samples=[]; let mt=0,ms=0,mc=0,ma=0;
      for(let i=0;i<20;i++){ const t0=performance.now(); g.gameLoop(1); samples.push(performance.now()-t0);
        const m=g.relinhoContactSystem?._metrics||{}; mt=Math.max(mt,m.trackedContacts||0); ms=Math.max(ms,m.solvedContacts||0);
        mc=Math.max(mc,m.coldNarrowChecks||0); ma=Math.max(ma,m.activeContacts||0); }
      return {samples,mt,ms,mc,ma,manager:g.relinhoContactSystem.manager.metrics(),profiler:g.runtimeProfiler.snapshot(),
        count:g.kites.size,drawCalls:g.threeScene?.renderer?.info?.render?.calls||0}; })()`);
    frameSamples.push(...data.samples); maxTracked=Math.max(maxTracked,data.mt); maxSolved=Math.max(maxSolved,data.ms);
    maxCold=Math.max(maxCold,data.mc); maxActive=Math.max(maxActive,data.ma); finalManager=data.manager; finalProfiler=data.profiler;
    finalCount=data.count; drawCalls=data.drawCalls;
  }
  const sorted=[...frameSamples].sort((a,b)=>a-b); const pct=p=>sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))]||0;
  const runtime={samples:frameSamples.length,p95Ms:pct(.95),p99Ms:pct(.99),maxMs:Math.max(0,...frameSamples),maxTracked,maxSolved,maxCold,maxActive,
    manager:finalManager,profiler:finalProfiler,count:finalCount,drawCalls};
  let evidence={};
  try{evidence=JSON.parse(await readFile(evidenceFile,'utf8'));}catch{}
  evidence.browser={generatedAt:new Date().toISOString(),...runtime,uncaughtExceptions:errors.length};
  await writeFile(evidenceFile,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence.browser,null,2));

  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.equal(runtime.count,40,'benchmark não pode perder pipas');
  assert.ok(runtime.samples>=120,`amostras insuficientes: ${runtime.samples}`);
  assert.ok(runtime.p95Ms<=40,`frame p95 ${runtime.p95Ms.toFixed(2)}ms > 40ms`);
  assert.ok(runtime.p99Ms<=80,`frame p99 ${runtime.p99Ms.toFixed(2)}ms > 80ms`);
  assert.ok(runtime.maxMs<=250,`frame max ${runtime.maxMs.toFixed(2)}ms > 250ms`);
  assert.ok(runtime.maxTracked<=12,`tracked ${runtime.maxTracked} > 12`);
  assert.ok(runtime.maxSolved<=3,`solved ${runtime.maxSolved} > 3`);
  assert.ok(runtime.maxCold<=96,`cold narrow ${runtime.maxCold} > 96`);
  assert.ok(runtime.manager.createdContacts<=runtime.manager.poolSize,'alocação lógica cresceu além do pool');
}finally{
  if(ws?.readyState===1){try{await send('Browser.close');}catch{}ws.close();}
  browser?.kill();server.kill();
}
