class CatchClaimRegistry {
  constructor({ ttlMs = 25000, now = () => Date.now() } = {}) {
    this.ttlMs = Math.max(1, Number(ttlMs) || 25000);
    this.now = now;
    this.flyaways = new Map();
  }

  prune(now = this.now()) {
    for (const [userId, entry] of this.flyaways) {
      if (now - entry.cutAt > this.ttlMs) this.flyaways.delete(userId);
    }
  }

  registerCut({ loserId, loserNick } = {}) {
    const userId = String(loserId || '');
    if (!userId) return false;
    this.prune();
    this.flyaways.set(userId, {
      loserId: userId,
      loserNick: String(loserNick || 'Jogador').slice(0, 64),
      cutAt: this.now()
    });
    return true;
  }

  claim(data = {}, activePlayers) {
    this.prune();
    const catcherId = String(data.catcherId || '');
    const caughtUserId = String(data.caughtUserId || '');
    if (!catcherId || !caughtUserId || catcherId === caughtUserId ||
        !Number.isFinite(data.catchX) || !Number.isFinite(data.catchY)) {
      return { ok: false, reason: 'INVALID_CATCH' };
    }
    const catcher = activePlayers?.get(catcherId) || activePlayers?.get(data.catcherId);
    if (!catcher) return { ok: false, reason: 'CATCHER_NOT_ACTIVE' };
    const flyaway = this.flyaways.get(caughtUserId);
    if (!flyaway) return { ok: false, reason: 'FLYAWAY_NOT_AVAILABLE' };
    this.flyaways.delete(caughtUserId);
    return {
      ok: true,
      catcherId: String(catcher.userId),
      catcherNick: catcher.nickname || 'Jogador',
      caughtUserId,
      caughtNick: flyaway.loserNick,
      catchX: data.catchX,
      catchY: data.catchY
    };
  }

  clear() { this.flyaways.clear(); }
}

module.exports = { CatchClaimRegistry };