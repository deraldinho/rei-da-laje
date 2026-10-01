const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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

test('P1.1 - PhysicsClock: Integração com fixed timestep determinístico e proteção contra death spiral', async () => {
  const { PhysicsClock } = await loadESM('frontend/src/engine/physics/PhysicsClock.js');

  const clock = new PhysicsClock(1 / 60, 4);
  let stepsCount = 0;
  let simulatedTime = 0;

  // Frame de 1/30s (equivalente a 30 FPS) deve disparar exatamente 2 substeps de 1/60s (2/60s)
  const res30 = clock.update(1 / 30, (dt) => {
    stepsCount++;
    simulatedTime += dt;
  });

  assert.equal(res30.steps, 2, 'Frame a 30 FPS deve gerar exatamente 2 passos fixos de 1/60');
  assert.equal(stepsCount, 2);

  // Frame gigante (ex: 2 segundos de pausa na aba do navegador) não deve disparar mais que maxSubsteps (4)
  const resLag = clock.update(2.0, () => {
    stepsCount++;
  });
  assert.ok(resLag.steps <= 4, 'Proteção contra death spiral deve limitar a no máximo maxSubsteps');
});

test('P1.2 - LineMaterial: Calibração física e tribológica dos materiais de linha', async () => {
  const { getLineMaterial, LINE_MATERIALS } = await loadESM('frontend/src/engine/physics/LineMaterial.js');

  const algodao = getLineMaterial('algodao');
  const cerol = getLineMaterial('cerol');
  const chile = getLineMaterial('chile');
  const kevlar = getLineMaterial('kevlar');

  // Chile tem maior abrasividade que Cerol e Algodão
  assert.ok(chile.abrasiveness > cerol.abrasiveness);
  assert.ok(cerol.abrasiveness > algodao.abrasiveness);

  // Kevlar possui a maior resistência ao desgaste por atrito e maior diâmetro
  assert.ok(kevlar.abrasionResistance > chile.abrasionResistance);
  assert.ok(kevlar.abrasionResistance > algodao.abrasionResistance);
  assert.ok(kevlar.diameter > algodao.diameter);

  // Fallback seguro para linha desconhecida
  const fallback = getLineMaterial('desconhecida');
  assert.equal(fallback.type, 'algodao');
});

test('P1.3 - RopeConstraintSolver: XPBD restaura distância entre nós e preserva pontos fixos', async () => {
  const { RopeConstraintSolver } = await loadESM('frontend/src/engine/physics/RopeConstraintSolver.js');

  const nodes = [
    { x: 0, y: 0, invMass: 0 },    // nó 0 fixo na mão
    { x: 50, y: 0, invMass: 1.0 }, // nó 1 deformado
    { x: 100, y: 0, invMass: 0 }   // nó 2 fixo na pipa
  ];

  // Comprimento de repouso por segmento = 50px (total 100px)
  // Desloca o nó central bruscamente para y = 60 (esticando para hypot(50, 60) ≈ 78px)
  nodes[1].y = 60;

  // XPBD verdadeiro: compliance física α é a complacência (inverso da rigidez).
  // Com stiffness=0.95 (muito rígido) e 6 iterações, a restrição de distância puxa
  // fortemente o nó deformado de volta em direção ao comprimento de repouso (y -> 0).
  RopeConstraintSolver.solveDistanceConstraints(nodes, 50, 0.95, 6, 1 / 60);

  // Nós com invMass = 0 NÃO devem ter se movido
  assert.equal(nodes[0].x, 0);
  assert.equal(nodes[0].y, 0);
  assert.equal(nodes[2].x, 100);
  assert.equal(nodes[2].y, 0);

  // Nó móvel com stiffness=0.95 deve ter corrigido significativamente a deformação
  assert.ok(nodes[1].y < 15, `Nó central com stiffness=0.95 deveria ter relaxado abaixo de 15, mas ficou: ${nodes[1].y}`);
  assert.ok(nodes[1].y >= 0, `Nó central não deveria ter ultrapassado y=0: ${nodes[1].y}`);

  // Com dt maior (dt=1, simulando 1 passo por segundo), o solver deve corrigir mais
  const nodes2 = [
    { x: 0, y: 0, invMass: 0 },
    { x: 50, y: 60, invMass: 1.0 },
    { x: 100, y: 0, invMass: 0 }
  ];
  RopeConstraintSolver.solveDistanceConstraints(nodes2, 50, 0.95, 6, 1.0);
  assert.ok(nodes2[1].y < 45, `Com dt=1s, nó central deveria ter relaxado abaixo de 45, mas ficou: ${nodes2[1].y}`);
});

test('P1.4 - RopePhysics: Simulação completa de 12 nós, controle de carretel e tensão emergente', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const rope = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const hand = { x: 500, y: 1800, z: 0 };
  const kite = { x: 500, y: 300, z: 0 };

  rope.resetPositions(hand, kite);

  const nodes = rope.getNodes();
  assert.equal(nodes.length, 12, 'Corda deve possuir exatamente 12 nós');
  assert.equal(nodes[0].x, 500);
  assert.equal(nodes[0].y, 1800);
  assert.equal(nodes[11].x, 500);
  assert.equal(nodes[11].y, 300);

  // Executa passos de física com vento horizontal forte para a direita
  const wind = { x: 1.5, y: 0 };
  for (let i = 0; i < 30; i++) {
    rope.step(1 / 60, hand, kite, wind, { lineSlack: 0.5, lineTension: 0.5 });
  }

  // Nó 0 e nó 11 devem permanecer rigorosamente ancorados
  assert.equal(nodes[0].x, 500);
  assert.equal(nodes[0].y, 1800);
  assert.equal(nodes[11].x, 500);
  assert.equal(nodes[11].y, 300);

  // Nós do centro da linha (barriga) devem ter sido arrastados pelo vento para a direita (x > 500)
  const middleNode = nodes[6];
  assert.ok(middleNode.x > 500, `Nó central deveria ter curvado para a direita com o vento, mas ficou: ${middleNode.x}`);

  // Tensão natural física é calculada e finita
  const tension = rope.getNaturalTension();
  assert.ok(tension >= 0.05 && tension <= 1.0, `Tensão deve estar no intervalo [0.05, 1.0]: ${tension}`);

  // AABB da corda física
  const aabb = rope.getAABB();
  assert.ok(aabb.minX <= 500 && aabb.maxX >= middleNode.x);
  assert.ok(aabb.minY <= 300 && aabb.maxY >= 1800);
});

test('P1.5 - RopePhysics: Desgaste abrasivo por segmento (segmentWear) e integridade local', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const rope = new RopePhysics({ nodeCount: 12, lineType: 'chile' });
  rope.resetPositions({ x: 0, y: 0 }, { x: 100, y: 100 });

  assert.equal(rope.getWeakestSegmentIntegrity(), 1.0, 'Linha nova deve ter 100% de integridade');

  // Aplica desgaste repetido no segmento 5 (no meio da linha)
  rope.applySegmentWear(5, 0.35);
  rope.applySegmentWear(5, 0.40);

  const segments = rope.getSegments();
  assert.equal(segments.length, 11);
  assert.ok(Math.abs(segments[5].wear - 0.75) < 0.001);

  // O ponto mais fraco agora tem 25% de integridade restante
  assert.ok(Math.abs(rope.getWeakestSegmentIntegrity() - 0.25) < 0.001);
});

test('P1.6 - Kite.js: Integração nativa de RopePhysics no ciclo de vida e update', async () => {
  const { Kite } = await loadESM('frontend/src/entities/Kite.js');

  const kite = new Kite({ userId: 'u_p1_test', nickname: 'RopeTester', lineType: 'cerol' });

  assert.ok(kite.rope, 'Kite deve possuir instância de RopePhysics');
  assert.equal(kite.rope.nodeCount, 12);
  assert.equal(kite.rope.material.type, 'cerol');

  // Ao atualizar a pipa, a corda deve avançar sem erros
  kite.update(1, { x: 1.0, y: 0 }, 1);
  const nodes = kite.rope.getNodes();
  assert.ok(Number.isFinite(nodes[0].x));
  assert.ok(Number.isFinite(nodes[11].x));

  // Ao trocar de linha em setBuff, o material da corda deve atualizar
  kite.setBuff('chile', 2.0, '#ffaa00', 1.5, 0);
  assert.equal(kite.rope.material.type, 'chile');
});
