const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const spawnModule = pathToFileURL(path.join(root, 'frontend/src/engine/SpawnLayout.js')).href;
const rooftopModule = pathToFileURL(path.join(root, 'frontend/src/ui/RooftopLayout.js')).href;

function intersects(a, b, c, d) {
  const orient = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

test('40 pipas protegidas nascem em corredores sem cruzamentos artificiais', async () => {
  const { spawnTargetForRank } = await import(`${spawnModule}?t=${Date.now()}`);
  const { rooftopPlayerLayout, rooftopHandAnchor, rooftopSlotOrder } = await import(rooftopModule);
  const width = 1080, height = 1920, total = 40;
  const order = rooftopSlotOrder(total, width, height);
  const lines = order.map((slotIndex, rank) => {
    const slot = rooftopPlayerLayout(slotIndex, total, width, height);
    const hand = rooftopHandAnchor(slot.x, slot.y, slot.scale, slot.scale, 0);
    return { hand, kite: spawnTargetForRank(rank, total, width, height) };
  });

  let crossings = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (intersects(lines[i].hand, lines[i].kite, lines[j].hand, lines[j].kite)) crossings++;
    }
  }
  assert.equal(crossings, 0);
});

test('stabilizeSpawnKite teleporta somente pipa protegida e realinha RopePhysics', async () => {
  const { stabilizeSpawnKite } = await import(`${spawnModule}?t=${Date.now()}-2`);
  let resetArgs = null;
  const kite = {
    isAscending: true,
    spawnProtection: 3,
    spawnLayoutEligible: true,
    baseX: 100,
    baseY: 1800,
    baseZ: 0,
    z: 120,
    line: { visualBaseX: 110, visualBaseY: 1750 },
    rope: { resetPositions: (...args) => { resetArgs = args; } },
    x: 900,
    y: 900,
    targetX: 900,
    targetY: 400,
    vx: 12,
    vy: -4
  };

  assert.equal(stabilizeSpawnKite(kite, 0, 40, 1080, 1920), true);
  assert.equal(kite.x, kite.targetX);
  assert.equal(kite.y, kite.targetY + 45);
  assert.equal(kite.vx, 0);
  assert.equal(kite.vy, 0);
  assert.deepEqual(resetArgs[0], { x: 110, y: 1750, z: 0 });
  assert.deepEqual(resetArgs[1], { x: kite.x, y: kite.y, z: 120 });

  kite.isAscending = false;
  const x = kite.x;
  assert.equal(stabilizeSpawnKite(kite, 1, 40, 1080, 1920), false);
  assert.equal(kite.x, x, 'pipa já em combate não pode ser reposicionada');
});

test('GameApp aplica estabilização após ordenar bonecos e não em checkpoint restaurado', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.join(root, 'frontend/src/engine/App.js'), 'utf8');
  assert.match(source, /import\s*\{\s*stabilizeSpawnKite\s*\}\s*from\s*['"]\.\/SpawnLayout\.js['"]/);
  assert.match(source, /stabilizeSpawnKite\(kite,\s*index,\s*ordered\.length,\s*w,\s*h\)/);
  assert.match(source, /kite\.spawnLayoutEligible\s*=\s*!checkpoint/);
});
