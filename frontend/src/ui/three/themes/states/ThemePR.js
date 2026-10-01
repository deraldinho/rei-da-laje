import * as THREE from 'three';
import { buildJardimBotanicoCuritiba } from '../ThemeLandmarks.js';

export function buildThemePR(group, theme, ctx) {
  const numAraucarias = 28;
  for (let a = 0; a < numAraucarias; a++) {
    const isLeft = (a % 2 === 0);
    const araucaria = new THREE.Group();
    const ah = 55 + ctx.hash(a * 19) * 45;

    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.araucariaTrunkMat);
    trunk.scale.set(2.4, ah, 2.4);
    trunk.position.y = ah * 0.5;
    trunk.castShadow = false;
    araucaria.add(trunk);

    for (let tier = 0; tier < 3; tier++) {
      const tierY = ah * (0.82 + tier * 0.09);
      const crownDisc = new THREE.Mesh(ctx.geoCyl, ctx.araucariaFoliageMat);
      const r = (18 - tier * 4.0) * (0.8 + ctx.hash(a * 3 + tier) * 0.4);
      crownDisc.scale.set(r, 2.4, r);
      crownDisc.position.y = tierY;
      crownDisc.castShadow = false;
      araucaria.add(crownDisc);
    }

    araucaria.userData = {
      isLeft,
      normX: 0.14 + (Math.floor(a / 2) / (numAraucarias / 2)) * 0.72,
      depthZ: -280 - (a % 4) * 65,
      offsetY: 0,
      seed: a * 17
    };
    group.add(araucaria);
    if (ctx.swayingTrees) ctx.swayingTrees.push(araucaria);
  }

  // Estufa de Curitiba
  const jb = buildJardimBotanicoCuritiba(ctx, 0, 36, -450);
  group.add(jb);

  // Cataratas do Iguaçu
  const falls = new THREE.Group();
  const rockShelf = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
  rockShelf.scale.set(140, 26, 50);
  rockShelf.position.set(190, 22, -430);
  rockShelf.castShadow = false;
  falls.add(rockShelf);

  const waterFoam = new THREE.Mesh(ctx.geoBox, ctx.waterfallFoamMat);
  waterFoam.scale.set(130, 20, 10);
  waterFoam.position.set(190, 24, -402);
  waterFoam.castShadow = false;
  falls.add(waterFoam);
  group.add(falls);

  // Cercas de pinho
  for (let f = 0; f < 18; f++) {
    const isLeft = (f % 2 === 0);
    const post = new THREE.Mesh(ctx.geoBox, ctx.araucariaTrunkMat);
    post.scale.set(1.4, 14, 1.4);
    post.castShadow = false;
    post.userData = {
      isLeft,
      normX: 0.22 + (f / 18) * 0.62,
      depthZ: -290 - (f % 4) * 45,
      offsetY: 7
    };
    group.add(post);
  }
}
