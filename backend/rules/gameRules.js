/**
 * Gerenciador de Regras de Jogo, Fila de Espera e Comandos do Chat
 */
class GameRules {
  constructor(maxKitesOnScreen = 40, maxQueueSize = 1000, maxSessionStats = 3000, winStreakKing = 5) {
    this.maxKitesOnScreen = Math.max(1,Number(maxKitesOnScreen)||40);
    this.maxQueueSize = Math.max(1,Number(maxQueueSize)||1000);
    this.maxSessionStats = Math.max(this.maxKitesOnScreen+this.maxQueueSize,Number(maxSessionStats)||3000);
    this.winStreakKing = Math.max(2, Number(winStreakKing) || 5);
    // Map de jogadores ativos: userId -> playerData
    this.activePlayers = new Map();
    // Fila de espera quando a tela estiver cheia
    this.queue = [];
    this.leaderId = null;
    this.kingId = null;
    this.sessionStats = new Map();
  }

  /**
   * Processa uma tentativa de spawn/entrada por comentário
   * Retorna { status: 'spawn' | 'queued' | 'already_active', player }
   */
  handlePlayerInteraction(userData) {
    const userId = userData.userId || userData.uniqueId;
    if (!userId) return null;

    // Se o jogador já está com pipa no céu, apenas processa comandos de chat
    if (this.activePlayers.has(userId)) {
      const player=this.activePlayers.get(userId);
      if (userData.profilePictureUrl) player.profilePictureUrl=userData.profilePictureUrl;
      if (userData.nickname) player.nickname=userData.nickname;
      if (userData.isSimulation) player.isSimulation=true;
      const stats=this.sessionStats.get(userId);
      if(stats){ if(userData.profilePictureUrl)stats.profilePictureUrl=userData.profilePictureUrl; if(userData.nickname)stats.nickname=userData.nickname; stats.lastSeenAt=Date.now(); }
      return { status: 'already_active', player };
    }

    const queuedIndex = this.queue.findIndex(p => p.userId === userId);
    if (queuedIndex >= 0) {
      const player=this.queue[queuedIndex];
      if (userData.profilePictureUrl) player.profilePictureUrl=userData.profilePictureUrl;
      if (userData.nickname) player.nickname=userData.nickname;
      if (userData.isSimulation) player.isSimulation=true;
      const stats=this.sessionStats.get(userId);
      if(stats){ if(userData.profilePictureUrl)stats.profilePictureUrl=userData.profilePictureUrl; if(userData.nickname)stats.nickname=userData.nickname; stats.lastSeenAt=Date.now(); }
      return {status:'queued',position:queuedIndex+1,player};
    }

    if (this.activePlayers.size >= this.maxKitesOnScreen && this.queue.length >= this.maxQueueSize)
      return {status:'queue_full',position:this.maxQueueSize,capacity:this.maxQueueSize};
    if (!this.sessionStats.has(userId) && !this.ensureStatsCapacity())
      return {status:'session_full',capacity:this.maxSessionStats};
    const prior = this.sessionStats.get(userId) || { entries: 0, cuts: 0, defeats: 0, bestStreak: 0, crowns: 0, kingCuts: 0, gifts: 0, diamonds: 0 };
    this.sessionStats.set(userId, { ...prior, nickname: userData.nickname || 'Espectador',
      profilePictureUrl: userData.profilePictureUrl || prior.profilePictureUrl || '', entries: prior.entries + 1,
      lastSeenAt:Date.now() });
    const player = {
      userId,
      uniqueId: userData.uniqueId || `@${userData.nickname || 'user'}`,
      nickname: userData.nickname || 'Espectador',
      profilePictureUrl: userData.profilePictureUrl || '',
      kiteType: userData.kiteType || this.randomKiteType(),
      score: 0,
      streak: 0,
      isKing: false,
      joinedAt: Date.now(),
      isSimulation: Boolean(userData.isSimulation)
    };

    // Verifica capacidade da tela
    if (this.activePlayers.size >= this.maxKitesOnScreen) {
      this.queue.push(player);
      return {
        status: 'queued',
        position: this.queue.length,
        player
      };
    }

    this.activePlayers.set(userId, player);
    return {
      status: 'spawn',
      player
    };
  }

  handlePlayerComment(userData) {
    return this.handlePlayerInteraction(userData);
  }

  ensureStatsCapacity() {
    if (this.sessionStats.size < this.maxSessionStats) return true;
    const protectedIds=new Set([...this.activePlayers.keys(),...this.queue.map(p=>p.userId)]);
    const candidates=[...this.sessionStats.entries()].filter(([id])=>!protectedIds.has(id));
    if(!candidates.length)return false;
    candidates.sort((a,b)=>{
      const impact=s=>(s.cuts||0)*1000+(s.crowns||0)*500+(s.kingCuts||0)*250+(s.gifts||0);
      const impactDiff=impact(a[1])-impact(b[1]);
      return impactDiff || (Number(a[1].lastSeenAt)||0)-(Number(b[1].lastSeenAt)||0);
    });
    this.sessionStats.delete(candidates[0][0]);
    return true;
  }

  /**
   * Remove o jogador da lista ativa (quando é cortado)
   * Se houver fila, desenfileira o próximo
   */
  handlePlayerCut(userId) {
    const player = this.activePlayers.get(userId);
    if (!player) return null;
    this.activePlayers.delete(userId);
    if (this.kingId === userId) { this.kingId = null; player.isKing = false; }
    const prior = this.sessionStats.get(userId);
    if (prior) prior.defeats++;

    let nextPlayer = null;
    if (this.queue.length > 0 && this.activePlayers.size < this.maxKitesOnScreen) {
      nextPlayer = this.queue.shift();
      this.activePlayers.set(nextPlayer.userId, nextPlayer);
    }

    return {
      cutPlayer: player,
      spawnedFromQueue: nextPlayer
    };
  }

  /**
   * Adiciona pontuação de corte e gerencia o status de Rei da Laje
   */
  recordCut(winnerId, loserId) {
    if (winnerId === loserId || !this.activePlayers.has(winnerId) || !this.activePlayers.has(loserId)) return null;
    const previousLeaderId = this.leaderId;
    const dethroned = this.kingId === loserId && winnerId !== loserId;
    const loser=this.activePlayers.get(loserId);
    const winner = this.recordCutScore(winnerId);
    if (dethroned) {
      if (loser) loser.isKing=false;
      const wasAlreadyKing=this.kingId===winnerId;
      this.kingId=winnerId; winner.isKing=true;
      const stats = this.sessionStats.get(winnerId);
      if (stats) { stats.kingCuts = (stats.kingCuts || 0) + 1; if(!wasAlreadyKing) stats.crowns=(stats.crowns||0)+1; }
    }
    const cut = this.handlePlayerCut(loserId);
    const leader = this.getSoleLeader();
    this.leaderId = leader?.userId || null;
    const king=this.kingId ? this.activePlayers.get(this.kingId) || null : null;
    return { winner, ...cut, leader, king, dethroned, leadershipChanged: previousLeaderId !== this.leaderId };
  }

  /** Aparo vale dois pontos de arena, mas não conta como corte nem sequência. */
  recordCatch(catcherId) {
    const catcher = this.activePlayers.get(catcherId);
    if (!catcher) return null;
    const previousLeaderId = this.leaderId;
    catcher.score = Math.max(0, Number(catcher.score) || 0) + 2;
    const leader = this.getSoleLeader();
    this.leaderId = leader?.userId || null;
    return {
      catcher,
      points: 2,
      leader,
      leadershipChanged: previousLeaderId !== this.leaderId
    };
  }

  sessionRanking(limit = 5) {
    return [...this.sessionStats.entries()].map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a,b) => b.cuts - a.cuts || b.bestStreak - a.bestStreak || String(a.userId).localeCompare(String(b.userId)))
      .slice(0, Math.min(20, Math.max(1, limit)));
  }

  sessionHighlights() {
    const players = [...this.sessionStats.entries()].map(([userId, stats]) => ({ userId, ...stats }));
    const top = (field) => players.filter(p => (p[field] || 0) > 0)
      .sort((a,b) => (b[field] || 0) - (a[field] || 0) || String(a.userId).localeCompare(String(b.userId)))[0] || null;
    return { cuts:top('cuts'), streak:top('bestStreak'), kingCuts:top('kingCuts'), gifts:top('gifts'),
      crowns:top('crowns') };
  }

  recordGift(userId, repeatCount = 1, diamonds = 0) {
    const stats = this.sessionStats.get(String(userId));
    if (!stats) return false;
    const count = Math.min(1000,Math.max(1,Math.floor(Number(repeatCount) || 1)));
    stats.gifts = (stats.gifts || 0) + count;
    stats.diamonds = (stats.diamonds || 0) + Math.max(0,Math.min(1000000,Number(diamonds) || 0)) * count;
    return true;
  }

  /** Sem desempate arbitrário: empates em cortes deixam a liderança em disputa. */
  getSoleLeader() {
    const contenders = [...this.activePlayers.values()].filter(player => player.score > 0)
      .sort((a, b) => b.score - a.score);
    if (!contenders.length || (contenders[1] && contenders[0].score === contenders[1].score)) return null;
    return contenders[0];
  }

  recordCutScore(winnerId) {
    const winner = this.activePlayers.get(winnerId);
    if (!winner) return null;

    winner.score += 1;
    winner.streak += 1;
    const stats = this.sessionStats.get(winnerId);
    if (stats) { stats.cuts++; stats.bestStreak = Math.max(stats.bestStreak, winner.streak); }

    // Existe uma única coroa ativa. Sequência necessária (configurável no admin) conquista a coroa apenas se ela estiver livre.
    const kingThreshold = Math.max(2, Number(this.winStreakKing) || 5);
    if (winner.streak >= kingThreshold && !this.kingId) {
      this.kingId = winnerId;
      winner.isKing = true;
      if (stats) stats.crowns = (stats.crowns || 0) + 1;
    } else winner.isKing = this.kingId === winnerId;

    return winner;
  }

  /**
   * Gera um formato clássico de pipa aleatório
   */
  randomKiteType() {
    const types = ['peixinho', 'raiada', 'carrapeta'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Filtra comandos rápidos de combate a partir da mensagem de texto
   * Retorna 'puxar' | 'descarregar' | 'embicar' | 'pegar' | null
   */
  parseChatCommand(comment) {
    if (!comment || typeof comment !== 'string') return null;
    const clean = comment.trim().toLowerCase();

    if (clean === 'puxar' || clean === '1' || clean === 'sobe' || clean === 'puxa') {
      return 'puxar';
    }
    if (clean === 'descarregar' || clean === '2' || clean === 'solta' || clean === 'linha') {
      return 'descarregar';
    }
    if (clean === 'embicar' || clean === '3' || clean === 'bicar' || clean === 'vira') {
      return 'embicar';
    }
    if (clean === '#pegar' || clean === 'pegar' || clean === '#aparar' || clean === 'aparar') {
      return 'pegar';
    }
    return null;
  }

  /**
   * Reseta apenas as pipas no céu e a fila de espera (Nova Rodada)
   * Preserva as estatísticas acumuladas da sessão.
   */
  resetKites() {
    const cleared = this.activePlayers.size + this.queue.length;
    this.activePlayers.clear();
    this.queue = [];
    this.leaderId = null;
    this.kingId = null;
    return { clearedKites: cleared };
  }

  /**
   * Zera as estatísticas, rankings e recordes da sessão
   * Se houver pipas no céu, zera as pontuações e sequências atuais.
   */
  resetStats() {
    this.sessionStats.clear();
    this.leaderId = null;
    this.kingId = null;
    for (const player of this.activePlayers.values()) {
      player.score = 0;
      player.streak = 0;
      player.isKing = false;
      this.sessionStats.set(player.userId, {
        nickname: player.nickname,
        profilePictureUrl: player.profilePictureUrl || '',
        entries: 1, cuts: 0, defeats: 0, bestStreak: 0, crowns: 0, kingCuts: 0, gifts: 0, diamonds: 0,
        lastSeenAt: Date.now()
      });
    }
    return { success: true };
  }

  /**
   * Reset completo de todos os dados do jogo
   */
  resetAll() {
    this.activePlayers.clear();
    this.queue = [];
    this.sessionStats.clear();
    this.leaderId = null;
    this.kingId = null;
    return { success: true };
  }
}

module.exports = GameRules;
