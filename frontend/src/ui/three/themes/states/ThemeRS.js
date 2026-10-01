import * as THREE from 'three';
import { buildWindTurbine } from '../ThemeLandmarks.js';

export function buildThemeRS(group, theme, ctx) {
  const barn = new THREE.Group();
  const barnBody = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
  barnBody.scale.set(42, 24, 30);
  barnBody.position.y = 12;
  barnBody.castShadow = false;
  barn.add(barnBody);

  const barnRoof = new THREE.Mesh(ctx.geoCone, ctx.araucariaTrunkMat);
  barnRoof.scale.set(46, 16, 34);
  barnRoof.position.y = 31;
  barnRoof.rotation.y = Math.PI * 0.25;
  barnRoof.castShadow = false;
  barn.add(barnRoof);

  barn.position.set(-160, 45, -390);
  group.add(barn);

  // Cata-vento campeiro
  const windpump = buildWindTurbine(ctx, 160, 36, -420, 52, 16);
  group.add(windpump);

  // Araucárias
  for (let a = 0; a < 16; a++) {
    const isLeft = (a % 2 === 0);
    const araucaria = new THREE.Group();
    const ah = 48 + ctx.hash(a * 13) * 35;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.araucariaTrunkMat);
    trunk.scale.set(2.2, ah, 2.2);
    trunk.position.y = ah * 0.5;
    trunk.castShadow = false;
    araucaria.add(trunk);

    const crownDisc = new THREE.Mesh(ctx.geoCyl, ctx.araucariaFoliageMat);
    crownDisc.scale.set(16, 2.5, 16);
    crownDisc.position.y = ah * 0.9;
    crownDisc.castShadow = false;
    araucaria.add(crownDisc);

    araucaria.userData = {
      isLeft,
      normX: 0.16 + (a / 16) * 0.7,
      depthZ: -290 - (a % 3) * 60,
      offsetY: 0,
      seed: a * 15
    };
    group.add(araucaria);
    if (ctx.swayingTrees) ctx.swayingTrees.push(araucaria);
  }
}
