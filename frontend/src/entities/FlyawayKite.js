import * as PIXI from 'pixi.js';

/**
 * FlyawayKite - Pipa Voada Física (P10/P15)
 * 
 * Simula a física real de uma pipa após o corte:
 * - Mantém a velocidade linear (vx, vy, vz) e momento angular (w) pré-corte.
 * - Carrega o pedaço de linha pendurado (FlyawayRope) preso ao cabresto.
 * - Reage à aerodinâmica contínua: gravidade, vento real, arrasto da rabiola e sustentação remanescente.
 * - Permite o APARO: qualquer pipa ativa que cruzar a linha pendurada resgata a pipa voada.
 */
export class FlyawayKite extends PIXI.Container {
  /**
   * @param {object} kiteData Dados da pipa cortada (ou instância original)
   * @param {object} breakInfo Informações exatas do corte { breakPoint, flyawayNodes, remainingRatio }
   */
  constructor(kiteData, breakInfo = {}) {
    super();
    this.kiteData = kiteData;
    this.userId = kiteData?.userId || null;
    this.id = 'flyaway_' + (this.userId || Math.random().toString(36).slice(2)) + '_' + Date.now();
    this.nickname = String(kiteData?.nickname || 'Pipa').slice(0, 16);
    this.bodyColor = kiteData?.bodyColor || 0xff6633;
    this.kiteType = kiteData?.kiteType || 'tradicional';

    // Posição inicial no momento exato do corte
    this.x = Number.isFinite(kiteData?.x) ? kiteData.x : (breakInfo.breakPoint?.x || 540);
    this.y = Number.isFinite(kiteData?.y) ? kiteData.y : (breakInfo.breakPoint?.y || 400);
    this.z = Number.isFinite(kiteData?.z) ? kiteData.z : 120;

    // Velocidade linear e angular preservadas do instante da disputa
    const initVx = Number.isFinite(kiteData?.vx) ? kiteData.vx : (Math.random() - 0.5) * 2.5;
    const initVy = Number.isFinite(kiteData?.vy) ? kiteData.vy : -0.8;
    this.vx = initVx;
    this.vy = initVy;
    this.vz = 0;
    this.rotation = Number.isFinite(kiteData?.rotation) ? kiteData.rotation : 0;
    this.angularVelocity = (Number.isFinite(kiteData?.vx) ? kiteData.vx * 0.04 : (Math.random() - 0.5) * 0.08);

    // Linha pendurada física (FlyawayRope)
    this.remainingRatio = Number.isFinite(breakInfo.remainingRatio) ? breakInfo.remainingRatio : 0.5;
    const dt = 1 / 60;
    this.flyawayNodes = Array.isArray(breakInfo.flyawayNodes) && breakInfo.flyawayNodes.length >= 2
      ? breakInfo.flyawayNodes.map(n => {
          const vx = Number.isFinite(n.vx) ? n.vx : (Number.isFinite(n.prevX) ? (n.x - n.prevX) : 0);
          const vy = Number.isFinite(n.vy) ? n.vy : (Number.isFinite(n.prevY) ? (n.y - n.prevY) : 0);
          const vz = Number.isFinite(n.vz) ? n.vz : 0;
          return {
            x: n.x,
            y: n.y,
            z: n.z || this.z,
            prevX: n.x - vx * dt,
            prevY: n.y - vy * dt,
            prevZ: (n.z || this.z) - vz * dt,
            vx,
            vy,
            vz
          };
        })
      : this.createDefaultFlyawayNodes(breakInfo.breakPoint);

    this.life = 25.0; // Pipa voada fica até 25s no ar para disputa autêntica de aparo
    this.age = 0;
    this.isCaught = false;
    this.caughtBy = null;
    this.breakPoint = breakInfo.breakPoint || { x: this.x, y: this.y + 120, z: this.z };

    // Camadas de renderização
    this.ropeGraphic = new PIXI.Graphics();
    this.tailGraphic = new PIXI.Graphics();
    this.bodyGraphic = new PIXI.Graphics();
    this.addChild(this.ropeGraphic, this.tailGraphic, this.bodyGraphic);

    this.createBodyAndTag();
    this.scale.set(kiteData?.visualScale || 1.15);
  }

  createDefaultFlyawayNodes(breakPoint) {
    const nodes = [];
    const bX = breakPoint?.x || (this.x - 40);
    const bY = breakPoint?.y || (this.y + 140);
    const count = 6;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const nx = bX + (this.x - bX) * t;
      const ny = bY + (this.y - bY) * t;
      nodes.push({ x: nx, y: ny, z: this.z, prevX: nx, prevY: ny, prevZ: this.z, vx: 0, vy: 0 });
    }
    return nodes;
  }

  createBodyAndTag() {
    // Desenha corpo da pipa
    this.bodyGraphic.clear();
    const primary = this.bodyColor;
    this.bodyGraphic.beginFill(primary, 0.88);
    this.bodyGraphic.lineStyle(2.5, 0xffffff, 0.9);
    this.bodyGraphic.moveTo(0, -25);
    this.bodyGraphic.lineTo(20, 0);
    this.bodyGraphic.lineTo(0, 30);
    this.bodyGraphic.lineTo(-20, 0);
    this.bodyGraphic.closePath();
    this.bodyGraphic.endFill();

    // Varetas
    this.bodyGraphic.lineStyle(1.4, 0x111111, 0.7);
    this.bodyGraphic.moveTo(0, -24); this.bodyGraphic.lineTo(0, 29);
    this.bodyGraphic.moveTo(-19, 0); this.bodyGraphic.lineTo(19, 0);

    // Tag identificadora: Nome · PIPA VOADA!
    this.tagContainer = new PIXI.Container();
    this.tagContainer.y = -38;
    this.addChild(this.tagContainer);

    this.tagBadge = new PIXI.Graphics();
    this.tagText = new PIXI.Text(this.nickname + ' · VOADA!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 10,
      fontWeight: '800',
      fill: '#00f0ff'
    });
    this.tagText.anchor.set(0.5, 0.5);

    const tw = Math.max(38, this.tagText.width + 12);
    const th = 17;
    this.tagBadge.beginFill(0x061521, 0.88);
    this.tagBadge.lineStyle(1.4, 0x00f0ff, 0.85);
    this.tagBadge.drawRoundedRect(-tw / 2, -th / 2, tw, th, th / 2);
    this.tagBadge.endFill();
    this.tagContainer.addChild(this.tagBadge, this.tagText);
  }

  /**
   * Atualização física contínua da pipa voada
   */
  update(delta = 1, screenHeight = 1920, lajeY = null, wind = null) {
    const step = Math.max(0.1, Math.min(3, delta));
    const dt = step / 60;
    this.age += dt;
    this.life -= dt;

    const floorLimit = Number.isFinite(lajeY) ? (lajeY - 40) : (screenHeight * 0.72);

    // Se estiver aparada, segue a pipa que aparou
    if (this.isCaught && this.caughtBy) {
      if (this.caughtBy.destroyed || !this.caughtBy.transform || !Number.isFinite(this.caughtBy.x)) {
        this.caughtBy = null;
        this.life = 0;
        this.alpha = 0;
        return;
      }
      this.x += (this.caughtBy.x - this.x) * 0.15 * step;
      this.y += (this.caughtBy.y - this.y) * 0.15 * step;
      this.rotation += 0.05 * step;
      this.alpha = Math.max(0, this.alpha - 0.02 * step);
      return;
    }

    // Se saiu muito além dos limites laterais ou desceu abaixo da laje com margem
    if (this.x < -300 || this.x > 1500 || this.y >= floorLimit + 160) {
      this.life = 0;
      this.alpha = Math.max(0, this.alpha - 0.05 * step);
      return;
    }

    // Se tocou o horizonte da laje, amortecimento de repouso suave
    if (this.y >= floorLimit) {
      this.y = floorLimit;
      this.vx *= 0.85;
      this.vy = 0;
      this.alpha = Math.max(0, this.alpha - 0.008 * step);
      if (this.alpha <= 0.02) {
        this.life = 0;
        return;
      }
    } else {
      // 1. Aerodinâmica de queda livre:
      const wX = Number.isFinite(wind?.x) ? wind.x : 0.8;
      const wY = Number.isFinite(wind?.y) ? wind.y : 0;

      // Vento carrega a pipa lateralmente
      this.vx += (wX * 1.8 - this.vx) * (0.045 * step);
      // Gravidade progressiva suave amortecida pelo arrasto do papel da pipa
      const terminalVelocity = 1.8 + this.remainingRatio * 0.8; // Mais linha pendurada = mais peso
      this.vy = Math.min(terminalVelocity, this.vy + (0.055 * step));

      this.x += this.vx * step;
      this.y += this.vy * step;
    }

    // 2. Momento angular e oscilação de sustentação:
    // A rabiola e o peso da linha pendurada criam tendência de alinhamento com o fluxo de ar
    const airflowAngle = Math.atan2(this.vy, this.vx) - Math.PI / 2;
    this.angularVelocity += (airflowAngle - this.rotation) * 0.015 * step;
    this.angularVelocity *= Math.pow(0.96, step);
    this.rotation += this.angularVelocity * step;

    // 3. Física do pedaço de corda pendurado (FlyawayRope):
    this.updateFlyawayRope(step, Number.isFinite(wind?.x) ? wind.x : 0.8, Number.isFinite(wind?.y) ? wind.y : 0);

    // 4. Rabiola ondulante
    this.updateTail(step, Number.isFinite(wind?.x) ? wind.x : 0.8);

    // Mantém a tag na horizontal
    if (this.tagContainer) {
      this.tagContainer.rotation = -this.rotation;
      this.tagContainer.y = -38 + Math.sin(this.age * 8) * 2;
    }
  }

  updateFlyawayRope(step, wX, wY) {
    if (!this.flyawayNodes || this.flyawayNodes.length < 2) return;
    const nNodes = this.flyawayNodes.length;

    // O último nó da FlyawayRope fica estritamente ancorado no cabresto da pipa
    const attachNode = this.flyawayNodes[nNodes - 1];
    attachNode.x = this.x;
    attachNode.y = this.y + 16;
    attachNode.prevX = attachNode.x;
    attachNode.prevY = attachNode.y;

    // Os nós pendurados abaixo balançam sob o vento e a velocidade de avanço da pipa
    for (let i = nNodes - 2; i >= 0; i--) {
      const n = this.flyawayNodes[i];
      const next = this.flyawayNodes[i + 1];

      const vx = (n.x - n.prevX) * 0.92;
      const vy = (n.y - n.prevY) * 0.92;
      n.prevX = n.x;
      n.prevY = n.y;

      // Gravidade e vento arrastam a linha livre
      n.x += vx + (wX * 0.8) * step * 0.2;
      n.y += vy + (0.9) * step * 0.2;

      // Restrição de distância aproximada em relação ao nó superior
      const dx = n.x - next.x;
      const dy = n.y - next.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxSegmentDist = 24;
      if (dist > maxSegmentDist) {
        const factor = maxSegmentDist / dist;
        n.x = next.x + dx * factor;
        n.y = next.y + dy * factor;
      }
    }

    // Renderiza a linha pendurada com coordenadas relativas ao container da pipa
    this.ropeGraphic.clear();
    this.ropeGraphic.lineStyle(1.4, 0xffffff, 0.85);
    this.ropeGraphic.moveTo(this.flyawayNodes[0].x - this.x, this.flyawayNodes[0].y - this.y);
    for (let i = 1; i < nNodes; i++) {
      this.ropeGraphic.lineTo(this.flyawayNodes[i].x - this.x, this.flyawayNodes[i].y - this.y);
    }
  }

  updateTail(step, wX) {
    this.tailGraphic.clear();
    this.tailGraphic.lineStyle(2, 0xffaa00, 0.8);
    const startY = 26;
    this.tailGraphic.moveTo(0, startY);
    for (let i = 1; i <= 6; i++) {
      const sway = Math.sin(this.age * 7 + i * 0.9) * 8 + (wX * 2);
      this.tailGraphic.lineTo(sway, startY + i * 14);
    }
  }

  /**
   * Retorna os segmentos da corda pendurada para verificação de APARO
   */
  getCatchableSegments() {
    const segments = [];
    if (!this.flyawayNodes || this.flyawayNodes.length < 2) return segments;
    for (let i = 0; i < this.flyawayNodes.length - 1; i++) {
      segments.push({
        x1: this.flyawayNodes[i].x,
        y1: this.flyawayNodes[i].y,
        x2: this.flyawayNodes[i + 1].x,
        y2: this.flyawayNodes[i + 1].y
      });
    }
    return segments;
  }

  /**
   * Dispara o evento de aparo quando resgatada por outro jogador
   */
  catchBy(playerKite) {
    this.isCaught = true;
    this.caughtBy = playerKite;
    this.life = Math.min(this.life, 1.2);
    if (this.tagText) {
      this.tagText.text = 'APARADA POR ' + (playerKite.nickname || 'Jogador');
      this.tagText.style.fill = '#ffd700';
    }
  }
}
