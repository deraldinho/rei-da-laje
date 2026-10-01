const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('escala visual vertical amplia 2K sem alterar dimensões lógicas do jogo', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/LiveLayout.js'), 'utf8');
  const { liveVisualScale } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.equal(liveVisualScale(1920, 1080), 1);
  assert.equal(liveVisualScale(390, 844), 1);
  assert.ok(liveVisualScale(1080, 1920) > 1.3);
  assert.ok(liveVisualScale(1440, 2560) >= 1.8);
  assert.ok(liveVisualScale(1440, 2560) <= 1.85);
  assert.equal(liveVisualScale(0, 2560), 1);
  const html = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  assert.match(html, /portrait-live\.css/);
});
