import * as THREE from 'three';

export function buildThemeES(group, theme, ctx) {
  const cliff = new THREE.Mesh(ctx.geoCone, ctx.rockMat);
  cliff.scale.set(140, 165, 115);
  cliff.position.set(-220, 95, -460);
  cliff.castShadow = false;
  group.add(cliff);

  const convent = new THREE.Mesh(ctx.geoBox, ctx.colonialPastelMats[4]);
  convent.scale.set(30, 24, 26);
  convent.position.set(-220, 185, -460);
  convent.castShadow = false;
  group.add(convent);

  const conventRoof = new THREE.Mesh(ctx.geoCone, ctx.roofTileMat);
  conventRoof.scale.set(32, 10, 28);
  conventRoof.position.set(-220, 202, -460);
  conventRoof.castShadow = false;
  group.add(conventRoof);

  // Mar da Baía de Vitória
  const sea = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  sea.scale.set(480, 2, 280);
  sea.position.set(0, 10, -440);
  sea.castShadow = false;
  sea.userData = { baseY: 10 };
  group.add(sea);
  if (ctx.waterMeshes) ctx.waterMeshes.push(sea);

  for (let t = 0; t < 16; t++) {
    const isLeft = (t % 2 === 0);
    const tree = new THREE.Group();
    const th = 26 + ctx.hash(t * 7) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.5, th, 1.5);
    trunk.position.y = th * 0.5;
    trunk.castShadow = false;
    tree.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.amazonForestMatA);
    crown.scale.set(12, 10, 12);
    crown.position.y = th + 5;
    crown.castShadow = false;
    tree.add(crown);

    tree.userData = {
      isLeft,
      normX: 0.16 + (t / 16) * 0.68,
      depthZ: -290 - (t % 3) * 55,
      offsetY: 0,
      seed: t * 14
    };
    group.add(tree);
    if (ctx.swayingTrees) ctx.swayingTrees.push(tree);
  }
}
