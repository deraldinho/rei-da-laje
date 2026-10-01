import * as THREE from 'three';

export function buildThemePB(group, theme, ctx) {
  const farol = new THREE.Group();
  const farolTower = new THREE.Mesh(ctx.geoCone, ctx.lighthouseMat);
  farolTower.scale.set(14, 60, 14);
  farolTower.position.y = 30;
  farolTower.castShadow = false;
  farol.add(farolTower);

  const farolCap = new THREE.Mesh(ctx.geoCyl, ctx.lighthouseRedMat);
  farolCap.scale.set(7, 6, 7);
  farolCap.position.y = 63;
  farolCap.castShadow = false;
  farol.add(farolCap);

  farol.position.set(180, 70, -420);
  group.add(farol);

  const sea = new THREE.Mesh(ctx.geoBox, ctx.oceanTurquoiseMat);
  sea.scale.set(480, 2, 280);
  sea.position.set(0, 10, -430);
  sea.castShadow = false;
  sea.userData = { baseY: 10 };
  group.add(sea);
  if (ctx.waterMeshes) ctx.waterMeshes.push(sea);

  for (let p = 0; p < 12; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 34 + ctx.hash(p * 7) * 16;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.3, ph, 1.3);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    for (let f = 0; f < 5; f++) {
      const frond = new THREE.Mesh(ctx.geoCone, ctx.palmMat);
      frond.scale.set(4, 13, 0.5);
      frond.position.set(0, ph, 0);
      frond.rotation.z = 1.1;
      frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.castShadow = false;
      palm.add(frond);
    }
    palm.userData = {
      isLeft,
      normX: 0.16 + (p / 12) * 0.68,
      depthZ: -290 - (p % 3) * 55,
      offsetY: 0,
      seed: p * 12
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
