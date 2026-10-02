export const DEFAULT_RELINHO_PHYSICS_CONFIG = Object.freeze({
  abrasionK: 0.025,
  frictionMultiplier: 1.0,
  contactDamageFloor: 0.004,
  minSlideSpeed: 0.75,
  tensionMultiplier: 1,
  angleExponent: 1,
  minContactTime: 0.08,
  engagementRampSec: 0.20,
  releaseGraceSec: 0.22,
  maxWearPerTick: 0.012,
  discoveryHz: 30,
  maxSolvedContacts: 3,
  maxContactsPerRope: 3,
  maxTrackedContacts: 12,
  maxDiscoveryChecksPerScan: 96
});

const LIMITS = Object.freeze({
  abrasionK: [0.001, 1], frictionMultiplier: [0, 4], contactDamageFloor: [0, 0.05], minSlideSpeed: [0, 50],
  tensionMultiplier: [0.1, 4], angleExponent: [0.25, 4], minContactTime: [0, 2],
  engagementRampSec: [0.01, 3], releaseGraceSec: [0.02, 2], maxWearPerTick: [0.0001, 0.05],
  discoveryHz: [1, 60], maxSolvedContacts: [1, 12], maxContactsPerRope: [1, 6],
  maxTrackedContacts: [3, 64], maxDiscoveryChecksPerScan: [8, 1024]
});

function sanitizeNumber(key, value, fallback) {
  const [min, max] = LIMITS[key];
  const fallbackNumber = Number.isFinite(Number(fallback)) ? Number(fallback) : DEFAULT_RELINHO_PHYSICS_CONFIG[key];
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Math.max(min, Math.min(max, fallbackNumber));
  return Math.max(min, Math.min(max, numeric));
}

export function sanitizeRelinhoPhysicsConfig(input = {}, base = DEFAULT_RELINHO_PHYSICS_CONFIG) {
  const source = input && typeof input === 'object' ? input : {};
  const baseline = base && typeof base === 'object' ? base : DEFAULT_RELINHO_PHYSICS_CONFIG;
  const result = {};
  for (const key of Object.keys(DEFAULT_RELINHO_PHYSICS_CONFIG)) {
    result[key] = sanitizeNumber(key, source[key], baseline[key]);
  }
  for (const key of ['discoveryHz', 'maxSolvedContacts', 'maxContactsPerRope', 'maxTrackedContacts', 'maxDiscoveryChecksPerScan']) {
    result[key] = Math.round(result[key]);
  }
  return result;
}
