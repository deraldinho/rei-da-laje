import * as PIXI from 'pixi.js';

/** Faíscas contínuas + flash curto de ruptura. */
export class SparkEmitter extends PIXI.Container {
  constructor() {
    super();
    this.particles = [];
    this.particlePool = [];
    this.maxParticlePool = 350;
    this.cutBursts = [];
  }

  emit(x, y, count = 12) {
    if (!this.visible || (this.parent && !this.parent.visible)) return;
    count = Math.min(count, Math.max(0, 350 - this.particles.length));
    const colors = [0xffffff, 0xffea00, 0xff7b00, 0xff0055];
    for (let i = 0; i < count; i++) {
      // Pool de PIXI.Graphics: relinho contínuo não pode alocar/destruir
      // centenas de objetos gráficos por segundo.
      const g = this.particlePool.pop() || new PIXI.Graphics();
      if (!g.parent) this.addChild(g);
      g.clear();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const radius = 1.5 + Math.random() * 2.5;
      g.beginFill(color); g.drawCircle(0, 0, radius); g.endFill();
      g.x = x; g.y = y; g.alpha = 1; g.visible = true;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        graphic: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.06
      });
    }
  }

  emitCut(x, y, color = 0xffffff) {
    while (this.cutBursts.length >= 6) this.removeBurst(this.cutBursts[0]);
    const graphic = new PIXI.Graphics();
    this.addChild(graphic);
    this.cutBursts.push({ graphic, x, y, color, elapsed: 0, duration: 0.48 });
    if (!this.visible || (this.parent && !this.parent.visible)) return;
    this.emit(x, y, 26);
  }

  removeBurst(burst) {
    const index = this.cutBursts.indexOf(burst);
    if (index >= 0) this.cutBursts.splice(index, 1);
    this.removeChild(burst.graphic);
    burst.graphic.destroy();
  }

  update(delta) {
    if (!this.visible || (this.parent && !this.parent.visible)) {
      if (this.particles.length) {
        for (const p of this.particles) this.releaseParticle(p);
        this.particles.length = 0;
      }
      if (this.cutBursts.length) {
        for (const burst of this.cutBursts) {
          this.removeChild(burst.graphic);
          burst.graphic.destroy();
        }
        this.cutBursts.length = 0;
      }
      return;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.graphic.x += p.vx * delta;
      p.graphic.y += p.vy * delta;
      p.vy += 0.15 * delta;
      p.life -= p.decay * delta;
      p.graphic.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        this.releaseParticle(p);
        this.particles.splice(i, 1);
      }
    }

    const dt = Math.min(0.05, Math.max(0, delta) / 60);
    for (const burst of [...this.cutBursts]) {
      burst.elapsed += dt;
      const progress = Math.min(1, burst.elapsed / burst.duration);
      if (progress >= 1) { this.removeBurst(burst); continue; }
      const radius = 10 + progress * 78;
      const alpha = (1 - progress) * 0.95;
      burst.graphic.clear();
      burst.graphic.lineStyle(5 - progress * 3, burst.color, alpha);
      burst.graphic.drawCircle(burst.x, burst.y, radius);
      burst.graphic.lineStyle(2, 0xffffff, alpha * 0.75);
      burst.graphic.moveTo(burst.x - radius * 0.6, burst.y);
      burst.graphic.lineTo(burst.x + radius * 0.6, burst.y);
      burst.graphic.moveTo(burst.x, burst.y - radius * 0.6);
      burst.graphic.lineTo(burst.x, burst.y + radius * 0.6);
    }
  }

  releaseParticle(particle) {
    const g = particle?.graphic;
    if (!g) return;
    g.visible = false;
    g.alpha = 0;
    g.clear();
    if (this.particlePool.length < this.maxParticlePool) {
      this.particlePool.push(g);
    } else {
      if (g.parent === this) this.removeChild(g);
      g.destroy();
    }
  }

  destroy(options) {
    for (const p of this.particles) {
      if (p.graphic) {
        if (p.graphic.parent === this) this.removeChild(p.graphic);
        p.graphic.destroy();
      }
    }
    this.particles = [];
    for (const g of this.particlePool) {
      if (g.parent === this) this.removeChild(g);
      g.destroy();
    }
    this.particlePool = [];
    for (const burst of this.cutBursts) {
      if (burst.graphic) {
        this.removeChild(burst.graphic);
        burst.graphic.destroy();
      }
    }
    this.cutBursts = [];
    super.destroy(options);
  }
}

