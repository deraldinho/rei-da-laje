const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { restorePlayerStates } = require('./arenaLiveState');
const DEFAULT_PATH = path.join(__dirname, 'data', 'arena-state.json');
const MAX_BYTES = 2 * 1024 * 1024;
const compactStats = stats => ({
  nickname:String(stats?.nickname||'Espectador').slice(0,60),
  entries:Math.max(0,Number(stats?.entries)||0), cuts:Math.max(0,Number(stats?.cuts)||0),
  defeats:Math.max(0,Number(stats?.defeats)||0), bestStreak:Math.max(0,Number(stats?.bestStreak)||0),
  crowns:Math.max(0,Number(stats?.crowns)||0), kingCuts:Math.max(0,Number(stats?.kingCuts)||0),
  gifts:Math.max(0,Number(stats?.gifts)||0), diamonds:Math.max(0,Number(stats?.diamonds)||0),
  lastSeenAt:Number(stats?.lastSeenAt)||0
});

class ArenaStateStore {
  constructor(filePath = DEFAULT_PATH, now = () => Date.now()) {
    this.filePath = filePath;
    this.now = now;
    this.sessionId = randomUUID();
    this.lastSavedAt = null;
    this.lastError = null;
    this.dirty = false;
    this.playerStates = new Map();
  }
  read() {
    try {
      const stat = fs.statSync(this.filePath);
      if (stat.size > MAX_BYTES) throw new Error('Snapshot excede limite');
      const state = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (state.version !== 1 || typeof state.sessionId !== 'string' || !Array.isArray(state.players)
        || !Array.isArray(state.queue) || !Array.isArray(state.stats) || !Array.isArray(state.buffs)
        || !Array.isArray(state.specials) || !Number.isFinite(state.savedAt)) throw new Error('Snapshot inválido');
      if (state.savedAt > this.now() + 60000) throw new Error('Snapshot com data futura');
      this.sessionId = state.sessionId;
      this.lastSavedAt = state.savedAt;
      return state;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.lastError = { code: 'RESTORE_FAILED', at: this.now() };
        console.error('[Arena] Falha ao restaurar snapshot; arquivo preservado para inspeção.');
        // Não substituir arquivo potencialmente recuperável por arena vazia.
        this.readOnly = true;
      }
      return null;
    }
  }
  snapshot(rules, buffs) {
    return {
      version: 1, sessionId: this.sessionId, savedAt: this.now(),
      players: [...rules.activePlayers.values()].map(player => ({ ...player })),
      queue: rules.queue.map(player => ({ ...player })),
      // A foto já existe em players/queue; não duplicar URLs longas no histórico.
      stats: [...rules.sessionStats.entries()].map(([id, stats]) => [id, compactStats(stats)]),
      leaderId: rules.leaderId,
      kingId: rules.kingId,
      buffs: [...buffs.activeBuffs.values()].map(({ timerId, ...buff }) => ({ ...buff })),
      specials: [...buffs.activeSpecials.values()].map(({ timerId, ...special }) => ({ ...special })),
      playerStates: [...this.playerStates.values()].filter(state => rules.activePlayers.has(state.userId))
    };
  }
  save(rules, buffs) {
    if (this.readOnly) return false;
    try {
      const state = this.snapshot(rules, buffs);
      let content = JSON.stringify(state);
      if (Buffer.byteLength(content) > MAX_BYTES) {
        // Degradação segura: manter fila/posição, retirando primeiro fotos de quem está mais longe de entrar.
        for (let i=state.queue.length-1;i>=0 && Buffer.byteLength(content)>MAX_BYTES;i--) {
          if (!state.queue[i]?.profilePictureUrl) continue;
          state.queue[i].profilePictureUrl='';
          content=JSON.stringify(state);
        }
      }
      if (Buffer.byteLength(content) > MAX_BYTES) {
        const protectedIds=new Set([...state.players,...state.queue].map(p=>String(p?.userId||'')));
        for(let i=state.stats.length-1;i>=0 && Buffer.byteLength(content)>MAX_BYTES;i--){
          if(protectedIds.has(String(state.stats[i]?.[0]||'')))continue;
          state.stats.splice(i,1);content=JSON.stringify(state);
        }
      }
      if (Buffer.byteLength(content) > MAX_BYTES) throw new Error('Snapshot excede limite');
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const temp = this.filePath + '.tmp';
      fs.writeFileSync(temp, content, { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temp, this.filePath);
      this.lastSavedAt = state.savedAt;
      this.lastError = null;
      this.dirty = false;
      return true;
    } catch (_) {
      this.lastError = { code: 'SAVE_FAILED', at: this.now() };
      console.error('[Arena] Não foi possível persistir a partida.');
      return false;
    }
  }
  restore(rules, buffs) {
    const state = this.read();
    if (!state) return false;
    const uniquePlayers = new Map();
    for (const player of state.players.slice(0, rules.maxKitesOnScreen)) {
      if (player?.userId && !uniquePlayers.has(String(player.userId))) uniquePlayers.set(String(player.userId), player);
    }
    rules.activePlayers = uniquePlayers;
    const seen = new Set(uniquePlayers.keys());
    const restoredQueue=[];
    for(const player of state.queue){
      if(restoredQueue.length >= (rules.maxQueueSize || 1000))break;
      if(!player?.userId)continue;
      const id=String(player.userId);
      if(seen.has(id))continue;
      seen.add(id);restoredQueue.push(player);
    }
    rules.queue = restoredQueue;
    const statsRows=state.stats.filter(item=>Array.isArray(item)&&item.length===2&&item[0]);
    const statsById=new Map(statsRows.map(([id,stats])=>[String(id),stats]));
    const restoredStats=new Map();
    for(const id of seen){if(statsById.has(id))restoredStats.set(id,statsById.get(id));}
    for(const [id,stats] of statsRows){
      const key=String(id);
      if(restoredStats.size >= (rules.maxSessionStats || 3000))break;
      if(!restoredStats.has(key))restoredStats.set(key,stats);
    }
    for(const player of [...rules.activePlayers.values(),...rules.queue]){
      const id=String(player.userId);
      const stats=restoredStats.get(id) || compactStats({nickname:player.nickname});
      stats.nickname=String(player.nickname||stats.nickname||'Espectador').slice(0,60);
      stats.profilePictureUrl=String(player.profilePictureUrl||'').slice(0,1000);
      stats.lastSeenAt=Math.max(Number(stats.lastSeenAt)||0,Number(player.joinedAt)||0);
      restoredStats.set(id,stats);
    }
    rules.sessionStats = restoredStats;
    rules.leaderId = rules.getSoleLeader()?.userId || null;
    const persistedKing=String(state.kingId||'');
    const fallbackKing=[...rules.activePlayers.values()].find(player=>player?.isKing)?.userId || null;
    rules.kingId = persistedKing && rules.activePlayers.has(persistedKing) ? persistedKing : fallbackKing;
    for(const player of rules.activePlayers.values()) player.isKing=String(player.userId)===String(rules.kingId||'');
    const effectIds=new Set([
      ...rules.activePlayers.keys(),
      ...rules.queue.map(player=>String(player.userId)),
      ...state.buffs.map(row=>String(row?.userId||'')).filter(Boolean),
      ...state.specials.map(row=>String(row?.userId||'')).filter(Boolean)
    ]);
    buffs.restoreState(state.buffs, state.specials, effectIds);
    this.playerStates = restorePlayerStates(state.playerStates, rules.activePlayers.keys(), this.now());
    return true;
  }
  reset(rules, buffs, options = { scope: 'all' }) {
    this.readOnly = false;
    const scope = options?.scope || 'all';
    if (scope === 'kites' || scope === 'all') {
      rules.resetKites();
      buffs.clearAll();
      this.playerStates.clear();
    }
    if (scope === 'stats' || scope === 'all') {
      rules.resetStats();
    }
    if (scope === 'all') {
      this.sessionId = randomUUID();
    }
    this.dirty = true;
    this.save(rules, buffs);
    return { sessionId: this.sessionId, scope };
  }
}
module.exports = ArenaStateStore;
