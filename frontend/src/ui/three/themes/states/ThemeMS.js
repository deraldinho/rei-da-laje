import * as THREE from 'three';

export function buildThemeMS(group, theme, ctx) {
  const bonitoRiver = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
  bonitoRiver.scale.set(500, 2, 280);
  bonitoRiver.position.set(0, 16, -390);
  bonitoRiver.castShadow = false;
  bonitoRiver.userData = { baseY: 16 };
  group.add(bonitoRiver);
  if (ctx.waterMeshes) ctx.waterMeshes.push(bonitoRiver);

  // Deque de madeira para flutuação nas nascentes de Bonito
  const deck = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
  deck.scale.set(55, 2.5, 32);
  deck.position.set(80, 18, -370);
  deck.castShadow = false;
  group.add(deck);

  for (let b = 0; b < 3; b++) {
    const bridge = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
    bridge.scale.set(65, 4, 15);
    bridge.position.set((b - 1) * 130, 21, -370);
    bridge.castShadow = false;
    group.add(bridge);
  }

  for (let ip = 0; ip < 18; ip++) {
    const isLeft = (ip % 2 === 0);
    const ipe = new THREE.Group();
    const ih = 28 + ctx.hash(ip * 7) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.8, ih, 1.8);
    trunk.position.y = ih * 0.5;
    trunk.castShadow = false;
    ipe.add(trunk);

    const flowerMat = (ip % 2 === 0) ? ctx.ipePinkMat : ctx.ipeFlowersMat;
    const crown = new THREE.Mesh(ctx.geoSphere, flowerMat);
    crown.scale.set(14, 12, 14);
    crown.position.y = ih + 6;
    crown.castShadow = false;
    ipe.add(crown);

    ipe.userData = {
      isLeft,
      normX: 0.16 + (ip / 18) * 0.70,
      depthZ: -290 - (ip % 4) * 60,
      offsetY: 0,
      seed: ip * 16
    };
    group.add(ipe);
    if (ctx.swayingTrees) ctx.swayingTrees.push(ipe);
  }
}
