import * as THREE from 'three';
import { buildCristoRedentor } from '../ThemeLandmarks.js';

export function buildThemeRJ(group, theme, ctx) {
  // 0. Base de terreno contínuo do vale carioca ligando o fundo da laje à orla (evita vão vazio e prédios flutuantes)
  const valleyFloor = new THREE.Mesh(ctx.geoBox, ctx.rioSlopeJungleMat);
  valleyFloor.scale.set(900, 40, 540);
  valleyFloor.position.set(0, -16, -250);
  valleyFloor.castShadow = false;
  group.add(valleyFloor);

  // Colinas suaves com vegetação tropical no plano médio
  [-170, 0, 170].forEach((hx, idx) => {
    const hill = new THREE.Mesh(ctx.geoSphere, ctx.rioSlopeJungleMat);
    hill.scale.set(120, 28, 90);
    hill.position.set(hx + (idx - 1) * 20, -5, -210);
    hill.castShadow = false;
    group.add(hill);
  });

  // 1. Água da Baía de Guanabara
  const bay = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  bay.scale.set(620, 2, 340);
  bay.position.set(0, 4, -460);
  bay.castShadow = false;
  bay.userData = { baseY: 4 };
  group.add(bay);
  if (ctx.waterMeshes) ctx.waterMeshes.push(bay);

  // 2. Curva da Orla & Praia de Areia Dourada
  const beachArcCount = 14;
  for (let b = 0; b < beachArcCount; b++) {
    const u = b / (beachArcCount - 1);
    const arcX = -260 + u * 520;
    const arcZ = -380 - Math.sin(u * Math.PI) * 55;

    const sand = new THREE.Mesh(ctx.geoBox, ctx.rioSandMat);
    sand.scale.set(44, 4.5, 28);
    sand.position.set(arcX, 5, arcZ);
    sand.rotation.y = (u - 0.5) * -0.65;
    sand.castShadow = false;
    group.add(sand);

    const surf = new THREE.Mesh(ctx.geoBox, ctx.rioSurfMat);
    surf.scale.set(42, 1.2, 5.5);
    surf.position.set(arcX, 5.6, arcZ - 13);
    surf.rotation.y = (u - 0.5) * -0.65;
    surf.castShadow = false;
    group.add(surf);
  }

  // 3. Faixa Urbana Costeira da Zona Sul
  const numCityBlocks = 18;
  for (let i = 0; i < numCityBlocks; i++) {
    const u = (i + 0.5) / numCityBlocks;
    const bX = -230 + u * 460 + (ctx.hash(i * 13) - 0.5) * 16;
    const bZ = -345 - Math.sin(u * Math.PI) * 40 + (ctx.hash(i * 17) - 0.5) * 18;
    const bH = 28 + ctx.hash(i * 23) * 36;
    const bW = 18 + ctx.hash(i * 29) * 12;
    const bD = 16 + ctx.hash(i * 31) * 10;

    const bMesh = new THREE.Mesh(ctx.geoBox, (i % 2 === 0) ? ctx.rioCityMatA : ctx.rioCityMatB);
    bMesh.scale.set(bW, bH, bD);
    bMesh.position.set(bX, 6 + bH * 0.5, bZ);
    bMesh.castShadow = false;
    group.add(bMesh);

    const glass = new THREE.Mesh(ctx.geoBox, ctx.glassWindowMat);
    glass.scale.set(bW + 0.3, bH * 0.65, bD * 0.8);
    glass.position.set(bX, 6 + bH * 0.5, bZ);
    glass.castShadow = false;
    group.add(glass);

    if (i % 2 === 0) {
      const palm = new THREE.Group();
      const pTrunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
      pTrunk.scale.set(0.9, 22, 0.9);
      pTrunk.position.y = 11;
      pTrunk.castShadow = false;
      palm.add(pTrunk);

      for (let f = 0; f < 5; f++) {
        const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
        frond.scale.set(3, 11, 0.5);
        frond.position.set(0, 22, 0);
        frond.rotation.z = 1.1;
        frond.rotation.y = (f / 5) * Math.PI * 2;
        frond.castShadow = false;
        palm.add(frond);
      }
      palm.position.set(bX + (ctx.hash(i * 7) - 0.5) * 14, 5.5, bZ + 16);
      palm.userData = {
        isLeft: bX < 0,
        seed: i * 27
      };
      group.add(palm);
      if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
    }
  }

  // 4. O Pão de Açúcar e Morro da Urca à Direita
  const paoDeAcucarGroup = new THREE.Group();
  const urca = new THREE.Mesh(ctx.geoSphere, ctx.rioGraniteMat);
  urca.scale.set(65, 80, 60);
  urca.position.set(215, 38, -500);
  urca.castShadow = false;
  paoDeAcucarGroup.add(urca);

  const urcaJungle = new THREE.Mesh(ctx.geoSphere, ctx.rioSlopeJungleMat);
  urcaJungle.scale.set(70, 48, 65);
  urcaJungle.position.set(215, 20, -495);
  urcaJungle.castShadow = false;
  paoDeAcucarGroup.add(urcaJungle);

  const pao = new THREE.Mesh(ctx.geoSphere, ctx.rioGraniteMat);
  pao.scale.set(60, 140, 58);
  pao.position.set(275, 75, -535);
  pao.castShadow = false;
  paoDeAcucarGroup.add(pao);

  const paoJungle = new THREE.Mesh(ctx.geoSphere, ctx.rioSlopeJungleMat);
  paoJungle.scale.set(64, 65, 62);
  paoJungle.position.set(275, 32, -530);
  paoJungle.castShadow = false;
  paoDeAcucarGroup.add(paoJungle);

  const cable1 = new THREE.Mesh(ctx.geoBox, ctx.rebarMat);
  cable1.scale.set(0.8, 1, 95);
  cable1.position.set(245, 102, -518);
  cable1.rotation.x = -0.36;
  cable1.castShadow = false;
  paoDeAcucarGroup.add(cable1);

  const bonde = new THREE.Mesh(ctx.geoBox, ctx.rioCanMat);
  bonde.scale.set(6.5, 4.5, 9.5);
  bonde.position.set(245, 100, -518);
  bonde.castShadow = false;
  paoDeAcucarGroup.add(bonde);

  group.add(paoDeAcucarGroup);

  // 5. Morro Dois Irmãos à Esquerda
  const doisIrmaosGroup = new THREE.Group();
  const imBase = new THREE.Mesh(ctx.geoSphere, ctx.rioSlopeJungleMat);
  imBase.scale.set(90, 75, 80);
  imBase.position.set(-250, 32, -525);
  imBase.castShadow = false;
  doisIrmaosGroup.add(imBase);

  const im1Peak = new THREE.Mesh(ctx.geoCone, ctx.rioGraniteMat);
  im1Peak.scale.set(55, 115, 52);
  im1Peak.position.set(-225, 78, -530);
  im1Peak.castShadow = false;
  doisIrmaosGroup.add(im1Peak);

  const im2Peak = new THREE.Mesh(ctx.geoCone, ctx.rioGraniteMat);
  im2Peak.scale.set(48, 92, 46);
  im2Peak.position.set(-275, 68, -555);
  im2Peak.castShadow = false;
  doisIrmaosGroup.add(im2Peak);

  group.add(doisIrmaosGroup);

  // 6. Corcovado com Ombro Montanhoso Natural & Cristo Redentor
  const corcovadoGroup = new THREE.Group();
  const corcBase = new THREE.Mesh(ctx.geoSphere, ctx.rioSlopeJungleMat);
  corcBase.scale.set(130, 88, 92);
  corcBase.position.set(0, 48, -640);
  corcBase.castShadow = false;
  corcovadoGroup.add(corcBase);

  const corcCliff = new THREE.Mesh(ctx.geoSphere, ctx.rioGraniteMat);
  corcCliff.scale.set(54, 88, 48);
  corcCliff.position.set(0, 96, -635);
  corcCliff.castShadow = false;
  corcovadoGroup.add(corcCliff);

  const belvedere = new THREE.Mesh(ctx.geoCyl, ctx.stoneMat);
  belvedere.scale.set(24, 4.5, 24);
  belvedere.position.set(0, 140, -632);
  belvedere.castShadow = false;
  corcovadoGroup.add(belvedere);

  const cristo = buildCristoRedentor(ctx, 0, 142, -630);
  corcovadoGroup.add(cristo);

  group.add(corcovadoGroup);

  // 7. Embarcações na Baía
  const sailboat = new THREE.Group();
  const hull = new THREE.Mesh(ctx.geoBox, ctx.boatMatB);
  hull.scale.set(20, 4.0, 7.5);
  hull.castShadow = false;
  sailboat.add(hull);

  const mast = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
  mast.scale.set(0.6, 24, 0.6);
  mast.position.set(0, 12, 0);
  mast.castShadow = false;
  sailboat.add(mast);

  const sail = new THREE.Mesh(ctx.geoCone, ctx.jangadaSailMat);
  sail.scale.set(10, 22, 0.3);
  sail.position.set(4.2, 12, 0);
  sail.rotation.z = -0.32;
  sail.castShadow = false;
  sailboat.add(sail);

  sailboat.position.set(-65, 8, -440);
  sailboat.rotation.y = 0.25;
  group.add(sailboat);

  const schooner = new THREE.Group();
  const sHull = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
  sHull.scale.set(24, 4.5, 8.5);
  sHull.castShadow = false;
  schooner.add(sHull);

  const sCabin = new THREE.Mesh(ctx.geoBox, ctx.boatMatA);
  sCabin.scale.set(14, 3.5, 7.0);
  sCabin.position.set(-2, 4, 0);
  sCabin.castShadow = false;
  schooner.add(sCabin);

  schooner.position.set(85, 7.5, -455);
  schooner.rotation.y = -0.35;
  group.add(schooner);
}
