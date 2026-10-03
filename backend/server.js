const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const GameRules = require('./rules/gameRules');
const BuffManager = require('./rules/buffManager');
const TikTokService = require('./tiktokService');
const { normalizeUsername, readSavedUsername, saveUsername, clearSavedUsername } = require('./savedLiveProfile');
const ArenaStateStore = require('./arenaStateStore');
const GiftCatalog = require('./giftCatalog');
const playerSpawnPayload = require('./playerSpawnPayload');
const { requireLocalControl, canClaimCombat, isLoopbackOrigin } = require('./localControl');
const { requireSimulationEnabled } = require('./simulationGuard');
const { capturePlayerStates } = require('./arenaLiveState');
const { validateCutClaim } = require('./cutClaimValidator');
const { CatchClaimRegistry } = require('./catchClaimRegistry');
const { registerCanonicalCatchHandler } = require('./socketCatchHandler');
const GameReplayStore = require('./gameReplayStore');
const SettingsManager = require('./settingsManager');
const { openPipaDatabase } = require('./persistence/database');
const PlayerRepository = require('./persistence/playerRepository');
const GiftLedger = require('./persistence/giftLedger');
const PlayerInventory = require('./persistence/playerInventory');
const AvatarCache = require('./persistence/avatarCache');
const MarketplaceService = require('./persistence/marketplaceService');
const PlayerPlatform = require('./persistence/playerPlatform');
const settingsManager = new SettingsManager();

const app = express();
const server = http.createServer(app);

const corsOriginValidator = (origin, callback) => {
  if (!origin || isLoopbackOrigin(origin) || process.env.PIPA_ALLOW_REMOTE_CONTROL === '1') {
    callback(null, true);
  } else {
    callback(new Error('CORS not allowed for cross-origin origin'));
  }
};

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Middlewares
app.use(cors({ origin: corsOriginValidator }));
app.use(express.json());
const AVATAR_CACHE_ROOT = process.env.PIPA_AVATAR_CACHE_DIR || path.join(__dirname, 'data', 'avatars');
app.use('/player-assets/avatars', express.static(AVATAR_CACHE_ROOT, {
  fallthrough: false, index: false, dotfiles: 'deny', maxAge: '1h'
}));

// Instâncias dos Gerenciadores
const initialSettings = settingsManager.getSettings();
const gameRules = new GameRules(initialSettings.maxKites, 1000, 3000, initialSettings.winStreakKing);
const buffManager = new BuffManager(io);
let persistentDb = null;
let playerPlatform = null;
let marketplaceService = null;
try {
  persistentDb = openPipaDatabase(process.env.PIPA_DB_FILE || undefined);
  const repository = new PlayerRepository(persistentDb);
  const giftLedger = new GiftLedger(persistentDb);
  const inventory = new PlayerInventory(persistentDb);
  const avatarCache = new AvatarCache({ db:persistentDb, rootDir:AVATAR_CACHE_ROOT });
  const configuredCustomKiteCoins = Number(process.env.PIPA_CUSTOM_KITE_MIN_COINS);
  marketplaceService = new MarketplaceService({ db:persistentDb, inventory,
    customKiteMinCoins:Number.isFinite(configuredCustomKiteCoins) && configuredCustomKiteCoins > 0 ? configuredCustomKiteCoins : null });
  playerPlatform = new PlayerPlatform({ db:persistentDb, repository, ledger:giftLedger, inventory, avatarCache, marketplace:marketplaceService });
} catch (error) {
  console.warn('[Persistence] Plataforma persistente indisponível; a arena seguirá em memória:', error?.message || error);
  try { persistentDb?.close(); } catch (_) {}
  persistentDb = null; playerPlatform = null; marketplaceService = null;
}
const tiktokService = new TikTokService(io, gameRules, buffManager);
tiktokService.playerPlatform = playerPlatform;
function buildSpawnPayload(player) {
  const persistent = playerPlatform && player ? playerPlatform.spawnSnapshot(player.userId) : null;
  return playerSpawnPayload(player, buffManager, undefined, persistent);
}
tiktokService.chatActionsEnabled = process.env.PIPA_ENABLE_CHAT_ACTIONS === '1';
const giftCatalog = new GiftCatalog(process.env.PIPA_GIFT_CATALOG_FILE || undefined);
tiktokService.giftCatalog = giftCatalog;
const replayStore = new GameReplayStore(process.env.PIPA_REPLAY_DIR || undefined);
tiktokService.replayStore = replayStore;
const arenaStore = new ArenaStateStore(process.env.PIPA_ARENA_STATE_FILE || undefined);
const restoredArena = arenaStore.restore(gameRules, buffManager);
let arenaSessionId = arenaStore.sessionId;
const recentValidatedCuts = new Map();
const catchRegistry = new CatchClaimRegistry({ ttlMs: 25000 });
let arenaPersistTimer = null;
function flushArena() {
  if (arenaPersistTimer) { clearTimeout(arenaPersistTimer); arenaPersistTimer = null; }
  if (arenaStore.dirty) arenaStore.save(gameRules, buffManager);
}
function persistArena() {
  arenaStore.dirty = true;
  if (arenaPersistTimer) return;
  arenaPersistTimer = setTimeout(() => { arenaPersistTimer = null; flushArena(); }, 100);
  arenaPersistTimer.unref?.();
}
function persistArenaNow() { arenaStore.dirty = true; flushArena(); }
tiktokService.onArenaMutation = persistArena;
buffManager.onArenaMutation = persistArena;
let savedUsername = readSavedUsername();
let autoConnectPaused = false;
let connectionAttempt = null;
let nextAutoConnectAt = 0;
let retryDelayMs = 10000;

function attemptLiveConnection(username, persist = false) {
  if (connectionAttempt) return connectionAttempt;
  if (tiktokService.isConnected && tiktokService.currentUsername === username)
    return Promise.resolve({ success: true, alreadyConnected: true });
  connectionAttempt = (async () => {
    if (persist) {
      savedUsername = saveUsername(username);
      autoConnectPaused = false;
      retryDelayMs = 10000;
      nextAutoConnectAt = 0;
    }
    return tiktokService.connect(username);
  })().finally(() => { connectionAttempt = null; });
  return connectionAttempt;
}

function autoConnectSavedLive() {
  if (autoConnectPaused || !savedUsername || connectionAttempt || tiktokService.isConnected || Date.now() < nextAutoConnectAt) return;
  nextAutoConnectAt = Date.now() + retryDelayMs;
  attemptLiveConnection(savedUsername).then(() => {
    retryDelayMs = 10000;
    nextAutoConnectAt = 0;
  }).catch(() => {
    // A Live pode estar offline ou o transporte instável: retentar com intervalo limitado.
    nextAutoConnectAt = Date.now() + retryDelayMs;
    retryDelayMs = Math.min(60000, retryDelayMs * 2);
  });
}

tiktokService.onTransportDown = () => {
  if (process.env.PIPA_DISABLE_TIKTOK_AUTOCONNECT === '1' || autoConnectPaused || !savedUsername) return;
  nextAutoConnectAt = 0;
  setTimeout(autoConnectSavedLive, 750).unref();
};

tiktokService.onLiveEnded = () => {
  arenaStore.reset(gameRules, buffManager, { scope: 'kites' });
  recentValidatedCuts.clear();
  catchRegistry.clear();
  io.emit('arena:reset', { scope: 'kites', reason: 'live_ended' });
  io.emit('competition:queue', { length: gameRules.queue.length });
};

// Rota do Painel Admin Dev
app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/api/tiktok/status', (req, res) => {
  res.json({ connected: tiktokService.isConnected, username: tiktokService.isConnected ? tiktokService.currentUsername : null,
    savedUsername, autoConnectPaused, connecting: Boolean(connectionAttempt),
    lastError: tiktokService.lastConnectionError, eventsActive: tiktokService.hasReceivedEvent,
    lastEventAt: tiktokService.lastEventAt, eventCounts: tiktokService.eventCounts,
    roomFoundCount: tiktokService.roomFoundCount, transportReconnecting: tiktokService.transportReconnecting,
    internalRetry: tiktokService.internalRetry, transportWarnings: tiktokService.transportWarnings,
    transportRecoveries: tiktokService.transportRecoveries,
    lastTransportRecoveredAt: tiktokService.lastTransportRecoveredAt,
    lastTransportActivityAt: tiktokService.lastTransportActivityAt,
    retrying: process.env.PIPA_DISABLE_TIKTOK_AUTOCONNECT !== '1' && !autoConnectPaused && !tiktokService.isConnected && Boolean(savedUsername) });
});

app.get('/api/competition/arena', (req, res) => {
  // Envie somente jogadores validados pelo backend; nunca ressuscite pipas da tela antiga.
  const players = [...gameRules.activePlayers.values()].map(buildSpawnPayload);
  res.set('Cache-Control', 'no-store');
  res.json({ sessionId: arenaSessionId, players, leaderId: gameRules.leaderId, kingId: gameRules.kingId,
    queue: gameRules.queue.length, at: Date.now(),
    playerStates: Object.fromEntries([...arenaStore.playerStates.entries()].filter(([id]) => gameRules.activePlayers.has(id))) });
});

app.get('/api/tiktok/health', (req,res) => {
  res.set('Cache-Control','no-store');
  res.json(tiktokService.activityMonitor.snapshot({
    connected:tiktokService.isConnected, eventsActive:tiktokService.hasReceivedEvent
  }));
});

app.get('/api/replays', (req,res) => {
  res.set('Cache-Control','no-store'); res.json({replays:replayStore.list()});
});
app.post('/api/replays/archive', requireLocalControl, (req,res) => {
  const file=replayStore.save(req.body?.label || 'live');
  res.json({success:Boolean(file),file:file ? path.basename(file) : null});
});
app.post('/api/replays/:name/run', requireLocalControl, async (req,res) => {
  try {
    const result=await replayStore.replay(req.params.name,{
      chat:data=>tiktokService.handleChatMessage(data),
      gift:data=>tiktokService.handleGift(data),
      like:data=>tiktokService.handleLike({...data,likeCount:Math.max(1,Number(data.count)||1),totalLikes:Math.max(1,Number(data.count)||1)}),
      share:data=>tiktokService.handleShare(data),
      follow:data=>tiktokService.handleFollow(data)
    },{speed:Math.min(100,Math.max(1,Number(req.body?.speed)||20))});
    res.json(result);
  } catch(error) { res.status(400).json({success:false,error:String(error.message||error)}); }
});

app.get('/api/competition/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ arenaSessionId, active: gameRules.activePlayers.size, queue: gameRules.queue.length,
    savedAt: arenaStore.lastSavedAt, persistError: arenaStore.lastError,
    restoredAtStartup: restoredArena, combat: { authorityActive: Boolean(combatOwnerSocketId), fps: latestArenaFps,
      lastHeartbeatAt: combatOwnerLastHeartbeatAt || null }, tiktok: {
      connected: tiktokService.isConnected, eventsActive: tiktokService.hasReceivedEvent,
      lastEventAt: tiktokService.lastEventAt || null, eventCounts: tiktokService.eventCounts || {},
      failures: tiktokService.connectionFailures, roomsFound: tiktokService.roomFoundCount,
      transportReconnecting: tiktokService.transportReconnecting,
      transportWarnings: tiktokService.transportWarnings,
      transportRecoveries: tiktokService.transportRecoveries,
      lastTransportRecoveredAt: tiktokService.lastTransportRecoveredAt,
      lastTransportActivityAt: tiktokService.lastTransportActivityAt,
      lastTransportWarning: tiktokService.lastTransportWarning,
      internalRetry: tiktokService.internalRetry,
      lastRoomLocatedAt: tiktokService.lastRoomLocatedAt,
      lastError: tiktokService.lastConnectionError,
      activity: tiktokService.activityMonitor.snapshot({connected:tiktokService.isConnected,eventsActive:tiktokService.hasReceivedEvent}),
      retrying: process.env.PIPA_DISABLE_TIKTOK_AUTOCONNECT !== '1' && !autoConnectPaused && !tiktokService.isConnected && Boolean(savedUsername)
    } });
});

app.get('/api/gifts/catalog', (req,res) => {
  res.set('Cache-Control','no-store');
  res.json({ scope:'configured-and-observed', note:'O catálogo global do TikTok varia por Live, região e data; itens adicionais são descobertos ao serem recebidos.',
    gifts:giftCatalog.list() });
});

app.get('/api/marketplace/custom-kite-orders', requireLocalControl, (req,res) => {
  if (!marketplaceService) return res.status(503).json({success:false,error:'Persistência indisponível'});
  try {
    const orders=marketplaceService.listCustomKiteOrders(req.query?.userId || null);
    res.set('Cache-Control','no-store');
    res.json({success:true,orders});
  } catch (error) { res.status(400).json({success:false,error:String(error.message||error)}); }
});
app.post('/api/marketplace/custom-kite-orders/:id/approve', requireLocalControl, (req,res) => {
  if (!marketplaceService) return res.status(503).json({success:false,error:'Persistência indisponível'});
  try {
    const ownedKite=marketplaceService.approveCustomKiteOrder(req.params.id,req.body||{});
    res.json({success:true,ownedKite});
  } catch (error) { res.status(400).json({success:false,error:String(error.message||error)}); }
});

app.get('/api/competition/stats', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ top: gameRules.sessionRanking(10), highlights: gameRules.sessionHighlights(),
    currentLeader: gameRules.activePlayers.get(gameRules.leaderId) || null,
    currentKing: gameRules.activePlayers.get(gameRules.kingId) || null,
    activeTop: [...gameRules.activePlayers.values()].sort((a,b) => b.score-a.score || b.streak-a.streak).slice(0,5),
    queue: gameRules.queue.length, active: gameRules.activePlayers.size,
    leaderId: gameRules.leaderId, kingId: gameRules.kingId });
});

// APIs de Simulação e Conexão TikTok
app.post('/api/tiktok/connect', requireLocalControl, async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (connectionAttempt) return res.status(409).json({ success: false, error: 'Conexão já em andamento. Aguarde.' });
    const result = await attemptLiveConnection(username, true);
    res.json(result);
  } catch (err) {
    const message = String(err.message || '');
    const reason = /requires a Business plan|business plan/i.test(message)
      ? 'O conector TikTok atual exige um plano Business do provedor Euler Stream para esta conexão. Nenhuma Live foi conectada.'
      : /offline|not live|not found|room.*not|user.*not/i.test(message)
        ? 'A Live não foi encontrada. Inicie a transmissão e confira o @usuário.'
        : 'Não foi possível conectar ao TikTok. Confirme que a Live está ativa e tente novamente.';
    res.status(502).json({ success: false, error: reason });
  }
});

app.post('/api/tiktok/disconnect', requireLocalControl, async (req, res) => {
  autoConnectPaused = true; // desconectar manualmente suspende reconexões até novo clique ou reinício.
  await tiktokService.disconnect();
  res.json({ success: true });
});

app.post('/api/simulate/comment', requireLocalControl, requireSimulationEnabled, (req, res) => {
  tiktokService.handleChatMessage({ ...req.body, simulation: true });
  res.json({ success: true });
});

app.post('/api/simulate/gift', requireLocalControl, requireSimulationEnabled, (req, res) => {
  tiktokService.handleGift({ ...req.body, simulation: true });
  res.json({ success: true });
});

app.post('/api/simulate/likes', requireLocalControl, requireSimulationEnabled, (req, res) => {
  const count=Math.max(1,Math.min(1000,Number(req.body?.count)||20));
  tiktokService.handleLike({...req.body,userId:String(req.body?.userId||'sim_like_admin'),nickname:String(req.body?.nickname||'TapTap_Admin'),likeCount:count,totalLikes:count,simulation:true});
  res.json({ success: true });
});

app.post('/api/simulate/share', requireLocalControl, requireSimulationEnabled, (req,res) => {
  tiktokService.handleShare({...req.body,userId:String(req.body?.userId||'sim_share_admin'),nickname:String(req.body?.nickname||'Share_Admin'),simulation:true});
  res.json({success:true});
});

app.post('/api/simulate/follow', requireLocalControl, requireSimulationEnabled, (req,res) => {
  tiktokService.handleFollow({...req.body,userId:String(req.body?.userId||'sim_follow_admin'),nickname:String(req.body?.nickname||'Follow_Admin'),simulation:true});
  res.json({success:true});
});

app.post('/api/competition/reset', requireLocalControl, async (req, res) => {
  const scope = req.body?.scope || 'all'; // 'all' | 'kites' | 'stats'
  const clearProfile = Boolean(req.body?.clearProfile);

  if (!['all', 'kites', 'stats'].includes(scope)) {
    return res.status(400).json({ success: false, error: 'Escopo inválido. Escolha: all, kites ou stats.' });
  }

  // 1. Executa reset no store e nas instâncias
  arenaStore.reset(gameRules, buffManager, { scope });
  arenaSessionId = arenaStore.sessionId;
  recentValidatedCuts.clear();
  catchRegistry.clear();

  // 2. Se for solicitado limpar perfil do TikTok
  if (clearProfile) {
    clearSavedUsername();
    savedUsername = null;
    autoConnectPaused = true;
    try { await tiktokService.disconnect(); } catch (_) {}
  }

  // 3. Emite eventos para sincronizar todas as telas do jogo e admin
  io.emit('arena:reset', {
    scope,
    sessionId: arenaStore.sessionId,
    at: Date.now()
  });

  io.emit('competition:queue', { length: gameRules.queue.length });
  io.emit('competition:leader_changed', { userId: null });
  if (clearProfile) {
    io.emit('tiktok:status', {
      connected: tiktokService.isConnected,
      username: null,
      savedUsername: null,
      autoConnectPaused: true
    });
  }

  res.json({
    success: true,
    scope,
    sessionId: arenaStore.sessionId,
    activePlayers: gameRules.activePlayers.size,
    queue: gameRules.queue.length,
    savedUsername
  });
});

app.get('/api/settings', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(settingsManager.getSettings());
});

app.post('/api/settings', requireLocalControl, (req, res) => {
  const updated = settingsManager.updateSettings(req.body);
  gameRules.maxKitesOnScreen = updated.maxKites;
  gameRules.winStreakKing = updated.winStreakKing;
  io.emit('settings:updated', updated);
  res.json({ success: true, settings: updated });
});

app.post('/api/settings/reset', requireLocalControl, (req, res) => {
  const defaults = settingsManager.resetSettings();
  gameRules.maxKitesOnScreen = defaults.maxKites;
  gameRules.winStreakKing = defaults.winStreakKing;
  io.emit('settings:updated', defaults);
  res.json({ success: true, settings: defaults });
});

app.post('/api/competition/admin-action', requireLocalControl, (req, res) => {
  const { action, userId, payload } = req.body || {};
  if (!userId) return res.status(400).json({ success: false, error: 'userId obrigatório' });
  const player = gameRules.activePlayers.get(userId);
  if (!player && action !== 'spawn') {
    return res.status(404).json({ success: false, error: 'Jogador não está ativo na arena' });
  }

  if (action === 'crown') {
    if (gameRules.kingId && gameRules.activePlayers.has(gameRules.kingId)) {
      gameRules.activePlayers.get(gameRules.kingId).isKing = false;
    }
    gameRules.kingId = userId;
    player.isKing = true;
    persistArena();
    io.emit('competition:champion_cut', { winnerId: userId, winnerNick: player.nickname, loserId: null, loserNick: null });
    io.emit('competition:leader_changed', { userId, nickname: player.nickname, isKing: true });
    return res.json({ success: true, action: 'crown', userId });
  }

  if (action === 'cut') {
    const cut = gameRules.handlePlayerCut(userId);
    buffManager.removePlayer(userId);
    arenaStore.playerStates.delete(String(userId));
    persistArenaNow();
    io.emit('competition:queue', { length: gameRules.queue.length });
    io.emit('game:cut_occurred', {
      winnerId: 'admin',
      winnerNick: 'ADMINISTRAÇÃO',
      loserId: userId,
      loserNick: player.nickname,
      cutX: 540,
      cutY: 500,
      lineType: 'chile'
    });
    if (cut && cut.spawnedFromQueue) {
      const sp = cut.spawnedFromQueue;
      const spPayload = buildSpawnPayload(sp);
      io.emit('player:spawn', spPayload);
    }
    return res.json({ success: true, action: 'cut', userId });
  }

  if (action === 'give_buff') {
    const lineType = payload?.lineType || 'chile';
    const duration = Math.min(180, Math.max(10, Number(payload?.duration) || settingsManager.getSettings().buffDurationSec));
    const power = lineType === 'kevlar' ? 3.0 : lineType === 'chile' ? 2.2 : lineType === 'cerol' ? 1.5 : 2.0;
    const color = lineType === 'kevlar' ? '#ffd700' : lineType === 'chile' ? '#00e5ff' : lineType === 'cerol' ? '#ff0055' : '#a855f7';
    const shield = lineType === 'kevlar' ? 2 : 1;
    const giftConfig = {
      lineType,
      powerMultiplier: power,
      color,
      lineWidth: 1.8,
      shieldCount: shield,
      specialAbility: (lineType === 'tornado' ? 'tornado' : lineType === 'mestre_do_ceu' ? 'invulnerable' : 'cut_speed'),
      durationSeconds: duration,
      maxDurationSeconds: duration * 2
    };
    buffManager.applyGiftUpgrade(userId, giftConfig, 1);
    persistArena();
    const buffNames = {
      cerol: 'Cerol Afiado',
      chile: 'Linha Chilena',
      kevlar: 'Kevlar Blindado',
      tornado: 'Perfume Tornado',
      mestre_do_ceu: 'Mestre do Céu'
    };
    io.emit('gift:received', {
      userId,
      uniqueId: player.uniqueId || player.nickname,
      giftId: lineType,
      giftName: buffNames[lineType] || lineType,
      nickname: player.nickname,
      lineType,
      diamondCount: lineType === 'mestre_do_ceu' ? 1000 : lineType === 'tornado' ? 100 : lineType === 'kevlar' ? 50 : 10,
      upgrade: {
        lineType,
        powerMultiplier: power,
        durationSeconds: duration
      }
    });
    return res.json({ success: true, action: 'give_buff', userId, lineType, duration });
  }

  if (action === 'trigger_maneuver') {
    const maneuverName = payload?.maneuverName || 'retao';
    io.emit('competition:maneuver', {
      userId: String(userId),
      giftName: maneuverName,
      giftCost: 10,
      repeatCount: 1
    });
    return res.json({ success: true, action: 'trigger_maneuver', userId, maneuverName });
  }

  if (action === 'kick') {
    gameRules.activePlayers.delete(userId);
    buffManager.removePlayer(userId);
    arenaStore.playerStates.delete(String(userId));
    if (gameRules.kingId === userId) gameRules.kingId = null;
    if (gameRules.leaderId === userId) gameRules.leaderId = null;
    let spawned = null;
    if (gameRules.queue.length > 0) {
      spawned = gameRules.queue.shift();
      gameRules.activePlayers.set(spawned.userId, spawned);
      buffManager.initPlayer(spawned.userId);
      const spPayload = buildSpawnPayload(spawned);
      io.emit('player:spawn', spPayload);
    }
    persistArenaNow();
    io.emit('arena:reset', { scope: 'single_player', kickedId: userId });
    io.emit('competition:queue', { length: gameRules.queue.length });
    return res.json({ success: true, action: 'kick', userId, spawnedNext: spawned?.nickname || null });
  }

  return res.status(400).json({ success: false, error: 'Ação administrativa desconhecida' });
});

// Somente um renderizador pode informar cortes por vez.
let combatOwnerSocketId = null;
let combatOwnerLastHeartbeatAt = 0;
latestArenaFps = null;
setInterval(() => {
  if (!combatOwnerSocketId || Date.now() - combatOwnerLastHeartbeatAt < 12000) return;
  const former = combatOwnerSocketId;
  combatOwnerSocketId = null;
  latestArenaFps = null;
  io.to(former).emit('arena:authority_revoked');
  io.emit('arena:authority_available');
}, 3000).unref();
// Eventos de Jogo disparados pelo Motor PixiJS Frontend
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);
  socket.emit('settings:sync', settingsManager.getSettings());
  socket.on('arena:claim_authority', (reply) => {
    if (!canClaimCombat(socket)) {
      if (typeof reply === 'function') reply({granted:false,reason:'local_only'});
      return;
    }
    if (!combatOwnerSocketId || !io.sockets.sockets.has(combatOwnerSocketId)) {
      combatOwnerSocketId = socket.id;
      combatOwnerLastHeartbeatAt = Date.now();
    }
    if (typeof reply === 'function') reply({ granted: combatOwnerSocketId === socket.id });
  });

  socket.on('arena:heartbeat', ({ fps } = {}) => {
    if (combatOwnerSocketId !== socket.id) return;
    combatOwnerLastHeartbeatAt = Date.now();
    if (Number.isFinite(fps)) latestArenaFps = Math.round(Math.max(0, Math.min(240, fps)));
  });

  // Estado vivo can?nico: o dono da simula??o publica em mem?ria e todos os
  // outros navegadores espelham o mesmo HP/posi??o/corda sem gravar em disco.
  socket.on('arena:live_state', payload => {
    if (socket.id !== combatOwnerSocketId) return;
    const updated = capturePlayerStates(payload, gameRules, buffManager);
    if (!updated) return;
    combatOwnerLastHeartbeatAt = Date.now();
    arenaStore.playerStates = updated;
    socket.broadcast.emit('arena:state', {
      sessionId: arenaSessionId,
      at: Date.now(),
      width: Number(payload?.width) || 1080,
      height: Number(payload?.height) || 1920,
      kites: [...updated.values()]
    });
  });

  socket.on('arena:checkpoint', payload => {
    if (canClaimCombat(socket) && (!combatOwnerSocketId || !io.sockets.sockets.has(combatOwnerSocketId))) {
      combatOwnerSocketId = socket.id;
      combatOwnerLastHeartbeatAt = Date.now();
    }
    if (socket.id !== combatOwnerSocketId) return;
    const updated = capturePlayerStates(payload, gameRules, buffManager);
    if (!updated) return;
    arenaStore.playerStates = updated;
    persistArena();
  });

  // Consumo idempotente no cliente único; preserva escudos restantes em combos.
  socket.on('player:shield_used', (data) => {
    if (socket.id !== combatOwnerSocketId) return;
    if (!data || !gameRules.activePlayers.has(data.userId)) return;
    const current = buffManager.getPlayerBuff(data.userId).shieldCount;
    if (Number.isInteger(data.remainingShields) && data.remainingShields === current - 1)
      buffManager.consumeShield(data.userId); // buffManager persiste a alteração
  });

  // Quando o frontend detecta um corte de relinho
  socket.on('relinho:cut', (data, callback) => {
    // data: { winnerId, loserId, cutX, cutY, lineType }
    const sendAck = (payload) => {
      if (typeof callback === 'function') {
        try { callback(payload); } catch (_) {}
      }
    };

    if (canClaimCombat(socket) && (!combatOwnerSocketId || !io.sockets.sockets.has(combatOwnerSocketId))) {
      combatOwnerSocketId = socket.id;
      combatOwnerLastHeartbeatAt = Date.now();
    }
    if (socket.id !== combatOwnerSocketId) {
      sendAck({ ok: false, reason: 'NOT_AUTHORITY' });
      socket.emit('relinho:cut_rejected', { ok: false, reason: 'NOT_AUTHORITY', winnerId: data?.winnerId, loserId: data?.loserId });
      return;
    }
    // O checkpoint anexado ao claim é candidato: serve para validar a geometria
    // mais recente, mas NÃO pode contaminar o estado canônico se o corte falhar.
    let checkpointStates = null;
    let candidateStates = arenaStore.playerStates;
    if (data?.checkpoint) {
      checkpointStates = capturePlayerStates(data.checkpoint, gameRules, buffManager);
      if (checkpointStates) {
        candidateStates = new Map(arenaStore.playerStates);
        for (const [k, v] of checkpointStates) candidateStates.set(k, v);
      }
    }
    const validated=validateCutClaim(data,gameRules,candidateStates);
    if(!validated.ok) {
      console.warn('[relinho:cut] Rejeitado:', validated.reason, 'data:', data);
      sendAck({ ok: false, reason: validated.reason });
      socket.emit('relinho:cut_rejected', { ok: false, reason: validated.reason, winnerId: data?.winnerId, loserId: data?.loserId });
      return;
    }
    const pairKey=[validated.winnerId,validated.loserId].sort().join('|'),now=Date.now();
    for(const [key,at] of recentValidatedCuts)if(now-at>4000)recentValidatedCuts.delete(key);
    if(now-(recentValidatedCuts.get(pairKey)||0)<2500) {
      sendAck({ ok: false, reason: 'DUPLICATE_CUT' });
      socket.emit('relinho:cut_rejected', { ok: false, reason: 'DUPLICATE_CUT', winnerId: validated.winnerId, loserId: validated.loserId });
      return;
    }
    recentValidatedCuts.set(pairKey,now);
    data={...data,...validated,lineType:buffManager.getPlayerBuff(validated.winnerId).lineType};
    const cutResult = gameRules.recordCut(validated.winnerId, validated.loserId);
    if (!cutResult) {
      sendAck({ ok: false, reason: 'RECORD_CUT_FAILED' });
      socket.emit('relinho:cut_rejected', { ok: false, reason: 'RECORD_CUT_FAILED', winnerId: validated.winnerId, loserId: validated.loserId });
      return;
    }
    if (checkpointStates) {
      for (const [k, v] of checkpointStates) arenaStore.playerStates.set(k, v);
    }
    sendAck({ ok: true, cutResult });
    const winner = cutResult.winner;
    catchRegistry.registerCut({ loserId: data.loserId, loserNick: cutResult.cutPlayer.nickname });
    buffManager.removePlayer(data.loserId);
    arenaStore.playerStates.delete(String(data.loserId));
    persistArenaNow();
    io.emit('competition:queue', { length: gameRules.queue.length });
    if (cutResult.dethroned) io.emit('competition:champion_cut', {
      winnerId: winner.userId, winnerNick: winner.nickname, loserId: data.loserId,
      loserNick: cutResult.cutPlayer.nickname
    });
    if ([2, 3, 5, 10].includes(winner.streak)) io.emit('competition:milestone', {
      userId: winner.userId, nickname: winner.nickname, streak: winner.streak
    });

    // Notifica todos os clientes conectados (OBS, Admin, etc.)
    io.emit('game:cut_occurred', {
      winnerId: data.winnerId,
      winnerNick: winner.nickname,
      loserId: data.loserId,
      loserNick: cutResult.cutPlayer.nickname,
      cutX: data.cutX,
      cutY: data.cutY,
      breakSegmentIndex: Number.isFinite(data.breakSegmentIndex) ? data.breakSegmentIndex : null,
      breakSegmentT: Number.isFinite(data.breakSegmentT) ? data.breakSegmentT : null,
      lineType: data.lineType,
      winnerScore: winner ? winner.score : 1,
      isKing: winner ? winner.isKing : false,
      kingId: gameRules.kingId
    });

    // Liderança só é anunciada após o corte ser validado e registrado no backend.
    if (cutResult.leadershipChanged) {
      io.emit('competition:leader_changed', cutResult.leader ? {
        userId: cutResult.leader.userId,
        nickname: cutResult.leader.nickname,
        profilePictureUrl: cutResult.leader.profilePictureUrl,
        score: cutResult.leader.score,
        streak: cutResult.leader.streak
      } : { userId: null });
    }

    // Se havia alguém na fila de espera, sobe a pipa
    if (cutResult && cutResult.spawnedFromQueue) {
      const q = cutResult.spawnedFromQueue;
      io.emit('player:spawn', buildSpawnPayload(q));
    }
  });

  registerCanonicalCatchHandler({
    socket,
    io,
    catchRegistry,
    gameRules,
    persistArenaNow,
    getCombatOwnerSocketId: () => combatOwnerSocketId
  });

  socket.on('disconnect', () => {
    if (combatOwnerSocketId === socket.id) {
      combatOwnerSocketId = null;
      latestArenaFps = null;
      socket.broadcast.emit('arena:authority_available');
    }
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });
});

// Servir frontend estático caso buildado, ou redirecionar no modo dev
const distPath = process.env.PIPA_FRONTEND_DIST
  ? path.resolve(process.env.PIPA_FRONTEND_DIST)
  : path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

const distIndex = path.join(distPath, 'index.html');
const rawIndex = path.join(__dirname, '..', 'frontend', 'index.html');

// Se não encontrar rota na dist, serve dist/index.html se existir, ou fallback em dev
app.get('/', (req, res) => {
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(rawIndex)) {
    return res.sendFile(rawIndex);
  }
  return res.status(500).send('Frontend dist build not found. Please run "npm run build".');
});

// Inicia Servidor
server.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🪁 Servidor Rei da Laje rodando em http://${HOST}:${PORT}`);
  console.log(`🎮 Tela do Jogo (OBS Studio): http://${HOST}:${PORT}/`);
  console.log(`🛠️ Painel Admin Dev:         http://${HOST}:${PORT}/admin`);
  console.log(`=================================================`);
  if (process.env.PIPA_DISABLE_TIKTOK_AUTOCONNECT !== '1') setTimeout(autoConnectSavedLive, 1500).unref();
  console.log(`[Arena] ${restoredArena ? 'Partida restaurada' : 'Nova sessão'}: ${gameRules.activePlayers.size} pipas.`);
});
if (process.env.PIPA_DISABLE_TIKTOK_AUTOCONNECT !== '1') setInterval(autoConnectSavedLive, 10000).unref();
setInterval(() => { if (arenaStore.dirty && !arenaPersistTimer) flushArena(); }, 5000).unref();

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Process Warning] Rejeição não tratada detectada:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Exceção não capturada no servidor:', err);
});

let shuttingDown=false;
async function gracefulShutdown() {
  if(shuttingDown)return;
  shuttingDown=true;
  flushArena();
  giftCatalog.flush?.();
  try { await tiktokService.disconnect(); } catch (_) { /* saída continua */ }
  try { persistentDb?.close(); } catch (_) { /* saída continua */ }
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(0),1500).unref();
}
process.once('SIGINT',gracefulShutdown);
process.once('SIGTERM',gracefulShutdown);
