/**
 * BrokenHandRope - Linha Rompida da Mão (P10/P15)
 * 
 * Simula a física real da metade de linha que permanece ancorada à mão do jogador
 * (ou carretel na laje) após o corte:
 * - O nó 0 permanece preso na mão do jogador.
 * - Os nós soltos chicoteiam e despencam sob a gravidade e o vento.
 * - Ao colidir com a laje, repousam no chão e desvanecem suavemente.
 */
export class BrokenHandRope {
  constructor(handNodes = [], handPos = { x: 540, y: 1800, z: 0 }, options = {}) {
    this.userId = options.userId || null;
    this.lineColor = options.lineColor || 0xffffff;
    this.lineType = options.lineType || 'algodao';
    this.handPos = {
      x: Number.isFinite(handPos?.x) ? handPos.x : 540,
      y: Number.isFinite(handPos?.y) ? handPos.y : 1800,
      z: Number.isFinite(handPos?.z) ? handPos.z : 0
    };
    this.life = 8.0; // 8 segundos para murchar e desvanecer
    this.maxLife = 8.0;
    this.age = 0;
    this.isDead = false;

    // Inicialização dos nós Verlet da linha rompida
    if (Array.isArray(handNodes) && handNodes.length >= 2) {
      this.nodes = handNodes.map(n => ({
        x: n.x,
        y: n.y,
        z: n.z || this.handPos.z,
        prevX: Number.isFinite(n.prevX) ? n.prevX : n.x,
        prevY: Number.isFinite(n.prevY) ? n.prevY : n.y,
        prevZ: Number.isFinite(n.prevZ) ? n.prevZ : (n.z || this.handPos.z)
      }));
    } else {
      this.nodes = this.createDefaultNodes(this.handPos, options.breakPoint);
    }
  }

  createDefaultNodes(handPos, breakPoint) {
    const list = [];
    const count = 8;
    const bX = breakPoint?.x || handPos.x;
    const bY = breakPoint?.y || (handPos.y - 300);
    const bZ = breakPoint?.z || handPos.z;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const nx = handPos.x + (bX - handPos.x) * t;
      const ny = handPos.y + (bY - handPos.y) * t;
      const nz = handPos.z + (bZ - handPos.z) * t;
      list.push({ x: nx, y: ny, z: nz, prevX: nx, prevY: ny, prevZ: nz });
    }
    return list;
  }

  update(delta = 1, wind = null, lajeY = null) {
    const step = Math.max(0.1, Math.min(3, delta));
    const dt = step / 60;
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.isDead = true;
      return;
    }

    if (!this.nodes || this.nodes.length < 2) return;
    const nCount = this.nodes.length;

    // Nó 0 sempre ancorado na mão do operador
    this.nodes[0].x = this.handPos.x;
    this.nodes[0].y = this.handPos.y;
    this.nodes[0].z = this.handPos.z;
    this.nodes[0].prevX = this.handPos.x;
    this.nodes[0].prevY = this.handPos.y;
    this.nodes[0].prevZ = this.handPos.z;

    const wX = Number.isFinite(wind?.x) ? wind.x * 2.2 : 0;
    const gravity = 4.2; // Aceleração gravitacional da linha solta
    const floorY = Number.isFinite(lajeY) ? (lajeY + 10) : (this.handPos.y + 60);

    for (let i = 1; i < nCount; i++) {
      const n = this.nodes[i];
      const prev = this.nodes[i - 1];

      const vx = (n.x - n.prevX) * 0.91;
      const vy = (n.y - n.prevY) * 0.91;
      n.prevX = n.x;
      n.prevY = n.y;

      // Gravidade e vento arrastando o fio solto
      n.x += vx + wX * step * 0.25;
      n.y += vy + gravity * step * 0.25;

      // Colisão com o solo da laje
      if (n.y > floorY) {
        n.y = floorY;
        n.prevX = n.x; // Atrito no chão
      }

      // Restrição de distância elástica em relação ao nó anterior
      const dx = n.x - prev.x;
      const dy = n.y - prev.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxSegmentDist = 32;
      if (dist > maxSegmentDist) {
        const factor = maxSegmentDist / dist;
        n.x = prev.x + dx * factor;
        n.y = prev.y + dy * factor;
      }
    }
  }

  draw(graphics) {
    if (!graphics || !this.nodes || this.nodes.length < 2 || this.life <= 0) return;
    const alpha = Math.max(0, Math.min(0.85, (this.life / 2.0) * 0.85));
    graphics.lineStyle(1.4, this.lineColor, alpha);
    graphics.moveTo(this.nodes[0].x, this.nodes[0].y);
    for (let i = 1; i < this.nodes.length; i++) {
      graphics.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
  }
}
