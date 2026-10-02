function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil((p / 100) * values.length) - 1));
  return sorted[index];
}

function summarize(values) {
  if (!values.length) return { avgMs: 0, maxMs: 0, p95Ms: 0, p99Ms: 0 };
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    avgMs: total / values.length,
    maxMs: Math.max(...values),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99)
  };
}

export class RuntimeProfiler {
  constructor({ now = null, windowSize = 180 } = {}) {
    this.now = now || (() => globalThis.performance?.now?.() ?? Date.now());
    this.windowSize = Math.max(4, Math.floor(Number(windowSize) || 180));
    this.frames = [];
    this.sections = new Map();
    this.active = new Map();
    this.gauges = Object.create(null);
    this._frameStartedAt = null;
  }
  _push(list, value) {
    if (!Number.isFinite(value) || value < 0) return;
    list.push(value);
    if (list.length > this.windowSize) list.splice(0, list.length - this.windowSize);
  }

  begin(name) {
    if (!name) return;
    this.active.set(String(name), this.now());
  }

  end(name) {
    const key = String(name || '');
    const startedAt = this.active.get(key);
    if (!Number.isFinite(startedAt)) return 0;
    this.active.delete(key);
    const elapsed = Math.max(0, this.now() - startedAt);
    if (!this.sections.has(key)) this.sections.set(key, []);
    this._push(this.sections.get(key), elapsed);
    return elapsed;
  }

  frame(deltaMs) {
    this._push(this.frames, Number(deltaMs));
  }

  beginFrame() {
    this._frameStartedAt = this.now();
    return this._frameStartedAt;
  }

  endFrame() {
    if (!Number.isFinite(this._frameStartedAt)) return 0;
    const elapsed = Math.max(0, this.now() - this._frameStartedAt);
    this._frameStartedAt = null;
    this.frame(elapsed);
    return elapsed;
  }

  gauge(name, value) {
    const numeric = Number(value);
    if (!name || !Number.isFinite(numeric)) return;
    this.gauges[String(name)] = numeric;
  }

  reset() {
    this.frames.length = 0;
    this.sections.clear();
    this.active.clear();
    this.gauges = Object.create(null);
    this._frameStartedAt = null;
  }

  snapshot() {
    const frame = summarize(this.frames);
    const sections = {};
    for (const [name, values] of this.sections) sections[name] = summarize(values);
    const p95 = frame.p95Ms;
    const quality = p95 > 40 ? 'low' : p95 > 24 ? 'medium' : 'high';
    return {
      samples: this.frames.length,
      fps: frame.avgMs > 0 ? 1000 / frame.avgMs : 0,
      quality,
      frame,
      sections,
      gauges: { ...this.gauges }
    };
  }
}
