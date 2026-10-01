const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appCode = fs.readFileSync(path.join(root, 'frontend/src/engine/App.js'), 'utf8');
const serverCode = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
const GameRules = require('../backend/rules/gameRules');

test('aparo canônico aceita uma voada válida uma única vez', () => {
  const { CatchClaimRegistry } = require('../backend/catchClaimRegistry');
  let now = 1000;
  const registry = new CatchClaimRegistry({ ttlMs: 25000, now: () => now });
  const active = new Map([['catcher', { userId: 'catcher', nickname: 'Aparador' }]]);
  registry.registerCut({ loserId: 'voada', loserNick: 'Voada' });
  const claim = { catcherId: 'catcher', caughtUserId: 'voada', catchX: 120, catchY: 340 };
  const accepted = registry.claim(claim, active);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.caughtNick, 'Voada');
  assert.equal(registry.claim(claim, active).reason, 'FLYAWAY_NOT_AVAILABLE');
});

test('voada expirada ou aparador inexistente é rejeitado', () => {
  const { CatchClaimRegistry } = require('../backend/catchClaimRegistry');
  let now = 1000;
  const registry = new CatchClaimRegistry({ ttlMs: 100, now: () => now });
  const active = new Map([['catcher', { userId: 'catcher', nickname: 'Aparador' }]]);
  registry.registerCut({ loserId: 'voada', loserNick: 'Voada' });
  assert.equal(registry.claim({ catcherId: 'ghost', caughtUserId: 'voada', catchX: 1, catchY: 2 }, active).reason, 'CATCHER_NOT_ACTIVE');
  now = 1200;
  assert.equal(registry.claim({ catcherId: 'catcher', caughtUserId: 'voada', catchX: 1, catchY: 2 }, active).reason, 'FLYAWAY_NOT_AVAILABLE');
});

test('GameRules registra bônus de aparo sem inventar corte ou sequência', () => {
  const rules = new GameRules(40);
  const catcher = { userId: 'catcher', nickname: 'Aparador', score: 0, streak: 0, isKing: false };
  rules.activePlayers.set('catcher', catcher);
  rules.sessionStats.set('catcher', { entries: 1, cuts: 0, defeats: 0, bestStreak: 0, crowns: 0, kingCuts: 0, gifts: 0, diamonds: 0 });
  const result = rules.recordCatch('catcher');
  assert.equal(result.points, 2);
  assert.equal(catcher.score, 2);
  assert.equal(catcher.streak, 0);
  assert.equal(rules.sessionStats.get('catcher').cuts, 0);
  assert.equal(rules.leaderId, 'catcher');
});

test('frontend propõe aparo e só aplica efeito após evento canônico', () => {
  const start = appCode.indexOf('  checkAparos(');
  const end = appCode.indexOf('  handleCutSuccess(', start);
  const block = appCode.slice(start, end);
  const aparoCode = fs.readFileSync(path.join(root, 'frontend/src/engine/AparoController.js'), 'utf8');
  assert.match(block, /aparoController\.check/);
  assert.match(aparoCode, /catch:claim/);
  assert.doesNotMatch(aparoCode, /activeKite\.score\s*=/);
  assert.doesNotMatch(aparoCode, /flyaway\.catch(?:By)?\s*\(/);
  assert.match(appCode, /game:catch_occurred/);
});

test('backend valida claim de aparo e publica evento canônico', () => {
  const handlerCode = fs.readFileSync(path.join(root, 'backend/socketCatchHandler.js'), 'utf8');
  assert.match(serverCode, /registerCanonicalCatchHandler/);
  assert.match(handlerCode, /socket\.on\('catch:claim'/);
  assert.match(handlerCode, /catchRegistry\.claim/);
  assert.match(handlerCode, /io\.emit\('game:catch_occurred'/);
});
