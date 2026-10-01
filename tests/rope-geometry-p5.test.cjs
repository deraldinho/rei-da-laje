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

test('P5.1 - ThreeLines: syncLine gera posições 3D estritamente finitas a partir dos nós físicos da corda', async () => {
  const { ThreeLines } = await loadESM('frontend/src/ui/three/ThreeLines.js');
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const lines = new ThreeLines();
  const rope = new RopePhysics({ nodeCount: 12, lineType: 'algodao' });
  rope.resetPositions({ x: 500, y: 1800, z: 0 }, { x: 300, y: 200, z: 0 });

  const mockKite = {
    baseX: 500,
    baseY: 1800,
    x: 300,
    y: 200,
    lineType: 'algodao',
    lineSlack: 0.25,
    lineTension: 0.8,
    rope
  };

  const handPos = { x: 5, y: -140, z: 480 };
  const kitePos = { x: -80, y: 120, z: 80 };

  const l3d = lines.syncLine('user_test', mockKite, handPos, kitePos, { x: 0.3, y: 0 }, 1, 0.5);

  assert.ok(l3d, 'Objeto 3D da linha deve ser retornado');
  const posArr = l3d.userData.positions;
  assert.ok(posArr && posArr.length > 0, 'Buffer de posições deve existir');

  for (let i = 0; i < posArr.length; i++) {
    assert.ok(
      Number.isFinite(posArr[i]),
      `Vértice da linha no índice ${i} deve ser um número finito, mas foi: ${posArr[i]}`
    );
  }
});

test('P5.2 - ThreeLines: BoundingSphere é computada sem produzir raio NaN', async () => {
  const { ThreeLines } = await loadESM('frontend/src/ui/three/ThreeLines.js');

  const lines = new ThreeLines();
  const l3d = lines.getOrCreateLine('sphere_test');
  const geom = l3d.userData.geom || l3d.userData.geo;

  geom.computeBoundingSphere();
  assert.ok(geom.boundingSphere !== null, 'BoundingSphere deve ser instanciada');
  assert.ok(
    Number.isFinite(geom.boundingSphere.radius),
    `Raio da esfera deve ser finito, recebido: ${geom.boundingSphere.radius}`
  );
  assert.ok(geom.boundingSphere.radius >= 0, 'Raio da esfera deve ser não-negativo');
});

test('P5.3 - Line 2D: drawPath renderiza nós físicos da corda sem exceções', async () => {
  const { Line } = await loadESM('frontend/src/entities/Line.js');
  const line = new Line(400, 900);

  const mockNodes = [
    { x: 400, y: 900 },
    { x: 380, y: 750 },
    { x: 350, y: 500 },
    { x: 320, y: 300 }
  ];

  // Deve executar com sucesso sem lançar erro ao receber nós
  assert.doesNotThrow(() => {
    line.update(320, 300, 1.2, true, 0x00f0ff, 0.9, mockNodes);
  });
});

test('P5.4 - Customização de Escalas: kiteScale e kiteNameScale sincronizam 2D e 3D', async () => {
  const { ThreeSkyScene } = await loadESM('frontend/src/ui/ThreeSkyScene.js');

  const mockCanvas = new MockCanvas();
  const scene = new ThreeSkyScene(mockCanvas, 800, 1200);

  scene.setKiteScale(1.8);
  assert.equal(scene.customKiteScale, 1.8, 'customKiteScale deve ser atualizado para 1.8');

  scene.setKiteNameScale(1.4);
  assert.equal(scene.customKiteNameScale, 1.4, 'customKiteNameScale deve ser atualizado para 1.4');
});
