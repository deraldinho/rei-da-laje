export function selectCouplingJobs(jobs, maxPerRope = 3) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  const limit = Math.max(1, Math.floor(Number(maxPerRope) || 1));
  const counts = new Map();
  const ordered = [...jobs].sort((a, b) => {
    const da = Number.isFinite(a?.inter?.distance) ? a.inter.distance : Infinity;
    const db = Number.isFinite(b?.inter?.distance) ? b.inter.distance : Infinity;
    if (da !== db) return da - db;
    const sa = Number(a?.inter?.slidingSpeed) || 0;
    const sb = Number(b?.inter?.slidingSpeed) || 0;
    return sb - sa;
  });
  const selected = [];
  for (const job of ordered) {
    const idA = String(job?.idA ?? '');
    const idB = String(job?.idB ?? '');
    if (!idA || !idB || idA === idB) continue;
    if ((counts.get(idA) || 0) >= limit || (counts.get(idB) || 0) >= limit) continue;
    counts.set(idA, (counts.get(idA) || 0) + 1);
    counts.set(idB, (counts.get(idB) || 0) + 1);
    selected.push(job);
  }
  return selected;
}
