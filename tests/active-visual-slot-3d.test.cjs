const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let THREE_MODULE;
async function getThree() {
  THREE_MODULE = THREE_MODULE || await import('three');
  return THREE_MODULE;
}

function installDom() {
  const ctx = () => ({
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {}, arc() {},
    moveTo() {}, lineTo() {}, fill() {}, stroke() {}, clearRect() {}, fillRect() {},
    strokeRect() {}, roundRect() {}, fillText() {}, drawImage() {},
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {},
    set textAlign(v) {}, set textBaseline(v) {}
  });
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return { width: 0, height: 0, getContext: () => ctx() };
    }
  };
  global.Image = class { set src(value) { this._src = value; } };
}

async function loadSlotModule() {
  const file = path.join(__dirname, '../frontend/src/ui/three/ActiveVisualSlot3D.js');
  return import(pathToFileURL(file).href + `?test=${Date.now()}-${Math.random()}`);
}

function makeKite(overrides = {}) {
  return {
    nickname: 'Jogador', profilePictureUrl: '', bodyColor: 0x1976d2,
    kiteType: 'tradicional', lineType: 'algodao', lineHP: 100, maxLineHP: 100,
    isKing: false, isLeader: false, shieldActive: false, hasKevlarBuff: false,
    tornadoActive: false, maneuver: null, streak: 0,
    ...overrides
  };
}

test('slot 3D nasce completo, oculto e preso aos grupos definitivos', async () => {
  installDom();
  const THREE = await getThree();
  const { createActiveVisualSlot3D } = await loadSlotModule();
  const groups = { kites: new THREE.Group(), players: new THREE.Group(), lines: new THREE.Group() };
  const slot = createActiveVisualSlot3D(7, groups);

  assert.equal(slot.index, 7);
  assert.ok(groups.kites.children.includes(slot.kite));
  assert.ok(groups.players.children.includes(slot.player));
  assert.ok(groups.lines.children.includes(slot.line));
  assert.equal(slot.kite.visible, false);
  assert.equal(slot.player.visible, false);
  assert.equal(slot.line.visible, false);
  assert.equal(slot.kite.userData.poolReady, true);
  assert.equal(slot.kite.userData.tailNodes.length, 16);
  assert.ok(slot.player.userData.skinMat);
  assert.ok(slot.player.userData.shortsMat);
  assert.ok(slot.player.userData.capMat);
});

test('reconfiguração troca tipo e identidade sem criar nova textura ou buffer dinâmico', async () => {
  installDom();
  const THREE = await getThree();
  const { createActiveVisualSlot3D, configureActiveVisualSlot3D } = await loadSlotModule();
  const groups = { kites: new THREE.Group(), players: new THREE.Group(), lines: new THREE.Group() };
  const slot = createActiveVisualSlot3D(0, groups);
  const paperTexture = slot.kite.userData.kiteMat.map;
  const decalTexture = slot.kite.userData.decalMat.map;
  const playerDecalTexture = slot.player.userData.badgeMesh.material.map;
  const tailGeometry = slot.kite.userData.tailMesh.geometry;
  const lineGeometry = slot.line.userData.geom;
  const geometries = slot.kite.userData.poolGeometries;

  slot.generation = 1;
  configureActiveVisualSlot3D(slot, 'u1', makeKite({
    nickname: 'Primeiro', kiteType: 'raia', bodyColor: 0xff0055,
    lineHP: 35, isKing: true, shieldActive: true, tornadoActive: true
  }), 10);
  assert.equal(slot.kite.userData.kiteMesh.geometry, geometries.raia.body);
  assert.equal(slot.kite.userData.tailMesh.geometry.drawRange.count, 5);
  assert.equal(slot.kite.userData.crown.visible, true);
  assert.equal(slot.kite.userData.shieldMesh.visible, true);
  assert.equal(slot.kite.userData.tornadoMesh.visible, true);

  slot.generation = 2;
  configureActiveVisualSlot3D(slot, 'u2', makeKite({ nickname: 'Segundo', kiteType: 'peixinho' }), 12);
  assert.equal(slot.kite.userData.kiteMesh.geometry, geometries.peixinho.body);
  assert.equal(slot.kite.userData.tailMesh.geometry.drawRange.count, 16);
  assert.equal(slot.kite.userData.kiteMat.map, paperTexture);
  assert.equal(slot.kite.userData.decalMat.map, decalTexture);
  assert.equal(slot.player.userData.badgeMesh.material.map, playerDecalTexture);
  assert.equal(slot.kite.userData.tailMesh.geometry, tailGeometry);
  assert.equal(slot.line.userData.geom, lineGeometry);
  assert.equal(slot.kite.visible, true);
  assert.equal(slot.player.visible, true);
  assert.equal(slot.line.visible, true);

  slot.generation = 3;
  configureActiveVisualSlot3D(slot, 'u3', makeKite({ kiteType: 'tradicional' }), 14);
  assert.equal(slot.kite.userData.kiteMesh.geometry, geometries.tradicional.body);
  assert.equal(slot.kite.userData.tailMesh.geometry.drawRange.count, 14);
});

test('reset do slot remove estado transitório e zera linha antes do próximo usuário', async () => {
  installDom();
  const THREE = await getThree();
  const { createActiveVisualSlot3D, configureActiveVisualSlot3D, resetActiveVisualSlot3D } = await loadSlotModule();
  const groups = { kites: new THREE.Group(), players: new THREE.Group(), lines: new THREE.Group() };
  const slot = createActiveVisualSlot3D(1, groups);
  slot.generation = 1;
  configureActiveVisualSlot3D(slot, 'old', makeKite({
    isKing: true, isLeader: true, shieldActive: true, tornadoActive: true,
    lineHP: 10
  }), 30);
  slot.line.userData.positions.fill(9);
  slot.kite.rotation.set(1, 2, 3);
  slot.kite.userData.tailWorldNodes = [{ x: 1 }];

  resetActiveVisualSlot3D(slot);
  assert.equal(slot.userId, null);
  assert.equal(slot.kite.visible, false);
  assert.equal(slot.player.visible, false);
  assert.equal(slot.line.visible, false);
  assert.equal(slot.kite.userData.crown.visible, false);
  assert.equal(slot.kite.userData.aura.visible, false);
  assert.equal(slot.kite.userData.shieldMesh.visible, false);
  assert.equal(slot.kite.userData.tornadoMesh.visible, false);
  assert.equal(slot.kite.userData.tailWorldNodes, null);
  assert.deepEqual(slot.kite.rotation.toArray(), [0, 0, 0, 'XYZ']);
  assert.ok(Array.from(slot.line.userData.positions).every(value => value === 0));
  assert.equal(slot.player.userData.crown.visible, false);
  assert.equal(slot.player.userData.glassesGroup.visible, false);
});
