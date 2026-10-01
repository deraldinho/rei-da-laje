import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root, 'tests', 'evidence');
await mkdir(evidence, { recursive: true });

const port = 3199, debugPort = 9445;
const server = spawn(process.execPath, ['backend/server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    PIPA_DISABLE_TIKTOK_AUTOCONNECT: '1',
    PIPA_FRONTEND_DIST: path.join(root, 'frontend', 'dist-preview'),
    PIPA_ARENA_STATE_FILE: path.join(process.env.TEMP, 'pipa-inspect-' + Date.now() + '.json')
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
    '--user-data-dir=' + path.join(process.env.TEMP, 'edge-inspect-' + Date.now()),
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

  const resolutions = [
    { name: 'inspect-1920x1080', width: 1920, height: 1080, mobile: false },
    { name: 'inspect-1080x1920', width: 1080, height: 1920, mobile: false },
    { name: 'inspect-1440x2560', width: 1440, height: 2560, mobile: false },
    { name: 'inspect-720x1280', width: 720, height: 1280, mobile: false }
  ];

  for (const res of resolutions) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: res.width,
      height: res.height,
      deviceScaleFactor: 1,
      mobile: res.mobile
    });
    await send('Page.navigate', { url: `http://127.0.0.1:${port}` });
    await pause(2500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(evidence, `${res.name}.png`), Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${res.name}.png`);
  }

  browser.kill();
  server.kill();
  console.log('All inspections captured successfully.');
  process.exit(0);
} catch (err) {
  server.kill();
  console.error('Error:', err);
  process.exit(1);
}
