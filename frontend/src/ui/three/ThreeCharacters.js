import * as THREE from 'three';
import { hashStringToInt, getOrCreateKiteDecalTexture, disposeHierarchy } from './ThreeMaterials.js';

export const BRAZILIAN_SKIN_TONES = [0xc68652, 0xb87333, 0x8d5524, 0x5c3818, 0xd99b66, 0xf0c294];
export const SHORTS_COLORS = [0x263238, 0x1a237e, 0x37474f, 0x4e342e, 0x004d40];
export const CAP_COLORS = [0xd32f2f, 0x1565c0, 0x111111, 0xffffff, 0xfbc02d];

// Geometrias e materiais compartilhados dos bonecos
let _sharedFootGeo = null;
let _sharedLegGeo = null;
let _sharedShortsGeo = null;
let _sharedTorsoGeo = null;
let _sharedHeadGeo = null;
let _sharedCapGeo = null;
let _sharedBrimGeo = null;
let _sharedArmGeo = null;
let _sharedForearmGeo = null;
let _sharedFlipFlopMat = null;
let _sharedGlassesFrameMat = null;
let _sharedGlassesLensMat = null;
let _sharedGlassesFrameGeo = null;
let _sharedGlassesLensGeo = null;
let _sharedBadgeGeo = null;
let _sharedBadgeRimGeo = null;
let _sharedBadgeRimMat = null;

let _sharedCrownMat = null;
let _sharedCrownRingGeo = null;
let _sharedCrownSpikeGeo = null;

export function createMiniCrown3D() {
  const group = new THREE.Group();
  if (!_sharedCrownMat) {
    _sharedCrownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x664400,
      emissiveIntensity: 0.25
    });
    _sharedCrownMat.userData = { isShared: true };
  }
  if (!_sharedCrownRingGeo) {
    _sharedCrownRingGeo = new THREE.CylinderGeometry(4.2, 4.5, 1.8, 12, 1, true);
    _sharedCrownRingGeo.userData = { isShared: true };
  }
  if (!_sharedCrownSpikeGeo) {
    _sharedCrownSpikeGeo = new THREE.ConeGeometry(1.2, 3.2, 4);
    _sharedCrownSpikeGeo.userData = { isShared: true };
  }

  const ring = new THREE.Mesh(_sharedCrownRingGeo, _sharedCrownMat);
  group.add(ring);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(_sharedCrownSpikeGeo, _sharedCrownMat);
    spike.position.set(Math.cos(angle) * 4.2, 2.2, Math.sin(angle) * 4.2);
    spike.rotation.y = angle;
    group.add(spike);
  }
  return group;
}

let _sharedCarretilhaWoodMat = null;
let _sharedCarretilhaDiscGeo = null;
let _sharedCarretilhaCoreGeo = null;
let _sharedCarretilhaAxleGeo = null;

export function createCarretilha3D(stringColorHex = 0xffffff) {
  const group = new THREE.Group();
  if (!_sharedCarretilhaWoodMat) {
    _sharedCarretilhaWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.72 });
    _sharedCarretilhaWoodMat.userData = { isShared: true };
  }
  const lineMat = new THREE.MeshStandardMaterial({ color: stringColorHex || 0xffffff, roughness: 0.55 });

  if (!_sharedCarretilhaDiscGeo) {
    _sharedCarretilhaDiscGeo = new THREE.CylinderGeometry(4.8, 4.8, 0.5, 10);
    _sharedCarretilhaDiscGeo.userData = { isShared: true };
  }
  if (!_sharedCarretilhaCoreGeo) {
    _sharedCarretilhaCoreGeo = new THREE.CylinderGeometry(3.2, 3.2, 4.4, 10);
    _sharedCarretilhaCoreGeo.userData = { isShared: true };
  }
  if (!_sharedCarretilhaAxleGeo) {
    _sharedCarretilhaAxleGeo = new THREE.CylinderGeometry(0.7, 0.7, 6.8, 8);
    _sharedCarretilhaAxleGeo.userData = { isShared: true };
  }

  const leftDisc = new THREE.Mesh(_sharedCarretilhaDiscGeo, _sharedCarretilhaWoodMat);
  leftDisc.rotation.z = Math.PI * 0.5;
  leftDisc.position.x = -2.4;
  group.add(leftDisc);

  const rightDisc = new THREE.Mesh(_sharedCarretilhaDiscGeo, _sharedCarretilhaWoodMat);
  rightDisc.rotation.z = Math.PI * 0.5;
  rightDisc.position.x = 2.4;
  group.add(rightDisc);

  const core = new THREE.Mesh(_sharedCarretilhaCoreGeo, lineMat);
  core.rotation.z = Math.PI * 0.5;
  group.add(core);

  const axle = new THREE.Mesh(_sharedCarretilhaAxleGeo, _sharedCarretilhaWoodMat);
  axle.rotation.z = Math.PI * 0.5;
  group.add(axle);

  group.userData = { core, leftDisc, rightDisc };
  return group;
}

export function syncCarretilhaFromRope(carretilha, kite) {
  if (!carretilha) return { deltaLength: 0, releasedLength: 0 };
  const released = Math.max(0, Number(kite?.rope?.releasedLength ?? kite?.rope?.spoolLength) || 0);
  const total = Math.max(1, Number(kite?.rope?.totalLineLength) || released || 1);
  const prev = Number(carretilha.userData?.lastReleasedLength);
  const deltaLength = Number.isFinite(prev) ? released - prev : 0;
  carretilha.userData.lastReleasedLength = released;
  carretilha.rotation.x += -deltaLength / 52;
  const woundRatio = Math.max(0, Math.min(1, (total - released) / total));
  const core = carretilha.userData?.core;
  if (core) {
    const radial = 0.78 + woundRatio * 0.32;
    core.scale.x = radial;
    core.scale.z = radial;
  }
  return { deltaLength, releasedLength: released, woundRatio };
}

export function createPlayerBoneco3D(skinColor = 0xc68652, shirtColor = 0x1976d2, shortsColor = 0x37474f, capColor = 0xd32f2f) {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.78 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.82 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: shortsColor, roughness: 0.84 });
  const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.75 });

  if (!_sharedFlipFlopMat) {
    _sharedFlipFlopMat = new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.65 });
    _sharedFlipFlopMat.userData = { isShared: true };
  }

  // 1. Pés e Chinelos de Dedo na laje
  if (!_sharedFootGeo) {
    _sharedFootGeo = new THREE.BoxGeometry(2.4, 0.9, 4.5);
    _sharedFootGeo.userData = { isShared: true };
  }
  const leftFoot = new THREE.Mesh(_sharedFootGeo, _sharedFlipFlopMat);
  leftFoot.position.set(-2.2, 0.45, 0.8);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(_sharedFootGeo, _sharedFlipFlopMat);
  rightFoot.position.set(2.2, 0.45, 0.8);
  group.add(rightFoot);

  // 2. Pernas e Bermuda
  if (!_sharedLegGeo) {
    _sharedLegGeo = new THREE.CylinderGeometry(0.9, 0.8, 6.5, 8);
    _sharedLegGeo.userData = { isShared: true };
  }
  const leftLeg = new THREE.Mesh(_sharedLegGeo, skinMat);
  leftLeg.position.set(-2.2, 3.8, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(_sharedLegGeo, skinMat);
  rightLeg.position.set(2.2, 3.8, 0);
  group.add(rightLeg);

  if (!_sharedShortsGeo) {
    _sharedShortsGeo = new THREE.BoxGeometry(6.4, 4.5, 4.2);
    _sharedShortsGeo.userData = { isShared: true };
  }
  const shorts = new THREE.Mesh(_sharedShortsGeo, shortsMat);
  shorts.position.set(0, 8.5, 0);
  group.add(shorts);

  // 3. Tronco com Regata
  if (!_sharedTorsoGeo) {
    _sharedTorsoGeo = new THREE.BoxGeometry(6.0, 9.0, 3.8);
    _sharedTorsoGeo.userData = { isShared: true };
  }
  const torso = new THREE.Mesh(_sharedTorsoGeo, shirtMat);
  torso.position.set(0, 14.5, 0);
  torso.castShadow = true;
  group.add(torso);

  // 4. Cabeça Articulada com Boné e Óculos Juliet
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 21.0, 0.2);

  if (!_sharedHeadGeo) {
    _sharedHeadGeo = new THREE.SphereGeometry(2.7, 10, 8);
    _sharedHeadGeo.userData = { isShared: true };
  }
  const head = new THREE.Mesh(_sharedHeadGeo, skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Boné virado para trás
  if (!_sharedCapGeo) {
    _sharedCapGeo = new THREE.SphereGeometry(2.85, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    _sharedCapGeo.userData = { isShared: true };
  }
  const cap = new THREE.Mesh(_sharedCapGeo, capMat);
  cap.position.set(0, 0.4, 0);
  cap.rotation.x = -0.15;
  headGroup.add(cap);

  if (!_sharedBrimGeo) {
    _sharedBrimGeo = new THREE.BoxGeometry(2.8, 0.4, 2.2);
    _sharedBrimGeo.userData = { isShared: true };
  }
  const brim = new THREE.Mesh(_sharedBrimGeo, capMat);
  brim.position.set(0, 0.8, -2.8);
  brim.rotation.x = 0.25;
  headGroup.add(brim);

  // Óculos espelhado estilo Juliet
  const glassesGroup = new THREE.Group();
  glassesGroup.position.set(0, 0.2, 2.5);

  if (!_sharedGlassesFrameMat) {
    _sharedGlassesFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 });
    _sharedGlassesFrameMat.userData = { isShared: true };
  }
  if (!_sharedGlassesFrameGeo) {
    _sharedGlassesFrameGeo = new THREE.BoxGeometry(4.0, 0.35, 0.4);
    _sharedGlassesFrameGeo.userData = { isShared: true };
  }
  const frame = new THREE.Mesh(_sharedGlassesFrameGeo, _sharedGlassesFrameMat);
  glassesGroup.add(frame);

  if (!_sharedGlassesLensMat) {
    _sharedGlassesLensMat = new THREE.MeshStandardMaterial({
      color: 0xff6d00,
      metalness: 0.96,
      roughness: 0.08,
      emissive: 0x331500,
      emissiveIntensity: 0.3
    });
    _sharedGlassesLensMat.userData = { isShared: true };
  }
  if (!_sharedGlassesLensGeo) {
    _sharedGlassesLensGeo = new THREE.BoxGeometry(1.4, 0.9, 0.15);
    _sharedGlassesLensGeo.userData = { isShared: true };
  }
  const leftLens = new THREE.Mesh(_sharedGlassesLensGeo, _sharedGlassesLensMat);
  leftLens.position.set(-1.1, -0.25, 0.1);
  glassesGroup.add(leftLens);

  const rightLens = new THREE.Mesh(_sharedGlassesLensGeo, _sharedGlassesLensMat);
  rightLens.position.set(1.1, -0.25, 0.1);
  glassesGroup.add(rightLens);

  glassesGroup.visible = false;
  headGroup.add(glassesGroup);

  group.add(headGroup);

  // 5. Braço Esquerdo segurando a Carretilha
  if (!_sharedArmGeo) {
    _sharedArmGeo = new THREE.CylinderGeometry(0.7, 0.6, 6.0, 8);
    _sharedArmGeo.userData = { isShared: true };
  }
  const leftArm = new THREE.Mesh(_sharedArmGeo, skinMat);
  leftArm.position.set(-3.8, 14.5, 1.8);
  leftArm.rotation.x = Math.PI * 0.35;
  leftArm.rotation.z = Math.PI * 0.12;
  group.add(leftArm);

  const carretilha = createCarretilha3D(0xffffff);
  carretilha.scale.set(0.55, 0.55, 0.55);
  carretilha.position.set(-4.2, 13.0, 4.5);
  group.add(carretilha);

  // 6. Braço Direito articulado puxando a linha
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(3.4, 17.5, 0);

  const rightUpperArm = new THREE.Mesh(_sharedArmGeo, skinMat);
  rightUpperArm.position.set(0, -3.0, 1.2);
  rightUpperArm.rotation.x = Math.PI * 0.28;
  rightArmGroup.add(rightUpperArm);

  if (!_sharedForearmGeo) {
    _sharedForearmGeo = new THREE.CylinderGeometry(0.6, 0.55, 5.5, 8);
    _sharedForearmGeo.userData = { isShared: true };
  }
  const rightForearm = new THREE.Mesh(_sharedForearmGeo, skinMat);
  rightForearm.position.set(0.5, -5.2, 3.8);
  rightForearm.rotation.x = Math.PI * 0.48;
  rightArmGroup.add(rightForearm);

  const handAnchor = new THREE.Group();
  handAnchor.position.set(0.6, -5.5, 6.4);
  rightArmGroup.add(handAnchor);

  group.add(rightArmGroup);

  // 7. Medalhão de Avatar no Peito
  const badgeGroup = new THREE.Group();
  badgeGroup.position.set(0, 14.5, 2.0);

  if (!_sharedBadgeGeo) {
    _sharedBadgeGeo = new THREE.CircleGeometry(2.0, 16);
    _sharedBadgeGeo.userData = { isShared: true };
  }
  const badgeMesh = new THREE.Mesh(_sharedBadgeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  badgeGroup.add(badgeMesh);

  if (!_sharedBadgeRimGeo) {
    _sharedBadgeRimGeo = new THREE.RingGeometry(1.85, 2.2, 16);
    _sharedBadgeRimGeo.userData = { isShared: true };
  }
  if (!_sharedBadgeRimMat) {
    _sharedBadgeRimMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide });
    _sharedBadgeRimMat.userData = { isShared: true };
  }
  const badgeRim = new THREE.Mesh(_sharedBadgeRimGeo, _sharedBadgeRimMat);
  badgeRim.position.z = 0.05;
  badgeGroup.add(badgeRim);
  badgeGroup.visible = true;

  group.add(badgeGroup);

  // Mini coroa flutuante
  const crown = createMiniCrown3D();
  crown.scale.set(0.65, 0.65, 0.65);
  crown.position.set(0, 24.2, 0.2);
  crown.visible = false;
  group.add(crown);

  group.userData = {
    headGroup,
    glassesGroup,
    torso,
    skinMat,
    shirtMat,
    shortsMat,
    capMat,
    rightArmGroup,
    carretilha,
    handAnchor,
    badgeGroup,
    badgeMesh,
    badgeRim,
    crown,
    celebrateTimer: 0,
    baseY: 0
  };

  return group;
}

export class ThreeCharacters {
  constructor() {
    this.players3D = new Map();
    this.group = new THREE.Group();
  }

  get(uidStr) {
    return this.players3D.get(uidStr);
  }

  has(uidStr) {
    return this.players3D.has(uidStr);
  }

  getOrCreate(uidStr, kite) {
    let p3d = this.players3D.get(uidStr);
    if (!p3d) {
      const skinIdx = Math.abs(hashStringToInt(uidStr + '_skin')) % BRAZILIAN_SKIN_TONES.length;
      const shortsIdx = Math.abs(hashStringToInt(uidStr + '_shorts')) % SHORTS_COLORS.length;
      const capIdx = Math.abs(hashStringToInt(uidStr + '_cap')) % CAP_COLORS.length;
      const skinColor = BRAZILIAN_SKIN_TONES[skinIdx];
      const shortsColor = SHORTS_COLORS[shortsIdx];
      const capColor = CAP_COLORS[capIdx];

      p3d = createPlayerBoneco3D(skinColor, kite.bodyColor || 0x1976d2, shortsColor, capColor);
      this.group.add(p3d);
      this.players3D.set(uidStr, p3d);
    }
    return p3d;
  }

  syncPlayer(uidStr, kite, bonecoX, bonecoZ, bonecoScale, kitePos3D, lajeWorldY, delta, time, totalKites, idx, vx) {
    const p3d = this.getOrCreate(uidStr, kite);
    const normDecalUrl = String(kite.profilePictureUrl || '').trim();
    const expectedDecalKey = `${normDecalUrl || kite.nickname || 'p'}_${kite.bodyColor}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;

    if (p3d.userData.currentDecalKey !== expectedDecalKey) {
      const badgeTex = getOrCreateKiteDecalTexture(kite.nickname, kite.profilePictureUrl, kite.bodyColor, kite.isKing, kite.isLeader);
      p3d.userData.badgeMesh.material.map = badgeTex;
      p3d.userData.badgeMesh.material.needsUpdate = true;
      p3d.userData.currentDecalKey = expectedDecalKey;
    }

    p3d.position.set(bonecoX, 2.5, bonecoZ);
    p3d.scale.set(bonecoScale, bonecoScale, bonecoScale);

    // Head-tracking: boneco olha para sua pipa no céu
    if (p3d.userData.headGroup) {
      const dx = kitePos3D.x - bonecoX;
      const dy = kitePos3D.y - (lajeWorldY + 21);
      const distXZ = Math.max(70, Math.sqrt(dx * dx + (kitePos3D.z - bonecoZ) * (kitePos3D.z - bonecoZ)));

      const targetPitch = -Math.atan2(dy, distXZ) * 0.85;
      const targetYaw = Math.atan2(dx, distXZ) * 0.65;
      p3d.userData.headGroup.rotation.x = Math.max(-0.95, Math.min(0.12, targetPitch));
      p3d.userData.headGroup.rotation.y = Math.max(-0.65, Math.min(0.65, targetYaw));
    }

    // Óculos Juliet para Rei, Líder ou Streak >= 2
    if (p3d.userData.glassesGroup) {
      p3d.userData.glassesGroup.visible = Boolean(kite.isKing || kite.isLeader || (kite.streak && kite.streak >= 2));
    }

    // A carretilha gira somente quando comprimento físico entra ou sai.
    const reelState = syncCarretilhaFromRope(p3d.userData.carretilha, kite);

    // O braço reage ao movimento real da carretilha, não a animação por tempo/manobra.
    const reelMotion = Math.max(-1, Math.min(1, -reelState.deltaLength / 18));
    const armPull = reelMotion > 0 ? -0.18 - reelMotion * 0.46
      : reelMotion < 0 ? 0.10 * Math.abs(reelMotion) : 0;
    if (p3d.userData.rightArmGroup) {
      p3d.userData.rightArmGroup.rotation.x = armPull;
    }

    // Comemoração de corte
    if (kite.rooftopPlayer && kite.rooftopPlayer.celebrationRemaining > 0) {
      const celProg = 1 - (kite.rooftopPlayer.celebrationRemaining / (kite.rooftopPlayer.celebrationDuration || 1));
      const jumpY = Math.abs(Math.sin(celProg * Math.PI * 2.5)) * 11;
      p3d.position.y = jumpY;
      if (p3d.userData.rightArmGroup) p3d.userData.rightArmGroup.rotation.x = -1.25;
      p3d.rotation.y = Math.sin(celProg * Math.PI * 4) * 0.15;
    } else {
      p3d.position.y = 0;
      p3d.rotation.y = 0;
    }

    // Coroa no boneco do Rei da Laje
    p3d.userData.crown.visible = Boolean(kite.isKing);
    if (kite.isKing) {
      p3d.userData.crown.rotation.y = time * 2.2;
    }

    // Medalhão de avatar
    if (p3d.userData.badgeGroup) {
      p3d.userData.badgeGroup.visible = Boolean(totalKites <= 20 || kite.isKing || kite.isLeader);
    }

    // Camisa na cor da pipa
    if (p3d.userData.shirtMat && kite.bodyColor) {
      p3d.userData.shirtMat.color.setHex(kite.bodyColor);
    }

    return p3d;
  }

  syncPlayerBoneco(uidStr, kite, idx, totalKites, lajeWidth, lajeWorldY, kitePos3D, time, delta, width, height) {
    const isPortrait = height > width;
    const maxPerRow = totalKites > 20 ? Math.ceil(totalKites / 2) : totalKites;
    const row = totalKites > 20 && idx >= maxPerRow ? 1 : 0;
    const col = row === 1 ? idx - maxPerRow : idx;
    const countInRow = row === 1 ? (totalKites - maxPerRow) : maxPerRow;
    const spacing = Math.min(65, (lajeWidth * 0.88) / Math.max(1, countInRow));
    const startX = -((countInRow - 1) * spacing) * 0.5;
    const bonecoX = startX + col * spacing;
    const bonecoZ = isPortrait ? (row === 1 ? -15 : 14) : (row === 1 ? -14 : 12);
    const bonecoScale = isPortrait ? 1.65 : 1.25;
    const vx = Number(kite.vx || 0);

    return this.syncPlayer(uidStr, kite, bonecoX, bonecoZ, bonecoScale, kitePos3D, lajeWorldY, delta, time, totalKites, idx, vx);
  }

  pruneInactive(activeUserIds) {
    for (const [userId, p3d] of this.players3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.group.remove(p3d);
        disposeHierarchy(p3d);
        this.players3D.delete(userId);
      }
    }
  }

  dispose() {
    for (const [userId, p3d] of this.players3D.entries()) {
      this.group.remove(p3d);
      disposeHierarchy(p3d);
    }
    this.players3D.clear();
  }
}
