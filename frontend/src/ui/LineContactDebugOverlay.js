const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const f1 = value => finite(value).toFixed(1);
const f2 = value => finite(value).toFixed(2);

export class LineContactDebugOverlay {
  constructor({ enabled = false } = {}) {
    this.enabled = Boolean(enabled);
    this.root = null;
    this.panel = null;
    if (!this.enabled || typeof document === 'undefined' || !document?.createElement || !document?.body) return;

    this.root = document.createElement('div');
    this.panel = document.createElement('pre');
    Object.assign(this.root.style, {
      position: 'fixed', left: '10px', bottom: '10px', zIndex: '99999',
      pointerEvents: 'none', maxWidth: '390px'
    });
    Object.assign(this.panel.style, {
      margin: '0', padding: '8px 10px', background: 'rgba(3,12,20,.88)', color: '#d9f7ff',
      font: '11px/1.35 monospace', border: '1px solid rgba(0,240,255,.55)', borderRadius: '6px',
      whiteSpace: 'pre-wrap'
    });
    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);
  }

  update(snapshot) {
    if (!this.panel) return;
    const contacts = Array.isArray(snapshot) ? snapshot : [];
    if (!contacts.length) {
      this.panel.textContent = 'RELINHO DEBUG\nsem contatos ativos';
      return;
    }
    this.panel.textContent = contacts.map(c => {
      const angleDeg = finite(c.crossingAngle) * 180 / Math.PI;
      return [
        `CONTACT ${String(c.pairKey || `${c.lineAId || '?'}|${c.lineBId || '?'}`)}`,
        `point: ${f1(c.x)}, ${f1(c.y)}   angle: ${angleDeg.toFixed(1)}°`,
        `tension A/B: ${f2(c.tensionA)} / ${f2(c.tensionB)}   normal: ${f2(c.normalForce)}`,
        `vSlide: ${f2(c.vSlide)}   time: ${f2(c.contactTime)}s   slideDist: ${f2(c.slidingDistance)}`,
        `rate A/B: ${f2(c.abrasionRateA)} / ${f2(c.abrasionRateB)}`,
        `abrasion A/B: ${f2(c.abrasionA)} / ${f2(c.abrasionB)}`,
        `cutResistance A/B: ${f2(c.cutResistanceA)} / ${f2(c.cutResistanceB)}`,
        `s/t: ${f2(c.s)} / ${f2(c.t)}   phase: ${String(c.phase || '-')}`
      ].join('\n');
    }).join('\n\n');
  }

  destroy() {
    this.root?.remove?.();
    this.panel = null;
    this.root = null;
    this.enabled = false;
  }
}
