import * as THREE from 'three';
import { buildVitoriaRegia } from '../ThemeLandmarks.js';

export function buildThemeAM(group, theme, ctx) {
  const river = new THREE.Mesh(ctx.geoBox, ctx.amazonWaterMat);
  river.scale.set(520, 2, 360);
  river.position.set(0, 12, -430);
  river.castShadow = false;
  river.userData = { baseY: 12 };
  group.add(river);
  if (ctx.waterMeshes) ctx.waterMeshes.push(river);

  // 24 Árvores Gigantescas da Amazônia com sapopembas
  const numGiants = 24;
  for (let g = 0; g < numGiants; g++) {
    const isLeft = (g % 2 === 0);
    const giant = new THREE.Group();
    const gh = 60 + ctx.hash(g * 19) * 45;

    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(3.8, gh, 3.8);
    trunk.position.y = gh * 0.5;
    trunk.castShadow = false;
    giant.add(trunk);

    for (let s = 0; s < 3; s++) {
      const root = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
      root.scale.set(2.4, 20, 10);
      root.position.set((s - 1) * 3, 10, (ctx.hash(s) - 0.5) * 6);
      root.castShadow = false;
      giant.add(root);
    }

    const crownMat = (g % 2 === 0) ? ctx.amazonForestMatA : ctx.amazonForestMatB;
    const crown = new THREE.Mesh(ctx.geoSphere, crownMat);
    const cRad = 22 + ctx.hash(g * 7) * 14;
    crown.scale.set(cRad * 1.5, cRad * 0.85, cRad * 1.4);
    crown.position.y = gh * 0.88 + cRad * 0.5;
    crown.castShadow = false;
    giant.add(crown);

    giant.userData = {
      isLeft,
      normX: 0.14 + (Math.floor(g / 2) / (numGiants / 2)) * 0.72,
      depthZ: -280 - (g % 4) * 65,
      offsetY: 0,
      seed: g * 17
    };
    group.add(giant);
    if (ctx.swayingTrees) ctx.swayingTrees.push(giant);
  }

  // Palafitas ribeirinhas
  for (let pf = 0; pf < 5; pf++) {
    const palafita = new THREE.Group();
    const hut = new THREE.Mesh(ctx.geoBox, ctx.woodMat);
    hut.scale.set(22, 16, 20);
    hut.position.y = 18;
    hut.castShadow = false;
    palafita.add(hut);

    for (let p = -1; p <= 1; p += 2) {
      for (let q = -1; q <= 1; q += 2) {
        const stilt = new THREE.Mesh(ctx.geoCyl, ctx.araucariaTrunkMat);
        stilt.scale.set(0.8, 24, 0.8);
        stilt.position.set(p * 8, 12, q * 7);
        stilt.castShadow = false;
        palafita.add(stilt);
      }
    }
    palafita.position.set((pf % 2 === 0 ? -1 : 1) * (150 + pf * 35), 18, -360 - pf * 25);
    group.add(palafita);
  }

  const canoe = new THREE.Mesh(ctx.geoBox, ctx.doorMat);
  canoe.scale.set(22, 2.5, 4.5);
  canoe.position.set(-60, 14, -380);
  canoe.castShadow = false;
  group.add(canoe);

  // 6 Vitórias-Régias
  const vitorias = [
    { x: -110, z: -380, r: 11 },
    { x: -50, z: -410, r: 9 },
    { x: 30, z: -370, r: 12 },
    { x: 90, z: -400, r: 10 },
    { x: 160, z: -390, r: 11.5 },
    { x: -160, z: -420, r: 8.5 }
  ];
  vitorias.forEach(v => {
    const lily = buildVitoriaRegia(ctx, v.x, 13, v.z, v.r);
    group.add(lily);
  });

  // Teatro Amazonas
  const teatro = new THREE.Group();
  const tBase = new THREE.Mesh(ctx.geoBox, ctx.colonialPastelMats[1]);
  tBase.scale.set(48, 28, 56);
  tBase.position.y = 14;
  tBase.castShadow = false;
  teatro.add(tBase);

  const tDome = new THREE.Mesh(ctx.geoSphere, ctx.teatroDomeMat);
  tDome.scale.set(16, 20, 16);
  tDome.position.set(0, 38, 0);
  tDome.castShadow = false;
  teatro.add(tDome);

  const tLantern = new THREE.Mesh(ctx.geoCyl, ctx.teatroYellowMat);
  tLantern.scale.set(4, 10, 4);
  tLantern.position.set(0, 52, 0);
  tLantern.castShadow = false;
  teatro.add(tLantern);

  teatro.position.set(180, 45, -460);
  group.add(teatro);
}
