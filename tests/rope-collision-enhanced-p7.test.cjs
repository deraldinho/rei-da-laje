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

  // Caso 2: X/Y cruzam e passam pelo gate de Z, mas a distância euclidiana 3D ainda excede o raio.
  ropeA.resetPositions({ x: 100, y: 900, z: 120 }, { x: 800, y: 300, z: 120 });
  ropeB.resetPositions({ x: 800, y: 900, z: 140 }, { x: 100, y: 300, z: 140 });
  const nearButSeparate = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { maxZDistance: 85 });
  assert.equal(nearButSeparate.hit, false, 'Gate de Z não substitui proximidade física 3D');
  assert.ok(nearButSeparate.minDistance > 9);

  // Caso 3: aproximação real em X/Y/Z dentro do raio físico da cápsula.
  ropeB.resetPositions({ x: 800, y: 900, z: 127 }, { x: 100, y: 300, z: 127 });
  const true3DHit = RopeCollision.checkRopeCollision(ropeA, ropeB, 4.5, { maxZDistance: 85 });
  assert.equal(true3DHit.hit, true, 'Cordas só colidem quando a menor distância 3D entra no raio de contato');
  assert.ok(true3DHit.distance <= true3DHit.contactRadius);
});

test('Item 4: Two-Way Coupling - constraint de não-penetração move ambos os fios sem injetar impulso', async () => {
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
  const trackedA = [idxA, idxA + 1].map(i => ({ x: ropeA.nodes[i].x, y: ropeA.nodes[i].y, vx: ropeA.nodes[i].x - ropeA.nodes[i].prevX, vy: ropeA.nodes[i].y - ropeA.nodes[i].prevY }));
  const trackedB = [idxB, idxB + 1].map(i => ({ x: ropeB.nodes[i].x, y: ropeB.nodes[i].y, vx: ropeB.nodes[i].x - ropeB.nodes[i].prevX, vy: ropeB.nodes[i].y - ropeB.nodes[i].prevY }));
  const anchors = {
    handAx: ropeA.nodes[0].x, handAy: ropeA.nodes[0].y,
    kiteAx: ropeA.nodes[11].x, kiteAy: ropeA.nodes[11].y,
    handBx: ropeB.nodes[0].x, handBy: ropeB.nodes[0].y,
    kiteBx: ropeB.nodes[11].x, kiteBy: ropeB.nodes[11].y
  };

  RopeCollision.applyMutualContactCoupling(ropeA, ropeB, hit, 0.4);

  const movedA = [idxA, idxA + 1].some((i, n) => Math.hypot(ropeA.nodes[i].x - trackedA[n].x, ropeA.nodes[i].y - trackedA[n].y) > 1e-9);
  const movedB = [idxB, idxB + 1].some((i, n) => Math.hypot(ropeB.nodes[i].x - trackedB[n].x, ropeB.nodes[i].y - trackedB[n].y) > 1e-9);
  assert.equal(movedA, true, 'o contato deve corrigir a corda A');
  assert.equal(movedB, true, 'o contato deve corrigir a corda B');

  for (const [rope, idx, before] of [[ropeA, idxA, trackedA], [ropeB, idxB, trackedB]]) {
    for (let n = 0; n < 2; n++) {
      const node = rope.nodes[idx + n];
      assert.ok(Math.abs((node.x - node.prevX) - before[n].vx) < 1e-9);
      assert.ok(Math.abs((node.y - node.prevY) - before[n].vy) < 1e-9);
    }
  }

  assert.equal(ropeA.nodes[0].x, anchors.handAx);
  assert.equal(ropeA.nodes[0].y, anchors.handAy);
  assert.equal(ropeA.nodes[11].x, anchors.kiteAx);
  assert.equal(ropeA.nodes[11].y, anchors.kiteAy);
  assert.equal(ropeB.nodes[0].x, anchors.handBx);
  assert.equal(ropeB.nodes[0].y, anchors.handBy);
  assert.equal(ropeB.nodes[11].x, anchors.kiteBx);
  assert.equal(ropeB.nodes[11].y, anchors.kiteBy);
});
