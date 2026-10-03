import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3196, debugPort = 9489;

const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    PIPA_DISABLE_TIKTOK_AUTOCONNECT: '1',
  PIPA_ENABLE_SIMULATION:'1',
    PIPA_FRONTEND_DIST: path.join(root, 'frontend', 'dist'),
    PIPA_ARENA_STATE_FILE: path.join(process.env.TEMP, 'pipa-mem2-' + Date.now() + '.json')
  },
  stdio: 'ignore'
});

const pause = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch {}
    await pause(200);
  }
  throw Error('Timeout: ' + url);
}

try {
  await waitFor(`http://127.0.0.1:${port}/admin`);

  const browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + debugPort,
    '--enable-precise-memory-info',
    '--user-data-dir=' + path.join(process.env.TEMP, 'edge-mem2-' + Date.now()),
    'about:blank'
  ], { stdio: 'ignore' });

  const tabs = await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  const wsUrl = tabs.find(t => t.type === 'page').webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let seq = 0;
  function send(method, params = {}) {
    const id = ++seq;
    return new Promise(resolve => {
      const handler = event => {
        const data = JSON.parse(event.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}` });
  await pause(3000);

  // Spawn 40 players
  console.log('Spawning 40 players...');
  for (let i = 0; i < 40; i++) {
    await fetch(`http://127.0.0.1:${port}/api/simulate/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `user_${i}`, nickname: `Player ${i}`, comment: 'entrar' })
    });
  }
  await pause(2000);

  const stats1 = await send('Runtime.evaluate', {
    expression: `({
      kites: window.__PIPA_GAME__?.kites.size,
      geometries: window.__PIPA_GAME__?.threeScene?.renderer?.info?.memory?.geometries,
      textures: window.__PIPA_GAME__?.threeScene?.renderer?.info?.memory?.textures,
      kites3D: window.__PIPA_GAME__?.threeScene?.kites3D?.size,
      falling3D: window.__PIPA_GAME__?.threeScene?.fallingKites3D?.size,
      jsHeapMB: Math.round((performance?.memory?.usedJSHeapSize || 0) / 1024 / 1024)
    })`,
    returnByValue: true
  });
  console.log('BEFORE CUTS:', stats1.result.value);

  // Trigger 20 cut events in the frontend directly
  console.log('Triggering cuts with falling kites in frontend...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.__PIPA_GAME__;
      const ids = [...g.kites.keys()];
      for (let i = 0; i < 20; i++) {
        const winnerId = ids[i % 5];
        const loserId = ids[5 + (i % 30)];
        g.onCutOccurred({
          winnerId,
          winnerNick: 'Winner ' + winnerId,
          loserId,
          loserNick: 'Loser ' + loserId,
          cutX: 500,
          cutY: 400
        });
      }
    })()`
  });

  // Sample every second for 6 seconds
  for (let s = 1; s <= 6; s++) {
    await pause(1000);
    const statsLoop = await send('Runtime.evaluate', {
      expression: `({
        second: ${s},
        fallingPixi: window.__PIPA_GAME__?.fallingKites.length,
        falling3D: window.__PIPA_GAME__?.threeScene?.fallingKites3D?.size,
        dynamicKitesChildren: window.__PIPA_GAME__?.threeScene?.dynamicKitesGroup?.children?.length,
        geometries: window.__PIPA_GAME__?.threeScene?.renderer?.info?.memory?.geometries,
        textures: window.__PIPA_GAME__?.threeScene?.renderer?.info?.memory?.textures,
        jsHeapMB: Math.round((performance?.memory?.usedJSHeapSize || 0) / 1024 / 1024)
      })`,
      returnByValue: true
    });
    console.log(`SEC ${s}:`, statsLoop.result.value);
  }

  browser.kill();
  server.kill();
  process.exit(0);
} catch (err) {
  server.kill();
  console.error('Error:', err);
  process.exit(1);
}
