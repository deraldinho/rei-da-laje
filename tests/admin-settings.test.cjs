const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SettingsManager = require('../backend/settingsManager');

test('SettingsManager: carrega padrões e valida schema e limites sanitizados', () => {
  const tmpFile = path.join(os.tmpdir(), `test-settings-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const mgr = new SettingsManager(tmpFile);

  const initial = mgr.getSettings();
  assert.equal(initial.kiteScale, 1.55);
  assert.equal(initial.kiteNameScale, 1.15);
  assert.equal(initial.theme, 'RJ');
  assert.equal(initial.sceneMode, '3d');
  assert.equal(initial.lineOpacity, 0.85);
  assert.equal(initial.shadowsEnabled, true);
  assert.equal(initial.top5Scale, 1.0);
  assert.equal(initial.top5Style, 'glass');
  assert.equal(initial.top5ShowExtras, true);
  assert.equal(initial.masterVolume, 1.0);
  assert.equal(initial.narratorEnabled, true);
  assert.equal(initial.narratorVolume, 0.9);
  assert.equal(initial.sfxEnabled, true);
  assert.equal(initial.sfxVolume, 0.85);
  assert.equal(initial.boomboxEnabled, true);
  assert.equal(initial.windIntensity, 'moderado');
  assert.equal(initial.windDirection, 'auto');
  assert.equal(initial.relinhoPace, 'normal');
  assert.equal(initial.maxKites, 40);
  assert.equal(initial.winStreakKing, 5);
  assert.equal(initial.spawnProtectionSec, 3);
  assert.equal(initial.buffDurationSec, 60);
  assert.equal(initial.hpRegenEnabled, true);
  assert.equal(initial.hpRegenSpeed, 'normal');

  // Teste de sanitização com valores extremos
  const updated = mgr.updateSettings({
    kiteScale: 99.9, // deve limitar a 2.5
    kiteNameScale: 99.9, // deve limitar a 2.5
    top5Scale: 99.9, // deve limitar a 1.4
    top5Style: 'CYBERPUNK', // normaliza para lowercase
    top5ShowExtras: false,
    theme: 'sp',     // deve normalizar para SP
    sceneMode: 'transparent',
    lineOpacity: -0.5, // deve limitar a 0.2
    shadowsEnabled: false,
    masterVolume: 1.5, // deve limitar a 1.0
    windIntensity: 'tempestade',
    windDirection: 'left',
    relinhoPace: 'frenetico',
    maxKites: 999, // deve limitar a 40
    winStreakKing: 10,
    spawnProtectionSec: 8,
    buffDurationSec: 120
  });

  assert.equal(updated.kiteScale, 2.5);
  assert.equal(updated.kiteNameScale, 2.5);
  assert.equal(updated.top5Scale, 1.4);
  assert.equal(updated.top5Style, 'cyberpunk');
  assert.equal(updated.top5ShowExtras, false);
  assert.equal(updated.theme, 'SP');
  assert.equal(updated.sceneMode, 'transparent');
  assert.equal(updated.lineOpacity, 0.2);
  assert.equal(updated.shadowsEnabled, false);
  assert.equal(updated.masterVolume, 1.0);
  assert.equal(updated.windIntensity, 'tempestade');
  assert.equal(updated.windDirection, 'left');
  assert.equal(updated.relinhoPace, 'frenetico');
  assert.equal(updated.maxKites, 40);
  assert.equal(updated.winStreakKing, 10);
  assert.equal(updated.spawnProtectionSec, 8);
  assert.equal(updated.buffDurationSec, 120);

  // Verifica persistência no disco
  assert.equal(fs.existsSync(tmpFile), true);
  const reloaded = new SettingsManager(tmpFile);
  assert.equal(reloaded.getSettings().theme, 'SP');
  assert.equal(reloaded.getSettings().kiteScale, 2.5);

  // Teste de reset para os padrões
  const defaults = mgr.resetSettings();
  assert.equal(defaults.kiteScale, 1.55);
  assert.equal(defaults.theme, 'RJ');
  assert.equal(defaults.sceneMode, '3d');

  try { fs.unlinkSync(tmpFile); } catch (_) {}
});

test('admin.html: possui todos os controles de configuração visual, áudio, vento, regras e ações de jogador', () => {
  const htmlPath = path.join(__dirname, '..', 'backend', 'views', 'admin.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Controles Visuais & 3D
  assert.match(html, /id="cfgKiteScale"/, 'Slider de escala de pipa presente');
  assert.match(html, /id="cfgKiteNameScale"/, 'Slider de escala do nome da pipa presente');
  assert.match(html, /id="cfgTop5Scale"/, 'Slider de escala do top 5 presente');
  assert.match(html, /id="cfgTop5Style"/, 'Seletor de estilo do top 5 presente');
  assert.match(html, /id="cfgTop5ShowExtras"/, 'Seletor de extras do top 5 presente');
  assert.match(html, /id="cfgTheme"/, 'Seletor de tema presente');
  assert.match(html, /id="cfgSceneMode"/, 'Seletor de modo 3d/transparente presente');
  assert.match(html, /id="cfgLineOpacity"/, 'Slider de opacidade da linha presente');
  assert.match(html, /id="cfgShadows"/, 'Toggle de sombras PCF presente');

  // Controles de Áudio & Locutor
  assert.match(html, /id="cfgMasterVol"/, 'Slider de volume master presente');
  assert.match(html, /id="cfgNarrator"/, 'Toggle de locutor TTS presente');
  assert.match(html, /id="cfgNarratorVol"/, 'Slider de volume do locutor presente');
  assert.match(html, /id="cfgSfx"/, 'Toggle de SFX presente');
  assert.match(html, /id="cfgSfxVol"/, 'Slider de volume SFX presente');
  assert.match(html, /id="cfgBoombox"/, 'Toggle de caixa de som da laje presente');

  // Controles de Vento & Física
  assert.match(html, /id="cfgWindIntensity"/, 'Seletor de intensidade do vento presente');
  assert.match(html, /id="cfgWindDirection"/, 'Seletor de direção do vento presente');
  assert.match(html, /id="cfgRelinhoPace"/, 'Seletor de ritmo de combate presente');

  // Controles de Regras & Competição
  assert.match(html, /id="cfgMaxKites"/, 'Seletor de limite de pipas presente');
  assert.match(html, /id="cfgWinStreakKing"/, 'Seletor de streak para rei presente');
  assert.match(html, /id="cfgSpawnProtection"/, 'Input de proteção de spawn presente');
  assert.match(html, /id="cfgBuffDuration"/, 'Input de duração de buff presente');
  assert.match(html, /id="cfgHpRegen"/, 'Toggle de regeneração de HP presente');
  assert.match(html, /id="cfgHpRegenSpeed"/, 'Seletor de velocidade de regeneração presente');

  // Ações Administrativas de Jogador Selecionado
  assert.match(html, /id="btnAdminCrown"/, 'Botão de coroar rei presente');
  assert.match(html, /id="btnAdminCut"/, 'Botão de cortar pipa presente');
  assert.match(html, /id="adminManeuverSelect"/, 'Seletor de manobras especiais presente');
  assert.match(html, /id="adminBuffSelect"/, 'Seletor de buffs presente');
  assert.match(html, /executePlayerAction\('kick'\)/, 'Ação de kick presente');

  // Barra de Sincronização & Persistência
  assert.match(html, /id="settingsSyncText"/, 'Texto de status de sincronização presente');
  assert.match(html, /id="btnSaveSettings"/, 'Botão de salvar configurações presente');
  assert.match(html, /resetSettingsModal\(\)/, 'Botão de resetar configurações presente');
});

test('GameRules: winStreakKing configurável altera o limite de cortes para virar rei', () => {
  const GameRules = require('../backend/rules/gameRules');
  // Regra padrão: 5 cortes
  const defaultRules = new GameRules(10, 100, 100, 5);
  for (const id of ['p1', 'p2']) defaultRules.handlePlayerComment({ userId: id });
  for (let i = 0; i < 3; i++) {
    if (!defaultRules.activePlayers.has('p2')) defaultRules.handlePlayerComment({ userId: 'p2' });
    defaultRules.recordCut('p1', 'p2');
  }
  assert.equal(defaultRules.activePlayers.get('p1').streak, 3);
  assert.equal(defaultRules.kingId, null, 'Com streak 3 e meta 5, ainda não deve virar rei');

  // Regra personalizada via admin: 3 cortes
  const fastKingRules = new GameRules(10, 100, 100, 3);
  for (const id of ['k1', 'k2']) fastKingRules.handlePlayerComment({ userId: id });
  for (let i = 0; i < 3; i++) {
    if (!fastKingRules.activePlayers.has('k2')) fastKingRules.handlePlayerComment({ userId: 'k2' });
    fastKingRules.recordCut('k1', 'k2');
  }
  assert.equal(fastKingRules.activePlayers.get('k1').streak, 3);
  assert.equal(fastKingRules.kingId, 'k1', 'Com meta 3, deve virar rei imediatamente no 3º corte');
  assert.equal(fastKingRules.activePlayers.get('k1').isKing, true);
});

test('Kite: hpRegenEnabled e hpRegenSpeed controlam a regeneração fora de combate', () => {
  const source = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Kite.js'), 'utf8').replace(/\r\n/g, '\n');
  const match = source.match(/  regenHP\(delta\) \{([\s\S]*?)\n  \}\n\n  renderKite\(/);
  assert.ok(match, 'método de regeneração deve existir');
  const regenHP = new Function('delta', match[1]);

  const mockKite = (hp = 50, enabled = true, speed = 'normal') => ({
    lineHP: hp,
    maxLineHP: 100,
    isInCombat: false,
    hpRegenEnabled: enabled,
    hpRegenSpeed: speed,
    updateHPBar() {},
    regenHP
  });

  // 1. Quando desativado pelo admin (hpRegenEnabled = false), linha não cura
  const disabled = mockKite(50, false, 'normal');
  disabled.regenHP(360);
  assert.equal(disabled.lineHP, 50, 'Regeneração desabilitada não deve alterar HP');

  // 2. Velocidade lenta (0.5x): 360 frames curam 0.5 HP (divisor 720)
  const slow = mockKite(50, true, 'lenta');
  slow.regenHP(360);
  assert.equal(slow.lineHP, 50.5);

  // 3. Velocidade rápida (2.5x): 144 frames curam 1.0 HP (divisor 144)
  const fast = mockKite(50, true, 'rapida');
  fast.regenHP(144);
  assert.equal(fast.lineHP, 51.0);
});

test('ThreeSkyScene: setKiteScale aceita escalas e atualiza customKiteScale', () => {
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
  assert.ok(threeSource.includes('setKiteScale(scale)'), 'setKiteScale deve estar definido em ThreeSkyScene');
  assert.ok(threeSource.includes('this.customKiteScale = val;'), 'setKiteScale deve atribuir a customKiteScale');
});

test('ThreeSkyScene: setKiteNameScale aceita escalas e atualiza customKiteNameScale', () => {
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
  assert.ok(threeSource.includes('setKiteNameScale(scale)'), 'setKiteNameScale deve estar definido em ThreeSkyScene');
  assert.ok(threeSource.includes('this.customKiteNameScale = val;'), 'setKiteNameScale deve atribuir a customKiteNameScale');
});

test('ThreeSkyScene: resize atualiza aspect ratio da câmera e dimensões do renderer', () => {
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
  assert.ok(threeSource.includes('resize(width, height) {'), 'resize deve estar definido em ThreeSkyScene');
  assert.ok(threeSource.includes('this.camera.aspect = w / h;'), 'resize deve atualizar aspect ratio');
  assert.ok(threeSource.includes('this.renderer.setSize(w, h, false);'), 'resize deve redimensionar renderer');
});

test('LeaderboardComponent: setTop5Scale, setTop5Style, setTop5ShowExtras configuram classes e estilos', () => {
  const leadSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/components/LeaderboardComponent.js'), 'utf8');
  assert.ok(leadSource.includes('setTop5Scale(scale)'), 'setTop5Scale deve estar definido');
  assert.ok(leadSource.includes('setTop5Style(style)'), 'setTop5Style deve estar definido');
  assert.ok(leadSource.includes('setTop5ShowExtras(show)'), 'setTop5ShowExtras deve estar definido');
  assert.ok(leadSource.includes('classList.toggle(\'hide-extras\''), 'setTop5ShowExtras deve alternar hide-extras');
});

test('Kite: spawnProtectionSec dinâmico protege novas pipas pelo tempo configurado', () => {
  const kiteSource = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Kite.js'), 'utf8');
  assert.ok(kiteSource.includes('static spawnProtectionSec = 3;'), 'Kite deve ter spawnProtectionSec estático');
  assert.ok(kiteSource.includes('setSpawnProtection(sec)'), 'Kite deve ter método setSpawnProtection');
  assert.ok(kiteSource.includes('Kite.spawnProtectionSec || 3'), 'Construtor deve aplicar spawnProtectionSec configurado');
});

test('admin.html: Card 4 contém botões de simulação de combate e resgate (#pegar)', () => {
  const htmlPath = path.join(__dirname, '..', 'backend', 'views', 'admin.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /simulateAction\('puxar'\)/, 'Botão puxar presente');
  assert.match(html, /simulateAction\('descarregar'\)/, 'Botão descarregar presente');
  assert.match(html, /simulateAction\('embicar'\)/, 'Botão embicar presente');
  assert.match(html, /simulateCatch\(\)/, 'Botão resgatar #pegar presente');
  assert.match(html, /simulateLikes\(\)/, 'Botão de likes presente');
});

test('App.js: kick individual remove a pipa alvo sem reiniciar a arena inteira', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/App.js'), 'utf8');
  assert.ok(appSource.includes("scope === 'single_player' && data?.kickedId"), 'App.js deve tratar reset single_player');
  assert.ok(appSource.includes("this.removeKite(data.kickedId)"), 'App.js deve remover pipa kickada');
});

