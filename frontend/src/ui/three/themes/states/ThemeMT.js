import * as THREE from 'three';

export function buildThemeMT(group, theme, ctx) {
  const wetland = new THREE.Mesh(ctx.geoBox, ctx.pantanalWaterMat);
  wetland.scale.set(500, 2, 280);
  wetland.position.set(0, 16, -390);
  wetland.castShadow = false;
  wetland.userData = { baseY: 16 };
  group.add(wetland);
  if (ctx.waterMeshes) ctx.waterMeshes.push(wetland);

  for (let b = 0; b < 3; b++) {
    const bridge = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
    bridge.scale.set(70, 4, 16);
    bridge.position.set((b - 1) * 130, 21, -370);
    bridge.castShadow = false;
    group.add(bridge);
  }

  // Tuiuiú
  const tuiuiuTree = new THREE.Group();
  const dryTrunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
  dryTrunk.scale.set(2.4, 48, 2.4);
  dryTrunk.position.y = 24;
  dryTrunk.castShadow = false;
  tuiuiuTree.add(dryTrunk);

  const nest = new THREE.Mesh(ctx.geoCyl, ctx.barrelWoodMat);
  nest.scale.set(16, 4, 16);
  nest.position.y = 48;
  nest.castShadow = false;
  tuiuiuTree.add(nest);

  const birdBody = new THREE.Mesh(ctx.geoSphere, ctx.modernistWhiteMat);
  birdBody.scale.set(4, 5, 4);
  birdBody.position.set(0, 53, 0);
  birdBody.castShadow = false;
  tuiuiuTree.add(birdBody);

  const birdNeck = new THREE.Mesh(ctx.geoCyl, ctx.rebarMat);
  birdNeck.scale.set(0.9, 8, 0.9);
  birdNeck.position.set(2, 58, 0);
  birdNeck.castShadow = false;
  tuiuiuTree.add(birdNeck);

  const birdCollar = new THREE.Mesh(ctx.geoCyl, ctx.lighthouseRedMat);
  birdCollar.scale.set(1.4, 2.2, 1.4);
  birdCollar.position.set(2, 55, 0);
  birdCollar.castShadow = false;
  tuiuiuTree.add(birdCollar);

  tuiuiuTree.position.set(-170, 20, -420);
  group.add(tuiuiuTree);

  // 18 Ipês Amarelos e Rosas
  for (let ip = 0; ip < 18; ip++) {
    const isLeft = (ip % 2 === 0);
    const ipe = new THREE.Group();
    const ih = 28 + ctx.hash(ip * 7) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.8, ih, 1.8);
    trunk.position.y = ih * 0.5;
    trunk.castShadow = false;
    ipe.add(trunk);

    const flowerMat = (ip % 3 === 0) ? ctx.ipePinkMat : ctx.ipeFlowersMat;
    const flowerCrown = new THREE.Mesh(ctx.geoSphere, flowerMat);
    const fcr = 12 + ctx.hash(ip * 11) * 7;
    flowerCrown.scale.set(fcr * 1.35, fcr, fcr * 1.25);
    flowerCrown.position.y = ih * 0.88 + fcr * 0.55;
    flowerCrown.castShadow = false;
    ipe.add(flowerCrown);

    ipe.userData = {
      isLeft,
      normX: 0.16 + (ip / 18) * 0.70,
      depthZ: -290 - (ip % 4) * 60,
      offsetY: 0,
      seed: ip * 19
    };
    group.add(ipe);
    if (ctx.swayingTrees) ctx.swayingTrees.push(ipe);
  }
}
