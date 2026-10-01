const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const serverCode = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');

test('server delega protocolo canônico de aparo para módulo socket dedicado', () => {
  assert.match(serverCode, /registerCanonicalCatchHandler/);
  assert.match(serverCode, /registerCanonicalCatchHandler\(\{/);
  const moduleCode = fs.readFileSync(path.join(root, 'backend/socketCatchHandler.js'), 'utf8');
  assert.match(moduleCode, /socket\.on\('catch:claim'/);
  assert.match(moduleCode, /catchRegistry\.claim/);
  assert.match(moduleCode, /gameRules\.recordCatch/);
  assert.match(moduleCode, /game:catch_occurred/);
});

test('server principal não reimplementa corpo do catch:claim', () => {
  assert.doesNotMatch(serverCode, /socket\.on\('catch:claim'/);
});