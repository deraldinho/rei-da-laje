function registerCanonicalCatchHandler({
  socket,
  io,
  catchRegistry,
  gameRules,
  persistArenaNow,
  getCombatOwnerSocketId
}) {
  if (!socket || !io || !catchRegistry || !gameRules) {
    throw new Error('canonical catch handler dependencies missing');
  }

  socket.on('catch:claim', (data, callback) => {
    const ack = payload => {
      if (typeof callback === 'function') {
        try { callback(payload); } catch (_) {}
      }
    };

    if (socket.id !== getCombatOwnerSocketId?.()) {
      ack({ ok: false, reason: 'NOT_AUTHORITY' });
      return;
    }

    const validated = catchRegistry.claim(data, gameRules.activePlayers);
    if (!validated.ok) {
      ack(validated);
      return;
    }
    const result = gameRules.recordCatch(validated.catcherId);
    if (!result) {
      ack({ ok: false, reason: 'RECORD_CATCH_FAILED' });
      return;
    }

    persistArenaNow?.();
    ack({ ok: true, catcherScore: result.catcher.score });
    io.emit('game:catch_occurred', {
      ...validated,
      points: result.points,
      catcherScore: result.catcher.score
    });

    if (result.leadershipChanged) {
      io.emit('competition:leader_changed', result.leader ? {
        userId: result.leader.userId,
        nickname: result.leader.nickname,
        profilePictureUrl: result.leader.profilePictureUrl,
        score: result.leader.score,
        streak: result.leader.streak
      } : { userId: null });
    }
  });
}

module.exports = { registerCanonicalCatchHandler };
