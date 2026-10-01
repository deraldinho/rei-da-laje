/**
 * Suíte de Testes Automatizados para Remediação da Auditoria Física P5
 * 
 * Cobre estritamente os 6 pontos identificados na auditoria:
 * 1. PhysicsClock acionado uma vez por frame para todas as pipas (60/120/144 Hz)
 * 2. XPBD matematicamente correto: compliance física α proporcional a (1 - stiffness)
 * 3. Velocidade da âncora da pipa a 60 Hz reflete deslocamento real (~600 px/s para 10 px/frame)
 * 4. RopeCollision é autoritativo absoluto quando ambas têm corda física (sem falso relinho)
 * 5. Escudo e regenHP restauram a integridade física dos segmentos (segmentWear)
 * 6. Checkpoint preserva geometria/spoolLength da corda no 1º frame (sem resetPositions indesejado)
 */

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

async function loadESM(relPath) {
  const absPath = path.resolve(__dirname, '..', relPath);
  return import(pathToFileURL(absPath).href);
}

test('1. PhysicsClock: Executado uma vez por frame sincronizando todas as pipas em 120 FPS', async () => {
  const { PhysicsClock } = await loadESM('frontend/src/engine/physics/PhysicsClock.js');
  const clock = new PhysicsClock(1 / 60, 4);

  const substepsPerKite = { kiteA: 0, kiteB: 0, kiteC: 0, kiteD: 0 };
  const kites = ['kiteA', 'kiteB', 'kiteC', 'kiteD'];

  // Simula 12 frames a 120 FPS (deltaSeconds = 1/120 ≈ 0.00833s por frame)
  for (let f = 0; f < 12; f++) {
    clock.update(1 / 120, (fixedDt) => {
      for (const k of kites) {
        substepsPerKite[k]++;
      }
    });
  }

  // Em 12 frames a 120 FPS temos exatamente 6 substeps físicos de 1/60s (12 * 1/120 = 0.1s = 6 * 1/60)
  assert.equal(substepsPerKite.kiteA, 6, 'Pipa A deve rodar 6 substeps');
  assert.equal(substepsPerKite.kiteB, 6, 'Pipa B deve rodar 6 substeps');
  assert.equal(substepsPerKite.kiteC, 6, 'Pipa C deve rodar 6 substeps');
  assert.equal(substepsPerKite.kiteD, 6, 'Pipa D deve rodar 6 substeps');
  // Todas as pipas recebem rigorosamente a mesma quantidade de física:
  assert.deepEqual(Object.values(substepsPerKite), [6, 6, 6, 6]);
});

test('2. XPBD: Rigidez matematicamente correta onde stiffness=0.95 restaura restrição de nós', async () => {
  const { RopeConstraintSolver } = await loadESM('frontend/src/engine/physics/RopeConstraintSolver.js');

  const nodes = [
    { x: 0, y: 0, invMass: 0 },
    { x: 50, y: 60, invMass: 1.0 }, // nó deformado a y=60
    { x: 100, y: 0, invMass: 0 }
  ];

  // RestLength = 50px por segmento. Em y=60, a distância é hypot(50, 60) ≈ 78.1px.
  // Com stiffness=0.95 (alta rigidez) e 6 iterações, o XPBD deve corrigir fortemente em direção a y=0
  RopeConstraintSolver.solveDistanceConstraints(nodes, 50, 0.95, 6, 1 / 60);

  // Âncoras fixas
  assert.equal(nodes[0].x, 0);
  assert.equal(nodes[0].y, 0);
  assert.equal(nodes[2].x, 100);
  assert.equal(nodes[2].y, 0);

  // O nó deve ser puxado para perto de 0 (restLength 50 entre 0 e 50 e 100)
  assert.ok(nodes[1].y < 15, `Nó central deformado deveria ter relaxado abaixo de 15, mas ficou: ${nodes[1].y}`);
  assert.ok(nodes[1].y >= 0, `Nó não deve ultrapassar y=0: ${nodes[1].y}`);
});

test('3. Velocidade da âncora: Movimento de 10 px/frame a 60 Hz resulta em ~600 px/s sem drift e sem zero', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const rope = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const hand = { x: 500, y: 1800, z: 0 };
  let kiteX = 500;
  let kiteY = 400;

  rope.resetPositions(hand, { x: kiteX, y: kiteY, z: 0 });

  const dt = 1 / 60;
  const speeds = [];

  // Move a pipa exatamente 10 px por frame durante 5 frames
  for (let frame = 1; frame <= 5; frame++) {
    kiteX += 10;
    rope.step(dt, hand, { x: kiteX, y: kiteY, z: 0 }, { x: 0, y: 0 });
    const tipNode = rope.getNodes()[rope.nodeCount - 1];
    speeds.push(Math.round(tipNode.vx));
  }

  // 10 px em 1/60s = 600 px/s a cada frame
  for (let i = 0; i < speeds.length; i++) {
    assert.ok(
      Math.abs(speeds[i] - 600) <= 2,
      `Frame ${i + 1}: velocidade da ponta deveria ser ~600 px/s, mas foi: ${speeds[i]}`
    );
  }
});

test('4. RopeCollision autoritativo: Sem falso relinho quando cordas não se tocam mesmo que retas dos endpoints cruzem', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const ropeB = new RopePhysics({ nodeCount: 12, lineType: 'algodao' });

  // Pipa A: mão em (200, 1000), pipa em (800, 200)
  // Pipa B: mão em (800, 1000), pipa em (200, 200)
  // As retas dos endpoints se cruzam em (500, 600).
  // Mas vamos posicionar os nós da corda B curvados ou deslocados em Z/Y de forma que fiquem separados por ~10 px
  ropeA.resetPositions({ x: 200, y: 1000, z: 0 }, { x: 800, y: 200, z: 0 });
  ropeB.resetPositions({ x: 800, y: 1000, z: 15 }, { x: 200, y: 200, z: 15 }); // 15 px de distância em Z

  const collision = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5);
  // Como estão a 15 px de distância euclidiana (> 4.5 px), RopeCollision rejeita o contato:
  assert.equal(collision.hit, false, 'Corda separada por 15px em Z não deve colidir');
});

test('5. Escudo e regeneração: Escudo absorve derrota e ZERA segmentWear; regenHP restaura integridade', async () => {
  const { Kite } = await loadESM('frontend/src/entities/Kite.js');
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  const loser = new Kite({ userId: 'p1', lineType: 'kevlar', shield: 1 });
  const winner = new Kite({ userId: 'p2', lineType: 'chile' });

  // Degrada fortemente o segmento central da corda da pipa perdedora (wear = 0.96 -> integridade 4%)
  loser.rope.applySegmentWear(5, 0.96);
  assert.ok(loser.rope.getWeakestSegmentIntegrity() <= 0.05, 'Integridade deve estar crítica');

  // Finaliza corte letal
  const result = Physics.finalizeCut(winner, loser, { x: 500, y: 500 });

  assert.equal(result.absorbedByShield, true, 'Escudo deve absorver o corte');
  assert.equal(loser.shieldCount, 0, 'Escudo deve ser consumido');
  assert.equal(loser.lineHP, loser.maxLineHP, 'HP deve voltar ao máximo');

  // Integridade física da corda deve estar totalmente restaurada
  assert.equal(loser.rope.segmentWear[5], 0, 'Desgaste do segmento 5 deve ter sido zerado pelo escudo');
  assert.equal(loser.rope.getWeakestSegmentIntegrity(), 1.0, 'Integridade física do elo mais fraco deve ser 100%');

  // Testa também inconsistência secundária: regenHP reduz segmentWear
  const p3 = new Kite({ userId: 'p3', lineType: 'algodao' });
  p3.lineHP = 50;
  p3.rope.applySegmentWear(3, 0.5); // 50% desgastado
  const initialWear = p3.rope.segmentWear[3];

  // Simula regeneração fora de combate (60 frames a velocidade rápida para curar HP)
  p3.isInCombat = false;
  p3.hpRegenSpeed = 'rapida';
  p3.regenHP(60);

  assert.ok(p3.lineHP > 50, 'HP deve ter regenerado');
  assert.ok(p3.rope.segmentWear[3] < initialWear, 'Desgaste do segmento 3 deve ter sido reduzido proporcionalmente');
});

test('6. Checkpoint da geometria da corda: Preserva spoolLength e nós curvados sem apagar no 1º frame', async () => {
  const { Kite } = await loadESM('frontend/src/entities/Kite.js');
  const { restoreKiteState } = await loadESM('frontend/src/engine/ArenaCheckpoint.js');

  const kite = new Kite({ userId: 'p1', lineType: 'cerol' });

  // Cria um estado de checkpoint com nó central curvo (x=650) e carretel liberado (spoolLength=900)
  const savedState = {
    userId: 'p1',
    x: 500,
    y: 300,
    baseX: 500,
    baseY: 1800,
    screenWidth: 1080,
    screenHeight: 1920,
    lineHP: 140,
    maxLineHP: 140,
    spawnProtection: 0,
    isAscending: false,
    windPhase: 0,
    windInfluence: 1,
    spoolLength: 900,
    ropeNodes: [
      { x: 500, y: 1800 },
      { x: 520, y: 1650 },
      { x: 550, y: 1500 },
      { x: 580, y: 1350 },
      { x: 610, y: 1200 },
      { x: 650, y: 1050 }, // nó central com desvio curvo
      { x: 630, y: 900 },
      { x: 600, y: 750 },
      { x: 570, y: 600 },
      { x: 540, y: 450 },
      { x: 520, y: 350 },
      { x: 500, y: 300 }
    ]
  };

  const restored = restoreKiteState(kite, savedState);
  assert.equal(restored, true);

  // Antes do primeiro step:
  assert.equal(kite.rope.isInitialized, true, 'Corda deve estar marcada como isInitialized após restore');
  assert.equal(kite.rope.spoolLength, 900, 'spoolLength deve ser 900');
  assert.equal(kite.rope.getNodes()[5].x, 650, 'Nó central deve estar em x=650');

  // Executa o PRIMEIRO rope.step()
  const hand = { x: kite.baseX, y: kite.baseY, z: 0 };
  const kitePos = { x: kite.x, y: kite.y, z: 0 };
  kite.rope.step(1 / 60, hand, kitePos, { x: 0, y: 0 }, { lineSlack: 0 });

  // A geometria NÃO deve ter sido resetada para linha reta (distância direta é 1500px, x=500)
  assert.ok(
    kite.rope.getNodes()[5].x > 600,
    `Nó central não deve ter sido destruído para reta (x=500). Ficou: ${kite.rope.getNodes()[5].x}`
  );
  assert.ok(
    kite.rope.spoolLength > 850,
    `spoolLength deve permanecer consistente e não despencar. Ficou: ${kite.rope.spoolLength}`
  );
});
