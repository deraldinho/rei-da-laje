import {
  createPoolReadyKiteModel3D,
  configureKiteModelType3D
} from './ThreeKites.js';
import {
  BRAZILIAN_SKIN_TONES,
  SHORTS_COLORS,
  CAP_COLORS,
  createPlayerBoneco3D
} from './ThreeCharacters.js';
import {
  LINE_COLORS,
  createDynamicLine3D,
  createKiteNameTagSprite,
  updateKiteNameTagSprite,
  createReusableKitePaperTexture,
  paintReusableKitePaperTexture,
  createReusableKiteDecalTexture,
  paintReusableKiteDecalTexture,
  hashStringToInt,
  disposeHierarchy
} from './ThreeMaterials.js';

function normalizeKiteType(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'raia' || value === 'raiada') return 'raia';
  if (value === 'peixinho') return 'peixinho';
  return 'tradicional';
}

function colorIndex(seed, length) {
  return Math.abs(hashStringToInt(seed)) % length;
}
export function createActiveVisualSlot3D(index, groups) {
  const kite = createPoolReadyKiteModel3D();
  const paperTexture = createReusableKitePaperTexture();
  const kiteDecalTexture = createReusableKiteDecalTexture();
  kite.userData.kiteMat.map = paperTexture;
  kite.userData.kiteMat.needsUpdate = true;
  kite.userData.decalMat.map = kiteDecalTexture;
  kite.userData.decalMat.needsUpdate = true;

  const nameTag = createKiteNameTagSprite('Jogador', false, false);
  kite.add(nameTag);
  kite.userData.nameTag = nameTag;

  const player = createPlayerBoneco3D();
  const playerDecalTexture = createReusableKiteDecalTexture();
  player.userData.badgeMesh.material.map = playerDecalTexture;
  player.userData.badgeMesh.material.needsUpdate = true;

  const line = createDynamicLine3D(20);
  groups?.kites?.add(kite);
  groups?.players?.add(player);
  groups?.lines?.add(line);

  const slot = {
    index,
    generation: 0,
    userId: null,
    kite,
    player,
    line,
    groups,
    paperTexture,
    kiteDecalTexture,
    playerDecalTexture
  };
  resetActiveVisualSlot3D(slot);
  return slot;
}
export function configureActiveVisualSlot3D(slot, userId, kiteData = {}, time = 0) {
  if (!slot) return null;
  const uid = String(userId);
  slot.userId = uid;
  const generation = Number(slot.generation) || 0;
  const bodyColor = Number.isFinite(kiteData.bodyColor) ? kiteData.bodyColor : 0xff5722;
  const patternIndex = colorIndex(uid + '_pat', 4);
  const secondaryColor = ((bodyColor ^ 0x00ffff) | 0x330033) & 0xffffff;
  const kiteType = normalizeKiteType(kiteData.kiteType);

  configureKiteModelType3D(slot.kite, kiteType, patternIndex);
  paintReusableKitePaperTexture(
    slot.paperTexture, bodyColor, secondaryColor, patternIndex
  );

  const identity = {
    nickname: String(kiteData.nickname || 'Jogador'),
    profileUrl: String(kiteData.profilePictureUrl || ''),
    baseColorHex: bodyColor,
    isKing: Boolean(kiteData.isKing),
    isLeader: Boolean(kiteData.isLeader)
  };
  const isCurrent = candidateGeneration => (
    slot.userId === uid && slot.generation === candidateGeneration
  );
  paintReusableKiteDecalTexture(
    slot.kiteDecalTexture, identity, generation, isCurrent
  );
  paintReusableKiteDecalTexture(
    slot.playerDecalTexture, identity, generation, isCurrent
  );

  updateKiteNameTagSprite(
    slot.kite.userData.nameTag,
    identity.nickname,
    identity.isKing,
    identity.isLeader
  );
  slot.kite.userData.currentTagKey = `${identity.nickname}_${identity.isKing ? 1 : 0}_${identity.isLeader ? 1 : 0}`;
  slot.kite.userData.spawnTime = Number(time) || 0;
  slot.kite.userData.roll = 0;
  slot.kite.userData.pitch = 0;
  slot.kite.userData.yaw = 0;
  slot.kite.userData.spinAngle = 0;
  slot.kite.userData.tailWorldNodes = null;

  const playerData = slot.player.userData;
  playerData.skinMat.color.setHex(
    BRAZILIAN_SKIN_TONES[colorIndex(uid + '_skin', BRAZILIAN_SKIN_TONES.length)]
  );
  playerData.shortsMat.color.setHex(
    SHORTS_COLORS[colorIndex(uid + '_shorts', SHORTS_COLORS.length)]
  );
  playerData.capMat.color.setHex(
    CAP_COLORS[colorIndex(uid + '_cap', CAP_COLORS.length)]
  );
  playerData.shirtMat.color.setHex(bodyColor);

  const isKing = Boolean(kiteData.isKing);
  const isLeader = Boolean(kiteData.isLeader);
  const hasShield = Boolean(
    kiteData.shieldActive || kiteData.hasKevlarBuff ||
    Number(kiteData.shieldCount) > 0 || kiteData.isInvulnerable
  );
  const hasTornado = Boolean(
    kiteData.tornadoActive || Number(kiteData.specials?.tornado) > 0 ||
    String(kiteData.maneuver?.name || '').toLowerCase() === 'tenteio'
  );
  slot.kite.userData.crown.visible = isKing;
  slot.kite.userData.aura.visible = isKing || isLeader;
  slot.kite.userData.shieldMesh.visible = hasShield;
  slot.kite.userData.tornadoMesh.visible = hasTornado;
  playerData.crown.visible = isKing;
  playerData.glassesGroup.visible = Boolean(isKing || isLeader || Number(kiteData.streak) >= 2);
  playerData.badgeGroup.visible = true;
  const maxHp = Number(kiteData.maxLineHP) > 0 ? Number(kiteData.maxLineHP) : 100;
  const hp = Number.isFinite(Number(kiteData.lineHP)) ? Number(kiteData.lineHP) : maxHp;
  const hpFraction = Math.max(0, Math.min(1, hp / maxHp));
  const hpWidth = slot.kite.userData.hpBarWidth || 14;
  slot.kite.userData.hpFill.scale.x = Math.max(0.01, hpWidth * hpFraction);
  slot.kite.userData.hpFill.position.x = -hpWidth * 0.5 * (1 - hpFraction);
  slot.kite.userData.hpGroup.visible = Boolean(hpFraction < 0.99 || isKing || isLeader);
  slot.kite.userData.hpFillMat.color.setHex(
    hpFraction > 0.55 ? 0x10b981 : hpFraction > 0.25 ? 0xf59e0b : 0xef4444
  );

  const lineColor = LINE_COLORS[kiteData.lineType] || 0xf8f9fa;
  slot.line.userData.mat.color.setHex(isKing ? 0xffd700 : lineColor);
  slot.line.userData.glowMat.color.setHex(isKing ? 0xffea00 : lineColor);
  slot.line.userData.mat.opacity = 0.88;
  slot.line.userData.glowMat.opacity = 0.38;

  slot.kite.visible = true;
  slot.player.visible = true;
  slot.line.visible = true;
  return slot;
}

function resetTail(slot) {
  const kite = slot.kite;
  const attr = kite.userData.tailMesh?.geometry?.attributes?.position;
  if (attr?.array) {
    for (let i = 0; i < kite.userData.tailNodes.length; i++) {
      attr.array[i * 3] = 0;
      attr.array[i * 3 + 1] = -i * 5.2;
      attr.array[i * 3 + 2] = 0;
      kite.userData.tailNodes[i].set(0, -i * 5.2, 0);
    }
    attr.needsUpdate = true;
  }
  kite.userData.tailWorldNodes = null;
}
export function resetActiveVisualSlot3D(slot) {
  if (!slot) return;
  slot.userId = null;
  configureKiteModelType3D(slot.kite, 'tradicional', 0);
  slot.kite.visible = false;
  slot.player.visible = false;
  slot.line.visible = false;

  slot.kite.position.set(0, 0, 0);
  slot.kite.rotation.set(0, 0, 0);
  slot.kite.scale.set(1, 1, 1);
  slot.kite.userData.currentDecalKey = null;
  slot.kite.userData.currentTagKey = null;
  slot.kite.userData.spawnTime = 0;
  slot.kite.userData.roll = 0;
  slot.kite.userData.pitch = 0;
  slot.kite.userData.yaw = 0;
  slot.kite.userData.spinAngle = 0;
  slot.kite.userData.crown.visible = false;
  slot.kite.userData.aura.visible = false;
  slot.kite.userData.shieldMesh.visible = false;
  slot.kite.userData.tornadoMesh.visible = false;
  slot.kite.userData.hpGroup.visible = false;
  const hpWidth = slot.kite.userData.hpBarWidth || 14;
  slot.kite.userData.hpFill.scale.x = hpWidth;
  slot.kite.userData.hpFill.position.x = 0;
  resetTail(slot);

  const playerData = slot.player.userData;
  slot.player.position.set(0, 0, 0);
  slot.player.rotation.set(0, 0, 0);
  slot.player.scale.set(1, 1, 1);
  playerData.currentDecalKey = null;
  playerData.crown.visible = false;
  playerData.glassesGroup.visible = false;
  playerData.badgeGroup.visible = false;
  playerData.headGroup?.rotation.set(0, 0, 0);
  playerData.rightArmGroup?.rotation.set(0, 0, 0);

  slot.line.position.set(0, 0, 0);
  slot.line.rotation.set(0, 0, 0);
  slot.line.scale.set(1, 1, 1);
  if (slot.line.userData?.positions) {
    slot.line.userData.positions.fill(0);
    const positionAttr = slot.line.userData.geom?.attributes?.position;
    if (positionAttr) positionAttr.needsUpdate = true;
  }
  slot.line.userData.mat.opacity = 0;
  slot.line.userData.glowMat.opacity = 0;
}

export function disposeActiveVisualSlot3D(slot) {
  if (!slot || slot._disposed) return;
  slot._disposed = true;
  slot.groups?.kites?.remove(slot.kite);
  slot.groups?.players?.remove(slot.player);
  slot.groups?.lines?.remove(slot.line);
  disposeHierarchy(slot.kite);
  disposeHierarchy(slot.player);
  disposeHierarchy(slot.line);
  slot.userId = null;
}
