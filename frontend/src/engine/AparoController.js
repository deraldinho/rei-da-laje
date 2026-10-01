import { Physics } from './Physics.js';

export class AparoController {
  constructor(socket, pendingFlyaways = new Set()) {
    this.socket = socket;
    this.pendingFlyaways = pendingFlyaways;
  }

  _findCatchPoint(activeKite, flyaway) {
    const ax1 = Number.isFinite(activeKite.line?.visualBaseX) ? activeKite.line.visualBaseX : activeKite.baseX;
    const ay1 = Number.isFinite(activeKite.line?.visualBaseY) ? activeKite.line.visualBaseY : activeKite.baseY;
    const ax2 = activeKite.x;
    const ay2 = activeKite.y;
    const catchableSegments = typeof flyaway.getCatchableSegments === 'function'
      ? flyaway.getCatchableSegments()
      : [];
    const activeSegments = activeKite.rope?.getSegments?.() || null;

    for (const seg of catchableSegments) {
      if (activeSegments?.length) {
        for (const aSeg of activeSegments) {
          const hit = Physics.checkLineIntersection(
            aSeg.p1.x, aSeg.p1.y, aSeg.p2.x, aSeg.p2.y,
            seg.x1, seg.y1, seg.x2, seg.y2
          );
          if (hit.hit) return hit;
        }
      } else {        const hit = Physics.checkLineIntersection(
          ax1, ay1, ax2, ay2,
          seg.x1, seg.y1, seg.x2, seg.y2
        );
        if (hit.hit) return hit;
      }
    }

    const distToKite = Physics.distance(activeKite.x, activeKite.y, flyaway.x, flyaway.y);
    if (distToKite < 38) {
      return {
        x: (activeKite.x + flyaway.x) / 2,
        y: (activeKite.y + flyaway.y) / 2
      };
    }
    return null;
  }

  check({ isAuthority, activeKites, fallingKites } = {}) {
    if (!isAuthority || !this.socket?.connected) return 0;
    if (!Array.isArray(activeKites) || !Array.isArray(fallingKites)) return 0;
    let claims = 0;

    for (const activeKite of activeKites) {
      if (!activeKite || activeKite.isAscending || activeKite.spawnProtection > 0) continue;      for (const flyaway of fallingKites) {
        if (!flyaway || flyaway.isCaught || flyaway.life <= 0) continue;
        const flyawayId = String(flyaway.userId || '');
        if (!flyawayId || this.pendingFlyaways.has(flyawayId)) continue;
        if (flyawayId === String(activeKite.userId)) continue;

        const catchPoint = this._findCatchPoint(activeKite, flyaway);
        if (!catchPoint) continue;

        this.pendingFlyaways.add(flyawayId);
        this.socket.emit('catch:claim', {
          catcherId: activeKite.userId,
          caughtUserId: flyawayId,
          catchX: catchPoint.x,
          catchY: catchPoint.y
        }, (ack) => {
          if (ack?.ok) return;
          this.pendingFlyaways.delete(flyawayId);
        });
        claims += 1;
        break;
      }
    }
    return claims;
  }
}
