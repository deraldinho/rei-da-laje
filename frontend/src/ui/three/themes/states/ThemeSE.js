import * as THREE from 'three';

export function buildThemeSE(group, theme, ctx) {
  for (let s = -1; s <= 1; s += 2) {
    const wall = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
    wall.scale.set(90, 160, 220);
    wall.position.set(s * 170, 75, -450);
    wall.castShadow = false;
    group.add(wall);
  }

  const xingoRiver = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
  xingoRiver.scale.set(220, 2, 380);
  xingoRiver.position.set(0, 12, -430);
  xingoRiver.castShadow = false;
  xingoRiver.userData = { baseY: 12 };
  group.add(xingoRiver);
  if (ctx.waterMeshes) ctx.waterMeshes.push(xingoRiver);

  for (let ct = 0; ct < 16; ct++) {
    const isLeft = (ct % 2 === 0);
    const cactus = new THREE.Group();
    const ch = 20 + ctx.hash(ct * 7) * 14;
    const stem = new THREE.Mesh(ctx.geoCyl, ctx.cactusMat);
    stem.scale.set(1.4, ch, 1.4);
    stem.position.y = ch * 0.5;
    stem.castShadow = false;
    cactus.add(stem);

    cactus.userData = {
      isLeft,
      normX: 0.18 + (ct / 16) * 0.68,
      depthZ: -290 - (ct % 3) * 50,
      offsetY: 0
    };
    group.add(cactus);
  }
}
