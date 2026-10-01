import * as THREE from 'three';

export function buildThemeSC(group, theme, ctx) {
  const cliff = new THREE.Mesh(ctx.geoCone, ctx.stoneMat);
  cliff.scale.set(150, 170, 110);
  cliff.position.set(220, 95, -480);
  cliff.castShadow = false;
  group.add(cliff);

  // Pinhais de altitude
  for (let p = 0; p < 18; p++) {
    const isLeft = (p % 2 === 0);
    const pine = new THREE.Group();
    const ph = 38 + ctx.hash(p * 11) * 24;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.5, ph, 1.5);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    pine.add(trunk);

    const crown = new THREE.Mesh(ctx.geoCone, ctx.araucariaFoliageMat);
    crown.scale.set(12, ph * 0.65, 12);
    crown.position.y = ph * 0.7;
    crown.castShadow = false;
    pine.add(crown);

    pine.userData = {
      isLeft,
      normX: 0.15 + (p / 18) * 0.7,
      depthZ: -290 - (p % 4) * 55,
      offsetY: 0,
      seed: p * 13
    };
    group.add(pine);
    if (ctx.swayingTrees) ctx.swayingTrees.push(pine);
  }
}
