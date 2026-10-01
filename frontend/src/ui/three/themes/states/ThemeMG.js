import * as THREE from 'three';

export function buildThemeMG(group, theme, ctx) {
  const numColonial = 24;
  for (let i = 0; i < numColonial; i++) {
    const isLeft = (i % 2 === 0);
    const house = new THREE.Group();
    const hw = 22 + ctx.hash(i * 13) * 14;
    const hh = 20 + ctx.hash(i * 17) * 16;
    const hd = 18 + ctx.hash(i * 19) * 12;

    const bodyMat = (i % 4 === 0) ? ctx.colonialPastelMats[1] : (i % 4 === 1) ? ctx.colonialPastelMats[0] : ctx.colonialPastelMats[4];
    const body = new THREE.Mesh(ctx.geoBox, bodyMat);
    body.scale.set(hw, hh, hd);
    body.position.y = hh * 0.5;
    body.castShadow = false;
    house.add(body);

    const roof = new THREE.Mesh(ctx.geoCone, ctx.roofTileMat);
    roof.scale.set(hw * 1.25, 10, hd * 1.25);
    roof.position.y = hh + 5;
    roof.rotation.y = Math.PI * 0.25;
    roof.castShadow = false;
    house.add(roof);

    const door = new THREE.Mesh(ctx.geoBox, ctx.doorMat);
    door.scale.set(4, 9, 0.8);
    door.position.set(0, 4.5, hd * 0.5 + 0.4);
    door.castShadow = false;
    house.add(door);

    const normX = 0.15 + (Math.floor(i / 2) / (numColonial / 2)) * 0.68;
    const z = -290 - (i % 4) * 60;
    house.userData = {
      isLeft,
      normX,
      depthZ: z,
      jitterX: (ctx.hash(i * 5) - 0.5) * 10,
      offsetY: 0
    };
    group.add(house);
  }

  // Igreja Barroca de São Francisco de Assis de Ouro Preto
  const church = new THREE.Group();
  const nave = new THREE.Mesh(ctx.geoBox, ctx.colonialPastelMats[4]);
  nave.scale.set(38, 42, 55);
  nave.position.y = 21;
  nave.castShadow = false;
  church.add(nave);

  const fronton = new THREE.Mesh(ctx.geoCone, ctx.colonialPastelMats[4]);
  fronton.scale.set(34, 18, 10);
  fronton.position.set(0, 51, 24);
  fronton.castShadow = false;
  church.add(fronton);

  const cross = new THREE.Mesh(ctx.geoBox, ctx.goldChurchMat);
  cross.scale.set(2.5, 11, 1.2);
  cross.position.set(0, 64, 24);
  cross.castShadow = false;
  church.add(cross);

  for (let side = -1; side <= 1; side += 2) {
    const tower = new THREE.Mesh(ctx.geoCyl, ctx.colonialPastelMats[4]);
    tower.scale.set(8, 70, 8);
    tower.position.set(side * 22, 35, 24);
    tower.castShadow = false;
    church.add(tower);

    const dome = new THREE.Mesh(ctx.geoSphere, ctx.rebarMat);
    dome.scale.set(8.5, 10, 8.5);
    dome.position.set(side * 22, 75, 24);
    dome.castShadow = false;
    church.add(dome);
  }

  church.position.set(190, 85, -440);
  group.add(church);

  // 14 Quaresmeiras e Ipês floridos em Minas
  for (let f = 0; f < 14; f++) {
    const isLeft = (f % 2 === 0);
    const flowerTree = new THREE.Group();
    const trH = 22 + ctx.hash(f * 7) * 12;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.6, trH, 1.6);
    trunk.position.y = trH * 0.5;
    trunk.castShadow = false;
    flowerTree.add(trunk);

    const flowerMat = (f % 2 === 0) ? ctx.ipePinkMat : ctx.ipeFlowersMat;
    const crown = new THREE.Mesh(ctx.geoSphere, flowerMat);
    crown.scale.set(12, 10, 12);
    crown.position.y = trH + 7;
    crown.castShadow = false;
    flowerTree.add(crown);

    flowerTree.userData = {
      isLeft,
      normX: 0.2 + (f / 14) * 0.6,
      depthZ: -310 - (f % 3) * 60,
      offsetY: 0,
      seed: f * 19
    };
    group.add(flowerTree);
    if (ctx.swayingTrees) ctx.swayingTrees.push(flowerTree);
  }
}
