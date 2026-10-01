const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class MockCanvas {
  constructor() { this.width = 100; this.height = 100; this.style = {}; }
  addEventListener() {}
  removeEventListener() {}
  getContext() {
    return {
      fillRect: () => {}, clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {}, createImageData: () => [],
      setTransform: () => {}, drawImage: () => {}, save: () => {},
      fillText: () => {}, restore: () => {}, beginPath: () => {},
      moveTo: () => {}, lineTo: () => {}, closePath: () => {},
      stroke: () => {}, translate: () => {}, scale: () => {},
      rotate: () => {}, arc: () => {}, fill: () => {},
      measureText: () => ({ width: 40 }), transform: () => {},
      rect: () => {}, clip: () => {}
    };
  }
}

if (typeof global.window === 'undefined') global.window = {};
if (typeof global.HTMLCanvasElement === 'undefined') global.HTMLCanvasElement = MockCanvas;
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => tag === 'canvas' ? new MockCanvas() : { style: {} }
  };
}

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

test('P10 & P15: Ruptura física localizada na corda e criação de FlyawayKite com corda pendurada', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { FlyawayKite } = await loadESM('frontend/src/entities/FlyawayKite.js');
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  const rope = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const hand = { x: 200, y: 1800, z: 0 };
  const kite = { x: 800, y: 400, z: 120 };
  rope.resetPositions(hand, kite);

  // Rompe no segmento 6 (aproximadamente no meio da linha)
  const breakInfo = rope.breakAt(6, 0.4);
  assert.ok(breakInfo.breakPoint, 'Deve calcular o ponto exato da ruptura');
  assert.ok(Number.isFinite(breakInfo.breakPoint.x), 'X do ponto de corte deve ser finito');
  assert.ok(Number.isFinite(breakInfo.breakPoint.y), 'Y do ponto de corte deve ser finito');
  assert.ok(breakInfo.handNodes.length > 2, 'HandNodes deve conter os nós presos à mão');
  assert.ok(breakInfo.flyawayNodes.length > 2, 'FlyawayNodes deve conter a corda presa à pipa');

  // Cria FlyawayKite com os dados reais da ruptura
  const mockLoser = {
    userId: 'loser123',
    nickname: 'Pipoco',
    bodyColor: 0xff0055,
    x: 800,
    y: 400,
    vx: 3.5,
    vy: -1.2,
    rotation: 0.15
  };
  const flyaway = new FlyawayKite(mockLoser, breakInfo);
  assert.equal(flyaway.userId, 'loser123');
  assert.equal(flyaway.flyawayNodes.length, breakInfo.flyawayNodes.length);

  // Executa passos físicos de voada e queda livre
  flyaway.update(1, 1920, 1700, { x: 1.2, y: 0 });
  assert.ok(flyaway.y > 400 - 2, 'Pipa voada deve responder à gravidade e arrasto');
  assert.ok(flyaway.getCatchableSegments().length > 0, 'Deve expor segmentos da linha pendurada para aparo');

  // Testa sistema de APARO: uma linha ativa cruza a linha pendurada da pipa voada
  const segments = flyaway.getCatchableSegments();
  const testSeg = segments[0];
  // Linha ativa cruzando o segmento pendurado
  const activeHit = Physics.checkLineIntersection(
    testSeg.x1 - 50, testSeg.y1 + 50,
    testSeg.x2 + 50, testSeg.y2 - 50,
    testSeg.x1, testSeg.y1,
    testSeg.x2, testSeg.y2
  );
  assert.equal(activeHit.hit, true, 'Linha ativa deve cruzar o segmento da pipa voada');

  // Aparar a pipa voada
  const activeKite = { nickname: 'MestreDaLaje', score: 5 };
  flyaway.catchBy(activeKite);
  assert.equal(flyaway.isCaught, true, 'FlyawayKite deve registrar estado de aparada');
  assert.equal(flyaway.caughtBy, activeKite);
});
