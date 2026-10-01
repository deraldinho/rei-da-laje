import * as THREE from 'three';

export function buildThemeTO(group, theme, ctx) {
  for (let m = 0; m < 5; m++) {
    const isLeft = (m % 2 === 0);
    const mesa = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
    const mw = 95 + ctx.hash(m * 17) * 70;
    const mh = 75 + ctx.hash(m * 19) * 45;
    const md = 70 + ctx.hash(m * 23) * 40;
    mesa.scale.set(mw, mh, md);
    mesa.position.set((isLeft ? -1 : 1) * (210 + m * 65), mh * 0.5 + 20, -470 - m * 70);
    mesa.castShadow = false;
    group.add(mesa);
  }

  // Fervedouro de águas azuis
  const fervedouro = new THREE.Mesh(ctx.geoCyl, ctx.lagoonWaterMat);
  fervedouro.scale.set(50, 2, 50);
  fervedouro.position.set(0, 18, -370);
  fervedouro.castShadow = false;
  fervedouro.userData = { baseY: 18 };
  group.add(fervedouro);
  if (ctx.waterMeshes) ctx.waterMeshes.push(fervedouro);

  // Buritis
  for (let b = 0; b < 14; b++) {
    const isLeft = (b % 2 === 0);
    const palm = new THREE.Group();
    const ph = 32 + ctx.hash(b * 9) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.4, ph, 1.4);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.palmMat);
    crown.scale.set(12, 8, 12);
    crown.position.y = ph + 5;
    crown.castShadow = false;
    palm.add(crown);

    palm.userData = {
      isLeft,
      normX: 0.16 + (b / 14) * 0.68,
      depthZ: -290 - (b % 3) * 55,
      offsetY: 0,
      seed: b * 17
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
