import * as THREE from 'three';

export function buildThemeAL(group, theme, ctx) {
  // Mar azul-turquesa de Maragogi
  const pool = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
  pool.scale.set(500, 2, 280);
  pool.position.set(0, 12, -410);
  pool.castShadow = false;
  pool.userData = { baseY: 12 };
  group.add(pool);
  if (ctx.waterMeshes) ctx.waterMeshes.push(pool);

  // Falésias do Gunga
  for (let s = -1; s <= 1; s += 2) {
    const cliff = new THREE.Mesh(ctx.geoBox, ctx.redSandstoneMat);
    cliff.scale.set(90, 80, 160);
    cliff.position.set(s * 180, 40, -450);
    cliff.castShadow = false;
    group.add(cliff);
  }

  // Coqueirais praianos
  for (let p = 0; p < 14; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 35 + ctx.hash(p * 9) * 18;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.3, ph, 1.3);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4, 14, 0.5);
      frond.position.set(0, ph, 0);
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.16 + (p / 14) * 0.68,
      depthZ: -290 - (p % 3) * 55,
      offsetY: 0,
      seed: p * 16
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
