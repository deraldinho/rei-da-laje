export function createRelinhoContactBudget(contacts, maxActive = 3) {
  const limit = Math.max(1, Math.floor(Number(maxActive) || 1));
  const activePairs = new Set();

  if (contacts && typeof contacts[Symbol.iterator] === 'function') {
    for (const [key, state] of contacts) {
      if (state?.phase !== 'RELEASE') activePairs.add(String(key));
    }
  }

  return {
    get activeCount() {
      return activePairs.size;
    },
    admit(pairKey) {
      const key = String(pairKey || '');
      if (!key) return false;
      if (activePairs.has(key)) return true;
      if (activePairs.size >= limit) return false;
      activePairs.add(key);
      return true;
    }
  };
}
