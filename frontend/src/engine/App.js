import * as PIXI from 'pixi.js';
import { Kite } from '../entities/Kite.js';
import { FallingKite } from '../entities/FallingKite.js';
import { BrokenHandRope } from '../entities/BrokenHandRope.js';
import { SparkEmitter } from '../entities/SparkEmitter.js';
import { Physics } from './Physics.js';
import { Wind } from './Wind.js';
import { AudioManager } from './AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { GiftShowcase } from './GiftShowcase.js';
import { SkyScene } from '../ui/SkyScene.js';
import { ThreeSkyScene } from '../ui/ThreeSkyScene.js';
import { RooftopPlayer } from '../ui/RooftopPlayer.js';
import { liveVisualScale } from '../ui/LiveLayout.js';
import { rooftopSlotOrder, rooftopPlayerLayout, rooftopHandAnchor, rooftopAnchorY } from '../ui/RooftopLayout.js';
import { applyManeuverMovement, maneuverStats, selectGiftManeuver } from './Maneuvers.js';
import { applyLikeSpool, evolveRelinhoContact } from './RelinhoMechanics.js';
import { CHECKPOINT_KEY, captureArena, readArenaCheckpoint, restoreKiteState } from './ArenaCheckpoint.js';
import { startChatAction, applyChatAction } from './ChatControls.js';
import { RopeCollision } from './physics/RopeCollision.js';
import { PhysicsClock } from './physics/PhysicsClock.js'; // Passo 1
import { KiteDynamics } from './physics/KiteDynamics.js';
import { CombatContactAccumulator } from './physics/CombatContactAccumulator.js';
import { selectCouplingJobs } from './physics/RopeCouplingLimiter.js';
import { resolveAuthoritativeCombat } from './physics/CombatAuthorityGate.js';
import { RuntimeProfiler } from './RuntimeProfiler.js';
import { LifecycleBag } from './LifecycleBag.js';
import { SocketSubscriptionBag } from './SocketSubscriptionBag.js';
import { AparoController } from './AparoController.js';

export class GameApp {
  constructor(socket) {
    this.socket = socket;
    this._lifecycle = new LifecycleBag();
    this._socketSubscriptions = new SocketSubscriptionBag(socket);
    this._destroyed = false;
    this.canvas = document.getElementById('gameCanvas');
    this.kites = new Map(); // userId -> Kite
    this.fallingKites = [];
    this.windTime = 0;
    this.cutCooldowns = new Map();
    this.relinhoContacts = new Map(); // evita múltiplos cortes na mesma colisão
    this._ropeCollisionHints = new Map(); // par -> últimos segmentos em contato (hot path do check-hit)
    this._pendingCutLosers = new Set(); // loserId aguardando validação canônica do backend
    this._pendingCatchFlyaways = new Set(); // voadas aguardando confirmação canônica de aparo
    this.aparoController = new AparoController(socket, this._pendingCatchFlyaways);
    this.isCombatAuthority = false;

    this.audio = new AudioManager();
    this.hud = new HUD();

    // Passo 1: PhysicsClock garante que a física rode sempre a 60 Hz fixos,
    // independente do FPS do renderer (30/60/120/144). Antes a corda usava
    // safeDt/60 e a posição dos nós variava ~44px entre 30 e 120 FPS.
    this._physicsClock = new PhysicsClock(1 / 60, 2);
    this.runtimeProfiler = new RuntimeProfiler({ windowSize: 180 });

    this.initPixi();
    this.setupSocketEvents();
    this.setupKeyboardEvents();
    this.refreshCompetitionStats();
    this.refreshLiveStatus();
    this.liveStatusTimer = this._lifecycle.interval(() => this.refreshLiveStatus(), 5000);
    this.statsTimer = this._lifecycle.interval(() => this.refreshCompetitionStats(), 5000);
    this.combatHeartbeatTimer = this._lifecycle.interval(() => {
      if (!this.socket.connected || !this.isCombatAuthority) return;
      this.socket.emit('arena:heartbeat', { fps: Math.round(this.app.ticker.FPS || 0) });
    }, 3500);
    this._checkpointDirty = false;
    this._sync3DDirty = true;
    this._lastIs3D = null;
    this.arenaSessionId = null;
    this.syncArena();
    this.arenaSyncTimer = this._lifecycle.interval(() => this.syncArena(), 6000);
    this.checkpointTimer = this._lifecycle.interval(() => this.saveArenaCheckpoint(false), 3500);
    this.memoryGcTimer = this._lifecycle.interval(() => {
      try {
        if (this.app?.renderer?.textureGC) {
          this.app.renderer.textureGC.run();
        }
        if (this.threeScene?.purgeTextureCache) {
          this.threeScene.purgeTextureCache(this.kites);
        }
      } catch (_) { }
    }, 45000);
  }

  markDirtyCheckpoint() {
    this._checkpointDirty = true;
  }

  saveArenaCheckpoint(force = true) {
    if (!this.socket?.connected) return;
    if (!force && !this._checkpointDirty) return;
    this.runtimeProfiler.begin('serialization');
    try {
      this._checkpointDirty = false;
      const checkpoint = captureArena(this.kites.values(), this.arenaSessionId || 'default');
      try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)); }
      catch (_) { /* armazenamento local indispon?vel */ }
      this.socket.emit('arena:checkpoint', {
        width: this.app.screen.width, height: this.app.screen.height, kites: checkpoint.kites
      });
    } finally {
      this.runtimeProfiler.end('serialization');
    }
  }

  async syncArena() {
    if (this.arenaSyncInProgress) return;
    this.arenaSyncInProgress = true;
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/competition/arena', { cache: 'no-store' });
      if (!response.ok) return;
      const arena = await response.json();
      if (typeof arena.sessionId !== 'string' || !Array.isArray(arena.players)) return;
      const active = new Set(arena.players.map(p => String(p.userId)));
      let saved = new Map();
      try { saved = readArenaCheckpoint(localStorage.getItem(CHECKPOINT_KEY), arena.sessionId, [...active]); }
      catch (_) { /* fallback: restaura apenas dados do servidor */ }
      this.arenaSessionId = arena.sessionId;
      const serverStates = arena.playerStates && typeof arena.playerStates === 'object' ? arena.playerStates : {};
      for (const player of arena.players) {
        if (!player?.userId) continue;
        const pId = String(player.userId);
        const existing = this.kites.get(pId) || this.kites.get(player.userId);
        if (!existing) {
          this.spawnKite(player, serverStates[pId] || saved.get(pId), true);
        } else {
          existing.score = player.score || 0;
          existing.streak = player.streak || 0;
          existing.isKing = Boolean(player.isKing);
          // A contagem dos benefícios deve refletir o relógio do servidor após uma reconexão.
          existing.setBuff(player.lineType || 'algodao', player.power || 1, player.color || '#ffffff',
            player.lineWidth || 1.2, player.shield || 0, player.buffExpiresAt);
          const activeAbilities = new Set((player.specials || []).map(effect => effect.ability));
          for (const ability of ['tornado', 'invulnerable']) if (!activeAbilities.has(ability)) existing.setSpecial(ability, 0);
          for (const effect of player.specials || []) existing.setSpecial(effect.ability, effect.durationSeconds, effect.expiresAt);
        }
      }
      for (const kite of [...this.kites.values()]) {
        if (!active.has(String(kite.userId)) && kite.spawnedAt <= startedAt) this.removeKite(kite.userId);
      }
      const anyRestored = [...this.kites.values()].some(k => k.restoredLayoutIndex !== undefined || (saved.get(String(k.userId)) && Number.isFinite(saved.get(String(k.userId)).baseX)));
      if (!anyRestored && this.kites.size > 0) {
        this.layoutRooftopPlayers();
      }
      this.hud.updateKiteCount(this.kites.size);
      this.hud.currentLeaderId = arena.leaderId || null;
      this.kites.forEach(k => { k.isLeader = String(k.userId) === String(arena.leaderId); });
      this.hud.updateQueue(arena.queue || 0);
      this.hud.updateLeaderboard([...this.kites.values()]);
      this.saveArenaCheckpoint();
    } catch (_) { /* conexão perdida: cena atual permanece intacta até reconectar */ }
    finally { this.arenaSyncInProgress = false; }
  }

  async refreshLiveStatus() {
    try {
      const response = await fetch('/api/tiktok/status', { cache: 'no-store' });
      if (response.ok) this.hud.setLiveStatus(await response.json());
    } catch (_) { this.hud.setLiveStatus({ connected: false, retrying: true }); }
  }

  async refreshCompetitionStats() {
    try {
      const response = await fetch('/api/competition/stats', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      this.hud.updateCompetitionRanking(data.top, data.highlights, data.currentLeader, data.currentKing);
      this.hud.updateQueue(data.queue);
    } catch (_) { /* mantém a arena independente das estatísticas */ }
  }

  initPixi() {
    this.app = new PIXI.Application({
      view: this.canvas,
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      clearBeforeRender: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.25),
      autoDensity: true
    });

    if (this.app?.renderer?.textureGC) {
      this.app.renderer.textureGC.maxIdle = 1800; // 30s
      this.app.renderer.textureGC.checkCountMax = 300; // roda checagem a cada 5s
      if (PIXI.GC_MODES && PIXI.GC_MODES.AUTO !== undefined) {
        this.app.renderer.textureGC.mode = PIXI.GC_MODES.AUTO;
      }
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Camada 1: Cenário de Fundo (3D Three.js e Fallback PixiJS)
    this.skyScene = new SkyScene(w, h);
    this.app.stage.addChild(this.skyScene);

    const threeCanvas = document.getElementById('threeCanvas');
    if (threeCanvas) {
      this.threeScene = new ThreeSkyScene(threeCanvas, w, h);
      if (this.threeScene && !this.threeScene.disabled) {
        this.skyScene.setMode3D(true);
      }
    }

    // Bonecos na laje, abaixo das linhas e das pipas.
    this.rooftopPlayers = new PIXI.Container();
    this.app.stage.addChild(this.rooftopPlayers);

    // Camada 2: Linhas e Rabiolas das Pipas
    this.linesContainer = new PIXI.Container();
    this.app.stage.addChild(this.linesContainer);
    this.brokenHandRopes = [];
    this.brokenLinesGraphic = new PIXI.Graphics();
    this.linesContainer.addChild(this.brokenLinesGraphic);

    // Camada 3: Pipas e Avatares
    this.kitesContainer = new PIXI.Container();
    this.app.stage.addChild(this.kitesContainer);

    // Camada 4: Pipas Avoadoras caindo
    this.fallingContainer = new PIXI.Container();
    this.app.stage.addChild(this.fallingContainer);

    // Camada 5: Faíscas de Relinho
    this.sparks = new SparkEmitter();
    this.app.stage.addChild(this.sparks);

    // Presentes acima das pipas, sem alterar a física do jogo.
    this.giftShowcase = new GiftShowcase();
    this.app.stage.addChild(this.giftShowcase);

    // Loop de Renderização fixo em 60 FPS
    this.app.ticker.maxFPS = 60;
    this.app.ticker.minFPS = 30;
    this.app.ticker.add((delta) => this.gameLoop(delta));

    this._onRendererResize = (width, height) => {
      this.skyScene.resize(width, height);
      this.threeScene?.resize(width, height);
      this.kites.forEach(k => k.resize(width, height));
      this.layoutRooftopPlayers();
    };
    this._lifecycle.listen(this.app.renderer, 'resize', this._onRendererResize);

    this._onWindowResize = () => this.app?.resize?.();
    this._lifecycle.listen(window, 'resize', this._onWindowResize);

    const origRender = this.app.render.bind(this.app);
    this.app.render = () => {
      if (this.app.screen.width !== window.innerWidth || this.app.screen.height !== window.innerHeight) {
        this.app.resize();
      }
      origRender();
    };
  }

  sync3DDisplay(force = false) {
    const is3D = Boolean(this.threeScene && !this.threeScene.disabled && !this.skyScene.isTransparent);
    if (!force && this._lastIs3D === is3D && !this._sync3DDirty) return;
    this._lastIs3D = is3D;
    this._sync3DDirty = false;
    if (this.rooftopPlayers) {
      this.rooftopPlayers.visible = !is3D;
      this.rooftopPlayers.renderable = !is3D;
    }
    if (this.linesContainer) {
      this.linesContainer.visible = !is3D;
      this.linesContainer.renderable = !is3D;
    }
    if (this.fallingContainer) {
      this.fallingContainer.visible = !is3D;
      this.fallingContainer.renderable = !is3D;
    }
    if (this.sparks) {
      this.sparks.visible = !is3D;
      this.sparks.renderable = !is3D;
    }
    if (this.kitesContainer) {
      this.kitesContainer.visible = !is3D;
      this.kitesContainer.renderable = !is3D;
    }
    for (const kite of this.kites.values()) {
      if (kite.bodyGraphic) kite.bodyGraphic.visible = !is3D;
      if (kite.avatarContainer) kite.avatarContainer.visible = !is3D;
      if (kite.leaderGlow) kite.leaderGlow.visible = !is3D;
      if (kite.maneuverGlow) kite.maneuverGlow.visible = !is3D;
      if (kite.maneuverTrail) kite.maneuverTrail.visible = !is3D;
      if (kite.crownText) kite.crownText.visible = !is3D && Boolean(kite.isKing || kite.isLeader);
      if (kite.tagContainer) kite.tagContainer.visible = !is3D;
      if (kite.hpBarContainer) kite.hpBarContainer.visible = !is3D;
      if (kite.benefitText) kite.benefitText.visible = !is3D;
      if (kite.maneuverLabel) kite.maneuverLabel.visible = !is3D;
    }
  }

  setupKeyboardEvents() {
    const toggleScene = () => {
      const mode = this.skyScene.toggleMode();
      this.threeScene?.setTransparent(this.skyScene.isTransparent);
      this._sync3DDirty = true;
      this.sync3DDisplay(true);
      const text = document.getElementById('sceneModeText');
      if (text) text.textContent = mode;
      return mode;
    };

    const cycleTheme = () => {
      const newTheme = this.skyScene.cycleTheme();
      if (newTheme && this.threeScene) {
        this.threeScene.setTheme(newTheme.code);
        if (this.threeScene.theme) this.hud.showStateMapToast(this.threeScene.theme);
      }
      const btnText = document.getElementById('themeBtnText');
      if (btnText && newTheme) btnText.textContent = newTheme.code;
      return newTheme;
    };

    const cycleCamera = () => {
      if (!this.threeScene?.cycleCameraMode) return 'normal';
      const mode = this.threeScene.cycleCameraMode();
      const labels = { normal: 'Câmera Normal', cinematic: 'Câmera Baixa', panoramic: 'Câmera Panorâmica' };
      this.hud.showNotice(`🎥 Modo de Câmera 3D: ${labels[mode] || mode.toUpperCase()}`, 1800);
      const btnText = document.getElementById('cameraBtnText');
      if (btnText) btnText.textContent = mode;
      return mode;
    };

    this._onKeyDown = (e) => {
      if (e.key === 'b' || e.key === 'B') {
        toggleScene();
      } else if (e.key === 'm' || e.key === 'M') {
        cycleTheme();
      } else if (e.key === 'c' || e.key === 'C') {
        cycleCamera();
      } else if (e.key === '1') {
        this.executeKeyboardAction('puxar');
      } else if (e.key === '2') {
        this.executeKeyboardAction('soltar');
      } else if (e.key === '3') {
        this.executeKeyboardAction('despicada');
      }
    };
    this._lifecycle.listen(window, 'keydown', this._onKeyDown);

    const canvasElem = document.getElementById('gameCanvas');
    if (canvasElem) {
      this._onCanvasPointerDown = (e) => {
        const rect = canvasElem.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (this.app.screen.width / rect.width);
        const clickY = (e.clientY - rect.top) * (this.app.screen.height / rect.height);
        let closest = null, closestDist = 75;
        for (const k of this.kites.values()) {
          const dist = Math.hypot(k.x - clickX, k.y - clickY);
          if (dist < closestDist) {
            closestDist = dist;
            closest = k;
          }
        }
        if (closest) {
          this.selectedKiteUserId = closest.userId;
          this.hud.showNotice(`🎯 Pipa de ${closest.nickname} Selecionada! (Teclas 1, 2, 3)`, 1800);
        }
      };
      this._lifecycle.listen(canvasElem, 'pointerdown', this._onCanvasPointerDown);
    }

    const sound = document.getElementById('btnSound');
    if (sound) sound.onclick = () => {
      this.audio.ensureContext();
      this.audio.isMuted = !this.audio.isMuted;
      sound.textContent = this.audio.isMuted ? 'Ativar som' : 'Silenciar';
      sound.setAttribute('aria-pressed', String(!this.audio.isMuted));
    };
    this.audio.isMuted = true;

    const voiceBtn = document.getElementById('btnVoice');
    if (voiceBtn) {
      voiceBtn.onclick = () => {
        this.audio.ensureContext();
        const enabled = this.audio.toggleTTS();
        voiceBtn.textContent = enabled ? '🎙️ Narrador ON' : '🎙️ Narrador OFF';
        voiceBtn.setAttribute('aria-pressed', String(enabled));
        voiceBtn.classList.toggle('active', enabled);
      };
    }

    const params = new URLSearchParams(location.search);
    if (params.get('overlay') === '1') {
      this.skyScene.toggleMode();
      this.threeScene?.setTransparent(true);
      document.getElementById('sceneModeText').textContent = 'Transparente';
    }
    if (params.get('controls') === '0') document.body.classList.add('hide-controls');
    const btn = document.getElementById('btnToggleScene');
    if (btn) {
      btn.onclick = () => {
        toggleScene();
      };
    }

    const btnMap = document.getElementById('btnCycleTheme');
    if (btnMap) {
      btnMap.onclick = () => {
        cycleTheme();
      };
    }

    const btnCam = document.getElementById('btnCameraMode');
    if (btnCam) {
      btnCam.onclick = () => {
        cycleCamera();
      };
    }

    const themePill = document.getElementById('themeIndicatorPill');
    if (themePill) {
      themePill.onclick = () => {
        cycleTheme();
      };
    }
  }

  executeKeyboardAction(action) {
    if (this.kites.size === 0) {
      this.hud.showNotice('Nenhuma pipa no céu para controlar.', 1200);
      return;
    }

    let kite = this.selectedKiteUserId ? this.kites.get(this.selectedKiteUserId) : null;
    if (!kite) {
      kite = [...this.kites.values()].find(k => k.isKing) ||
        [...this.kites.values()].find(k => k.isLeader) ||
        this.kites.values().next().value;
    }
    if (!kite) return;

    this.audio.ensureContext();
    const wx = (typeof this.skyScene?.wind?.x === 'number') ? this.skyScene.wind.x : 0.2;
    const windDir = Math.abs(wx) > 0.05 ? Math.sign(wx) : 1;

    const maxKiteY = this.app.screen.height * 0.65;
    const minKiteY = 40;

    if (action === 'puxar') {
      // Tecla 1: Puxar pipa (subida veloz de ataque, linha com tensão máxima)
      kite.y = Math.max(minKiteY, kite.y - 30);
      kite.lineTension = 1.0;
      kite.lineSlack = 0;
      kite.contactSpeed = Math.max(kite.contactSpeed || 0, 18);
      kite.rotation = -0.15;
      this.audio.playLaunchSound();
      this.sparks.emit(kite.x, kite.y, 6);
      if (this.threeScene && !this.threeScene.disabled) {
        const k3d = this.threeScene.kites3D?.get(String(kite.userId));
        const p3d = this.threeScene.screenToWorld(kite.x, kite.y, k3d ? k3d.position.z : 140);
        this.threeScene.emitSpark3D(p3d.x, p3d.y, p3d.z, 6, kite.line?.color || 0xffffff);
      }
      this.hud.showNotice(`🕹️ [1] PUXAR PIPA • ${kite.nickname}`, 1000);
    } else if (action === 'soltar') {
      // Tecla 2: Soltar linha (descarrega na carretilha, alivia tensão, deriva no vento)
      kite.lineSlack = Math.min(1.0, (kite.lineSlack || 0) + 0.45);
      kite.lineTension = 0.20;
      kite.x += windDir * 24;
      kite.y = Math.min(maxKiteY, kite.y + 8);
      kite.x = Math.min(this.app.screen.width - 30, Math.max(30, kite.x));
      this.hud.showNotice(`🕹️ [2] SOLTAR LINHA • ${kite.nickname}`, 1000);
    } else if (action === 'despicada') {
      // Tecla 3: Desbicada no sentido do vento (tranco seco e arrancada na direção que o vento sopra)
      kite.x += windDir * 42;
      kite.y = Math.min(maxKiteY, kite.y + 14);
      kite.rotation = windDir * 0.42;
      kite.lineTension = 0.95;
      kite.contactSpeed = Math.max(kite.contactSpeed || 0, 20);
      this.sparks.emit(kite.x, kite.y, 10);
      if (this.threeScene && !this.threeScene.disabled) {
        const k3d = this.threeScene.kites3D?.get(String(kite.userId));
        const p3d = this.threeScene.screenToWorld(kite.x, kite.y, k3d ? k3d.position.z : 140);
        this.threeScene.emitSpark3D(p3d.x, p3d.y, p3d.z, 10, kite.line?.color || 0xff9900);
      }
      this.hud.showNotice(`🕹️ [3] DESBICADA NO VENTO • ${kite.nickname}`, 1000);
    }
  }

  setupSocketEvents() {
    // 1. Spawn de Pipa
    this._socketSubscriptions.on('player:spawn', (data) => {
      this.spawnKite(data);
      if (data?.nickname) {
        this.hud.showJoin(data.nickname);
      }
    });
    this._socketSubscriptions.on('player:profile_updated', data => {
      const kite = this.kites.get(String(data?.userId || ''));
      if (!kite) return;
      kite.setProfile(data.nickname, data.profilePictureUrl);
      if (kite.rooftopPlayer) {
        this.rooftopPlayers.removeChild(kite.rooftopPlayer);
        kite.rooftopPlayer.destroy({ children: true });
      }
      kite.rooftopPlayer = new RooftopPlayer(kite);
      this.rooftopPlayers.addChild(kite.rooftopPlayer);
      this.layoutRooftopPlayers();
    });

    // 3. Aplicação de Buff / Gift
    this._socketSubscriptions.on('player:buff_applied', (data) => {
      const kite = this.kites.get(data.userId);
      if (kite) {
        kite.setBuff(data.lineType, data.powerMultiplier, data.color, data.lineWidth, data.shieldCount, data.expiresAt);
        if (data.lineType === 'cerol') this.audio.playRoseCerolSound();
        else if (data.lineType === 'chile') this.audio.playDonutChileSound();
        else if (data.lineType === 'kevlar' || Number(data.shieldCount) > 0) this.audio.playShieldEquipSound();
        else if (data.lineType === 'tornado') this.audio.playTornadoSound();
        else if (data.lineType === 'mestre_do_ceu') this.audio.playLionRoarSound();
      }
    });
    this._socketSubscriptions.on('player:special_applied', data => {
      this.kites.get(data.userId)?.setSpecial(data.ability, data.durationSeconds, data.expiresAt);
      if (data.ability === 'tornado') this.audio.playTornadoSound();
      else if (data.ability === 'shield') this.audio.playShieldEquipSound();
      else if (data.ability === 'invulnerable') this.audio.playLionRoarSound();
    });
    this._socketSubscriptions.on('player:special_expired', data => {
      this.kites.get(data.userId)?.setSpecial(data.ability, 0);
    });
    this._socketSubscriptions.on('gift:received', data => {
      this.hud.showGift(data.nickname, data.giftName);
      this.audio.announceGift(data.nickname, data.giftName, data.lineType);
    });
    this._socketSubscriptions.on('follow:new', data => {
      const nickname = String(data?.nickname || data?.uniqueId || 'Novo seguidor').slice(0, 36);
      this.hud.showNotice('💙 ' + nickname + ' AGORA SEGUE A LIVE!', 4200);
      const kite = this.kites.get(String(data?.userId || ''));
      kite?.rooftopPlayer?.celebrate({ tier: 'uncommon' });
      if (kite) this.sparks.emit(kite.x, kite.y, 20);
    });
    this._socketSubscriptions.on('gift:celebration', data => {
      const theme = this.giftShowcase.celebrate(data, this.kites, this.app.screen.width, this.app.screen.height);
      this.kites.get(String(data?.userId || ''))?.rooftopPlayer?.celebrate(theme);
      this.hud.celebrateGift(theme);
      this.audio.announceGift(data?.nickname, data?.giftName, data?.upgrade?.lineType);
    });
    this._socketSubscriptions.on('competition:maneuver', data => {
      const kite = this.kites.get(String(data?.userId || ''));
      if (!kite) return;
      const maneuverName = selectGiftManeuver(data?.giftName) || String(data?.giftName || 'retao');
      const stats = maneuverStats(maneuverName, data?.giftCost, data?.repeatCount);
      if (!stats) return;
      kite.setManeuver(stats);
      this.hud.showManeuver(kite.nickname, stats.name);
    });
    this._socketSubscriptions.on('competition:chat_action', (data) => {
      if (!data?.userId || !data?.action) return;
      const kite = this.kites.get(data.userId);
      if (kite) {
        kite.inputBuffer?.addComment(data.action, data.nickname);
        startChatAction(kite, data.action);
      }
    });
    this._socketSubscriptions.on('competition:queue', data => this.hud.updateQueue(data?.length || 0));
    this._socketSubscriptions.on('competition:champion_cut', data => this.hud.showChampionCut(data?.winnerNick, data?.loserNick));
    this._socketSubscriptions.on('relinho:cut_rejected', (data) => {
      console.warn('[relinho:cut_rejected] Corte rejeitado pelo backend:', data);
      const loserId = String(data?.loserId || '');
      if (loserId && this._pendingCutLosers.delete(loserId)) {
        this.syncArena();
      }
    });
    this._socketSubscriptions.on('game:cut_occurred', data => {
      this.hud.expandLeaderboardTemporarily(2400);
      setTimeout(() => this.refreshCompetitionStats(), 250);
      if (data?.loserId === this.hud.currentLeaderId) this.hud.currentLeaderId = null;
      const winnerId = String(data?.winnerId || '');
      const loserId = String(data?.loserId || '');
      if (!loserId) return;
      this._pendingCutLosers.delete(loserId);

      const winner = this.kites.get(winnerId) || this.kites.get(data?.winnerId);
      if (winner) {
        winner.score = Number(data.winnerScore) || winner.score;
        if ('isKing' in (data || {})) winner.isKing = Boolean(data.isKing);
      }
      if ('kingId' in (data || {})) {
        this.kites.forEach(k => {
          k.isKing = Boolean(data.kingId && String(k.userId) === String(data.kingId));
        });
      }

      const loser = this.kites.get(loserId) || this.kites.get(data?.loserId);
      if (loser) {
        const canonicalCutX = Number.isFinite(data.cutX) ? data.cutX : loser.x;
        const canonicalCutY = Number.isFinite(data.cutY) ? data.cutY : loser.y;
        this.sparks.emitCut(canonicalCutX, canonicalCutY, winner?.line?.color || 0xffffff);
        if (this.threeScene && !this.threeScene.disabled) {
          const p3d = this.threeScene.screenToWorld(canonicalCutX, canonicalCutY, 140);
          this.threeScene.emitCut3D(p3d.x, p3d.y, p3d.z, winner?.line?.color || 0xffffff);
        }
        this.hud.addKillfeedItem(data.winnerNick || winner?.nickname || 'Jogador', data.loserNick || loser.nickname, data.lineType);
        this.audio.announceCut(data.winnerNick || winner?.nickname, data.loserNick || loser.nickname);
        let breakInfo = {
          breakPoint: {
            x: canonicalCutX,
            y: canonicalCutY,
            z: Number.isFinite(loser.z) ? loser.z : 120
          },
          remainingRatio: 0.5
        };
        if (loser.rope && typeof loser.rope.breakAt === 'function') {
          const remoteSegment = Number.isFinite(data.breakSegmentIndex) && Number.isFinite(data.breakSegmentT)
            ? { segmentIndex: data.breakSegmentIndex, t: data.breakSegmentT }
            : (typeof loser.rope.findClosestSegmentToPoint === 'function'
                ? loser.rope.findClosestSegmentToPoint(canonicalCutX, canonicalCutY)
                : { segmentIndex: 0, t: 0.5 });
          breakInfo = loser.rope.breakAt(remoteSegment.segmentIndex, remoteSegment.t);
        }
        const falling = new FallingKite(loser, breakInfo);
        this.fallingKites.push(falling);
        this.fallingContainer.addChild(falling);

        // Cria Linha Rompida da Mão presa à laje
        const handPos = {
          x: Number.isFinite(loser.line?.visualBaseX) ? loser.line.visualBaseX : (loser.baseX || 540),
          y: Number.isFinite(loser.line?.visualBaseY) ? loser.line.visualBaseY : (loser.baseY || 1800),
          z: loser.baseZ || 0
        };
        const handRope = new BrokenHandRope(breakInfo.handNodes, handPos, {
          userId: loserId,
          lineColor: loser.line?.color || 0xffffff,
          lineType: loser.lineType || 'algodao',
          breakPoint: breakInfo.breakPoint
        });
        this.brokenHandRopes.push(handRope);

        this.removeKite(loserId);
      } else {
        this.hud.addKillfeedItem(data.winnerNick || winner?.nickname || 'Jogador', data.loserNick || 'Jogador', data.lineType);
      }
      this.hud.updateLeaderboard([...this.kites.values()]);
      this.markDirtyCheckpoint();
    });
    this._socketSubscriptions.on('game:catch_occurred', data => {
      this.hud.expandLeaderboardTemporarily(1800);
      const caughtUserId = String(data?.caughtUserId || '');
      const catcherId = String(data?.catcherId || '');
      if (!caughtUserId || !catcherId) return;
      this._pendingCatchFlyaways.delete(caughtUserId);
      const catcher = this.kites.get(catcherId) || this.kites.get(data?.catcherId);
      if (catcher) {
        catcher.score = Number.isFinite(data?.catcherScore) ? data.catcherScore : catcher.score;
        catcher.updateHPBar?.();
      }
      const flyaway = this.fallingKites.find(item => String(item?.userId || '') === caughtUserId && !item.isCaught);
      if (flyaway) flyaway.catch?.(data.catcherNick || catcher?.nickname);
      const catchX = Number.isFinite(data?.catchX) ? data.catchX : (flyaway?.x ?? catcher?.x ?? 0);
      const catchY = Number.isFinite(data?.catchY) ? data.catchY : (flyaway?.y ?? catcher?.y ?? 0);
      this.audio.playCatchSound?.();
      this.sparks.emit(catchX, catchY, 22);
      if (this.threeScene && !this.threeScene.disabled) {
        const p3d = this.threeScene.screenToWorld(catchX, catchY, 130);
        this.threeScene.triggerAparo3D?.(p3d.x, p3d.y, p3d.z);
        this.threeScene.emitSpark3D(p3d.x, p3d.y, p3d.z, 22, 0x34d399);
      }
      this.hud.showNotice(`🎉 APARADA! ${data.catcherNick || catcher?.nickname || 'Jogador'} resgatou a pipa de ${data.caughtNick || 'Jogador'}! (+${data.points || 2} pts)`, 3500);
      this.hud.updateLeaderboard([...this.kites.values()]);
      this.markDirtyCheckpoint();
    });
    this._socketSubscriptions.on('competition:milestone', data => this.hud.showMilestone(data?.nickname, data?.streak));
    this._socketSubscriptions.on('competition:leader_changed', data => {
      this.hud.expandLeaderboardTemporarily(2600);
      setTimeout(() => this.refreshCompetitionStats(), 250);
      this.kites.forEach(kite => {
        kite.isLeader = Boolean(data?.userId && kite.userId === data.userId);
        if (data && 'isKing' in data) {
          kite.isKing = Boolean(data.isKing && kite.userId === data.userId);
        }
      });
      if (data?.userId) {
        this.hud.announceLeader(data);
        const leader = this.kites.get(data.userId);
        if (leader) {
          this.sparks.emit(leader.x, leader.y, 35);
          if (this.threeScene && !this.threeScene.disabled) {
            const l3d = this.threeScene.kites3D?.get(String(leader.userId));
            const lz = l3d ? l3d.position.z : 180;
            const p3d = this.threeScene.screenToWorld(leader.x, leader.y, lz);
            this.threeScene.emitSpark3D(p3d.x, p3d.y, p3d.z, 30, 0xffd700);
          }
        }
        this.audio.playVictoryFanfare();
        if (data?.nickname) this.audio.announceKing(data.nickname);
      } else {
        this.hud.currentLeaderId = null;
      }
      this.hud.updateLeaderboard(Array.from(this.kites.values()));
    });
    this._socketSubscriptions.on('tiktok:status', data => this.hud.setLiveStatus(data));
    this._socketSubscriptions.on('likes:burst', (data) => {
      const duration = Math.min(30, Math.max(1, Number(data?.durationSeconds) || 30));
      for (const k of this.kites.values()) k.likeBoostRemaining = duration;
      this.hud.showBoost();
      const kite = this.kites.get(String(data?.userId || ''));
      if (!kite) return;
      const count = Math.max(1, Number(data?.likeCount || data?.totalLikes) || 1);
      kite.inputBuffer?.addLikes(count);
      const spool = applyLikeSpool(kite, count);
      const stats = maneuverStats('despicar', 1, 1);
      stats.duration = Math.min(2.4, .55 + Math.min(25, count) * .055 + spool * .65);
      stats.remaining = stats.duration;
      kite.setManeuver(stats);
      this.hud.showManeuver(kite.nickname, 'despicar');
    });
    this._socketSubscriptions.on('arena:authority_revoked', () => {
      this.isCombatAuthority = false;
      this._pendingCutLosers.clear();
      this._pendingCatchFlyaways.clear();
      this.syncArena();
    });
    this._socketSubscriptions.on('arena:authority_available', () => {
      if (!this.socket.connected || this.isCombatAuthority) return;
      this.socket.emit('arena:claim_authority', ({ granted } = {}) => {
        this.isCombatAuthority = Boolean(granted);
        if (this.isCombatAuthority) this.syncArena();
      });
    });
    this._socketSubscriptions.on('connect', () => {
      this.hud.setConnection(true);
      this.isCombatAuthority = false;
      this.socket.emit('arena:claim_authority', ({ granted } = {}) => {
        this.isCombatAuthority = Boolean(granted);
        if (this.isCombatAuthority) this.socket.emit('arena:heartbeat', { fps: Math.round(this.app.ticker.FPS || 0) });
      });
      this.syncArena();
    });
    this._socketSubscriptions.on('disconnect', () => {
      this.isCombatAuthority = false;
      this._pendingCutLosers.clear();
      this._pendingCatchFlyaways.clear();
      this.hud.setConnection(false);
    });
    this.hud.setConnection(this.socket.connected);
    if (this.socket.connected) this.socket.emit('arena:claim_authority', ({ granted } = {}) => {
      this.isCombatAuthority = Boolean(granted);
    });

    this._socketSubscriptions.on('player:buff_expired', (data) => {
      const kite = this.kites.get(data.userId);
      if (kite) {
        kite.setBuff('algodao', 1.0, 0xffffff, 1.2, 0);
      }
    });

    this._socketSubscriptions.on('arena:reset', (data) => {
      this.handleArenaReset(data);
    });

    this._socketSubscriptions.on('settings:sync', (settings) => this.applySettings(settings));
    this._socketSubscriptions.on('settings:updated', (settings) => this.applySettings(settings));
  }

  applySettings(settings) {
    if (!settings || typeof settings !== 'object') return;

    // 1. Visual & Cenário 3D
    if (settings.theme && settings.theme !== this.skyScene?.themeCode) {
      this.skyScene?.setTheme(settings.theme);
      this.threeScene?.setTheme(settings.theme);
      if (this.threeScene?.theme) this.hud.showStateMapToast(this.threeScene.theme);
    }
    if (settings.sceneMode) {
      const transparent = settings.sceneMode === 'transparent';
      this.skyScene?.setTransparent(transparent);
      this.threeScene?.setTransparent(transparent);
      this.sync3DDisplay(true);
    }
    if (settings.cameraMode && this.threeScene?.setCameraMode) {
      this.threeScene.setCameraMode(settings.cameraMode);
    }
    if (settings.kiteScale !== undefined) {
      const val = Number(settings.kiteScale);
      if (Number.isFinite(val) && val >= 0.5 && val <= 3.0) {
        this.customKiteScale = val;
        if (this.threeScene) this.threeScene.setKiteScale(val);
        const w = this.app?.screen?.width || 1280, h = this.app?.screen?.height || 720;
        for (const kite of this.kites.values()) {
          kite.visualScale = liveVisualScale(w, h) * (val / 1.55);
          kite.scale.set(kite.visualScale * (kite.isInvulnerable ? 1.4 : kite.shieldPulse > 0 ? 1.2 : 1));
        }
      }
    }
    if (settings.kiteNameScale !== undefined) {
      const val = Number(settings.kiteNameScale);
      if (Number.isFinite(val) && val >= 0.5 && val <= 3.0) {
        this.customKiteNameScale = val;
        if (this.threeScene) this.threeScene.setKiteNameScale(val);
        for (const kite of this.kites.values()) {
          if (kite.tagContainer) kite.tagContainer.scale.set(val);
        }
      }
    }
    if (settings.top5Scale !== undefined && this.hud?.setTop5Scale) {
      this.hud.setTop5Scale(settings.top5Scale);
    }
    if (settings.top5Style !== undefined && this.hud?.setTop5Style) {
      this.hud.setTop5Style(settings.top5Style);
    }
    if (settings.top5ShowExtras !== undefined && this.hud?.setTop5ShowExtras) {
      this.hud.setTop5ShowExtras(settings.top5ShowExtras);
    }
    if (settings.lineOpacity !== undefined && this.threeScene) {
      this.threeScene.setLineOpacity(settings.lineOpacity);
    }
    if (settings.shadowsEnabled !== undefined && this.threeScene) {
      this.threeScene.setShadows(settings.shadowsEnabled);
    }

    // 2. Áudio & Locutor
    if (this.audio) {
      if (settings.masterVolume !== undefined) {
        this.audio.setMasterVolume(settings.masterVolume);
      }
      if (settings.narratorEnabled !== undefined || settings.narratorVolume !== undefined) {
        this.audio.setTTS(settings.narratorEnabled, settings.narratorVolume);
      }
      if (settings.sfxEnabled !== undefined || settings.sfxVolume !== undefined) {
        this.audio.setSFX(settings.sfxEnabled, settings.sfxVolume);
      }
      if (settings.boomboxEnabled !== undefined) {
        this.audio.setBoombox(settings.boomboxEnabled);
        this.threeScene?.setBoombox?.(settings.boomboxEnabled);
      }
    }

    // 3. Vento e física
    Wind.setSettings(settings);

    // 4. Regras do jogo
    if (settings.maxKites) {
      this.maxKites = settings.maxKites;
    }
    if (settings.spawnProtectionSec !== undefined) {
      this.spawnProtectionSec = settings.spawnProtectionSec;
      Kite.setSpawnProtection?.(settings.spawnProtectionSec);
    }
    if (settings.hpRegenEnabled !== undefined || settings.hpRegenSpeed !== undefined) {
      Kite.setRegenSettings?.({
        hpRegenEnabled: settings.hpRegenEnabled,
        hpRegenSpeed: settings.hpRegenSpeed
      });
    }
  }

  handleArenaReset(data = {}) {
    const scope = data?.scope || 'all';
    if (scope === 'single_player' && data?.kickedId) {
      const kickedKite = this.kites.get(data.kickedId);
      const nick = kickedKite?.nickname || 'Jogador';
      this.removeKite(data.kickedId);
      if (this.threeScene) {
        this.threeScene.syncEntities(this.kites, this.fallingKites, this.sparks, 1);
      }
      this.hud.updateLeaderboard([...this.kites.values()]);
      this.hud.showNotice(`🥾 ${nick} foi removido da arena!`, 2500);
      this.markDirtyCheckpoint();
      setTimeout(() => this.refreshCompetitionStats(), 250);
      return;
    }
    if (scope === 'kites' || scope === 'all') {
      for (const userId of [...this.kites.keys()]) {
        this.removeKite(userId);
      }
      for (const fk of this.fallingKites) {
        try {
          this.fallingContainer.removeChild(fk);
          fk.destroy({ children: true });
        } catch (_) { }
      }
      this.fallingKites = [];
      if (this.threeScene) {
        this.threeScene.syncEntities(this.kites, this.fallingKites, this.sparks, 1);
      }
      this.relinhoContacts?.clear();
      this.cutCooldowns?.clear();
      try { localStorage.removeItem(CHECKPOINT_KEY); } catch (_) { }
      this.hud.currentLeaderId = null;
      this.hud.updateQueue(0);
      this.hud.clearKillfeed();
      this.hud.updateLeaderboard([]);
      this.hud.showNotice(scope === 'all' ? 'ARENA REINICIADA COM SUCESSO!' : 'PIPAS LIMPAS DA ARENA!', 3200);
    }
    if (scope === 'stats' || scope === 'all') {
      this.hud.currentLeaderId = null;
      for (const kite of this.kites.values()) {
        kite.score = 0;
        kite.streak = 0;
        kite.isKing = false;
        kite.isLeader = false;
        kite.updateHPBar?.();
      }
      this.hud.updateLeaderboard([...this.kites.values()]);
      if (scope === 'stats') {
        this.hud.showNotice('ESTATÍSTICAS E PLACAR ZERADOS!', 3000);
      }
    }
    setTimeout(() => this.refreshCompetitionStats(), 250);
  }

  syncLineToPlayerHand(kite) {
    const visual = kite?.rooftopPlayer?.getLineAnchor?.();
    const physical = kite?.rooftopPlayer?.getPhysicalLineAnchor?.() || visual;
    if (!physical || !Number.isFinite(physical.x) || !Number.isFinite(physical.y)) return;
    kite.baseX = physical.x; kite.baseY = physical.y;
    if (kite.line) {
      kite.line.baseX=physical.x;
      kite.line.baseY=physical.y;
      kite.line.visualBaseX = Number.isFinite(visual?.x) ? visual.x : physical.x;
      kite.line.visualBaseY = Number.isFinite(visual?.y) ? visual.y : physical.y;
    }
  }

  layoutRooftopPlayers() {
    const w = this.app?.screen?.width || 1280;
    const h = this.app?.screen?.height || 720;
    const ordered = [...this.kites.values()].sort((a, b) => a.baseX - b.baseX || String(a.userId).localeCompare(String(b.userId)));
    const slotOrder = rooftopSlotOrder(ordered.length, w, h);
    ordered.forEach((kite, index) => {
      kite.rooftopPlayer?.setLayout(slotOrder[index], ordered.length);
      this.syncLineToPlayerHand(kite);
    });
  }

  spawnKite(data, checkpoint = null, skipLayout = false) {
    if (this.kites.has(data.userId)) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    if (data.spawnProtection === undefined && this.spawnProtectionSec !== undefined) {
      data.spawnProtection = this.spawnProtectionSec;
    }
    const kite = new Kite(data, w, h);
    if (this.customKiteScale !== undefined) {
      kite.visualScale *= (this.customKiteScale / 1.55);
      kite.scale.set(kite.visualScale);
    }
    if (this.customKiteNameScale !== undefined && kite.tagContainer) {
      kite.tagContainer.scale.set(this.customKiteNameScale);
    }
    kite.spawnedAt = Date.now();
    kite.setBuff(data.lineType || 'algodao', data.power || 1, data.color || '#ffffff', data.lineWidth || 1.2, data.shield || 0, data.buffExpiresAt);
    for (const effect of data.specials || []) kite.setSpecial(effect.ability, effect.durationSeconds, effect.expiresAt);
    if (checkpoint) restoreKiteState(kite, checkpoint);

    this.kites.set(data.userId, kite);
    kite.isLeader = this.hud.currentLeaderId === data.userId;
    kite.rooftopPlayer = new RooftopPlayer(kite);
    this.rooftopPlayers.addChild(kite.rooftopPlayer);
    this.linesContainer.addChild(kite.line);
    this.linesContainer.addChild(kite.tail);
    this.kitesContainer.addChild(kite);

    if (kite.restoredLayoutIndex !== undefined && kite.restoredLayoutTotal) {
      kite.rooftopPlayer.setLayout(kite.restoredLayoutIndex, kite.restoredLayoutTotal);
      this.syncLineToPlayerHand(kite);
    } else if (checkpoint && Number.isFinite(checkpoint.baseX)) {
      const total = 40;
      let bestSlot = 0, bestDist = Infinity;
      for (let i = 0; i < total; i++) {
        const slot = rooftopPlayerLayout(i, total, w, h);
        const hand = rooftopHandAnchor(slot.x, slot.y, slot.scale, slot.scale, 0);
        const dist = Math.abs(hand.x - checkpoint.baseX);
        if (dist < bestDist) { bestDist = dist; bestSlot = i; }
      }
      if (bestDist < 2) {
        kite.rooftopPlayer.setLayout(bestSlot, total);
        this.syncLineToPlayerHand(kite);
      }
    }

    if (!skipLayout) {
      this.layoutRooftopPlayers();
      this.hud.updateKiteCount(this.kites.size);
      this.hud.updateLeaderboard(Array.from(this.kites.values()));
    }
    if (!checkpoint) {
      this.audio.playLaunchSound();
    }
    this._sync3DDirty = true;
    this.markDirtyCheckpoint();
    this.sync3DDisplay();
  }

  removeKite(userId) {
    const kite = this.kites.get(userId);
    if (kite) {
      this.rooftopPlayers.removeChild(kite.rooftopPlayer);
      kite.rooftopPlayer.destroy({ children: true });
      this.linesContainer.removeChild(kite.line);
      this.linesContainer.removeChild(kite.tail);
      this.kitesContainer.removeChild(kite);

      kite.line.destroy();
      kite.tail.destroy({ children: true });
      kite.destroy({ children: true });

      this.kites.delete(userId);
      this.layoutRooftopPlayers();
      this.hud.updateKiteCount(this.kites.size);
      this._sync3DDirty = true;
      this.markDirtyCheckpoint();
    }
  }

  gameLoop(delta) {
    delta = Math.max(0, Math.min(delta, 3));
    this.runtimeProfiler.frame(delta * (1000 / 60));
    this.windTime += delta / 60;
    const currentWind = Wind.sample(this.windTime);
    this.runtimeProfiler.begin('hud');
    this.hud.updateWind(currentWind);
    this.runtimeProfiler.end('hud');
    this.sync3DDisplay();
    const themeRotated = this.skyScene.update(delta);
    if (themeRotated && this.threeScene) {
      this.threeScene.setTheme(this.skyScene.themeCode);
      if (this.threeScene.theme) this.hud.showStateMapToast(this.threeScene.theme);
    }
    this.runtimeProfiler.begin('render3d');
    this.threeScene?.update(delta, currentWind, this.kites, this.fallingKites, this.sparks, this.brokenHandRopes);
    this.runtimeProfiler.end('render3d');
    this.sparks.update(delta);
    this.giftShowcase.update(delta, this.kites, this.app.screen.width, this.app.screen.height);

    // Orçamento visual adaptativo: reduz somente FX quando o p95 do frame sobe.
    // Física, dano e detecção de todos os relinhos continuam intactos.
    const runtimeQuality = this.runtimeProfiler.snapshot().quality;
    this._combatSparkBudget = runtimeQuality === 'low' ? 6 : runtimeQuality === 'medium' ? 12 : 24;
    this.threeScene?.setRuntimeQuality(runtimeQuality, this.kites.size);
    const webglRender = this.threeScene?.renderer?.info?.render;
    if (webglRender) {
      this.runtimeProfiler.gauge('drawCalls', Number(webglRender.calls) || 0);
      this.runtimeProfiler.gauge('triangles', Number(webglRender.triangles) || 0);
    }

    // P8/P15.1 — Fixed Simulation Completa (60 Hz determinístico):
    // manobras, cordas, relinho, voadas e linhas rompidas compartilham o mesmo relógio.
    const deltaSeconds = (delta / 60);
    const lajeY = rooftopAnchorY(this.app.screen.width, this.app.screen.height);
    this.runtimeProfiler.begin('physics');
    this._physicsClock.update(deltaSeconds, (fixedDt) => {
      const fixedDelta = fixedDt * 60; // 1.0 normalizado a 60 Hz

      // Snapshot único por substep: evita recriar arrays de jogadores para cada pipa.
      const physicsKites = Array.from(this.kites.values());

      // 1º: Intenções físicas, mãos e manobras (sem render Pixi aqui)
      for (const kite of physicsKites) {
        this.syncLineToPlayerHand(kite);
        applyManeuverMovement(kite, physicsKites, fixedDelta, currentWind);
        applyChatAction(kite, fixedDelta, currentWind);
      }

      // 2º: KiteDynamics e RopePhysics XPBD
      KiteDynamics._stepFrame++; // Avança o frame global ANTES do loop de pipas
      for (const kite of physicsKites) {
        kite.update(fixedDt * 60, currentWind, physicsKites.length);
      }

      // 3º: Vórtices e atratores de vento
      for (const kite of physicsKites) {
        if (kite.specials.tornado > 0) Wind.attract(kite, physicsKites, fixedDelta);
      }

      // 4º: Colisão e resolução de atrito de relinho determinísticos
      this.runtimeProfiler.begin('collision');
      this.checkRelinhos(fixedDelta);
      this.runtimeProfiler.end('collision');

      // 5º: Física pós-corte no MESMO fixed step (independe de 30/60/120 FPS)
      for (const fk of this.fallingKites) {
        if (fk.life > 0) fk.update(fixedDelta, this.app.screen.height, lajeY, currentWind);
      }
      for (const bhr of this.brokenHandRopes) {
        if (!bhr.isDead) bhr.update(fixedDelta, currentWind, lajeY);
      }

      // 6º: Sistema de aparo usa a posição física atualizada da voada
      this.checkAparos(fixedDelta, currentWind);
    });
    this.runtimeProfiler.end('physics');

    // Render visual consistente pós-física ao final do frame
    this.runtimeProfiler.begin('render2d');
    this.kites.forEach((kite) => {
      // Toda atualização visual ocorre UMA vez por frame, nunca por substep físico.
      kite.rooftopPlayer?.update(delta);
      kite.flushHPBarVisual?.();
      if (typeof kite.syncLineVisual === 'function') {
        kite.syncLineVisual();
      } else {
        kite.line.update(kite.x, kite.y, kite.visualScale, false, null, null, kite.rope?.getNodes());
      }
      kite.tail.update(kite.x, kite.y + 30, delta, currentWind?.x || 0);
    });

    // Pós-física: apenas limpeza/render. A integração já ocorreu no fixed timestep.
    for (let i = this.fallingKites.length - 1; i >= 0; i--) {
      const fk = this.fallingKites[i];
      if (fk.life <= 0) {
        this.fallingContainer.removeChild(fk);
        fk.destroy({ children: true });
        this.fallingKites.splice(i, 1);
      }
    }

    this.brokenLinesGraphic.clear();
    for (let i = this.brokenHandRopes.length - 1; i >= 0; i--) {
      const bhr = this.brokenHandRopes[i];
      bhr.draw(this.brokenLinesGraphic);
      if (bhr.isDead) this.brokenHandRopes.splice(i, 1);
    }
    this.runtimeProfiler.end('render2d');
  }



  checkRelinhos(delta) {
    const activeList = Array.from(this.kites.values());
    if (activeList.length < 2) {
      this.hud.setCombatCompact(false);
      return;
    }
    // Alterna a prioridade dos pares por frame: a primeira pipa criada não ataca sempre primeiro.
    this.combatRotation = ((this.combatRotation || 0) + 1) % activeList.length;
    activeList.push(...activeList.splice(0, this.combatRotation));

    const now = Date.now();
    for (const [key, time] of this.cutCooldowns) if (now - time >= 3000) this.cutCooldowns.delete(key);
    const deadThisFrame = new Set(); // pipas que morreram neste frame
    const seenContacts = new Set();
    const combatResponses = new CombatContactAccumulator();
    const couplingQueue = []; // aplicar só depois da detecção/resolução: check-hit não pode mutar a geometria durante o scan

    for (let i = 0; i < activeList.length; i++) {
      const kA = activeList[i];
      if (kA.isAscending || kA.spawnProtection > 0 || this._pendingCutLosers.has(String(kA.userId)) || deadThisFrame.has(kA.userId)) continue; // já morreu ou aguarda corte canônico

      for (let j = i + 1; j < activeList.length; j++) {
        const kB = activeList[j];
        if (kB.isAscending || kB.spawnProtection > 0 || this._pendingCutLosers.has(String(kB.userId)) || deadThisFrame.has(kB.userId)) continue; // já morreu ou aguarda corte canônico

        // Passo 4: Removido o broad-phase AABB da reta mão→pipa.
        // Esse AABB descartava colisões físicas válidas quando a corda curva
        // saía do AABB da reta (evidência: hit=true em RopeCollision mas
        // endpoint broad-phase=false). Confiamos no AABB interno de RopeCollision.

        // Chave única do par (sem alocação de array ou JSON.stringify)
        const idA = String(kA.userId);
        const idB = String(kB.userId);
        const pairKey = idA < idB ? (idA + '|' + idB) : (idB + '|' + idA);

        // Verifica cooldown pós-corte (3s de proteção)
        const lastCut = this.cutCooldowns.get(pairKey) || 0;
        if (now - lastCut < 3000) continue;

        // Detecção de colisão: 2 caminhos mutuamente exclusivos
        //
        // Caminho A (autoritativo): ambas as pipas têm RopePhysics
        //   → usa APENAS RopeCollision (cápsula segmento×segmento).
        //   → NÃO faz fallback para reta geométrica: a corda curva pode
        //     não passar pelo AABB da reta, e a reta pode cruzar sem
        //     que as cordas físicas se toquem (BUG: relinho sem contato).
        //
        // Caminho B (legado): pelo menos uma pipa sem RopePhysics
        //   → usa interseção geométrica reta mão→pipa (comportamento anterior).
        let inter = null;

        // 1. Coordenadas das extremidades das linhas (mão do boneco até cabresto da pipa)
        const ax1 = Number.isFinite(kA.line?.visualBaseX) ? kA.line.visualBaseX : kA.baseX;
        const ay1 = Number.isFinite(kA.line?.visualBaseY) ? kA.line.visualBaseY : kA.baseY;
        const ax2 = kA.x;
        const ay2 = kA.y;

        const bx1 = Number.isFinite(kB.line?.visualBaseX) ? kB.line.visualBaseX : kB.baseX;
        const by1 = Number.isFinite(kB.line?.visualBaseY) ? kB.line.visualBaseY : kB.baseY;
        const bx2 = kB.x;
        const by2 = kB.y;

        // Sincroniza profundidade Z do Three.js se disponível
        const k3dA = this.threeScene?.kites3D?.get(idA);
        const k3dB = this.threeScene?.kites3D?.get(idB);
        if (k3dA) { kA.z = k3dA.position.z; }
        if (k3dB) { kB.z = k3dB.position.z; }
        const deltaZ = (Number.isFinite(kA.z) && Number.isFinite(kB.z)) ? Math.abs(kA.z - kB.z) : 0;

        // 2. Interseção geométrica contínua (fallback se alguma pipa não tiver corda física XPBD)
        const bothHaveRope = Boolean(kA.rope && kB.rope);
        const ropeHit = bothHaveRope ? RopeCollision.checkRopeCollision(kA.rope, kB.rope, 8.0, {
          hint: this._ropeCollisionHints.get(pairKey),
          minSinAngle: 0.05
        }) : null;
        const geomHit = !bothHaveRope ? Physics.checkLineIntersection(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) : { hit: false };
        const hasHit = Boolean(bothHaveRope ? (ropeHit && ropeHit.hit) : geomHit.hit);

        // Se as linhas se cruzam fisicamente ou geometricamente:
        if (hasHit) {
          // Vetores diretores das linhas
          const lenA = Math.hypot(ax2 - ax1, ay2 - ay1) || 1;
          const lenB = Math.hypot(bx2 - bx1, by2 - by1) || 1;
          const tanAx = (ax2 - ax1) / lenA, tanAy = (ay2 - ay1) / lenA;
          const tanBx = (bx2 - bx1) / lenB, tanBy = (by2 - by1) / lenB;
          const dot = Math.max(-1, Math.min(1, tanAx * tanBx + tanAy * tanBy));
          const calculatedSin = Math.sqrt(Math.max(0, 1 - dot * dot));

          const contactX = ropeHit?.hit ? ropeHit.x : geomHit.x;
          const contactY = ropeHit?.hit ? ropeHit.y : geomHit.y;

          // Velocidade relativa e atrito no ponto de contato
          const rvx = (kA.vx || 0) - (kB.vx || 0);
          const rvy = (kA.vy || 0) - (kB.vy || 0);
          const relativeSpeed = ropeHit?.hit ? ropeHit.relativeSpeed : Math.hypot(rvx, rvy);
          const sinAngle = ropeHit?.hit ? ropeHit.sinAngle : calculatedSin;
          const slidingSpeed = ropeHit?.hit ? ropeHit.slidingSpeed : Math.max(1.0, relativeSpeed * sinAngle);

          // Identifica segmentos mais próximos nas cordas físicas
          const tA = Math.max(0, Math.min(1, Math.hypot(contactX - ax1, contactY - ay1) / lenA));
          const tB = Math.max(0, Math.min(1, Math.hypot(contactX - bx1, contactY - by1) / lenB));
          const nNodeA = kA.rope?.nodeCount || 12;
          const nNodeB = kB.rope?.nodeCount || 12;
          const segIdxA = ropeHit?.hit ? ropeHit.segmentIndexA : Math.min(nNodeA - 2, Math.max(0, Math.floor(tA * (nNodeA - 1))));
          const segIdxB = ropeHit?.hit ? ropeHit.segmentIndexB : Math.min(nNodeB - 2, Math.max(0, Math.floor(tB * (nNodeB - 1))));
          const contactS = ropeHit?.hit ? (ropeHit.s ?? tA) : tA;
          const contactT = ropeHit?.hit ? (ropeHit.t ?? tB) : tB;

          inter = {
            hit: true,
            x: contactX,
            y: contactY,
            z: ((kA.z || 0) + (kB.z || 0)) * 0.5,
            kiteA: kA,
            kiteB: kB,
            segmentIndexA: segIdxA,
            segmentIndexB: segIdxB,
            s: contactS,
            t: contactT,
            slidingSpeed,
            relativeSpeed,
            sinAngle,
            deltaZ,
            isXCrossing: sinAngle >= 0.05,
            c1: ropeHit?.c1 || null,
            c2: ropeHit?.c2 || null,
            distance: ropeHit?.distance,
            contactRadius: ropeHit?.contactRadius
          };

          // Não aplicar coupling durante o scan de colisão. Alterar os nós aqui faz
          // o próximo par enxergar uma geometria diferente dentro do MESMO substep,
          // gerando cascata de hits quando 3+ linhas se encontram.
          if (bothHaveRope) {
            this._ropeCollisionHints.set(pairKey, {
              segmentIndexA: inter.segmentIndexA,
              segmentIndexB: inter.segmentIndexB
            });
            couplingQueue.push({ idA, idB, ropeA: kA.rope, ropeB: kB.rope, inter });
          }

          // Contato confirmado. A profundidade 3D permanece estável; não puxamos
          // os corpos das pipas para o Z do oponente (isso criava oscilação coletiva).
          kA.isInCombat = true;
          kB.isInCombat = true;
        } else {
          if (bothHaveRope) this._ropeCollisionHints.delete(pairKey);
          continue;
        }

        if (inter.hit) {
          seenContacts.add(pairKey);
          const contact = evolveRelinhoContact(this.relinhoContacts.get(pairKey), kA, kB, now);
          // Passo 5: enriquece contact com dados físicos do RopeCollision
          // (slidingSpeed e sinAngle precisam chegar ao RelinhoContactSolver para P=F·V)
          if (contact && inter.slidingSpeed !== undefined) {
            contact.slidingSpeed = inter.slidingSpeed;
            contact.sinAngle = inter.sinAngle;
          }
          this.relinhoContacts.set(pairKey, contact);

          // Passo 7: Removido desgaste duplicado fixo (0.004 * delta).
          // O ÚNICO lugar que aplica applySegmentWear é RelinhoContactSolver,
          // evitando desgaste mesmo com slidingSpeed=0 e dupla contagem.
          // (antes: App.js + RelinhoContactSolver ambos chamavam applySegmentWear
          //  → segmento rompia em ~2.1s mesmo parado)

          // Vibração visual baseada na velocidade relativa vetorial e fricção
          const contactStrength = Math.min(1.5, 0.65 + (contact.relativeSpeed || 0) * 0.025);
          kA.line.triggerContact(contactStrength);
          kB.line.triggerContact(contactStrength);

          // Resposta corporal é AGREGADA e aplicada uma vez por pipa ao fim do step.
          // Antes cada par multiplicava drag=0.88; 3 relinhos => 0.88³ por step,
          // o que fazia a pipa praticamente congelar.
          combatResponses.addPair(kA, kB, delta);

          kA.isInCombat = true;
          kB.isInCombat = true;
          kA.combatCooldown = 0;
          kB.combatCooldown = 0;

          // Emite faíscas incandescentes no ponto exato (X, Y)
          const avgHP = ((kA.lineHP / kA.maxLineHP) + (kB.lineHP / kB.maxLineHP)) / 2;
          const sparkCount = Math.min(3 + Math.floor((1 - avgHP) * 10), 14);
          const requestedSparks = Math.ceil(sparkCount * delta);
          const visibleSparks = Math.max(0, Math.min(requestedSparks, this._combatSparkBudget || 0));
          this._combatSparkBudget = Math.max(0, (this._combatSparkBudget || 0) - visibleSparks);
          if (visibleSparks > 0) {
            this.sparks.emit(inter.x, inter.y, visibleSparks);
            if (this.threeScene && !this.threeScene.disabled) {
              const k3dA = this.threeScene.kites3D?.get(String(kA.userId));
              const k3dB = this.threeScene.kites3D?.get(String(kB.userId));
              const avgZ = (k3dA && k3dB) ? (k3dA.position.z + k3dB.position.z) * 0.5 : 120;
              const p3d = this.threeScene.screenToWorld(inter.x, inter.y, avgZ);
              this.threeScene.emitSpark3D(p3d.x, p3d.y, p3d.z, visibleSparks, kA.line?.color || 0xffea00);
            }
          }

          // Som de faísca (limitado a 1 a cada 180ms para não saturar)
          if (!this._lastSparkSound || now - this._lastSparkSound > 180) {
            this.audio.playSparksSound();
            this._lastSparkSound = now;
          }

          // Resolve combate — aplica dano por frame nas duas pipas
          const combat = resolveAuthoritativeCombat(
            this.isCombatAuthority, Physics.resolveRelinhoCombat, kA, kB, inter, delta, contact
          );
          if (!combat) continue;

          if (combat.absorbedByShield) this.socket.emit('player:shield_used', {
            userId: combat.shieldUserId, remainingShields: combat.remainingShields
          });

          if (!combat.tied && combat.winner && combat.loser) {
            // CORTE! Uma pipa morreu
            deadThisFrame.add(combat.loser.userId);
            this.cutCooldowns.set(pairKey, now);
            this.handleCutSuccess(combat.winner, combat.loser, combat.cutX, combat.cutY, combat.breakInfo);
            break; // sai do loop interno, pipa A pode ter sido afetada
          }
        }
      }
    }
    // Só agora, depois que todos os check-hit/combates do substep usaram a mesma
    // geometria, aplicamos o engate elástico. Isso evita feedback dentro do próprio
    // detector e reduz a cascata de colisões em 3+ relinhos simultâneos.
    for (const job of selectCouplingJobs(couplingQueue, 3)) {
      if (!job.ropeA?.isBroken && !job.ropeB?.isBroken) {
        RopeCollision.applyMutualContactCoupling(job.ropeA, job.ropeB, job.inter, 0.18);
      }
    }

    // Uma única resposta mecânica por pipa, independentemente de quantos pares
    // de relinho ela participa neste mesmo fixed step.
    combatResponses.apply(delta);

    for (const [key, state] of this.relinhoContacts) {
      if (seenContacts.has(key)) continue;
      if (state?.phase !== 'RELEASE') this.relinhoContacts.set(key, { ...state, phase: 'RELEASE', releasedAt: now });
      else if (now - (state.releasedAt || now) > 220) {
        this.relinhoContacts.delete(key);
        this._ropeCollisionHints.delete(key);
      }
    }
    this.hud.setCombatCompact(seenContacts.size > 0);
  }

  checkAparos(delta, currentWind) {
    return this.aparoController.check({
      isAuthority: this.isCombatAuthority,
      activeKites: Array.from(this.kites.values()),
      fallingKites: this.fallingKites,
      delta,
      currentWind
    });
  }

  handleCutSuccess(winner, loser, cutX, cutY, breakInfo = null) {
    if (!winner || !loser) return;
    const loserUserId = String(loser.userId);
    if (!this.kites.has(loser.userId) && !this.kites.has(loserUserId)) return;

    // Somente o cliente que possui a autoridade pode propor um corte. Os demais
    // clientes mantêm a pipa viva até receberem game:cut_occurred do backend.
    if (!this.isCombatAuthority || !this.socket?.connected) {
      loser.lineHP = Math.max(1, Number(loser.lineHP) || 1);
      loser.updateHPBar?.();
      return;
    }
    if (this._pendingCutLosers.has(loserUserId)) return;

    const loserNick = loser.nickname || 'Jogador';
    const effectiveBreakInfo = breakInfo || {
      breakPoint: {
        x: Number.isFinite(cutX) ? cutX : loser.x,
        y: Number.isFinite(cutY) ? cutY : loser.y,
        z: Number.isFinite(loser.z) ? loser.z : 120
      },
      remainingRatio: 0.5
    };

    // Snapshot físico usado somente como evidência do claim. Nenhuma remoção,
    // pontuação, som ou ruptura visual acontece antes da validação do backend.
    const checkpoint = captureArena(this.kites.values(), this.arenaSessionId || 'default');
    const checkpointPayload = {
      width: this.app.screen.width,
      height: this.app.screen.height,
      kites: checkpoint.kites
    };

    this._pendingCutLosers.add(loserUserId);
    this.socket.emit('relinho:cut', {
      winnerId: winner.userId,
      winnerNick: winner.nickname,
      loserId: loserUserId,
      loserNick,
      cutX,
      cutY,
      breakSegmentIndex: Number.isFinite(effectiveBreakInfo.segmentIndex) ? effectiveBreakInfo.segmentIndex : null,
      breakSegmentT: Number.isFinite(effectiveBreakInfo.segmentT) ? effectiveBreakInfo.segmentT : null,
      lineType: winner.lineType,
      checkpoint: checkpointPayload
    }, (ack) => {
      if (ack?.ok) return;
      if (this._pendingCutLosers.delete(loserUserId)) {
        console.warn('[relinho:cut] Rejeitado via ack:', ack?.reason || 'NO_ACK');
        this.syncArena();
      }
    });
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    this._socketSubscriptions.dispose();
    this._lifecycle.dispose();
    this._onKeyDown = null;
    this._onWindowResize = null;
    this._onRendererResize = null;
    this._onCanvasPointerDown = null;

    if (this.audio) {
      try { this.audio.destroy(); } catch (_) { }
      this.audio = null;
    }
    if (this.threeScene) {
      this.threeScene.destroy();
      this.threeScene = null;
    }
    if (this.app) {
      try {
        this.app.destroy(true, { children: true, texture: true, baseTexture: true });
      } catch (_) { }
    }
  }
}

