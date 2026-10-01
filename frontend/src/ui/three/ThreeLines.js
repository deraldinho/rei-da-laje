import * as THREE from 'three';
import { createDynamicLine3D, LINE_COLORS, disposeHierarchy } from './ThreeMaterials.js';

function createSparks3DGroup(maxParticles = 180) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const baseColors = new Float32Array(maxParticles * 3);
  const velocities = new Float32Array(maxParticles * 3);
  const lives = new Float32Array(maxParticles);
  const maxLives = new Float32Array(maxParticles);

  for (let i = 0; i < maxParticles; i++) {
    positions[i * 3 + 1] = -9999;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 8.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  points.userData = {
    maxParticles,
    positions,
    colors,
    baseColors,
    velocities,
    lives,
    maxLives,
    activeCount: 0
  };
  return points;
}

export class ThreeLines {
  constructor() {
    this.lines3D = new Map();
    this.group = new THREE.Group();
    this.sparksPoints = createSparks3DGroup(180);
    this.group.add(this.sparksPoints);
    this.customLineOpacity = 0.88;
  }

  setLineOpacity(val) {
    const num = Number(val);
    if (Number.isFinite(num) && num >= 0.1 && num <= 1.0) {
      this.customLineOpacity = num;
    }
  }

  getOrCreateLine(uidStr) {
    let l3d = this.lines3D.get(uidStr);
    if (!l3d) {
      l3d = createDynamicLine3D(20);
      this.group.add(l3d);
      this.lines3D.set(uidStr, l3d);
    }
    return l3d;
  }

  syncLine(uidStr, kite, handWorldPos, kiteWorldPos, wind, delta, time) {
    const l3d = this.getOrCreateLine(uidStr);
    const desiredColor = LINE_COLORS[kite.lineType] || 0xf8f9fa;

    const isLineActive = Boolean(
      kite.maneuver ||
      (kite.streak && kite.streak >= 2) ||
      kite.isKing ||
      kite.isLeader ||
      (kite.lineTension && kite.lineTension > 0.8) ||
      (kite.contactUntil && kite.contactUntil > Date.now()) ||
      kite.isInCombat
    );

    const customOpacity = this.customLineOpacity !== undefined ? this.customLineOpacity : 0.88;
    if (l3d.userData.mat) {
      if (kite.isKing) {
        l3d.userData.mat.color.setHex(0xffd700);
        l3d.userData.mat.opacity = 1.0;
      } else if (isLineActive) {
        l3d.userData.mat.color.setHex(desiredColor);
        l3d.userData.mat.opacity = 1.0;
      } else {
        l3d.userData.mat.color.setHex(desiredColor);
        l3d.userData.mat.opacity = customOpacity;
      }
    }

    if (l3d.userData.glowMat) {
      if (kite.isKing) {
        l3d.userData.glowMat.color.setHex(0xffea00);
        l3d.userData.glowMat.opacity = 0.88;
      } else if (isLineActive) {
        l3d.userData.glowMat.color.setHex(desiredColor);
        l3d.userData.glowMat.opacity = 0.82;
      } else {
        l3d.userData.glowMat.color.setHex(desiredColor);
        l3d.userData.glowMat.opacity = 0.38;
      }
    }

    const hX = Number.isFinite(handWorldPos?.x) ? handWorldPos.x : 0;
    const hY = Number.isFinite(handWorldPos?.y) ? handWorldPos.y : -140;
    const hZ = Number.isFinite(handWorldPos?.z) ? handWorldPos.z : 480;

    const kX = Number.isFinite(kiteWorldPos?.x) ? kiteWorldPos.x : 0;
    const kY = Number.isFinite(kiteWorldPos?.y) ? kiteWorldPos.y : 0;
    const kZ = Number.isFinite(kiteWorldPos?.z) ? kiteWorldPos.z : 100;
    const kiteAttachY = kY - 2; // ancoragem no cabresto inferior da pipa

    const numPts = l3d.userData.numPoints;
    const posArr = l3d.userData.positions;
    const slack = Number(kite.lineSlack || 0);
    const tension = Number(kite.lineTension || 0.65);
    const windForceX = (wind ? wind.x : 0) * 22;

    const ropeNodes = kite.rope ? kite.rope.getNodes() : null;
    const hasRope = ropeNodes && ropeNodes.length >= 2;

    for (let p = 0; p < numPts; p++) {
      const t = p / (numPts - 1);
      const lx = hX + (kX - hX) * t;
      const ly = hY + (kiteAttachY - hY) * t;
      const lz = hZ + (kZ - hZ) * t;
      const arc = Math.sin(t * Math.PI);

      let sagX = (windForceX * slack) * arc;
      let sagY = -slack * 36 * arc + (1 - tension) * -10 * arc;
      let sagZ = 0;

      if (hasRope) {
        // Amostragem contínua dos nós da corda física XPBD
        const sampleIdx = t * (ropeNodes.length - 1);
        const idxA = Math.floor(sampleIdx);
        const idxB = Math.min(ropeNodes.length - 1, idxA + 1);
        const frac = sampleIdx - idxA;
        const nA = ropeNodes[idxA];
        const nB = ropeNodes[idxB];

        const ropeX = nA.x + (nB.x - nA.x) * frac;
        const ropeY = nA.y + (nB.y - nA.y) * frac;

        // Desvio relativo à reta em 2D escalado para o espaço de mundo Three.js.
        // Multiplicado obrigatoriamente por arc = sin(t * PI) para garantir que
        // em t=0 (mão do boneco) e t=1 (cabresto da pipa) o desvio seja estritamente ZERO!
        const baseHandX = (kite.line?.visualBaseX || kite.baseX || 0);
        const baseHandY = (kite.line?.visualBaseY || kite.baseY || 0);
        const straight2DX = baseHandX + ((kite.x || 0) - baseHandX) * t;
        const straight2DY = baseHandY + ((kite.y || 0) - baseHandY) * t;
        const physSagX = (ropeX - straight2DX) * 0.35 * arc;
        const physSagY = -(ropeY - straight2DY) * 0.35 * arc; // Inversão de Y (2D tela top-down vs 3D Three.js)

        sagX = Number.isFinite(physSagX) ? physSagX : 0;
        sagY = Number.isFinite(physSagY) ? physSagY : 0;
      }

      // A corda XPBD já contém a resposta física do contato. Não adicionamos
      // oscilação senoidal global: todas as linhas usavam a mesma fase e pareciam
      // tremer juntas quando 3+ relinhos estavam ativos.
      const finalX = lx + sagX;
      const finalY = ly + sagY;
      const finalZ = lz; // Z é a interpolação pura contínua da mão 3D (hZ) até a pipa 3D (kZ)

      posArr[p * 3] = Number.isFinite(finalX) ? finalX : lx;
      posArr[p * 3 + 1] = Number.isFinite(finalY) ? finalY : ly;
      posArr[p * 3 + 2] = Number.isFinite(finalZ) ? finalZ : lz;
    }

    const geom = l3d.userData.geom || l3d.userData.geo;
    if (geom && geom.attributes && geom.attributes.position) {
      geom.attributes.position.needsUpdate = true;
    }

    return l3d;
  }

  emitSpark3D(worldX, worldY, worldZ, count = 4, colorHex = null, wind = null) {
    if (!this.sparksPoints) return;
    const sp = this.sparksPoints.userData;

    let cr = 1.0, cg = 0.85, cb = 0.25;
    if (colorHex !== null && colorHex !== undefined) {
      const c = typeof colorHex === 'string' ? parseInt(colorHex.replace('#', '0x')) : Number(colorHex);
      if (!isNaN(c) && c > 0) {
        cr = ((c >> 16) & 255) / 255;
        cg = ((c >> 8) & 255) / 255;
        cb = (c & 255) / 255;
      }
    }

    for (let c = 0; c < count; c++) {
      const idx = sp.activeCount % sp.maxParticles;
      sp.positions[idx * 3] = worldX + (Math.random() - 0.5) * 5;
      sp.positions[idx * 3 + 1] = worldY + (Math.random() - 0.5) * 5;
      sp.positions[idx * 3 + 2] = worldZ + (Math.random() - 0.5) * 5;

      const speed = 3.5 + Math.random() * 5.0;
      const ang = Math.random() * Math.PI * 2;
      sp.velocities[idx * 3] = Math.cos(ang) * speed + (wind ? wind.x : 0) * 0.9;
      sp.velocities[idx * 3 + 1] = Math.sin(ang) * speed + 1.8;
      sp.velocities[idx * 3 + 2] = (Math.random() - 0.5) * speed;

      const isHotWhite = Math.random() < 0.35;
      const r = isHotWhite ? 1.0 : cr * 0.85 + 0.15;
      const g = isHotWhite ? 0.95 : cg * 0.85 + 0.1;
      const b = isHotWhite ? 0.8 : cb * 0.85;

      if (sp.baseColors) {
        sp.baseColors[idx * 3] = r;
        sp.baseColors[idx * 3 + 1] = g;
        sp.baseColors[idx * 3 + 2] = b;
      }

      sp.colors[idx * 3] = r;
      sp.colors[idx * 3 + 1] = g;
      sp.colors[idx * 3 + 2] = b;

      const life = 0.45 + Math.random() * 0.35;
      sp.lives[idx] = life;
      if (sp.maxLives) sp.maxLives[idx] = life;
      sp.activeCount++;
    }
    this.sparksPoints.geometry.attributes.position.needsUpdate = true;
    this.sparksPoints.geometry.attributes.color.needsUpdate = true;
  }

  emitCut3D(worldX, worldY, worldZ, colorHex = 0xffffff, wind = null) {
    if (!this.sparksPoints) return;
    const sp = this.sparksPoints.userData;

    let cr = 1.0, cg = 0.9, cb = 0.3;
    if (colorHex !== null && colorHex !== undefined) {
      const c = typeof colorHex === 'string' ? parseInt(colorHex.replace('#', '0x')) : Number(colorHex);
      if (!isNaN(c) && c > 0) {
        cr = ((c >> 16) & 255) / 255;
        cg = ((c >> 8) & 255) / 255;
        cb = (c & 255) / 255;
      }
    }

    const burstCount = 38;
    for (let c = 0; c < burstCount; c++) {
      const idx = sp.activeCount % sp.maxParticles;
      sp.positions[idx * 3] = worldX + (Math.random() - 0.5) * 3;
      sp.positions[idx * 3 + 1] = worldY + (Math.random() - 0.5) * 3;
      sp.positions[idx * 3 + 2] = worldZ + (Math.random() - 0.5) * 3;

      const speed = 6.0 + Math.random() * 11.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      sp.velocities[idx * 3] = Math.cos(phi) * Math.cos(theta) * speed + (wind ? wind.x : 0) * 1.2;
      sp.velocities[idx * 3 + 1] = Math.sin(phi) * speed + 2.5;
      sp.velocities[idx * 3 + 2] = Math.cos(phi) * Math.sin(theta) * speed;

      const roll = Math.random();
      let r, g, b;
      if (roll < 0.4) {
        r = cr; g = cg; b = cb;
      } else if (roll < 0.75) {
        r = 1.0; g = 0.75; b = 0.1;
      } else {
        r = 1.0; g = 1.0; b = 1.0;
      }

      if (sp.baseColors) {
        sp.baseColors[idx * 3] = r;
        sp.baseColors[idx * 3 + 1] = g;
        sp.baseColors[idx * 3 + 2] = b;
      }

      sp.colors[idx * 3] = r;
      sp.colors[idx * 3 + 1] = g;
      sp.colors[idx * 3 + 2] = b;

      const life = 0.65 + Math.random() * 0.45;
      sp.lives[idx] = life;
      if (sp.maxLives) sp.maxLives[idx] = life;
      sp.activeCount++;
    }
    this.sparksPoints.geometry.attributes.position.needsUpdate = true;
    this.sparksPoints.geometry.attributes.color.needsUpdate = true;
  }

  updateSparks(delta) {
    if (!this.sparksPoints) return;
    const sp = this.sparksPoints.userData;
    const count = sp.maxParticles;
    const dt = Math.max(0.016, (delta || 1) / 60);
    let anyActive = false;

    for (let i = 0; i < count; i++) {
      if (sp.lives[i] > 0) {
        anyActive = true;
        sp.lives[i] -= dt;
        sp.positions[i * 3] += sp.velocities[i * 3] * dt * 45;
        sp.positions[i * 3 + 1] += sp.velocities[i * 3 + 1] * dt * 45;
        sp.positions[i * 3 + 2] += sp.velocities[i * 3 + 2] * dt * 45;
        sp.velocities[i * 3 + 1] -= 9.8 * dt * 4;

        const maxL = sp.maxLives ? sp.maxLives[i] : 0.6;
        const progress = 1 - Math.max(0, sp.lives[i] / (maxL || 0.6));
        const alpha = Math.max(0, 1 - progress);

        const br = sp.baseColors ? sp.baseColors[i * 3] : 1.0;
        const bg = sp.baseColors ? sp.baseColors[i * 3 + 1] : 0.85;
        const bb = sp.baseColors ? sp.baseColors[i * 3 + 2] : 0.3;

        sp.colors[i * 3] = br * alpha;
        sp.colors[i * 3 + 1] = bg * alpha;
        sp.colors[i * 3 + 2] = bb * alpha;

        if (sp.lives[i] <= 0) {
          sp.positions[i * 3 + 1] = -9999;
        }
      }
    }

    if (anyActive) {
      this.sparksPoints.geometry.attributes.position.needsUpdate = true;
      this.sparksPoints.geometry.attributes.color.needsUpdate = true;
    }
  }

  pruneInactive(activeUserIds) {
    for (const [userId, l3d] of this.lines3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.group.remove(l3d);
        const geom = l3d.userData?.geom || l3d.userData?.geo;
        if (geom && typeof geom.dispose === 'function') geom.dispose();
        if (l3d.userData?.mat && typeof l3d.userData.mat.dispose === 'function') l3d.userData.mat.dispose();
        if (l3d.userData?.glowMat && typeof l3d.userData.glowMat.dispose === 'function') l3d.userData.glowMat.dispose();
        if (l3d.material && typeof l3d.material.dispose === 'function') l3d.material.dispose();
        this.lines3D.delete(userId);
      }
    }
  }

  dispose() {
    for (const [userId, l3d] of this.lines3D.entries()) {
      this.group.remove(l3d);
      const geom = l3d.userData?.geom || l3d.userData?.geo;
      if (geom && typeof geom.dispose === 'function') geom.dispose();
      if (l3d.userData?.mat && typeof l3d.userData.mat.dispose === 'function') l3d.userData.mat.dispose();
      if (l3d.userData?.glowMat && typeof l3d.userData.glowMat.dispose === 'function') l3d.userData.glowMat.dispose();
      if (l3d.material && typeof l3d.material.dispose === 'function') l3d.material.dispose();
    }
    this.lines3D.clear();

    if (this.sparksPoints && this.sparksPoints.geometry) {
      this.sparksPoints.geometry.dispose();
      if (this.sparksPoints.material) this.sparksPoints.material.dispose();
    }
  }
}
