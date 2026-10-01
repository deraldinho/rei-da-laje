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

test('Ciclo Completo de Combate Físico: BrokenHandRope, Pipa Voada, Aparo XPBD e Tensão Máxima', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { BrokenHandRope } = await loadESM('frontend/src/entities/BrokenHandRope.js');
  const { FlyawayKite } = await loadESM('frontend/src/entities/FlyawayKite.js');
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  // 1. Ruptura da corda física
  const rope = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const hand = { x: 300, y: 1800, z: 0 };
  const kite = { x: 750, y: 350, z: 120 };
  rope.resetPositions(hand, kite);

  const breakInfo = rope.breakAt(5, 0.45);
  assert.ok(breakInfo.handNodes.length >= 6, 'HandNodes deve conter a metade presa à mão');
  assert.ok(breakInfo.flyawayNodes.length >= 6, 'FlyawayNodes deve conter a metade presa à pipa');

  // 2. BrokenHandRope permanece ancorada na mão e cai com gravidade na laje
  const bhr = new BrokenHandRope(breakInfo.handNodes, hand, {
    userId: 'user_los',
    lineColor: 0xff0055,
    lineType: 'cerol'
  });
  assert.equal(bhr.nodes[0].x, hand.x);
  assert.equal(bhr.nodes[0].y, hand.y);

  // Simula 10 passos físicos de queda da linha na laje
  const initialTipY = bhr.nodes[bhr.nodes.length - 1].y;
  for (let s = 0; s < 10; s++) {
    bhr.update(1, { x: 1.5, y: 0 }, 1850);
  }
  const updatedTipY = bhr.nodes[bhr.nodes.length - 1].y;
  assert.ok(updatedTipY > initialTipY, 'Ponta da linha rompida deve cair sob a gravidade');
  assert.equal(bhr.nodes[0].x, hand.x, 'Nó zero deve permanecer ancorado na mão do operador');

  // 3. FlyawayKite preserva momentum e permite aparo por corda física XPBD
  const mockLoser = {
    userId: 'user_los',
    nickname: 'Pipoco',
    bodyColor: 0xff6600,
    x: 750,
    y: 350,
    vx: 4.2,
    vy: -1.5,
    z: 120
  };
  const flyaway = new FlyawayKite(mockLoser, breakInfo);
  assert.equal(flyaway.userId, 'user_los');
  assert.ok(flyaway.life >= 20.0, 'Pipa voada deve durar até 25s para disputa de aparo');

  // 4. Aparo de alta precisão testando contra segmentos reais de corda física
  const activeRope = new RopePhysics({ nodeCount: 12, lineType: 'chile' });
  const activeSegments = activeRope.getSegments();
  assert.ok(activeSegments.length >= 11, 'ActiveRope deve fornecer segmentos físicos');

  const flyawaySegs = flyaway.getCatchableSegments();
  assert.ok(flyawaySegs.length > 0, 'FlyawayKite deve expor segmentos da linha pendurada');

  // Posiciona a corda ativa para cruzar o segmento da voada
  activeSegments[5].p1.x = flyawaySegs[0].x1 - 30;
  activeSegments[5].p1.y = flyawaySegs[0].y1 + 30;
  activeSegments[5].p2.x = flyawaySegs[0].x2 + 30;
  activeSegments[5].p2.y = flyawaySegs[0].y2 - 30;

  const aparoHit = Physics.checkLineIntersection(
    activeSegments[5].p1.x, activeSegments[5].p1.y,
    activeSegments[5].p2.x, activeSegments[5].p2.y,
    flyawaySegs[0].x1, flyawaySegs[0].y1,
    flyawaySegs[0].x2, flyawaySegs[0].y2
  );
  assert.equal(aparoHit.hit, true, 'Deve detectar cruzamento com a corda física real da pipa ativa');

  flyaway.catchBy({ nickname: 'Gavião', score: 10 });
  assert.equal(flyaway.isCaught, true, 'Pipa voada deve ser aparada');
  assert.equal(flyaway.caughtBy.nickname, 'Gavião');
});
