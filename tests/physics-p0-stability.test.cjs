const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function loadESM(relativePath) {
  return import(require('node:url').pathToFileURL(path.join(__dirname, '..', relativePath)).href);
}

test('P0.1 - evolveRelinhoContact: Fricção acumulada é estritamente independente de FPS (30, 60 e 120 FPS)', async () => {
  const { evolveRelinhoContact } = await loadESM('frontend/src/engine/RelinhoMechanics.js');

  const createKite = (vx = 0, vy = 0) => ({
    x: 300, y: 300, baseX: 100, baseY: 800,
    vx, vy, lineTension: 0.6, contactSpeed: 0
  });

  const fpsList = [30, 60, 120];
  const frictionResults = [];

  for (const fps of fpsList) {
    const kA = createKite(2, 0);
    const kB = createKite(-2, 0);
    const durationMs = 500; // 0.5 segundo de combate real
    const dtMs = 1000 / fps;

    let contactState = null;
    let now = 1000;
    const end = now + durationMs;

    contactState = evolveRelinhoContact(null, kA, kB, now);
    while (now < end - 1e-6) {
      now = Math.min(end, now + dtMs);
      contactState = evolveRelinhoContact(contactState, kA, kB, now);
    }

    frictionResults.push({ fps, friction: contactState.friction });
  }

  const f30 = frictionResults.find(r => r.fps === 30).friction;
  const f60 = frictionResults.find(r => r.fps === 60).friction;
  const f120 = frictionResults.find(r => r.fps === 120).friction;

  // A fricção acumulada ao longo de 0.5s de contato contínuo deve ser praticamente idêntica entre 30, 60 e 120 FPS
  assert.ok(Math.abs(f30 - f60) < 0.03, `Divergência excessiva entre 30 FPS (${f30}) e 60 FPS (${f60})`);
  assert.ok(Math.abs(f60 - f120) < 0.03, `Divergência excessiva entre 60 FPS (${f60}) e 120 FPS (${f120})`);
});

test('P0.2 - evolveRelinhoContact: Velocidade relativa calcula vetores opostos e perpendiculares sem anulação', async () => {
  const { evolveRelinhoContact } = await loadESM('frontend/src/engine/RelinhoMechanics.js');

  // Caso 1: Duas pipas colidindo de frente com vx opostos (+15 e -15)
  const aOpposite = { x: 300, y: 300, baseX: 100, baseY: 800, vx: 15, vy: 0 };
  const bOpposite = { x: 500, y: 300, baseX: 700, baseY: 800, vx: -15, vy: 0 };

  const contactOpposite = evolveRelinhoContact(null, aOpposite, bOpposite, 1000);
  // Velocidade relativa vetorial |15 - (-15)| = 30
  assert.equal(contactOpposite.relativeSpeed, 30);

  // Caso 2: Movimento perpendicular (vx=10, vy=0 vs vx=0, vy=10)
  const aPerp = { x: 300, y: 300, baseX: 100, baseY: 800, vx: 10, vy: 0 };
  const bPerp = { x: 300, y: 300, baseX: 100, baseY: 800, vx: 0, vy: 10 };

  const contactPerp = evolveRelinhoContact(null, aPerp, bPerp, 1000);
  // hypot(10, -10) ≈ 14.14
  assert.ok(Math.abs(contactPerp.relativeSpeed - Math.hypot(10, 10)) < 0.001);
});

test('P0.3 - Physics.finalizeCut: Dupla ruptura simultânea com escudo do perdedor nunca deixa vencedor com HP negativo', async () => {
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  const winnerKite = {
    userId: 'winner_1',
    lineHP: -4.5, // morreu simultaneamente no mesmo frame
    maxLineHP: 100,
    shieldCount: 0,
    updateHPBar: () => {}
  };

  const loserKite = {
    userId: 'loser_1',
    lineHP: -8.2,
    maxLineHP: 100,
    shieldCount: 1, // tem escudo que salvará
    updateHPBar: () => {},
    triggerShieldAbsorb: () => {}
  };

  const cutResult = Physics.finalizeCut(winnerKite, loserKite, { x: 100, y: 100 });

  assert.equal(cutResult.absorbedByShield, true);
  assert.equal(loserKite.shieldCount, 0);
  assert.equal(loserKite.lineHP, 100);

  // O vencedor DEVE ter sido salvo com HP >= 1 e NUNCA continuar com valor negativo
  assert.ok(winnerKite.lineHP >= 1, `Winner lineHP deveria ser >= 1, mas ficou: ${winnerKite.lineHP}`);
});

test('P0.4 - Broad-phase de linhas cruzadas: Detecta cruzamento mesmo com pipas distantes (> 500px)', async () => {
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');

  // Pipa A na extrema esquerda do céu (x: 100, y: 300), presa na laje central (baseX: 540, baseY: 1800)
  const kA = { x: 100, y: 300, baseX: 540, baseY: 1800 };
  // Pipa B na extrema direita do céu (x: 980, y: 300), presa na laje central (baseX: 540, baseY: 1800)
  const kB = { x: 980, y: 300, baseX: 540, baseY: 1800 };

  // Distância euclidiana entre as pipas = 880px (muito além dos 220px do contactRadius)
  const kiteDistance = Math.hypot(kA.x - kB.x, kA.y - kB.y);
  assert.ok(kiteDistance > 800);

  // AABB dos segmentos de linha
  const minAx = Math.min(kA.baseX, kA.x), maxAx = Math.max(kA.baseX, kA.x);
  const minAy = Math.min(kA.baseY, kA.y), maxAy = Math.max(kA.baseY, kA.y);
  const minBx = Math.min(kB.baseX, kB.x), maxBx = Math.max(kB.baseX, kB.x);
  const minBy = Math.min(kB.baseY, kB.y), maxBy = Math.max(kB.baseY, kB.y);

  // As caixas delimitadoras dos segmentos SE SOBREPÕEM (ambos passam pelo X: 540)
  const aabbOverlap = !(minAx > maxBx || maxAx < minBx || minAy > maxBy || maxAy < minBy);
  assert.equal(aabbOverlap, true, 'Bounding boxes das duas linhas devem se sobrepor');

  // Interseção geométrica da linha
  const inter = Physics.checkLineIntersection(
    kA.baseX, kA.baseY, kA.x, kA.y,
    kB.baseX, kB.baseY, kB.x, kB.y
  );
  assert.equal(inter.hit, true, 'Linhas devem cruzar na base');
});

test('P0.5 - ThreeSkyScene: Derivação de HP 3D usa lineHP e maxLineHP', () => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'ui', 'ThreeSkyScene.js'), 'utf8');

  // Verifica que o código não confia apenas no inexistente kite.health
  assert.match(code, /kite\.lineHP/, 'ThreeSkyScene deve ler kite.lineHP');
  assert.match(code, /kite\.maxLineHP/, 'ThreeSkyScene deve ler kite.maxLineHP');
});
