import * as THREE from 'three';

export function buildThemeMA(group, theme, ctx) {
  const numDunes = 16;
  for (let d = 0; d < numDunes; d++) {
    const isLeft = (d % 2 === 0);
    const dune = new THREE.Mesh(ctx.geoSphere, ctx.modernistWhiteMat);
    const dw = 100 + ctx.hash(d * 11) * 70;
    const dh = 30 + ctx.hash(d * 13) * 25;
    const dd = 70 + ctx.hash(d * 17) * 50;
    dune.scale.set(dw, dh, dd);
    dune.castShadow = false;
    dune.userData = {
      isLeft,
      normX: 0.14 + (Math.floor(d / 2) / (numDunes / 2)) * 0.70,
      depthZ: -290 - (d % 4) * 65,
      offsetY: -dh * 0.32
    };
    group.add(dune);
  }

  // 6 Lagoas dos Lençóis
  for (let w = 0; w < 6; w++) {
    const lagoon = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
    lagoon.scale.set(95 + w * 25, 2, 60 + w * 18);
    lagoon.position.set((w - 2.5) * 85, 14, -390 - w * 30);
    lagoon.castShadow = false;
    lagoon.userData = { baseY: 14 };
    group.add(lagoon);
    if (ctx.waterMeshes) ctx.waterMeshes.push(lagoon);
  }

  // Coqueiros
  for (let k = 0; k < 12; k++) {
    const isLeft = (k % 2 === 0);
    const palm = new THREE.Group();
    const kh = 30 + ctx.hash(k * 7) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.2, kh, 1.2);
    trunk.position.y = kh * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4, 12, 0.5);
      frond.position.set(0, kh, 0);
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.16 + (k / 12) * 0.7,
      depthZ: -320 - (k % 3) * 50,
      offsetY: 0,
      seed: k * 14
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
