const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('leaderboard possui modo compacto de combate e expansão temporária', () => {
  const code = read('frontend/src/ui/components/LeaderboardComponent.js');
  assert.match(code, /setCombatCompact\(/);
  assert.match(code, /combat-compact/);
  assert.match(code, /expandTemporarily\(/);
  assert.match(code, /spotlight-expanded/);
});

test('HUD expõe densidade do ranking sem conhecer DOM', () => {
  const code = read('frontend/src/ui/HUD.js');
  assert.match(code, /setCombatCompact\(active\)/);
  assert.match(code, /expandLeaderboardTemporarily/);
});

test('CSS portrait prioriza céu escondendo extras e linhas 4-5 em combate', () => {
  const css = read('frontend/src/ui/portrait-live.css');
  assert.match(css, /\.leaderboard-card\.combat-compact/);
  assert.match(css, /\.leader-row:nth-child\(n\+4\)/);
  assert.match(css, /\.spotlight-expanded/);
});