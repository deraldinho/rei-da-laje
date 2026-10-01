const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.resolve(__dirname, '../frontend/src/engine/App.js');
const serverPath = path.resolve(__dirname, '../backend/server.js');
const app = fs.readFileSync(appPath, 'utf8');
const server = fs.readFileSync(serverPath, 'utf8');

function between(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  assert.ok(start >= 0 && end > start, `bloco ${startToken} não encontrado`);
  return source.slice(start, end);
}

test('P15.2: autoridade inicia fail-closed e rastreia cortes pendentes', () => {
  assert.match(app, /this\.isCombatAuthority\s*=\s*false;/);
  assert.match(app, /this\._pendingCutLosers\s*=\s*new Set\(\);/);
  assert.match(app, /pendingCutIds:\s*this\._pendingCutLosers/);
  assert.match(app, /allowWear:\s*Boolean\(this\.isCombatAuthority\)/);
});
test('P15.2: handleCutSuccess apenas propõe o corte antes do evento canônico', () => {
  const body = between(app, '  handleCutSuccess(', '  destroy(');
  assert.match(body, /!this\.isCombatAuthority/);
  assert.match(body, /this\._pendingCutLosers\.add\(loserUserId\)/);
  const emitAt = body.indexOf("this.socket.emit('relinho:cut'");
  assert.ok(emitAt > 0, 'relinho:cut precisa ser emitido');
  const beforeEmit = body.slice(0, emitAt);
  assert.doesNotMatch(beforeEmit, /new FallingKite|new BrokenHandRope|this\.removeKite|winKite\.score\s*\+=/,
    'nenhum efeito irreversível pode ocorrer antes da validação do backend');
});

test('P15.2: rejeição limpa claim pendente e ressincroniza a arena', () => {
  const block = between(app, "this._socketSubscriptions.on('relinho:cut_rejected'", "this._socketSubscriptions.on('game:cut_occurred'");
  assert.match(block, /_pendingCutLosers\.delete/);
  assert.match(block, /this\.syncArena\(\)/);
});

test('P15.2: evento canônico preserva cutX/cutY igual a zero', () => {
  const block = between(app, "this._socketSubscriptions.on('game:cut_occurred'", "this._socketSubscriptions.on('competition:milestone'");
  assert.match(block, /Number\.isFinite\(data\.cutX\)\s*\?\s*data\.cutX\s*:\s*loser\.x/);
  assert.match(block, /Number\.isFinite\(data\.cutY\)\s*\?\s*data\.cutY\s*:\s*loser\.y/);
});
test('P15.2: backend valida checkpoint candidato antes de persistir estado da arena', () => {
  const block = between(server, "socket.on('relinho:cut'", "socket.on('disconnect'");
  assert.match(block, /candidateStates/);
  assert.match(block, /checkpointStates/);
  const validateAt = block.indexOf('validateCutClaim');
  const commitAt = block.indexOf('arenaStore.playerStates.set');
  assert.ok(validateAt >= 0, 'validateCutClaim precisa existir');
  assert.ok(commitAt > validateAt, 'checkpoint do claim só pode ser persistido depois que o corte for validado');
});

test('P15.2: perda de autoridade cancela claims pendentes e força reconciliação', () => {
  const block = between(app, "this._socketSubscriptions.on('arena:authority_revoked'", "this._socketSubscriptions.on('arena:authority_available'");
  assert.match(block, /this\._pendingCutLosers\.clear\(\)/);
  assert.match(block, /this\.syncArena\(\)/);
});

test('P15.2: desconexão cancela claims pendentes para não travar cortes após reconectar', () => {
  const block = between(app, "this._socketSubscriptions.on('disconnect'", 'this.hud.setConnection(this.socket.connected)');
  assert.match(block, /this\._pendingCutLosers\.clear\(\)/);
});
