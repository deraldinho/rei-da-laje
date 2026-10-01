import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'tests','evidence');
await mkdir(evidence,{recursive:true});
const port=3119, debugPort=9349;
const durationMs=Math.max(5000,Number(process.env.PIPA_SOAK_MS)||60000);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['backend/server.js'],{cwd:root,env:{...process.env,
  PORT:String(port),PIPA_DISABLE_TIKTOK_AUTOCONNECT:'1',
  PIPA_ARENA_STATE_FILE:path.join(process.env.TEMP,'pipa-soak-'+Date.now()+'.json')},stdio:'ignore'});
let browser,ws,seq=0;
const pending=new Map(),errors=[];
async function waitFor(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return r;}catch{}await pause(150);}throw Error('Timeout '+url);}
async function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(JSON.stringify(out.exceptionDetails));return out.result.value;}
async function comment(i){const r=await fetch(`http://127.0.0.1:${port}/api/simulate/comment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:`soak_${i}`,nickname:`Soak ${i+1}`,comment:'entrar'})});assert.ok(r.ok);}
try{
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling',
    `--remote-debugging-port=${debugPort}`,'--user-data-dir='+path.join(process.env.TEMP,'pipa-soak-browser-'+Date.now()),'about:blank'
  ],{stdio:'ignore'});
  const tabs=await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:2560,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}`});
  let booted=false;
  for(let i=0;i<160;i++){
    try { if(await evaluate('!!window.__PIPA_GAME__?.socket.connected')){booted=true;break;} } catch {}
    await pause(150);
  }
  assert.equal(booted,true,'GameApp/socket não inicializou dentro da janela de boot do soak');
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  await Promise.all(Array.from({length:40},(_,i)=>comment(i)));
  for(let i=0;i<40;i++){if(await evaluate('window.__PIPA_GAME__.kites.size')===40)break;await pause(100);}
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'),40);

  await evaluate(`(()=>{
    const game=window.__PIPA_GAME__, w=game.app.screen.width;
    game.isCombatAuthority=false;
    game.runtimeProfiler.reset();
    [...game.kites.values()].sort((a,b)=>String(a.userId).localeCompare(String(b.userId))).forEach((kite,i)=>{
      kite.isAscending=false;kite.spawnProtection=0;kite.maxLineHP=1e9;kite.lineHP=1e9;
      const handX=Number.isFinite(kite.line?.visualBaseX)?kite.line.visualBaseX:kite.baseX;
      const handY=Number.isFinite(kite.line?.visualBaseY)?kite.line.visualBaseY:kite.baseY;
      const col=i%8,row=Math.floor(i/8);
      kite.x=120+col*((w-240)/7);kite.y=250+row*260;
      kite.targetX=kite.x;kite.targetY=kite.y;
      kite.rope?.resetPositions?.({x:handX,y:handY,z:0},{x:kite.x,y:kite.y,z:kite.z||0});
      kite.updateHPBar?.();
    });
  })()`);
  await evaluate('window.__PIPA_GAME__.app.ticker.start()');
  await pause(2000);
  const sampleExpr=`(()=>{const g=window.__PIPA_GAME__,mem=g.threeScene?.renderer?.info?.memory||{};return {count:g.kites.size,particles:g.sparks.particles.length,heap:performance.memory?.usedJSHeapSize||null,textures:Number(mem.textures)||0,geometries:Number(mem.geometries)||0,profiler:g.runtimeProfiler.snapshot()};})()`;
  const samples=[await evaluate(sampleExpr)];
  const started=Date.now();
  while(Date.now()-started<durationMs){await pause(1000);samples.push(await evaluate(sampleExpr));}

  const baseline=samples[0],last=samples.at(-1);
  const maxParticles=Math.max(...samples.map(s=>s.particles));
  const heapGrowth=baseline.heap&&last.heap?last.heap-baseline.heap:null;
  const report={passed:true,durationMs,sampleCount:samples.length,baseline,last,maxParticles,heapGrowth,errors};
  await writeFile(path.join(evidence,'runtime-soak-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.ok(samples.every(s=>s.count===40),'soak deve manter 40 pipas ativas');
  assert.ok(maxParticles<=350,`partículas fora do budget: ${maxParticles}`);
  assert.ok(last.textures<=baseline.textures+12,`texturas cresceram: ${baseline.textures} -> ${last.textures}`);
  assert.ok(last.geometries<=baseline.geometries+20,`geometrias cresceram: ${baseline.geometries} -> ${last.geometries}`);
  if(heapGrowth!==null) assert.ok(heapGrowth<=64*1024*1024,`heap cresceu ${(heapGrowth/1024/1024).toFixed(1)} MB`);
  assert.ok(last.profiler?.fps>=30,`FPS do profiler abaixo de 30: ${last.profiler?.fps}`);
}finally{
  if(ws?.readyState===1){try{await send('Browser.close');}catch{}ws.close();}
  browser?.kill();server.kill();
}
