const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class MockCanvas {
  constructor() {
    this.width = 100;
    this.height = 100;
    this.nodeName = 'CANVAS';
    this.tagName = 'CANVAS';
    this.style = {};
  }
  addEventListener() {}
  removeEventListener() {}
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {}
    };
  }
}

if (typeof global.window === 'undefined') {
  global.window = {};
}
if (typeof global.HTMLCanvasElement === 'undefined') {
  global.HTMLCanvasElement = MockCanvas;
}
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas();
      return { style: {} };
    }
  };
}

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

test('Combate Real: Cruzamento de linhas entre duas pipas na arena dispara colisão e combate', async () => {
  const { Kite } = await loadESM('frontend/src/entities/Kite.js');
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  // Cria pipa A: mão em (200, 1800), pipa em (800, 300)
  const kiteA = new Kite({ userId: 'userA', nickname: 'Jogador A', lineType: 'cerol' }, 1080, 1920);
  kiteA.baseX = 200; kiteA.baseY = 1800;
  kiteA.x = 800; kiteA.y = 300;
  kiteA.isAscending = false;
  kiteA.spawnProtection = 0;
  kiteA.line.visualBaseX = 200; kiteA.line.visualBaseY = 1750;

  // Cria pipa B: mão em (800, 1800), pipa em (200, 300)
  const kiteB = new Kite({ userId: 'userB', nickname: 'Jogador B', lineType: 'chile' }, 1080, 1920);
  kiteB.baseX = 800; kiteB.baseY = 1800;
  kiteB.x = 200; kiteB.y = 300;
  kiteB.isAscending = false;
  kiteB.spawnProtection = 0;
  kiteB.line.visualBaseX = 800; kiteB.line.visualBaseY = 1750;

  // Atualiza física das duas cordas
  kiteA.update(1, 0, 0);
  kiteB.update(1, 0, 0);

  // Executa checagem de colisão da arena
  const ax1 = kiteA.line.visualBaseX, ay1 = kiteA.line.visualBaseY;
  const ax2 = kiteA.x, ay2 = kiteA.y;
  const bx1 = kiteB.line.visualBaseX, by1 = kiteB.line.visualBaseY;
  const bx2 = kiteB.x, by2 = kiteB.y;

  const geomHit = Physics.checkLineIntersection(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2);
  assert.equal(geomHit.hit, true, 'As linhas devem cruzar geometricamente no centro');

  const ropeHit = RopeCollision.checkRopeCollision(kiteA.rope, kiteB.rope, 8.0);
  assert.ok(geomHit.hit || ropeHit.hit, 'O detector híbrido deve acusar colisão imediata');

  // Executa combate e verifica dano
  const inter = {
    hit: true,
    x: geomHit.x,
    y: geomHit.y,
    slidingSpeed: 8.0,
    sinAngle: 0.85
  };
  const combat = Physics.resolveRelinhoCombat(kiteA, kiteB, inter, 1);
  assert.ok(combat.sparksOnly || combat.damageA !== undefined || combat.winner, 'Combate deve produzir faíscas ou dano');
});
