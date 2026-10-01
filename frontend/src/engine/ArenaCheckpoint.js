/** Checkpoint local do renderizador. O backend continua decidindo quem está ativo. */
export const CHECKPOINT_KEY = 'pipa-live-arena-v1';
export const CHECKPOINT_MAX_AGE_MS = 90000;

export function captureArena(kites, sessionId, now = Date.now()) {
  const players = [...kites].slice(0, 40);
  return {
    version: 1, sessionId, savedAt: now,
    width: players[0]?.screenWidth || null, height: players[0]?.screenHeight || null,
    kites: players.map(k => ({
      screenWidth: k.screenWidth, screenHeight: k.screenHeight,
      userId: String(k.userId),
      x: k.x, y: k.y, baseX: k.baseX, baseY:k.baseY, targetX: k.targetX, targetY: k.targetY,
      layoutIndex: Number.isInteger(k.rooftopPlayer?.layoutIndex) ? k.rooftopPlayer.layoutIndex : null,
      layoutTotal: Number.isInteger(k.rooftopPlayer?.layoutTotal) ? k.rooftopPlayer.layoutTotal : null,
      lineHP: k.lineHP, maxLineHP: k.maxLineHP,
      spawnProtection: k.spawnProtection, isAscending: k.isAscending,
      windPhase: k.windPhase, windInfluence: k.windInfluence,
      score: k.score, streak: k.streak,
      likeBoostRemaining: k.likeBoostRemaining,
      lineTension:k.lineTension, targetLineTension:k.targetLineTension,
      likeSpool:k.likeSpool, likeSpoolRemaining:k.likeSpoolRemaining,
      defenseWindowRemaining:k.defenseWindowRemaining,
      chatCombo:k.chatCombo ? { ...k.chatCombo } : null,
      maneuver: k.maneuver ? { ...k.maneuver } : null,
      segmentWear: (k.rope && k.rope.segmentWear && k.rope.segmentWear.length > 0)
        ? Array.from(k.rope.segmentWear)
        : null,
      // Passo 10: persistência física — spoolLength e nós compactos
      // Sem isso, a reconexão reseta a geometria da corda do zero
      spoolLength: (k.rope && Number.isFinite(k.rope.spoolLength) && k.rope.spoolLength > 0)
        ? Math.round(k.rope.spoolLength)
        : null,
      ropeNodes: (k.rope && Array.isArray(k.rope.nodes) && k.rope.nodes.length > 0)
        ? k.rope.nodes.map(n => ({
            x: Math.round(n.x || 0),
            y: Math.round(n.y || 0)
          }))
        : null
    }))
  };
}

export function readArenaCheckpoint(raw, sessionId, activeIds, now = Date.now()) {
  if (!raw || !sessionId) return new Map();
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || data.sessionId !== sessionId || !Number.isFinite(data.savedAt)
      || data.savedAt > now + 5000 || now - data.savedAt > CHECKPOINT_MAX_AGE_MS
      || !Array.isArray(data.kites) || data.kites.length > 40) return new Map();
    const allowed = new Set(activeIds.map(String));
    return new Map(data.kites.filter(k => allowed.has(String(k?.userId)))
      .filter(k => ['x','y','lineHP','maxLineHP','spawnProtection','windPhase','windInfluence']
        .every(key => Number.isFinite(k[key])) && k.maxLineHP > 0 && k.lineHP > 0)
      .map(k => [String(k.userId), k]));
  } catch (_) { return new Map(); }
}

export function restoreKiteState(kite, state) {
  if (!state) return false;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const sourceWidth = Number.isFinite(state.screenWidth) && state.screenWidth >= 320 ? state.screenWidth : kite.screenWidth;
  const sourceHeight = Number.isFinite(state.screenHeight) && state.screenHeight >= 320 ? state.screenHeight : kite.screenHeight;
  const sx = kite.screenWidth / sourceWidth;
  const sy = kite.screenHeight / sourceHeight;
  kite.x = clamp(state.x * sx, 30, kite.screenWidth - 30);
  kite.y = clamp(state.y * sy, 40, kite.screenHeight * 0.65);
  if (Number.isFinite(state.baseX)) kite.baseX = clamp(state.baseX * sx, 30, kite.screenWidth - 30);
  if (Number.isFinite(state.baseY)) kite.baseY = clamp(state.baseY * sy, 0, kite.screenHeight);
  if (Number.isFinite(state.targetX)) kite.targetX = clamp(state.targetX * sx, 30, kite.screenWidth - 30);
  if (Number.isFinite(state.targetY)) kite.targetY = clamp(state.targetY * sy, 40, kite.screenHeight * 0.65);
  if (Number.isInteger(state.layoutIndex)) kite.restoredLayoutIndex = state.layoutIndex;
  if (Number.isInteger(state.layoutTotal)) kite.restoredLayoutTotal = state.layoutTotal;
  kite.lineHP = clamp(state.lineHP, 1, kite.maxLineHP);
  kite.spawnProtection = clamp(state.spawnProtection, 0, 3);
  kite.isAscending = Boolean(state.isAscending);
  kite.windPhase = state.windPhase;
  kite.windInfluence = clamp(state.windInfluence, 0.5, 2);
  kite.likeBoostRemaining = clamp(Number(state.likeBoostRemaining) || 0, 0, 30);
  kite.lineTension=clamp(Number(state.lineTension)||.58,.12,1);
  kite.targetLineTension=clamp(Number(state.targetLineTension)||.58,.12,1);
  kite.likeSpool=clamp(Number(state.likeSpool)||0,0,1);
  kite.likeSpoolRemaining=clamp(Number(state.likeSpoolRemaining)||0,0,3);
  kite.defenseWindowRemaining=clamp(Number(state.defenseWindowRemaining)||0,0,1);
  kite.chatCombo=state.chatCombo && Number(state.chatCombo.remaining)>0 ? {...state.chatCombo,remaining:clamp(state.chatCombo.remaining,0,2)} : null;
  const savedManeuver = state.maneuver;
  const maneuverRemaining = savedManeuver && Number.isFinite(savedManeuver.remaining)
    ? Math.min(45, savedManeuver.remaining,
      Number.isFinite(savedManeuver.expiresAt) ? (savedManeuver.expiresAt - Date.now()) / 1000 : 45)
    : 0;
  kite.maneuver = maneuverRemaining > 0
    ? { ...savedManeuver, remaining:maneuverRemaining,
      expiresAt: Number.isFinite(savedManeuver.expiresAt) ? savedManeuver.expiresAt : Date.now()+maneuverRemaining*1000 }
    : null;
  kite.updateHPBar();
  if (Array.isArray(state.segmentWear) && kite.rope && kite.rope.segmentWear) {
    for (let i = 0; i < Math.min(kite.rope.segmentWear.length, state.segmentWear.length); i++) {
      const w = Number(state.segmentWear[i]);
      if (Number.isFinite(w) && w >= 0 && w <= 1) {
        kite.rope.segmentWear[i] = w;
      }
    }
  }
  // Restaura comprimento do carretel e posições compactas dos nós com escala de resolução
  // Define isInitialized = true para evitar que o primeiro rope.step() descarte a geometria com resetPositions()
  if (kite.rope && Number.isFinite(state.spoolLength) && state.spoolLength > 0) {
    const scaleFactor = (sx + sy) / 2;
    kite.rope.spoolLength = state.spoolLength * scaleFactor;
  }
  if (kite.rope && Array.isArray(state.ropeNodes) && state.ropeNodes.length > 0) {
    const maxNodes = Math.min(kite.rope.nodes.length, state.ropeNodes.length);
    for (let i = 0; i < maxNodes; i++) {
      const saved = state.ropeNodes[i];
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) continue;
      const n = kite.rope.nodes[i];
      n.x = saved.x * sx;
      n.prevX = saved.x * sx;
      n.y = saved.y * sy;
      n.prevY = saved.y * sy;
      n.vx = 0;
      n.vy = 0;
    }
    kite.rope.isInitialized = true;
    kite.rope.updateAABB();
  }
  kite.line.update(kite.x, kite.y, kite.visualScale);
  kite.tail.update(kite.x, kite.y + 30, 0, 0);
  return true;
}
