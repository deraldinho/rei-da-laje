import * as THREE from 'three';

export function buildThemePI(group, theme, ctx) {
  const archGroup = new THREE.Group();
  const archLeft = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
  archLeft.scale.set(22, 85, 26);
  archLeft.position.set(-22, 42.5, 0);
  archLeft.castShadow = false;
  archGroup.add(archLeft);

  const archRight = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
  archRight.scale.set(22, 85, 26);
  archRight.position.set(22, 42.5, 0);
  archRight.castShadow = false;
  archGroup.add(archRight);

  const archTop = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
  archTop.scale.set(66, 25, 26);
  archTop.position.set(0, 95, 0);
  archTop.castShadow = false;
  archGroup.add(archTop);

  archGroup.position.set(160, 45, -420);
  group.add(archGroup);

  for (let m = 0; m < 4; m++) {
    const mesa = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
    mesa.scale.set(95, 75, 70);
    mesa.position.set((m % 2 === 0 ? -1 : 1) * (210 + m * 50), 45, -470 - m * 60);
    mesa.castShadow = false;
    group.add(mesa);
  }

  for (let ct = 0; ct < 20; ct++) {
    const isLeft = (ct % 2 === 0);
    const cactus = new THREE.Group();
    const ch = 22 + ctx.hash(ct * 7) * 16;
    const stem = new THREE.Mesh(ctx.geoCyl, ctx.cactusMat);
    stem.scale.set(1.5, ch, 1.5);
    stem.position.y = ch * 0.5;
    stem.castShadow = false;
    cactus.add(stem);

    cactus.userData = {
      isLeft,
      normX: 0.16 + (ct / 20) * 0.70,
      depthZ: -290 - (ct % 4) * 55,
      offsetY: 0
    };
    group.add(cactus);
  }
}
