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

test('Âncora 2D: Line.js drawPath deve ancorar estritamente na mão do boneco e no cabresto da pipa', async () => {
  const { Line } = await loadESM('frontend/src/entities/Line.js');

  const line = new Line(500, 1800);
  line.visualBaseX = 520;
  line.visualBaseY = 1750; // mão levantada do boneco

  let firstPoint = null;
  let lastPoint = null;

  // Mock do moveTo e lineTo para capturar o traçado
  line.moveTo = (x, y) => { firstPoint = { x, y }; };
  line.lineTo = (x, y) => { lastPoint = { x, y }; };

  // Nós da corda com pequenas variações
  const mockNodes = [
    { x: 500, y: 1800 },
    { x: 505, y: 1500 },
    { x: 510, y: 1200 },
    { x: 515, y: 900 },
    { x: 520, y: 600 }
  ];

  line.drawPath(520, 600, 1.2, 0xffffff, 1, 0, mockNodes);

  assert.equal(firstPoint.x, 520, 'O primeiro ponto deve ser exatamente a mão visual do boneco (visualBaseX)');
  assert.equal(firstPoint.y, 1750, 'O primeiro ponto deve ser exatamente a mão visual do boneco (visualBaseY)');
  assert.equal(lastPoint.x, 520, 'O último ponto deve ser exatamente o cabresto da pipa');
  assert.equal(lastPoint.y, 600, 'O último ponto deve ser exatamente o cabresto da pipa');
});

test('Âncora 3D: ThreeLines posArr em t=0 deve ser exatamente a mão do boneco e em t=1 a pipa', async () => {
  const { ThreeLines } = await loadESM('frontend/src/ui/three/ThreeLines.js');

  const threeLines = new ThreeLines();
  const mockKite = {
    lineType: 'chile',
    x: 400,
    y: 300,
    baseX: 600,
    baseY: 1800,
    line: { visualBaseX: 610, visualBaseY: 1760 }
  };

  const handWorldPos = { x: 55, y: -130, z: 485 };
  const kiteWorldPos = { x: 120, y: 80, z: 95 };

  const l3d = threeLines.syncLine('test_user', mockKite, handWorldPos, kiteWorldPos, { x: 1, y: 0 }, 1, 0);
  const posArr = l3d.userData.positions;
  const numPts = l3d.userData.numPoints;

  // Ponto t = 0 (primeiro vértice, na mão do boneco)
  const startX = posArr[0];
  const startY = posArr[1];
  const startZ = posArr[2];

  assert.equal(startX, handWorldPos.x, 'Vértice inicial 3D deve ser exatamente handWorldPos.x');
  assert.equal(startY, handWorldPos.y, 'Vértice inicial 3D deve ser exatamente handWorldPos.y');
  assert.equal(startZ, handWorldPos.z, 'Vértice inicial 3D deve ser exatamente handWorldPos.z');

  // Ponto t = 1 (último vértice, no cabresto da pipa)
  const endIdx = (numPts - 1) * 3;
  const endX = posArr[endIdx];
  const endY = posArr[endIdx + 1];
  const endZ = posArr[endIdx + 2];

  assert.equal(endX, kiteWorldPos.x, 'Vértice final 3D deve ser exatamente kiteWorldPos.x');
  assert.equal(endY, kiteWorldPos.y - 2, 'Vértice final 3D deve ser exatamente kiteAttachY');
  assert.equal(endZ, kiteWorldPos.z, 'Vértice final 3D deve ser exatamente kiteWorldPos.z');
});
