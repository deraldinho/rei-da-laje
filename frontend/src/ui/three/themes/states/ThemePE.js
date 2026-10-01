import * as THREE from 'three';

export function buildThemePE(group, theme, ctx) {
  const numColonial = 20;
  for (let i = 0; i < numColonial; i++) {
    const isLeft = (i % 2 === 0);
    const house = new THREE.Group();
    const hw = 20 + ctx.hash(i * 11) * 14;
    const hh = 22 + ctx.hash(i * 13) * 14;
    const hd = 18 + ctx.hash(i * 17) * 12;

    const body = new THREE.Mesh(ctx.geoBox, ctx.colonialPastelMats[i % ctx.colonialPastelMats.length]);
    body.scale.set(hw, hh, hd);
    body.position.y = hh * 0.5;
    body.castShadow = false;
    house.add(body);

    const roof = new THREE.Mesh(ctx.geoCone, ctx.roofTileMat);
    roof.scale.set(hw * 1.2, 9, hd * 1.2);
    roof.position.y = hh + 4.5;
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = false;
    house.add(roof);

    house.userData = {
      isLeft,
      normX: 0.18 + (Math.floor(i / 2) / (numColonial / 2)) * 0.65,
      depthZ: -280 - (i % 4) * 60,
      offsetY: 0
    };
    group.add(house);
  }

  // Mar e barreira de recifes de coral
  const reefWater = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  reefWater.scale.set(500, 2, 260);
  reefWater.position.set(0, 10, -420);
  reefWater.castShadow = false;
  reefWater.userData = { baseY: 10 };
  group.add(reefWater);
  if (ctx.waterMeshes) ctx.waterMeshes.push(reefWater);

  for (let r = 0; r < 5; r++) {
    const coral = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
    coral.scale.set(70, 4, 18);
    coral.position.set((r - 2) * 95, 12, -430 - (r % 2) * 30);
    coral.castShadow = false;
    group.add(coral);
  }

  // Coqueirais litorâneos
  for (let p = 0; p < 14; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 38 + ctx.hash(p * 9) * 18;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.4, ph, 1.4);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4, 14, 0.5);
      frond.position.set(0, ph, 0);
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.15 + (p / 14) * 0.7,
      depthZ: -300 - (p % 3) * 60,
      offsetY: 0,
      seed: p * 15
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
