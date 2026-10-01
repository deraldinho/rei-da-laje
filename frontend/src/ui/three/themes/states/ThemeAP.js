import * as THREE from 'three';

export function buildThemeAP(group, theme, ctx) {
  const water = new THREE.Mesh(ctx.geoBox, ctx.amazonWaterMat);
  water.scale.set(500, 2, 280);
  water.position.set(0, 12, -420);
  water.castShadow = false;
  water.userData = { baseY: 12 };
  group.add(water);
  if (ctx.waterMeshes) ctx.waterMeshes.push(water);

  // Marco Zero do Equador
  const marcoZero = new THREE.Group();
  const base = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  base.scale.set(24, 8, 24);
  base.position.y = 4;
  base.castShadow = false;
  marcoZero.add(base);

  const obelisk = new THREE.Mesh(ctx.geoCone, ctx.modernistWhiteMat);
  obelisk.scale.set(8, 70, 8);
  obelisk.position.y = 43;
  obelisk.castShadow = false;
  marcoZero.add(obelisk);

  const ring = new THREE.Mesh(ctx.geoSphere, ctx.goldChurchMat);
  ring.scale.set(10, 10, 2);
  ring.position.set(0, 52, 0);
  ring.castShadow = false;
  marcoZero.add(ring);

  marcoZero.position.set(170, 45, -430);
  group.add(marcoZero);

  for (let p = 0; p < 16; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 38 + ctx.hash(p * 7) * 20;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.3, ph, 1.3);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.amazonForestMatB);
    crown.scale.set(13, 10, 13);
    crown.position.y = ph + 6;
    crown.castShadow = false;
    palm.add(crown);

    palm.userData = {
      isLeft,
      normX: 0.16 + (p / 16) * 0.68,
      depthZ: -290 - (p % 4) * 55,
      offsetY: 0,
      seed: p * 16
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
