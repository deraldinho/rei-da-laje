const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const appPath = path.resolve(__dirname, '../frontend/src/engine/App.js');
const appCode = fs.readFileSync(appPath, 'utf8');

async function loadESM(rel) {
  return import(pathToFileURL(path.resolve(__dirname, '..', rel)).href + `?t=${Date.now()}_${Math.random()}`);
}

test('P15.3: RuntimeProfiler mede seções e mantém janela bounded', async () => {
  const { RuntimeProfiler } = await loadESM('frontend/src/engine/RuntimeProfiler.js');
  let now = 0;
  const profiler = new RuntimeProfiler({ now: () => now, windowSize: 4 });
  profiler.begin('physics'); now += 2.5; profiler.end('physics');
  for (const ms of [16, 17, 18, 40, 12]) profiler.frame(ms);
  const snap = profiler.snapshot();
  assert.equal(snap.samples, 4);
  assert.ok(snap.sections.physics.avgMs >= 2.49 && snap.sections.physics.avgMs <= 2.51);
  assert.ok(snap.frame.p95Ms >= 18);
});

test('P15.3: qualidade visual degrada sem alterar simulação', async () => {
  const { RuntimeProfiler } = await loadESM('frontend/src/engine/RuntimeProfiler.js');
  const profiler = new RuntimeProfiler({ windowSize: 8 });
  for (let i = 0; i < 8; i++) profiler.frame(55);
  assert.equal(profiler.snapshot().quality, 'low');
  for (let i = 0; i < 8; i++) profiler.frame(16);
  assert.equal(profiler.snapshot().quality, 'high');
});
test('P15.3: runtime não contém ruptura espontânea por tensão', () => {
  assert.doesNotMatch(appCode, /isTensionBroken/);
  assert.doesNotMatch(appCode, /handleTensionBreak\s*\(/);
});

test('P15.3: GameApp integra profiler em física, colisão e render', () => {
  assert.match(appCode, /RuntimeProfiler/);
  assert.match(appCode, /runtimeProfiler\.frame/);
  assert.match(appCode, /runtimeProfiler\.begin\('physics'\)/);
  assert.match(appCode, /runtimeProfiler\.begin\('collision'\)/);
  assert.match(appCode, /runtimeProfiler\.begin\('render3d'\)/);
  assert.match(appCode, /snapshot\(\)\.quality|runtimeQuality/);
});

test('P15.3: coupling limita correções por corda sem descartar combate', async () => {
  const { selectCouplingJobs } = await loadESM('frontend/src/engine/physics/RopeCouplingLimiter.js');
  const jobs = [];
  for (let i = 0; i < 8; i++) jobs.push({ idA: 'A', idB: `B${i}`, inter: { distance: i / 10 } });
  jobs.push({ idA: 'C', idB: 'D', inter: { distance: 0.01 } });
  const selected = selectCouplingJobs(jobs, 3);
  assert.equal(selected.filter(j => j.idA === 'A' || j.idB === 'A').length, 3);
  assert.ok(selected.some(j => j.idA === 'C' && j.idB === 'D'));
  const counts = new Map();
  for (const job of selected) for (const id of [job.idA, job.idB]) counts.set(id, (counts.get(id) || 0) + 1);
  assert.ok([...counts.values()].every(count => count <= 3));
});

test('P15.3: App aplica limiter apenas ao coupling pós-scan', () => {
  assert.match(appCode, /selectCouplingJobs/);
  assert.match(appCode, /selectCouplingJobs\(couplingQueue,\s*3\)/);
});

test('P15.3: runtime de combate exige cruzamento angular real', () => {
  assert.match(appCode, /RopeCollision\.checkRopeCollision\([\s\S]*?minSinAngle:\s*0\.05/);
});


test('P15.3: observador não executa resolvedor canônico de dano', async () => {
  const { resolveAuthoritativeCombat } = await loadESM('frontend/src/engine/physics/CombatAuthorityGate.js');
  let calls = 0;
  const resolver = (...args) => { calls++; return { tied: true, args }; };
  const denied = resolveAuthoritativeCombat(false, resolver, 'A', 'B', { hit: true }, 1, {});
  assert.equal(denied, null);
  assert.equal(calls, 0);
  const allowed = resolveAuthoritativeCombat(true, resolver, 'A', 'B', { hit: true }, 1, {});
  assert.equal(calls, 1);
  assert.equal(allowed.tied, true);
});

test('P15.3: App usa gate de autoridade e mede HUD, 2D e serialização', () => {
  assert.match(appCode, /resolveAuthoritativeCombat/);
  assert.match(appCode, /runtimeProfiler\.begin\('hud'\)/);
  assert.match(appCode, /runtimeProfiler\.begin\('render2d'\)/);
  assert.match(appCode, /runtimeProfiler\.begin\('serialization'\)/);
});