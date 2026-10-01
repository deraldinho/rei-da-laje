const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const load = rel => import(pathToFileURL(path.join(root, rel)).href + `?t=${Date.now()}_${Math.random()}`);

test('budget 3D preserva qualidade alta em arena pequena', async () => {
  const { computeRenderBudget } = await load('frontend/src/ui/three/RenderBudget.js');
  const budget = computeRenderBudget({ quality: 'high', population: 8 });
  assert.equal(budget.pixelRatioScale, 1);
  assert.equal(budget.shadows, true);
  assert.equal(budget.environmentStride, 1);
  assert.equal(budget.idleLineOpacityScale, 1);
});

test('budget 3D reduz apenas custo visual em arena lotada', async () => {
  const { computeRenderBudget } = await load('frontend/src/ui/three/RenderBudget.js');
  const medium = computeRenderBudget({ quality: 'medium', population: 40 });
  assert.ok(medium.pixelRatioScale <= 0.85);
  assert.equal(medium.shadows, false);
  assert.ok(medium.environmentStride >= 2);
  assert.ok(medium.idleLineOpacityScale <= 0.35);
});

test('RuntimeProfiler expõe gauges do renderer sem transformar em frame samples', async () => {
  const { RuntimeProfiler } = await load('frontend/src/engine/RuntimeProfiler.js');
  const profiler = new RuntimeProfiler({ windowSize: 8 });
  profiler.gauge('drawCalls', 123);
  profiler.gauge('triangles', 4567);
  const snap = profiler.snapshot();
  assert.equal(snap.gauges.drawCalls, 123);
  assert.equal(snap.gauges.triangles, 4567);
  assert.equal(snap.samples, 0);
});

test('ThreeSkyScene tem um único resize e aplica budget sem alterar física', () => {
  const code = read('frontend/src/ui/ThreeSkyScene.js');
  assert.equal((code.match(/\n  resize\(/g) || []).length, 1);
  assert.match(code, /setRuntimeQuality\(/);
  assert.match(code, /computeRenderBudget/);
  assert.match(code, /environmentStride/);
});

test('App alimenta quality e métricas WebGL no profiler', () => {
  const code = read('frontend/src/engine/App.js');
  assert.match(code, /setRuntimeQuality\(runtimeQuality,\s*this\.kites\.size\)/);
  assert.match(code, /runtimeProfiler\.gauge\('drawCalls'/);
  assert.match(code, /runtimeProfiler\.gauge\('triangles'/);
});