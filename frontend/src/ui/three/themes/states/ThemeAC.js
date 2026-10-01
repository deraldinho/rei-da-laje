import * as THREE from 'three';

export function buildThemeAC(group, theme, ctx) {
  for (let g = 0; g < 20; g++) {
    const isLeft = (g % 2 === 0);
    const giant = new THREE.Group();
    const gh = 52 + ctx.hash(g * 17) * 38;

    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(3.2, gh, 3.2);
    trunk.position.y = gh * 0.5;
    trunk.castShadow = false;
    giant.add(trunk);

    const crownMat = (g % 2 === 0) ? ctx.amazonForestMatA : ctx.amazonForestMatB;
    const crown = new THREE.Mesh(ctx.geoSphere, crownMat);
    crown.scale.set(24, 18, 22);
    crown.position.y = gh * 0.88 + 9;
    crown.castShadow = false;
    giant.add(crown);

    giant.userData = {
      isLeft,
      normX: 0.15 + (g / 20) * 0.7,
      depthZ: -280 - (g % 4) * 60,
      offsetY: 0,
      seed: g * 13
    };
    group.add(giant);
    if (ctx.swayingTrees) ctx.swayingTrees.push(giant);
  }

  // Ponte pênsil rústica
  const bridge = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
  bridge.scale.set(80, 3, 14);
  bridge.position.set(0, 22, -380);
  bridge.castShadow = false;
  group.add(bridge);
}
