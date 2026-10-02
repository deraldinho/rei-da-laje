function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fract(value) {
  return value - Math.floor(value);
}

export function spawnTargetForRank(rank, total, width, height) {
  const count = Math.max(1, Math.min(40, Math.floor(Number(total) || 1)));
  const idx = clamp(Math.floor(Number(rank) || 0), 0, count - 1);
  const w = Math.max(320, Number(width) || 1080);
  const h = Math.max(480, Number(height) || 1920);
  if (count === 1) return { x: w * 0.5, y: h * 0.23 };

  const margin = w * 0.10;
  const usable = w - margin * 2;
  const nominalGap = usable / (count - 1);
  const jitter = Math.min(w * 0.012, nominalGap * 0.38);
  const xNoise = Math.sin((idx + 1) * 12.9898) * jitter;
  const altitudeSeed = fract((idx + 1) * 0.61803398875 + 0.31);
  const x = margin + (idx / (count - 1)) * usable + xNoise;
  const y = h * (0.19 + altitudeSeed * 0.15);
  return { x: clamp(x, margin, w - margin), y };
}

export function stabilizeSpawnKite(kite, rank, total, width, height) {
  if (!kite || kite.spawnLayoutEligible === false) return false;
  if (!kite.isAscending || !(Number(kite.spawnProtection) > 0)) return false;
  if (kite._spawnPhysicsInitialized) return false;

  const target = spawnTargetForRank(rank, total, width, height);
  kite.targetX = target.x;
  kite.targetY = target.y;
  kite.x = target.x;
  kite.y = Math.min(height * 0.58, target.y + 45);
  kite.vx = 0;
  kite.vy = 0;
  kite.vz = Number.isFinite(kite.vz) ? kite.vz : 0;
  kite._spawnPhysicsInitialized = true;

  const handX = Number.isFinite(kite.line?.visualBaseX) ? kite.line.visualBaseX : kite.baseX;
  const handY = Number.isFinite(kite.line?.visualBaseY) ? kite.line.visualBaseY : kite.baseY;
  if (kite.rope?.resetPositions && Number.isFinite(handX) && Number.isFinite(handY)) {
    kite.rope.resetPositions(
      { x: handX, y: handY, z: Number.isFinite(kite.baseZ) ? kite.baseZ : 0 },
      { x: kite.x, y: kite.y, z: Number.isFinite(kite.z) ? kite.z : 0 }
    );
  }
  return true;
}
