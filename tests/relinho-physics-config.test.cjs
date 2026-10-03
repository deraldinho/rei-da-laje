const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const configUrl = pathToFileURL(path.resolve(__dirname, '../frontend/src/engine/physics/RelinhoPhysicsConfig.js')).href;
const materialUrl = pathToFileURL(path.resolve(__dirname, '../frontend/src/engine/physics/LineMaterial.js')).href;

const expectedDefaults = {
  abrasionK: 0.10,
  frictionMultiplier: 1.0,
  contactDamageFloor: 0.004,
  minSlideSpeed: 0.75,
  tensionMultiplier: 1,
  angleExponent: 1,
  minContactTime: 0.08,
  engagementRampSec: 0.20,
  releaseGraceSec: 0.22,
  maxWearPerTick: 0.05,
  discoveryHz: 30,
  maxSolvedContacts: 3,
  maxContactsPerRope: 3,
  maxTrackedContacts: 12,
  maxDiscoveryChecksPerScan: 96
};
test('configuração de abrasão expõe defaults exatos e sanitiza entradas perigosas', async () => {
  const { DEFAULT_RELINHO_PHYSICS_CONFIG, sanitizeRelinhoPhysicsConfig } = await import(`${configUrl}?t=${Date.now()}`);
  assert.deepEqual(DEFAULT_RELINHO_PHYSICS_CONFIG, expectedDefaults);

  const clean = sanitizeRelinhoPhysicsConfig({
    abrasionK: -10,
    frictionMultiplier: Infinity,
    minSlideSpeed: 'abc',
    maxWearPerTick: 99,
    discoveryHz: 0,
    maxSolvedContacts: -4,
    maxTrackedContacts: NaN
  });
  for (const [key, value] of Object.entries(expectedDefaults)) {
    assert.ok(Number.isFinite(clean[key]), `${key} deve permanecer finito`);
    assert.ok(clean[key] >= 0, `${key} não pode ser negativo`);
    if (key === 'maxWearPerTick') assert.ok(clean[key] <= 0.05, 'desgaste por tick deve permanecer limitado');
  }

  const partial = sanitizeRelinhoPhysicsConfig({ abrasionK: 0.06 }, { ...expectedDefaults, minSlideSpeed: 1.1 });
  assert.equal(partial.abrasionK, 0.06);
  assert.equal(partial.minSlideSpeed, 1.1);
});

test('todos os materiais de linha possuem resistência de corte positiva e calibrada', async () => {
  const { LINE_MATERIALS } = await import(`${materialUrl}?t=${Date.now()}`);
  const expected = { algodao: 1, cerol: 1.1, chile: 1.45, kevlar: 2.2, tornado: 1.65, mestre_do_ceu: 2.4 };
  for (const [type, cutResistance] of Object.entries(expected)) {
    assert.equal(LINE_MATERIALS[type].cutResistance, cutResistance, `${type} cutResistance`);
    assert.ok(LINE_MATERIALS[type].cutResistance > 0);
  }
});
test('GameApp aplica settings de relinho por sanitizador defensivo', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../frontend/src/engine/App.js'), 'utf8');
  assert.match(source, /sanitizeRelinhoPhysicsConfig/);
  assert.match(source, /this\.relinhoPhysicsConfig\s*=\s*sanitizeRelinhoPhysicsConfig\(/);
});
