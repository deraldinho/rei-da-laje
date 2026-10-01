import * as THREE from 'three';

export function buildThemeRR(group, theme, ctx) {
  const roraimaTepui = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
  roraimaTepui.scale.set(440, 190, 190);
  roraimaTepui.position.set(0, 105, -570);
  roraimaTepui.castShadow = false;
  group.add(roraimaTepui);

  for (let t = 0; t < 18; t++) {
    const isLeft = (t % 2 === 0);
    const tree = new THREE.Group();
    const th = 26 + ctx.hash(t * 13) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.cerradoTrunkMat);
    trunk.scale.set(1.8, th, 1.8);
    trunk.position.y = th * 0.5;
    trunk.castShadow = false;
    tree.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.cerradoFoliageMat);
    crown.scale.set(12, 8, 12);
    crown.position.y = th + 4;
    crown.castShadow = false;
    tree.add(crown);

    tree.userData = {
      isLeft,
      normX: 0.16 + (t / 18) * 0.68,
      depthZ: -290 - (t % 4) * 60,
      offsetY: 0,
      seed: t * 15
    };
    group.add(tree);
    if (ctx.swayingTrees) ctx.swayingTrees.push(tree);
  }
}
