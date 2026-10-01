import * as THREE from 'three';
import { buildWindTurbine } from '../ThemeLandmarks.js';

export function buildThemeCE(group, theme, ctx) {
  const numDunes = 14;
  for (let d = 0; d < numDunes; d++) {
    const isLeft = (d % 2 === 0);
    const dune = new THREE.Mesh(ctx.geoSphere, ctx.sandDuneMat);
    const dw = 85 + ctx.hash(d * 13) * 65;
    const dh = 32 + ctx.hash(d * 17) * 26;
    const dd = 60 + ctx.hash(d * 19) * 45;
    dune.scale.set(dw, dh, dd);
    dune.castShadow = false;
    dune.userData = {
      isLeft,
      normX: 0.15 + (Math.floor(d / 2) / (numDunes / 2)) * 0.68,
      depthZ: -290 - (d % 4) * 65,
      offsetY: -dh * 0.3
    };
    group.add(dune);
  }

  // Lagoas interdunares de Jericoacoara
  for (let w = 0; w < 4; w++) {
    const lagoon = new THREE.Mesh(ctx.geoBox, ctx.lagoonWaterMat);
    lagoon.scale.set(110 + w * 20, 2, 75 + w * 15);
    lagoon.position.set((w - 1.5) * 120, 16, -410 - w * 35);
    lagoon.castShadow = false;
    lagoon.userData = { baseY: 16 };
    group.add(lagoon);
    if (ctx.waterMeshes) ctx.waterMeshes.push(lagoon);
  }

  // Coqueiros inclinados
  for (let k = 0; k < 14; k++) {
    const isLeft = (k % 2 === 0);
    const palm = new THREE.Group();
    const kh = 34 + ctx.hash(k * 7) * 18;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.4, kh, 1.4);
    trunk.position.y = kh * 0.5;
    trunk.rotation.z = (isLeft ? -1 : 1) * 0.35;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4.5, 13, 0.6);
      frond.position.set((isLeft ? -1 : 1) * (kh * 0.18), kh, 0);
      frond.rotation.z = 1.15;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.18 + (k / 14) * 0.68,
      depthZ: -300 - (k % 4) * 50,
      offsetY: 0,
      seed: k * 21
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }

  // Jangada cearense
  const jangada = new THREE.Group();
  const raft = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
  raft.scale.set(24, 2.5, 12);
  raft.castShadow = false;
  jangada.add(raft);

  const mast = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
  mast.scale.set(0.6, 26, 0.6);
  mast.position.set(-2, 13, 0);
  mast.castShadow = false;
  jangada.add(mast);

  const sail = new THREE.Mesh(ctx.geoCone, ctx.jangadaSailMat);
  sail.scale.set(14, 24, 0.4);
  sail.position.set(4, 13, 0);
  sail.rotation.z = -0.45;
  sail.castShadow = false;
  jangada.add(sail);

  jangada.position.set(0, 18, -370);
  group.add(jangada);

  // Aerogeradores
  const turbinesCE = [
    { x: -190, y: 35, z: -460 },
    { x: -90, y: 40, z: -490 },
    { x: 100, y: 42, z: -480 },
    { x: 200, y: 38, z: -450 }
  ];
  turbinesCE.forEach(pos => {
    const wt = buildWindTurbine(ctx, pos.x, pos.y, pos.z, 75, 26);
    group.add(wt);
  });
}
