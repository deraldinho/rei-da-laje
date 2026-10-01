const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

test('Item 2: Cruzamento Real em "X" - Rejeita fios paralelos e valida ângulo autêntico de corte', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });
  const ropeB = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });

  // Caso 1: Duas cordas paralelas (voando lado a lado com 4px de separação)
  ropeA.resetPositions({ x: 200, y: 1000, z: 0 }, { x: 200, y: 200, z: 0 });
  ropeB.resetPositions({ x: 204, y: 1000, z: 0 }, { x: 204, y: 200, z: 0 });

  // Sem minSinAngle, o contato de cápsula acusa proximidade
  const rawHit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5);
  assert.equal(rawHit.hit, true, 'Sem filtro, cápsula detecta proximidade física');
  assert.equal(rawHit.isXCrossing, false, 'Fios paralelos não devem ser marcados como X-Crossing');

  // Com minSinAngle = 0.15, o relinho é rejeitado porque não há cruzamento em "X"
  const xHit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { minSinAngle: 0.15 });
  assert.equal(xHit.hit, false, 'Fios paralelos devem ser rejeitados do combate de relinho');
  assert.equal(xHit.reason, 'PARALLEL_OR_GLANCING');

  // Caso 2: Cruzamento em "X" autêntico (ângulo pronunciado)
  ropeA.resetPositions({ x: 100, y: 900, z: 0 }, { x: 800, y: 300, z: 0 });
  ropeB.resetPositions({ x: 800, y: 900, z: 0 }, { x: 100, y: 300, z: 0 });

  const realCrossing = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { minSinAngle: 0.15 });
  assert.equal(realCrossing.hit, true, 'Cruzamento em X deve ser aceito');
  assert.equal(realCrossing.isXCrossing, true);
  assert.ok(realCrossing.sinAngle >= 0.15, `sinAngle deve ser >= 0.15: ${realCrossing.sinAngle}`);
});

test('Item 3: Profundidade 3D (Z-Aware Collision) - Rejeita relinho entre planos Z distantes', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12 });
  const ropeB = new RopePhysics({ nodeCount: 12 });

  // Caso 1: Cruzam em X e Y, mas com separação Z de 180 unidades (ex: Tier 0 vs Tier 2 no céu 3D)
  ropeA.resetPositions({ x: 100, y: 900, z: 230 }, { x: 800, y: 300, z: 230 });
  ropeB.resetPositions({ x: 800, y: 900, z: 50 },  { x: 100, y: 300, z: 50 });

  const distantZHit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { maxZDistance: 85 });
  assert.equal(distantZHit.hit, false, 'Cordas em planos Z muito distantes não devem colidir');
  assert.equal(distantZHit.reason, 'Z_SEPARATION');
  assert.ok(distantZHit.deltaZ > 85, `Delta Z deve ser superior ao limite: ${distantZHit.deltaZ}`);

  // Caso 2: Cruzam em X e Y, no mesmo plano ou planos próximos (separação Z de 20 unidades)
  ropeA.resetPositions({ x: 100, y: 900, z: 120 }, { x: 800, y: 300, z: 120 });
  ropeB.resetPositions({ x: 800, y: 900, z: 140 }, { x: 100, y: 300, z: 140 });

  const closeZHit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { maxZDistance: 85 });
  assert.equal(closeZHit.hit, true, 'Cordas no mesmo corredor aéreo Z devem colidir normalmente');
  assert.ok(closeZHit.deltaZ <= 85);
});

test('Item 4: Two-Way Coupling - Força mútua e acoplamento elástico engatam nós em contato', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12, lineType: 'chile' });
  const ropeB = new RopePhysics({ nodeCount: 12, lineType: 'chile' });

  ropeA.resetPositions({ x: 200, y: 800, z: 0 }, { x: 800, y: 200, z: 0 });
  ropeB.resetPositions({ x: 800, y: 800, z: 0 }, { x: 200, y: 200, z: 0 });

  const hit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5);
  assert.equal(hit.hit, true);

  const idxA = hit.segmentIndexA;
  const idxB = hit.segmentIndexB;
  const initialDist = Math.hypot(
    ropeA.nodes[idxA].x - ropeB.nodes[idxB].x,
    ropeA.nodes[idxA].y - ropeB.nodes[idxB].y
  );

  // Posições originais das âncoras (mão: nó 0, pipa: nó 11)
  const handAx = ropeA.nodes[0].x, handAy = ropeA.nodes[0].y;
  const kiteAx = ropeA.nodes[11].x, kiteAy = ropeA.nodes[11].y;

  // Aplica Two-Way Coupling
  RopeCollision.applyMutualContactCoupling(ropeA, ropeB, hit, 0.4);

  const coupledDist = Math.hypot(
    ropeA.nodes[idxA].x - ropeB.nodes[idxB].x,
    ropeA.nodes[idxA].y - ropeB.nodes[idxB].y
  );

  assert.ok(coupledDist < initialDist, `Distância entre os nós acoplados deve diminuir: antes=${initialDist}, depois=${coupledDist}`);

  // Âncoras com invMass = 0 permanecem inalteradas
  assert.equal(ropeA.nodes[0].x, handAx, 'Âncora da mão não deve ser deslocada');
  assert.equal(ropeA.nodes[0].y, handAy, 'Âncora da mão não deve ser deslocada');
  assert.equal(ropeA.nodes[11].x, kiteAx, 'Âncora da pipa não deve ser deslocada');
  assert.equal(ropeA.nodes[11].y, kiteAy, 'Âncora da pipa não deve ser deslocada');
});
