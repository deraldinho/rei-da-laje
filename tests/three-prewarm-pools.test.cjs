const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const scenePath = path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js');

test('prewarm 3D faz draw real de todos os pools e cobre os três tipos de pipa', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  assert.match(source, /prewarmVisualPools\(\)\s*\{/);
  assert.match(source, /this\.activeVisualPool\.slots/);
  assert.match(source, /this\.flyawayPool\.items/);
  assert.match(source, /this\.lines\._brokenRopePool/);
  assert.match(source, /\['tradicional',\s*'raia',\s*'peixinho'\]/);
  assert.match(source, /configureKiteModelType3D\(/);
  assert.match(source, /renderer\.compile\(this\.scene,\s*this\.camera\)/);
  assert.match(source, /renderer\.render\(this\.scene,\s*this\.camera\)/,
    'compile sem draw real não materializa todo o pipeline no SwiftShader');
  assert.match(source, /new THREE\.WebGLRenderTarget\(/,
    'draw de prewarm deve ocorrer fora do canvas transmitido');
  assert.match(source, /this\._visualPoolsPrewarmed\s*=\s*true/);
});

test('falha no prewarm é fail-soft e não derruba a live', async () => {
  const mod = await import(pathToFileURL(scenePath).href + `?t=${Date.now()}`);
  const scene = Object.create(mod.ThreeSkyScene.prototype);
  scene.scene = {};
  scene.camera = {};
  scene.activeVisualPool = { slots: [], active: new Map() };
  scene.flyawayPool = { items: [] };
  scene.lines = { _brokenRopePool: [] };
  scene.renderer = {
    compile() { throw new Error('compile probe'); },
    render() { throw new Error('render should not run'); },
    getRenderTarget() { return null; },
    setRenderTarget() {}
  };
  const warnings = [];
  const oldWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  let result;
  try {
    result = scene.prewarmVisualPools();
  } finally {
    console.warn = oldWarn;
  }
  assert.equal(result, false);
  assert.equal(scene._visualPoolsPrewarmed, false);
  assert.equal(warnings.length, 1);
});

test('prewarm inclui superfícies ocultas que podem aparecer após corte ou presente', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  const required = [
    'slot.player.userData.badgeGroup',
    'slot.player.userData.glassesGroup',
    'slot.player.userData.crown',
    'slot.kite.userData.hpGroup',
    'slot.kite.userData.crown',
    'slot.kite.userData.aura',
    'slot.kite.userData.shieldMesh',
    'slot.kite.userData.tornadoMesh'
  ];
  for (const surface of required) {
    assert.match(source, new RegExp(`rememberVisible\\(${surface.replaceAll('.', '\\.') }\\)`),
      `prewarm precisa materializar ${surface}`);
  }
});

test('prewarm desenha explicitamente o decal da Flyaway fora da câmera da live', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  assert.match(source, /_prewarmFlyawayDecal\(renderer\)/);
  assert.match(source, /this\.flyawayPool\.items\[0\]\?\.userData\?\.decal/);
  assert.match(source, /new THREE\.OrthographicCamera\(/);
  assert.match(source, /new THREE\.Mesh\(sourceDecal\.geometry,\s*sourceDecal\.material\)/);
  assert.match(source, /renderer\.render\(decalWarmScene,\s*decalWarmCamera\)/);
});

test('prewarm do decal usa o mesmo fog da arena para gerar a mesma variante de shader', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  assert.match(source, /decalWarmScene\.fog\s*=\s*this\.scene\.fog/);
});

test('prewarm cobre shadow-on/off e todos os decals pré-alocados da Flyaway', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  const helper = source.split('_prewarmFlyawayDecal(renderer) {')[1]
    ?.split('prewarmVisualPools() {')[0] || '';
  const prewarm = source.split('prewarmVisualPools() {')[1]
    ?.split('_deferDispose(')[0] || '';
  assert.match(helper, /this\.flyawayPool\.items\.forEach/);
  assert.match(prewarm, /previousShadowMapEnabled/);
  assert.match(prewarm, /renderer\.shadowMap\.enabled\s*=\s*false/);
  assert.match(prewarm, /this\.dirLight\.castShadow\s*=\s*false/);
  assert.ok((prewarm.match(/this\._prewarmFlyawayDecal\(renderer\)/g) || []).length >= 2,
    'decal precisa ser desenhado com sombras ligadas e desligadas');
  assert.match(prewarm, /renderer\.shadowMap\.enabled\s*=\s*previousShadowMapEnabled/);
});

test('render target do prewarm usa o mesmo outputColorSpace da tela real', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  assert.match(source, /warmTarget\.texture\.colorSpace\s*=\s*renderer\.outputColorSpace/);
});

test('shader shadow-off é compilado antes de trocar para o render target offscreen', () => {
  const source = fs.readFileSync(scenePath, 'utf8');
  const prewarm = source.split('prewarmVisualPools() {')[1]
    ?.split('_deferDispose(')[0] || '';
  const shadowOff = prewarm.indexOf('renderer.shadowMap.enabled = false');
  const targetSwitch = prewarm.indexOf('renderer.setRenderTarget?.(warmTarget)');
  assert.ok(shadowOff >= 0 && targetSwitch >= 0 && shadowOff < targetSwitch,
    'shadow-off precisa ser compilado com output srgb antes do target offscreen');
  const between = prewarm.slice(shadowOff, targetSwitch);
  assert.match(between, /renderer\.compile\(this\.scene,\s*this\.camera\)/);
});
