import * as THREE from 'three';

export function buildThemeGO(group, theme, ctx) {
  // Cânions de quartzo
  for (let s = -1; s <= 1; s += 2) {
    const cliff = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
    cliff.scale.set(95, 110, 150);
    cliff.position.set(s * 190, 55, -460);
    cliff.castShadow = false;
    group.add(cliff);
  }

  const pool = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
  pool.scale.set(180, 2, 160);
  pool.position.set(0, 14, -400);
  pool.castShadow = false;
  pool.userData = { baseY: 14 };
  group.add(pool);
  if (ctx.waterMeshes) ctx.waterMeshes.push(pool);

  // Árvores retorcidas do Cerrado
  const numCerrado = 20;
  for (let t = 0; t < numCerrado; t++) {
    const isLeft = (t % 2 === 0);
    const cTree = new THREE.Group();
    const th = 24 + ctx.hash(t * 13) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.cerradoTrunkMat);
    trunk.scale.set(2.2, th, 2.2);
    trunk.position.y = th * 0.5;
    trunk.rotation.z = (ctx.hash(t * 7) - 0.5) * 0.52;
    trunk.castShadow = false;
    cTree.add(trunk);

    const branch = new THREE.Mesh(ctx.geoSphere, ctx.cerradoFoliageMat);
    branch.scale.set(12, 7, 12);
    branch.position.set(0, th + 4, 0);
    branch.castShadow = false;
    cTree.add(branch);

    cTree.userData = {
      isLeft,
      normX: 0.16 + (t / numCerrado) * 0.68,
      depthZ: -290 - (t % 4) * 60,
      offsetY: 0,
      seed: t * 14
    };
    group.add(cTree);
    if (ctx.swayingTrees) ctx.swayingTrees.push(cTree);
  }
}
