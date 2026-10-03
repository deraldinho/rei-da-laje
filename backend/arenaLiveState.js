/** Estado físico enviado exclusivamente pelo renderizador autorizado. */
const MAX_PLAYERS = 40;
const MAX_AGE_MS = 90000;
const HP_BY_LINE = Object.freeze({ algodao:100, cerol:140, chile:200, kevlar:250, tornado:180, mestre_do_ceu:320 });
const MANEUVERS = new Set([
  'retao', 'despicar', 'mergulho', 'relo_lateral', 'perseguir',
  'aparar_retao', 'aparar_despicada', 'tenteio', 'largada',
  'mergulho_parafuso', 'lacada', 'mestre_do_ceu'
]);

function finite(value, low, high, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(low, Math.min(high, n)) : fallback;
}

function sanitizeManeuver(maneuver, now = Date.now()) {
  if (!maneuver || !MANEUVERS.has(maneuver.name) || !Number.isFinite(maneuver.remaining) || maneuver.remaining <= 0) return null;
  const until = Number.isFinite(maneuver.expiresAt) ? maneuver.expiresAt : now + maneuver.remaining * 1000;
  const remaining = Math.min(finite(maneuver.remaining,0,45),Math.max(0,(until-now)/1000));
  if (remaining <= 0) return null;
  return { name:maneuver.name, remaining, expiresAt: Math.min(until,now+45000),
    duration:finite(maneuver.duration,0,45), maxDuration:finite(maneuver.maxDuration,0,45), reach:finite(maneuver.reach,0,390),
    speed:finite(maneuver.speed,1,1.5,1),damage:finite(maneuver.damage,1,1.25,1),
    defense:finite(maneuver.defense,0.5,1,1) };
}

function sanitizeRopeNodes(nodes, width, height) {
  if (!Array.isArray(nodes) || nodes.length < 2) return null;
  const safe = [];
  for (const node of nodes.slice(0, 24)) {
    const x = Number(node?.x), y = Number(node?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    // Pequena margem para permitir curvatura/overshoot sem aceitar coordenadas absurdas.
    safe.push({
      x: Math.max(-width * 0.25, Math.min(width * 1.25, x)),
      y: Math.max(-height * 0.15, Math.min(height * 1.15, y)),
      z: finite(node?.z,-4096,4096,0)
    });
  }
  return safe.length >= 2 ? safe : null;
}

function capturePlayerStates(payload, rules, buffs, now = Date.now()) {
  if (!payload || !Array.isArray(payload.kites) || payload.kites.length > MAX_PLAYERS) return null;
  const width = finite(payload.width,320,4096,1080);
  const height = finite(payload.height,320,4096,1920);
  const states = new Map();
  for (const row of payload.kites) {
    const userId = String(row?.userId || '');
    if (!userId || !rules.activePlayers.has(userId) || states.has(userId)) continue;
    const buff = buffs.getPlayerBuff(userId);
    const maxHp = HP_BY_LINE[buff.lineType] || 100;
    if (![row.x,row.y,row.lineHP].every(Number.isFinite)) continue;
    states.set(userId, { userId, updatedAt:now, screenWidth:width, screenHeight:height,
      x:finite(row.x,30,width-30), y:finite(row.y,40,height*0.65), z:finite(row.z,-4096,4096,0),
      baseX:finite(row.baseX,30,width-30, width/2), baseY:finite(row.baseY,0,height,height*.9), baseZ:finite(row.baseZ,-4096,4096,0),
      vx:finite(row.vx,-5000,5000,0), vy:finite(row.vy,-5000,5000,0), vz:finite(row.vz,-5000,5000,0),
      rotation:finite(row.rotation,-20,20,0), pitch:finite(row.pitch,-20,20,0), yaw:finite(row.yaw,-20,20,0), roll:finite(row.roll,-20,20,0), heading:finite(row.heading,-20,20,0),
      targetX:finite(row.targetX,30,width-30, width/2),
      targetY:finite(row.targetY,40,height*0.65, height*0.35),
      lineHP:finite(row.lineHP,1,maxHp,maxHp), maxLineHP:maxHp,
      spawnProtection:finite(row.spawnProtection,0,3), isAscending:Boolean(row.isAscending),
      windPhase:finite(row.windPhase,-1000,1000),windInfluence:finite(row.windInfluence,0.5,2,1),
      lineTension:finite(row.lineTension,.12,1,.58), targetLineTension:finite(row.targetLineTension,.12,1,.58),
      likeSpool:finite(row.likeSpool,0,1), likeSpoolRemaining:finite(row.likeSpoolRemaining,0,3),
      defenseWindowRemaining:finite(row.defenseWindowRemaining,0,1),
      likeBoostRemaining:finite(row.likeBoostRemaining,0,30),
      spoolLength:finite(row.spoolLength,10,5000,1800),
      segmentWear:Array.isArray(row.segmentWear)?row.segmentWear.slice(0,24).map(v=>finite(v,0,1,0)):null,
      ropeNodes:sanitizeRopeNodes(row.ropeNodes,width,height),
      maneuver:sanitizeManeuver(row.maneuver,now) });
  }
  return states;
}

function restorePlayerStates(rows, activeIds, now = Date.now()) {
  const allowed = new Set([...activeIds].map(String));
  const restored = new Map();
  for (const row of Array.isArray(rows) ? rows.slice(0,MAX_PLAYERS) : []) {
    if (!row || !allowed.has(String(row.userId)) || !Number.isFinite(row.updatedAt)
      || row.updatedAt > now+5000 || now-row.updatedAt > MAX_AGE_MS || !Number.isFinite(row.lineHP)
      || row.lineHP <= 0) continue;
    restored.set(String(row.userId),row);
  }
  return restored;
}
module.exports = { capturePlayerStates, restorePlayerStates, MAX_AGE_MS };
