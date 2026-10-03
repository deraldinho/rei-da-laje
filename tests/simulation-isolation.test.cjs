const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('simulação fica desabilitada por padrão e só liga com flag explícita', () => {
  const { isSimulationEnabled } = require('../backend/simulationGuard');
  assert.equal(isSimulationEnabled({}), false);
  assert.equal(isSimulationEnabled({ PIPA_ENABLE_SIMULATION: '0' }), false);
  assert.equal(isSimulationEnabled({ PIPA_ENABLE_SIMULATION: '1' }), true);
});

test('rotas /api/simulate exigem o guard de simulação além do controle local', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../backend/server.js'), 'utf8');
  for (const route of ['comment', 'gift', 'likes']) {
    const expected = new RegExp(`app\\.post\\('/api/simulate/${route}',\\s*requireLocalControl,\\s*requireSimulationEnabled,`);
    assert.match(source, expected, `rota ${route} precisa estar bloqueada fora do modo de simulação`);
  }
});

test('scripts que iniciam backend e usam /api/simulate habilitam simulação explicitamente', () => {
  const testsDir = path.resolve(__dirname);
  const candidates = fs.readdirSync(testsDir).filter(name => name.endsWith('.mjs'));
  const offenders = [];
  for (const name of candidates) {
    const source = fs.readFileSync(path.join(testsDir, name), 'utf8');
    if (!source.includes('backend/server.js') || !source.includes('/api/simulate/')) continue;
    if (!source.includes("PIPA_ENABLE_SIMULATION:'1'") &&
        !source.includes("PIPA_ENABLE_SIMULATION: '1'")) offenders.push(name);
  }
  assert.deepEqual(offenders, [], `scripts sem isolamento explícito: ${offenders.join(', ')}`);
});
