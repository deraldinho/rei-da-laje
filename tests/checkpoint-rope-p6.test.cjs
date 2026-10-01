const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadESM(relativePath) {
  const filePath = path.resolve(__dirname, '..', relativePath);
  return import(pathToFileURL(filePath).href);
}

test('P6.1 - ArenaCheckpoint: captureArena serializa integridade e desgaste de segmentos da corda', async () => {
  const { captureArena } = await loadESM('frontend/src/engine/ArenaCheckpoint.js');

  const mockKite = {
    userId: 'player_chk',
    screenWidth: 800,
    screenHeight: 1200,
    x: 400,
    y: 350,
    baseX: 400,
    baseY: 900,
    targetX: 400,
    targetY: 350,
    lineHP: 75,
    maxLineHP: 100,
    spawnProtection: 0,
    isAscending: false,
    windPhase: 1.2,
    windInfluence: 1.0,
    score: 3,
    streak: 2,
    likeBoostRemaining: 0,
    lineTension: 0.85,
    targetLineTension: 0.85,
    likeSpool: 0.1,
    likeSpoolRemaining: 0,
    defenseWindowRemaining: 0,
    chatCombo: null,
    maneuver: null,
    rope: {
      segmentWear: [0, 0, 0.42, 0.85, 0.1, 0, 0, 0, 0, 0, 0]
    }
  };

  const payload = captureArena([mockKite], 'session_123', 1000);
  assert.equal(payload.sessionId, 'session_123');
  assert.equal(payload.kites.length, 1);

  const savedKite = payload.kites[0];
  assert.equal(savedKite.userId, 'player_chk');
  assert.ok(Array.isArray(savedKite.segmentWear), 'segmentWear deve ser serializado como array');
  assert.equal(savedKite.segmentWear[3], 0.85, 'Desgaste do segmento 3 deve ser preservado');
});

test('P6.2 - ArenaCheckpoint: readArenaCheckpoint valida idade e filtra jogadores inativos', async () => {
  const { readArenaCheckpoint, CHECKPOINT_MAX_AGE_MS } = await loadESM('frontend/src/engine/ArenaCheckpoint.js');

  const rawValid = JSON.stringify({
    version: 1,
    sessionId: 'session_active',
    savedAt: 100000,
    kites: [{
      userId: 'user_1',
      x: 300, y: 300, lineHP: 80, maxLineHP: 100,
      spawnProtection: 0, windPhase: 0, windInfluence: 1
    }]
  });

  // Checkpoint muito antigo (expirado)
  const expiredMap = readArenaCheckpoint(rawValid, 'session_active', ['user_1'], 100000 + CHECKPOINT_MAX_AGE_MS + 1000);
  assert.equal(expiredMap.size, 0, 'Checkpoint expirado deve ser descartado');

  // Checkpoint válido e recente
  const validMap = readArenaCheckpoint(rawValid, 'session_active', ['user_1'], 105000);
  assert.equal(validMap.size, 1, 'Checkpoint recente deve ser aceito');
  assert.ok(validMap.has('user_1'), 'Jogador ativo deve estar no mapa recuperado');

  // Jogador não está na lista de ativos permitidos pelo backend
  const filteredMap = readArenaCheckpoint(rawValid, 'session_active', ['user_other'], 105000);
  assert.equal(filteredMap.size, 0, 'Jogador inativo na arena deve ser filtrado');
});

test('P6.3 - ArenaCheckpoint: restoreKiteState restaura segmentWear na corda física', async () => {
  const { restoreKiteState } = await loadESM('frontend/src/engine/ArenaCheckpoint.js');

  const fakeRope = {
    segmentWear: new Array(11).fill(0)
  };

  const targetKite = {
    screenWidth: 800,
    screenHeight: 1200,
    maxLineHP: 100,
    rope: fakeRope,
    updateHPBar: () => {},
    line: { update: () => {} },
    tail: { update: () => {} }
  };

  const savedState = {
    x: 420,
    y: 310,
    lineHP: 60,
    spawnProtection: 0,
    isAscending: false,
    windPhase: 0.5,
    windInfluence: 1.1,
    segmentWear: [0, 0.15, 0.72, 0.05, 0, 0, 0, 0, 0, 0, 0]
  };

  const restored = restoreKiteState(targetKite, savedState);
  assert.equal(restored, true, 'Restauração de estado deve retornar true');
  assert.equal(targetKite.lineHP, 60);
  assert.equal(fakeRope.segmentWear[2], 0.72, 'Desgaste do nó 2 da corda deve ser restaurado para 0.72');
});
