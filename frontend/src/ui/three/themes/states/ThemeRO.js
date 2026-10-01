import * as THREE from 'three';

export function buildThemeRO(group, theme, ctx) {
  const river = new THREE.Mesh(ctx.geoBox, ctx.amazonWaterMat);
  river.scale.set(500, 2, 280);
  river.position.set(0, 12, -420);
  river.castShadow = false;
  river.userData = { baseY: 12 };
  group.add(river);
  if (ctx.waterMeshes) ctx.waterMeshes.push(river);

  // Forte Príncipe da Beira
  const fort = new THREE.Group();
  const bastion = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
  bastion.scale.set(45, 26, 45);
  bastion.position.y = 13;
  bastion.castShadow = false;
  fort.add(bastion);

  fort.position.set(160, 25, -420);
  group.add(fort);

  for (let t = 0; t < 18; t++) {
    const isLeft = (t % 2 === 0);
    const tree = new THREE.Group();
    const th = 42 + ctx.hash(t * 11) * 26;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(2.4, th, 2.4);
    trunk.position.y = th * 0.5;
    trunk.castShadow = false;
    tree.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.amazonForestMatA);
    crown.scale.set(18, 14, 18);
    crown.position.y = th * 0.88 + 7;
    crown.castShadow = false;
    tree.add(crown);

    tree.userData = {
      isLeft,
      normX: 0.16 + (t / 18) * 0.68,
      depthZ: -290 - (t % 3) * 55,
      offsetY: 0,
      seed: t * 14
    };
    group.add(tree);
    if (ctx.swayingTrees) ctx.swayingTrees.push(tree);
  }
}
