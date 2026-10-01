const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

if (typeof global.window === 'undefined') {
  global.window = {
    AudioContext: class {
      constructor() { this.state = 'running'; }
      createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } }; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } }; }
      close() { return Promise.resolve(); }
    },
    speechSynthesis: {
      speaking: false,
      getVoices: () => [],
      speak: () => {},
      cancel: () => {}
    }
  };
}
class MockCanvas {
  constructor() {
    this.width = 100;
    this.height = 100;
    this.nodeName = 'CANVAS';
    this.tagName = 'CANVAS';
    this.style = {};
  }
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {}
    };
  }
}
if (typeof global.HTMLCanvasElement === 'undefined') {
  global.HTMLCanvasElement = MockCanvas;
}
if (typeof global.document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas();
      return { style: {} };
    }
  };
}

const { isLoopbackAddress, isLoopbackOrigin, isLocalRequest, canClaimCombat } = require('../backend/localControl');
const { Kite } = require('../frontend/src/entities/Kite');
const { AudioManager } = require('../frontend/src/engine/AudioManager');

test('Validação Completa das Correções da Auditoria Técnica (P0, P1, P2)', async (t) => {

  await t.test('1. Segurança e Rede: isLoopbackOrigin e proteção contra cross-origin local', () => {
    assert.equal(isLoopbackOrigin('http://localhost:3000'), true);
    assert.equal(isLoopbackOrigin('http://127.0.0.1:3000'), true);
    assert.equal(isLoopbackOrigin('http://127.0.0.1:8080'), true);
    assert.equal(isLoopbackOrigin(''), true, 'Sem origin (ex: OBS browser source ou desktop local) deve ser permitido');
    assert.equal(isLoopbackOrigin('http://evil-website.com'), false, 'Sites externos maliciosos devem ser bloqueados');
    assert.equal(isLoopbackOrigin('https://attacker.io:3000'), false);

    const maliciousReq = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { origin: 'http://malicious-site.com' }
    };
    assert.equal(isLocalRequest(maliciousReq), false, 'Requisição vinda de página cross-origin externa deve ser bloqueada mesmo em loopback');

    const safeReq = {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { origin: 'http://localhost:3000' }
    };
    assert.equal(isLocalRequest(safeReq), true);

    const maliciousSocket = {
      handshake: { address: '127.0.0.1', headers: { origin: 'http://evil.com' } }
    };
    assert.equal(canClaimCombat(maliciousSocket), false, 'Socket de site externo não pode reivindicar autoridade de combate');
  });

  await t.test('2. Backend Server: bind 127.0.0.1, fallback de produção dist/index.html e relinho:cut ack/rejection', () => {
    const serverCode = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
    assert.match(serverCode, /HOST\s*=\s*process\.env\.HOST\s*\|\|\s*'127\.0\.0\.1'/, 'server.js deve usar 127.0.0.1 por padrão');
    assert.match(serverCode, /server\.listen\(PORT,\s*HOST/, 'server.listen deve fazer bind explícito em HOST');
    assert.match(serverCode, /corsOriginValidator/, 'server.js deve utilizar validador estrito de origem CORS');
    assert.match(serverCode, /distIndex\s*=\s*path\.join\(distPath,\s*'index\.html'\)/, 'server.js deve referenciar dist/index.html');
    assert.match(serverCode, /socket\.emit\('relinho:cut_rejected'/, 'server.js deve notificar relinho:cut_rejected quando inválido');
    assert.match(serverCode, /sendAck\(\{.*ok:\s*true/, 'server.js deve responder callback ACK quando corte for validado');
  });

  await t.test('3. TikTokService: eviction de chatCommandState para prevenir vazamento de memória em live prolongada', () => {
    const serviceCode = fs.readFileSync(path.join(__dirname, '..', 'backend', 'tiktokService.js'), 'utf8');
    assert.match(serviceCode, /chatCommandState\.size\s*>\s*150/, 'emitChatActionThrottled deve monitorar o tamanho de chatCommandState');
    assert.match(serviceCode, /chatCommandState\.delete/, 'emitChatActionThrottled deve descartar entradas expiradas');
  });

  await t.test('4. App.js: Combate canônico, reconciliação sem retorno antecipado e rollback de corte rejeitado', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    assert.match(appCode, /this\._socketSubscriptions\.on\('relinho:cut_rejected'/, 'App.js deve escutar relinho:cut_rejected e ressincronizar arena');
    assert.doesNotMatch(appCode, /if\s*\(this\.isCombatAuthority\s*\|\|\s*!loserId\)\s*return;/, 'game:cut_occurred NÃO deve retornar antecipadamente para autoridade');
    assert.match(appCode, /ack\?\.ok|ack\.ok/, 'App.js deve tratar o ACK do relinho:cut antes de liberar o claim pendente');
  });

  await t.test('5. App.js: Otimização de Combate (zero-allocation pairKey sem JSON.stringify, AABB via RopeCollision)', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    assert.doesNotMatch(appCode, /JSON\.stringify\(\[kA\.userId,\s*kB\.userId\]\.sort\(\)\)/, 'App.js não deve mais usar JSON.stringify e array sort por frame no loop de combate');
    assert.match(appCode, /idA\s*<\s*idB\s*\?\s*\(idA\s*\+\s*'\|'\s*\+\s*idB\)/, 'App.js deve usar concatenação estável de strings para pairKey');
    // Passo 4: broad-phase AABB da reta (mão→pipa) foi removido intencionalmente.
    // O AABB interno de RopeCollision cobre a corda física e evita falsos descartes.
    assert.match(appCode, /RopeCollision\.checkRopeCollision/, 'App.js deve delegar AABB ao RopeCollision interno');
    assert.doesNotMatch(appCode, /Math\.min\(kA\.baseX,\s*kA\.x\)/, 'Broad-phase AABB da reta mão→pipa deve ter sido removido (substituído pelo AABB do RopeCollision)');
  });

  await t.test('6. App.js & Kite.js: Reutilização de amostra de vento e PhysicsClock (eliminação de >80 amostragens redundantes/frame)', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    // Passo 9 (ordem do frame): kite.update agora é chamado dentro do PhysicsClock com fixedDt.
    // A forma legada kite.update(delta, currentWind, this.kites.size) não existe mais no gameLoop;
    // o PhysicsClock chama kite.update(fixedDt * 60, currentWind, this.kites.size) internamente.
    assert.match(appCode, /PhysicsClock/, 'App.js deve usar PhysicsClock para física a 60 Hz fixos');
    assert.match(appCode, /this\._physicsClock\.update/, 'App.js deve chamar _physicsClock.update no gameLoop');
    assert.match(appCode, /kite\.update\(fixedDt/, 'App.js deve chamar kite.update com fixedDt dentro do PhysicsClock');

    // Teste comportamental de Kite.update aceitando objeto de vento ou número
    const kite = new Kite({ userId: 'test_k', nickname: 'Tester' });
    const preSampledWind = { x: 14.5, y: -2.3, speed: 15 };
    kite.update(1, preSampledWind, 1);
    assert.ok(Number.isFinite(kite.x), 'Kite.update deve operar normalmente com objeto pré-amostrado de vento');
    kite.update(1, 10.5, 1);
    assert.ok(Number.isFinite(kite.x), 'Kite.update deve ser retrocompatível com timestamp escalar de vento');
  });

  await t.test('7. App.js: Checkpoint com Dirty Flag e sincronização de 3D sem trabalho redundante por frame', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    assert.match(appCode, /this\._checkpointDirty\s*=\s*false/, 'App.js deve gerenciar dirty flag para checkpoints');
    assert.match(appCode, /markDirtyCheckpoint/, 'App.js deve expor método markDirtyCheckpoint');
    assert.match(appCode, /if\s*\(!force\s*&&\s*!this\._checkpointDirty\)\s*return/, 'saveArenaCheckpoint deve ignorar gravações sem alteração');
    assert.match(appCode, /if\s*\(!force\s*&&\s*this\._lastIs3D\s*===\s*is3D\s*&&\s*!this\._sync3DDirty\)\s*return/, 'sync3DDisplay deve evitar percorrer pipas se estado visual 3D não mudou');
  });

  await t.test('8. ThreeSkyScene: Troca dinâmica de decalque/badge em coroação/liderança e constante LINE_COLORS hoisted', () => {
    const threeCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'ui', 'ThreeSkyScene.js'), 'utf8');
    assert.match(threeCode, /const\s+LINE_COLORS\s*=\s*Object\.freeze/, 'ThreeSkyScene deve definir LINE_COLORS fora do loop');
    assert.match(threeCode, /k3d\.userData\.currentDecalKey\s*!==\s*expectedDecalKey/, 'ThreeSkyScene deve atualizar decalque da pipa quando chave mudar');
    assert.match(threeCode, /p3d\.userData\.currentDecalKey\s*!==\s*expectedDecalKey/, 'ThreeSkyScene deve atualizar badge do boneco quando chave mudar');
    assert.match(threeCode, /for\s*\(const\s+k3d\s+of\s+this\.kites3D\.values\(\)\)/, 'purgeTextureCache deve proteger texturas ainda referenciadas por meshes ativos');
  });

  await t.test('9. Lifecycle completo: AudioManager.destroy() e App.js destroy com cancelamento de listeners', () => {
    const audio = new AudioManager();
    assert.equal(typeof audio.destroy, 'function', 'AudioManager deve ter método destroy()');
    audio.destroy();
    assert.equal(audio.ctx, null, 'AudioManager.destroy() deve descartar o AudioContext');

    const appCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'src', 'engine', 'App.js'), 'utf8');
    assert.match(appCode, /this\._lifecycle\.listen\(window,\s*'keydown',\s*this\._onKeyDown\)/, 'App.js deve registrar teclado no lifecycle bag');
    assert.match(appCode, /this\._lifecycle\.dispose\(\)/, 'App.js destroy deve remover listeners e timers registrados no lifecycle bag');
    assert.match(appCode, /this\._socketSubscriptions\.dispose\(\)/, 'App.js destroy deve desconectar apenas os listeners de socket do GameApp');
    assert.match(appCode, /this\.audio\.destroy\(\)/, 'App.js destroy deve invocar audio.destroy()');
  });
});
