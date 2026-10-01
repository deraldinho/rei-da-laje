import * as THREE from 'three';
import { buildWindTurbine } from '../ThemeLandmarks.js';

export function buildThemeRN(group, theme, ctx) {
  const numDunes = 16;
  for (let d = 0; d < numDunes; d++) {
    const isLeft = (d % 2 === 0);
    const dune = new THREE.Mesh(ctx.geoSphere, ctx.sandDuneMat);
    const dw = 90 + ctx.hash(d * 15) * 60;
    const dh = 35 + ctx.hash(d * 19) * 25;
    const dd = 65 + ctx.hash(d * 21) * 40;
    dune.scale.set(dw, dh, dd);
    dune.castShadow = false;
    dune.userData = {
      isLeft,
      normX: 0.15 + (Math.floor(d / 2) / (numDunes / 2)) * 0.68,
      depthZ: -290 - (d % 4) * 60,
      offsetY: -dh * 0.28
    };
    group.add(dune);
  }

  // Lagoa de Genipabu
  const lake = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
  lake.scale.set(380, 2, 220);
  lake.position.set(0, 16, -420);
  lake.castShadow = false;
  lake.userData = { baseY: 16 };
  group.add(lake);
  if (ctx.waterMeshes) ctx.waterMeshes.push(lake);

  // Aerogeradores
  const turbinesRN = [
    { x: -210, y: 40, z: -470 },
    { x: -110, y: 45, z: -510 },
    { x: 90, y: 42, z: -500 },
    { x: 190, y: 38, z: -460 }
  ];
  turbinesRN.forEach(pos => {
    const wt = buildWindTurbine(ctx, pos.x, pos.y, pos.z, 75, 26);
    group.add(wt);
  });

  // Coqueirais
  for (let k = 0; k < 14; k++) {
    const isLeft = (k % 2 === 0);
    const palm = new THREE.Group();
    const kh = 32 + ctx.hash(k * 9) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.3, kh, 1.3);
    trunk.position.y = kh * 0.5;
    trunk.rotation.z = (isLeft ? -1 : 1) * 0.3;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4, 13, 0.5);
      frond.position.set((isLeft ? -1 : 1) * (kh * 0.15), kh, 0);
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.18 + (k / 14) * 0.68,
      depthZ: -310 - (k % 3) * 55,
      offsetY: 0,
      seed: k * 18
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
