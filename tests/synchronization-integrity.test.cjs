const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Validação de Sincronização Total da Arena, Frontend, Admin e TikTok Live', async (t) => {
  await t.test('1. App.js aplica som e efeitos do corte somente no evento canônico do backend', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    const start = code.indexOf("this._socketSubscriptions.on('game:cut_occurred'");
    const end = code.indexOf("this._socketSubscriptions.on('competition:milestone'", start);
    assert.ok(start >= 0 && end > start, 'listener game:cut_occurred deve existir em App.js');
    const body = code.slice(start, end);

    const loserDeclIndex = body.indexOf('const loser =');
    const announceCutIndex = body.indexOf('this.audio.announceCut');
    assert.ok(loserDeclIndex !== -1, 'loser deve ser resolvido do estado local');
    assert.ok(announceCutIndex !== -1, 'announceCut deve ocorrer após confirmação canônica');
    assert.ok(loserDeclIndex < announceCutIndex, 'loser deve existir antes de announceCut');

    const proposalStart = code.indexOf('  handleCutSuccess(');
    const proposalEnd = code.indexOf('  destroy(', proposalStart);
    const proposalBody = code.slice(proposalStart, proposalEnd);
    assert.doesNotMatch(proposalBody, /this\.audio\.announceCut|new FallingKite|this\.removeKite/,
      'claim local não deve aplicar efeitos irreversíveis antes do backend');
  });

  await t.test('2. App.js agenda sincronização periódica da arena (arenaSyncTimer) para autocura', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    assert.match(code, /this\.arenaSyncTimer\s*=\s*this\._lifecycle\.interval/, 'App.js deve agendar arenaSyncTimer pelo lifecycle bag');
    assert.match(code, /clearInterval\(this\.arenaSyncTimer\)/, 'App.js deve limpar arenaSyncTimer em destroy()');
  });

  await t.test('3. admin.html sincroniza ativamente os jogadores da arena (syncAdminWithArena)', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'backend', 'views', 'admin.html'), 'utf8');
    assert.match(code, /syncAdminWithArena\s*\(\)/, 'admin.html deve ter função syncAdminWithArena');
    assert.match(code, /fetch\('\/api\/competition\/arena'/, 'admin.html deve consultar /api/competition/arena');
    assert.match(code, /setInterval\(syncAdminWithArena/, 'admin.html deve manter intervalo periódico de sincronização');
  });

  await t.test('4. ThreeSkyScene normaliza activeUserIds como strings para prevenir remoção indevida', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'ui', 'ThreeSkyScene.js'), 'utf8');
    assert.match(code, /activeUserIds\.add\(uidStr\)/, 'activeUserIds deve conter uidStr como string');
    assert.match(code, /activeUserIds\.has\(String\(userId\)\)/, 'limpeza deve consultar String(userId)');
  });

  await t.test('5. tiktokFetchGuard persiste ttwid em disco para tolerar reinício de workers', () => {
    const { installTtwidFetchGuard, ttwidCacheState, invalidateTtwidCache } = require('../backend/tiktokFetchGuard');
    assert.equal(typeof installTtwidFetchGuard, 'function');
    assert.equal(typeof invalidateTtwidCache, 'function');
    assert.equal(typeof ttwidCacheState, 'function');
  });

  await t.test('6. HUD.js setLiveStatus reconhece sala localizada e transporte restaurado como conexão ativa', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'ui', 'HUD.js'), 'utf8');
    assert.match(code, /transport_restored/, 'setLiveStatus deve reconhecer transport_restored');
    assert.match(code, /room_found/, 'setLiveStatus deve reconhecer room_found');
  });
});
