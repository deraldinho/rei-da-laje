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
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!window.__PIPA_GAME__?.socket.connected')) break;
    await pause(150);
  }
  assert.equal(await evaluate('!!window.__PIPA_GAME__?.socket.connected'), true);
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  await Promise.all(Array.from({ length: 40 }, (_, i) => spawnKite(i)));
  for (let i = 0; i < 40; i++) {
    if (await evaluate('window.__PIPA_GAME__.kites.size') === 40) break;
    await pause(100);
  }
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'), 40);
  await evaluate(`(() => {
    const game = window.__PIPA_GAME__, w = game.app.screen.width;
    game.isCombatAuthority = false;
    game.runtimeProfiler.reset();
    const items = [...game.kites.values()].map(kite => ({
      kite,
      handX: Number.isFinite(kite.line?.visualBaseX) ? kite.line.visualBaseX : kite.baseX,
      handY: Number.isFinite(kite.line?.visualBaseY) ? kite.line.visualBaseY : kite.baseY
    })).sort((a,b) => a.handX - b.handX);
    items.forEach(({kite,handX,handY}, i) => {
      kite.isAscending = false; kite.spawnProtection = 0;
      kite.maxLineHP = 1e9; kite.lineHP = 1e9;
      kite.x = Math.max(100, Math.min(w - 100, handX));
      kite.y = 220 + Math.floor(i / 8) * 180 + (i % 2) * 25;
      kite.targetX = kite.x; kite.targetY = kite.y;
      kite.rope?.resetPositions?.({x:handX,y:handY,z:0},{x:kite.x,y:kite.y,z:kite.z||0});
      kite.updateHPBar?.();
    });
    for (let pair = 0; pair < 3; pair++) {
      const left = items[pair], right = items[items.length - 1 - pair];
      const y = 360 + pair * 180;
      left.kite.x = w * .78; left.kite.y = y;
      right.kite.x = w * .22; right.kite.y = y + 8;
      for (const item of [left,right]) {
        item.kite.targetX=item.kite.x; item.kite.targetY=item.kite.y;
        item.kite.rope?.resetPositions?.({x:item.handX,y:item.handY,z:0},{x:item.kite.x,y:item.kite.y,z:item.kite.z||0});
      }
    }
  })()`);
  await evaluate('window.__PIPA_GAME__.app.ticker.start()');

  const perf = await evaluate(`new Promise(resolve => {
    const duration = ${durationMs};
    const samples = [];
    let start = 0, last = 0;
    const tick = now => {
      if (!start) { start = now; last = now; requestAnimationFrame(tick); return; }
      samples.push(now - last); last = now;
      if (now - start < duration) requestAnimationFrame(tick);
      else {
        const sorted = [...samples].sort((a,b)=>a-b);
        const pct = p => sorted[Math.min(sorted.length-1, Math.max(0, Math.ceil(sorted.length*p)-1))] || 0;
        const avg = samples.reduce((a,b)=>a+b,0) / Math.max(1,samples.length);
        resolve({ samples:samples.length, meanFps:1000/avg, p95Ms:pct(.95), p99Ms:pct(.99) });
      }
    };
    requestAnimationFrame(tick);
  })`);
  const state = await evaluate(`(() => {
    const game = window.__PIPA_GAME__;
    return {
      count: game.kites.size,
      particles: game.sparks.particles.length,
      profiler: game.runtimeProfiler.snapshot(),
      heapUsed: performance.memory?.usedJSHeapSize || null
    };
  })()`);
  const report = { passed: true, durationMs, perf, state, errors };
  await writeFile(path.join(evidence, 'perf-40-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.equal(state.count, 40, 'benchmark deve terminar com 40 pipas ativas');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(perf.samples >= 60, `amostras insuficientes: ${perf.samples}`);
  assert.ok(perf.meanFps >= 45, `FPS médio abaixo do gate: ${perf.meanFps}`);
  assert.ok(perf.p95Ms <= 50, `p95 de frame acima do gate: ${perf.p95Ms}ms`);
  assert.ok(state.profiler.sections.collision?.avgMs >= 0, 'profiler de colisão ausente');
  assert.ok(state.profiler.sections.physics?.avgMs >= 0, 'profiler de física ausente');
  assert.ok(state.particles <= 350, `partículas fora do budget: ${state.particles}`);
} finally {
  if (ws?.readyState === 1) { try { await send('Browser.close'); } catch {} ws.close(); }
  browser?.kill();
  server.kill();
}
