import * as THREE from 'three';
import { buildPonteEstaiada } from '../ThemeLandmarks.js';

export function buildThemeSP(group, theme, ctx) {
  const numTowers = 26;
  for (let i = 0; i < numTowers; i++) {
    const isLeft = (i % 2 === 0);
    const tower = new THREE.Group();
    const tw = 26 + ctx.hash(i * 17) * 28;
    const th = 85 + ctx.hash(i * 29) * 125;
    const td = 24 + ctx.hash(i * 31) * 26;

    const bodyMat = (i % 3 === 0) ? ctx.skyscraperMatB : ctx.skyscraperMatA;
    const body = new THREE.Mesh(ctx.geoBox, bodyMat);
    body.scale.set(tw, th, td);
    body.position.y = th * 0.5;
    body.castShadow = false;
    tower.add(body);

    const bandH = Math.min(th * 0.78, 120);
    const glass = new THREE.Mesh(ctx.geoBox, ctx.glassWindowMat);
    glass.scale.set(tw + 0.6, bandH, td * 0.75);
    glass.position.y = th * 0.5;
    glass.castShadow = false;
    tower.add(glass);

    if (i % 5 === 0) {
      const helipad = new THREE.Mesh(ctx.geoCyl, ctx.modernistWhiteMat);
      helipad.scale.set(tw * 0.42, 0.8, tw * 0.42);
      helipad.position.set(0, th + 0.4, 0);
      helipad.castShadow = false;
      tower.add(helipad);
    }

    if (i % 4 === 1 || i % 4 === 3) {
      const antH = 26 + ctx.hash(i * 43) * 24;
      const ant = new THREE.Mesh(ctx.geoCyl, ctx.rebarMat);
      ant.scale.set(0.7, antH, 0.7);
      ant.position.set(0, th + antH * 0.5, 0);
      ant.castShadow = false;
      tower.add(ant);

      const beacon = new THREE.Mesh(ctx.geoSphere, ctx.redBeaconMat);
      beacon.scale.set(1.9, 1.9, 1.9);
      beacon.position.set(0, th + antH + 1, 0);
      beacon.castShadow = false;
      beacon.userData = { baseScale: 1.9 };
      tower.add(beacon);
      if (ctx.pulsingBeacons) ctx.pulsingBeacons.push(beacon);
    }

    if (i % 5 === 2) {
      const boardMat = (i % 2 === 0) ? ctx.neonBillboardMatA : ctx.neonBillboardMatB;
      const board = new THREE.Mesh(ctx.geoBox, boardMat);
      board.scale.set(tw * 0.8, 10, 2);
      board.position.set(0, th + 6, td * 0.35);
      board.castShadow = false;
      tower.add(board);
    }

    const normX = 0.16 + (Math.floor(i / 2) / (numTowers / 2)) * 0.66 + (ctx.hash(i * 11) - 0.5) * 0.08;
    const z = -280 - (i % 4) * 60;
    tower.userData = {
      isLeft,
      normX: Math.max(0.12, Math.min(0.85, normX)),
      depthZ: z,
      jitterX: (ctx.hash(i * 7) - 0.5) * 12,
      offsetY: -35
    };
    group.add(tower);
  }

  const ponteEstaiada = buildPonteEstaiada(ctx, 0, 16, -340);
  group.add(ponteEstaiada);
}
