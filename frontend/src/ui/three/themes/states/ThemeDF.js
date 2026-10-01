import * as THREE from 'three';
import { buildCongressoNacional, buildCatedralBrasilia } from '../ThemeLandmarks.js';

export function buildThemeDF(group, theme, ctx) {
  // Congresso Nacional
  const congresso = buildCongressoNacional(ctx, 0, 36, -490);
  group.add(congresso);

  // Catedral Metropolitana de Brasília
  const catedral = buildCatedralBrasilia(ctx, -165, 36, -450);
  group.add(catedral);

  // Lago Paranoá
  const paranoa = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  paranoa.scale.set(500, 2, 280);
  paranoa.position.set(0, 14, -420);
  paranoa.castShadow = false;
  paranoa.userData = { baseY: 14 };
  group.add(paranoa);
  if (ctx.waterMeshes) ctx.waterMeshes.push(paranoa);

  // Ponte JK
  const ponteJK = new THREE.Group();
  for (let a = -1; a <= 1; a++) {
    const arch = new THREE.Mesh(ctx.geoCyl, ctx.modernistWhiteMat);
    arch.scale.set(2.8, 48, 2.8);
    arch.position.set(a * 45, 24, 0);
    arch.rotation.z = (a % 2 === 0 ? 0.35 : -0.35);
    arch.castShadow = false;
    ponteJK.add(arch);
  }
  ponteJK.position.set(160, 14, -420);
  group.add(ponteJK);

  // 18 Ipês Amarelos
  for (let ip = 0; ip < 18; ip++) {
    const isLeft = (ip % 2 === 0);
    const ipe = new THREE.Group();
    const ih = 26 + ctx.hash(ip * 7) * 14;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.cerradoTrunkMat);
    trunk.scale.set(1.8, ih, 1.8);
    trunk.position.y = ih * 0.5;
    trunk.castShadow = false;
    ipe.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.ipeFlowersMat);
    crown.scale.set(14, 11, 14);
    crown.position.y = ih + 6;
    crown.castShadow = false;
    ipe.add(crown);

    ipe.userData = {
      isLeft,
      normX: 0.16 + (ip / 18) * 0.68,
      depthZ: -290 - (ip % 4) * 60,
      offsetY: 0,
      seed: ip * 16
    };
    group.add(ipe);
    if (ctx.swayingTrees) ctx.swayingTrees.push(ipe);
  }
}
