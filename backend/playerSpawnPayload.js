function playerSpawnPayload(player, buffManagerOrBuff, maybeSpecials) {
  if (!player) return null;
  const isBuffManager = buffManagerOrBuff && typeof buffManagerOrBuff.getPlayerBuff === 'function';
  const buff = isBuffManager
    ? (buffManagerOrBuff.getPlayerBuff(player.userId) || {})
    : (buffManagerOrBuff || {});
  const specials = isBuffManager
    ? (buffManagerOrBuff.getPlayerSpecials?.(player.userId) || [])
    : (Array.isArray(maybeSpecials) ? maybeSpecials : (buffManagerOrBuff?.specials || []));

  return {
    userId: player.userId,
    uniqueId: player.uniqueId,
    nickname: player.nickname,
    profilePictureUrl: player.profilePictureUrl || '',
    kiteType: player.kiteType,
    score: Number(player.score) || 0,
    streak: Number(player.streak) || 0,
    isKing: Boolean(player.isKing),
    lineType: buff.lineType || 'algodao',
    buffExpiresAt: buff.expiresAt || null,
    power: Number(buff.powerMultiplier) || 1.0,
    shield: Number(buff.shieldCount) || 0,
    color: buff.color || '#ffffff',
    lineWidth: Number(buff.lineWidth) || 1.2,
    specials: Array.isArray(specials) ? specials : []
  };
}
module.exports = playerSpawnPayload;

