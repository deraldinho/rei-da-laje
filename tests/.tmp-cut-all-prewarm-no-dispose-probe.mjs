import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'tests', 'evidence');
await mkdir(evidence, { recursive: true });
const port = 3126;
const debugPort = 9356;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    PIPA_DISABLE_TIKTOK_AUTOCONNECT: '1',
  PIPA_ENABLE_SIMULATION:'1',
    PIPA_ARENA_STATE_FILE: path.join(process.env.TEMP, `pipa-cut-perf-${Date.now()}.json`)
  },
  stdio: 'ignore'
});
let browser, ws, seq = 0;
const pending = new Map();
const errors = [];
async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await pause(150);
  }
  throw new Error(`Timeout: ${url}`);
}

async function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout ${method}`));
    }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function spawnKite(i) {
  const response = await fetch(`http://127.0.0.1:${port}/api/simulate/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: `cutperf_${i}`,
      nickname: `Cut Perf ${i + 1}`,
      comment: 'entrar'
    })
  });
  assert.ok(response.ok);
}

async function adminCut(userId) {
  const started = performance.now();
  const response = await fetch(`http://127.0.0.1:${port}/api/competition/admin-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cut', userId })
  });
  return { status: response.status, ms: performance.now() - started };
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return { min: sorted[0] || 0, avg, max: sorted.at(-1) || 0 };
}
try {
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`,
    '--user-data-dir=' + path.join(process.env.TEMP, `pipa-cut-perf-browser-${Date.now()}`),
    'about:blank'
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
      if (await evaluate('!!window.__PIPA_GAME__?.socket.connected')) {
        booted = true;
        break;
      }
    } catch {}
    await pause(150);
  }
  assert.equal(booted, true, 'GameApp/socket nÃ£o inicializou');
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');

  await Promise.all(Array.from({ length: 40 }, (_, i) => spawnKite(i)));
  for (let i = 0; i < 80; i++) {
    if (await evaluate('window.__PIPA_GAME__.kites.size') === 40) break;
    await pause(100);
  }
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'), 40);
  const warmup = await evaluate(`(() => {
    const g = window.__PIPA_GAME__;
    g.app.ticker.stop();
    for (const kite of g.kites.values()) {
      kite.spawnProtection = 1e9;
      kite.maxLineHP = 1e9;
      kite.lineHP = 1e9;
    }
    const samples = [];
    for (let i = 0; i < 6; i++) {
      const s0 = performance.now();
      g.threeScene.syncEntities(g.kites, g.fallingKites, g.sparks, 1, g.brokenHandRopes);
      const s1 = performance.now();
      g.threeScene.render();
      const s2 = performance.now();
      samples.push({ syncMs: s1 - s0, renderMs: s2 - s1 });
    }
    const programsBeforeManual = g.threeScene.renderer.info.programs?.length || 0;
    g.threeScene.prewarmCutVisuals();
    const programsAfterCompile = g.threeScene.renderer.info.programs?.length || 0;
    const warmFlyaways = [...g.threeScene.flyawayPool.items];
    const warmBrokens = [...g.threeScene.lines._brokenRopePool];
    const oldFlyVisibility = warmFlyaways.map(item => item.visible);
    const oldBrokenVisibility = warmBrokens.map(item => item.visible);
    warmFlyaways.forEach(item => { item.visible = true; });
    warmBrokens.forEach(item => { item.visible = true; });
    const manual0 = performance.now();
    g.threeScene.renderer.render(g.threeScene.scene, g.threeScene.camera);
    const manualRenderMs = performance.now() - manual0;
    const programsAfterManualRender = g.threeScene.renderer.info.programs?.length || 0;
    warmFlyaways.forEach((item, idx) => { item.visible = Boolean(oldFlyVisibility[idx]); });
    warmBrokens.forEach((item, idx) => { item.visible = Boolean(oldBrokenVisibility[idx]); });
    const gl = g.threeScene?.renderer?.getContext?.();
    const dbg = gl?.getExtension?.('WEBGL_debug_renderer_info');
    return {
      samples,
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
      poolSize: g.threeScene?.flyawayPool?.items?.length || 0,
      brokenPoolSize: g.threeScene?.lines?._brokenRopePool?.length || 0
    };
  })()`);

  assert.ok(warmup.poolSize >= 40, 'pool de flyaway insuficiente');
  assert.ok(warmup.brokenPoolSize >= 40, 'pool de linha rompida insuficiente');
  await evaluate('window.__PIPA_GAME__.threeScene._drainDeferredDisposals=()=>{};true');
  const cuts = [];
  for (let i = 0; i < 5; i++) {
    const expectedCount = 39 - i;
    const http = await adminCut(`cutperf_${i}`);
    assert.equal(http.status, 200, `corte ${i + 1} falhou no backend`);

    for (let wait = 0; wait < 100; wait++) {
      const ready = await evaluate(`(() => {
        const g = window.__PIPA_GAME__;
        return g.kites.size === ${expectedCount} &&
          g.fallingKites.some(f => String(f.userId) === 'cutperf_${i}');
      })()`);
      if (ready) break;
      await pause(20);
    }
    assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'), expectedCount);

    const sample = await evaluate(`(() => {
      const g = window.__PIPA_GAME__;
      const renderer = g.threeScene.renderer;
      const programsBefore = renderer.info.programs?.length || 0;
      const s0 = performance.now();
      g.threeScene.syncEntities(g.kites, g.fallingKites, g.sparks, 1, g.brokenHandRopes);
      const s1 = performance.now();
      const newest = [...g.threeScene.fallingKites3D.values()].at(-1);
      const materialBefore = newest ? {
        bodyVersion: newest.userData.bodyMat?.version || 0,
        decalVersion: newest.userData.decalMat?.version || 0,
        bodyMap: Boolean(newest.userData.bodyMat?.map),
        decalMap: Boolean(newest.userData.decalMat?.map)
      } : null;
      g.threeScene.render();
      const s2 = performance.now();
      const mem = renderer.info.memory;
      const programsAfter = renderer.info.programs?.length || 0;
      return {
        programsBefore, programsAfter, materialBefore,
        syncMs: s1 - s0,
        renderMs: s2 - s1,
        totalMs: s2 - s0,
        drawCalls: Number(g.threeScene.renderer.info.render.calls) || 0,
        geometries: Number(mem.geometries) || 0,
        textures: Number(mem.textures) || 0,
        falling3D: g.threeScene.fallingKites3D.size,
        broken3D: g.threeScene.brokenHandRopes3D.size,
        activeKites3D: g.threeScene.kites3D.size,
        deferred: g.threeScene._deferredDisposals.length,
        poolAllocated: g.threeScene.flyawayPool.items.length
      };
    })()`);
    cuts.push({ index: i + 1, http, ...sample });

    await evaluate(`(() => {
      const g = window.__PIPA_GAME__;
      for (let frame = 0; frame < 4; frame++) {
        g.threeScene.syncEntities(g.kites, g.fallingKites, g.sparks, 1, g.brokenHandRopes);
        g.threeScene.render();
      }
      return true;
    })()`);
  }

  const report = {
    passed: true,
    renderer: warmup.renderer,
    baselineOldFirstFlyawayRenderMs: 2646,
    warmup,
    cuts,
    summary: {
      syncMs: stats(cuts.map(cut => cut.syncMs)),
      renderMs: stats(cuts.map(cut => cut.renderMs)),
      totalMs: stats(cuts.map(cut => cut.totalMs))
    },
    errors
  };

  await writeFile(
    path.join(evidence, 'cut-perf-40-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));

  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(report.summary.syncMs.max <= 80,
    `sync pÃ³s-corte acima do gate: ${report.summary.syncMs.max.toFixed(1)}ms`);
  assert.ok(report.summary.renderMs.max <= 300,
    `primeiro render pÃ³s-corte acima do gate: ${report.summary.renderMs.max.toFixed(1)}ms`);
  for (const cut of cuts) {
    assert.equal(cut.poolAllocated, warmup.poolSize,
      'corte nÃ£o pode aumentar o pool de flyaway');
    assert.equal(cut.falling3D, cut.index,
      `corte ${cut.index}: quantidade 3D de voadas inesperada`);
    assert.equal(cut.broken3D, cut.index,
      `corte ${cut.index}: quantidade 3D de linhas rompidas inesperada`);
    assert.equal(cut.activeKites3D, 40 - cut.index,
      `corte ${cut.index}: pipa ativa 3D nÃ£o foi removida`);
  }
} finally {
  if (ws?.readyState === 1) {
    try { await send('Browser.close'); } catch {}
    ws.close();
  }
  browser?.kill();
  server.kill();
}


