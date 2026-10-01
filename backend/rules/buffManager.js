/**
 * Gerenciador de Buffs e Temporizadores de Jogadores Ativos
 */
const { GIFTS } = require('./giftConfig');
const durationCapMs = gift => Math.min(86400000, 1000 * Math.max(1,Number(gift.maxDurationSeconds) || Number(gift.durationSeconds) || 5));
class BuffManager {
  constructor(io) {
    this.io = io;
    // Map de buffs: userId -> { lineType, powerMultiplier, expiresAt, shieldCount, specialAbility, timerId }
    this.activeBuffs = new Map();
    this.activeSpecials = new Map();
  }

  /**
   * Aplica um presente (upgrade) ao jogador respeitando as regras de stacking
   */
  applyGiftUpgrade(userId, giftConfig, repeatCount = 1) {
    if (!userId || !giftConfig) return null;

    if (['tornado', 'invulnerable'].includes(giftConfig.specialAbility)) {
      this.applySpecial(userId, giftConfig, repeatCount);
      return this.getPlayerBuff(userId);
    }
    const existing = this.activeBuffs.get(userId);
    const now = Date.now();
    const count = Math.min(1000, Math.max(1, Math.floor(Number(repeatCount) || 1)));
    const levels = { algodao: 0, cerol: 1, chile: 2, kevlar: 3, tornado: 4, mestre_do_ceu: 5 };
    if (existing && existing.expiresAt > now && levels[existing.lineType] > levels[giftConfig.lineType]) return existing;
    const durationMs = Math.max(1, Number(giftConfig.durationSeconds) || 5) * 1000 * count;
    const maxDurationMs = durationCapMs(giftConfig);

    let expiresAt = now + durationMs;
    let shieldCount = (giftConfig.shieldCount || 0) * count;

    // Se já tinha o mesmo presente ativo, soma o tempo
    if (existing && existing.lineType === giftConfig.lineType) {
      const remainingTime = Math.max(0, existing.expiresAt - now);
      expiresAt = now + Math.min(maxDurationMs, remainingTime + durationMs);
      shieldCount = (existing.shieldCount || 0) + shieldCount;
      if (existing.timerId) clearTimeout(existing.timerId);
    } else if (existing) {
      // Se era outro presente inferior, sobrescreve
      if (existing.timerId) clearTimeout(existing.timerId);
    }

    expiresAt = Math.min(expiresAt, now + maxDurationMs); // Teto de combo específico do presente.
    const timerId = setTimeout(() => {
      this.expireBuff(userId);
    }, expiresAt - now);

    const buffData = {
      userId,
      lineType: giftConfig.lineType,
      powerMultiplier: giftConfig.powerMultiplier,
      color: giftConfig.color,
      lineWidth: giftConfig.lineWidth,
      shieldCount,
      specialAbility: giftConfig.specialAbility,
      expiresAt,
      timerId
    };

    this.activeBuffs.set(userId, buffData);
    this.onArenaMutation?.();

    // Emite evento Socket.io para sincronizar o frontend
    if (this.io) {
      this.io.emit('player:buff_applied', {
        userId,
        lineType: buffData.lineType,
        powerMultiplier: buffData.powerMultiplier,
        color: buffData.color,
        lineWidth: buffData.lineWidth,
        shieldCount: buffData.shieldCount,
        specialAbility: buffData.specialAbility,
        expiresAt: buffData.expiresAt,
        durationSeconds: Math.round((expiresAt - now) / 1000)
      });
    }

    return buffData;
  }

  /**
   * Consome 1 escudo do jogador (usado ao ser derrotado em relinho)
   * Retorna true se absorveu o dano, false se não tinha escudo
   */
  applySpecial(userId, config, repeatCount = 1) {
    const ability = config.specialAbility;
    const key = JSON.stringify([userId, ability]);
    const prior = this.activeSpecials.get(key);
    if (prior) clearTimeout(prior.timerId);
    const now = Date.now();
    const count = Math.min(1000, Math.max(1, Math.floor(Number(repeatCount) || 1)));
    const duration = Math.max(1, Number(config.durationSeconds) || 5) * 1000 * count;
    const expiresAt = Math.min(now + durationCapMs(config), Math.max(now, prior?.expiresAt || now) + duration);
    const effect = { userId, ability, expiresAt, durationSeconds: (expiresAt-now)/1000 };
    const timerId = setTimeout(() => this.expireSpecial(userId, ability), expiresAt-now);
    this.activeSpecials.set(key, { ...effect, timerId });
    this.onArenaMutation?.();
    this.io?.emit('player:special_applied', effect);
  }

  getPlayerSpecials(userId) {
    const now = Date.now();
    return [...this.activeSpecials.values()]
      .filter(s => s.userId === userId && s.expiresAt > now)
      .map(({ability, expiresAt}) => ({ability, expiresAt, durationSeconds: (expiresAt-now)/1000}));
  }

  expireSpecial(userId, ability) {
    const key = JSON.stringify([userId, ability]);
    const effect = this.activeSpecials.get(key);
    if (!effect) return;
    clearTimeout(effect.timerId);
    this.activeSpecials.delete(key);
    this.onArenaMutation?.();
    this.io?.emit('player:special_expired', {userId, ability});
  }

  consumeShield(userId) {
    const buff = this.activeBuffs.get(userId);
    if (buff && buff.shieldCount > 0) {
      buff.shieldCount--;
      this.onArenaMutation?.();
      if (this.io) {
        this.io.emit('player:shield_hit', {
          userId,
          remainingShields: buff.shieldCount
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Expira o buff do jogador e reverte para a linha padrão (algodão)
   */
  expireBuff(userId) {
    const buff = this.activeBuffs.get(userId);
    if (buff) {
      if (buff.timerId) clearTimeout(buff.timerId);
      this.activeBuffs.delete(userId);
      this.onArenaMutation?.();

      if (this.io) {
        this.io.emit('player:buff_expired', {
          userId,
          revertedLineType: 'algodao',
          powerMultiplier: 1.0,
          color: '#ffffff',
          lineWidth: 1.5,
          shieldCount: 0
        });
      }
    }
  }

  /**
   * Remove o jogador (usado quando a pipa é cortada e eliminada)
   */
  removePlayer(userId) {
    for (const effect of [...this.activeSpecials.values()]) if (effect.userId === userId) this.expireSpecial(userId, effect.ability);
    const buff = this.activeBuffs.get(userId);
    if (buff && buff.timerId) {
      clearTimeout(buff.timerId);
    }
    this.activeBuffs.delete(userId);
    this.onArenaMutation?.();
  }

  /** Restaura somente efeitos ativos; timers são reconstruídos a partir de expiresAt. */
  restoreState(buffRows, specialRows, activeIds, now = Date.now()) {
    for (const buff of this.activeBuffs.values()) if (buff.timerId) clearTimeout(buff.timerId);
    for (const special of this.activeSpecials.values()) if (special.timerId) clearTimeout(special.timerId);
    this.activeBuffs.clear();
    this.activeSpecials.clear();
    for (const row of Array.isArray(buffRows) ? buffRows : []) {
      if (!row || !activeIds.has(String(row.userId)) || !Number.isFinite(row.expiresAt) || row.expiresAt <= now) continue;
      const gift = Object.values(GIFTS).find(g => g.lineType === row.lineType);
      if (!gift) continue;
      const expiresAt = Math.min(row.expiresAt, now + durationCapMs(gift));
      const timerId = setTimeout(() => this.expireBuff(row.userId), expiresAt - now);
      this.activeBuffs.set(row.userId, { ...row, expiresAt, timerId });
    }
    for (const row of Array.isArray(specialRows) ? specialRows : []) {
      if (!row || !activeIds.has(String(row.userId)) || !['tornado','invulnerable'].includes(row.ability)
        || !Number.isFinite(row.expiresAt) || row.expiresAt <= now) continue;
      const gift = Object.values(GIFTS).find(g => g.specialAbility === row.ability);
      if (!gift) continue;
      const expiresAt = Math.min(row.expiresAt, now + durationCapMs(gift));
      const timerId = setTimeout(() => this.expireSpecial(row.userId, row.ability), expiresAt - now);
      this.activeSpecials.set(JSON.stringify([row.userId, row.ability]), { ...row, expiresAt, timerId });
    }
  }

  /**
   * Retorna os dados atuais do buff de um jogador
   */
  getPlayerBuff(userId) {
    return this.activeBuffs.get(userId) || {
      userId,
      lineType: 'algodao',
      powerMultiplier: 1.0,
      color: '#ffffff',
      lineWidth: 1.5,
      shieldCount: 0
    };
  }

  /**
   * Limpa todos os buffs e habilidades especiais ativas
   */
  clearAll() {
    for (const buff of this.activeBuffs.values()) {
      if (buff.timerId) clearTimeout(buff.timerId);
    }
    for (const special of this.activeSpecials.values()) {
      if (special.timerId) clearTimeout(special.timerId);
    }
    this.activeBuffs.clear();
    this.activeSpecials.clear();
    this.onArenaMutation?.();
  }
}

module.exports = BuffManager;
