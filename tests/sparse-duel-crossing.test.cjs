const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const dynamicsUrl = pathToFileURL(
  path.resolve(__dirname, '../frontend/src/engine/physics/KiteDynamics.js')
).href;

function kite(rank, total, windPhase = 0) {
  return { rooftopPlayer: { layoutIndex: rank, layoutTotal: total }, windPhase };
}

test('duelo de 2 pipas usa fases opostas e inverte os corredores', async () => {
  const { sparseCruiseTarget } = await import(`${dynamicsUrl}?t=${Date.now()}`);
  const width = 1000, height = 1800;
  const a = kite(0, 2, 0.17), b = kite(1, 2, 5.91);
  const t0a = sparseCruiseTarget(a, 2, 0, width, height);
  const t0b = sparseCruiseTarget(b, 2, 0, width, height);
  const halfCycle = Math.PI / 0.72;
  const t1a = sparseCruiseTarget(a, 2, halfCycle, width, height);
  const t1b = sparseCruiseTarget(b, 2, halfCycle, width, height);

  assert.ok(t0a.x > width / 2 && t0b.x < width / 2, 'primeiro estado deve cruzar os corredores');
  assert.ok(t1a.x < width / 2 && t1b.x > width / 2, 'meio ciclo deve inverter os lados');
});