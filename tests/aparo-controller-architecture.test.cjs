const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appCode = fs.readFileSync(path.join(root, 'frontend/src/engine/App.js'), 'utf8');

test('GameApp delega detecção e claim de aparo para controlador dedicado', () => {
  assert.match(appCode, /import \{ AparoController \} from '\.\/AparoController\.js'/);
  assert.match(appCode, /this\.aparoController = new AparoController/);
  const start = appCode.indexOf('  checkAparos(');
  const end = appCode.indexOf('  handleCutSuccess(', start);
  const block = appCode.slice(start, end);
  assert.match(block, /this\.aparoController\.check/);
  assert.doesNotMatch(block, /getCatchableSegments|checkLineIntersection|catch:claim/);
});

test('AparoController mantém claim fail-closed e sem efeito irreversível', () => {
  const controller = fs.readFileSync(path.join(root, 'frontend/src/engine/AparoController.js'), 'utf8');
  assert.match(controller, /isAuthority/);
  assert.match(controller, /socket\?\.connected/);
  assert.match(controller, /catch:claim/);
  assert.doesNotMatch(controller, /\.score\s*=|\.catchBy\(|\.catch\(/);
});