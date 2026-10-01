const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function installDom() {
  const ctx = () => ({
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, arc() {},
    moveTo() {}, lineTo() {}, fill() {}, stroke() {}, clearRect() {}, fillRect() {},
    strokeRect() {}, roundRect() {}, fillText() {}, drawImage() {},
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}
  });
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx() }) };
  global.Image = class { set src(value) { this._src = value; } };
}

async function loadModules() {
  const root = path.join(__dirname, '../frontend/src/ui');
  const three = await import('three');
  const sceneModule = await import(pathToFileURL(path.join(root, 'ThreeSkyScene.js')).href + `?t=${Date.now()}`);
  const poolModule = await import(pathToFileURL(path.join(root, 'three/ActiveVisualPool.js')).href);
  const slotModule = await import(pathToFileURL(path.join(root, 'three/ActiveVisualSlot3D.js')).href);
  return { three, ...sceneModule, ...poolModule, ...slotModule };
}

function kite(nickname = 'Pipa') {
  return { nickname, profilePictureUrl: '', bodyColor: 0x1976d2, kiteType: 'tradicional',
    lineType: 'algodao', lineHP: 100, maxLineHP: 100, isKing: false, isLeader: false };
}
function makeScene(mod, capacity = 48) {
  const groups = {
    kites: new mod.three.Group(),
    players: new mod.three.Group(),
    lines: new mod.three.Group()
  };
  const scene = Object.create(mod.ThreeSkyScene.prototype);
  scene.time = 1;
  scene.kites3D = new Map();
  scene.players3D = new Map();
  scene.lines3D = new Map();
  scene.activeVisualPool = new mod.ActiveVisualPool({
    capacity,
    createSlot: index => mod.createActiveVisualSlot3D(index, groups),
    resetSlot: mod.resetActiveVisualSlot3D,
    disposeSlot: mod.disposeActiveVisualSlot3D
  });
  return { scene, groups };
}

test('acquire/release liga mapas públicos ao slot sem remover componentes dos grupos', async () => {
  installDom();
  const mod = await loadModules();
  const { scene, groups } = makeScene(mod, 3);
  const slot = scene.acquireActiveVisual('u1', kite('Um'));
  assert.ok(slot);
  assert.equal(scene.kites3D.get('u1'), slot.kite);
  assert.equal(scene.players3D.get('u1'), slot.player);
  assert.equal(scene.lines3D.get('u1'), slot.line);

  const released = scene.releaseActiveVisual('u1');
  assert.equal(released, slot);
  assert.equal(scene.kites3D.has('u1'), false);
  assert.equal(scene.players3D.has('u1'), false);
  assert.equal(scene.lines3D.has('u1'), false);
  assert.equal(slot.kite.visible, false);
  assert.ok(groups.kites.children.includes(slot.kite), 'pipa continua anexada para reuso');
  assert.ok(groups.players.children.includes(slot.player), 'boneco continua anexado para reuso');
  assert.ok(groups.lines.children.includes(slot.line), 'linha continua anexada para reuso');
  assert.equal(slot._disposed, undefined, 'release não pode executar dispose');
});

test('reacquire do mesmo usuário atualiza identidade sem trocar texturas do slot', async () => {
  installDom();
  const mod = await loadModules();
  const { scene } = makeScene(mod, 2);
  const first = scene.acquireActiveVisual('u1', kite('Primeiro'));
  const paper = first.paperTexture;
  const decal = first.kiteDecalTexture;
  const badge = first.playerDecalTexture;
  const generation = first.generation;

  const second = scene.acquireActiveVisual('u1', { ...kite('Segundo'), isKing: true });
  assert.equal(second, first);
  assert.equal(second.generation, generation, 'mesmo usuário não abre nova geração');
  assert.equal(second.paperTexture, paper);
  assert.equal(second.kiteDecalTexture, decal);
  assert.equal(second.playerDecalTexture, badge);
  assert.equal(second.kite.userData.currentDecalKey.includes('Segundo'), true);
});
test('integração falha fechado no 49º participante sem criar recursos extras', async () => {
  installDom();
  const mod = await loadModules();
  const { scene } = makeScene(mod, 48);
  for (let i = 0; i < 48; i++) {
    assert.ok(scene.acquireActiveVisual(`u${i}`, kite(`P${i}`)));
  }
  const beforeSlots = scene.activeVisualPool.slots.length;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    assert.equal(scene.acquireActiveVisual('u48', kite('Excedente')), null);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 1, 'falha fechada deve gerar diagnÃ³stico Ãºnico');
  assert.equal(scene.activeVisualPool.slots.length, beforeSlots);
  assert.equal(scene.kites3D.size, 48);
  assert.equal(scene.players3D.size, 48);
  assert.equal(scene.lines3D.size, 48);
});

test('ThreeSkyScene usa pool no sync e não descarta GPU ao remover inativos', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8'
  );
  assert.match(source, /new ActiveVisualPool\(\{[\s\S]*capacity:\s*48/);
  assert.match(source, /this\.acquireActiveVisual\(uidStr,\s*kite\)/);
  assert.match(source, /this\.releaseActiveVisual\(userId\)/);
  const cleanupStart = source.indexOf('// 4. Limpeza de Inativos');
  const cleanupEnd = source.indexOf('// 5. Pipas cortadas', cleanupStart);
  const cleanup = source.slice(cleanupStart, cleanupEnd);
  assert.doesNotMatch(cleanup, /disposeHierarchy\(p3d\)|disposeHierarchy\(k3d\)|\.dispose\(\)/,
    'cleanup durante sessão não pode liberar recursos WebGL');
});
