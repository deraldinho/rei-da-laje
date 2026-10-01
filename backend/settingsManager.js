const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = Object.freeze({
  // Visual & Cenário 3D
  kiteScale: 1.55,           // 0.8 a 2.5 (escala visual das pipas)
  kiteNameScale: 1.15,       // 0.6 a 2.5 (escala do apelido 3D sobre a pipa)
  theme: 'RJ',              // 'RJ' | 'SP' | 'SSA'
  sceneMode: '3d',          // '3d' | 'transparent'
  cameraMode: 'normal',     // 'normal' | 'cinematic' | 'panoramic'
  lineOpacity: 0.85,        // 0.3 a 1.0
  shadowsEnabled: true,     // true | false

  // TOP 5 Live & Overlay HUD
  top5Scale: 1.0,           // 0.7 a 1.4 (escala do placar TOP 5 na tela)
  top5Style: 'glass',       // 'glass' | 'cyberpunk' | 'gold' | 'minimal'
  top5ShowExtras: true,     // true | false (exibir recorde, hall da fama, etc.)

  // Áudio & Sonoplastia
  masterVolume: 1.0,        // 0.0 a 1.0
  narratorEnabled: true,    // true | false
  narratorVolume: 0.9,      // 0.0 a 1.0
  sfxEnabled: true,         // true | false
  sfxVolume: 0.85,          // 0.0 a 1.0
  boomboxEnabled: true,     // true | false

  // Vento & Física
  windIntensity: 'moderado',// 'fraco' | 'moderado' | 'forte' | 'tempestade'
  windDirection: 'auto',    // 'auto' | 'left' | 'right'
  relinhoPace: 'normal',    // 'calmo' | 'normal' | 'frenetico'

  // Regras da Competição
  maxKites: 40,             // 10 | 20 | 30 | 40
  winStreakKing: 5,         // 3 | 5 | 10
  spawnProtectionSec: 3,    // 1 a 10 segundos
  buffDurationSec: 60,      // 15 a 120 segundos
  hpRegenEnabled: true,     // true | false
  hpRegenSpeed: 'normal'    // 'lenta' | 'normal' | 'rapida'
});

class SettingsManager {
  constructor(filePath) {
    this.filePath = filePath || path.join(__dirname, 'data', 'game-settings.json');
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = this.sanitize({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.warn('[SettingsManager] Falha ao carregar configurações salvas, usando padrões:', err.message);
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[SettingsManager] Erro ao salvar configurações:', err.message);
      return false;
    }
  }

  sanitize(input) {
    const s = { ...DEFAULT_SETTINGS };

    // Escala das pipas e do nome
    if (Number.isFinite(Number(input.kiteScale))) {
      s.kiteScale = Math.min(2.5, Math.max(0.6, Math.round(Number(input.kiteScale) * 100) / 100));
    }
    if (Number.isFinite(Number(input.kiteNameScale))) {
      s.kiteNameScale = Math.min(2.5, Math.max(0.6, Math.round(Number(input.kiteNameScale) * 100) / 100));
    }

    // TOP 5 Live & Overlay HUD
    if (Number.isFinite(Number(input.top5Scale))) {
      s.top5Scale = Math.min(1.4, Math.max(0.7, Math.round(Number(input.top5Scale) * 100) / 100));
    }
    const t5Style = String(input.top5Style || 'glass').trim().toLowerCase();
    if (['glass', 'cyberpunk', 'gold', 'minimal'].includes(t5Style)) s.top5Style = t5Style;
    s.top5ShowExtras = input.top5ShowExtras !== undefined ? Boolean(input.top5ShowExtras) : true;

    // Tema dos 27 Estados do Brasil
    const themeUpper = String(input.theme || 'RJ').trim().toUpperCase();
    const VALID_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO','SSA'];
    if (VALID_STATES.includes(themeUpper)) s.theme = themeUpper;

    // Modo de cenário
    const mode = String(input.sceneMode || '3d').trim().toLowerCase();
    s.sceneMode = mode === 'transparent' ? 'transparent' : '3d';

    // Modo da câmera 3D
    const camMode = String(input.cameraMode || 'normal').trim().toLowerCase();
    if (['normal', 'cinematic', 'panoramic'].includes(camMode)) s.cameraMode = camMode;

    // Opacidade da linha
    if (Number.isFinite(Number(input.lineOpacity))) {
      s.lineOpacity = Math.min(1.0, Math.max(0.2, Math.round(Number(input.lineOpacity) * 100) / 100));
    }

    // Sombras
    s.shadowsEnabled = input.shadowsEnabled !== undefined ? Boolean(input.shadowsEnabled) : true;

    // Áudio
    if (Number.isFinite(Number(input.masterVolume))) s.masterVolume = Math.min(1, Math.max(0, Number(input.masterVolume)));
    s.narratorEnabled = input.narratorEnabled !== undefined ? Boolean(input.narratorEnabled) : true;
    if (Number.isFinite(Number(input.narratorVolume))) s.narratorVolume = Math.min(1, Math.max(0, Number(input.narratorVolume)));
    s.sfxEnabled = input.sfxEnabled !== undefined ? Boolean(input.sfxEnabled) : true;
    if (Number.isFinite(Number(input.sfxVolume))) s.sfxVolume = Math.min(1, Math.max(0, Number(input.sfxVolume)));
    s.boomboxEnabled = input.boomboxEnabled !== undefined ? Boolean(input.boomboxEnabled) : true;

    // Vento & Física
    const windInt = String(input.windIntensity || 'moderado').trim().toLowerCase();
    if (['fraco', 'moderado', 'forte', 'tempestade'].includes(windInt)) s.windIntensity = windInt;

    const windDir = String(input.windDirection || 'auto').trim().toLowerCase();
    if (['auto', 'left', 'right'].includes(windDir)) s.windDirection = windDir;

    const pace = String(input.relinhoPace || 'normal').trim().toLowerCase();
    if (['calmo', 'normal', 'frenetico'].includes(pace)) s.relinhoPace = pace;

    // Regras
    if (Number.isInteger(Number(input.maxKites))) {
      s.maxKites = Math.min(40, Math.max(2, Number(input.maxKites)));
    }
    if (Number.isInteger(Number(input.winStreakKing))) {
      s.winStreakKing = Math.min(20, Math.max(2, Number(input.winStreakKing)));
    }
    if (Number.isInteger(Number(input.spawnProtectionSec))) {
      s.spawnProtectionSec = Math.min(10, Math.max(1, Number(input.spawnProtectionSec)));
    }
    if (Number.isInteger(Number(input.buffDurationSec))) {
      s.buffDurationSec = Math.min(180, Math.max(10, Number(input.buffDurationSec)));
    }
    s.hpRegenEnabled = input.hpRegenEnabled !== undefined ? Boolean(input.hpRegenEnabled) : true;
    const regenSpd = String(input.hpRegenSpeed || 'normal').trim().toLowerCase();
    if (['lenta', 'normal', 'rapida'].includes(regenSpd)) s.hpRegenSpeed = regenSpd;

    return s;
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(partial) {
    this.settings = this.sanitize({ ...this.settings, ...(partial || {}) });
    this.save();
    return { ...this.settings };
  }

  resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    return { ...this.settings };
  }
}

module.exports = SettingsManager;
