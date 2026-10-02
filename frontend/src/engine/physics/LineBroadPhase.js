export class LineBroadPhase {
  constructor(config = {}) {
    this.maxDiscoveryChecksPerScan = Math.max(8, Math.floor(Number(config.maxDiscoveryChecksPerScan) || 96));
    this._entries = [];
    this._entryPool = [];
    this._candidates = [];
    this._candidatePool = [];
    this._pairCursor = 0;
    this._metrics = { inputLines: 0, candidatePairs: 0, rejectedX: 0, rejectedY: 0, checks: 0 };
  }

  setConfig(config = {}) {
    if (Number.isFinite(Number(config.maxDiscoveryChecksPerScan))) {
      this.maxDiscoveryChecksPerScan = Math.max(8, Math.floor(Number(config.maxDiscoveryChecksPerScan)));
    }
  }

  _entry(index) {
    if (!this._entryPool[index]) this._entryPool[index] = {};
    return this._entryPool[index];
  }

  _candidate(index) {
    if (!this._candidatePool[index]) this._candidatePool[index] = {};
    return this._candidatePool[index];
  }

  scan(kites, contactRadius = 0) {
    this._entries.length = 0;
    this._candidates.length = 0;
    const radius = Math.max(0, Number(contactRadius) || 0);
    let entryCount = 0;
    for (const kite of (kites || [])) {
      if (!kite?.rope?.getAABB || kite.isAscending || Number(kite.spawnProtection) > 0 || kite.pendingCut || kite.isPendingCut) continue;
      const box = kite.rope.getAABB();
      if (!box || ![box.minX, box.maxX, box.minY, box.maxY].every(Number.isFinite)) continue;
      const entry = this._entry(entryCount++);
      entry.kite = kite;
      entry.id = String(kite.userId ?? '');
      entry.minX = box.minX;
      entry.maxX = box.maxX;
      entry.minY = box.minY;
      entry.maxY = box.maxY;
      this._entries.push(entry);
    }
    this._entries.sort((a,b) => a.minX - b.minX || a.id.localeCompare(b.id));
    const metrics = this._metrics;
    metrics.inputLines = this._entries.length;
    metrics.candidatePairs = 0;
    metrics.rejectedX = 0;
    metrics.rejectedY = 0;
    metrics.checks = 0;

    let outIndex = 0;
    const count = this._entries.length;
    if (count > 1) {
      const start = this._pairCursor % count;
      let outerVisited = 0;
      let budgetHit = false;
      for (let offset = 0; offset < count && !budgetHit; offset++) {
        const i = (start + offset) % count;
        const a = this._entries[i];
        outerVisited++;
        for (let j = i + 1; j < count; j++) {
          const b = this._entries[j];
          // Sweep-line: como as entradas estão ordenadas por minX, todo o restante
          // também estará fora do alcance. Esse descarte não consome narrow budget.
          if (b.minX > a.maxX + radius) {
            metrics.rejectedX += count - j;
            break;
          }
          if (metrics.checks >= this.maxDiscoveryChecksPerScan) {
            budgetHit = true;
            break;
          }
          metrics.checks++;
          if (b.minY > a.maxY + radius || a.minY > b.maxY + radius) {
            metrics.rejectedY++;
            continue;
          }
          const candidate = this._candidate(outIndex++);
          const aFirst = a.id <= b.id;
          candidate.pairKey = aFirst ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          candidate.kiteA = aFirst ? a.kite : b.kite;
          candidate.kiteB = aFirst ? b.kite : a.kite;
          this._candidates.push(candidate);
        }
      }
      // Rotaciona o ponto inicial quando o budget não cobrir toda a arena.
      // Assim regiões tardias recebem descoberta sem desperdiçar checks em pares distantes.
      this._pairCursor = budgetHit ? (start + Math.max(1, outerVisited)) % count : (start + 1) % count;
    } else {
      this._pairCursor = 0;
    }
    metrics.candidatePairs = this._candidates.length;
    return this._candidates;
  }

  metrics() {
    return { ...this._metrics };
  }
}
