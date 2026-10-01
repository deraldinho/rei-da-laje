const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const GameRules = require('../backend/rules/gameRules');
const BuffManager = require('../backend/rules/buffManager');
const ArenaStateStore = require('../backend/arenaStateStore');
const { saveUsername, readSavedUsername, clearSavedUsername } = require('../backend/savedLiveProfile');

test('resetKites esvazia pipas ativas e fila mas preserva ranking histórico', () => {
  const rules = new GameRules(2, 5);
  rules.handlePlayerComment({ userId: 'u1', nickname: 'Jogador 1' });
  rules.handlePlayerComment({ userId: 'u2', nickname: 'Jogador 2' });
  rules.handlePlayerComment({ userId: 'u3', nickname: 'Jogador 3' }); // fila

  assert.equal(rules.activePlayers.size, 2);
  assert.equal(rules.queue.length, 1);
  assert.equal(rules.sessionStats.size, 3);

  rules.recordCut('u1', 'u2');
  assert.equal(rules.leaderId, 'u1');

  const res = rules.resetKites();
  assert.equal(res.clearedKites, 2);
  assert.equal(rules.activePlayers.size, 0);
  assert.equal(rules.queue.length, 0);
  assert.equal(rules.leaderId, null);
  assert.equal(rules.kingId, null);
  // Histórico de cortes e estatísticas permanece
  assert.equal(rules.sessionStats.size, 3);
  assert.equal(rules.sessionStats.get('u1').cuts, 1);
});

test('resetStats zera pontuações, sequências e destaques', () => {
  const rules = new GameRules(5);
  rules.handlePlayerComment({ userId: 'u1', nickname: 'Jogador 1' });
  rules.handlePlayerComment({ userId: 'u2', nickname: 'Jogador 2' });
  rules.recordCut('u1', 'u2');

  const p1 = rules.activePlayers.get('u1');
  assert.equal(p1.score, 1);
  assert.equal(rules.sessionStats.get('u1').cuts, 1);

  rules.resetStats();
  assert.equal(p1.score, 0);
  assert.equal(p1.streak, 0);
  assert.equal(p1.isKing, false);
  assert.equal(rules.leaderId, null);
  assert.equal(rules.sessionStats.get('u1').cuts, 0);
  assert.equal(rules.sessionStats.get('u1').bestStreak, 0);
});

test('resetAll limpa integralmente todos os jogadores, fila e estatísticas', () => {
  const rules = new GameRules(5);
  rules.handlePlayerComment({ userId: 'u1', nickname: 'Jogador 1' });
  rules.recordCutScore('u1');

  rules.resetAll();
  assert.equal(rules.activePlayers.size, 0);
  assert.equal(rules.queue.length, 0);
  assert.equal(rules.sessionStats.size, 0);
  assert.equal(rules.leaderId, null);
  assert.equal(rules.kingId, null);
});

test('buffManager.clearAll cancela timers e esvazia buffs e especiais', () => {
  const buffs = new BuffManager(null);
  buffs.applyGiftUpgrade('u1', { lineType: 'chile', powerMultiplier: 3, durationSeconds: 10 });
  buffs.applyGiftUpgrade('u1', { specialAbility: 'tornado', durationSeconds: 10 });

  assert.equal(buffs.activeBuffs.size, 1);
  assert.equal(buffs.activeSpecials.size, 1);

  buffs.clearAll();
  assert.equal(buffs.activeBuffs.size, 0);
  assert.equal(buffs.activeSpecials.size, 0);
});

test('ArenaStateStore.reset atualiza o arquivo no disco e gera novo sessionId no reset total', () => {
  const tmpFile = path.join(os.tmpdir(), `arena-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const store = new ArenaStateStore(tmpFile);
  const rules = new GameRules(5);
  const buffs = new BuffManager(null);

  rules.handlePlayerComment({ userId: 'u1', nickname: 'Jogador 1' });
  rules.recordCutScore('u1');
  buffs.applyGiftUpgrade('u1', { lineType: 'cerol', powerMultiplier: 1.5, durationSeconds: 5 });
  store.playerStates.set('u1', { userId: 'u1', x: 100, y: 100, lineHP: 100 });
  store.save(rules, buffs);

  const initialSessionId = store.sessionId;
  const initialData = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert.equal(initialData.players.length, 1);
  assert.equal(initialData.sessionId, initialSessionId);

  // Reset total
  const resetRes = store.reset(rules, buffs, { scope: 'all' });
  assert.notEqual(resetRes.sessionId, initialSessionId);
  assert.equal(store.playerStates.size, 0);

  const resetData = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert.equal(resetData.players.length, 0);
  assert.equal(resetData.queue.length, 0);
  assert.equal(resetData.stats.length, 0);
  assert.equal(resetData.sessionId, resetRes.sessionId);

  try { fs.unlinkSync(tmpFile); } catch (_) {}
});

test('clearSavedUsername remove arquivo de perfil do TikTok', () => {
  const tmpProfile = path.join(os.tmpdir(), `profile-test-${Date.now()}.json`);
  saveUsername('deraldinho73', tmpProfile);
  assert.equal(readSavedUsername(tmpProfile), 'deraldinho73');

  clearSavedUsername(tmpProfile);
  assert.equal(readSavedUsername(tmpProfile), null);
});
