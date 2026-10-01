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

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

function createMockKite(opts = {}) {
  const lineType = opts.lineType || 'algodao';
  return {
    userId: opts.userId || 'player_' + Math.random().toString(36).slice(2, 7),
    x: opts.x ?? 400,
    y: opts.y ?? 300,
    baseX: opts.baseX ?? 400,
    baseY: opts.baseY ?? 900,
    lineHP: opts.lineHP ?? 100,
    maxLineHP: opts.maxLineHP ?? 100,
    shieldCount: opts.shieldCount ?? 0,
    lineType,
    lineTension: opts.lineTension ?? 0.6,
    contactSpeed: opts.contactSpeed ?? 0,
    defenseWindowRemaining: opts.defenseWindowRemaining ?? 0,
    chatCombo: opts.chatCombo || { defense: 1, attack: 1 },
    maneuver: opts.maneuver || null,
    rope: opts.rope || null,
    calculateCombatPower: () => opts.power ?? 1,
    takeDamage(d) {
      this.lineHP -= d;
      return this.lineHP <= 0;
    },
    triggerShieldAbsorb() {},
    updateHPBar() {}
  };
}

test('P3.1 - RelinhoContactSolver: Algodão vs Algodão preserva paridade 1.0 na razão abrasiva', async () => {
  const { RelinhoContactSolver } = await loadESM('frontend/src/engine/physics/RelinhoContactSolver.js');

  const kiteA = createMockKite({ lineType: 'algodao', power: 1 });
  const kiteB = createMockKite({ lineType: 'algodao', power: 1 });
  const hitPoint = { x: 400, y: 500 };

  const work = RelinhoContactSolver.calculateFrictionalWork(kiteA, kiteB, hitPoint);
  assert.ok(work.damageRateA > 0, 'Dano A deve ser positivo');
  assert.ok(work.damageRateB > 0, 'Dano B deve ser positivo');
  assert.ok(
    Math.abs(work.damageRateA - work.damageRateB) < 1e-4,
    `Algodão vs Algodão com mesma geometria deve gerar dano idêntico: A=${work.damageRateA}, B=${work.damageRateB}`
  );
});

test('P3.2 - RelinhoContactSolver: Razão Tribológica favorece Linha Chilena e protege Kevlar', async () => {
  const { RelinhoContactSolver } = await loadESM('frontend/src/engine/physics/RelinhoContactSolver.js');

  const chileKite = createMockKite({ lineType: 'chile', power: 1 });
  const cottonKite = createMockKite({ lineType: 'algodao', power: 1 });
  const kevlarKite = createMockKite({ lineType: 'kevlar', power: 1 });
  const hitPoint = { x: 400, y: 500 };

  // Duelo 1: Chile vs Algodão
  // Chile ataca Algodão (damageRateB) vs Algodão ataca Chile (damageRateA)
  const duel1 = RelinhoContactSolver.calculateFrictionalWork(chileKite, cottonKite, hitPoint);
  assert.ok(
    duel1.damageRateB > duel1.damageRateA * 1.5,
    `Chile deve causar dano significativamente maior que Algodão devido à alta abrasividade: Chile causou ${duel1.damageRateB}, Algodão causou ${duel1.damageRateA}`
  );

  // Duelo 2: Algodão vs Kevlar
  // Algodão ataca Kevlar (damageRateB) vs Kevlar ataca Algodão (damageRateA)
  const duel2 = RelinhoContactSolver.calculateFrictionalWork(cottonKite, kevlarKite, hitPoint);
  assert.ok(
    duel2.damageRateB < duel2.damageRateA,
    `Kevlar deve sofrer menos dano que Algodão devido à alta resistência à abrasão: Kevlar sofreu ${duel2.damageRateB}, Algodão sofreu ${duel2.damageRateA}`
  );
});

test('P3.3 - RelinhoContactSolver: Desgaste de segmento localizado degrada nó atingido da corda física', async () => {
  const { RelinhoContactSolver } = await loadESM('frontend/src/engine/physics/RelinhoContactSolver.js');
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const ropeA = new RopePhysics({ numNodes: 12, totalLength: 500, lineType: 'algodao' });
  const ropeB = new RopePhysics({ numNodes: 12, totalLength: 500, lineType: 'algodao' });

  const kiteA = createMockKite({ rope: ropeA });
  const kiteB = createMockKite({ rope: ropeB });

  // Antes do combate: desgaste deve ser 0 em todos os segmentos
  assert.equal(ropeA.segmentWear[5], 0);
  assert.equal(ropeB.segmentWear[7], 0);

  const intersection = {
    x: 400,
    y: 500,
    segmentIndexA: 5,
    segmentIndexB: 7
  };

  // Simula 10 passos de relinho contínuo
  for (let step = 0; step < 10; step++) {
    RelinhoContactSolver.resolveCombatStep(kiteA, kiteB, intersection, 1);
  }

  // Segmentos colididos devem ter acumulado desgaste localizado
  assert.ok(ropeA.segmentWear[5] > 0, `Segmento 5 da corda A deveria ter acumulado desgaste, valor: ${ropeA.segmentWear[5]}`);
  assert.ok(ropeB.segmentWear[7] > 0, `Segmento 7 da corda B deveria ter acumulado desgaste, valor: ${ropeB.segmentWear[7]}`);

  // Segmentos adjacentes não atingidos diretamente devem manter integridade superior
  assert.ok(
    ropeA.getSegmentIntegrity(5) < ropeA.getSegmentIntegrity(0),
    'Segmento colidido deve ter integridade menor que segmento intacto na base'
  );
});

test('P3.4 - RelinhoContactSolver: Ruptura física instantânea quando o nó da corda atinge integridade crítica', async () => {
  const { RelinhoContactSolver } = await loadESM('frontend/src/engine/physics/RelinhoContactSolver.js');
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');

  const ropeA = new RopePhysics({ numNodes: 12, totalLength: 500, lineType: 'algodao' });
  const ropeB = new RopePhysics({ numNodes: 12, totalLength: 500, lineType: 'algodao' });

  const kiteA = createMockKite({ rope: ropeA, lineHP: 90, maxLineHP: 100 });
  const kiteB = createMockKite({ rope: ropeB, lineHP: 90, maxLineHP: 100 });

  // Força desgaste extremo no segmento 4 da corda B (simula atrito prévio acumulado)
  ropeB.segmentWear[4] = 0.96; // integridade = 0.04 (abaixo do limiar crítico de 0.05)

  const intersection = {
    x: 400,
    y: 500,
    segmentIndexA: 2,
    segmentIndexB: 4
  };

  let finalizedWinner = null;
  let finalizedLoser = null;
  const result = RelinhoContactSolver.resolveCombatStep(
    kiteA,
    kiteB,
    intersection,
    1,
    null,
    (winner, loser, pt) => {
      finalizedWinner = winner;
      finalizedLoser = loser;
      return { tied: false, winner, loser, cutX: pt.x, cutY: pt.y };
    }
  );

  assert.equal(result.tied, false, 'Combate deve resolver corte devido à ruptura do elo mais fraco');
  assert.equal(finalizedWinner.userId, kiteA.userId, 'Kite A deve ser o vencedor');
  assert.equal(finalizedLoser.userId, kiteB.userId, 'Kite B deve ser o perdedor pela quebra da corda');
});

test('P3.5 - Physics.resolveRelinhoCombat: Fachada preserva escudos e desempates tribológicos', async () => {
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  const kiteA = createMockKite({ power: 2, lineHP: 100 });
  const kiteB = createMockKite({ power: 1, lineHP: 0.2, shieldCount: 1 }); // Com escudo protetor
  const intersection = { x: 400, y: 500 };

  const outcome = Physics.resolveRelinhoCombat(kiteA, kiteB, intersection, 1);

  assert.equal(outcome.absorbedByShield, true, 'Escudo deve absorver o golpe letal');
  assert.equal(kiteB.shieldCount, 0, 'Escudo do perdedor deve ser consumido');
  assert.equal(kiteB.lineHP, kiteB.maxLineHP, 'HP do defensor salvo pelo escudo deve ser restaurado ao máximo');
});
