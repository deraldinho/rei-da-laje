const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('ThreeThemeManager integra batch estático da favela com refresh e dispose', () => {
  const code = read('frontend/src/ui/three/themes/ThreeThemeManager.js');
  assert.match(code, /StaticSceneBatcher/);
  assert.match(code, /new StaticSceneBatcher\(this\.favelaPropsGroup/);
  assert.match(code, /staticBatcher\.rebuild\(\)/);
  assert.match(code, /staticBatcher\.refresh\(\)/);
  assert.match(code, /staticBatcher\.dispose\(\)/);
  assert.match(code, /skipStaticBatch:\s*true/);
});

test('RenderBudget define LOD ambiental sem tocar na física', () => {
  const code = read('frontend/src/ui/three/RenderBudget.js');
  assert.match(code, /ambientLod/);
  const scene = read('frontend/src/ui/ThreeSkyScene.js');
  assert.match(scene, /setRuntimeLod\(next\.ambientLod\)/);
});

test('RuntimeProfiler recebe economia estimada de draw calls do batching', () => {
  const app = read('frontend/src/engine/App.js');
  assert.match(app, /staticSavedDraws/);
});
