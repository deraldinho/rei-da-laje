import * as PIXI from 'pixi.js';

/**
 * Rabiola Dinâmica com Física de Nós (Verlet Integration)
 */
export class Tail extends PIXI.Container {
  constructor(nodeCount = 14, spacing = 9) {
    super();
    this.nodeCount = nodeCount;
    this.spacing = spacing;
    this.nodes = [];
    this.graphic = new PIXI.Graphics();
    this.addChild(this.graphic);

    this.isBoosted = false;
    this.ribbonColor = 0xff0055;

    // Inicializa os nós
    for (let i = 0; i < nodeCount; i++) {
      this.nodes.push({
        x: 0,
        y: i * spacing,
        oldX: 0,
        oldY: i * spacing
      });
    }
  }

  setBoost(boosted) {
    this.isBoosted = boosted;
  }

  update(anchorX, anchorY, delta, windX = 1) {
    // Nó 0 sempre preso na parte inferior da pipa
    this.nodes[0].x = anchorX;
    this.nodes[0].y = anchorY;

    // Atualiza a física de Verlet para os nós subsequentes
    for (let i = 1; i < this.nodeCount; i++) {
      const node = this.nodes[i];
      const vx = (node.x - node.oldX) * 0.88;
      const vy = (node.y - node.oldY) * 0.88;

      node.oldX = node.x;
      node.oldY = node.y;

      // Gravidade suave + vento e ondulação aerodinâmica natural (flutter de rabiola)
      const flutter = Math.sin((Date.now() * 0.007) - (i * 0.52)) * (1.2 + i * 0.25);
      node.x += vx + (windX * 1.2) + flutter;
      node.y += vy + 0.55; // gravidade puxando a rabiola para baixo
    }

    // Relaxamento de restrição de distância entre nós (Constrain)
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const n1 = this.nodes[i];
        const n2 = this.nodes[i + 1];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.001) {
          const diff = (dist - this.spacing) / dist;
          if (i !== 0) {
            n1.x += dx * 0.5 * diff;
            n1.y += dy * 0.5 * diff;
          }
          n2.x -= dx * 0.5 * diff;
          n2.y -= dy * 0.5 * diff;
        }
      }
    }

    this.renderTail();
  }

  renderTail() {
    if (!this.visible || (this.parent && !this.parent.visible)) return;
    this.graphic.clear();

    // 1. Linha guia da rabiola ondulante
    this.graphic.lineStyle(1.8, this.isBoosted ? 0x00f0ff : 0xffffff, 0.85);
    this.graphic.moveTo(this.nodes[0].x, this.nodes[0].y);

    for (let i = 1; i < this.nodeCount; i++) {
      this.graphic.lineTo(this.nodes[i].x, this.nodes[i].y);
    }

    // 2. Fitilhos de plástico coloridos nos nós da rabiola
    for (let i = 1; i < this.nodeCount; i += 2) {
      const node = this.nodes[i];
      const prev = this.nodes[i - 1];
      const color = this.isBoosted ? 0x00ffff : (i % 4 === 1 ? 0xff0055 : 0xffcc00);

      // Calcula a normal da curva para orientar o lacinho
      const dx = node.x - prev.x;
      const dy = node.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      this.graphic.lineStyle(3.0, color, 0.95);
      // Fitilho duplo em forma de laço transversal
      this.graphic.moveTo(node.x - nx * 9, node.y - ny * 9);
      this.graphic.lineTo(node.x + nx * 9, node.y + ny * 9);
    }
  }
}
