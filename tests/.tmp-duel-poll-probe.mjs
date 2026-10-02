import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3132;
const debugPort = 9362;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    PIPA_DISABLE_TIKTOK_AUTOCONNECT: '1',
    PIPA_ARENA_STATE_FILE: path.join(process.env.TEMP, `pipa-duel-poll-${Date.now()}.json`)
  },
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
  throw new Error(`Timeout ${url}`);
}

async function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 30000);
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: `duel_${i}`, nickname: `Duel ${i + 1}`, comment: 'entrar' })
  });
  assert.ok(response.ok);
}

try {
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', `--remote-debugging-port=${debugPort}`,
    '--user-data-dir=' + path.join(process.env.TEMP, `pipa-duel-poll-browser-${Date.now()}`), 'about:blank'
  ], { stdio: 'ignore' });

  const tabs = await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (item) {
        pending.delete(message.id);
        message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
      }
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 2560, deviceScaleFactor: 1, mobile: false
  });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}` });

  let booted = false;
  for (let i = 0; i < 120; i++) {
    try {
      if (await evaluate('!!window.__PIPA_GAME__?.socket.connected')) { booted = true; break; }
    } catch {}
    await pause(150);
  }
  assert.equal(booted, true, 'GameApp/socket não inicializou');

  await Promise.all(Array.from({ length: 2 }, (_, i) => spawnKite(i)));
  for (let i = 0; i < 80; i++) {
    if (await evaluate('window.__PIPA_GAME__.kites.size') === 2) break;
    await pause(100);
  }
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'), 2);

  const initial = await evaluate(`(() => {
    const g=window.__PIPA_GAME__, items=[...g.kites.values()];
    const cross=(a,b,c,d)=>{const o=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;};
    let crossings=0;
    for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++){
      const A=items[i],B=items[j];
      const a={x:Number.isFinite(A.line?.visualBaseX)?A.line.visualBaseX:A.baseX,y:Number.isFinite(A.line?.visualBaseY)?A.line.visualBaseY:A.baseY};
      const b={x:A.x,y:A.y};
      const c={x:Number.isFinite(B.line?.visualBaseX)?B.line.visualBaseX:B.baseX,y:Number.isFinite(B.line?.visualBaseY)?B.line.visualBaseY:B.baseY};
      const d={x:B.x,y:B.y};
      if(cross(a,b,c,d)) crossings++;
    }
    return {crossings, minHp:Math.min(...items.map(k=>k.lineHP)), contacts:g.relinhoContacts.size};
  })()`);

  await evaluate('window.__PIPA_GAME__.runtimeProfiler.reset()');
  const timeline = [];
  for (let second = 0; second <= 45; second++) {
    const state = await evaluate(`(() => {
      const g = window.__PIPA_GAME__;
      return {
        count: g.kites.size,
        authority: g.isCombatAuthority,
        pending: [...g._pendingCutLosers],
        kites: [...g.kites.values()].map(k => ({id:String(k.userId), hp:k.lineHP, maxHp:k.maxLineHP, spawn:k.spawnProtection, vx:k.vx, vy:k.vy})),
        contacts: [...g.relinhoContacts.entries()].map(([key,v]) => ({key, phase:v?.phase, friction:v?.friction, relativeSpeed:v?.relativeSpeed, lastSeenAt:v?.lastSeenAt, startedAt:v?.startedAt})),
        profiler: g.runtimeProfiler.snapshot()
      };
    })()`);
    timeline.push({ second, ...state });
    if (second % 5 === 0 || state.count <= 1) console.log(JSON.stringify(timeline.at(-1)));
    if (state.count <= 1) break;
    await pause(1000);
  }

  const finalState = await evaluate(`(() => ({
    count:window.__PIPA_GAME__.kites.size,
    contacts:[...window.__PIPA_GAME__.relinhoContacts.values()].filter(v=>v?.phase!=='RELEASE').length,
    drawCalls:window.__PIPA_GAME__.threeScene?.renderer?.info?.render?.calls||0
  }))()`);
  console.log(JSON.stringify({ initial, timeline, finalState, errors: errors.length }, null, 2));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.equal(finalState.count, 1, `duelo nÃ£o resolveu em 45s: ${finalState.count} pipas restantes`);
} finally {
  if (ws?.readyState === 1) {
    try { await send('Browser.close'); } catch {}
    ws.close();
  }
  browser?.kill();
  server.kill();
}
