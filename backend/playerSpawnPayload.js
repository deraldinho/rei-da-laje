function playerSpawnPayload(player, buffManagerOrBuff, maybeSpecials, persistentSnapshot = null) {
  if (!player) return null;
  const isBuffManager = buffManagerOrBuff && typeof buffManagerOrBuff.getPlayerBuff === 'function';
  const buff = isBuffManager
    ? (buffManagerOrBuff.getPlayerBuff(player.userId) || {})
    : (buffManagerOrBuff || {});
  const specials = isBuffManager
    ? (buffManagerOrBuff.getPlayerSpecials?.(player.userId) || [])
    : (Array.isArray(maybeSpecials) ? maybeSpecials : (buffManagerOrBuff?.specials || []));

  const persistent = persistentSnapshot && typeof persistentSnapshot === 'object' ? persistentSnapshot : {};
  const persistentLoadout = persistent.loadout || { kiteKey: null, skinKey: null };
  const classicKites = new Set(['peixinho','raiada','carrapeta']);
  const persistentKiteType = classicKites.has(persistentLoadout.kiteKey) ? persistentLoadout.kiteKey : null;

  return {
    userId: player.userId,
    uniqueId: player.uniqueId,
    nickname: player.nickname,
    profilePictureUrl: persistent.profilePictureUrl || player.profilePictureUrl || '',
    kiteType: persistentKiteType || player.kiteType,
    score: Number(player.score) || 0,
    streak: Number(player.streak) || 0,
    isKing: Boolean(player.isKing),
    lineType: buff.lineType || 'algodao',
    buffExpiresAt: buff.expiresAt || null,
    power: Number(buff.powerMultiplier) || 1.0,
    shield: Number(buff.shieldCount) || 0,
    color: buff.color || '#ffffff',
    lineWidth: Number(buff.lineWidth) || 1.2,
    specials: Array.isArray(specials) ? specials : [],
    persistentLoadout: {
      kiteKey: persistentLoadout.kiteKey || null,
      skinKey: persistentLoadout.skinKey || null
    },
    equippedKite: persistent.equippedKite || null,
    progression: persistent.progression || null
  };
}
module.exports = playerSpawnPayload;

