import * as PIXI from 'pixi.js';

/**
 * Entidade Linha: o segmento lógico continua reto; vibração de contato é apenas visual.
 */
export class Line extends PIXI.Graphics {
  constructor(baseX, baseY) {
    super();
    this.baseX = baseX;
    this.baseY = baseY;
    this.visualBaseX = baseX;
    this.visualBaseY = baseY;
    this.color = 0xffffff;
    this.lineWidth = 1.1;
    this.alpha = 0.28;
    this.contactUntil = 0;
    this.contactStrength = 0;
  }

  setAppearance(colorHex, width) {
    this.color = typeof colorHex === 'string' ? parseInt(colorHex.replace('#', '0x')) : colorHex;
    this.lineWidth = width || 1.1;
  }

  triggerContact(strength = 1, durationMs = 150) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.contactStrength = Math.max(this.contactStrength, Math.min(1.5, Math.max(0.25, Number(strength) || 1)));
    this.contactUntil = Math.max(this.contactUntil, now + Math.min(350, Math.max(60, Number(durationMs) || 150)));

    // IMPORTANTE: triggerContact roda no fixed step (até 60 Hz por par de relinho).
    // Ele deve SOMENTE marcar estado. Desenhar aqui, especialmente quando o
    // linesContainer PIXI está escondido no modo 3D, fazia Graphics acumular um
    // novo path sem clear() a cada hit. Com 3+ relinhos isso crescia centenas de
    // comandos por segundo e congelava o frame. O desenho é feito uma única vez
    // por frame em update()/syncLineVisual().
  }

  drawPath(kiteX, kiteY, width, color, alpha, offset = 0, nodes = null) {
    this.lineStyle(width, color, alpha);
    const startX = Number.isFinite(this.visualBaseX) ? this.visualBaseX : this.baseX;
    const startY = Number.isFinite(this.visualBaseY) ? this.visualBaseY : this.baseY;

    if (nodes && Array.isArray(nodes) && nodes.length >= 2) {
      this.moveTo(startX, startY);
      for (let i = 1; i < nodes.length; i++) {
        this.lineTo(nodes[i].x, nodes[i].y);
      }
      return;
    }

    this.moveTo(startX, startY);
    if (Math.abs(offset) > 0.05) {
      const dx = kiteX - startX, dy = kiteY - startY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const midX = startX + dx * 0.58 + nx * offset;
      const midY = startY + dy * 0.58 + ny * offset;
      this.lineTo(midX, midY);
    }
    this.lineTo(kiteX, kiteY);
  }

  update(kiteX, kiteY, visualScale = 1, isHighlighted = false, highlightColor = null, lineAlpha = null, nodes = null) {
    if (!this.visible || (this.parent && !this.parent.visible)) return;
    this.clear();

    // Suporte flexível caso nodes seja passado como 4º argumento (chamada compacta)
    let effectiveNodes = nodes;
    let effectiveHighlighted = isHighlighted;
    if (Array.isArray(isHighlighted)) {
      effectiveNodes = isHighlighted;
      effectiveHighlighted = false;
    }

    const effectiveAlpha = Number.isFinite(lineAlpha) ? lineAlpha : this.alpha;
    this.alpha = effectiveAlpha;
    const effectiveColor = highlightColor !== null ? highlightColor : this.color;
    const baseW = effectiveHighlighted ? (this.lineWidth + 0.8) : this.lineWidth;
    const renderedWidth = baseW * Math.min(1.75, Math.max(1, visualScale));
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const active = now < this.contactUntil;
    // Vibração suave apenas durante contato ativo de relinho
    const offset = (active && !effectiveNodes) ? Math.sin(now * 0.04 + this.baseX * 0.01) * 2.5 * this.contactStrength : 0;
    if (!active) this.contactStrength = 0;

    // Se estiver em manobra/combate ativo, desenha halo de destaque
    if (effectiveHighlighted || active) {
      this.drawPath(kiteX, kiteY, renderedWidth + 2.5, effectiveColor, Math.min(0.45, effectiveAlpha * 0.5), offset * 0.7, effectiveNodes);
    }
    this.drawPath(kiteX, kiteY, renderedWidth, effectiveColor, effectiveAlpha, offset, effectiveNodes);
  }
}
