const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

test('P2.1 - RopeCollision.closestPointsBetweenSegments: Cruzamento 2D e 3D com menor distância euclidiana', async () => {
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  // Caso 1: Cruzamento perpendicular exato em (50, 50)
  const p1 = { x: 0, y: 50, z: 0 }, q1 = { x: 100, y: 50, z: 0 };
  const p2 = { x: 50, y: 0, z: 0 }, q2 = { x: 50, y: 100, z: 0 };

  const res1 = RopeCollision.closestPointsBetweenSegments(p1, q1, p2, q2);
  assert.ok(res1.distance < 1e-6, `Distância deveria ser 0, mas foi: ${res1.distance}`);
  assert.ok(Math.abs(res1.contactPoint.x - 50) < 1e-6);
  assert.ok(Math.abs(res1.contactPoint.y - 50) < 1e-6);

  // Caso 2: Segmentos paralelos afastados por 12px
  const pPar1 = { x: 0, y: 0, z: 0 }, qPar1 = { x: 100, y: 0, z: 0 };
  const pPar2 = { x: 0, y: 12, z: 0 }, qPar2 = { x: 100, y: 12, z: 0 };

  const resPar = RopeCollision.closestPointsBetweenSegments(pPar1, qPar1, pPar2, qPar2);
  assert.ok(Math.abs(resPar.distance - 12) < 1e-6);

  // Caso 3: Segmentos reversos no espaço 3D (afastamento em Z de 6 unidades)
  const p3d1 = { x: 0, y: 0, z: 0 }, q3d1 = { x: 100, y: 0, z: 0 };
  const p3d2 = { x: 50, y: -50, z: 6 }, q3d2 = { x: 50, y: 50, z: 6 };

  const res3d = RopeCollision.closestPointsBetweenSegments(p3d1, q3d1, p3d2, q3d2);
  assert.ok(Math.abs(res3d.distance - 6) < 1e-6);
  assert.ok(Math.abs(res3d.contactPoint.x - 50) < 1e-6);
  assert.ok(Math.abs(res3d.contactPoint.z - 3) < 1e-6);
});

test('P2.2 - RopeCollision.checkRopeCollision: Detecção de colisão entre cordas físicas XPBD com espessura de cápsula', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12, lineType: 'chile' });
  const ropeB = new RopePhysics({ nodeCount: 12, lineType: 'cerol' });

  // Corda A: mão em (100, 1000) até pipa em (900, 200)
  ropeA.resetPositions({ x: 100, y: 1000, z: 0 }, { x: 900, y: 200, z: 0 });

  // Corda B: mão em (900, 1000) até pipa em (100, 200)
  // As duas cordas se cruzam no centro geométrico (x ≈ 500, y ≈ 600)
  ropeB.resetPositions({ x: 900, y: 1000, z: 0 }, { x: 100, y: 200, z: 0 });

  // Executa passos físicos com velocidades opostas nos nós
  ropeA.nodes.forEach(n => { n.vx = 8; n.vy = -2; });
  ropeB.nodes.forEach(n => { n.vx = -8; n.vy = 2; });

  const hit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.0);
  assert.equal(hit.hit, true, 'Cordas cruzadas devem acusar colisão');
  assert.ok(Math.abs(hit.x - 500) < 40, `Ponto X de contato deveria ser próximo de 500: ${hit.x}`);
  assert.ok(Math.abs(hit.y - 600) < 40, `Ponto Y de contato deveria ser próximo de 600: ${hit.y}`);
  assert.ok(hit.relativeSpeed > 10, 'Velocidade relativa deve refletir vetores opostos');
  assert.ok(hit.slidingSpeed > 0, 'Velocidade de deslizamento abrasivo deve ser positiva');
  assert.ok(Number.isFinite(hit.segmentIndexA), 'Deve identificar índice do segmento em A');
  assert.ok(Number.isFinite(hit.segmentIndexB), 'Deve identificar índice do segmento em B');
});

test('P2.3 - RopeCollision: Toque por espessura de cápsula sem interseção matemática perfeita', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12, lineType: 'kevlar' });
  const ropeB = new RopePhysics({ nodeCount: 12, lineType: 'kevlar' });

  // Cordas quase paralelas afastadas por 6px no eixo X
  ropeA.resetPositions({ x: 100, y: 1000 }, { x: 100, y: 200 });
  ropeB.resetPositions({ x: 106, y: 1000 }, { x: 106, y: 200 });

  // Sem cápsula (tolerância zero), retas paralelas nunca cruzam.
  // Com raio de Kevlar (1.45mm * 4.5 = 6.5px por corda -> raio de contato = 13px), há contato físico evidente!
  const hit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5);
  assert.equal(hit.hit, true, 'Fios próximos devem colidir pela espessura da cápsula');
  assert.ok(hit.distance <= hit.contactRadius);
});

test('P2.4 - RopeCollision: Rejeição imediata por AABB de cordas distantes', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');

  const ropeA = new RopePhysics({ nodeCount: 12 });
  const ropeB = new RopePhysics({ nodeCount: 12 });

  // Corda A na extrema esquerda
  ropeA.resetPositions({ x: 50, y: 1000 }, { x: 100, y: 200 });
  // Corda B na extrema direita
  ropeB.resetPositions({ x: 800, y: 1000 }, { x: 850, y: 200 });

  const hit = RopeCollision.checkRopeCollision(ropeA, ropeB);
  assert.equal(hit.hit, false, 'Cordas separadas horizontalmente devem ser descartadas pelo broad-phase AABB');
});
