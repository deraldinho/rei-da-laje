import * as THREE from 'three';
import { buildElevadorLacerda, buildFarolWithRotatingBeam } from '../ThemeLandmarks.js';

export function buildThemeBA(group, theme, ctx) {
  const numColonial = 22;
  for (let i = 0; i < numColonial; i++) {
    const isLeft = (i % 2 === 0);
    const house = new THREE.Group();
    const hw = 22 + ctx.hash(i * 11) * 12;
    const hh = 24 + ctx.hash(i * 13) * 16;
    const hd = 20 + ctx.hash(i * 17) * 10;

    const mat = ctx.colonialPastelMats[i % ctx.colonialPastelMats.length];
    const body = new THREE.Mesh(ctx.geoBox, mat);
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

    const trim = new THREE.Mesh(ctx.geoBox, ctx.colonialPastelMats[4]);
    trim.scale.set(hw + 0.4, 2, hd + 0.4);
    trim.position.y = hh * 0.65;
    trim.castShadow = false;
    house.add(trim);

    const normX = 0.16 + (Math.floor(i / 2) / (numColonial / 2)) * 0.66;
    const z = -280 - (i % 4) * 65;
    house.userData = {
      isLeft,
      normX,
      depthZ: z,
      jitterX: (ctx.hash(i * 7) - 0.5) * 8,
      offsetY: 0
    };
    group.add(house);
  }

  // 16 Palmeiras Imperiais Altas
  for (let p = 0; p < 16; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 48 + ctx.hash(p * 7) * 22;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.4, ph, 1.4);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4.5, 16, 0.6);
      frond.position.set(0, ph, 0);
      frond.rotation.z = 1.05;
      frond.rotation.y = (f / 6) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }

    palm.userData = {
      isLeft,
      normX: 0.14 + (p / 16) * 0.72,
      depthZ: -290 - (p % 4) * 55,
      offsetY: 0,
      seed: p * 13
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }

  // Elevador Lacerda
  const elevador = buildElevadorLacerda(ctx, 155, 20, -440);
  group.add(elevador);

  // Farol da Barra
  const farol = buildFarolWithRotatingBeam(ctx, 210, 52, -430, 48);
  group.add(farol);

  // Baía de Todos os Santos
  const bay = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  bay.scale.set(480, 2, 280);
  bay.position.set(0, 10, -430);
  bay.castShadow = false;
  bay.userData = { baseY: 10 };
  group.add(bay);
  if (ctx.waterMeshes) ctx.waterMeshes.push(bay);
}
