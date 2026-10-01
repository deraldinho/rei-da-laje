const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

function createMockKiteWithRope(RopePhysics, opts = {}) {
  const rope = new RopePhysics({ nodeCount: 12, lineType: opts.lineType || 'algodao' });
  rope.resetPositions(
    { x: opts.baseX ?? 400, y: opts.baseY ?? 900, z: 0 },
    { x: opts.x ?? 400, y: opts.y ?? 300, z: 0 }
  );
  return {
    userId: opts.userId || 'player_p4',
    x: opts.x ?? 400,
    y: opts.y ?? 300,
    baseX: opts.baseX ?? 400,
    baseY: opts.baseY ?? 900,
    screenWidth: 800,
    screenHeight: 1200,
    lineHP: 100,
    maxLineHP: 100,
    isAscending: false,
    spawnProtection: 0,
    lineTension: 0.6,
    lineSlack: 0,
    contactSpeed: 0,
    rotation: 0,
    rope,
    maneuver: opts.maneuver || null
  };
}

test('P4.1 - Manobra Retão: Recolhe carretel (pullIn), estica a corda e eleva a tensão natural', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { applyManeuverMovement } = await loadESM('frontend/src/engine/Maneuvers.js');

  const kite = createMockKiteWithRope(RopePhysics, {
    maneuver: { name: 'retao', duration: 30, remaining: 29, speed: 1.55, reach: 240 }
  });

  const initialSpool = kite.rope.spoolLength;
  const initialTension = kite.rope.tension;

  // Executa passos da manobra
  for (let step = 0; step < 5; step++) {
    applyManeuverMovement(kite, [], 1);
  }

  assert.ok(
    kite.rope.spoolLength < initialSpool,
    `Spool da corda deve diminuir com pullIn do retão: antes=${initialSpool}, depois=${kite.rope.spoolLength}`
  );
  assert.ok(
    kite.rope.tension >= initialTension,
    `Tensão da corda deve subir com retão: antes=${initialTension}, depois=${kite.rope.tension}`
  );
  assert.equal(kite.lineTension, 1.0, 'lineTension lógica do retão deve estar no máximo');
});

test('P4.2 - Manobra Despicada: Libera linha (releaseSpool) gerando folga dinâmica para arrasto do vento', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { applyManeuverMovement } = await loadESM('frontend/src/engine/Maneuvers.js');

  const kite = createMockKiteWithRope(RopePhysics, {
    maneuver: { name: 'despicar', duration: 30, remaining: 29, speed: 1.35, reach: 180, windDir: 1 }
  });

  const initialSpool = kite.rope.spoolLength;

  for (let step = 0; step < 5; step++) {
    applyManeuverMovement(kite, [], 1, { x: 1.2, y: 0.1 });
  }

  assert.ok(
    kite.rope.spoolLength > initialSpool,
    `Spool da corda deve aumentar com releaseSpool da despicada: antes=${initialSpool}, depois=${kite.rope.spoolLength}`
  );
  assert.ok(kite.lineSlack > 0, 'lineSlack deve ser ativado na despicada');
});

test('P4.3 - Manobra Mergulho: Alterna afrouxamento na descida com tração ágil na subida', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { applyManeuverMovement } = await loadESM('frontend/src/engine/Maneuvers.js');

  const kite = createMockKiteWithRope(RopePhysics, {
    y: 400,
    maneuver: { name: 'mergulho', duration: 30, remaining: 29, speed: 1.5, reach: 220, divePhase: 'dive' }
  });

  const initialSpool = kite.rope.spoolLength;

  // Fase 1: Descida (dive)
  applyManeuverMovement(kite, [], 1);
  assert.ok(kite.rope.spoolLength >= initialSpool, 'Durante o mergulho para baixo o carretel cede linha');

  // Fase 2: Subida (climb)
  kite.maneuver.divePhase = 'climb';
  const spoolBeforeClimb = kite.rope.spoolLength;
  applyManeuverMovement(kite, [], 1);
  assert.ok(kite.rope.spoolLength < spoolBeforeClimb, 'Durante a subida do mergulho a linha é recolhida rapidamente');
});

test('P4.4 - Manobra Aparadas: Mantém tração defensiva firme sem soltar linha', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { applyManeuverMovement } = await loadESM('frontend/src/engine/Maneuvers.js');

  const kite = createMockKiteWithRope(RopePhysics, {
    maneuver: { name: 'aparar_retao', duration: 45, remaining: 44, reach: 150 }
  });

  const initialSpool = kite.rope.spoolLength;
  applyManeuverMovement(kite, [], 1);

  assert.ok(
    kite.rope.spoolLength <= initialSpool,
    'Aparada deve manter a corda firme e controlada sem soltar linha no carretel'
  );
});
