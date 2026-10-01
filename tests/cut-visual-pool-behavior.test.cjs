const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function installDom() {
  const canvases = [];
  const makeContext = canvas => ({
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, arc() {},
    moveTo() {}, lineTo() {}, fill() {}, stroke() {}, clearRect() {}, fillRect() {},
    strokeRect() {}, roundRect() {}, fillText() {},
    drawImage(source) { canvas.lastDrawSource = source; },
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}
  });
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = { width: 0, height: 0, lastDrawSource: null };
      canvas.getContext = () => (canvas._ctx ||= makeContext(canvas));
      canvases.push(canvas);
      return canvas;
    }
  };
  global.Image = class { set src(value) { this._src = value; } };
  return canvases;
}

async function loadModules() {
  const root = path.join(__dirname, '../frontend/src/ui/three');
  const three = await import('three');
  const fly = await import(pathToFileURL(path.join(root, 'FlyawayKite3DPool.js')).href + `?t=${Date.now()}`);
  const slot = await import(pathToFileURL(path.join(root, 'ActiveVisualSlot3D.js')).href + `?t=${Date.now()}`);
  const lines = await import(pathToFileURL(path.join(root, 'ThreeLines.js')).href + `?t=${Date.now()}`);
  return { three, ...fly, ...slot, ...lines };
}
function makeKite(nickname, bodyColor = 0x1976d2) {
  return {
    nickname, profilePictureUrl: '', bodyColor, kiteType: 'tradicional',
    lineType: 'algodao', lineHP: 100, maxLineHP: 100,
    isKing: false, isLeader: false
  };
}

test('Flyaway copia aparência para texturas próprias antes do slot ativo ser reutilizado', async () => {
  installDom();
  const mod = await loadModules();
  const groups = { kites: new mod.three.Group(), players: new mod.three.Group(), lines: new mod.three.Group() };
  const active = mod.createActiveVisualSlot3D(0, groups);
  active.generation = 1;
  mod.configureActiveVisualSlot3D(active, 'old', makeKite('Antigo', 0xff0055), 1);

  const parent = new mod.three.Group();
  const pool = new mod.FlyawayKite3DPool(parent, 4);
  const flyaway = pool.acquireFlyaway('f1', {
    userId: 'old', nickname: 'Antigo', bodyColor: 0xff0055,
    kiteType: 'tradicional', kiteData: { line: { color: 0xffffff } }
  });
  pool.captureAppearance(flyaway, active);

  assert.notEqual(flyaway.userData.bodyMat.map, active.paperTexture);
  assert.notEqual(flyaway.userData.decalMat.map, active.kiteDecalTexture);
  assert.equal(flyaway.userData.paperTexture.image.lastDrawSource, active.paperTexture.image);
  assert.equal(flyaway.userData.decalTexture.image.lastDrawSource, active.kiteDecalTexture.image);
  assert.equal(flyaway.userData.capturedUserId, 'old');

  active.generation = 2;
  mod.configureActiveVisualSlot3D(active, 'new', makeKite('Novo', 0x00ff00), 2);
  assert.equal(flyaway.userData.capturedUserId, 'old');
  assert.notEqual(flyaway.userData.paperTexture.image.lastDrawSource, active.paperTexture.image.lastDrawSource);
});

test('Flyaway lotado falha fechado e nunca rouba uma voada ainda ativa', async () => {
  installDom();
  const mod = await loadModules();
  const pool = new mod.FlyawayKite3DPool(new mod.three.Group(), 4);
  const acquired = [];
  for (let i = 0; i < 4; i++) {
    acquired.push(pool.acquireFlyaway(`f${i}`, {
      userId: `u${i}`, nickname: `P${i}`, bodyColor: 0xff0000 + i,
      kiteType: 'tradicional', life: 20, isCaught: false
    }));
  }
  assert.ok(acquired.every(Boolean));
  assert.equal(pool.acquireFlyaway('overflow', { userId: 'overflow', life: 20 }), null);
  assert.equal(pool.active.size, 4);
  assert.deepEqual([...pool.active.keys()].sort(), ['f0', 'f1', 'f2', 'f3']);
  const released = acquired[1];
  pool.releaseFlyaway('f1');
  const reused = pool.acquireFlyaway('f4', { userId: 'u4', life: 20 });
  assert.equal(reused, released, 'somente item explicitamente liberado pode ser reutilizado');
  assert.equal(pool.items.length, 4);
});

test('BrokenRope lotado falha fechado e reutiliza somente linha liberada', async () => {
  installDom();
  const mod = await loadModules();
  const lines = new mod.ThreeLines();
  const active = [];
  for (let i = 0; i < 48; i++) active.push(lines.acquireBrokenRope(`b${i}`, 0xffffff));
  assert.ok(active.every(Boolean));
  assert.equal(lines.acquireBrokenRope('overflow', 0xff0000), null);
  assert.equal(lines.brokenRopes3D.size, 48);
  assert.equal(lines._brokenRopePool.length, 48);
  const released = active[10];
  lines.releaseBrokenRope('b10');
  const reused = lines.acquireBrokenRope('b48', 0x00ff00);
  assert.equal(reused, released);
  assert.equal(lines._brokenRopePool.length, 48);
});

test('ThreeSkyScene captura aparência antes de liberar o slot ativo', () => {
  const fsLocal = require('node:fs');
  const source = fsLocal.readFileSync(
    path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8'
  );
  const cleanup = source.slice(
    source.indexOf('// 4. Limpeza de Inativos'),
    source.indexOf('// 5. Pipas cortadas')
  );
  const captureAt = cleanup.indexOf('captureAppearance(flyaway3D, visualSlot)');
  const releaseAt = cleanup.indexOf('releaseActiveVisual(userId)');
  assert.ok(captureAt >= 0, 'cleanup precisa copiar a aparência da pipa cortada');
  assert.ok(releaseAt > captureAt, 'slot ativo só pode ser liberado depois da cópia');
});

test('Flyaway dispose final libera texturas próprias exatamente uma vez', async () => {
  installDom();
  const mod = await loadModules();
  const pool = new mod.FlyawayKite3DPool(new mod.three.Group(), 4);
  const first = pool.items[0];
  let paperDisposals = 0;
  let decalDisposals = 0;
  first.userData.paperTexture.dispose = () => { paperDisposals++; };
  first.userData.decalTexture.dispose = () => { decalDisposals++; };
  pool.dispose();
  pool.dispose();
  assert.equal(paperDisposals, 1);
  assert.equal(decalDisposals, 1);
});
