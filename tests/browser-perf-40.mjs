import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'tests', 'evidence');
await mkdir(evidence, { recursive: true });
const port = 3118;
const debugPort = 9348;
const durationMs = Math.max(3000, Number(process.env.PIPA_PERF_MS) || 7000);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), PIPA_DISABLE_TIKTOK_AUTOCONNECT: '1',
    PIPA_ARENA_STATE_FILE: path.join(process.env.TEMP, 'pipa-perf-' + Date.now() + '.json') },
  stdio: 'ignore'
});
let browser, ws, seq = 0;
const pending = new Map();
const errors = [];

async function waitFor(url) {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await pause(150);
  }
  throw new Error('Timeout: ' + url);
}
async function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout ' + method)); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function spawnKite(i) {
  const response = await fetch(`http://127.0.0.1:${port}/api/simulate/comment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: `perf_${i}`, nickname: `Perf ${i + 1}`, comment: 'entrar' })
  });
  assert.ok(response.ok);
}

try {
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
    `--remote-debugging-port=${debugPort}`, '--user-data-dir=' + path.join(process.env.TEMP, 'pipa-perf-browser-' + Date.now()),
    'about:blank'
  ], { stdio: 'ignore' });
  const tabs = await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (item) { pending.delete(message.id); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result); }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 2560, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}` });
  let booted = false;
  for (let i = 0; i < 120; i++) {
    try { if (await evaluate('!!window.__PIPA_GAME__?.socket.connected')) { booted = true; break; } } catch {}
    await pause(150);
  }
  if (!booted) {
    const diagnostic = await evaluate(`({readyState:document.readyState,game:!!window.__PIPA_GAME__,href:location.href,body:document.body?.textContent?.slice(0,120)||''})`);
    console.error('PERF_BOOT_DIAGNOSTIC', JSON.stringify({ diagnostic, errors }, null, 2));
  }
  assert.equal(booted, true, 'GameApp/socket não inicializou no benchmark');
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  await Promise.all(Array.from({ length: 40 }, (_, i) => spawnKite(i)));
  for (let i = 0; i < 40; i++) {
    if (await evaluate('window.__PIPA_GAME__.kites.size') === 40) break;
    await pause(100);
  }
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'), 40);
  const scenarioDurationMs = Math.max(1200, Math.floor(durationMs / 4));
  const prepareScenario = async targetContacts => evaluate(`(() => {
    const game=window.__PIPA_GAME__, w=game.app.screen.width;
    game.app.ticker.stop();game.isCombatAuthority=false;game._lastSparkSound=Date.now();
    const items=[...game.kites.values()].map(kite=>({kite,
      handX:Number.isFinite(kite.line?.visualBaseX)?kite.line.visualBaseX:kite.baseX,
      handY:Number.isFinite(kite.line?.visualBaseY)?kite.line.visualBaseY:kite.baseY
    })).sort((a,b)=>(a.handY-b.handY)||(a.handX-b.handX));
    const apply=candidatePairs=>{
      game.relinhoContacts.clear();game._ropeCollisionHints.clear();game.cutCooldowns.clear();
      items.forEach(({kite,handX,handY})=>{
        kite.isAscending=false;kite.spawnProtection=1e9;kite.maxLineHP=1e9;kite.lineHP=1e9;
        kite.x=handX;kite.y=Math.max(140,handY-1050);kite.targetX=kite.x;kite.targetY=kite.y;
        kite.rope?.resetPositions?.({x:handX,y:handY,z:0},{x:kite.x,y:kite.y,z:kite.z||0});
        kite.updateHPBar?.();
      });
      for(let pair=0;pair<candidatePairs;pair++){
        const left=items[pair*2],right=items[pair*2+1];if(!left||!right)break;
        const y=Math.max(140,Math.min(left.handY,right.handY)-1050);
        left.kite.spawnProtection=0;right.kite.spawnProtection=0;
        left.kite.x=right.handX;left.kite.y=y;right.kite.x=left.handX;right.kite.y=y+6;
        for(const item of [left,right]){
          item.kite.targetX=item.kite.x;item.kite.targetY=item.kite.y;
          item.kite.rope?.resetPositions?.({x:item.handX,y:item.handY,z:0},{x:item.kite.x,y:item.kite.y,z:item.kite.z||0});
        }
      }
    };
    if(${targetContacts}===0){apply(0);return {target:0,activeContacts:0,candidatePairs:0};}
    const maxPairs=Math.min(18,Math.floor(items.length/2));let activeContacts=0,candidatePairs=0;
    for(candidatePairs=${targetContacts};candidatePairs<=maxPairs;candidatePairs++){
      apply(candidatePairs);game.checkRelinhos(0);
      activeContacts=[...game.relinhoContacts.values()].filter(v=>v?.phase!=='RELEASE').length;
      if(activeContacts>=${targetContacts})break;
    }
    return {target:${targetContacts},activeContacts,candidatePairs};
  })()`);
  const warmup = await evaluate(`(() => {
    const game=window.__PIPA_GAME__,gl=game.threeScene?.renderer?.getContext?.(),dbg=gl?.getExtension?.('WEBGL_debug_renderer_info');
    const frames=[];for(let i=0;i<6;i++){const t=performance.now();game.gameLoop(1);frames.push(performance.now()-t);}
    return {frames,renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):'unknown',vendor:dbg?gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL):'unknown'};
  })()`);
  const scenarios=[];
  for(const spec of [{name:'zero',target:0},{name:'two',target:2},{name:'three',target:3},{name:'many',target:8}]){
    console.error('PERF_SCENARIO start',spec.name);
    const prepared=await prepareScenario(spec.target);
    assert.ok(prepared.activeContacts>=spec.target,`${spec.name}: n?o foi poss?vel preparar ${spec.target} contatos reais`);
    await evaluate('window.__PIPA_GAME__.runtimeProfiler.reset();window.__PIPA_GAME__.app.ticker.start()');
    const perf=await evaluate(`new Promise(resolve=>{
      const duration=${scenarioDurationMs},samples=[];let start=0,last=0,maxContacts=0;
      const tick=now=>{const g=window.__PIPA_GAME__,active=[...g.relinhoContacts.values()].filter(v=>v?.phase!=='RELEASE').length;maxContacts=Math.max(maxContacts,active);
        if(!start){start=now;last=now;requestAnimationFrame(tick);return;}
        samples.push(now-last);last=now;
        if(now-start<duration)requestAnimationFrame(tick);else{
          g.app.ticker.stop();const sorted=[...samples].sort((a,b)=>a-b),pct=p=>sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*p)-1))]||0;
          const avg=samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length);
          resolve({samples:samples.length,meanFps:1000/avg,p95Ms:pct(.95),p99Ms:pct(.99),maxContacts});
        }};requestAnimationFrame(tick);
    })`);
    const state=await evaluate(`(()=>{const g=window.__PIPA_GAME__,mem=g.threeScene?.renderer?.info?.memory||{};return {
      count:g.kites.size,particles:g.sparks.particles.length,profiler:g.runtimeProfiler.snapshot(),heapUsed:performance.memory?.usedJSHeapSize||null,
      textures:Number(mem.textures)||0,geometries:Number(mem.geometries)||0};})()`);
    scenarios.push({...spec,prepared,perf,state});
    console.error('PERF_SCENARIO done',spec.name,perf.meanFps,perf.maxContacts);
  }
  const report={passed:true,durationMs,scenarioDurationMs,warmup,scenarios,errors};
  await writeFile(path.join(evidence,'perf-40-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert.equal(errors.length,0,JSON.stringify(errors));
  for(const scenario of scenarios){
    assert.equal(scenario.state.count,40,`${scenario.name}: benchmark deve terminar com 40 pipas ativas`);
    assert.ok(scenario.perf.samples>=30,`${scenario.name}: amostras insuficientes ${scenario.perf.samples}`);
    assert.ok(scenario.perf.meanFps>=40,`${scenario.name}: FPS m?dio abaixo do gate ${scenario.perf.meanFps}`);
    assert.ok(scenario.perf.p95Ms<=60,`${scenario.name}: p95 acima do gate ${scenario.perf.p95Ms}ms`);
    assert.ok(scenario.state.profiler.sections.collision?.avgMs>=0,`${scenario.name}: profiler colis?o ausente`);
    assert.ok(scenario.state.profiler.sections.physics?.avgMs>=0,`${scenario.name}: profiler f?sica ausente`);
    assert.ok(scenario.state.profiler.sections.render3d?.avgMs>=0,`${scenario.name}: profiler render3d ausente`);
    assert.ok(scenario.state.profiler.sections.render2d?.avgMs>=0,`${scenario.name}: profiler render2d ausente`);
    assert.ok(scenario.state.particles<=350,`${scenario.name}: part?culas fora do budget`);
  }
  assert.equal(scenarios.find(s=>s.name==='zero').perf.maxContacts,0,'cen?rio zero gerou contato inesperado');
  assert.ok(scenarios.find(s=>s.name==='two').perf.maxContacts>=2,'cen?rio two n?o sustentou 2 contatos');
  assert.ok(scenarios.find(s=>s.name==='three').perf.maxContacts>=3,'cen?rio three n?o sustentou 3 contatos');
  assert.ok(scenarios.find(s=>s.name==='many').perf.maxContacts>=8,'cen?rio many n?o sustentou 8 contatos');
} finally {
  if (ws?.readyState === 1) { try { await send('Browser.close'); } catch {} ws.close(); }
  browser?.kill();
  server.kill();
}
